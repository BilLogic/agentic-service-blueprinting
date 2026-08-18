---
title: "Derived layer — backend, schema, and IR pipeline"
type: feat
status: completed
date: 2026-07-29
---

# Derived layer — backend, schema, and IR pipeline

## Enhancement Summary (deepened 2026-07-29)

Reviewed by data-integrity, security, architecture agents + a doc-verified Supabase
best-practices researcher. Material changes vs. first draft:
1. **RLS section rewritten** — explicit `enable row level security` per table,
   per-command policies, column-level `REVOKE`/`GRANT` (RLS can't scope columns),
   sign-ups disabled as a REQUIRED step, Data API exposure grants (2026-10-30 change).
2. **Bug fixed pre-ship:** importer UUIDv5 trigger key must include `kind` or same-pair
   trigger+needs edges PK-collide.
3. **Decision 6:** importer snapshots/restores human-owned spec columns across scenario
   replace.
4. Constraint hardening: atomic constraint swap, jsonb shape checks on kpis/tools,
   evidence lifecycle FK + question-key check, cardinality pairing checks, deferrable
   slice_items uniqueness, partial unique index on open findings, advisory locks.
5. `--from-db` **excludes evidence/propositions content by default** (counts only) —
   restricted rows must never compile into the public bundle; sidecars gitignored.
6. New script `generate_slice_validator.py` + drift test (the "generated" TS validator
   previously had no generator).
7. Hash ceremony demoted to conditional (see plan 001 decision 4).

**Implementation target: uno-blueprint first** (plan 001 rollout). Schemas are
byte-identical across repos, so Phase 1 applies to uno verbatim with two caveats:
migration filename must sort after uno's `20260717183429_*`; uno still has the legacy
`public.services` table (drop it or hand-strip its type after `supabase:types` regen).
Phase 2 (IR pipeline) is template-repo work in stage 2.

Conventions: follow `supabase/migrations/20260716200000_template_schema.sql` (the
template's single consolidated migration — uno instead has 717 historical files, same
resulting schema): snake_case plural, `comment on`, `<table>_<cols>_idx`,
`created_at`/`updated_at` + `set_updated_at` trigger on every table, RLS enabled.

## Phase 1 — Migration (new additive file)

### 1a. New columns on existing tables

```sql
-- cells: spec fields (nullable; IR omits when absent — plan 001 decision 4)
alter table public.cells
  add column function text,
  add column form text,
  add column value_props jsonb not null default '[]'
    check (jsonb_typeof(value_props) = 'array'),
  add column owner text,
  add column perceived_owner text;

-- layers: KPI-alignment inputs (shape checks — reviewer M1)
alter table public.layers
  add column owner_team text,
  add column kpis jsonb not null default '[]' check (jsonb_typeof(kpis) = 'array'),
  add column tools jsonb not null default '[]' check (jsonb_typeof(tools) = 'array');

-- phases: business rows
alter table public.phases
  add column business_impact text,
  add column operational_requirements text;

-- cell_triggers becomes the cell-link table (NO rename — live contracts depend on it).
-- ONE atomic statement: no window without uniqueness (reviewer H2).
alter table public.cell_triggers
  add column kind text not null default 'trigger' check (kind in ('trigger','needs')),
  add column label text,
  add column note text,
  drop constraint if exists cell_triggers_source_target_unique,
  add constraint cell_triggers_source_target_kind_unique
    unique (source_cell_id, target_cell_id, kind);
```

`cells.links` stays; "Resources" is a UI-copy rename only in v1.

### 1b. New tables

All get `id uuid pk default gen_random_uuid()`, timestamps, `set_updated_at` trigger,
`comment on`. Derived tables use **soft cell references** (uuid/uuid[], no FK to cells —
FK cascade would wipe them on scenario re-import) paired with `cell_keys` recovery
columns. `evidence` gets a **hard lifecycle FK** — lifecycles are upserted, never
deleted, by the importer, and the FK is the retention/deletion story (GDPR-relevant for
interview excerpts).

```sql
create table public.slices (
  service_lifecycle_id uuid not null references public.service_lifecycles(id) on delete cascade,
  slice_type text not null check (slice_type in ('journey','step','lane','cell','custom')),
  title text not null,
  description text,
  actor text,
  locale text not null,
  origin text not null default 'generated' check (origin in ('generated','customized')),
  position int not null default 0
);

create table public.slice_items (
  slice_id uuid not null references public.slices(id) on delete cascade,
  position int not null,
  cell_ids uuid[] not null default '{}',
  cell_keys text[] not null default '{}',
  caption text,
  narrative text,
  illustration jsonb,   -- {src, alt, source: generated|uploaded|external, updated_at}
  constraint slice_items_position_unique unique (slice_id, position)
    deferrable initially deferred,               -- reorder swaps need deferral
  constraint slice_items_keys_match_ids
    check (cardinality(cell_ids) = cardinality(cell_keys))
);
-- empty cell_ids allowed: title-only divider frames

create table public.findings (
  service_lifecycle_id uuid not null references public.service_lifecycles(id) on delete cascade,
  run_id uuid not null,       -- identity only, intentionally FK-less (comment on column)
  source text not null check (source in ('audit','whatif','import-sweep')),
  check_name text not null,
  severity text not null check (severity in ('info','warn','critical')),
  cell_ids uuid[] not null default '{}',
  cell_keys text[] not null default '{}',
  note text,
  fingerprint text not null,  -- check_name + sorted cell_keys hash
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  constraint findings_keys_match_ids
    check (cardinality(cell_ids) = cardinality(cell_keys))
);
-- DB backstop for skill-side dedupe (reviewer LOW→adopted):
create unique index findings_open_fingerprint_idx
  on public.findings (service_lifecycle_id, fingerprint) where status = 'open';

create table public.evidence (
  service_lifecycle_id uuid not null references public.service_lifecycles(id) on delete cascade,
  cell_id uuid,                -- SOFT ref
  cell_key text,
  proposition_question_key text
    check (proposition_question_key is null
           or proposition_question_key in ('understand','value','usability')),
  kind text not null check (kind in
    ('interview','survey','analytics','doc','meeting','decision','observation','other')),
  title text not null,
  ref text, excerpt text, note text,
  observed_at date,            -- date-only, deliberately (re-identification)
  added_by text,               -- nullable; auth email or agent name
  check (num_nonnulls(cell_id, proposition_question_key) = 1),
  check (cell_id is null or cell_key is not null)
);
create index evidence_service_lifecycle_id_idx on public.evidence (service_lifecycle_id);
create index evidence_cell_id_idx on public.evidence (cell_id);

create table public.propositions (
  service_lifecycle_id uuid primary key
    references public.service_lifecycles(id) on delete cascade,
  funding text, pricing text, delivery_cost text, revenue_model text, partners text
);
```

Indexes: **GIN** on `slice_items.cell_ids` and `findings.cell_ids` (default `array_ops`
covers uuid[]). **Query contract for all consumers (frontend + skills): membership tests
must compile to `@>` / `&&`** (supabase-js `.contains()` / `.overlaps()`) — **`= ANY(col)`
does NOT use a GIN index** (doc-verified). Btree on every FK.

Public count-only surface for the assumption lens (restricted rows never leave the DB,
but counts are safe and the lens needs them anonymously):

```sql
create view public.evidence_counts as
  select cell_id, count(*)::int as n from public.evidence
  where cell_id is not null group by cell_id;
-- owner-executed view (bypasses evidence RLS deliberately — counts only, no content);
-- grant select to anon, authenticated.
```

### 1c. Storage bucket

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('slice-illustrations','slice-illustrations', true, 5242880, array['image/png'])
on conflict (id) do nothing;
```

Object paths: `slices/<slice_id>/frame-<position>.png` + `character-ref.png` — path
components come **only from DB ids/positions, never titles or model output**.
`storage.objects` write policies (authenticated, bucket-scoped, key-shape-checked via
`storage.foldername`) **may fail in a migration on hosted Supabase** ("must be owner of
table objects") — wrap in a `DO $$ ... exception when insufficient_privilege ...`
block so local stacks get them and hosted deploys degrade to service-key-only writes
with a visible notice; document the dashboard fallback in deploy-notes. Upsert
(deterministic overwrite) requires **INSERT + SELECT + UPDATE** policies — insert-only
makes regeneration silently fail (doc-verified). CDN/browser staleness: Smart CDN is
Pro-only; render `src + '?v=' + illustration.updated_at` (strip the param when
`generate_fallbacks.py` rewrites to `public/storyboards/`).

### 1d. RLS, grants, auth — REQUIRED shape

For **each of the 5 new tables**: explicit `alter table ... enable row level security;`
(forgetting one = anon full write on Supabase — reviewer C2), plus a test asserting
`relrowsecurity` across all public tables. Per-command policies with `TO` clauses
(never `auth.role()` — deprecated):

- `slices`, `slice_items`: `for select using (true)`; insert/update/delete
  `to authenticated` (`with check` on writes).
- `findings`: public select; **status-only human writes via column grants** —
  `revoke update on public.findings from authenticated; grant update (status) ...` +
  an update policy. No insert/delete grant to authenticated.
- `evidence`, `propositions`: `for select to authenticated`; writes `to authenticated`.
  Documented opt-in swap to public select for teams that want it.
- `cells`: `revoke update from authenticated; grant update
  (function, form, value_props, owner, perceived_owner)`; similarly `layers`
  (owner_team, kpis, tools) and `phases` (business_impact, operational_requirements).
  Content columns stay service-key-only.
- **Data API exposure:** new tables are no longer auto-exposed (enforced for all
  projects 2026-10-30) — include explicit grants/exposure so frontend errors don't
  masquerade as RLS bugs.
- **Auth hardening (REQUIRED, with the migration):** disable public sign-ups
  (invite-only) and use `shouldCreateUser: false` in the frontend OTP call — otherwise
  "authenticated" means anyone on the internet (security CRITICAL). Optional
  defense-in-depth: `app_metadata` claim check in write policies (never
  `user_metadata` — user-editable). Note in DATABASE.md: `TO authenticated` is
  authentication, not authorization — acceptable for a closed team only.
- Attribution columns `created_by uuid default auth.uid()` on derived tables — cheap
  now, painful backfill later.

### Decision 6 — spec-column preservation across re-import

`generate_seed_sql.py`'s scenario replace gains a snapshot/restore pair in the emitted
SQL: before the scenario delete, `create temp table _spec_snapshot as select id,
function, form, value_props, owner, perceived_owner from public.cells where ...`; after
reinsert, `update public.cells c set ... from _spec_snapshot s where c.id = s.id` (only
when the IR side is absent — IR-authored values win when present). Same pattern for
layers/phases columns (phases are upserted — the upsert must **not** overwrite the two
business columns when the IR omits them: `coalesce(excluded.x, phases.x)` semantics,
stated explicitly). UUIDv5-stable ids make the join exact.

## Phase 2 — IR schema v2 + pipeline (template repo, stage 2)

### 2a. `references/ir-schema.json` (stays in the flat layout until the reorg lands)

- cell: optional `function`, `form`, `value_props[]`, `owner`, `perceived_owner` —
  **omitted when absent, never null** (validator rejects null-filled optionals).
- trigger → link: optional `kind` (default trigger), `label`, `note`. `needs` =
  source-requires-target, same-path rule unchanged.
- lane/phase optionals as above. NEW top-level `proposition` (outside every scenario
  subtree → outside all hashes).
- Reserved `cell.evidence: string[]` / `attribution`: deprecated-but-accepted; importer
  converts to evidence rows (kind=other). Slices/findings/evidence never enter the IR;
  sidecar exports (`*.sidecar.json`) are **gitignored by default** (template `.gitignore`
  entry) — a public workspace repo must not carry excerpts.

### 2b. Scripts (stdlib-only)

| Script | Change |
|---|---|
| `validate_ir.py` | v2 fields; link-kind rules; proposition block; **reject null-filled optionals** |
| `generate_seed_sql.py` | new columns; spec-column snapshot/restore (decision 6); **UUIDv5 trigger key gains `kind`** (`{path}/{kind}:{src}->{tgt}`) — without this, same-pair trigger+needs edges collide on the primary key (reviewer H1; DB ids changing is harmless under delete-and-reinsert and invisible to hashes); `pg_advisory_xact_lock` on the lifecycle at transaction top (shared with sweep) |
| `generate_fallbacks.py` | new columns; `--from-db` snapshot for slices/slice_items/findings — **evidence & propositions excluded by default, `evidence_counts` only**; `--include-restricted` prints a red private-deploy warning; illustration URL rewrite; marker-block pattern; test asserts **no `excerpt` strings in emitted modules** |
| `compute_signoff_hash.py` | unchanged; document that proposition, sidecars, and spec columns sit outside hashed semantics |
| NEW `generate_slice_validator.py` | emits `src/lib/sliceValidation.ts` (plain generated type-guard predicates — no zod; marker block) from the slice schema + findings status transitions; run_tests case regenerates and fails on diff; plus a `satisfies`-based compile-time tie to `database.ts` types |
| NEW `sweep_orphans.py` | post-import, same advisory lock: `unnest ... with ordinality` anti-join for dangling `cell_ids`; key-path re-link; **mismatch detection** (stored `cell_keys[i]` ≠ current key of a valid `cell_ids[i]` — the key-reuse mislink case); emits `import-sweep` findings |
| `rehash_signoff.py` | **conditional** — only for scenarios whose IR files get rewritten (legacy evidence stripping); not a blanket gate |

### 2c. Types + docs sync

Regenerate `src/types/database.ts` (keep hand-kept exports; on uno, mind the `services`
caveat). Same-PR updates: `supabase/DATABASE.md` (+ migration-history row, + the
"authentication ≠ authorization" note), `schema.reference.sql`, `docs/erd.mmd`,
`references/data-model.md`.

## Phase 3 — Tests

`scripts/tests/run_tests.sh` additions:
- IR v2 validator pass/fail (null-filled optional fails; needs-link cases).
- Seed + fallback round-trip, en + zh (CJK guard).
- **Hash stability:** schema v2 + untouched workspace → identical hashes (this test
  replaces the blanket ceremony); adding `function` to a cell changes exactly that
  scenario's hash.
- Spec-column preservation: panel-style UPDATE → re-import → value survives; IR-authored
  value wins over snapshot.
- Sweep: unchanged re-import → zero orphans; key rename → detect + re-link; key reuse →
  mismatch finding; scenario delete → mass-orphan finding.
- Trigger+needs same pair → both rows import, distinct ids.
- `--from-db` round-trip + `tsc --noEmit` + **no-excerpt assertion**.
- Validator generator drift check; `relrowsecurity` assertion for all public tables.
- RLS matrix: anon writes fail everywhere; authenticated can update only granted columns
  (attempt on `cells.content` fails).

## Acceptance criteria

- [ ] Migration applies on fresh local stack AND on uno's live-schema copy (stage 1)
      AND on the template (stage 2).
- [ ] `cells_validate_path_match` untouched; import order unchanged; derived tables
      documented as outside importer scope except sweep + spec restore.
- [ ] Re-import preserves: derived rows (soft refs), human spec-column edits
      (decision 6), sign-off hashes (stability test).
- [ ] Security: sign-ups-disabled documented REQUIRED; anon writes impossible; no
      excerpt in any public bundle; bucket limits + key-shape enforced.
- [ ] All run_tests.sh green; lint + `tsc -b` green.

## Dependencies & risks

- Phase 1 blocks plan 003; Phase 2 blocks plan 004. Stage-1 execution happens on uno.
- Storage object policies on hosted Supabase may need the dashboard path — degraded
  mode (service-key-only writes) is acceptable and visible.
- Advisory-lock discipline: importer wrapper and sweep must both take the lock, or
  concurrent import + sweep can re-orphan rows mid-flight.

## Sources

- Origin: plan 001 decision log + design conversation 2026-07-29.
- Deepening reviews: data-integrity (C1–C3, H1–H2, M1–M5), security (1.x–6.x),
  architecture (findings 1–5), Supabase best-practices researcher (all "doc-verified"
  claims above, incl. GIN `= ANY` trap, implicit-vs-PKCE, storage upsert triple-policy,
  Data API exposure change, Smart CDN tiering).
- Repo divergence report: identical schemas, uno migration-filename + `services` caveats.
