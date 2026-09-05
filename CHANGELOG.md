# Changelog

## 1.3.0

### Minor Changes

- d772ff3: The agent drives the camera, and a focus is verified before it is reported.

  A `canvas_camera` UI command (pan, zoom, fit, cancel) and an active-canvas
  focus registry give the agent the same camera a person has. `focus_cell`,
  `open_phase`, `open_scenario` and `open_cell_panel` now wait for the move
  they started — bounded, and read from the camera's own state line — and
  report a timeout, a miss or a superseded fly as exactly that, never as a
  landing.

- 9c2970c: The annotation state is two contexts.

  One context value carried both the marks and the tool. The marks change on
  every pointer sample of a drag; the tool changes when somebody clicks the
  toolbar. A context consumer re-renders whenever the value's identity
  changes, whichever field it reads, so dragging one sticky note re-rendered
  every cell on the board. The tool, the pen settings and the `isAnnotating`
  verdict now travel in `CanvasAnnotationToolContext`, read through
  `useCanvasAnnotationTool` and its optional variant; the marks and their
  mutators stay in `CanvasAnnotationContext`. The cells, the marquee, the pen
  cursor and the viewport read only the slow half, and a subscription test
  counts renders to prove a drag cannot reach them. The agent gains a
  `set_canvas_tool` command and a `canvas-tool` line in its UI context.

## 1.2.0

### Minor Changes

- ea3ceac: A step says what its moment is, and the service panel may write its own.

  The first of four slices porting the entity panel editors (#357). One column
  and three grants: `steps.summary` — the one sentence that makes a step's
  column legible without reading five cells, rendered as the caption on the
  storyboard frame — and UPDATE on `steps.summary`, `services.summary` and
  `services.entity_examples` for the signed-in author, because the editors that
  follow write these fields directly rather than through a definer function.

  With it, the pure modules those editors stand on: `entityStatus` (the shared
  vocabulary and its labels), `panelText`, `openPanelStore` (the cell-vs-entity
  drawer arbiter), `panelEditorBusy`, `panelSheetSnap`, `canvasHeaderStyle`,
  `usePanelFooterHost`, a `Select` primitive, and `describeLaneRole` /
  `labelLaneRole`.

  Every change is additive: no row is touched, no IR field moves, and the schema
  version does not. Nothing renders differently yet — the shell, the panels and
  the affordances are the next three slices.

- dd18a6d: Every label is a door.

  The last of four slices porting the entity panel editors (#357). The
  service bar, the phase bar, a scenario's path heading, the lane labels and
  the step headers each become an affordance: hover discloses the definition
  card with the deployment's own example, and a click opens the matching
  panel in the one drawer. The cell drawer and the entity drawer now exclude
  each other from both sides, and a scenario board publishes its scope so the
  lane and step openers know they are on one. A service identity header
  arrives where the template rendered none.

- 1b36c57: Five panels write what they show.

  The third of four slices porting the entity panel editors (#357). Service,
  Phase, Scenario, Lane and Step each gain a panel in the one drawer shell —
  summary and business model for the service, the six per-kind examples,
  business impact and operational requirements for a phase, a scenario's paths
  with their kind, note and status, a lane's owner team, KPIs, tools and actor,
  a step's caption — with the read hooks and the mutations under them, every
  write recorded and revertible. `stakeholders` gets its picker, badge and
  mutations. The drawer is mounted and inert: the affordances that open it are
  the last slice.

  One grant rode in: `phases.summary` had never been granted to the signed-in
  author (the description → summary rename moved the word, not a grant that
  did not exist), so the Phase panel's first field would have been the one it
  could not save.

## 1.1.0

### Minor Changes

- 1ab4435: An entity has a status, and a lane names its actor.

  Two things the panel editors need that the core never held. `cells.status`
  and `paths.status` arrive on one shared `entity_status` domain — `proposed`,
  `planned`, `built`, `live`, `at_risk`, `deprecated`, default `live` — so how
  far along a thing is lives in a column a badge renders from, not in a name
  prefix a reader has to parse. And `stakeholders` arrives: the deployment's
  cast list, one row per name across the whole deployment, no `service_id`
  (ADR 0003); a lane names its actor by a new nullable `lanes.stakeholder_id`,
  and a structural lane names nobody.

  Every change is additive. No row is touched, no IR field moves and the schema
  version does not; the panel editors that write these columns follow.

## 1.0.0

### Major Changes

- 1271d7b: `cells.links` held two concepts and was named after neither. It is now two
  tables, and the IR splits with it.

  The column stored a jsonb array in two shapes. Entries typed `url` were
  resources — what the cell points at, and all the Resources tab has ever
  listed. Entries typed `tech_description` were prose, a screenshot and a design
  link about ONE touchpoint used at that cell, found again by matching the
  entry's `label` against a line of `cells.content`. No label could name that
  column: `Links` over the tab promises both and shows one, `Resources` on the
  column is wrong for half its rows.

  `21000113000000` makes the split.

  - **`cell_touchpoints`** is the placement — this touchpoint, used at this
    cell — and it owns the `summary`, `screenshots` and `url` that belong to
    THIS moment. The old join was a string, so renaming a pill in the grid
    silently orphaned the paragraph behind it; a row survives a rename.
    `picture` and `pictures` fold into one `screenshots` array, which is what
    those two fields were always describing.
  - **`resources`** is what a cell — **or one placement** — points at, with
    `kind` carrying the subtype because a link is one kind of resource.
    `num_nonnulls(cell_id, cell_touchpoint_id) = 1` is in the schema rather than
    in the client, and that constraint is what lets a design link belong to the
    tool it documents rather than to the cell at large. Nothing attaches one to
    a placement yet; the constraint and the capability ship, and the migration
    header says so rather than leaving it to be discovered.
  - Provenance citations — a shape the IR never admitted but a jsonb column has
    always accepted — go to `evidence`, where they belong. The migration refuses
    to run on an entry shape it does not recognise, because dropping the column
    under one destroys it.
  - A cell's resources are replaced through `sync_cell_resources` in one
    transaction: the editor rewrites a whole list, every statement over the wire
    is its own transaction, and a deferred position constraint only forgives a
    collision until COMMIT.
  - `duplicate_path` and `duplicate_scenario` carry both new tables onto a copy.
    They carried this content before as a column of the row they copied, and a
    split that quietly stopped copying it would be the loss this change exists
    to end.

  **Upgrading: `schema_version` moves to 2026.08.31, and an IR must be
  migrated.** A cell's `links` array becomes `resources` (`label` → `name`) and
  `touchpoints` (`label` → `name`, `description` → `summary`,
  `picture`/`pictures` → `screenshots`). Every authored value survives under its
  new name and the step is content-preserving, so:

  ```
  python3 scripts/migrate_ir.py blueprint/blueprint.json \
    --workspace blueprint/blueprint-workspace.json --write
  ```

  carries sign-off hashes across with it.

### Minor Changes

- 42512f1: The arrow router is one generic engine, shared byte-for-byte with the
  deployment that pins this template.

  asb's arrows were routed by an overhead-rail bus: a backward loop that collided
  with a parallel row dropped into a reserved lane above the row and ran there.
  The deployment had since replaced that with a data-driven engine — anchor slots
  that separate a cell's in and out edges, a confluence planner that merges
  same-side arrivals into one trunk, gap-first corridor scoring that rides the
  roomiest lane instead of a pinned one, and a co-traveller offset pass — and
  retired the rail. This change adopts that engine wholesale.

  `blueprintArrowGeometry.ts` and the new `arrowAnchorSlots.ts` are now the SAME
  file in both repos, so the deployment can enrol them in its byte-identity drift
  gate and they cannot silently diverge again. The `OverheadRail*` geometry
  exports are gone; `planAnchorSlots` / `planArrowConfluences` /
  `planArrowCorridors` / `isWrapDependency` / `findBidirectionalDependencyPairs`
  replace them. The `BlueprintTriggerArrows` / `IntegratedTriggerArrows`
  renderers wire the new engine; the trigger data vocabulary is unchanged. The
  old rail-geometry unit test is replaced by the S1–S11 golden-geometry parity
  net (`src/dev/arrowSituationCatalog`), which freezes the `d` strings the shared
  engine produces.

  No deployment content leaks in: the engine is generic (no cell-id gates),
  standalone-clean.

## 0.5.0

### Minor Changes

- 5918319: A schema_version bump now ships the migration that carries existing
  `blueprint.json` files across it, in the same change.

  The IR has stated its own `schema_version` since the field existed, and the
  enum in `references/ir-schema.json` has listed the versions this template
  knows — but "knows" was doing two jobs. `2026.07.16` is in that list and an IR
  carrying it validated cleanly, then failed on the first renamed field, because
  the lane-vocabulary bump moved `lifecycle` → `service`, `layers` → `lanes`,
  `layer` → `lane` and `description` → `summary`. Being in the list means
  migratable, not current.

  `validate_ir.py` now refuses an IR that is not at the version the template
  speaks, with one error naming the command that fixes it, and stops before the
  body — otherwise every renamed field is reported as an unknown key and the one
  actionable line is buried. An unknown version says no migration carries it and
  where the steps that exist live.

  `scripts/migrate_ir.py` is that command. Steps chain, so a file two bumps
  behind is carried through both; the 2026.07.16 → 2026.08.25 step walks the
  tree by shape rather than rewriting text, so a link's `description` — prose
  about the link, still called `description` — is left alone.

  Sign-off is the reason this exists. It binds to a SHA-256 of a scenario
  subtree, and the renames land inside that subtree, so every recorded hash
  would stop matching and every signed scenario would silently de-sign.
  `--workspace blueprint-workspace.json` re-anchors each signed scenario's
  `content_hash` onto its migrated subtree and keeps `signed_at`/`signed_by` —
  sound because a step renames field names only, and a step that ever edits
  authored content declares itself non-content-preserving and gets refused. A
  hash matching neither side was already stale before the migration ran; it is
  reported and left, because that is a re-review, not a rename.

  The rule, in `references/customization.md` and next to the enum it governs:
  every future bump ships its migration in the same change. Consumers hold
  signed-off data that cannot be re-derived, so a bump with no step is a bump
  with no answer.

- 7ea6f15: A dependency edge in the IR now says which kind it is, so a `needs` edge
  survives an export.

  The database has checked `cell_dependencies.kind in ('trigger','needs')` since
  `20260729120000`, the app draws an arrow for one and a panel row for the other,
  and the authoring RPC refuses any third value. The IR was the half that could
  not say it: `$defs.trigger` carried `source` and `target` under
  `additionalProperties: false`, so a needs edge could not be written down at
  all. Exporting a blueprint that had one dropped it silently, and a re-import
  could not put it back. That is data loss, not a documentation gap.

  `schema_version` 2026.08.26 gives the edge an optional `kind`. Optional, and
  absent means `trigger` — the column default, and what every edge authored
  before this bump already meant — so every existing file is already a valid
  2026.08.26 file.

  The kind is part of the edge's **identity**, not just its payload. The
  database's uniqueness key is `(source_cell_id, target_cell_id, kind)`: one pair
  may carry both an arrow and a needs edge, and those are two rows. So the
  validator's duplicate check reads the kind, and the UUIDv5 qualified key ends
  in `#<kind>` — without that, the second edge of a pair would be minted with the
  first one's id and quietly replace it. Every dependency edge's id therefore
  changes across this bump, which is invisible in practice: an import is a
  scenario-scoped delete-and-reinsert, and nothing outside `cell_dependencies`
  references an edge id.

  **The migration, and what it does to sign-off.** The rule holds — the bump
  ships its step in the same change — and the step is a version stamp and nothing
  else. Sign-off binds to a SHA-256 of a scenario subtree, and a dependency edge
  lives inside one, so writing `"kind": "trigger"` into every existing edge would
  have re-hashed every signed scenario in every workspace. That would have been
  _content-preserving_ in the sense the machinery means — no authored value would
  have moved, and `--workspace` would have re-anchored each hash — but it would
  have put every signed blueprint one forgotten flag away from de-signing itself,
  in exchange for saying at length what absence already says. So
  `2026.08.25 → 2026.08.26` is `content_preserving = True` and touches nothing:
  every scenario hashes to the byte-identical digest afterwards, and `--workspace`
  reports each signed scenario as already anchored. The suite checks that, rather
  than the changelog asserting it.

  Both v1 adapters carry the kind, because both project the same field function —
  the SQL seed emits it as a column, the no-DB module serves it on the edge, and
  `npm run check:parity` compares them. The test suite covers a `needs` edge
  round-tripping through both, a pair carrying both kinds getting two distinct
  ids, an unknown kind refused by name, the pre-bump fixture migrating with its
  hashes intact, and `2026.08.25` refused as superseded with the upgrade command
  in the message.

  The database gets a migration too, and it carries no DDL: the columns were
  already right. `schema_version` is one contract version across both halves, so
  the number moves on both. A target left at `2026.08.25` stays supported and
  stays correct.

- d5041c4: The portable Postgres core and the Supabase recipe are generated from the
  migrations, and CI applies both.

  The partition was a paragraph in the header of `supabase/schema.reference.sql`,
  a file that was never executed and was hand-refreshed beside a tree that moved
  underneath it. It is now marked in the migrations — `-- @recipe` and `-- @core`
  — and `npm run generate:portable-core` emits both halves from those marks into
  `supabase/generated/`. The snapshot is deleted; a second hand-maintained SQL
  artifact was the drift surface this repo kept paying for.

  The claim is executed rather than stated. Every pull request applies the
  generated core to a stock `postgres:17` with no Supabase and no shim in front
  of it, then applies the recipe on top, then checks that the full migration
  replay lands in the same place. A deliberately broken core is fed to the same
  job, so the guard is known to be able to fail.

- 8b66dfe: The app's backend seam is named: repository interfaces per aggregate
  (`src/lib/backend/ports.ts`), an identity port that answers in tiers rather
  than claims, and two conformance levels — Transactional and Idempotent — so a
  store without transactions can serve the app correctly and visibly. A
  framework-free conformance suite ships with it, passed by two reference
  implementations. `adapter-contract.md` no longer states our PostgREST coupling
  as though it were a property of the world.
- 134a529: The schema speaks the vocabulary the rulebook already taught. Ten renames:
  `layers` → `lanes`, `cells.layer_id` → `lane_id`, `layers.layer_role` →
  `lane_role`, `cell_triggers` → `cell_dependencies`, `service_lifecycles` →
  `services` (and `service_lifecycle_id` → `service_id`), `service_scenarios` →
  `scenarios` (and `service_scenario_id` → `scenario_id`), `row_position` ·
  `column_position` · `slot_position` · `order_position` → `position`, and
  `description` → `summary` on services, phases, scenarios, paths and cells.

  The package was half-renamed and contradicting itself in one statement:
  `create or replace function public.add_lane` inserted into `public.layers`.
  `references/data-model.md` — what the canvas agent reads before touching data
  — was already 100% the new vocabulary, so the agent was taught a schema its
  own backend did not have.

  Breaking for anyone holding data or calling the RPCs directly. Table and
  column names, `upsert_cell(lane_id)`, `add_lane(lane_role, at_position)`,
  `create_phase(summary)`, and the IR's field names all move. The database now
  carries a `schema_version` row saying which shape it is, so a mismatch is a
  named error instead of a column that is not there.

  Not renamed, deliberately: `cell_dependencies.kind` keeps `('trigger',
'needs')` — "trigger" there is one of two kinds of dependency, not the
  container; `slices.description` stays, because a slice's description is prose
  about the slice rather than a one-line gloss of a row; and the
  `tech_description` link payload keeps its `description`.

  Upstream migrations are now allocated from a reserved timestamp band
  (`21000101000000`–`21991231235959`) so a fork's pull can only ever append.

- 03c71e1: The plugin contract's identifier lane is written down in `identifiers.json`,
  generated from the tree and diffed in test, so renaming a skill, reference,
  schema, agent, hook or tool shows up in review instead of at a consumer's
  runtime. One version number is pinned across `package.json`, `plugin.json` and
  the CHANGELOG.

  The two v1 adapters now project one shared field list, and
  `scripts/adapter_parity.py` checks that they agree — closing a drift that had
  the no-DB adapter silently dropping `cell_key`, `position`, every cell
  spec field and the edge `kind`. No-DB is stated as the first run, and as
  read-only.

  CI runs all of it, plus the IR round-trip suite that previously ran nowhere.

- 134a529: **"Did the migration run" is answerable.** `npm run check:target` asks the live
  database for `public.schema_version` over the same Data API and anon key the app
  uses, and distinguishes _never migrated_ from _stale_ from _fine_. It matters
  more here than elsewhere: without a configured project the app serves its no-DB
  fallback and renders perfectly, so a misconfigured target looks exactly like a
  working one. Not in CI — CI has no target, and a check that needs a live
  database is a check that gets skipped and then trusted.

  **A desync runbook** for forks whose migration history diverged before the
  reserved band existed: read both histories, apply pending files out of order
  with `db push --include-all` (safe, because no upstream migration depends on
  anything a fork built), repair `supabase_migrations.schema_migrations` per
  version when they genuinely disagree, and `db pull` as the last resort. Inside
  the band it cannot recur.

  **The boundary, stated as a boundary** rather than a list of apologies, beside
  README's "Bring your own backend": no auth beyond the anon/authenticated split,
  no multi-tenancy, no backup or restore, no migration ops beyond the shipped
  chain — and the one operational failure the package does own, with the runbook
  attached.

  **The seed's role is on the record**: `supabase/seed.sql` is the META-BLUEPRINT,
  the service blueprint of this template itself, and one generator emits it and
  the no-DB fallback module from the same source. That is why "no database" is a
  supported mode and not a degraded one.

### Patch Changes

- e2ebf0e: The two contracts this repo ships are named in an ADR, and the tag that makes
  one of them pinnable is now checkable. ADR 1 records the split — a plugin
  contract consumers resolve by name at runtime, and a template surface they fork
  — the frozen identifier layer inside it, that semver covers the plugin contract
  only, and why `private: true` stays with no `files` allowlist. Every release
  gets an annotated `v<version>` tag on `main`, which is the only thing a
  consumer can pin, and `npm run check:release-tag` refuses a tag that names an
  unreleased version, a tag pointing at a tree that states a different one, and
  — once tagging has started — a release that skipped it.
- a30cd05: `schema.reference.sql` is now checked rather than hand-refreshed: offline
  against the generated types, and in CI by replaying every migration against a
  stock Postgres behind a small shim. The first run found the snapshot two
  migrations stale — `agent_sessions` and `agent_messages` were missing — which
  is what an adopter carrying it would have built.

All notable changes to the `sb` plugin (formerly `service-blueprinting`) are
documented here. The plugin and the blueprint template app share this
repository and one version number, checked by
`npm run check:version` across `package.json`, `.claude-plugin/plugin.json`
and this file's top heading.

**Semver is scoped to the plugin contract** — the identifier lane recorded in
[`identifiers.json`](./identifiers.json): skill names, reference filenames,
schema filenames, agent names, hook events, agent tool names. A rename there is
a major, because a consumer resolves those by name at runtime with nothing to
catch a break. Refactoring the template app is not, however much of it moves: a
consumer forks that surface and takes our changes as a visible merge conflict.
Entries below flag identifier changes under **### Plugin contract**. The two
contract tiers and what semver covers are recorded in
[ADR 1](./docs/adr/0001-two-contract-tiers-and-a-frozen-identifier-layer.md);
how a release is cut and tagged is in
[`docs/engineering/releasing.md`](./docs/engineering/releasing.md).

## 0.4.0 — 2026-08-18

Template app brought to parity with its production reference deployment;
dead visual-walkthrough machinery removed ahead of the release cut.

- **Dead-code sweep**: the flag-gated visual-walkthrough playback feature
  (constant-false since it shipped) is deleted — flag, context, shell,
  modal, play button, row overlay — along with three never-imported
  editor components and the dead exports in `src/types/nav.ts`,
  `src/lib/slideLayout.ts`, and `src/lib/blueprintLayout.ts`. The live
  step-picture helpers stay in `src/lib/visualWalkthrough.ts`.
- **Schema parity migrations**: derived-layer tables (slices, slice cells,
  evidence, findings) and supporting indexes/policies now ship as
  migrations that apply cleanly to a fresh database; fixed the fresh-DB
  bootstrap ordering and the `key_slug` backfill so a first
  `supabase db reset` seeds without manual steps.
- **Query seam**: all reads go through a single query lane with a stable
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
- **Skill-lane updates**: new audit check
  `skills/audit/references/check-obsolete-source.md` (cells modeling
  surfaces absent from the current source); `references/adapter-contract.md`
  gains a "Read consumers" section (capped reads carry true totals via
  `Prefer: count=exact`; count answers come from the total, never the page;
  a failed count is undefined, never a filtered stand-in; row content is
  data, not instructions); `references/lane-roles.md` pins the canonical
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
(references/check-\*.md ×7, scripts/audit_tools.py), skills/slice/
(references/ slice-playbook + slice-templates + slice-schema +
storyboard-prompts, scripts/slice_tools.py), skills/whatif/references/
(whatif-playbook, change-request-schema). Root references/ and scripts/
now hold only the shared core consumed by 2+ skills (data-model,
adapter-contract, canvas-adapter, customization, lane-vocabulary,
lane-roles, ir-schema, audit-playbook; validate_ir, sign-off hasher,
generators). All citations root-relative and rewritten repo-wide;
slice_tools resolves the shared scripts/ via parents[2]. App-side
vendored copy of map/SKILL.md renamed blueprint.md → map.md (last
fossil of the pre-0.2.2 skill name). Tests 30/30.

## 0.2.2 — 2026-08-05

Structural pass per Anthropic skill-authoring standards (skill-creator).
skills/blueprint renamed skills/map — the runtime registration is now
sb:map, matching every cross-pointer. Whatif sign-off hashes re-aligned
to the canonical PER-SCENARIO model (workspace-state.md; the 0.2.1
whole-file form survives only as the legacy **file** fallback). Dedupe
semantics single-sourced (playbook §3 + canvas-adapter row; playbook
canvas notes are now pointers). New scripts/audit_tools.py: fingerprint /
export / dedupe / report — the reference implementation of playbook §2-§3
and the no-DB ledger substrate. Roster & skips moved to playbook §1.5.
journey_stage added to lane-roles. Slice type table single-sourced in
SKILL.md. blueprint-reviewer three modes. Map description gains reverse
pointers to audit/whatif. adapter-contract multi-account paragraph
compressed (mechanics live in review-import §6). sweep_orphans.py marked
planned. plugin.json says JSON IR.

## 0.2.1 — 2026-08-05

Nineteen text-level gaps closed after blind cold-follow evals of sb:audit
and sb:whatif (fresh-context agents following the SKILL.mds literally on a
real workspace): two-target staleness guard, **file** hash form, orphan-
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
- References: IR JSON Schema, crosswalk JSON Schema, data model, lane roles,
  adapter contract, workspace-state spec, ingest / co-create / translate /
  review-import playbooks, elicitation protocol, deploy notes, customization
  guide.
- Assets: `HANDOFF.md.template` for per-workspace maintenance handoff.
- Not yet included (next units): `scripts/validate_ir.py`,
  `scripts/generate_seed_sql.py`, `scripts/generate_fallbacks.py`,
  `assets/schema.ddl.sql`, `assets/policies.supabase.sql`, marketplace entry.
