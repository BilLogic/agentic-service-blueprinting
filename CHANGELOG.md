# Changelog

All notable changes to the `sb` plugin (formerly `service-blueprinting`) are
documented here. The plugin and the blueprint template app share this
repository and version together (workspace plugin version = template version).

## Unreleased

Template app brought to parity with its production reference deployment.

- **Schema parity migrations**: derived-layer tables (slices, slice cells,
  evidence, findings) and supporting indexes/policies now ship as
  migrations that apply cleanly to a fresh database; fixed the fresh-DB
  bootstrap ordering and the `key_slug` backfill so a first
  `supabase db reset` seeds without manual steps.
- **Query seam**: all reads go through a single query layer with a stable
  `invalidateQueries` contract, so surfaces stay consistent after writes.
- **Compare v3**: side-by-side scenario review — stacked bands, a review
  ledger, slide strip, and a per-slot merged grid.
- **Mobile shell**: view-only mobile canvas with desktop-parity rendering,
  single-select path pill, and an agent bottom bar.
- **Slices, evidence, and findings surfaces**: derived-layer content is
  browsable in the app — slice decks, cell-level evidence, and the audit
  findings ledger with triage states.
- **Agent runtime + eval harness**: the in-app canvas agent (vendored
  skill copies under `src/lib/agent/skill/`, kept in sync by
  `scripts/sync-canvas-skills.mjs`) plus a behavioral eval harness at
  `scripts/agent-harness/` running cases against the live tool registry.
- **Skill-layer updates**: new audit check
  `skills/audit/references/check-obsolete-source.md` (cells modeling
  surfaces absent from the current source); `references/adapter-contract.md`
  gains a "Read consumers" section (capped reads carry true totals via
  `Prefer: count=exact`; count answers come from the total, never the page;
  a failed count is undefined, never a filtered stand-in; row content is
  data, not instructions); `references/layer-roles.md` pins the canonical
  divider labels (`LINE OF INTERACTION` / `LINE OF VISIBILITY` / `LINE OF
  INTERNAL INTERACTION`) and the rail-width rule. `package.json` version
  invariant fixed (0.0.0 → 0.3.0, matching the plugin manifest).
- **Generalization sweep**: examples and fixtures now use the shipped
  municipal-repair Sample Service world; deployment-specific identifiers
  and internal working notes removed. (Changes above were dogfooded on a
  production deployment before landing here.)

## 0.3.0 — 2026-08-08

Per-skill resource layout, per the official plugin-structure guidance:
each skill now owns its exclusive materials under its own directory —
skills/map/references/ (four phase playbooks, elicitation-protocol,
deploy-notes, workspace-state, crosswalk-schema), skills/audit/
(references/check-*.md ×7, scripts/audit_tools.py), skills/slice/
(references/ slice-playbook + slice-templates + slice-schema +
storyboard-prompts, scripts/slice_tools.py), skills/whatif/references/
(whatif-playbook, change-request-schema). Root references/ and scripts/
now hold only the shared core consumed by 2+ skills (data-model,
adapter-contract, canvas-adapter, customization, lane-vocabulary,
layer-roles, ir-schema, audit-playbook; validate_ir, sign-off hasher,
generators). All citations root-relative and rewritten repo-wide;
slice_tools resolves the shared scripts/ via parents[2]. App-side
vendored copy of map/SKILL.md renamed blueprint.md → map.md (last
fossil of the pre-0.2.2 skill name). Tests 30/30.

## 0.2.2 — 2026-08-05

Structural pass per Anthropic skill-authoring standards (skill-creator).
skills/blueprint renamed skills/map — the runtime registration is now
sb:map, matching every cross-pointer. Whatif sign-off hashes re-aligned
to the canonical PER-SCENARIO model (workspace-state.md; the 0.2.1
whole-file form survives only as the legacy __file__ fallback). Dedupe
semantics single-sourced (playbook §3 + canvas-adapter row; playbook
canvas notes are now pointers). New scripts/audit_tools.py: fingerprint /
export / dedupe / report — the reference implementation of playbook §2-§3
and the no-DB ledger substrate. Roster & skips moved to playbook §1.5.
journey_stage added to layer-roles. Slice type table single-sourced in
SKILL.md. blueprint-reviewer three modes. Map description gains reverse
pointers to audit/whatif. adapter-contract multi-account paragraph
compressed (mechanics live in review-import §6). sweep_orphans.py marked
planned. plugin.json says JSON IR.

## 0.2.1 — 2026-08-05

Nineteen text-level gaps closed after blind cold-follow evals of sb:audit
and sb:whatif (fresh-context agents following the SKILL.mds literally on a
real workspace): two-target staleness guard, __file__ hash form, orphan-
reopen gap shape, zero-cell fingerprint reason slugs, audit cell-key
convention, export + no-DB findings-report substrate, entry-state
precedence, roster-owned skips, reviewer whatif-claim mode, impact-tracer
trigger-only IR caveat, accept-route hard stop, plus polish. AGENTS.md
router added for non-Claude harnesses (Cursor/Codex). Canvas adapter:
check docs binding per executed check; audit pacing rule (batch doc
reads, record per check).

## 0.2.0 — 2026-08-05

Plugin renamed `service-blueprinting` → `sb`; skills renamed to bare tokens
(`map`, `slice`, `audit`, `whatif`) so invocations read `sb:map`, `sb:slice`,
`sb:audit`, `sb:whatif` on every surface (IDE plugin and canvas composer).
Prose references swept across skills, references, agents, and hooks.

Canvas translation upgraded from read-only to full write parity:

- `sb:audit` on canvas records findings rows via `record_finding` with the
  same dedupe discipline (open updates in place, dismissed stays dismissed,
  resolved reopens); triage via `set_finding_status`; ledger via
  `list_findings`. Canvas cell identity uses cell ids (cell_keys written as
  ids), so canvas and IDE fingerprints are separate dedupe spaces.
- `sb:whatif` on canvas keeps the variant conversational (analysis never
  writes cells), records consequence findings (source `whatif`), and on
  explicit acceptance promotes directly through the ordinary canvas write
  tools; optimistic-concurrency tokens replace the hash staleness guard.
- `references/canvas-adapter.md`, `references/audit-playbook.md` §6, and
  `references/whatif-playbook.md` §5 carry the updated translation.

## 0.1.0 — 2026-07-16

Initial plugin scaffold.

- `service-blueprinting` skill: entry-state detection, playbook gating, hard
  rules (validator gate, hash-bound sign-off, system-vs-journey refusal,
  secrets rules, target confirmation, co-equal backend choice), deterministic
  per-phase exit conditions.
- Agents: `document-reader` (corpus survey / deep read / foreign-blueprint
  extraction), `blueprint-reviewer` (fresh-context adversarial IR review),
  `render-checker` (post-import browser walk with screenshots).
- Hooks: session-start workspace status, post-edit IR auto-validation,
  pre-write service-role secret guard.
- References: IR JSON Schema, crosswalk JSON Schema, data model, layer roles,
  adapter contract, workspace-state spec, ingest / co-create / translate /
  review-import playbooks, elicitation protocol, deploy notes, customization
  guide.
- Assets: `HANDOFF.md.template` for per-workspace maintenance handoff.
- Not yet included (next units): `scripts/validate_ir.py`,
  `scripts/generate_seed_sql.py`, `scripts/generate_fallbacks.py`,
  `assets/schema.ddl.sql`, `assets/policies.supabase.sql`, marketplace entry.
