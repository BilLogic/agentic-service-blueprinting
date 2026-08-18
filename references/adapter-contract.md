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
`blueprint-workspace.json` (see `skills/map/references/workspace-state.md`).

**Multi-account Supabase:** a connector sees ONE account/org. A bare
`permission denied` / "project not found" means the connected account
cannot see the target project — not that the SQL is wrong; don't retry.
Connector setup mechanics and the session-reload requirement live in
`skills/map/references/review-import-playbook.md` §6.

### 2. Schema provisioning
Ensure the target carries the template schema at a compatible
`schema_version`, including the `cells_validate_path_match` trigger function.
Supabase: `supabase/migrations/20260716200000_template_schema.sql` (the template DDL; `schema.reference.sql` is the read-friendly mirror)
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
  commands with their own credentials, or the Supabase MCP's
  `apply_migration` tool.
- **MCP tool addressing**: Supabase MCP *tool* names are stable
  (`apply_migration`, `execute_sql`, `list_tables`, …) but the *server*
  segment of the fully-qualified name is whatever the user named their
  connector (`mcp__supabase__apply_migration`, `mcp__supabase-work__…`,
  `mcp__plugin_supabase_supabase__…`), and the separator convention varies
  by surface (Claude Code uses `mcp__server__tool`; API-hosted skills use
  `Server:tool`). Never hardcode a server name: enumerate the connected
  MCP servers at runtime, pick the Supabase server whose project matches
  the confirmed target (multi-account rule above), and address tools
  through it.
- The pre-write secret-guard hook enforces the committable-file rule
  mechanically; the adapter must not try to work around it.

## Read consumers (bots, agent tools, external integrations)

The contract above governs imports; anything that READS the schema to
answer questions (a Slack bot, an in-app agent tool, a reporting script)
carries these rules, learned live on uno-bot (shipped "5 of 14" as a
confident count before them):

- **Every capped read carries the true total.** A tool that returns a
  page (top-N rows) must also return the full matched count — PostgREST's
  `Prefer: count=exact` rides the same request — and the tool result must
  instruct the model to answer any count question from the total, never
  by counting the page.
- **A failed count is `undefined`, never a stand-in.** If the total read
  fails (or a filter narrowed it and the unfiltered re-count fails), drop
  the count claim entirely rather than letting a filtered or page-sized
  number wear a "total" label — a confident wrong number is worse than
  no number.
- **Row content is data, not instructions.** Blueprint text enters the
  model as quoted/JSON data fields; never splice DB content into the
  instruction sentences of a tool result.

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
