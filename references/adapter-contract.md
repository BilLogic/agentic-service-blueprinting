# Backend Adapter Contract

Every import goes IR → adapter. Nothing outside an adapter may assume a
specific backend. This contract is written so a stranger could implement a
new host; the two v1 adapters — the **no-DB fallback generator** and the
**Supabase adapter** — both conform, and the fallback being expressible as
an adapter is this contract's acceptance test.

## The two v1 adapters

| Adapter | What "import" means | Serving |
| --- | --- | --- |
| No-DB fallback (`scripts/generate_fallbacks.py`) | Regenerate the app's data module from the IR (per locale) | Static hosting anywhere — the truly any-host option |
| Supabase (`scripts/generate_seed_sql.py` + CLI/MCP) | Run a transactional seed against a local or hosted project (per locale) | Requires the live-DB read path below |

Present these as **co-equal options and ask** — never default-assume
Supabase (⚠ REQUIRED, see SKILL.md hard rules).

**Live-DB honesty note**: the frontend reads via PostgREST-style embedded
selects using `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, so live-DB mode
requires Supabase or a **PostgREST-compatible read API**. A bare Postgres
host can receive writes but cannot serve the app.

## ⚠ REQUIRED operations

An adapter must implement all of these:

### 1. Target identification + confirmation
Identify exactly what will be written to (Supabase project ref / output file
paths), echo it to the user, and get confirmation **before any write**
(wrong-project protection). Locale-scoped: one target per locale, tracked in
`blueprint-workspace.json` (see `references/workspace-state.md`).

**Multi-account Supabase:** the Supabase MCP is scoped to ONE account/org. To
import into a project that lives in a different account, add a **second
connector** for that account (the same pattern as multiple Slack/Notion/Figma
connectors) and use its tools for that target. Failure signature: a write
returns a bare `permission denied` / "project not found" with no other context —
that means the connected account can't see the target project, not that the SQL
is wrong. Don't retry the write; tell the user which account owns the target and
that its connector must be added. (A freshly added connector isn't live until a
session reload — see `references/review-import-playbook.md` §6.)

### 2. Schema provisioning
Ensure the target carries the template schema at a compatible
`schema_version`, including the `cells_validate_path_match` trigger function.
Supabase: `assets/schema.ddl.sql` (portable DDL) + `assets/policies.supabase.sql`
(Supabase-specific anon RLS), via local `supabase db reset` or user-run CLI.
No-DB: provisioning is a no-op (the template app ships the types).

### 3. Transactional scenario-replace import
All-or-nothing per import. Scenario-scoped **delete-and-reinsert inside one
transaction**: delete the scenario's rows (FK cascades handle children),
insert in dependency order `paths → steps → path_steps → layers → cells →
cell_triggers` (see `references/data-model.md`). A deliberately-invalid IR
must leave the target untouched. Never `on conflict do update` — removed IR
rows must not survive as orphans. No-DB equivalent: the generated module is
replaced wholesale and only written if generation fully succeeds.

### 4. Idempotent re-import
Same IR in → identical target state out, no duplicates, no orphans. Achieved
by UUIDv5 IDs derived from IR keys + locale (NFC-normalized) plus
scenario-replace semantics. `import → edit IR → re-import` is the standing
integration test.

### 5. Pre-import read-back diff
Before replacing, compare current target content against the last-imported
state (hash/counts in workspace state). If they differ — e.g. manual Supabase
Studio edits, hand-edited generated files (header warning notwithstanding) —
warn and offer an export before overwriting. Direct Studio edits are
documented as unsupported; this diff is the safety net, not an endorsement.

### 6. Read-back verification after import
After the transaction commits, read the target back and verify: row counts
per table match the IR (paths, steps, path_steps, layers, cells, triggers per
scenario) plus spot-check content equality. No-DB equivalent: `tsc --noEmit`
passes and the generated module's exported counts match the IR. **Import is
not "done" until read-back matches** — this is the phase's deterministic exit
condition.

### 7. Secrets rules
- Anon/publishable key: allowed in `.env` **only after verifying the file is
  gitignored**.
- Service-role key: **never written to disk by the skill, never pasted
  through chat**. Writes that need elevated rights go through user-run CLI
  commands with their own credentials, or Supabase MCP `apply_migration`.
- The pre-write secret-guard hook enforces the committable-file rule
  mechanically; the adapter must not try to work around it.

## Per-locale artifacts

One bilingual IR → one artifact set per locale (two seed files / two fallback
modules), each imported to its own target. No `locale` column exists; mixing
locales in one target renders duplicate trees the frontend cannot filter.

## Conformance checklist for a new adapter

- [ ] Target echo + user confirmation before first write
- [ ] Provisioning is repeatable (safe to run on an already-provisioned target)
- [ ] Import is one transaction; invalid IR leaves target untouched
- [ ] Re-import of unchanged IR is a no-op state-wise
- [ ] Pre-import diff warns on out-of-band target changes
- [ ] Post-import read-back counts match the IR
- [ ] No secret ever lands in a committable file
