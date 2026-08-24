# Data Model

The template's blueprint data model. Source of truth:
`supabase/migrations/20260716200000_template_schema.sql` plus the
derived-layer migrations (`20260729120000_derived_layer.sql`,
`20260730090000_derived_layer_grants_hardening.sql`,
`20260803001000_slices_origin_allows_human.sql`) and the authoring
migrations (`20260818000000_authoring_foundation.sql` — provenance
`origin` columns, `cells.cell_key` identity, `position`,
`deleted_structure`, direct-column grants;
`20260818001000_authoring_operations.sql` — the `SECURITY DEFINER` RPCs
that are the only sanctioned write path for structure;
`20260818002000_service_account_tier.sql` — OPTIONAL recipe splitting
`authenticated` into service/regular tiers via RESTRICTIVE policies;
`20260819000000_agent_surface.sql` — `agent_sessions`/`agent_messages`
chat persistence plus the findings write path for in-app runs) (snapshot:
`supabase/schema.reference.sql`, diagram: `docs/erd.mmd`). The IR
(`references/ir-schema.json`) mirrors this shape one-to-one with locale maps
and stable keys in place of UUIDs.

## Contents

- Hierarchy
- ERD
- Tables in brief
- Enums
- Integrity trigger (why import order matters)
- ⚠ REQUIRED: import order
- Re-import semantics
- Ordering fields
- Working precedent
- Cell slots (`position`)
- Derived layer: slices, findings, evidence, propositions
- Spec fields on IR-owned tables

## Hierarchy

```
services → phases → scenarios → paths → {lanes, cells, cell_dependencies}
                                                → steps (scenario-scoped)
                                        paths ⇄ steps via path_steps (column order)
```

## ERD

```mermaid
erDiagram
  services ||--o{ phases : "has many"
  phases ||--o{ scenarios : "has many"
  phases |o--o| phases : "loops_to_phase_id"
  scenarios ||--o{ paths : "has many"
  scenarios ||--o{ steps : "has many"
  paths ||--o{ path_steps : "has many"
  steps ||--o{ path_steps : "has many"
  paths ||--o{ lanes : "has many"
  paths ||--o{ cells : "has many"
  lanes ||--o{ cells : "has many"
  steps ||--o{ cells : "has many"
  cells ||--o{ cell_dependencies : "source"
  cells ||--o{ cell_dependencies : "target"

  services { uuid id PK  text name  text summary }
  business_model { uuid service_id PK_FK  text funding  text pricing  text delivery_cost  text revenue_model  text partners }
  phases { uuid id PK  uuid service_id FK  text name  text summary  text business_impact  text operational_requirements  int position  uuid loops_to_phase_id FK "optional self-reference" }
  scenarios { uuid id PK  uuid phase_id FK  text name  text summary  int position  text view_type "single | stacked — merged is session-only, never stored" }
  paths { uuid id PK  uuid scenario_id FK  text name "the CONDITION that routes you here, never the activity — the scenario already said that"  text summary "when this route applies"  text note "the author's aside: open questions, provenance, working state"  text path_type "happy | variant | exception"  entity_status status }
  steps { uuid id PK  uuid scenario_id FK "columns are scenario-scoped, shared across paths"  text name }
  path_steps { uuid path_id PK_FK  uuid step_id PK_FK  int position "unique per (path_id, position)" }
  lanes { uuid id PK  uuid path_id FK  text name "display label - free-form, any language"  text lane_role "semantic role key; null = generic swimlane"  int position  text owner_team "from the closed list in lane-vocabulary.md; NULL on actor and storyboard lanes"  text kpis  text tools  uuid stakeholder_id FK }
  stakeholders { uuid id PK  uuid service_id FK  text name  text kind "recipient | staff | partner | provider | team"  uuid parent_id FK "sub-teams roll up, e.g. Marketing to Design"  text note  text aliases }
  cells { uuid id PK  uuid path_id FK  uuid lane_id FK  uuid step_id FK  int position "a slot holds a LIST — unique (lane_id, step_id, position)"  text content "Cell Label - primary grid text"  text picture "optional image URL"  text summary "the tl;dr the detail fields add up to"  text function  text form  text value_props  text owner  text perceived_owner "who the reader THINKS owns it, when that differs"  entity_status status  jsonb links "array of {type, label, url?, description?, picture?, pictures?}" }
  cell_dependencies { uuid id PK  uuid source_cell_id FK "unique pair; source != target"  uuid target_cell_id FK  text kind "leads_to = makes the other happen, drawn | enables = must already be true, never drawn"  text label  text note }
```

## Tables in brief

| Table | Purpose | Notes |
| --- | --- | --- |
| `services` | Top container (one per blueprint deployment, usually) | |
| `phases` | Service stages, ordered by `position` | `loops_to_phase_id` self-reference renders the lifecycle loop |
| `scenarios` | The unit users navigate; owns steps and paths | `view_type` enum below |
| `paths` | A journey variant within a scenario | `path_type` enum below; optional `note` |
| `steps` | Scenario-scoped step columns, SHARED across paths | A step exists once per scenario; paths select/ordr via `path_steps` |
| `path_steps` | Which steps a path uses and in what column order | `position` unique per path |
| `lanes` | Swimlanes, per PATH (each path carries its own lane rows) | `name` free-form any language; `lane_role` semantic key (see `references/lane-roles.md`) |
| `cells` | Grid content at (lane × step) on a path | `unique (lane_id, step_id)`; `links` JSONB array; `content` newline-separated items render as pills on pill-role lanes |
| `cell_dependencies` | Directed arrows cell → cell. `kind` is `leads_to` (this cell makes the other happen — drawn) or `enables` (the other must already be true — recorded, never drawn). Not inverses: "follows" is `leads_to` read from the other end, and a precondition causes nothing | Unique pair, `source != target`, both cells must be on the same path |

## Enums

- `scenarios.view_type`: `single` \| `stacked` — ONE vocabulary. The
  stored token is the token the UI names. (It used to store
  `single | side-by-side | integrated` with a translation module; all rows held
  `side-by-side` and the other two were unused, so the translation was deleted.)
  - `single`: one path at a time (path picker)
  - `stacked`: labeled variant comparison — any two labeled variants
    ("as designed" vs "reality" is just the default labeling)
  - **`merged` is not storable.** The Merged canvas (compared paths drawn as
    one combined blueprint) is a per-session display chosen in the compare
    control. The CHECK constraint rejects it, and `create_scenario` refuses it
    by name with a hint rather than coercing it
- `paths.path_type`: `happy` \| `variant` \| `exception`. Exactly one `happy`
  per scenario — the route things take when nothing intervenes. An `exception`
  is a route taken because something went wrong; a `variant` is a different but
  equally valid way through. Colour follows type (`happy` green, `exception`
  red), so **the name must carry the condition**, not the type: `Under 12
  hours`, not `Late call-off path`. A scenario with only one route names it
  `Standard`.
- `status` (the `entity_status` domain, shared by `cells.status` and
  `paths.status`): `proposed` \| `planned` \| `built` \| `live` \| `at_risk` \|
  `deprecated`. Anything other than `live` is not what happens today — say so
  when you report it. This replaced a `maturity` column and a family of
  `(Planned)` title prefixes; if you see either, the board is stale.

## Integrity trigger (why import order matters)

The DB trigger `cells_validate_path_match` enforces, on every cell insert:

1. `cells.path_id` must equal its lane's `lanes.path_id`, and
2. `(path_id, step_id)` must already exist in `path_steps`.

A cell referencing a step the path never registered **aborts the import
mid-transaction**. This is exactly what `scripts/validate_ir.py` catches
before any adapter runs.

## ⚠ REQUIRED: import order

```
paths → steps → path_steps → lanes → cells → cell_dependencies
```

(with `services → phases → scenarios` before all of the
above). Any other order violates FKs or the integrity trigger.

## Re-import semantics

Scenario-scoped **delete-and-reinsert in one transaction**: delete the
scenario's paths/steps (FK cascades remove path_steps, lanes, cells,
dependencies), then insert fresh rows in the order above. Never
`on conflict do update` — rows removed from the IR must not survive as
orphans. IDs are UUIDv5 from IR keys + locale (NFC-normalized), so identical
IR re-imports produce identical rows. See `references/adapter-contract.md`.

## Ordering fields

All sibling order is explicit integers: `phases.position`,
`scenarios.position`, `path_steps.position` (per path),
`lanes.position` (per path). The frontend sorts by these — gaps are
harmless, duplicates are not (validator checks).

## Working precedent

`scripts/generate_scale_fixture.mjs` generates the template's sample content
(TS fallback module + `supabase/seed.sql`) from one source of truth with
deterministic IDs and correct insert order — it is the pattern the IR
generators follow.

## Cell slots (`position`)

`cells.position int not null default 0` is a first-class column
(since `20260818000000_authoring_foundation.sql`): a (lane, step) slot may
hold several cells — one touchpoint per row in tech-role lanes — ordered
by `position`, with uniqueness widened to
`(lane_id, step_id, position)` (constraint
`cells_layer_step_slot_unique`). The slot contract: single-cell slots sit
at 0; tech-lane touchpoints occupy 0..n; the interactive `upsert_cell` RPC
always addresses slot 0, so siblings are created only by dedicated
touchpoint operations (and the migration's one-time split, where the
original row keeps the first item — preserving its id, `cell_key`, arrows,
slice references and evidence — and each further item becomes a sibling
with the parent's key plus an ordinal suffix). Tools and the IR never
expose slot management directly — treat "the" cell of a slot as slot 0.

## Derived layer: slices, findings, evidence, propositions

The skills' outputs land in five derived tables plus one view
(DDL: `supabase/migrations/20260729120000_derived_layer.sql`).
Workspaces provisioned before that migration must route through the
upgrade recipe rather than failing mid-import.

Design invariants: derived tables reference cells SOFTLY — `cell_ids
uuid[]` paired 1:1 with `cell_keys text[]` (IR key-paths for orphan
recovery), no FK — so the importer's scenario-scoped delete-and-reinsert
never cascades into user-authored rows. The hard FK each table does carry
is `service_id` (cascade): services are upserted, never
deleted, by the importer, and for `evidence` that FK is the
retention/deletion story for interview excerpts.
"Assumption" is a derived state — a cell with zero evidence rows —
deliberately never stored.

| Table | What it is | Notes |
|---|---|---|
| `slices` | A saved 1D cut through the grid that REFERENCES cells (never copies them) | `title`, `description`, `slice_type` (`journey`\|`step`\|`lane`\|`cell`\|`custom`), `actor`, `locale`, `position`, `origin` (`generated` = safe to regenerate \| `customized` = skill output human-edited, regeneration must confirm \| `human` = authored in the app, never the skill's to regenerate) |
| `slice_items` | One frame of a slice | `position` (unique per slice, deferrable), `cell_ids`/`cell_keys` (equal cardinality enforced; empty = title-only divider frame), `caption`, `narrative`, `illustration` JSONB — full-replacement semantics on rework |
| `findings` | One triageable audit/whatif finding | `source` (`audit`\|`whatif`\|`import-sweep`), `check_name`, `severity` (`info`\|`warn`\|`critical`), `note`, `cell_ids`/`cell_keys`, `status` (`open`\|`resolved`\|`dismissed`), `run_id` (FK-less by design — no runs table), `fingerprint` (check_name + sorted-cell_keys hash + reason slug — audit-playbook §2) |
| `evidence` | One provenance row for a cell OR a proposition question | Exactly one of `cell_id` / `proposition_question_key` (`understand`\|`value`\|`usability`); `cell_id` ⇄ `cell_key` always paired; `kind` (`interview`\|`survey`\|`analytics`\|`doc`\|`meeting`\|`decision`\|`observation`\|`other`); `observed_at` is date-only by design (timestamps could re-identify participants); restricted SELECT — excerpts may hold interview content |
| `propositions` | One business-model record per service (PK = `service_id`) | `funding`, `pricing`, `delivery_cost`, `revenue_model`, `partners`; restricted SELECT |

**Findings dedupe is DB-backed**: the partial unique index
`findings_open_fingerprint_idx` on `(service_id, fingerprint)
where status = 'open'` allows at most one OPEN finding per fingerprint.
Skill-side rule it backstops: open updates in place, dismissed stays
dismissed, resolved reopens as a new row (a reopen collision surfaces as
23505 by design).

**Public count surface**: the `evidence_counts` view (`cell_id → n`)
exposes evidence row counts — never content — to anonymous readers; it
powers the assumption lens on public deploys.

## Spec fields on IR-owned tables

The derived-layer migration also adds human-editable spec columns to
three IR-owned tables (writable via column-scoped grants; the content
columns stay import-owned):

- `cells`: `function` (role/responsibility — what it must do), `form`
  (communication/look/feel — what it must convey), `value_props` (JSONB
  array of `{for, value}`), `owner`, `perceived_owner` (mismatch =
  deception risk)
- `lanes`: `owner_team`, `kpis` (string array), `tools` (string array)
- `phases`: `business_impact`, `operational_requirements`
