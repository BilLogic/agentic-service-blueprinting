# Changelog

## 1.6.1

### Patch Changes

- 4b8b959: A deployment's content cannot hide in shared code without its name.

  `check:standalone` is a word-grep. It sweeps every file a commit would carry
  for the handful of words that NAME the deployment this template was
  generalised from, and it caught eighteen sentences nobody had read in months.
  The other half of the same leak walked straight past it: content with the name
  filed off. A cell id copied out of that database is thirty-two hex digits and
  names nothing. `Regular Tutor` is its cast, not its title. `Standard
Scheduling` is one of its scenarios. Each is as unusable to an adopter as its
  repository name in a comment, and none of them is a name.

  **`npm run check:content-coupling`**, beside `check:standalone` in CI, in
  SETUP.md § Before you push and in `docs/engineering/checks.md` § 4. Four
  patterns, every one a SHAPE rather than a copy of somebody's catalogue, each
  carrying the `why` the failure report prints:

  - **An opaque id.** A UUID literal that is neither the sample's own nor a
    placeholder somebody typed — and both allowances are checkable rather than
    listed. Every id in the sample blueprint and its seed comes out of `fid()`
    in `scripts/generate_sample_blueprint.mjs`, so the `f0000000-…` prefix is a
    proof of origin; and a UUID a person types is a few digits repeated, so
    three or fewer distinct hex digits — once the version and variant nibbles a
    v4 is required to carry are dropped — is the line. The gap either side of it
    is enormous: the deployment's own ids run five and up.
  - **The cast**, word-bounded and case-insensitive, so `tutorial` is untouched.
  - **Its scheduling vocabulary** — the words for a dropped shift, the cover for
    one, and the scenario holding both.
  - **A `/touchpoint-logos/` asset path**, which is a file only that deployment
    has; the template's own fixture passes by shape.

  Subject is `src/`, `skills/`, `agents/`, `references/`, `evals/`, `scripts/`
  and `docs/`, tracked plus untracked the way the sibling sweep reads it since
  #181. Tests are out, because a fixture has to be able to write the value down
  — the rule `check-database-names.mjs` already states for a dead relation.
  `src/data/sampleBlueprint.ts` stays IN: the id rule passes it for a reason
  worth asserting, and the day one of its thousand ids is outside the sample
  namespace, something was pasted in.

  **Twenty lines fixed across fourteen files, none allowlisted.** Seventeen
  were comments and reference-doc sentences illustrating a mechanism with
  somebody else's staff; three were LIVE strings the canvas agent reads as its
  tool contract, where the example its model is shown was another company's job
  title (`list_stakeholders`, `create_stakeholder` and `create_evidence`). Each now uses the sample blueprint's own vocabulary —
  `Blueprint owner`, `Read the sources` → `Draft the structure`,
  `A critical finding reopens`. `ALLOWED` therefore ships **empty**, with its
  shape held by fixtures rather than by a live entry: a site that cannot move
  without a design decision is named by file and value — never by line, which
  churns — and an entry nothing matches any more is itself a failure.

  **The inline annotation sweep found nothing to delete.** The tree carries no
  ad-hoc "do not use the deployment's examples" comment for the check to
  replace; what it carries instead is prose explaining design decisions
  (`LEGACY_NAME_TO_ROLE`'s shim, `TOUCHPOINT_COLORS`' empty alias map,
  `VISUAL_WALKTHROUGH_LANE_NAMES`), and those stay.

  One boundary is stated rather than swept: a role noun that is also ordinary
  English. `Supervisor` was one deployment's actor, quoted as "the live example"
  in an audit-check document; no bounded pattern separates it from the word a
  template may honestly write, so it was fixed by hand and the class is named in
  the script's § What is NOT matched, deliberately.

  No identifier in `identifiers.json` moves and no path in
  `check-reference-paths.mjs` does.

- a1bb7d4: A layer of tokens is not a lane.

  `21000104` renamed `layers` to `lanes`, and the prose was carried across by
  word replacement, so eleven sentences using `layer` in its ordinary English
  sense came out with `lane` substituted into the middle of a word or an
  unrelated idea: tabs "laneed" over the base view, rules "deliberately
  unlaneed", and the design system's own token tier called "the semantic lane"
  in seven places. Every one passed `tsc`, every check and review, because a
  comment is the subject of none of them.

  The sentences are restored, and the copy sweep is untouched: what `21000104`
  retired is the COLUMN, not the English word, and Check C already draws that
  line by subject — JSX text and five reader-facing props, comments removed — so
  a token tier living in a comment, a module or a stylesheet reaches no reader
  and is never read. Narrowing the pattern instead would have let
  `aria-label="Add a layer"` through, which is the retired name on screen and
  the one case that check plants to prove itself.

  A changeset, the CHANGELOG and the guard's own test may quote the residue —
  a note explaining the fix has to name both spellings, and a dated record keeps
  the words it was written with. Beside Check C now sits a guard on the residue
  itself — a word that exists in no
  dictionary (`laneed`, `unlaneed`) and one phrase whose meaning the rename
  inverted (`semantic lane` with no role after it, which is why `lane_role` and
  "semantic lane roles" pass) — over every file a commit would carry, so the
  next mechanical rename cannot leave the same wreckage unnoticed.

  Four files reach byte-identity with the deployment as a result, and a fifth
  carries the decision the module stores were already following: ADR 5,
  cross-surface state is a module store, not context.

## 1.6.0

### Minor Changes

- 34513c7: A service has a slug, and the agent has a scope module to read by it.

  ADR 3 says a deployment may hold more than one service: the journey is a hard
  per-service boundary, the catalog is the deployment's. The schema had the
  boundary and nothing to name a side of it — no way for a URL, or an agent read,
  to say _which_ service. Two halves land here, and the read tools that will use
  them do not.

  **`services.slug`** (`21000130000000_a_service_has_a_slug`). A short, stable,
  URL-safe identity of its own, `unique (slug)` across the deployment. Derived
  from the name at read time would need no column and is the version worth
  arguing against: it moves a service's URL every time somebody edits the name,
  and it has nothing to say when two names slugify alike. The column fixes both.
  It lands nullable, is backfilled through `public.key_slug` — the database's own
  slugifier, the one `src/lib/serviceSlug.ts` documents itself as mirroring — and
  takes the unique constraint only once it is populated. It STAYS nullable: the
  reader keeps a name-derived fallback for a null, which is only meaningful if
  null is reachable. No `grant update (slug)`, because nothing writes it yet; the
  edit panel adds the grant and the policy together, the way the examples panel
  did in `21000123000000` / `21000128000000`.

  **The scope module.** `serviceSlug.ts` reads the column with that fallback,
  `contexts/activeServiceStore.ts` (over `lib/serviceRoute.ts`) holds which slug
  the app is looking at as a module-level fact — non-React fetchers resolve the
  active service, which is the condition that rules context out — and
  `lib/service.ts` gains `findActiveServiceId`, one shared lookup per slug.
  `agent/tools/serviceScope.ts` is what a read will take: a `ServiceScope` that
  is `all` or one named service, resolved from the tool's `service` argument and
  the creator's default. A deployment with one service always resolves to `all`,
  so single-service behaviour is byte-for-byte the unscoped read it is today and
  none of the machinery runs. `serviceStakeholderIds` derives a service's cast by
  walking phases → scenarios → paths → `lanes.stakeholder_id`, which is ADR 3's
  implicit membership as a join — there is no `stakeholders.service_id` to filter
  on, and the test asserts the catalog table is never queried.

  **The creator's default is a setting.** `AgentSettings` gains
  `serviceScope: 'active' | 'all'`, and `AgentScopeField` puts it beside the
  provider and model rows. `active` keeps every answer inside the service on
  screen so a large deployment does not search all of them on every question; a
  per-call `service` filter overrides either way.

  **The read tools are deliberately untouched.** Rewriting their bodies to take a
  scope is the next step, and it wants a blueprint search that does not exist here
  yet; this changeset delivers the module and its tests so that step has something
  to build on. `touchpoints.service_id`, `touchpoints.stakeholder_id` and the
  registry hook are out of scope too — the first is an owner call about whether
  this template's per-service registry becomes the deployment-wide catalog ADR 3
  gives stakeholders.

  A schema column is a contract addition, so this is a minor. No identifier in
  `identifiers.json` moves and no path in `check-reference-paths.mjs` does.

- ecfa989: The agent reads the catalogs it could only write into, and every read takes a
  service scope.

  The deployment's tool roster is this one's plus fourteen. Thirteen of the
  fourteen need no migration — `lanes`, `cell_dependencies`, `stakeholders`,
  `evidence`, `business_models` and `agent_sessions` are all in the portable core
  with the columns these reads select — so the template takes them, under the
  deployment's exact names, descriptions and argument schemas.

  **Nine reads.** `list_references` (the rulebook vocabulary, live),
  `list_lanes` (the lane labels actually in use, distinct from the lane-roles
  doc, which says what the roles MEAN), `list_cell_dependencies` (the read half
  of `create_cell_dependency` — the agent could write an edge it had no way to
  read back), `list_stakeholders`, `list_evidence` / `get_evidence`,
  `get_business_model`, and `list_sessions` / `get_session`. The last two read
  the session store the switcher reads rather than `agent_sessions`, which is
  deliberately narrower than RLS permits: the agent sees exactly what the user
  sees.

  **Four writes.** `create_stakeholder` / `update_stakeholder` and
  `create_evidence` / `update_evidence`, each dispatching onto the same wrapper
  the panel calls, so the ledger entry and the captured inverse come free.
  `updateEvidence` is new — an edit with no inverse would have been the one
  change in the session log that could not be taken back — and lands with its
  `WriteFn`, its describe line and its revert case.

  **That gives evidence an owner.** CONTEXT.md's ownership table said
  **nobody** wrote `evidence`, and that was a fact about the roster rather than a
  position: the panel was its only writer. `who-writes-what`'s rule 2 — every
  write tool naming one of these records is assigned an owner — is what forced
  the answer rather than letting the row go quietly stale. Evidence belongs to
  **the cell**: the claim the source grounds, and the one thing every evidence
  row the agent can write names.

  **Scope replaces the cache.** `registry.ts` held one `cachedServiceId`,
  resolved once and reused for every write. It is gone. Reads take a
  `ServiceScope` through `resolveServiceScope` — the tool's own `service`
  argument first, then the creator's `serviceScope` setting, and always `all` on
  a deployment with one service, so single-service behaviour is byte-for-byte the
  unscoped read it was. Writes land on `resolveActiveServiceId`, the service on
  screen. `list_scenarios` and `list_stakeholders` carry the filter: the first by
  `phases.service_id`, because the journey is the hard per-service boundary; the
  second by ADR 3's implicit-membership join, because the shared catalog has no
  `service_id` to filter on. `readScope.test.ts` pins both.

  **The no-database trial keeps its arm.** Every new read answers with a null
  client. `list_lanes` and `list_cell_dependencies` gained sample readers over
  the bundled board; `list_references`, `list_sessions` and `get_session` never
  had a database behind them and serve the same implementation the live app does.
  `list_stakeholders`, `list_evidence`, `get_evidence` and `get_business_model`
  are deliberately off the trial roster — the sample is a board, not a
  deployment, and it carries no cast, no provenance and no business model — so
  they land on the honest "no database connected" sentence rather than an
  invented empty one. `sampleTrial.test.ts` now walks every registered data tool
  through a null client.

  Out of scope, and named so nobody looks for them: `search_blueprint` (needs a
  `public.search_blueprint` RPC this kit has no migration for), the
  `list_blueprint` name (this repo keeps `list_scenarios` — it names what it
  returns), the reference-doc import seam (the deployment's nineteenth doc,
  `blueprint`, has no file here, so `REFERENCE_NAMES` stays at eighteen) and the
  localStorage prefix (the template's `sb-` against the deployment's own).

  Thirteen agent tool names are contract identifiers in `identifiers.json`, so
  this is a minor. No existing identifier moves, and no path in
  `check-reference-paths.mjs` does.

### Patch Changes

- d5b28b2: The standalone sweep sees what a commit would.

  `npm run check:standalone` read tracked files only, so a changeset written
  and checked before `git add` passed the script and failed `npm test` the
  moment it was committed. The subject is now tracked plus untracked files
  git would not ignore — one function, read by the script and the test alike —
  with a test that builds a throwaway repository and proves an untracked file
  is swept and an ignored one is not.

## 1.5.2

### Patch Changes

- 0fcfd28: A touchpoint cell says what state it is in, and keeps the height the canvas
  reserved for it.

  The deployment's touchpoint cell had four behaviours this one lacked, and all
  four are the kind a template cannot grow later without the surfaces that
  consume them. It takes them now.

  **Status reaches the face.** `entity_status` has been a domain on
  `cells.status` since `21000125` and an entity has carried it in the types since
  #155, and nothing drew it: fifty design explorations would have read as shipped
  surfaces. `BlueprintCellButton` gains an optional `status`, marks itself
  `data-blueprint-cell-status`, and gives an unbuilt cell a dashed edge, a
  drained fill and a little transparency — three cheap signals that agree, so it
  still reads as unbuilt at the zoom where the dashes have collapsed into a grey
  line. `deprecated` exists and works, so it keeps its solid face and only fades;
  `at_risk` gets nothing at all, because dimming a working surface people rely on
  tells a reader not to. `entityStatusContract.test.ts` said these assertions
  would land with the face that draws them rather than with the vocabulary, and
  this is where they land.

  **A fixed height.** `TOUCHPOINT_ITEM_HEIGHT` and its compact twin were private
  to `blueprintLayout.ts`, so the stack estimate counted a height nothing
  enforced and a two-line touchpoint overflowed the row track reserved for it.
  Both are exported and the cell sizes itself to them. `inline` opts out, for the
  prose and list surfaces — the panel's dependency lists, the selected
  touchpoint's own field — where a canvas-height face would be absurd; those
  three call sites pass it.

  **A read-only surface, and a described one.** `selectionContext` is optional
  now: its absence is what makes the cell a face rather than a control, which is
  the state print, the compare grid's unselectable side and the dependency lists
  were all already in. `asSpan` hands straight to `TouchpointCellFace`, which
  this repo keeps as its own component; `aria-describedby` reaches both halves,
  so a compare cell can point at the caption that qualifies it.

  `nameOnly` stays a prop on `BlueprintCellButton` here rather than a
  `data-name-only` spread at the call site: a spread onto a typed component is
  not excess-property checked, so the attribute it means to set is dropped in
  silence. `blueprintTouchpointCell.test.tsx` comes across with the behaviour and
  holds the dashed face.

  The plugin contract is untouched — no identifier in `identifiers.json` moves,
  no path in `check-reference-paths.mjs` does — so this is a patch. A fork of
  `src` takes these as a visible merge conflict, which is what a template
  refactor is allowed to be.

## 1.5.1

### Patch Changes

- 6d76c42: `set_cell_dependency` is called with `name`, and the argument names are a check
  now.

  `21000116000000` renamed `cell_dependencies.label` to `.name` and moved the RPC
  parameter with it, and `src/lib/authoringRpc.ts` kept posting `label`.
  PostgREST resolves an RPC by matching the body's KEYS to a function's parameter
  names, so a key the function does not have means no candidate matches at all:
  the reply is `PGRST202 — could not find the function`, a 404 at the seam rather
  than a null column. Every arrow saved from `CellDependencyEditor` failed, and so
  did every `create_cell_dependency` the agent called. `client.rpc` is reached
  through an `any` cast — the file says why, and it is a good reason — so nothing
  in TypeScript could see it, and no guard was looking either.

  The word moves end to end: the wrapper's input, `DraftDependency`,
  `ExistingDependency`, the panel's field and its placeholder, and the generated
  `Args` for the function. The agent tool keeps saying `label` and `registry.ts`
  maps it, which is the deployment's spelling of the same seam: the word a model
  is asked for is not the schema's, and moving a published surface for a spelling
  costs more than the mapping does. `DeletionImpact.label` is untouched — that is
  the deletion target's display label, and the deployment still spells it that
  way.

  **The guard that would have caught it**: `npm run check:rpc-arguments` reads
  every RPC argument object in `authoringRpc.ts` — the `call`/`read` sites and
  the revert specs, because an inverse posts the same body one undo later — and
  holds their keys against the parameter lists parsed from
  `supabase/generated/portable-core.schema.sql`. Three failures, each naming the
  line: a key that is not a parameter, a parameter with no default the call omits,
  and a function the dump does not have. The `p_` prefix is compared verbatim,
  because PostgREST strips nothing and the `p_`-prefixed functions are called with
  the prefix.

  The rename map gains the other half of `21000115000000`: `slice_items` →
  `slides`, and `slice_items.caption` → `slides.title`. It enforces nothing yet,
  and the header says why rather than leaving the silence to be read as an
  oversight — `slices_referencing` is `language sql`, so its body kept the text it
  was created with and still selects `from public.slice_items`. Calling it raises
  `42P01`. Keying the fragment today would fail the dump sweep on that defect
  instead of on residue; finishing the rename is a migration of its own, and the
  row is written down while that is true.

  The plugin contract is untouched, so this is a patch: no identifier in
  `identifiers.json` moves and no path in `check-reference-paths.mjs` does either.

- 8f93a55: `slices_referencing` reads `slides`, and calling every `language sql` body is a
  check now.

  `21000115000000` renamed `slice_items` to `slides` and moved every dependent
  name a catalogue holds — four constraints, two indexes, a trigger, four
  permissive policies. It missed the one no catalogue holds: the text a function
  body was created with. `slices_referencing` is `language sql`, so its body survived the
  rename verbatim and still selected `from public.slice_items`:

  ```
  select public.slices_referencing(array[]::uuid[]);
  ERROR:  relation "public.slice_items" does not exist
  ```

  `deletion_impact` reads that function for `affected_slices`, and `delete_cell`,
  `delete_path`, `delete_scenario`, `remove_step`, `remove_lane` and
  `remove_lanes` all read `deletion_impact` — so no structural delete could
  succeed on a fresh core, and the confirm dialog raised `42P01` at the moment
  somebody was deleting something. Creation was no defence: the body was valid the
  day it was written, and the rename that falsified it validates nothing.

  `21000129000000` recreates the one affected body — the definition the schema
  dump holds, with the two occurrences of the relation written `public.slides` and
  nothing else changed. The signature, `language sql stable`, the `search_path`
  and the ACL are untouched: `create or replace function` keeps the object's
  grants, which matters here because the function is in the portable core and its
  `grant execute … to anon, authenticated` is in the Supabase recipe. Its proof
  sweeps every body in `public` and then CALLS both functions, because a `language
sql` body is text until something calls it.

  The same rename also missed three names a catalogue _does_ hold — the optional
  service-account tier (`20260818002000`) builds its RESTRICTIVE policies from a
  table list that still read `slice_items`, so a database replaying the whole
  series carried `slice_items_insert_service_only`,
  `slice_items_update_service_only` and `slice_items_delete_service_only` on
  `public.slides`, and `21000129000000` renames all three (a rename, so the
  definitions stay byte-for-byte) in its recipe half, guarded by the catalogue
  because the generated recipe already creates them under the current name.

  The rename map's row flips with it: `slice_items` is in the `retired` list now,
  and the header says what changed rather than leaving the old "enforces nothing
  yet" to be read as an oversight. Flipping it found the second copy of the same
  defect one estate over — `scripts/agent-harness/run.mjs` asked PostgREST for the
  retired relation as an embed (`slice_items(…,caption,…)`, alongside `description`
  and `origin` on `slices`), a string no compiler reads and `npm run
check:database-names` does; it reads `slides(…,title,…)` from `summary` and
  `authorship` now.

  **The guard that would have caught it**: `npm run check:function-bodies` stands
  up a fresh core + recipe + seed and CALLS every `language sql` function in
  `public` — a typed null per argument, inside a rolled-back transaction — plus
  `slices_referencing` and `deletion_impact` with real ids out of the seeded
  content. Only the SQLSTATEs that mean "that is not there" fail it, so a function
  raising its own exception on null input passes as tolerated. `--self-test`
  plants the defect in its own order — a table, a body that reads it, then the
  rename — and asserts the call is reported, because a run where every function
  answered looks identical to a run that called none of them. It runs in the
  `portable-core` CI job beside `check:seed-load`.

  Neither of the two static sweeps could have found this. The dump regenerates
  happily — a broken body dumps like any other — and
  `scripts/tests/portable-schema.test.mjs` blanks single-quoted strings before
  tokenising, which swallows the region inside a dollar-quoted body. Only
  `check:identifiers`, reading `pg_proc.prosrc` on a live database, saw it, and
  only once the word was retired.

  The plugin contract is untouched, so this is a patch: no identifier in
  `identifiers.json` moves and no path in `check-reference-paths.mjs` does either.

- 6d80772: The harness reads `audit_findings` and its `summary`, and a query path is
  checked against the schema now.

  `21000116000000` renamed the `findings` table to `audit_findings` and
  `findings.note` to `.summary`, and `scripts/agent-harness/run.mjs` kept asking
  for `findings?select=…,note,…`. PostgREST answers that with a 404, so the
  harness's `list_findings` case could only ever fail against a live project —
  and the two lines above it were the same defect twice more: `realGetSlice`
  selected `slices.description` and `slices.origin`, renamed by the same
  migration to `summary` and `authorship`, and embedded `slice_items(…caption…)`,
  which `21000115000000` renamed to `slides(…title…)`. Six dead names in one
  file. The reads the app makes were already right; the harness mirrors them by
  hand, which is what the header says and what nothing was holding it to.

  No guard could see any of it. The rename map retires `check_name` and nothing
  else from that row, on purpose — `finding` is the live domain word a panel has
  to be able to say, and `note`, `description` and `origin` are live words
  elsewhere in the tree. A word list is the wrong instrument for a name that is
  still a word.

  **The guard that would have caught it**: `npm run check:database-names` gains a
  second assertion. A raw PostgREST query PATH — `<relation>?select=<columns>` —
  puts a relation in the one position PostgREST reads as a relation, and
  everything inside `select=` is either a column of it or an embed of another
  relation, so both halves are held against
  `supabase/generated/portable-core.schema.sql` rather than against the rename
  map. A name the dump does not have fails whether or not anybody wrote it down
  as retired, and a retired relation is still followed THROUGH the map, so the
  dead table and its dead column are reported from one site instead of in two
  rounds against a live database:

  ```
  scripts/agent-harness/run.mjs:274: PostgREST query string names `findings`,
    which is not a table or view in the schema dump (→ `audit_findings`)
  scripts/agent-harness/run.mjs:274: PostgREST query string selects `note`, which
    is not a column of `audit_findings` (→ `audit_findings.summary`)
  ```

  The column half stops at the query path and stays there. A bare
  `.select('id, name')` carries the same information, but the relation it belongs
  to is the `.from(…)` on another line; a check that chased it would be reading a
  query builder rather than a literal, and the first correct call it failed would
  be the argument for switching it off. A view is a name whose columns are
  unchecked — the projection is its own business — so a query still cannot name
  one that is gone.

  The plugin contract is untouched, so this is a patch: no identifier in
  `identifiers.json` moves and no path in `check-reference-paths.mjs` does either.

- The lockfile states the version too.

  `npm run check:version` held three files to one number — `package.json`,
  `.claude-plugin/plugin.json`, the CHANGELOG heading — and `package-lock.json`
  sat outside it, still saying `0.5.0` five releases on. Every `npm install` in
  a fresh worktree rewrote the two lockfile lines from the manifest and left a
  dirty file for the next commit to carry or discard. The check now reads the
  lockfile's two statements (its root and its `packages[""]` entry, which must
  agree with each other before either is trusted), `--write` propagates into
  them, and the tree says one number in all four places.

- 5e43094: The template takes the deployment's names and its camera policy.

  Two files converge outright. `PhaseOverviewPhaseLoopArrow` drew the phase loop
  at `z-[60]`, sharing a layer with the annotation surface, which made the two
  order by DOM position; it is `z-20` now, with the deployment's own sentence
  saying why — above board content, below title badges and edit chrome.
  `badgeGeometry.test.tsx` had two case names calling the default size "the
  chip". Both files are byte-identical to the deployment's copies.

  `chip` stops being a name here, which is the other half of the row #158 could
  only take half of. Every spelling comes from the deployment: the cover's
  copy button is `CoverCommandCopy` reading `content.commandCopy`
  (`CoverCommandChip`, `coverContent.chip`), the menubar's count is
  `CompareDifferencesCount`, and the ledger's two markers split along the
  definition the rename map states — a `VerdictBadge` and a `CompareZoneBadge`
  describe the thing they sit on, a `FilterTag` is one value out of a set. A
  drag handle's group is `group/cell`, and the sample blueprint's findings panel
  lists severity badges. `scripts/tests/pill-is-not-a-name.test.mjs` becomes
  `scripts/tests/badge-and-tag.test.mjs` — the deployment's name for the same
  guard — and its subject is now the row's whole pair.

  `picture` moves only where the deployment moved it: `resolveCellDetailPictures`
  is `resolveCellDetailImages`, and the panel's `detailImages` / `showImages` /
  `imageBlock` follow. The word stays a name everywhere both repositories still
  use it — `visualPictures`, `getTechItemDetailPictures`,
  `BlueprintStepVisualPicture` — because a sweep past that point would diverge
  from the deployment rather than converge on it. What the rename map gains is
  the row for `cells.picture` → `cells.frame`, which `21000115000000` shipped
  here and nothing recorded; `picture` is a substring of no surviving database
  name, so unlike most of that block the row enforces.

  Two edge names take the deployment's spelling: `linkLabel` → `linkName`, and
  the lane's row position is `laneRowPosition` / `selectedLaneRowPosition` /
  `getSelectedCellLaneRowPosition` in `blueprintCellConnections.ts`,
  `CellDependencySections.tsx` and the cell panel.

  `src/lib/canvasCameraPolicy.ts` arrives whole, with the behavioural test that
  replaced asserting literals against a component's source text. Its three
  functions — `getMinFitZoom`, `getSemanticZoomThreshold`,
  `getFocusedComparisonCameraKey` — take over from `ServiceOverviewView`'s two
  inline constants and its path-free camera key. The key is a widening rather
  than a reversal: it returns `'stable'` outside a focused scenario, so a filter
  toggle at the overview still keeps the reader's pan and zoom, while a focused
  comparison changing its own geometry becomes the camera event it is.

  Check C's extraction now strips comments, which is what its own header always
  claimed. `JSX_TEXT` reads between a `>` and the next `<`, so a doc comment
  containing a backticked `<textarea>` handed it a whole paragraph of prose as a
  "reader-facing string" — the false positive its header says to answer by
  narrowing the subject, never the word list.

  The plugin contract is untouched, so this is a patch: no identifier in
  `identifiers.json` moves and no path in `check-reference-paths.mjs` does
  either.

## 1.5.0

### Minor Changes

- e647d9b: An edge is a dependency.

  The database has said `cell_dependencies` since `21000103`, and the domain
  layer above it went on saying `trigger` — `BlueprintData.triggers`,
  `BlueprintCellTrigger`, `IntegratedTriggerArrows`, `remapMergedPathTriggers`,
  the doc comments explaining what an arrow is, the prose the reader meets on
  the cover, and the tests. One concept, two words, with the seam falling
  exactly where a person crosses from the schema to the code that reads it.

  The word is now `dependency` everywhere it means the edge:
  `BlueprintData.dependencies`, `BlueprintCellDependency`,
  `IntegratedBlueprintDependency`, `IntegratedDependencyArrows`,
  `BlueprintDependencyArrows` (both components renamed to match their type),
  `remapMergedPathDependencies`, `blueprintLaneHasCorridorDependency`,
  `blueprintHasInLaneDependency`, `flattenDependenciesFromCells`,
  `normalizeDependencyKind`, `dependencyId`, `dependencyKeys`. `BlueprintData`
  is a public read-surface type, so this is a breaking rename for anyone reading
  it — hence a minor, and the map above is the whole of it.

  `trigger` stays where it means a Postgres trigger — `cells_validate_path_match`
  and the `updated_at` triggers — and where it means the thing a UI control
  opens, or the word that carries a branch in the router. Those are three other
  concepts that happen to share a spelling, and none of them is an edge.

  The band vocabulary lands in the same pass. A storyboard lane is a storyboard
  lane in code as well as on screen (`isStoryboardLane`,
  `resolveStoryboardStripEntries`, `StoryboardFrameEntry`,
  `StoryboardBlueprint`), and a touchpoint is a touchpoint rather than a "pill"
  — `isTouchpointLane`, `touchpointLanes`, `titleRepeatsTouchpoint`, and the
  comments around them. "Pill" was a third design-system word for what is either
  a badge or a cell, and the shape has been a variant since the touchpoint split.

### Patch Changes

- 8bbe6c7: A badge is one size, in one place.

  `PathLabelBadge`, `PathKindBadge` and `ScenarioTitleBadge` each wrote their
  own height, padding and type scale around `<Badge>`, and the three did not
  agree: all three called the small shape `compact` and all three meant
  something different by it. `ui/badge.tsx` now carries a `size` variant —
  `default`, `fitted`, `roomy`, `comfortable` — and the wrappers name a shape
  instead of deriving one. Same pixels, pinned by `badgeGeometry.test.tsx`,
  and a deployment's `one-badge-one-size` contract holds without an exemption
  for these three files.

- a6bdde2: A reference path is an interface.

  A deployment imports twenty-two of this repo's documents by fixed path at
  build time from a pinned tag — eighteen references and the four skill
  bodies. Nothing here guarded those paths: a move landed green and was found
  at the consumer's build. `check:reference-paths` holds the list and fails
  this repo first, and ADR 0004 records the rule: moving one is a version bump
  plus a matching consumer change, never a silent move.

- 2fcfbc9: A retired kind has no quiet spelling.

  `cell_dependencies.kind` has been `leads_to` and `enables` since
  `21000114000000`, but two documents still taught the pair it replaced:
  `references/canvas-adapter.md` promised "trigger-vs-needs semantics" and
  `evals/behavioral/evals.json` graded the whatif skill on whether it "Walks
  trigger/needs edges". `check:dependency-kinds` banned those words in their
  code-span form and neither wore backticks, so both stayed green for a
  release — and a third, the comment beside the adjacency walk in
  `slice_tools.py`, was outside the sweep's markdown-only reach entirely.

  All three now say `leads_to` and `enables`, and the check has a second
  retired-spelling assertion that would have caught them: a short list of
  phrases in which the two words can only be dependency kinds, swept over
  `references/`, `skills/`, `agents/` and `evals/` — their JSON and Python
  included. The phrases are narrow rather than the words, so the integrity
  trigger `cells_validate_path_match` and the English verb stay out of reach
  without an exemption; `BARE_ALLOWED` holds the two sentence kinds that do
  need one, with a reason each.

- 1ba2c9b: A deployment's own seed, loaded onto this template's portable core.

  `check:seed-load` proves the loop closes on content this repository generated
  itself, which the generator and the schema can hardly disagree about. The
  question a reconciliation ticket actually asks is whether the portable core is
  SUFFICIENT for the content a real deployment holds, and only a deployment's own
  seed answers it.

  `npm run check:deployment-seed-load` stands up the same fresh stack — shim,
  platform default, core, recipe — and loads a deployment's seed in place of this
  one's, in the order the deployment itself states under `[db.seed]` in its
  `supabase/config.toml`. Then the same anon reads: every table the seed writes
  comes back non-empty to the key a browser holds, and the blueprint grid and the
  service hierarchy return rows.

  It applies the seed with `ON_ERROR_STOP` off on purpose. Here the failing
  statements are the deliverable, not a bug to stop at, so every one is collected
  and grouped by reason with counts and examples — and knock-on failures (a
  foreign key whose row an earlier failure never inserted, the core's own
  row-validation raises, an aborted transaction block) are reported separately, so
  the root cause is not buried under the forty rows it caused.

  Point it at a deployment with `--seed <path>` or `DEPLOYMENT_SEED=<path>`; with
  neither it finds a checkout beside this one that ships a `supabase/seed.sql` and
  declares a different package name, and skips with a message when there is none
  or more than one. CI checks out one repository, so it would skip on every run —
  it is documented as a local guard instead, and its parsing and skip logic are
  held by `scripts/tests/deployment-seed-load.test.mjs`, which does run in CI.

  `SETUP.md` now carries the path it guards as a five-step checklist — clone, run
  with no database, set the two variables, replay, your own content — each step
  ending in something to check rather than something to look at, because this app
  renders bundled content whenever it cannot reach a database and every step after
  a silent failure still looks like it worked.

- e4880a0: An entity carries its status in the types.

  `entity_status` has been a domain on `cells.status` and `paths.status` since
  migration `21000125`, and `src/lib/entityStatus.ts` has spelled the ladder for
  the app the whole time — but no entity in `src/types/blueprint.ts` had a
  status, so the board query never selected the column and the normalizer never
  mapped it. A status a migration guarantees and no read carries is a column
  nobody can see. `BlueprintPath` now requires `status`, `BlueprintCell` carries
  an optional one, `PATH_BLUEPRINT_SELECT` asks for both columns, and
  `normalizeBlueprint` narrows what comes back through `asEntityStatus` — a rung
  the renderer has no treatment for reads as absent rather than as an
  unrecognised marker, and a path with nothing said about it reads as `live`.
  Both generators emit the same default, so an offline board says what the
  database says.

- 7ded4a7: `CONTEXT.md` becomes a glossary.

  It was 31,839 characters, and three of its six sections were not definitions: a
  rename map, an interface-to-schema map, and a section of reasoning about which
  words a sweep should skip. Every session that opened the file to look up one
  word paid for all three. It is 13,076 characters now, and each of the three
  lives beside the thing it is about.

  The rename map's prose table is deleted — `scripts/retired-vocabulary.mjs`
  already carried the same rows in code, and a parity test held the two together.
  With the prose half gone the pair is a single list, so that test goes and the
  commentary moves into the data file's header: why each name went, and which
  renames the `retired` and `copy` word lists deliberately leave out. The section
  on words that keep a retired spelling moves, word for word, into the header of
  `scripts/check-retired-identifiers.mjs`, beside the exemption list that applies
  it — so a skipped word and the reason for skipping it are one edit.

  The interface-to-schema map is now `references/interface-schema-map.md`,
  reached by one pointer from the router and generated: its binding table from
  `LABEL_COLUMNS` in the new `scripts/interface-schema-map.mjs`, and under it a
  coverage line counting the `COMMENT ON` statements in
  `supabase/generated/portable-core.schema.sql` and naming the eight bound names
  that carry none. The comments are counted rather than reprinted, because two of
  them are stale in a way the markdown sweeps cannot see — `paths` still calls its
  kinds "happy, unhappy, exception, alternative" — and a generated reference that
  teaches an agent a retired value is the defect this repo already has a check
  for. It sits under `references/` so that a deployment that wants it can import
  it at a path that holds still (ADR 0004); nothing imports it yet, so it is not
  in `CONSUMER_IMPORTS`.

  `npm run check:glossary` is what stops the file growing them back — headings,
  prose and `**term** — definition` rows, failing on a code fence, on a table
  naming a `table.column`, and on a section that defines no term — and
  `npm run check:interface-map` holds the generated document to its sources. Both
  join the guard set and both are driven from fixtures that break them.

- e30cb9a: Pill is retired outside touchpoints too.

  The deployment settled this word in two halves. #160 took the half where
  "pill" meant a touchpoint — `isTouchpointLane`, `touchpointLanes`, the cell
  variant — and left the other half standing: the three components that used
  "pill" as a shape, and the forty-odd comments that named one. So the app went
  on calling the collapsed sidebar's floating navbar a pill, the zoom control a
  pill, the menubar's difference count a pill, and the cover's segmented row a
  pill row, each of which is a badge, a button or a control and none of which is
  a name the design system still has.

  Three components take the deployment's spelling exactly:
  `FloatingSidebarPill` → `FloatingSidebarNavbar` (exported from
  `EditorChrome.tsx`, with its `data-editor-sidebar-pill` attribute now
  `data-editor-sidebar-navbar`), `SliceRefocusPill` → `SliceRefocusButton`, and
  `PathNotionPill` → `PathNotionToggle`. `FloatingSidebarNavbar` is exported
  from `EditorChrome.tsx`, so a fork of `src` adopting these names lands the
  import change with them — a visible merge conflict, which is what a template
  refactor is allowed to be; the plugin contract is untouched, so this is a
  patch. No path in `check-reference-paths.mjs`'s `CONSUMER_IMPORTS` moves:
  nothing a deployment imports by fixed path from a pinned tag is touched.

  Thirty-nine comments follow, each taking the sentence the deployment's copy of
  the same file already reads; where the word meant a touchpoint inside `src` —
  five comments in `blueprint.css` — it becomes `touchpoint`, which is what the
  deployment's stylesheet says. The two cover figures name their lane labels
  `badge` rather than `pill`.

  `scripts/tests/pill-is-not-a-name.test.mjs` is what keeps it. The `pill`/`chip`
  row of the rename map enforces no identifier — no database object ever bore
  either word — and its copy list only reaches what a reader sees, so the app's
  own names had nothing but review behind them, which is exactly how three
  components survived #160. The new guard's subject is every name under `src`
  with comments stripped, so a component, a prop, a constant, a variant string, a
  data attribute or a file name written next week fails on the word. It takes
  `pill` alone: `chip` is still a live name here (`coverContent.chip`) and
  retiring it is its own change.

  `lane_role`'s catalogue comment still reads "pill cells", because no migration
  has moved it. The documents that quote it — `references/data-model.md`,
  `references/ir-schema.json`, `agents/render-checker.md` — quote it accurately
  and are unchanged, as the deployment's own mirrors of that comment are.

- 27306f0: The settings surface is two halves with one seam.

  `AgentSettingsFields` was one 323-line component holding two jobs that share
  nothing: the auth drafts, the busy flag and the magic-link state on one side,
  the provider/model/key trio on the other, with no state crossing between them.
  It is now `AdminSessionFields` and `AgentProviderFields` — each reading only
  the context field it needs — and a 62-line composer that owns what genuinely
  spans both: the column, the headings, the rule between them and the gate that
  decides whether the second half exists at all. The split is the one a
  deployment built on this template already made, taken here byte for byte, so
  the two files stop diverging; `agentSettingsFields.test.tsx` pins the seam by
  asserting which half is on screen for whom.

  The move carries a fix. The model-list fetch gated on `open` — the global
  `window.open`, always truthy — so the `active` prop it meant to read never
  gated anything, and a closed settings surface still made the provider
  round-trip. It reads `active` now.

  Template-only affordances stay in the composer, each marked: the no-database
  sample trial (an unconfigured build opens the key field with no session to
  gain, and shows a sentence where the sign-in form would be) and
  `DevPortalSection`. The scope field of that deployment's split is not here —
  it needs a multi-service model this template does not have yet.

- 55fe7f4: The compare data layer says it once.

  Three compare modules bucketed items by a derived key with the same
  push-or-seed loop, written out longhand each time — and the merged grid
  carried a parallel array beside its map, because the loop that seeds a
  bucket is also the only place that knows the order. `groupBy` in `lib/utils`
  says it once and iterates in first-seen order, so slots by column, the
  column agreement groups, the ledger's accordion groups and the merged
  signature groups all read as what they are. `compareSlots` also drops a dead
  count guard — a one-path slot is `only`, never `divergent`, so the field
  comparison never sees it — with a test that says so; and the path band and
  the merged grid stop restating locally what the layout module already
  exports.

  One contract narrows: the scenario panel registers its compare review — the
  `[≠ N]` chip, the ledger, the agent's compare commands — only while the
  board is the focused scenario (`focusActive`), never by mount order. The
  template's own overview already passes that flag, so nothing it renders
  changes; a deployment that renders the panel solo must now say the board is
  focused to get a review on it.

- 10050b8: The router gets its three checks.

  `AGENTS.md` is the whole always-loaded tier — the one file a session is handed
  before it decides anything — and it was already close to a router. Nothing
  held it there. It now stays under a stated char budget that fails downward as
  well as up, its prohibition count only falls, and every pointer in it resolves,
  leads with the word that carries the branch, and names a document at all.
  Three items that were bodies rather than pointers moved out. § Rules that hold
  for every skill is exempt from the trigger rules, because those bind before any
  pointer could fire; their paths still have to resolve.

  `check:budget`, `check:negation` and `check:pointers` join the guard set, all
  three reading one list of what is in the tier
  (`scripts/always-loaded.mjs`), and each is driven from a router that breaks it
  rather than only from the one that passes. The writing vocabulary the three
  share — pointer, ladder, disclosed, leading word, sprawl — enters `CONTEXT.md`.

- 81541b2: The router is swept.

  `AGENTS.md` is the one file every session is handed without choosing, and
  it was the one file the vocabulary sweeps never read. It joins the swept
  set, so a retired value stated in the router fails the build like it would
  anywhere else.

## 1.4.0

### Minor Changes

- 3dea76d: The frame carries both axes.

  A path outline is a frame around the path's own cells. It was drawn around the
  lane-label rail as well, because the rail was just the grid's first column and
  the frame spanned the whole band — so the row-axis labels, which name lanes the
  whole scenario shares and belong to no single path, sat inside one path's box.
  `ComparePathSectionFrame` takes `excludeLabelRail` now and starts after the
  label track, offset by `COMPARE_LABEL_TRACK_WIDTH + STEP_COLUMN_GAP` on the
  compare arrangements and by `LANE_COLUMN_WIDTH` on the service grid.

  The frame carries the other axis at the same time. `extraTopInset` still
  stretches it up past the step-header row, and the light band that tints that
  row now takes its left edge from the frame's own inset rather than from the
  horizontal constant — with both axes on, a band written against the constant
  painted the header tint straight across the rail.

  The rail converges with it. The caption and its rule are one row again, so the
  line begins where the words end and runs `ruleOverhang` past the outline it
  crosses (`COMPARE_DIVIDER_RULE_OVERHANG`, and the same formula rather than the
  same number for the service grid). The lane label takes `BLUEPRINT_SLOT_INSET`
  on both edges, the inset the cells it names already use, which is the rhythm
  `railRhythmContract.test.ts` pinned and the rail did not yet keep. The rail's
  right-hand hairline is gone — two vertical lines a few pixels apart described
  one edge — and so is the second coat of rail colour on every lane row, which
  under the canvas transform antialiased into a hairline rectangle around each of
  them. `BlueprintStickyLabelBackdrop` paints that column, once.

  A divider caption is an outlined block that says what its line separates, and
  the path badge is a badge: no dismiss control, one cursor whether or not there
  is a definition behind it, and the explanation on hover, focus and tap. The
  scenario title's aside is `note`, which is what it is, rather than
  `infoTooltip`, which is what it used to be shown in.

- 43d3b70: The rail axis is one width.

  The label rail was 208 wide, and "LINE OF INTERNAL INTERACTION" — the longest
  canonical divider caption — does not fit in 208 at `text-2xs`. It is
  `shrink-0`, so it neither wrapped nor truncated: it ran out of the painted rail
  and the only thing left between those words and the path outline was the gap to
  the board. That gap was then sized to hold text rather than geometry, and every
  value that made the lane label look right put the caption on the outline. The
  rail is 214 now, which is what the caption needs, and the gap has a name of its
  own — `COMPARE_RAIL_GUTTER`, 8 — with `COMPARE_LABEL_TRACK_WIDTH` naming the
  grid track the two make together, wider than the rail it paints. The horizontal
  inset inside a path outline is `COMPARE_PATH_SECTION_H_INSET`, 16, split from
  the top and bottom pair it used to share a constant with;
  `COMPARE_PATH_SECTION_INSET` stays as a deprecated alias so nothing has to move
  at once. `railRhythmContract.test.ts` pins the result: 30px from the lane label
  to the outline, 30px from the outline to the first cell, and the caption
  clearing the outline by the same 30.

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
