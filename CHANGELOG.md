# Changelog

## 1.24.0

### Minor Changes

- d74503c: Twenty contracts a deployment wrote against this code arrive here

  A deployment held 43 test files this repository did not, every one of them
  written against behaviour that lives here. They were about to be counted as a
  cost of consolidating — tests that would be deleted when the deployment stops
  keeping its own copy of the application. They are not a cost; they are
  coverage this repository never received.

  All 43 were classified by whether every module they import exists here. 38
  did. Those 38 were run against this tree as they stood: **22 passed
  untouched**. Two more were dropped for a type this repository's `BlueprintCell`
  does not carry, leaving twenty.

  The other sixteen failed, and that is the useful half of the result. A
  contract written against shared code that fails here is a measurement of real
  divergence between the two trees, named file by file, and it belongs to the
  convergence work rather than to this changeset.

  Six of the twenty named a deployment — a fixture named after the deployment, a slug,
  a comment naming the bot that builds a link. Those are neutralised, which is
  what the standalone guard is for, and one comment misused `lane` where it
  meant a boot signal.

  1782 tests to 1996.

## 1.23.0

### Minor Changes

- 29845ab: The selection outline is drawn inside the cell, and the theme toggle keeps one positioning layer

  Selecting a blueprint cell drew a 2px ring OUTSIDE its border box, with two
  consequences.

  The silhouette changed. A ring with spread rounds at the element's radius plus
  the spread, so a selected cell was 2px larger with a 12px outer corner where
  hover had 10px. The radius never changed; the outline around it did, and that
  reads as the corner changing between states.

  And on the board it was barely there. The ring is 2 CSS px in BOARD space, so
  the camera scales it: at a working zoom it lands near one device pixel, and on
  the visual lane it is slate on slate. Selection looked like a corner artifact
  rather than an outline.

  An inset ring fixes both. The outer edge stays exactly the cell's radius in
  every state, and the outline lands on top of the fill where it reads as a
  border and survives being scaled down. It is what this canvas already does for
  connected emphasis, in `blueprint.css`, for the same reason.

  Separately, `ThemeToggle` positioned the resident glyph absolutely inside a
  `relative` box while `popLayout` was already holding the outgoing one's box —
  two mechanisms doing one job, and the `relative` existed only to anchor the
  second. The grid centres both.

## 1.22.1

### Patch Changes

- 30a6c7b: The storyboard walkthrough says what it is, and one error stops being unwrapped by hand

  Two small things a deployment had already fixed and this repository had not.

  The walkthrough dialog announced itself as "Presentation" — to a screen
  reader, the only name it had. It is the storyboard walkthrough, and the app
  calls it that everywhere a reader can see. The accessible name now agrees with
  the visible vocabulary.

  `StructureRowMenu` unwrapped a duplicate failure with an inline
  `instanceof Error ? … : String(…)`. `errorMessage` in `lib/utils` is that
  expression, the same file already imports it, and the rename path two hundred
  lines down already used it. One spelling for one job.

## 1.22.0

### Minor Changes

- 1afc8dc: `@/…` can resolve to the package, so a deployment need not keep a copy of `src`

  A deployment that imports this repository as a dependency should be able to
  read the application out of `node_modules` instead of holding a copy of every
  file. It could not, and the reason was three lines of build configuration.

  `vite.config.ts`, `tsconfig.json` and `tsconfig.app.json` each map `@` to
  `./src`, and a deployment holds all three byte-identical to this repository's.
  So the deployment could not point the alias at the package without editing a
  file it has promised not to change — and with no local `src`, every `@/…`
  import in this package fails to resolve. Measured against a real deployment
  tree with `src` removed: `TS2307: Cannot find module '@/config'` and the same
  for every other alias, from this package's own files.

  Each mapping now names TWO roots, tried in order: `./src`, then
  `./node_modules/agentic-service-blueprinting/src`. TypeScript's `paths` takes
  an array and falls back per module. `vite.config.ts` chooses the first root
  that exists on disk.

  Nothing observable changes here or in any deployment that still has a `src`:
  the first root always exists and the second is never reached. With `src`
  removed, the same deployment tree typechecks and builds clean.

  `src` is all or nothing. `paths` falls back per MODULE and the Vite side per
  ROOT, so the two agree exactly when `src` is wholly present or wholly absent
  and can disagree on a half-vendored tree.

## 1.21.0

### Minor Changes

- 5260083: A badge's size is decided in `ui/badge.tsx`, or at every call site at once

  `ui/badge.tsx` offers four closed sizes. Seven call sites ignored them and
  wrote the geometry themselves — three distinct shapes, two of them below every
  size the variant offers, so a badge in the editor chrome was smaller than the
  same badge anywhere else for no stated reason. Each was written in isolation
  against a shape someone else had already chosen, which is the failure review
  cannot catch: every one of those diffs looked reasonable alone.

  The seven overrides are removed and the badges take the variant's `default`.
  Visible in the editor chrome, the canvas design tools, the developer portal
  and the slide artboard.

  Removing them is the afternoon; keeping them gone is the point, so
  `scripts/tests/one-badge-one-size.test.mjs` arrives with them. Its subject is
  what a call site passes to a badge — not a sweep for `text-2xs`, which would
  need an exemption for every span that legitimately has one, and an exemption
  list is where a real finding hides. Wrappers that forward their `className` to
  a badge are DISCOVERED rather than listed, so the next one is covered the day
  it is written rather than the day someone remembers the list.

## 1.20.1

### Patch Changes

- d15118a: The docked navbar says why it is flush left

  `SlideStickyHeader` sits hard against the left edge of the main column with no
  margin, and nothing in the file said why. The sidebar is in flow rather than
  overlaid, so there is no overlay to surrender a margin to — an absence that
  reads as an oversight until someone knows that.

  Written down here because the deployment had already written it down there:
  this is a shared file whose two copies differed by that comment alone. It goes
  upstream so both can carry it.

## 1.20.0

### Minor Changes

- caa347f: A refused write says the tier is stale

  The editing tier is asked of the database and held against the access token the
  client presents. That is right for as long as the token is. It is wrong for the
  window between a server-side demotion and the next token refresh, and during
  that window the reader is shown save controls the database will refuse — a
  button that lies.

  The obvious fix is a revocation path, and it is bigger than the defect. The
  database is already the authority and re-evaluates the session on every
  statement, so a demoted session's writes fail there whatever the UI believes.
  Nothing is getting through; the UI is just still offering.

  So the trigger is the moment the lie is exposed. A write that comes back denied
  on authorization grounds is the one reliable signal that the held answer is out
  of date, and acting on it costs nothing on the happy path: no timer, no polling,
  no round-trip until something has already gone wrong. `toAuthoringError` is
  where it fires, because that translation function is the single funnel every
  failed write passes through — there is no one place those failures are caught,
  each call site raises and the surface above it renders, so the translator is the
  only seam they share. `writeTranslationContract.test.ts` is what makes "every
  failed write" a fact rather than a hope, and it now says so: a module that
  raises the database's own text loses the phrasing _and_ the reconcile.

  The refresh itself is deliberately small and deliberately defensive.
  `refreshSession()` resolves on failure — auth-js catches the error and hands it
  back in `{ data, error }` rather than rejecting — so a reconciler written inline
  in the provider would report success on every failed refresh and its logging
  would be dead code. `sessionRefresher` reads the field and throws, and it is
  tested against that shape rather than against a hand-written rejecting function.
  A burst of denials from one save fanning out over several tables collapses to a
  single refresh, guarded by both an in-flight flag and a cooldown, because the
  rows were all refused by the same token. A refresh that fails logs and stops: the
  reader is already being shown why the save failed, and a second error on top of
  the first would turn one refused save into a lost session.

  The seam is a registration, not an import. The client lives in
  `SupabaseProvider` and `src/lib/` does not reach up into `src/contexts/`, so the
  provider registers a reconciler while a client exists and unregisters when it
  goes. Until it does, the whole path is a no-op — which is also what a boot-order
  failure looks like, and what an app with no database configured gets.

## 1.19.1

### Patch Changes

- 6673939: A loading destination is not a new place to fit

  A canvas already saved its pan and zoom when its tab unmounted, and already
  restored them on the way back. Readers still lost their framing on every tab
  switch, because a return does not remount straight onto its board: it boots on
  a skeleton, under a destination that names the wait, and the real board only
  replaces that a beat after readiness renames the destination. The viewport read
  the hop as _the reader went somewhere else_, threw the saved framing away in
  its state initialiser, and fitted.

  So the destination key is now compared only when it names a board that is
  actually on screen. `cameraDestinationResolved` is what says so — false while a
  surface stands a skeleton in for content that has not arrived — and while it is
  false the inherited framing is HELD rather than judged. The ordinary fit still
  runs underneath, exactly as before, so a board that never had a framing to
  inherit behaves identically and nothing waits on a decision that may never
  come.

  The decision itself moved into one place and grew a second seam. A mount that
  never waited settles it where it always did, inside the fit effect, before the
  fit is scheduled. A mount that DID wait has no `resetKey` change to settle on —
  the destination was already named while the skeleton stood in for it — so the
  arrival of the board is its own layout effect, declared after the fit effect so
  the two can never both decide.

  Two things fell out of separating _what is being adopted_ from _what is on
  screen_. The framing now comes from the snapshot rather than the live
  transform, which by then is the placeholder's fit; and the geometry it is
  checked against is measured at the zoom the board is painted at, not the zoom
  being adopted, because `measureFitBounds` divides client rectangles back out by
  the live scale and mixing the two reports a box off by the ratio between them.

  Both refusals are unchanged and now covered through the wait as well: a
  different semantic destination, and a fit target whose geometry genuinely
  moved, still fall back to the canonical immediate fit. Leaving mid-flight still
  remembers where the camera was, never where it was going — and leaving before
  the board arrives hands the inherited framing straight back rather than filing a
  placeholder under a key that names the wait.

- 6de9d0a: A rulebook for an empty room

  `docs/plans/` held one file, and that file was the rules of the folder: what a
  plan is, that a plan is dated and never edited, that `status:` is required in
  its frontmatter, that a plan is never current guidance. Its own last section
  said the folder was empty — the planning documents were retired when the
  package was generalised out of the deployment it grew from, because they
  described that deployment more than they described this package.

  So the concept goes, not just the files. Keeping the machinery for the plans
  that might land next is the cheap-looking option and the one this rejects: a
  reader who takes the doctrine seriously learns a document class the repository
  does not have, and an agent cannot tell a dormant convention from a live one.

  What went with it. The index generator loses its history directory, the table
  it built, the rule that failed the build on a plan stating no `status:`, and
  the routing row asking whether a plan is still true — `docs/index.md` now has
  one table, and says in a line that everything in it is protocol. `docs/`'s own
  overview, the documentation grammar and the contributing guide stop pointing
  readers at a folder that is not there. The vocabulary sweeps exempt `docs/adr/`
  and nothing else.

  The migration that cited a plan by address loses the line outright rather than
  having it rewritten. The line above it already says what the migration does and
  the block below already states the invariants, so the address was carrying
  nothing but a pointer — and it had already stopped pointing anywhere.

  One thing was rescued before its protection was deleted. The standalone check
  excluded the folder on the argument that those documents ordered the decoupling
  and stripping them would destroy the record of why the boundary exists. That
  exemption is dead, but the argument is not, so it now sits in the header of the
  check itself: standing alone is an assertion this package makes about itself,
  the reader it is made to is a contributor with none of the context the package
  grew up in, and a check is what makes the boundary verified rather than
  assumed.

  The decision is
  [ADR 9](docs/adr/0009-the-queue-is-issues-and-a-durable-decision-is-an-adr.md).
  Work in flight is GitHub issues, a durable decision is an ADR, current
  behaviour is protocol, and the retired content is in the git history.

- d197ac7: `linkedText` stops naming the migration that retired the column it replaced

  The doc comment read "This is the whole job `evidence.ref` was carrying
  (21000208000000)". The parenthetical is an address into this repository's own
  migration series, and a deployment's copy of this file carries a different
  number for the same change — its series is its own.

  That makes the file unenrollable in the byte-identity sense a deployment
  promises: a shared file may not cite an identity that means something else on
  the other side, which is exactly what a migration filename is. Two copies that
  agree on every other byte were kept apart by a number neither reader needs.

  The sentence loses nothing. What `evidence.ref` was for, and why a note holding
  a locator replaces it, is the whole point of the comment; which migration
  performed the retirement is answered by the series itself.

## 1.19.0

### Minor Changes

- 7657564: The scenario note reaches the title that carries it

  `scenarios.note` has been in the schema for a while, with a column comment
  arguing at length for what it is: an aside about the scenario, beside the
  summary that says what it is, held as blueprint data rather than as a `Record`
  keyed on hardcoded scenario ids that only its author can read. The generated
  row type carries it. `EntityDefinitionPopover` accepts a `note` and renders it
  as a section under its own eyebrow. `ScenarioTitleBadge` passes one through.

  Nothing ever read the column. The one caller that passes `note` hands it a
  hardcoded `null`, and the select in `useServicePhases` never asked for the
  field, so every popover in the app rendered the same three-quarters of a
  mechanism. A deployment that wrote a note into a scenario row got a column
  that stored it and no surface that showed it.

  The read seam asks for `note` now, `NavItem` carries it, and a slide header's
  title — an `<h1>`, so not the badge's job — hangs the definition card off the
  word. `ScenarioTitleDefinition` is the piece that was missing: it composes no
  sections of its own, it only decides that a heading gets the same card a badge
  gets, and it deliberately does not pass the summary, which both headers
  already print as prose two lines below.

  The aside rides on the WORD rather than on an ⓘ beside it. Four other surfaces
  use that glyph to mean _opens the panel_, and one glyph cannot mean both that
  and _there is an aside here_.

  Also: `runConformance` was the last place in the repository still inlining the
  `catch` block that `errorMessage` exists to replace. Seventeen files stopped
  writing it by hand; this one did not, because its `detail` is assembled a few
  lines away from where the others set an error message.

## 1.18.6

### Patch Changes

- 2edfeec: The pair rule says where it applies, and names the six policies outside it

  Two sentences shipped in the last two releases claim slightly more than is
  true, and both are in places a reader consults to decide what to write next.

  The write-policy convention said the single-permissive spelling "is
  deliberately not used here". The rule around it is scoped correctly — it says
  _when you put a table on the write surface_ — but "here" reads as the whole
  schema, and `touchpoints` and `resources` carry six such policies off the
  surface. They are reached only through RPCs, they admit exactly a service
  account, and they are not holes. Nothing decided they should keep the older
  spelling; the pair migrations simply scoped themselves to the surface and
  these two are not on it.

  So the clause is scoped, and the exception is named rather than left for
  whoever greps `_service_only` and finds a shape the paragraph above says is
  not used. Whether the pair should extend past the surface stays undecided —
  written down as undecided, which is the part that was missing.

  The second is smaller: the write surface's own header said the app "inserted
  and deleted" `audit_findings`. The scan finds INSERT and UPDATE and no DELETE
  anywhere — a finding is closed by its `status`. The list is derived, so
  nothing behaved on the wrong claim; it was prose describing the derivation.

## 1.18.5

### Patch Changes

- ea6bb90: A restriction needs something to restrict

  Twenty RESTRICTIVE policies, over eleven tables, stood for a verb that no
  permissive policy opens. Under row level security a restrictive policy narrows
  and never admits, so a verb in that position matches zero rows for everyone the
  restriction names — a lock hung on a door that was never cut into the wall.
  `21000214000000` removes them.

  **Nothing about who may write anything changes.** Every one of the twenty verbs
  was refused before this release and is refused after it, and refused for the
  same reason: `authenticated` holds no grant for it at all, so an attempt is
  turned away with a permission error before row level security is ever
  consulted. There was no hole and this release closes none. Read as a patch it
  would say the opposite of what is true, so the migration says so in its own
  header.

  The verbs are `insert` and `delete` on `cells`, `lanes`, `paths`, `phases`,
  `scenarios` and `steps`; all three write verbs on `cell_dependencies` and
  `path_steps`; and `delete` on `audit_findings` and `business_models`. Every one
  of them is reached only through the `SECURITY DEFINER` authoring RPCs —
  `upsert_cell`, `delete_cell`, `add_lane`, `create_path`, `set_path_steps` and
  their siblings — which run as the function owner and never meet a policy at all.
  That was checked rather than assumed, in both directions: the verbs the app
  writes directly come from the scan of the source that the write-surface check
  already runs, and the definer flag comes from the catalogue of a replayed
  database.

  One loop is the whole cause. `20260818002000`, the optional service-account
  tier, walks thirteen tables and creates all three write policies on each,
  unconditionally. Its own comment says what it assumed — "they AND with the
  permissive policies" — and for nineteen of the thirty-nine there was a
  permissive policy to AND with. It was written table-wide over a surface that is
  verb-wide.

  This is the other half of the convention `21000213000000` recorded. That one
  established that a write policy is a pair, and the reading that makes the pair
  worth having: a permissive `_auth` policy with no restrictive `_service_only`
  beside it is a hole. Twenty lone restrictions blunted the same reading from the
  other side, because a rule of the form "these come in pairs" is worth what its
  exceptions cost. Now the two halves appear together or not at all, and an empty
  policy list for a verb means one thing: the direct write path is closed, and
  the RPC is the way in. `docs/connectors/supabase/database.md` § Row Level
  Security carries both halves — write both policies when a table joins the write
  surface, and write neither when it does not.

  The migration's proof asks three questions rather than counting anything. It
  asserts the invariant this file makes true: no restrictive policy in `public`
  stands for a command that no permissive policy opens to a role it names. It
  asserts, per verb it removed a restriction from, that no permissive policy
  stands for that verb — which is what makes the removal a no-op rather than a
  widening, and which raises and names the table on a deployment that has opened
  one of them directly. And it becomes `authenticated` holding a service claim
  and attempts each of the twenty, requiring the write to be refused. Every
  attempt is a bare `default values` or a `where false`, so no deployment's rows
  are read or written even where a grant exists.

## 1.18.4

### Patch Changes

- 758bcbf: One shape for "service accounts only", and it is written down

  Fourteen tables are on the write surface — the ones the panels reach directly,
  under the caller's own privileges, rather than through the definer RPCs. Twelve
  of them said "only the editing tier may write this" as a pair of policies: a
  permissive `<table>_<verb>_auth` with `using (true)`, and a RESTRICTIVE
  `<table>_<verb>_service_only` calling `public.is_service_account()`.
  `stakeholders` and `cell_touchpoints` said it as a single permissive policy
  whose whole predicate was that same call.

  **Nothing about who may write anything changes.** Both spellings admit exactly a
  service account and refuse exactly everyone else; there was no hole and this
  release closes none. The posture before and the posture after are the same
  posture, on every database this replays against, and the migration says so in
  its own header so it cannot be read as a patch.

  What changes is that one rule stops being written two ways. 20260818002000, the
  optional service-account tier, hung the restrictive half on the thirteen tables
  that already had a permissive write policy for it to narrow. The two above
  joined the surface afterwards and each was written from scratch, so each reached
  for the shortest thing that was correct. Both authors were right about the rule;
  neither had anywhere to read the shape, because nothing stated it.

  21000213000000 gives both tables the pair, for insert, update and delete. The
  pair wins over collapsing the other twelve for three reasons. It is what a
  reader meets twelve times before meeting the exception. It keeps two decisions
  apart that have two different owners — the permissive half is the base
  template's ("this table is edited from the browser rather than through an RPC"),
  the restrictive half is the optional recipe's ("and only by the editing tier"),
  and the single-policy form fuses them, staying correct only because the core
  seam's default body is `select true`, which nothing at the call site shows. And
  it makes a _missing_ restriction legible: a surface table with an `_auth` policy
  and no `_service_only` beside it is now unambiguously a gap, which is what
  `services` turned out to be one release ago.

  The convention is now recorded where row-level security is documented —
  `docs/connectors/supabase/database.md` § Row Level Security — because a
  convention nobody writes down is how the second spelling arrived in the first
  place.

  The migration's proof is the post-condition, asked as the role: it becomes
  `authenticated` twice, once holding a service claim and once not, attempts the
  writes the panels make, and asserts that the answer is the seam's both ways. It
  counts nothing in `pg_policies` — a census of the database it happened to meet
  is not a post-condition, and reading the catalogue is exactly what could not
  tell these two spellings apart. Where the optional tier recipe was never applied
  the seam is still `select true`, so the policies admit every signed-in session
  and the proof says so in a notice rather than failing. Independently,
  `npm run check:seed-load` attempts every one of these writes against a seeded
  database as an author who must succeed and as a viewer who must change nothing:
  58 writes an author made and 23 a signed-in reader was refused, unchanged across
  the rewrite.

## 1.18.3

### Patch Changes

- d07c46d: The service record joins the tier every other table already answers to

  `public.services` was the one table on the write surface a plain signed-in
  member could UPDATE. Every other table there admits only a service account, and
  the operations guide says a member outside the editing tier may read and not
  write — of this table that was never true. Anyone who could open a deployed
  board could rewrite a service summary.

  It was an oversight with two authors, neither of them wrong on its own.
  20260818002000 introduced the service-account tier and hung a RESTRICTIVE
  `*_service_only` policy on the tables that had a write policy to restrict.
  `services` was read-only then — the intermediate representation builds a
  service, nothing edited one — so it had nothing to restrict and got nothing.
  21000128000000 then gave it the write policy the Service panel needed,
  `using (true)` to `authenticated`, and did not add the restrictive counterpart
  the earlier migration would have. Nothing anywhere argues that the service
  record should be the one row an ordinary member may rewrite.

  21000212000000 hangs `services_update_service_only`: RESTRICTIVE, UPDATE,
  `authenticated`, `public.is_service_account()` as both its USING and its WITH
  CHECK — the shape the tier built for its thirteen tables. Restrictive is the
  whole of the fix, because a permissive policy naming the tier would OR with
  `using (true)` and change nothing at all. UPDATE only, and deliberately:
  `services` carries no INSERT or DELETE policy for `authenticated`, so both
  verbs already match zero rows, and a restrictive policy over a write nobody is
  admitted to make asserts nothing while reading as though it did. A single-tier
  deployment is untouched — `is_service_account()` is the CORE seam whose default
  body is `select true`, so where the optional tier recipe was never applied the
  new policy admits every signed-in session, exactly as that deployment chose.

  The proof is the post-condition, and it is asked as the role. A migration
  applies as an owner, an owner bypasses row level security, and a policy that
  refuses does not raise — it matches zero rows and returns success — so a proof
  that read the catalogue, or wrote as the owner, would be satisfied by the
  database this migration exists to change. It becomes `authenticated` instead,
  holds a viewer claim and then a service claim, attempts the write the Service
  panel makes, and ends each attempt in a sentinel exception so no row, claim or
  role survives it. What it asserts is agreement with the seam: a service claim
  writes, a session without one writes only where the seam still says
  `select true`. Never a count of the policies that happen to exist. Where it
  cannot get an answer — a session that cannot become `authenticated`, or an
  `authenticated` without the platform's SELECT on the table — it names what was
  missing and asks nothing, rather than reporting the platform's absence as this
  policy refusing.

  The check that found this is the check that proves it. The write surface has
  attempted every write twice since #369, once as an author and once as a
  signed-in reader, and `services` was the single table whose reader half was
  declared off — with its reason, in `ANY_SIGNED_IN_USER_MAY_WRITE`, printed on
  every green run. Deleting that entry re-arms it: twenty-three reader probes
  instead of twenty-two, and `viewer update services` reporting `zero`. Drop the
  new policy and the same probe reports `wrote`, which is what makes the green
  mean anything.

## 1.18.2

### Patch Changes

- 114b9f9: The glossary says the interaction line is a band, and gains four sentences the deployment had been keeping instead

  A deployment is stopping its own `CONTEXT.md` restating this model and
  pointing here instead. Reading the two files side by side to decide which copy
  was better found five places where the deployment's was, and one of them was not
  a matter of taste: this glossary said the line of interaction "draws below the
  lane holding the recipient's own actions", singular, while
  `shouldShowInteractionLineAfter` in this repository has drawn it below the LAST
  such lane since 4c9f5d3. The recipient's side is a band and can be several rows
  deep. A reader of the glossary was told a rule the code had already stopped
  following, and a boundary drawn once per row is not a boundary.

  Four more sentences arrive because nothing here said them and the copy that did
  is being deleted. A path is an **alternative, not a stage** — its paths are read
  beside one another, and nothing connects across them, which the dependency entry
  implied from the edge's end and no entry said from the path's. **Scenario, step
  and path own no spec**, a negative the Spec entry needs, because "four levels,
  one word" does not tell a reader that the other three levels have none. The test
  that separates the two dependency kinds — remove the other cell, and ask whether
  this one never starts or starts and goes wrong — is the operational form of a
  distinction this file otherwise argues only by definition. And **no record at
  all belongs to what-if**: it returns a trace on a copy, and where it records
  anything it records a finding, which is the audit's.

  That last one is why the ownership table can keep its shape. `evidence` reads
  **the cell** here and has since the agent gained `create_evidence`, so "nobody"
  lost its example — but it must stay a sayable answer, or the owner column
  becomes a name drawn from a list of readers and the next table with no owner
  gets assigned to whichever one is loudest. What-if is what "nobody" is said
  about now.

  Nothing else moves. The soft cell references, the `resources` naming rationale
  and the `stacked`/`merged` layout values all read better in the deployment's
  glossary than in this one, and all three are already stated in
  `references/data-model.md` and `references/ir-schema.json`, where they are
  enforced — restating them here would reproduce one level up the duplication the
  deployment is removing.

- 3707e0d: The change list says which half an upsert took

  `upsert_cell` and `set_cell_dependency` both upsert, and both were taught to
  report which half they took so the ledger could stop deriving an inverse from
  the operation's NAME. The sentence a person reads was left behind: the change
  list still said "Added a cell" and "Connected two cells" over writes that had
  edited an existing cell and an existing edge. It is the same mistake, in the
  one place it is visible.

  The entry carries no report of its own, so the describers read the derived
  inverse, which is where the report survives — `delete_cell` and
  `clear_cell_dependency` mean the insert half, `restore_cell_content` and
  `restore_cell_dependency` mean the update half. An entry with no inverse is the
  update half whose before-state did not come back, since an insert always
  derives one, so the absence reads as an edit rather than falling back to the
  create. Rows written before those two fixes all carry the old name-derived
  `delete_cell`, so they still read as creates — that is what they recorded.

  The update half's sentence is "Edited a connection" rather than a new synonym,
  because that is what a deployment carrying `update_cell_dependency` already
  calls the same event.

- c626120: The write surface proves the write, instead of reading the catalogue

  The policy half of the surface asked `pg_policies` whether a policy existed on
  the table, for that command, naming `authenticated` — and a policy that exists
  and admits nobody satisfies an existence test. Every one of these fourteen
  tables carries one. The service-account tier hangs a RESTRICTIVE
  `<table>_update_service_only` on thirteen of them and the rest carry a permissive
  policy whose whole predicate is `is_service_account()`, so the question the
  surface asked could not tell "an author may write this" from "only a service
  account may". That is the one pair whose difference is silent: a session outside
  the editing tier meeting a service-only policy matches zero rows and gets a 200
  back, and `requireRowsWritten` reports the save as a row somebody else deleted.

  So the question is asked as the role. `set local role authenticated`, a
  representative claim, attempt the write, roll it back. A policy that refuses
  cannot satisfy that, and it subsumes the grant half the issue asked about —
  `update t set c = c` is refused on a column the author does not hold, so
  `has_column_privilege` and `exists(select 1 from pg_policies …)` collapse into
  one question per column and verb, answered by the write itself. 58 grants and 23
  policy existence tests become 58 writes an author makes and 22 the same
  statement, run as a signed-in reader, must not.

  **The second half is what makes the first mean anything.** `authenticated` is one
  Postgres role and two audiences — the app says so itself, gating its editors on
  `isServiceAccount` and calling the restrictive policies "the wall" — so the probe
  runs as both. A check that only ever proved a write succeeded would pass just as
  well on a database that let every reader write, which is not a hypothetical: it
  found one. `services` is the single surface table the tier never reached. It had
  no write policy at all when 20260818002000 swept the others, and when
  21000128000000 gave it one it gave it `using (true)`. Any signed-in member can
  rewrite a service summary today, which is precisely what the operations guide
  says a member outside the editing tier may not do. It is named in
  `ANY_SIGNED_IN_USER_MAY_WRITE` with that reason, printed on every green run, and
  its author probe still runs — the exception is a smaller claim, not an exemption.
  The migration that closes it is owed and is not in this change.

  Attempting a write needs a row to write and a role that can evaluate a policy,
  and neither was true before. `PROBE_FIXTURES` stands one row up in the four
  surface tables the sample seed leaves empty, guarded by `where not exists` so a
  seed that starts filling one retires its fixture; a surface table with neither is
  a failing test rather than a probe that reads an empty table's zero rows as a
  refusal. And the shim was lying by omission: Supabase grants `usage on schema
auth` to `anon` and `authenticated`, and without it every policy predicate
  calling `is_service_account()` — which is not `security definer` — answers
  `permission denied for schema auth` to the very role it is written about. Nothing
  noticed while the checks read the catalogue. The first question asked as the role
  found it in one run.

  The `cmd = 'ALL'` gap #368 left behind — `pg_policies.cmd` reads `ALL` for a
  `for all` policy, so an exact-match existence test reports one as missing — is
  gone rather than fixed. Nothing reads `cmd` any more, and a `for all` policy
  either admits the write or does not.

- 43799f4: The write surface asks about every verb the app uses, not only UPDATE

  `PANEL_WRITE_SURFACE` was widened last release from eight tables to fourteen, and
  the widening exposed the same hole in the other axis. The surface asserted the
  UPDATE path and only that: `check:seed-load` asked a real database for an UPDATE
  grant and an UPDATE policy per entry, while the app also inserted into and
  deleted from `evidence`, `slices`, `slides`, `stakeholders` and `audit_findings`.
  So `evidence` was "on the surface" with two of its three write verbs unchecked —
  one verb wide instead of one table wide. The file stated the limit rather than
  implying coverage it did not have, which is how it was found, but a stated limit
  is still a deployment that can revoke INSERT and keep every gate green until an
  author presses a button and gets a refusal the interface cannot explain.

  Each entry now carries the verbs its writers actually use, and each verb is asked
  for twice: the grant, and an RLS policy for that command admitting
  `authenticated`. UPDATE keeps its column list, because the deployment really does
  grant it column by column and `has_column_privilege` is what checks that
  granularity. INSERT and DELETE are asked table-wide, because that is how the
  recipe grants them and a column list for them would be precision the grants do
  not have. The check went from 47 grants and 14 policies to 58 and 23; the failure
  messages say what each one costs an author, which for a missing DELETE policy is
  a row that reappears on the next read rather than an error anyone sees.

  The verbs are derived, not declared. The scan that finds the tables had to read
  the verb to find them at all — `.from('evidence')` is not a write until something
  downstream says `.delete(` — so `writtenVerbsByTable` hands them back from the
  same walk of `src/`, and an insert added to a module that already updates is
  covered the moment it is written. A hand-kept list is what produced the original
  defect, and adding a second one for verbs would have reproduced it. That leaves
  exactly one verb claim still made by hand: the column list is an UPDATE claim, so
  the surface test now fails an entry that lists columns for a table nothing
  updates, and one the app updates that names no columns at all.

  The verbs come off the scan already shared with the write-boundary contract, so
  there is still one parser of the subject and not two.

## 1.18.1

### Patch Changes

- 2390653: The other upsert says which half it took, and its undo stops guessing

  `upsert_cell` upserts. Landing on a square of the grid that already holds a
  cell it updates that row and hands back its id — indistinguishable from the id
  it returns when it inserts. The ledger derived this write's inverse from the
  operation's NAME, so the inverse it recorded was `delete_cell`. On the insert
  half that is exact; on the update half the undo would remove a cell the write
  had only edited, taking its summary, Function, Form, Value props, owner pair
  and status with it — none of which that write touched.

  Nothing reaches the update half today, and that is the argument rather than a
  reason to leave it. Both callers establish the square is empty first: the panel
  calls `upsert_cell` only on a draft, when there is no cell id, and the agent
  tool reads the slot and refuses with "A cell already exists at that slot".
  That check is a read followed by a write — nothing holds the square between
  them, so two agent turns on one board, or an agent and a person, can both see
  an empty slot — and it is carried per caller, so the rule lives in prose in two
  files rather than in the operation. The previous release said this function was
  unaffected _because_ of those guards; a guard standing between a caller and a
  defect is not the same as the defect not being there.

  `21000211000000` makes the write report what it did. `upsert_cell` returns
  `{ id, inserted, previous }` instead of a bare id: `inserted` is read from the
  written row's `xmax` inside the same statement, and `previous` is the cell as
  it stood, captured before the write under a lock. The revert derivation
  branches on it — a delete for an insert, and for an update
  `restore_cell_content`, a new operation that puts one column back on one cell
  by id.

  One column, deliberately. The upsert's `on conflict` sets `content` and nothing
  else; everything else in the row is either the conflict key or minted on the
  insert half. The seven other fields a person types into a cell belong to
  `update_cell_content` and `update_cell_spec`, which capture their own inverses,
  and an undo that reached them would revert somebody else's edit. The restore
  assigns rather than coalescing: `cells.content` is `not null default ''`, so
  the state a coalescing inverse could not express is not null but empty — and a
  blank draft an agent writes onto is the ordinary case here, not the corner.

  The guards stay. Once the write reports for itself they are belt-and-braces
  rather than the safety, and the agent tool's refusal is a better answer than a
  silent update; the tool's reply now also says which half the write took. The
  return type moves, so the function is dropped and recreated and its ACL is
  restated — the core revokes the PUBLIC execute the recreate lands on, the
  recipe half restores the anon revoke and the authenticated grant. An update
  whose before-state did not come back (a concurrent insert between the capture
  and the upsert) records no inverse at all, which is the ledger's existing way
  of saying an undo cannot restore the prior state.

- f989b56: The write surface is held to the writers, not to a list

  `PANEL_WRITE_SURFACE` declares the tables and columns the authoring UI writes
  directly, and `check:seed-load` asks a real database whether a signed-in author
  may reach each of them. Nothing enforced the declaration, so it drifted — not
  by one line but by six tables. `cells`, `cell_touchpoints`, `evidence`,
  `audit_findings`, `slices` and `slides` were all written by the app and named
  nowhere on it, which made the check's own report — "every column the panels
  write is reachable" — true of eight tables and false of the app.

  All six are now listed, with the columns their `.update({…})` names. More to
  the point, a new test walks `src/` for direct table writes and holds the
  surface to what it finds, in both directions: a table the app writes and the
  surface does not name fails, and so does an entry nothing writes any more.
  Where a table is deliberately outside the surface it says so and why —
  `agent_sessions` and `agent_messages` are the agent transcript, best-effort by
  design, and asserting a grant on them would assert the opposite of the intent.

  The columns cannot be scanned for — a payload is as often `.update(patch)` as a
  literal — so they are held instead to `src/types/database.ts`: every name on
  the surface must be a name the schema has. That also removes a bad failure
  mode, because `has_column_privilege` raises on a column that does not exist, so
  a typo used to reach CI as "the fresh-database seed load failed" without ever
  naming the column.

  The scan is shared with the write-boundary contract rather than written twice.
  That rule asks who may write and this one asks what they write, and two parsers
  of one subject would be two readers to drift from each other — which is the
  failure both rules exist to catch.

## 1.18.0

### Minor Changes

- 063cad6: Canvas navigation is one continuous camera flight

  Selecting a phase or a scenario used to cut to a fitted view. It is now a
  flight: one timing family whose duration is read from what the reader can
  see moving — the arrival centre's screen distance and the zoom ratio — and a
  path that keeps the destination's screen-space approach monotonic, so a large
  zoom-in never sends its target further away before arriving.

  Flights interrupt and redirect rather than restart. A newer intent projects
  whatever momentum is still compatible onto the new journey and drops the rest,
  retargets when layout geometry moves underneath it, and carries visual focus
  with the camera. Each canvas tab restores the view it was left at, and the
  mobile shell replaces one scenario with another through a fade that waits for
  the incoming board to fit.

  The agent's `open_phase` and `open_scenario` no longer infer arrival by
  polling for an idle camera — idle is also what a cancelled flight looks like.
  The viewport publishes its exact outcome and the bridge reports that.

## 1.17.1

### Patch Changes

- 5fbafe8: An upsert says which half it took, and its undo stops guessing

  Undoing an agent's dependency write could delete an edge the author already
  had. `set_cell_dependency` upserts: landing on a pair that is already connected
  it updates that row and hands back its id — indistinguishable from the id it
  returns when it inserts. The ledger derived this write's inverse from the
  operation's NAME, and the name says "connected two cells", so the inverse it
  recorded was a delete. On the insert half that is exact; on the update half the
  undo destroyed an edge the write had only edited.

  Only the agent tool reaches it. `create_cell_dependency` on a pair the
  blueprint already connects is a bare upsert onto an existing row — a retry, a
  re-run of a plan, a model connecting two cells it has connected already. The
  panel's add form cannot: its validation refuses a duplicate before any call is
  made. That makes it the worst shape of defect — a write made by a machine, in
  a batch, on rows a person has often already read — and it compounds with how
  the session sheet picks an undo's target, which is the newest entry carrying an
  inverse, not the newest thing the person did.

  `21000210000000` makes the write report what it did. `set_cell_dependency`
  returns `{ id, inserted, previous }` instead of a bare id: `inserted` is read
  from the written row's `xmax` inside the same statement, and `previous` is the
  row as it stood, captured before the write and locked. The revert derivation
  branches on it — a delete for an insert, and for an update
  `restore_cell_dependency`, a new operation that puts the two prose columns back
  on one row by id. It assigns rather than coalescing, which is the point: the
  case the agent causes is an edge that had no note being given one, and an
  inverse that cannot write a null cannot undo that.

  The return type moves, so the function is dropped and recreated and its ACL is
  restated — the core revokes the PUBLIC execute the recreate lands on, the
  recipe half restores the anon revoke and the authenticated grant. An update
  whose before-state did not come back (a concurrent insert between the capture
  and the upsert) records no inverse at all, which is the ledger's existing way
  of saying an undo cannot restore the prior state.

  The other upsert in the derivation table, `upsert_cell`, is not affected: its
  tool refuses an occupied slot, so the delete it derives is a true inverse. The
  agent's reply now also says which half the dependency write took, so a model
  told "set" after landing on an existing edge stops believing it made one.

- 64e1fd4: The portable shim can hold a claim, so a guarded write can be rehearsed

  `supabase/portable/supabase-shim.sql` stood `auth.jwt()` in as `select
'{}'::jsonb` — an empty object, unconditionally, whatever the session had set.
  `public.is_service_account()` reads that object, so behind the shim no session
  could be a service account, and every write RPC that asserts the guard in its
  own body refused. Not a simplification: a different behaviour, in the one file
  whose whole job is to answer the way the thing it stands in for answers.

  What it cost is measurable rather than theoretical. Two rehearsals of guarded
  writes had to redefine `auth.jwt()` inside their own rolled-back transactions
  to get any write to run at all, which proves a copy of the function rather than
  the function. And `21000209000000`'s embedded proof — a fixture that authors an
  edge and re-runs the call the agent tool sends — asked whether the environment
  could hold a service claim, found it could not, and skipped with a notice.
  That is the right thing for a proof to do when it cannot run, and it meant the
  portable replay had been proving less than it looked like it proved.

  All three of GoTrue's request-scoped helpers now read `request.jwt.claims`, the
  GUC Supabase resolves a request's JWT into: `auth.jwt()` returns the claims or
  an empty object, and `auth.uid()` and `auth.role()` read `sub` and `role` out
  of it rather than answering null by construction. An unset GUC still answers
  "nobody", so a replay that sets nothing is unchanged; a
  `set_config('request.jwt.claims', …, true)` inside a rehearsal or a proof block
  now does what its author expects. `nullif` before the cast because a GUC that
  was set and then cleared reads back as the empty string, and `''::jsonb` is a
  syntax error rather than an absent claim — which is exactly the shape the proof
  block's own cleanup leaves behind.

  `is_service_account()` is untouched. The guard was never the defect; the stub
  under it was. The shim is still not a security boundary — a caller who can
  `set_config` can claim anything — and it is still not something an adopter
  installs. It is a CI harness that now answers the question Supabase answers.

  The replay says what changed. Before and after, all 48 migrations apply and
  none fails; the two halves and the replay agree on the same inventory. The only
  difference in the whole log is one line that is no longer printed: the
  omitted-argument proof no longer skips. It runs, behind the shim, and passes.

## 1.17.0

### Minor Changes

- a214003: A source carries one note

  The add-a-source form asked for five things and the saved row wore three type
  treatments. `evidence` held `ref`, `excerpt` and `note` side by side — a
  locator, a quotation, and an aside — and an author had to sort a sentence into
  the right one before writing it. It becomes three fields in one group: Kind,
  Title, Note.

  The count is why. Measured on the deployment that runs this template, across 66
  evidence rows: all 66 carry a title, two carry the quote field, and none carries
  the reference field. The titles say where the references went instead —
  "PR 1151", "Card 2266", "Metabase, 2026-08-08" — and one of the two quotes is a
  note about a meeting, sitting in a field whose placeholder read "Their words,
  not a summary of them". Zero rows means UNUSED, not unreachable: the agent's
  `create_evidence` could write `ref` the whole time and never did, so the number
  is a fact about the field rather than about the surface it was offered on.

  `note` survives as the one general-purpose prose column, and a URL written
  inside it renders as a link wherever a source is displayed. That is the whole
  job the reference column was carrying, for the zero rows that used it.
  `linkedTextSegments` is deliberately narrow about what counts: a scheme is
  required, so `data-model.md` stays a filename and `PR 1151` stays a citation,
  and `safeExternalHref` still has the last word on which schemes may become an
  anchor. Trailing punctuation goes back to the sentence, except a closing
  bracket the address itself opened.

  `21000208000000` moves every excerpt into the note beside it and drops both
  columns. It refuses rather than destroys, twice: a row carrying a reference
  stops it, because a locator is not prose and the migration will not invent a
  sentence around "PR 1151"; and a row carrying an excerpt beside a DIFFERENT
  note stops it too, because it cannot choose between them and will not join two
  sentences on their author's behalf. Both guards are invariants — "no excerpt is
  destroyed", "no reference is destroyed" — true of every database the file will
  ever meet, including an empty one. Neither counts rows, which is the only kind
  of assertion that can replay. No grant moves: `evidence` is granted whole-table
  and never column by column. `scripts/tests/evidence-note-migration.test.sh`
  applies the file with `psql -1` against a populated replay, because a guard that
  raises only means something when the fold rolls back with it.

  The saved row wears one text treatment. The monospaced link, the italic passage
  and the rule down its left edge all go — three ways of saying "this text is
  different", stacked in a panel 264 pixels wide. The kind is a quiet suffix after
  the title now, so the icon reinforces it rather than carrying it alone.

  Every field keeps a label, through the panel's own `Field`, so no field's
  purpose is carried by grey text that disappears the moment an author types. The
  asterisk on Title is this panel's only signal that a field cannot be left empty,
  and its absence on Note is what says Note is optional — a second signal for the
  same thing is how a form starts arguing with itself.

  The agent's evidence tools lose `ref` and carry one prose argument. Their
  descriptions stop calling it a quoted passage: a model reads a description as
  the field's definition, and "the quoted passage that carries the claim" is an
  instruction not to write an observation there — which is exactly what the two
  rows that used the field did anyway. `create_evidence` could never write `note`
  at all before; it passed a hardcoded null.

  `21000116000000` set one word per meaning and then deliberately spared
  `evidence.note` on the argument that a source's note is an aside beside the
  source. Three months of authoring says the aside was doing the work and the
  field beside it was not, so the word stays rather than becoming `summary`: a
  note about a source is still not the source. That is a fold rather than a
  licence — `findings.summary` is still a summary, and the next column whose job
  is a thing's own sentence still gets that word. The rename map records both
  pairs with the reason each carries no `rename column` statement.

  Evidence still does not link to resources, deliberately. A locator field was
  available for 66 rows and filled zero times, and of the 47 cells carrying
  evidence only 20 also carry resources, so a picker would be empty on the other 27. A join table can be added later without disturbing the note; the signal to
  build it is notes filling up with resource names.

- 4b4b962: The dependency editor writes the note, and the badge loses its last reader

  The previous release moved a dependency's why-line into a tooltip on the row and
  stopped drawing the edge's name. It also left the app rendering a column it
  could not write: the panel's connection editor offered one prose field labelled
  "Name (optional)" and the agent's `create_cell_dependency` offered one argument
  called `label`, and both landed in `cell_dependencies.name` — the badge. A note
  reached the database from a seed or an import and from nowhere else.

  That is the whole of the defect, and the data says so from both sides. A
  deployment built on this template measured 434 dependency rows, of which 8
  carried a name and none carried a note — and every one of the 8 was a sentence
  saying why the edge exists rather than a channel tag like "Email". Authors were
  not misusing a badge field; it was the only field they were offered. That
  deployment has since copied all 8 into `note` in a migration of its own, so
  both columns now hold the same sentence there — a backfill, not an author
  working around anything, and it is only possible because someone knew to write
  one. The bundled
  sample agrees from the other direction — 73 dependency rows, no names, 21
  sentence-shaped notes, because a seed can write the column the editor cannot.

  The editor's one prose field now writes `cell_dependencies.note`. It is labelled
  Note and marked optional, and its placeholder is "Anything worth knowing about
  this dependency" — deliberately general. "Why this edge exists" is narrower than
  what authors actually write, and a narrow frame is what sent them to the wrong
  field in the first place.

  The agent's dependency tool lands its prose in the note too, and its argument
  keeps the spelling it was published with. Moving where a value lands is safe for
  a skill pinned to an older release: it goes on sending `label` and the sentence
  now arrives somewhere a reader sees it. Renaming the argument in the same step
  would not be — that skill would send a key the handler no longer reads and the
  value would be dropped in silence. A rename is a separate, sequenced change with
  a release between the two halves.

  `cell_dependencies.name` is not dropped. The badge stopped rendering last
  release and its write surface is retired here; dropping the column is a
  different decision with a deployment's rows attached to it. What does go is
  `linkName`, the field that carried the column into `BlueprintCellConnection`.
  Nothing had read it since the badge stopped being drawn — the panel handed it to
  the connection editor, which never looked at it — so it leaves with the input
  that fed it rather than waiting for a third change to notice it.

  No migration. `set_cell_dependency` has taken a note all along; only the two
  callers were pointed at the wrong parameter.

### Patch Changes

- 4b4b962: An argument nobody sent no longer erases an edge's words

  `set_cell_dependency` upserts, and its conflict clause assigned both prose
  columns straight from the row it had tried to insert — `name = excluded.name,
note = excluded.note`. Both arguments default to null, and a default is
  indistinguishable from a null the caller sent, so a call that said nothing
  about the words did not leave them alone: it cleared them, on an edge that
  already existed, and returned the id as if it had succeeded.

  The agent tool is what reaches it. `create_cell_dependency` needs a source, a
  target and a kind; its prose argument is optional. Asked twice for the same
  edge — a retry, a re-run of a plan, a model connecting two cells it has already
  connected — the second call is a bare upsert onto the first and whatever an
  author wrote there is gone. The panel's connection editor cannot reach it,
  because its validation refuses a duplicate before any call is made; that is a
  validation standing in front of the defect rather than the defect not being
  there.

  The conflict clause now coalesces: `coalesce(excluded.name,
cell_dependencies.name)` and the same for `note`. An omitted argument means
  "leave it as it was" and a supplied one still replaces. Both columns, because
  neither has a caller that clears by sending null — nothing has written `name`
  since the editor and the agent tool were pointed at `note`, and a note is
  cleared by removing the connection and adding it again, which is a delete and a
  fresh insert with no upsert in it.

  The cost, stated rather than hidden: a null can no longer clear either column
  through this function, and neither can an empty string — the body has always
  turned `''` into null before the conflict clause, so those two have never been
  distinguishable here. Emptying a field wants a function whose arguments are
  required, where an omission is a loud "function does not exist"; this one, whose
  job is to add an edge, is not it.

  The migration proves it rather than asserting a body: it builds a fixture,
  authors an edge carrying a name and a note, re-runs the call the agent tool
  sends, and raises unless both columns survive — then supplies new values and
  raises unless they replace. The fixture is given back through a sentinel
  exception. It does not assert what the previous body did, which is a fact about
  this package's history rather than an invariant of the statement, and would
  refuse to apply to a database that arrived at the fix another way.

- 4b4b962: The tooltip wrapper's rules say what the tooltip does

  `IconTooltip`'s doc comment stated as non-optional that a tooltip "never
  appears for a keyboard user who has not hovered". That is false for the Base UI
  version this ships, and a passing test in the dependency why-line's suite —
  "opens on keyboard focus, not on hover alone" — already disproved it. Two green
  files documented opposite rules, and the false one was being quoted as the
  reason a tooltip needs a visually hidden companion in the DOM: a right practice
  resting on a wrong reason, which the next reader can be talked out of by
  disproving the reason.

  The real reason is stronger. Read from the installed `@base-ui/react` 1.7.0
  rather than assumed: no part of the tooltip sets `role="tooltip"`, no part
  wires an `aria-describedby` from the trigger back to the popup, and the only
  props the popup contributes of its own are `tabIndex={-1}` and a data
  attribute. The popup therefore contributes nothing at all to the accessibility
  tree, and whatever is in the DOM is the whole of what a screen reader is
  handed. The rule now says that, version-qualified, because it is a fact about a
  dependency rather than about this code.

  It also records what is true about the keyboard — `TooltipTrigger` wires
  `useFocus` gated on `:focus-visible`, so tabbing to the trigger opens the popup
  and nothing has to be built for it; what has to be checked is that the trigger
  is the focusable element — and about touch, where the hover interaction is
  `mouseOnly` and opens nothing.

  Doc comment only. No behaviour changes and no API changes.

## 1.16.0

### Minor Changes

- f06407d: The why-line waits in a tooltip, and the edge's name stops being drawn

  A dependency row in the cell panel carries two pieces of prose it did not write
  itself: `cell_dependencies.note`, the sentence saying why the edge exists, and
  `cell_dependencies.name`, specified as the word on the arrow. Both change here.

  The note was revealed rather than removed — transparent at rest, opaque under
  hover or focus-within, always visible where the pointer is coarse. Opacity keeps
  a row's height on purpose, so that a list does not move the row being pointed
  at; the cost is that an invisible line is still a line. Eight rows with a note
  drew sixteen, seven of them blank, and the list's shape depended on how talkative
  its author had been. The sentence reads from the app's tooltip now, so eight rows
  draw eight.

  A tooltip is not an accessible name, and this Base UI (`@base-ui/react` 1.7.0)
  makes that literal: the popup carries neither `role="tooltip"` nor an
  `aria-describedby` back to its trigger, so nothing about it reaches a screen
  reader at all. The sentence therefore stays in the DOM, inside the row's own
  button, and is hidden only where the pointer is FINE —
  `[@media(pointer:fine)]:sr-only`. A screen reader reads it as part of the row's
  name whatever the pointer is. A touch screen keeps the printed line, because the
  trigger's hover interaction is `mouseOnly` and would never have opened for it,
  and because the row's one tap target already means "go to the other cell" and
  cannot also mean "show me the note". A keyboard gets the popup, because the same
  trigger opens on focus as well as on hover. Hiding is conditioned on the pointer
  being fine rather than on the absence of a coarse one, so a device reporting no
  pointer at all keeps the line rather than losing it to a rule about mice.

  `ROW_REVEAL_CLASS` stays where it is: the resources list's drag handle is its
  other consumer, and opacity is the right rule for a control that has to stay
  where the cursor expects to find it. It was only ever the wrong rule for prose.

  The edge's name is no longer drawn. It was specified as a badge — a channel name
  like "Email", set beside the lane and the step — and was never used that way:
  what authors put in it were sentences saying why the edge exists, which is what
  the note is for. Two fields making the same claim, one of them a badge too narrow
  to hold a sentence, is worse than one. Nothing is dropped and no migration moves:
  the column stays and the read still carries the value into the panel's connection
  editor. It is simply not drawn anywhere any more. The sample blueprint has 73
  dependencies and names none of them, so nothing in the bundled data looks
  different.

  What this exposes, and does not fix, is that the app cannot write a why-line at
  all. `set_cell_dependency` takes a note, but the panel's connection editor offers
  only a "Name (optional)" field and the agent's `create_cell_dependency` offers
  only `label` — both of which land in the column that no longer renders. A note
  reaches the database from a seed or an import and from nowhere else. That is the
  change to make next, and it is a write-surface change rather than this one.

## 1.15.0

### Minor Changes

- c3bcf69: One list edits everything an owner points at

  A cell's Resources tab and a placement's resource list wrote the same table,
  and only one of them had been designed. The placement's list could set a
  preview, set a button, reorder, and take a pasted link named by its host. The
  cell's own list was a pair of raw boxes per row — a label and a URL — with no
  featuring, no order, and a name you had to type before anything could be
  added. An author who had learned one had not learned the other, and the cell's
  version could not express things the database already stored.

  The list is now one component, `ResourcesList`, which both owners hand rows and
  a pair of writes. `PlacementResourcesList` is the wrapper naming its own two;
  the cell's tab renders the same list with its own. No migration was needed:
  the partial unique index behind "one preview per owner" already indexed a
  cell-owned preview, the featuring function already scoped its clear to a
  placement-less owner, and the cell's list-sync already left `featured` alone.

  Two tempos are kept, and the reason belongs in the code rather than a release
  note: the list itself — add, remove, reorder, rename — is a draft saved by one
  button in one transaction, because a reorder is a whole-list fact, while
  featuring lands at once, because it is one row's flag and the function clears
  the previous preview in the same transaction. Waiting for a save would leave
  the top of the list showing a state the database does not hold.

  Reorder became a drag. The two arrow buttons went, and with them the comment
  saying a drag needed a library — `framer-motion` was already a dependency, so
  the comment had been justifying the arrows with a cost the project had
  long since paid. The handle is a real button: it starts the drag on
  pointer-down and answers Up and Down from the keyboard, because `Reorder.Item`
  is pointer-only and an order that can only be changed with a mouse is not an
  order everyone can change. It is revealed rather than always drawn, by the
  rule the dependency why-line already stated — hover or focus-within, always
  visible where the pointer is coarse, no transition under reduced motion —
  which is now `ROW_REVEAL_CLASS` in one module both consumers import instead of
  two copies that could disagree.

  Naming happens after the fact. A pasted link is named by its host and an
  uploaded file by its name, so nothing has to be typed to get a resource in;
  `Rename…` in the row menu opens a field on the row itself, Enter commits and
  Escape abandons. There is one door into it, deliberately: the row is already a
  drag target, and a click on the name would be a second meaning for one
  gesture. Blur is not an exit either — the menu that opens the field hands focus
  back to its own trigger as it closes, so a rename that settled on blur would
  settle the instant it opened.

  The upload is a row the whole way: dimmed with an indeterminate bar while it is
  in flight, then an ordinary row, and a refused one offers a retry on the row
  rather than sending the author back to the file chooser. The bar is
  indeterminate because the storage client reports no progress, and a filling bar
  would be a number the upload does not have.

  The featured block carries no drag handle, and says so where a reader will
  look: there is at most one preview and the buttons follow the main list's
  order, so the block has no ordering of its own.

### Patch Changes

- de1124c: The ledger sees every write, and a guard says so

  The session ledger is the app's only undo, and it is only as complete as the
  writes that reach it. Every table write is supposed to go through a
  `src/lib/*Mutations` module, where the inverse is captured before the write and
  the change is recorded after it. Nothing checked that, and two writers were
  outside it.

  `SliceStoryboardField` set and cleared `slides.illustration` with a bare
  `.from('slides').update().eq('id', …)`. Replacing a slide image destroyed the
  previous picture with no record that it had existed and no revert control; and
  because `.update().eq()` without `.select()` returns `error: null` when zero
  rows match, clearing the image on a slide that had been merged away reported
  success and cleared nothing.

  `agent/tools/registry.ts` wrote `audit_findings` the same way, from inside the
  tool dispatcher, which is where the omission was hardest to see: the writes
  were made by a machine, in a batch, on rows a person had often already read and
  triaged. An audit run could rewrite a triaged finding's severity and summary
  and leave nothing in the change list saying it had. Worse, undo takes the
  newest entry that captured an inverse — so with the findings writes absent from
  that list, a press after an audit run reached past them and took back the
  person's own last edit instead, silently.

  `src/lib/writeBoundaryContract.test.ts` is the rule as a mechanism. **It walks
  `src/`, not a list of named roots**, because a list of roots can only ever
  cover the directories that existed the day it was written, and one of the two
  writers above sat three levels down inside `lib/`. Everything outside the
  `*Mutations` family is named one by one with the reason it is outside, and each
  name is asserted to exist, so a rename fails loudly instead of quietly widening
  the exemption to nothing. Two exemptions: the ledger's own inverse-applier,
  which cannot record a change because recording one is what it undoes, and the
  agent transcript, which is not blueprint data, has no inverse to capture, and
  is best-effort by design. Reads and storage calls are asserted not to trip it,
  because both look like violations and are not — `client.storage.from(BUCKET)`
  takes a bucket identifier rather than a quoted table name.

  Both writers move behind the boundary. `setSlideIllustration` reads the
  previous pointer and carries it as the inverse, so replacing an image is now
  reversible, and writes with `.select()` so a zero-row write raises instead of
  reporting success. Clearing still leaves the file in the bucket on purpose:
  after a merge two slides can share a derived path, and deleting the object
  would blank a slide nobody asked to change. `findingMutations` takes the dedupe
  branch and both its writes together, because the branch _is_ the write path —
  "an open twin already exists" and "a person dismissed this" are the two answers
  that decide whether anything is written at all. Its updates capture an inverse;
  its insert deliberately does not, and that is a fact about the grants rather
  than an omission, since delete on that table is revoked and never granted back.
  The only ways to quieten a finding are resolved and dismissed, and neither is
  an inverse — an undo that wrote dismissed would suppress that check on every
  future run, invisibly.

  The storyboard field now shows the mutation's own sentence when the row write
  fails, and keeps the storage wording for a storage failure. Two different
  failures reached one catch, and the generic apology was throwing away the only
  message that said what to do next.

## 1.14.0

### Minor Changes

- 89089f8: A service carries its own examples through the authoring pipeline

  `public.services.entity_examples` — one free-text example per core kind, shown
  under that kind's generic definition so a reader is grounded in this deployment
  rather than the textbook — has existed since `21000123000000`, which also
  granted it to a signed-in author. The wire format never learned it. So the
  column was writable from the editor and invisible to the pipeline that writes
  the same rows: `references/ir-schema.json` did not model it, and
  `scripts/generate_seed_sql.py` emitted `insert into public.services (id, name,
summary)`. An example authored in a blueprint source was dropped on the way to
  the seed, and a re-map wrote nothing where a deployment had something.

  The IR now models an optional `entity_examples` map on the service — a kind key
  to a locale map, absent is legal — and the generator carries it into the service
  insert and the conflict clause. The key set is deliberately not an enum: the
  kinds belong to the app, which states them once where the definitions live, and
  the column carries no CHECK for the same reason.

  **What the conflict clause does with silence, and why.** A service block with no
  examples generates `'{}'`, and so does one that authored none — by the time the
  seed exists the two are indistinguishable. Overwriting on `'{}'` would erase
  what a deployment authored from the editor, which is the same silent loss as
  never emitting the column at all. So an empty map reads as _the source said
  nothing_ and leaves the target alone. A map that IS present is the whole truth
  for the service: a kind it omits is cleared, so the generator can still remove
  an example — by authoring the map without that kind, never by emptying the map.
  The reason sits beside the clause, where a reader wondering about it will be.

  Proven by a round trip rather than by reading the generated SQL, because the
  column is written from two places: `scripts/tests/entity-examples-round-trip.test.sh`
  replays the schema, loads a generated seed and reads the row back — an authored
  example arrives, a re-map leaves it alone, a source that says nothing keeps what
  the deployment has, and a source that speaks clears the kind it omits. It fails
  on the previous generator, naming the example that never arrived, and fails
  again if the guard is replaced by a plain overwrite. `scripts/tests/run_tests.sh`
  holds the half a machine with no database can hold: the column is in the insert,
  the text is the seed's own locale's, and the guard is still spelled.

  IR schema version `2026.09.11`. The step is a stamp — the map is optional and
  nothing authored moves — and no migration stamps the version, because the
  database has had the column all along, so a target at an earlier version stays
  compatible. The stamp moves at all because a version names a shape, and
  `2026.09.10` refuses a key this one accepts.

  This is the upstream half. A deployment built on this template regenerates its
  committed seed only after bumping its pin to a release carrying this change;
  changing either side alone reddens the drift gate — immediately in one
  direction, and at the next pin bump in the other.

- ad2629f: The cover's services tab holds one page per service, and the active service
  picks which one renders.

  A tab used to be one thing: a `value`, a `label`, and a fixed `sections` list
  shown to everyone. That is right for the tabs that describe the method — the
  blueprint model, slices, the plugin — and wrong for the one tab that describes
  the service itself, because a deployment can hold more than one service and
  each of them has its own story to tell on the way in. Pointing every service at
  one page makes the cover say something untrue about all but the first of them.

  So `CoverTab` splits. `CoverContentTab` is the old shape, unchanged, and it is
  what every tab in this repository's own content module still is.
  `CoverServicesTab` carries a `CoverServicesIndex` instead of `sections`: a
  `pluralLabel` and one `CoverServicePage` per service, each keyed by the route
  slug `lib/serviceSlug` derives. `coverTabSections` flattens either kind, so the
  walks that want every section a tab can ever render — the figure inventory, the
  content contract's own assertions — ask one function and stop caring which kind
  they were handed.

  The page follows the active service rather than a second piece of tab state.
  `CoverPageView` takes the roster and the active slug as props and matches the
  page case-insensitively, the way routing resolves a slug, falling back to the
  first page. `CoverPage` reads both from `ActiveServiceContext`, so picking a
  service on the cover is the same act as picking one anywhere else: it writes
  the URL slug, re-scopes the board, and the cover page under the selector
  changes with it. There is no cover-local notion of "which service am I
  reading about".

  WITH ONE SERVICE, NOTHING MOVES. The selector row is rendered only when a
  second service exists, the strip label stays the tab's singular `label` rather
  than the plural, and the sole page renders below — including when no roster is
  handed in at all, which is the shape every existing test and the provider-free
  surface already use. A single-service deployment's cover is byte-for-byte what
  it was.

  The selector is the Skills tab's segmented control: a tab per service on a
  recessed track, the active one lifted onto the background, the row labelled
  "Services" so a test can tell it apart from the cover's own strip. It never
  mounts on the single-service page.

  Twelve cases arrive, driven through `CoverPageView` with the roster as props.
  They assert the singular tab is untouched, that a second service pluralizes the
  label and heads the panel with the selector, that clicking a service reports
  its slug, and that the page swaps when the active service does — which is the
  one thing a fixed `sections` list could never be asked.

  `src/components/cover/CoverPage.tsx` and `coverModel.ts` are not enrolled in
  the deployment's reconciled-files list; with this change they and the two new
  files match the deployment's copies except where the deployment's prose cited
  its own issue numbers and named its own service in a fixture, which is written
  neutrally here and has to be rewritten there before any of the four can enrol.

### Patch Changes

- 3eb97d1: `deletion_impact` counts the delete that follows, for all four kinds

  The confirm dialog's whole job is the number, and two of the four kinds
  answered with a number that was not true of the delete they preceded — in
  opposite directions. `deletion_impact('lane', id)` counted the cells of ONE
  `lanes` row, while `remove_lane(scenario_id, lane_name)` deletes every
  same-named lane across every path of the scenario; measured against a live
  blueprint, 11 reported against 93 deleted. `deletion_impact('step', id)`
  counted that step across every path, while `remove_step(path_id, step_id)`
  deletes only the cells on the path it is given; 12 reported against 5 deleted.

  The cause is identity, not arithmetic. A lane delete is addressed by
  (scenario, name) and a step delete by (path, step); the function took a single
  uuid and so could not name either delete. No sum over the wrong row set gives
  the right answer.

  `scope_id` supplies the missing half. `scenario` and `path` are addressed by
  one id, ignore it, and keep the predicates they had, so nothing that calls
  them today changes — the new argument has a default and the two working kinds
  never read it. `lane` needs nothing from the caller: it derives the
  (scenario, name) pair from the lane it is handed. `step` REFUSES without a
  scope rather than guess a path, because an overcount in a delete dialog reads
  as "this is bigger than it is" and an error that says why is better than a
  number nobody can justify.

  `remove_step` is rewritten alongside, because it reads `deletion_impact`
  itself: left calling the two-argument form it would hit the refusal and stop
  deleting steps. Passing the path it was already given also narrows the
  `affected_slices` it archives from "slices touched on any path" to the ones
  this delete actually costs.

  `DeletableKind` was narrowed to `scenario | path | slice` to make the wrong
  numbers unrepresentable, with a note saying the SQL fix could not be verified
  without a migration apply. It is the full set again, the agent's
  `measure_deletion_impact` offers all five kinds with a `scope_id` argument,
  and `DeleteStructureDialog`'s switch grows a `default` arm — it performs three
  of the kinds it can now be handed, and a fall-through there would have closed
  the dialog on a delete that never happened.

- 4b268bc: `addLane` takes `atPosition`, and the cover drops one docs address

  The lane insert's TypeScript argument was `atRow` while the SQL parameter it
  maps to is `at_position`, and rows are not what it positions — a lane is one
  row per version, and the number is its place in the lane order. Three call
  sites, no behaviour.

  `CoverPage`'s docblock also cited a plan section for a decision the same
  sentence already explains, which is an address in one repository's docs tree
  and resolves to nothing in another's.

## 1.13.3

### Patch Changes

- 5733425: Four defects the deployment already fixed

  - `normalizeBlueprint` collapsed cells on `(lane, step)`. Since the tech-cell
    split gives every touchpoint its own row at position 0..n, that kept one
    cell per slot and dropped every sibling — board-wide, over `data.cells`
    entire, whenever any two lane names merged. The key is now the slot.
  - `setSharedCanvasMode` took `'design'` from anyone. The provider guarded it,
    but the agent tool `set_canvas_mode` reaches the store setter directly and
    is not a write tool, so a view-only session could park `'design'` and every
    surface snapped into Edit when write access returned. The permission now
    lives with the state.
  - `AgentDock` registered its window-global listeners on both mount points.
    The gate is now hook-free and only the visible instance mounts the window.
  - `Skeleton` carried `animate-pulse` on top of the `skeleton-breath` rule in
    `animations.css` — two animations on one bar, with the winner decided by
    cascade layer order. It also cost reduced-motion readers the still bar the
    stylesheet gives them.

  `badge` also loses its two dead variants (`ghost`, `link`) and every
  `[a]:hover:` rule: nothing rendered a badge as a link, and a surface that
  repaints under the pointer promises a click that never comes.

- dc0c0cf: The journey reads resolve the active service, not the first one

  `ActiveServiceContext` writes the URL slug into the module store and
  `serviceScope` already honours it, but `useServicePhases` and `useSlices`
  still resolved `findFirstServiceId` — so switching service moved the URL, the
  agent's scope and the caches, and left the board on whichever service is
  first by `created_at`. Both fetchers now resolve `findActiveServiceId`, which
  falls back to exactly that first-by-`created_at` row when no slug is set, so
  a single-service installation resolves byte-for-byte as before.

- 73e0029: Arrivals that converge on one cell draw one trunk and one head whatever column
  each of them left from.

  When several dependencies land on the same edge of the same cell, their last
  segments merge into a single path-coloured trunk carrying one arrowhead: the
  reader is told "these all cause that", which is one fact rather than N. The
  merge chose where to gather by asking one of its members — whichever one the
  group happened to list first — where the column gap before the shared target
  was. That question only has an answer inside that member's own lane, and when
  the lane holds no card in the column before the target the answer fell back to
  a fixed inset from the target's edge that lands inside the arrowhead. The
  clearance test then declined the merge for the whole group, so every member
  kept its own head: three arrowheads stacked on one edge where the promise was
  one trunk and one head.

  Measured on a board that showed it. The target's left edge sits at 992 and the
  head's base at 976, the lane of the first-listed member holds no card in the
  column before the target, so the gather was placed at 980 — four pixels past
  the point the head has to start at — and the merge was declined before the
  per-member test ever ran. The two members whose lane does hold a card there
  would each have answered 966, which merges.

  Two faults on one line. The gather is a property of the shared target's column
  and not of any one member's, so asking a member at all makes the picture depend
  on which member the group happens to list first. And the per-lane fallback is
  not a gap at all; it cannot produce a junction the clearance test will accept.

  So the gather is read off the target column instead: the middle of the clear
  strip between the widest card edge in the column before the target — over every
  lane, because a vertical that crosses lanes needs a strip no card occupies —
  and the target's own edge. Where that column holds no cards the board's own
  column-gap element bounds it, and where neither is measurable the fixed offset
  in front of the entry point remains. That is one answer for the whole group,
  and it is the same answer in either listing order.

  The two clearance guards are untouched, and so are the cases deliberately left
  out: merging still applies only where it reduces overlap, a trunk drawn through
  a card is still worse than N heads, and backward loops and same-column
  connectors still keep their own heads.

  The situation catalog gains the case this was — two arrivals at one cell from
  different step columns, with the far one's lane empty in the column before the
  target. It fails on the previous geometry, two heads and no trunk, and the test
  beside it asserts the trunk is identical when the pair is listed the other way
  round. Every existing catalog frame is unchanged; the three added frames are
  the new case's.

  The four files this touches are enrolled in the deployment's reconciled-files
  list, so that gate stays red there until the next pin bump.

- 6c5304e: The changelog and the changesets leave the content scan, and prose that spells
  a theme key now fails a rule instead of quietly shipping one.

  Tailwind v4 settles which theme keys reach the built stylesheet by scanning the
  repository: a key whose name the scan finds anywhere is emitted at the root,
  and a key it never finds is dropped. In markdown, any name of that shape is
  found — bare or backticked, prose and asides alike. The entry sheet already
  spends three exclusions on that hazard, for the documentation tree, the scripts
  and the test files. The changelog was not among them and neither were the
  changesets waiting to be folded into it, both sitting at the repository root
  squarely inside the scan.

  Measured, not argued. A probe changeset naming a registered-but-unemitted
  radius key, and a probe line in the changelog naming another, each put exactly
  its own key into the built stylesheet and moved nothing else. Removing them
  again is what the two new exclusions do.

  WHAT LEAVES THE ARTIFACT is one theme key and eight utility classes, 0.51 kB
  of 294.73 kB, and nothing renders any of them. The key is the Tailwind-
  namespaced alias for the inverted-ink colour, and it stood in the shipped
  stylesheet for one reason: a release note describing its removal from the
  compatibility layer spelled it in backticks. Its three other occurrences are
  its own registration, a paragraph of stylesheet prose, and a test — none of
  them a read, because a stylesheet offers a name only inside a `var()` and the
  test files are already outside the scan. The semantic token underneath it is
  untouched and still emitted, and the registration is an inline one, so a
  utility written against that name tomorrow compiles to the value and never
  wanted the custom property. The eight classes are each named in exactly one
  release note and in no file a browser reaches; every occurrence of all nine was
  enumerated before the departure was called correct, rather than inferred from
  the size drop.

  WHY IT COMPOUNDS, and the half worth fixing more than the exclusion. Cutting a
  release folds each changeset into the changelog permanently, so a sentence
  written today holds a key in the build for the life of the repository, long
  after whatever it was written about is gone — and nothing fails, which is why
  this stood for two releases. It reached back into the release process, too: a
  note explaining why a token arrived or left had to avoid spelling the token,
  which is not something anyone should have to remember at the moment they are
  writing down what they changed.

  A RULE, NOT A LONGER LIST. The exclusions say which files are prose; nothing
  said the set was complete, and the kind of prose nobody thought of failed
  nothing at all. The new rule states the property instead: no theme key may be
  spelled in any markdown the scan still reaches. It takes the key names and the
  exclusion patterns from the token model and the entry sheet rather than
  restating either, asks git for the file list so the answer moves with
  `.gitignore` instead of with a skip list, and needs no exemptions — the subject
  is a kind of file, several dozen of them today, not an enumeration. It fails on
  the sentence and names its author, so it survives a document being moved or
  renamed, and it went red on all three of the changelog's spellings when the
  exclusions were taken back out.

  Its limit is stated where it lives: class names get no equivalent and cannot
  have one, because any English word can be a utility and there is no finite set
  to intersect against. For those the exclusions remain the whole of the defence.
  The companion rule guarding the other direction — that the token model samples
  nothing the scan is told to skip — pins the exclusion patterns, so it went red
  on the two additions and was updated with them, which is the review it was
  built to force.

  `src/styles/tailwind.config.css` is enrolled in the deployment's
  reconciled-files list, so that gate stays red there until the next pin bump.

- 4eca929: A role's pale tint is measured from the surface it is drawn on instead of from
  the page, and the component that paints a surface is what says which one it is.

  The tint is six percent of the signed canvas-to-ink span, and an elevation rung
  is a step of the same size. Derived from the page it therefore landed on top of
  anything raised off the page: all seven roles measured 1.02:1 against a card in
  dark, where the card itself sits 1.09:1 off the canvas. The role edge was
  carrying the entire shape and the tint was contributing nothing. Light read 1.18
  only because its span runs the other way and the two distances happened to add —
  the same arithmetic, hidden behind a sign.

  `--ground` is the lightness a tint is measured from. At the root it is the page
  and that is the whole of the default. A component that establishes a surface
  carries `data-ground`, `semantic.css` re-derives at that scope for the same
  reason it already re-derives under a themed subtree — custom properties
  substitute before they inherit — and the seven tints and the seven edges that
  step off them follow. One new name, one selector, three ground rules, and no
  second name for any job.

  The grounds are named for their surfaces rather than for their elevation
  ratios, because that is what a component knows about itself: a card knows it is
  a card and does not know it is one and a half steps up. `src/lib/ground.ts`
  holds the vocabulary the components spread, and the rule holds it against the
  scopes the stylesheet declares, so neither tier can drift from the other.

  THE CLAMP IS NOT A SAFETY RAIL, and it was the thing that would have made light
  worse. Light's canvas sits at 0.995 with a step of 0.024, so every rung of its
  ladder runs past 1 and the browser holds all three at white. A ground computed
  without that ceiling measures a card that is not on the screen: the light tint
  lands at 1.07:1 against the card it is drawn on, below the floor and worse than
  the 1.19 the defect it replaces was already reaching. Clamped, it reads 1.17.
  Dark is unaffected either way, which is exactly why this could have shipped
  unnoticed. Reading the same ceiling the browser reads is what keeps the
  measurement and the pixel the same thing.

  WHAT MOVES IN THE COMPILED CSS, built before and after rather than reasoned
  about. The semantic block gains the ground scope in its selector list and one
  declaration; the seven tints swap which name they read; three ground rules
  arrive. On the page the ground resolves to the page, so every value the app
  draws outside a declared surface is unchanged. Inside one, the tint moves and
  its edge moves with it. The two washes of a solid fill leave the artifact along
  with their `@supports` fallbacks, the ink that sat on one of them goes with
  them, and one ink utility arrives. Sixty-seven bytes.

  MEASURED THROUGH THE TOKEN MODEL, on every ground the stylesheet offers, for
  all seven roles, in both themes. A tint now clears its ground at 1.10 to 1.18
  everywhere, against 1.02 on a dark card before. The rule is two invariants
  rather than a table: a tint clears its ground, and the choice of ground may move
  that distance a little and may not decide it. Both go red on a single role
  regressed to the page, and a third rule reproduces the original defect so a
  guard that could never fail is not mistaken for a clean tree.

  The model gained the scope to ask. It answered at the root and nowhere else,
  which was the right shape while every colour here was a property of the page;
  `resolveValue`, `resolveColorValue`, `resolveColor` and `winningDeclaration`
  now take the subtree, spelled as the selectors that match it, so a rule reads
  the cascade's own answer for an element instead of re-deriving a subtree's
  arithmetic in TypeScript beside the CSS.

  THE EDGE BAND WIDENS, and the file's own claim about it was corrected rather
  than left standing. A fixed lightness travel does not buy a fixed ratio at every
  point on the axis, so the same role edge reads 1.24 on the dark canvas and 1.32
  on a dark popover. The prose promised 1.22 to 1.28; across every ground and both
  modes the spread is 1.22 to 1.32. Four hundredths, at a distance nobody can see,
  and still far below the 3:1 that paragraph is defending against.

  The comparison surface's two verdict markers move onto the tint and the ink cut
  for it. They wore the solid fill as ink on a ten-percent wash of itself, which
  is the weakest pairing this vocabulary allows — the fill is tuned for ink to sit
  on it, and an alpha has no ground until it is painted.

  WHAT THIS DOES NOT DO. A surface that never says what it is still hands its
  children the page, silently, which is the failure mode the defect had. That is
  inherent to a value only the component can know, and it is why the ground is
  declared once by each surface primitive rather than at each tinted element: an
  alert does not know what it was dropped into, and now it does not have to.

  `src/styles/semantic.css` is enrolled in the deployment's reconciled-files list
  and was byte-identical to its copy, so that gate stays red until the next pin
  bump.

- 4c9f5d3: The line of interaction is drawn once per board rather than once per
  customer-side lane, and the three readers that decide height and tone from it
  are handed the board so they answer the question the renderer answers.

  The rule was `getLaneRole(lane) === CUSTOMER_ACTIONS_ROLE` and nothing else,
  which is right for exactly as long as every board has one customer-side lane.
  Give a board a second actor row on the customer's own side and it draws a line
  of interaction after each of them. No service blueprint means two: the line is
  the boundary between the people the service is for and the machinery that
  serves them, and a boundary drawn twice is not a boundary. So the line follows
  the LAST customer-side lane. Adding a customer-side lane extends the band; it
  does not divide the board again, and no row has to move to make that true.

  WITHOUT THE BOARD, THE OLD ANSWER. `lanes` is optional, and a lane asked alone
  has no band to be last in, so it is its own band and answers as it always did.
  That is the same shape `shouldShowVisibilityLineAfter` already has, for the
  same reason, and it is what keeps a caller that genuinely has only a lane
  correct. It is also what made the three call sites below silent: each kept the
  old rule while the renderer had already moved to the new one, and nothing
  failed, because nothing disagreed until a second customer-side lane existed.

  TWO OF THE THREE ARE READ AS HEIGHT. `countBlueprintDividerRows` is multiplied
  by the divider row constant and `countBlueprintWrapCorridorMargins` by the
  corridor margin, and both are added to the artboard, so a count that disagrees
  with what the renderer draws is a grid taller than its own contents by exactly
  the rows it over-counted — a divider row and a corridor of space reserved for a
  line and a gap nobody paints. The corridor counter was point-free —
  `lanes.filter(laneHasWrapCorridorBelow)` — so adding a parameter would have
  passed the array index as the board, silently, which is why it is spelled out
  now rather than left to read tidily.

  THE THIRD IS RENDERED, NOT COUNTED. `laneHasWrapCorridorBelow` reaches a lane
  row's real bottom margin through the compare row spec, so a lane in the middle
  of the band opened a routing corridor beneath a row with no line beneath it to
  route to. Its own doc said why the corridor exists — the standard blueprint
  already leaves a band between the row and the line of interaction — which under
  the band rule is true of the last customer-side lane and no other.

  AND A LANE IN THE BAND WAS LETTERED AS IF BELOW THE LINE.
  `getBlueprintLabelSection` searched for the FIRST lane the line follows, so a
  row still inside the band got the tone of the zone under the line while being
  drawn above it — painted, to a reader, on the far side of a boundary they can
  plainly see it is above. A section is a position relative to the lines, so it
  has to find the lines where they are actually drawn.

  WHAT A BOARD DRAWS. With one customer-side lane, nothing moves: same line in
  the same place, same corridor under the same row, same tone on every row, same
  artboard height. With two, one line after the second of them, one corridor
  under that same row, both customer-side rows lettered as sitting above the
  line, and the artboard exactly one lane row taller — not a lane row plus a
  divider row plus a corridor.

  TEN CASES ARRIVE, and this repository had none on any of these rules. They
  state a position relative to the line, or an equality between what is counted
  and what the board draws — never a count of the boards whose customer side is
  deep, which would pass on the day it was written and say nothing about the
  rule. The corridor assertion is made against the rail's own interaction row
  rather than a lane index, because those two are the same fact and the defect
  was that they could disagree. Each of the six hunks was reverted in turn and at
  least one case failed for each.

  `src/lib/blueprintLayout.ts` and `src/lib/sideBySideCompareLayout.ts` are
  enrolled in the deployment's reconciled-files list and were byte-identical to
  its copies; they are byte-identical again, so that gate can go green on the
  next pin bump. `src/lib/blueprintTheme.ts` is not enrolled and has drifted on
  its content-shaped tables, so the one call it makes was ported by hand.

- 5757b3d: The developer portal is a development tool in the build as well as in the
  description: outside a dev build the tier simulation resolves to the real
  session, whatever the browser has in storage.

  It was live everywhere. The provider called `applyDevSimulation` on every
  render in every build, so the two flags the whole editing surface gates on —
  `canWrite`, and the `canAgentWrite` derived from it — were moved by a value
  read out of `localStorage`. A deployed site therefore offered any visitor the
  entire authoring UI, and every control in it then failed against Postgres.

  The server was never fooled and is not what changed. Row-level security and the
  RPC grants never saw the simulated tier, which is why the consequence stayed
  survivable; but a stranger being shown handles, design mode, panel editors and
  the agent's write tools before the database refuses each one is not a UI a
  template should ship, and "the writes fail anyway" is an argument about the
  blast radius rather than about the door being open.

  HIDING THE TWO CONTROLS WOULD HAVE BEEN WORSE THAN LEAVING THEM. The obvious
  fix is a build check in front of the badge and the settings section. That hides
  the door and leaves the lock: a browser that carries the storage key from a dev
  session, or one whose devtools write it, still gets the lifted flags — now with
  the badge that says so gone too. The tell is the part the render gates were
  holding up.

  So the gate is at the seam instead. Every consumer reads the simulation through
  one hook, and that hook is where the build answer is applied; the provider is
  untouched, and the badge needs nothing of its own because a simulation that is
  off renders nothing already. The settings section, which is the controls rather
  than a report on them, is the one place that also returns null — it has no off
  state to collapse to. `applyDevSimulation` stays a pure function of its two
  arguments, which is what keeps it testable in both directions in a build that
  will never call it with a live simulation.

  The flag is read at call time rather than folded into a module constant. A
  build replaces the expression with its literal either way, and reading it when
  it is asked for is what lets a test state the shipped answer to a module that
  has already been imported.

  MEASURED WITH THE KEY PRESENT, because with it absent the assertion is empty.
  Three cases now pin the production behaviour against a stored simulation of
  admin: the flags come back at the real session's values, neither the section
  nor the badge renders, and the stored value is left where it was and honoured
  again the moment the build answer is development. The suite runs with the
  development answer by default, so this block is the only place the other one is
  observable — the file says that where a reader meets it.

  WHAT THIS DOES NOT DO, measured rather than hoped for. The portal's code is
  still in the production bundle — its copy, its storage key, the badge's word
  for itself — because the build answer is read through a call the minifier
  cannot fold, which is the same property the test depends on. Nothing renders it
  and nothing consults it; what changed is the reach, not the byte count. Trading
  that for a constant the minifier could fold would buy a few hundred bytes and
  give up the only assertion that can observe the shipped behaviour, which is the
  wrong side of that trade for a defect that was found by nobody running it.

- 0a871ec: The client asks the database what tier a session is in, instead of inferring
  it from a claim the session does not carry.

  The tier seam is a database function every write RPC asserts in its own body
  and every restrictive write policy ANDs with. It ships permissive — a
  single-tier deployment where every signed-in session edits — and an optional
  recipe replaces it with a read of the session's role claim, splitting
  `authenticated` into editors and viewers. The client used to decide which of
  those two databases it was talking to by looking at the claim: absent meant
  the recipe was never adopted, so every signed-in session edited. A deployment
  built on this template made the opposite call from the same file, granting the
  tier only on an explicit `role === 'service'`. Both readings are defensible
  where they sit and neither survives being the same line of code.

  The function is granted EXECUTE to `anon` and `authenticated`, so it is
  callable over the Data API. Calling it is one round trip on sign-in and is
  right in both postures, including the one where an adopter deletes the recipe
  outright. `IdentityPort.currentTier()` already declared the home for it and
  was implemented only by the two adapters nothing calls; it now has its
  Supabase implementation and its first real caller.

  THE DEFECT THIS FIXES, not merely tidies. `supabase db reset` applies every
  file in the migrations directory, the optional recipe included, so the setup
  as written produces the STRICT database — an adopter has to delete a file to
  get the permissive one the client assumed. The combination that produced was
  the strict database under the permissive client: a signed-in account with no
  role claim was offered the entire editing UI and refused by Postgres on every
  save, from 23 in-body RPC guards and 39 restrictive policies. That combination
  is now unreachable, because there is only one rule and the database states it.

  Before and after, for each session, on both postures. An anonymous visitor is
  unchanged in every case: no session, no write gate, and the tier is settled
  without a round trip — which matters, because the permissive default answers
  `true` to anyone who calls it, `anon` included. A session holding the
  service-role key is unchanged: its JWT carries no role of the kind the seam
  reads, so the key's own arm stays and stays load-bearing. On the permissive
  database a role-less signed-in session still edits, as before. On the strict
  database a role-less signed-in session was an editor in the UI and a viewer in
  the data, and is now a viewer in both. And a session carrying the claim while
  the database says no — a token minted before a revocation, or a claim set by
  hand on a deployment whose seam reads something else — used to write buttons
  it could not use, and now does not, because the claim is no longer consulted
  in either direction.

  THE FIRST ACCOUNT A PROJECT EVER HAS IS A SERVICE ACCOUNT. The recipe's
  allowlist ships empty and nothing in the package inserts a row — no seed, no
  script, no documented step — so a fresh deployment of the tier had no editor
  at all, and the way in was a hand-written update whose text lives in a
  migration header. The trigger that stamps allowlisted sign-ups gains a second
  predicate for it.

  The other predicate that closes the same gap is "the allowlist is empty", and
  it is the dangerous one: an adopter who enables sign-ups and never fills the
  allowlist — the exact adopter being fixed — would stamp every account created
  in that window, unbounded and growing with the deployment. "There are no
  accounts yet" stamps exactly one, ever, and it is the one belonging to whoever
  stood the project up. Rehearsed on a throwaway database: the founding account
  is stamped, the second account created while the allowlist is still empty is
  not, an allowlisted account is stamped case-insensitively, and metadata a
  provider already wrote survives.

  IT STAYS IN THE RECIPE, which is the opposite of where the argument pointed
  before. The stamp is read by exactly one thing — the recipe's own tier
  function — so deleting the recipe leaves a claim nothing consults, and moving
  the trigger to the core would hang auth machinery on adopters who chose the
  single-tier posture, for no effect. What made the argument look the other way
  was a client that decided the tier from the claim: that client goes silently
  read-only against a permissive database, so the stamp had to exist everywhere
  to keep it honest. Asking removes the need, so the trigger goes where its only
  reader is.

  TWO STALE SENTENCES, in the environment sample and in the client module, both
  saying the deployed app is read-only because "there is no sign-in". There is:
  a password form and a magic-link button, mounted whenever a database is
  configured, on the front of every deployed site. What is true is narrower —
  a browser visitor is `anon`, and the magic link is sent with account creation
  off, so it cannot mint the account it would need.

  COVERAGE, which was the acceptance criterion and had none. The permissive arm
  was rewritten to the strict rule and the suite re-run before any of this: 158
  files and 1603 tests before, 158 and 1603 after, zero movement — the rule this
  issue is about was asserted in neither direction. Eleven cases arrive: five
  pinning the resolution itself, six pinning that the provider is wired to it,
  across an anonymous visitor, a stamped account, a role-less account on each
  posture, a claim the database contradicts, a failed ask, and the service-role
  key. Both prior rules were re-applied under them: this repository's fails two,
  the deployment's fails two others.

  `src/lib/supabase.ts` is enrolled in the deployment's reconciled-files list and
  was byte-identical to its copy, so that gate stays red until the next pin bump.

## 1.13.2

### Patch Changes

- 3a1f1d1: A write that is refused is translated, never forwarded raw.

  `AuthoringError` and `toAuthoringError` have been here since the authoring path
  was built, and two of the modules that write around them: thirteen throws
  raised `new Error(error.message)`, which sends the database's own text to the
  panel — `new row violates row-level security policy for table "phases"` is not
  a sentence to show a reader — and discards `.raw`, the only place the original
  survives. `sliceMutations.ts` had twelve of them and `cellSpecMutations.ts` the
  thirteenth.

  `src/lib/writeTranslationContract.test.ts` is what keeps it true. The rule is
  scoped to the modules that WRITE and deliberately no wider: a hook raising
  `error.message` from a `.select()` is a different problem with a different
  answer, and a rule over every file would be a list of exemptions instead. The
  writers are matched by shape — `lib/*Mutations.ts`, anchored at `lib/` so a
  `components/FooMutations.ts` cannot route around the test — plus
  `authoringRpc.ts` named, and both halves are asserted to still match something
  so a rename fails loudly rather than emptying the set.

  The regex is exercised on strings it never read off disk, because a source
  scan passes just as happily when it matches nothing: the two raw shapes fail,
  and a translated throw and a hand-written sentence pass.

  Measured rather than estimated. Under this rule the repository had thirteen
  offenders in two files; the same regex over all of `src/` returns seventy-two,
  and the other fifty-nine are reads, which is the reason for the scope.

  `src/lib/cellSpecMutations.ts` is byte-identical to the deployment's copy as a
  result, so it can be held to this one.

  NOT changed, and it is a real choice: `optimisticConcurrency.ts` still raises
  around the translator, and its comment says why — the PostgREST error is left
  to the caller, which knows whether it wants `toAuthoringError`. The deployment
  translates there instead. That is a difference of position rather than drift,
  and it is decided on its own.

- 9bddd24: Two sentences in shared source stop naming an address that resolves only in a
  deployment, and the surface is measured rather than asserted.

  `src/styles/semantic.css` said "Sidebar selection language (nav plan D8)". D8
  is a row of a plan document in the deployment this vocabulary was ported from;
  nothing here resolves it. The sentence now states the decision — hover and
  selected are distinguished, and this is how — which is what a reader of the
  token needs and what the paragraph beneath it already explains.

  `src/lib/sliceValidation.ts` had the opposite defect: the deployment's copy
  carries an explanation this one lacked, that `slices.origin` became
  `slices.authorship` and why the validator therefore reads what it reads. Both
  halves are true here. Only the migration filename was unportable, so the
  explanation arrives stated without one, pointing at
  `scripts/retired-vocabulary.mjs` — the durable place a reader goes for the
  history, which is the pattern the fold-migration citation established.

  The wording was checked against the deployment's copy rather than assumed: with
  this comment in place the two files differ in nothing else, so the deployment
  can adopt it verbatim and hold the file.

  THE SWEEP, because four instances of one shape is a pattern and the count is
  what says whether it needs a guard. Over the adoption surface — 199 files this
  repository ships that the deployment also has and has not yet held to this copy
  — there are 244 addresses: 80 bare issue numbers, and 25 that resolve to
  nothing here. Twenty-two of the 25 are test fixtures (`docs/a.md`,
  `docs/gone.md`, planted SVG paths) or deliberate cross-repo statements about
  the deployment's own database, correctly framed as such. Exactly one was the
  defect, and it is the one fixed above.

  A GUARD IS NOT WORTH IT, on that measurement. The standing backlog is one file:
  of the 199, exactly one is already byte-identical and unheld, and it is
  `semantic.css`. A rule refusing repo-local addresses in shared source would
  return 80 issue-number findings on its first run, nearly all of them in
  `scripts/` — this repository's own checks, citing this repository's own issues,
  correctly. Eighty exemptions on a first run is a list of sites, not a rule.

  The asymmetry is real and it is closed elsewhere: this repository cannot know
  which of its files a deployment will hold, and the deployment's reconciled list
  already records each blocked file with its reason. That is where the discovery
  happens, and filing it back is how it gets fixed — which is what happened here.

- 7294437: `readWriteOutcome` translates the error it is handed, rather than leaving it to
  the caller.

  The previous comment argued the other way: the PostgREST error was left to the
  caller, "which knows whether it wants `toAuthoringError`". In practice a caller
  that knows is a caller that remembers, and the guarantee a reader wants is the
  simpler one — a refused write is phrased for a person no matter which module
  raised it. The function already sits on the write path of every module that
  checks a row count, so translating here is what makes the rule hold without
  each caller re-deciding it.

  The parameter widens from `{ message: string }` to `PostgrestError | Error`,
  which is what `toAuthoringError` takes and what callers were already passing.

  The sentence beneath now says what became true rather than what is left over: a
  PostgREST error never reaches the row-count check, because this function has
  already translated it.

  The deployment had reached this position first, so the file is byte-identical
  to its copy and can be held to it. The divergence was a difference of position
  rather than drift, and it was settled by its owner rather than by whichever
  side was edited last.

## 1.13.1

### Patch Changes

- 1c60a10: A dependency row's why-line is revealed rather than always drawn.

  `linkNote` says why an edge exists. Read one row at a time it earns its place;
  rendered statically down a list of eight it doubled the height of every row
  that had one, and the list's shape started depending on how talkative its
  author had been.

  It now fades in on hover or focus anywhere in the row, and stays visible where
  the pointer is coarse — the rule `NavRowAction` already states, because an
  affordance that only exists under a mouse is not an affordance for everyone.
  Opacity only: a list whose rows grow under the pointer moves the row being
  pointed at. The sentence stays in the DOM at rest, so a screen reader reads it
  whether or not anything is hovering.

  `cellDependencyWhyLine.test.tsx` pins the three readers that have no hover —
  keyboard, touch, screen reader — one test each, because each is a separate
  mechanism and any one can be lost to a tidy-up that keeps the other two.

## 1.13.0

### Minor Changes

- d94dd9d: **Breaking, for slice files.** The slice authoring format's keys are the names
  of the columns they write.

  | was           | is           | column              |
  | ------------- | ------------ | ------------------- |
  | `type`        | `kind`       | `slices.kind`       |
  | `description` | `summary`    | `slices.summary`    |
  | `origin`      | `authorship` | `slices.authorship` |
  | `order`       | `position`   | `slices.position`   |
  | `frames`      | `slides`     | table `slides`      |

  `select --type` is `select --kind` with it.

  An author had to hold two vocabularies to write one file, and `slice_tools.py`
  carried a comment explaining the split rather than fixing it. `frames` was the
  worst of the five: `frame` is a real and different thing — `cells.frame` is one
  image on one cell — so the format used a live word for the neighbouring
  concept, one line above `insert into public.slides`.

  There is no alias. A file using a retired key is refused by name and told which
  word replaced which, rather than failing on a missing required property.

### Patch Changes

- 4e9f639: Generated SQL is held to the columns the schema has.

  `skills/slice/scripts/slice_tools.py` emitted `insert into public.slices (…,
description, …, origin, …)`. `21000116000000` renamed those columns to
  `summary` and `authorship`, so every slice the skill imported was an INSERT
  Postgres rejects — a model running the shipped script against a real database,
  and the failure arriving as the model being wrong.

  No word list could reach it. `description` and `origin` are live columns
  elsewhere in this schema, which is why the rename map deliberately enforces
  neither fragment and `retiredFragmentsIn('slices.description')` is asserted
  empty. Only the schema dump separates them, per table.

  `npm run check:database-names` grows a third assertion for that. A query path
  was not the only string carrying its own relation: `insert into public.<table>
(<columns>)` and `update public.<table> set <column> = …` do too, so both are
  held against `supabase/generated/portable-core.schema.sql`. Twenty-six
  statements in this tree are literal and read; five are assembled from a
  variable and dropped rather than guessed at, the refusal `selectTree` already
  makes. Adjacent string literals are joined first — the relation and its column
  list are in different strings whenever the statement needs two lines, which is
  the shape the defect was hiding in.

  `skills/` joins the check's roots. The two shipped skill scripts are the most
  exposed code here and no database-name guard walked them at all; both
  pre-existing assertions were already clean there, so the root costs nothing.

  `references/data-model.md` documented the same two dead columns in its `slices`
  row, and its vendored copy follows from `sync-canvas-skills.mjs`.

- 638b63a: The two exemptions in the var-resolution rule are named, and the divergences
  from upstream are written down together.

  The rule that every bare `var()` in a stylesheet resolves to a real declaration
  has been here since the design-system port, and it already permitted both
  things it has to permit. Neither said so. `var(--x, fallback)` was excused by a
  comment; a token a component sets on its own element was excused by nothing at
  all — it rode on the token model folding stylesheet and TypeScript declarations
  into one set, and a tidy-up that made the rule stylesheet-only would have
  condemned three live references in `blueprint.css` with nothing to point at.
  Both arms are now named at the rule, each is asserted to still be carrying
  something, and the predicate is exercised on references it did not read off
  disk: a dangling name fails in either kind, the override seam passes only in a
  stylesheet, and a component's own declaration counts as a declaration.

  `docs/adr/0008` records the vocabulary's relationship to the system it was
  ported from: a primitive is named for its hue, a semantic token for its job
  with no ramp number, brand is not a hue, and where upstream wrote a literal we
  derive while taking the judgement behind it. Five divergences are stated with
  the measurement behind each — the stepped scales, the two brand words, the
  focus ring, the radius dial, and the alert border, where the judgement that an
  edge should be quiet is taken and the ramp step it is spelled with is not.

  `semantic.css` said the role ramps were per-theme literals in the theme files.
  They were removed with the rungs; the header now says so.

- 3721967: A row shape pinned in prose is checked against the schema.

  `agents/auditor.md` tells a model exactly which keys to produce for a findings
  row, and `audit_tools.py` validates against that shape. When `21000116000000`
  renamed `check_name` to `check_key` and `note` to `summary`, the document went
  on asking for the old two — a call the validator raises `KeyError` on, arriving
  as the model being wrong rather than the prose being stale.

  `npm run check:pinned-shapes` binds a fenced block to a relation and holds its
  keys against `supabase/generated/portable-core.schema.sql`, both directions: a
  key that is not a column, and a required column the shape never names.

  The binding is per fence and deliberately short. Three of the four fenced
  blocks in `agents/`, `skills/` and `references/` document an agent's own output
  or a workspace state file rather than a database row, so treating every fenced
  key as a column would be wrong three times in four. Binding to a relation is
  also what makes `note` catchable at all: it is a live column on `paths`,
  `scenarios` and `cell_dependencies`, and wrong only here.

- e0511c2: A portable contract test states the fold without naming an address — or a
  history that is not shared.

  `pathKindContract.test.ts` asserts that each array-shaped path-kind roster holds
  each of its members once, deliberately not a census, and it is the only consumer
  of `BLUEPRINT_ARROW_PATH_KINDS`. Every symbol it imports exists in the
  deployment, and it passes there unchanged: it is exactly the test that would
  have caught the roster that read `['happy', 'exception', 'exception',
'variant', 'variant']` — five entries for three kinds, absorbed by
  `Object.fromEntries` so nothing rendered wrong, and found by hand. The
  deployment refused to copy it, and was right to: its header named the fold
  migration `21000116000000`, a filename that resolves to nothing on the other
  side, and one of the repo-local identities the reconciled allowlist exists to
  keep out of shared prose.

  Replacing the address with the fact it stood for would have been the obvious
  fix and would have been worse. The fold is not the same fact in the two
  repositories. Here `21000116000000` runs one statement and sends both `unhappy`
  and `alternative` to `variant`; the deployment's `one_spelling_each` ran two
  updates and sent `unhappy` to `exception` and `alternative` and `custom` to
  `variant`. Both rename maps say so, each about its own database. A sentence
  reading "`unhappy` and `alternative` collapsed into `variant`" is true in this
  tree and false in the next one — and a wrong address misleads nobody for long,
  while a wrong fact is believed.

  So the header states what both databases share and nothing more: `paths.kind` is
  a CHECK constraint, `paths_kind_check check (kind in ('happy', 'variant',
'exception'))` on both sides, and `variant` is a fold destination on both sides.
  Which older spelling went where is left to `scripts/retired-vocabulary.mjs`,
  read against the migrations that ran in the repository the reader is standing
  in — which is what that map's own comment already says a reader has to do. The
  file now carries no repo-local citation at all, by the deployment's own scanner,
  and can be adopted verbatim.

  The sweep the ticket asked for was run, in the direction the enrolment gate
  measures: the deployment's tree against the pinned template package, over 924
  in-scope paths with 338 already enrolled. Fourteen unenrolled files are
  byte-identical or differ by prose alone. **Three** are held back by exactly one
  repo-local citation — `MobileNavSheet.tsx` (`plan 2026-08-16-002`),
  `findingFingerprint.ts` (`§2`) and `sliceValidation.ts` (migration
  `20260830190000`) — and none by more than one. All three citations are in the
  deployment's copy; this template's copies are already clean, so all three are
  deployment-side edits and none of them is this repository's to make. Eleven more
  carry no citation and are enrollable now for the cost of the allowlist line.

- 3df7841: `unhappy` is not a path kind. `21000116000000` folded it and `alternative` onto
  `variant`, and the CHECK constraint has named `happy`, `variant`, `exception`
  ever since. Three surfaces went on offering the retired spelling as live, and
  what they have in common is that each wears no mark a sweep could key on.

  An agent's review lens said "Dead ends: exception/unhappy paths"; a co-creation
  playbook said "alternative/exception paths reuse scenario steps". Both are
  prose without backticks, and the value sweep finds a value set by its code
  spans, so it had nothing to read. An authored figure labelled three stacked
  boxes `Path · exception`, `Path · variant`, `Path · unhappy` and captioned them
  "happy vs. unhappy" — that drawing renders on the cover page inside the app, so
  a reader meets it, and no vocabulary sweep opened an SVG for values at all. A
  component's doc comment glossed the badge as "(Happy, Unhappy, etc.)" beside a
  labels map whose keys are the three live kinds.

  A sixth site turned up on a last sweep and is the same shape as the fourth: a
  picker's comment said it "groups happy/unhappy into side-by-side columns" while
  the code assigns a column per kind through a total map of the three live ones.

  All six sites now say what the column accepts. The figure's caption became
  "happy vs. exception" rather than "happy vs. variant", because the line above it
  already says the scenario branches into path variants and the stutter would
  read as a typo.

  Two of the three shapes are now swept, and the third is recorded as unreachable
  rather than left silent.

  `retiredValuesInCompany()` is the new rule, beside the value-set grammar it
  extends. A retired value counts as a live claim when the text names the table it
  was retired from AND carries a value that column still accepts — "unhappy
  paths" beside "exception". Both signals are required and the measurement is why:
  seven of the eight values this map retires are ordinary English in this tree, so
  a bare-word sweep for them returns eleven findings of which two are defects,
  and the guard would be a list of exemptions on its first run. `named` alone adds
  sentences about database triggers and side-by-side comparison; `beside` alone
  reads "a single source of truth … the stacked column headers" as a layout
  claim. Together they returned three findings and all three were defects — two of
  which no one had reported.

  The rule asks the rename map what is retired and the schema dump what is live,
  so nothing in it counts sites or names a word. A value folded next month is
  swept next month without the file changing, and a column that still accepts a
  value is not a finding, which is what keeps a fold the instance shipped and this
  template has not from failing here.

  Two subjects. Every swept document, sentence by sentence, with the same
  exemption the value sweep allows — a sentence recording the retirement proves it
  with a correction verb and the migration that ran. And every authored figure,
  read whole: a drawing has no sentences, and three `<text>` nodes labelling three
  boxes drawn behind one another are one enumeration.

  The third shape is a comment inside a component, and it is not swept on evidence
  rather than on effort. Under `src/` the retired words are live: the app matches
  `'unhappy path'` and `'alternative path'` against the name an author types,
  because the fold took the kind and left the names alone. The same rule over
  every comment there returns ten sentences of which two are defects; the other
  eight are the app explaining what it translates, and a comment beside code says
  what changed without citing the migration that changed it, so the correction
  exemption cannot see them. Eight exemptions on a first run is a list of sites.
  Both defects were fixed by hand and the guard says out loud that it does not
  hold that shape, alongside the two blind spots the rule itself has — a sentence
  using a retired value as English beside its own table, and a scope carried
  across a sentence boundary.

- 936c8b3: A step's frames follow lane position, and the order is a guarantee.

  `useStepSpec` reads a step's storyboard frames through an embedded
  `lanes(name, position, lane_role)` select and never sorted them, so the row the
  step panel draws was in whatever order the query plan produced. Nothing looked
  broken, because the rendered row and the image viewer's sibling group are built
  from the same array and therefore agreed with each other — on an order nobody
  chose. A step panel draws one frame per lane precisely so the same moment can be
  compared across actors, and which actor is a position on the board; a new index
  or a different server could have reordered it silently.

  The frame assembly moves into `storyboardFramesFromCells`, a pure function that
  sorts on a TOTAL key — position, then lane name, then the frame — so the result
  is a function of the rows and not of their arrival. The sort runs before the
  dedupe: paths share their imagery, so the surviving row decides which lane a
  frame is captioned with, and that is now the first lane in the order rather than
  the first row off the wire.

  The sort is in the hook, not in the query, which is where this codebase already
  puts it: `normalizeBlueprint` sorts the same embedded `lanes` by the same column
  in JavaScript, the agent's scenario listing sorts its embedded scenarios the
  same way, and no query in the tree orders an embedded resource. One convention,
  followed rather than a second one introduced.

  Every other reader of `lanes` was checked. The canvas and the agent's blueprint
  reads share one select and both normalize, which sorts; the harness sorts in
  JavaScript; the lane panel's sibling query returns a SET of rows to write to,
  where order carries no meaning; and the blueprint dialog counts lanes. This was
  the only gap.

  The test is an invariant, not a fixture: over generated inputs, frames never
  place a lower lane after a higher one, and every permutation of a row set
  returns the same frames. A fixture was rejected because it is the shape that
  would have passed the defect — rows written down in lane order are satisfied by
  a function that returns its input untouched.

- e03d42f: `inline` decides what a utility compiles to; the content scan decides what the
  artifact carries.

  Four comments across `theme.css`, `colors.css` and `theme.shape.test.ts` said
  an `@theme inline` block emits no custom properties. A fifth, further down
  `theme.css`, said it does, and the built CSS agreed with the fifth. Neither
  claim was the mechanism. `inline` decides what a UTILITY compiles to — the
  value rather than the registered name, which is why a colour utility resolves
  straight to its semantic token — and emission is settled afterwards by
  Tailwind's content scan: a `@theme` key whose name the scan finds is emitted
  at `:root, :host` under `@layer theme`, and a key it never finds is dropped.
  Two hundred and twelve of this file's three hundred and twenty keys are in the
  artifact, and no two families are there for the same reason.

  What counts as finding a name depends on the file. A stylesheet offers a name
  only inside a `var()`; a `.tsx` or a `.md` offers it however it is written,
  comments and prose included. So the hue registrations are always emitted —
  their value spells their own name — while three others were in the artifact
  for no reason but a sentence somewhere: the canvas registration because this
  file's own warning against reading it spelled the read, the sans-font key
  because the comment explaining why it must not self-reference spelled the
  self-reference, and one retired alias because a CHANGELOG entry names it. The
  first of those goes with the rewritten warning. It is the one declaration this
  change removes from the compiled CSS, twenty-nine bytes, and nothing read it.

  `declarerOf` still treats every `@theme` name as a declaration, and now says
  why rather than leaving it as the thing nobody had checked. The dangling case
  a stricter rule would have to catch — a stylesheet reading a registered but
  unemitted name — cannot be constructed, because reading a name is one of the
  things that emits it, and the files the token model samples are a subset of
  the files Tailwind scans. Every read a rule can see is a read that emits what
  it reads. That subset relation is now a test rather than a claim: it fails if
  a fourth scan exclusion appears, and it fails if the sample widens to take in
  the test files, which is the direction the model's own header calls safe.

## 1.12.10

### Patch Changes

- 3ab0896: The rename map says which name became which, and a fold says its destination
  once. `scripts/retired-vocabulary.mjs` recorded each rename as a `was` array
  beside an `is` array, which reads positionally because nothing else is on
  offer — and two parallel arrays cannot express a fold, which is the commonest
  kind of rename.

  The path-kind row is where that told a lie. It said `unhappy` / `alternative`
  on one side and `exception` / `variant` on the other, so the map claimed
  `unhappy` became `exception`. `21000116000000` runs one statement —
  `set kind = 'variant' where kind in ('unhappy', 'alternative')` — and both
  spellings landed on `variant`. `exception` already existed, carries "this went
  wrong", and was never a destination; the migration's own note says so. The row
  had been carried across from the deployment's map, where the same pair is
  correct, because that database's `20260821220000` really did send `unhappy` to
  `exception` and `alternative` to `variant`. Two histories, one row, and nothing
  holding either against the SQL that ran.

  The map is a list of PAIRS now. Each retired name says where it went, several
  may name the same destination, and a name that was dropped rather than renamed
  says `null` and why. `kept` is the other half of a fold and the half the old
  shape had nowhere to put: a value that already existed on the column, kept its
  own meaning, and was never landed on. `was` and `is` are derived from the
  pairs, so the two lists cannot drift from them or from each other.

  Two more rows were reading wrong under the same shape. The placement row paired
  `cell_touchpoints.screenshots` with `resources.kind`, and no screenshot ever
  became a kind — every url and every screenshot is copied into `resources.url`,
  and `kind` is what tells a link from an attachment afterwards. The design
  system's row implied `pill` became `badge` and `chip` became `tag`; neither
  word maps onto one, which is why the deployment's own `coverContent.chip`
  became `commandCopy`. Both now say what happened.

  Three readers had inherited the positional guess and no longer do:
  `value-set-claims`, which is what tells an author what a retired value became;
  `check-database-names`, which names the replacement in its failure; and
  `check-instance-vocabulary`, which keeps the old reading only for the
  instance's map, whose shape offers nothing else.

  `scripts/tests/the-map-is-what-the-sql-did.test.mjs` is the guard. It reads
  each row's migrations down to their top-level statements — comments and
  dollar-quoted bodies removed — and asks whether the `update` or `rename` that
  would perform each pair is there. A pair no single statement performs carries a
  `because`, and the excuse is held to being true: declaring one on a pair whose
  statement is in the file fails. Nothing in it counts anything, so a rename
  added tomorrow is checked tomorrow without the file changing. Its header
  records what it cannot see — it proves a statement was written, not that it
  took effect, which is `check:identifiers` against a live catalogue.

- cbdbe4b: A lane is a row of the board again, and a layer is everything else. The rename
  that moved the table `layers` to `lanes` was carried into the prose by word
  replacement, so every sentence using `layer` in one of its ordinary senses came
  out saying `lane`. An earlier pass restored eleven of them. Ninety more had
  survived.

  The cover page was the one a reader met: "All four sit on one shared context
  lane" printed two entries above the same file defining `lane` as "One actor
  across the whole journey". The README said it twice more, once in a figure's
  alt text.

  Behind that, the damage ran in families rather than in scattered lines, which
  is why counting occurrences under-reported it. The **boot layer** — the opaque
  cover the sidebar draws over itself while the canvas stages — was called a
  lane in twenty-two places across the shell, the skeletons, four panels and
  five test names, in a file whose own paragraph two lines up says "The boot
  skeleton is an OPAQUE LAYER over the whole sidebar". The **canvas reveal's**
  rungs, which open one after another on `transitionend`, were lanes in fifteen
  more; the board's actual lane rows fade in at rung one, so both words were
  correct in that comment and only one of them was in the right place. The
  **chrome layer**, the **compositing** boundary WebKit will not resolve across,
  the agent runtime's **tool layer**, the design system's **token tier**, and
  Figma's **layer tree** account for the rest. Outside `src`, the same replacement
  turned a note recording a past rename into `` `lane-roles` -> `lane-roles` ``,
  a rename to itself.

  Two bindings were renamed rather than reworded. `getLaneScale`, `laneRef` and
  `laneInteractive` in the annotation layer, and `laneElement`/`laneRect` beside
  them, name a handle on one element — which is a layer; a lane is a row of data
  drawn by many elements across the whole width of the board and has no single
  element to hold. Nothing reaches them by string, so the compiler carried the
  rename; the DOM contract `[data-canvas-annotation-layer]`, which IS addressed
  by string, already said layer and is untouched. The second was worse hidden:
  the arrow overlay's prop was declared `lane: ArrowLayer` and compared against
  `'forward'` and `'wrap'` on `z-0` and `z-30`, so one file used `lane=` for a
  stacking layer and for a board row seventy lines apart.

  Where a sentence is true under either reading it was left alone. Ten comments
  in the reveal code say "lanes" about the board and stay that way, including
  "phase frames + lane structure" one comment above six that had to change.

  ## The guard, which is the part that lasts

  `scripts/tests/a-lane-is-not-a-layer.test.mjs` asserts that nothing called a
  lane is a layer, over every scanned file, **comments included**. That inverts
  the sibling check next door, whose header says prose may use an English word
  and a name may not misuse one. That rule is right for a word the domain does
  not own; `lane` is this vocabulary's own word, so here the damage IS in the
  prose, and a guard reading names only would have found three of ninety.

  It decides by the company the word keeps. A lane is a row of the board: it is
  not composited, it does not stack, it is not a rung of an animation and it is
  not a tier of software. So `lane` may not stand in the vocabulary of the
  cascade, of paint, of stacking or of an architectural tier. Every pattern names
  a concept rather than a site — "boot lane" is forbidden because a row of the
  board does not boot, not because twenty-two files said it, and the check has no
  idea how many exist.

  Four cheaper shapes were tried against the whole tree first and are recorded in
  the header so the next person does not re-derive them. Position does not
  separate the senses: in one stylesheet, forty of the forty-four correct uses
  are in comments and so are all nine wrong ones. A per-file sense declaration
  fails one level up, because ninety-one of the hundred and eighty-nine files
  that use the word hold no lane identifier at all and still discuss lanes
  correctly, and the three worst-hit files carry both senses, one of them inside
  a single sentence. The pre-rename tree is not an oracle either, though it
  settled a dozen calls: before the rename `layer` was BOTH words, the schema's
  name for a row and the stacking sense, so only its negative direction is
  sound. And an allowlist of modifiers is unbuildable, because what precedes
  "lane" in this tree is overwhelmingly determiners and ordinary adjectives.

  What it cannot see is stated in its header rather than hidden. Measured against
  the sentences actually repaired, the patterns catch a little under half; the
  rest are anaphora — a paragraph naming "the boot layer" once and saying "the
  lane" four sentences later. No line-local rule reaches that, and resolving it
  needs a parser and a model of the paragraph. What makes the limit tolerable is
  that anaphora does not arrive alone: the paragraph almost always names the
  thing once, and naming it is what trips the check.

  The residue sweep beside it gained the fix for a blind spot it had all along. A
  `semantic lane` had been sitting in the customization reference since the
  rename, invisible because the phrase WRAPPED — "so the whole semantic" ended
  one line and "lane renders greyscale" began the next, and a per-line test
  cannot see a phrase no line contains. It now reads each line joined to the one
  after it, with the continuation's comment marker stripped, and reports only
  matches that genuinely straddle the boundary so a wrapped paragraph is not
  blamed twice.

  `CONTEXT.md` now defines **layer** — as explicitly _not_ a domain word, which
  is the entry that was missing. The glossary is what the next sweep checks
  itself against, and the word this vocabulary keeps colliding with had no entry
  in it.

- aa2b358: ADR 0007 says "boot layer" where the rename had left "boot lane", and main is green again.
- b6840ca: Any image worth looking at now opens, and once open it behaves like an image
  viewer.

  An image in this app used to be either too small to read or not openable at
  all. A cover figure authored at 880px is shrunk to the prose measure, so the
  labels inside it are legible in the source file and not on the page. A
  storyboard frame in a detail stack is a picture of a real screen at a size
  where a reader can see that something is written on it without being able to
  read a word. A screenshot attached to a cell rendered at whatever the panel's
  column allowed, and a featured attachment — the one picture a placement chose
  to lead with — got a thumbnail and no way past it.

  Click any of them and the image fills the screen, fit to the viewport. From
  there the wheel or a trackpad pinch zooms toward the cursor, a click toggles
  between fit and the stop above it, and dragging pans once past fit. On a
  phone, pinch and drag do the same work. The cursor says which of those is
  available, so the gestures do not have to be found by accident. Closing is
  unambiguous and never a dead end: click the surrounding margin, press Escape,
  or use the corner button that stays visible at every scale. A click on the
  image itself never closes, because the image is now the thing being operated.

  Where a picture has siblings — the row of lane frames in a storyboard stack,
  several screenshots on one cell — the viewer steps between them with the
  arrow keys, on-screen buttons, or a horizontal swipe, and a counter says which
  one of how many is showing. Each step returns to fit, so no sibling arrives
  already scrolled to a corner of the last one.

  Two pictures deliberately stay shut. Logos and logomarks are iconography
  rather than content, and a brand mark that opened fullscreen would teach the
  reader that the openable affordance is decoration. The storyboard's horizontal
  layout is only ever drawn inside the walkthrough deck, which already binds the
  arrow keys and Escape on the window — a viewer inside it would fight the deck
  for all three. Those frames open in the vertical stack instead, so nothing
  becomes unviewable.

  Nothing about the data model moves. A frame has no caption anywhere in the
  schema and did not get one for the sake of a label: an opened cell screenshot
  is named by the cell's own content sentence, which is what the picture shows.

- 161326e: The components that composed role colour by hand now ask for a job. Five files
  stop reaching past the semantic tier into a ramp step, which leaves the stepped
  role ramps with no consumer in the tree at all.

  **`alert.tsx` is the case the vocabulary was minted for.** It drew one job with
  two mechanisms, because two of its four status roles had a numeric ramp and two
  did not: destructive and warning took a 400 edge on a 200 surface, while info
  and success drew the same idea as the fill at fifteen percent alpha. Both are
  `--surface-{role}` and `--border-{role}` now, the filled icon square is the
  role's own fill with its own on-colour, and the four variants read as four
  values of one recipe rather than as two recipes that happen to agree.

  **The swap is invisible where it was engineered to be.** The role edge was
  retargeted to sit one step off its own tint precisely so this change would not
  turn a hairline into a rule around the box. Measured per site, in both themes,
  the alert border moves from 1.29, 1.21, 1.34 and 1.30 to one against its tint —
  destructive and warning, light then dark — to 1.28, 1.27, 1.22 and 1.24. The
  band the ramp steps drew, held by a derivation instead of by four literals.

  **Two things move on purpose, and both are legibility.** The alpha tint could
  not hold an edge at all: composited on itself in dark, the info and success
  borders measured 1.01:1 and 1.03:1 — a border that was not there. On the opaque
  tint they measure 1.23:1 and 1.27:1, inside the band with the other two. And
  the icon square used to write the role's TINT as the glyph colour on the role's
  own step-600 fill, one colour on another: 2.96:1 for warning, 5.18 for
  destructive in light. The fill's on-colour is what that job is for, and it
  reads 6.89 and 5.74, with all four status roles clearing 4.4:1 in both
  themes.

  **The tinted warning badge changes visibly, and it is the one place to look.**
  Its ink was a ramp step chosen for being the least illegible option available —
  2.8:1 in light, 5.2:1 in dark, and the comment beside it said so. There is no
  job name for a middle of a scale, because a middle of a scale is what this
  vocabulary exists to stop naming. The ink is now the ink for a colour sitting
  on its own tint, at 13.1:1 and 9.2:1, and the ground under it is the opaque
  tint rather than a ten-percent wash — which is what gives any of those numbers
  a ground to be measured against. Amber body copy becomes a dark amber word on a
  pale amber tint. Every badge with `variant="warning"` moves with it.

  `StatusBadge` was one of the call sites re-deriving that shape out of a tint and
  an edge; it asks for the variant now. Its word goes from `--foreground` on the
  tint, at 20:1, to the role's own ink at 13:1 — ordinary copy on a coloured
  badge becoming a word that carries the status itself.

  **A measurement the vocabulary should answer for.** `--surface-{role}` is
  derived from the page, so on a card it is nearly invisible in dark: 1.02:1
  against `--card` for all seven roles, where the card itself sits 1.09:1 off the
  page. Every tinted surface in this change inherits it, and the role's edge is
  what carries the shape there. It is a property of the derivation rather than of
  these call sites, and it is the same in light only because card and page nearly
  coincide there.

  No token is deleted and no Tailwind registration is removed. The stepped ramps have no call site
  now, which is the precondition the deletion pass was waiting on.

- fc48367: `create_slice` and `update_slice` now advertise the argument they read.

  Both declared `description` and read `summary`. Nothing connected the two:
  `specs.ts` builds a JSON schema out of string literals and `registry.ts` reads
  `args['summary']` out of a `Record<string, unknown>`, so both files typecheck
  no matter what they say. A model that filled in the field the schema offered
  created a slice with an empty summary and was told it had been created.
  `update_slice` failed worse — it kept the old summary and reported success, so
  an edit meant to change the text changed nothing.

  The schema now offers `summary`, which is the column it writes. The handler
  still reads `description` as well, so a model taught the old wire keeps the
  word that used to be dropped rather than losing it a second time.

  The general form is now checked. `scripts/tool-arguments.mjs` reads both files
  and compares argument names per tool, in both directions: an argument declared
  and never read is the silent drop, and one read and never declared is an
  argument a model can only send by accident. Aliases are listed with a reason
  and only ever excuse the second direction — a name the schema knows and the
  handler does not is the defect itself, so there is no way to excuse one.

- bf59efa: A cell panel's slice footer shows a skeleton while the slices load, instead of appearing after them and pushing the panel.
- c880fd7: The path classifier is spelled `kind` everywhere, not `type` in half the names.

  `20260830190000` folded the schema's classifiers onto one word: `paths.path_type`
  became `paths.kind`. The type followed — `PathKind` was already the spelling in
  every file — but the constants, the theme module and seven camelCase members did
  not, so one concept was spoken about in two words that a reader had to learn were
  the same.

  Renamed: `PATH_TYPE_COLORS`, `PATH_TYPE_ARROW_COLORS`, `PATH_TYPE_LABELS`,
  `PATH_TYPE_SHORT_LABELS` and `BLUEPRINT_ARROW_PATH_TYPES` onto `KIND`;
  `src/lib/pathTypeTheme.ts` to `pathKindTheme.ts`; and `showPathTypeBadge`,
  `shouldShowPathTypeBadge`, `getPathTypeSectionBorderStyle`,
  `isGenericPathTypeName`, `getPathTypeSuffixIfNeeded`, `defaultPathTypeMarkerIds`
  and `defaultPathTypeMarkerColors` with them. `PathTypeBadgeProps` and
  `PathTypeColorKeyProps` sat inside files already named `PathKind*`.

  `pathColorTheme.ts` is untouched — "path colour theme" carries no classifier
  word. Nor is `path_type` where it names history: `paths_path_type_check` is the
  constraint's real name, and the rename map and the IR migration script have to
  be able to say the retired word to retire it.

  Behaviour is unchanged; every renamed symbol keeps its value and its callers.

- 4565a50: Every coloured role now offers the same seven names, so an author picks a
  colour by naming the job rather than by reading a number off a ramp.

  Seven roles — `primary`, `brand`, `warning`, `destructive`, `info`, `success`,
  `secondary` — and seven names each. The fill (`--{role}`), ink on that fill
  (`--{role}-foreground`), the resting tint (`--surface-{role}`), ink on that
  tint (`--text-on-surface-{role}`), role ink on the neutral page
  (`--text-{role}`), the edge (`--border-{role}`) and the transient state
  (`--wash-{role}`). Roughly seventeen of the forty-nine existed; this fills the
  rest and publishes a Tailwind utility for each.

  **What a reader sees change.** Almost nothing, and that is deliberate: this is
  the expand half of a migration, so the new names land beside the old ones and
  the call sites move separately. Two things do move on screen.

  The info and success alerts are the only live consumers of a role border, and
  theirs becomes solid: the fill at thirty percent alpha drew a different colour
  on every ground it crossed, which is why components reached past it for a ramp
  step. It is also quieter. A role border is not what identifies a control or its
  state — the tinted surface and the filled icon square carry the variant, and
  the edge can go without the alert becoming unreadable — so the target is the
  interval this system's recipe uses rather than the 3:1 a required boundary has
  to clear. That recipe puts a role border one step off the surface it edges,
  which across its own four alert variants measures 1.21:1 to 1.34:1. Every role
  here lands between 1.22:1 and 1.28:1 against its own tint, in both themes. On
  the ground those two alerts draw on today the edge measures 1.23:1 and 1.19:1
  in light, against 1.45 and 1.43 for the alpha it replaces; in dark it measures
  1.09 and 1.08 against 1.67 and 1.88, because those two still tint with
  `bg-{role}/15`, which sits lighter than `--surface-{role}`. That gap closes
  when the call sites move onto the tint.

  And `--border-brand` was derived from the primary fill while brand had no fill
  of its own; it is derived from `--brand` now, which is the colour its name
  always claimed. Nothing consumes that one yet.

  Everything else holds exactly: every custom property under `src/styles`,
  resolved in both themes, with no value moved except those five borders.
  Seventy-two names arrive and twenty leave, and the twenty are the brand ramp
  and nothing else.

  **What an author gets that did not exist.** A name for role ink on a neutral
  ground. `text-destructive` is written at about twenty call sites, all of them
  on the page rather than on a tint, and it resolves to the solid fill — a
  colour tuned for ink to sit on top of it, never measured as ink. `--text-role`
  is that measurement: 8.4:1 to 13.5:1 against the page across both themes. A
  resting tint for every role, so nobody hand-composes `bg-success/10` at the
  call site again. And a transient wash distinct from the tint, so hover does
  not reuse the surface it sits on.

  **Brand becomes two dials, and the ramp goes.** `--brand-lightness` and
  `--brand-chroma` sit in both theme files beside the primary pair, and `--brand`
  derives from them. Rebranding used to mean re-typing a seven-step lightness
  curve per theme; it is two numbers now.

  So the ramp goes with it — `--color-brand-100` through `-1200`, the
  `--brand-200..600` literals in both theme files and in the print block that
  restated them, `--brand-default`, and `--color-brand-link`. Nothing outside
  those declarations read any of them, here or in the deployment that pins this
  package, so nothing on screen moves. It is a rule and not a tidy-up: a
  primitive family is named for its hue — amber, violet, teal — because the hue
  is all it knows about itself, and a family named for a ROLE cannot follow an
  accent, which is exactly what a rebrand asks of it. The role keeps its name in
  the semantic layer, where the value is derived.

  `brand-link` had no consumer either, and the job it named already has a derived
  name: role ink on a neutral ground is `--text-brand`. Deleting it is cheaper
  than deriving a colour nobody has asked for and nobody would measure.

  `bg-brand` renders the colour it always has — #7e7e7e in both themes here,
  since the lightness dial is the OKLCH lightness the anchor step carried. With
  the ramp gone there is no step left to compare it against, so the rule that
  claimed it becomes the derivation instead: the fill is the accent at the two
  brand dials, on the one hue the filled control also runs on.

  Every one of the new names is derived from the role's own accent, and none
  aliases a hue primitive. Status hues are pulled a fraction toward the brand and
  then clamped to their category, so a re-branded deployment's warning still
  reads as a warning; a fixed ramp cannot follow an accent, and aliasing one
  would have deleted that mechanism. The ramps stay for categorical colour —
  lane identity, path variants, annotation swatches — which carries no meaning
  and correctly reaches the primitive layer.

  The contrast claims are measurements rather than assertions. The token model
  learned to resolve a declaration to a colour — `calc`, `clamp`, relative colour
  syntax, both alpha spellings — so a rule reads what the cascade produces
  instead of restating the arithmetic in TypeScript beside it. Every floor was
  re-measured with the accent, chroma and hue a branded deployment ships, and
  holds there too.

  Completeness is an invariant, not a census: the rule is driven off the role
  list, so adding an eighth role covers it automatically and fails until all
  seven of its names are declared and registered.

- 2afde98: The documents an agent reads call the findings table by its name.

  `21000116000000` renamed `findings` to `audit_findings`. Twelve places across
  `CONTEXT.md`, the two reference contracts, both audit-writing skills and the
  whatif change-request schema went on naming the old table — and one of them,
  the adapter contract's column-scoped UPDATE list, still named `note` for the
  column that is now `summary`.

  Three occurrences deliberately keep the old word, because each names the past
  rather than the schema: the migration-history row for
  `20260729120000_derived_layer.sql`, which created a table called `findings`;
  the sentence in `docs/engineering/checks.md` explaining the rename itself; and
  `recordFindings`, whose port really is called `findings` in `ports.ts`.

- fc48367: The findings-row shape in `agents/auditor.md` names the columns it writes to.

  It said `check_name` and `note` while claiming to be "the same shape
  `audit_tools.py --help` documents", two renames after `21000116000000` made
  those `check_key` and `summary`. An auditor following the document to the
  letter produced a row `audit_tools.py` raises `KeyError: 'check_key'` on.

  `findingFingerprint`'s parameter and the findings row in
  `references/data-model.md` carried the same two retired words.

  Shipped in #289 without a changeset; recorded here.

- db56975: The warning and destructive ramps are gone, and the shape that let them exist
  is now checked rather than described.

  Two roles carried a five-step ramp of raw HSL triples — `--warning-200`
  through `--warning-600` and the same for `destructive` — declared in both
  theme files and restated a third time inside the print block, so a reader
  looking one up found three declarations of it. A sixth token,
  `--destructive-default`, sat beside them: named for a POSITION on that ramp
  rather than for a job, identical in both themes, and read by nothing at all.
  The components that used to reach for these ask for a job now, so all thirty-
  two declarations are deleted.

  Ten more lines went with them, and those are the ones that could only be
  removed here. `theme.css` registered every step into Tailwind's colour
  namespace as `--color-warning-200: hsl(var(--warning-200))`, which is the
  entire reason `bg-warning-200` and `border-destructive-400` were ever legal
  classes. The hue primitive families stay: they are the right home for colour
  that carries no meaning, and this template ships them neutral as its brand
  seam. A ramp named for a ROLE is a different thing, and it was living in the
  dial file as raw literals — two tiers below where a meaning belongs.

  **Nothing renders differently.** The compiled stylesheet was built from the
  tree before and after and diffed: three hunks, one per site that declared the
  ramps, removing exactly those thirty-two declarations and no other byte. The
  registrations produced no output to begin with — `@theme inline` emits no
  custom property, it only tells Tailwind a name exists — and the compiled sheet
  contained no `.bg-`, `.text-`, `.border-` or `.ring-{role}-{step}` selector
  before the change either, because nothing was writing one.

  ## The guard, which is the part that lasts

  Deleting the registrations fixes today and does nothing about tomorrow: the
  next person can add them straight back. `src/styles/theme.shape.test.ts`
  asserts the shape of EVERY colour entry in that file, so a registration added
  next quarter is checked next quarter without the test changing and without it
  knowing how many entries there are or what any of them is called.

  A colour registration is one of exactly two things. It is a **namespace
  declaration**, `--color-X: var(--color-X)` — self-referential on purpose, so
  the name exists and its value resolves in `colors.css`; the hue families are
  204 of these. Or it is an **indirection**, `--color-X: var(--Y)` where `--Y` is
  a semantic token: one bare `var()`, no function wrapped round it, no fallback
  arm, nothing beside it, and no declaration of `--Y` in the dial or primitive
  layers. There are 99 of these. `hsl(var(--warning-200))` fails the first half
  of that; `var(--warning-200)`, which is what unwrapping it by hand produces,
  fails the second. Both halves are needed, because the second shape is what a
  plausible repair looks like.

  The rule reads the token model rather than opening the stylesheet, which the
  decision that one token model is the single style seam already asks of any new
  rule — and which matters concretely here, since two declarations in this file
  wrap across lines and a per-line sweep cannot tell a declaration from the same
  characters inside the paragraph above it.

  Three cheaper rules are recorded in the header so the next person does not
  re-derive them. A list of forbidden names is a census: true of the ten lines
  that prompted it, silent about the eleventh. "No `hsl(` on the right" catches
  the exact wreckage and nothing adjacent — `rgb(`, `oklch(`, `color-mix(` and a
  bare hex literal all walk past.

  The third is the interesting one, and it is a finding rather than a rejected
  sketch. "No numeric suffix on the left" was the form the rule was first
  proposed in, and 204 legitimate entries carry one — every step of every hue
  family — so the rule as stated would condemn the layer it was written to
  protect. The number was never what was wrong. `--color-amber-100` is a
  position on a ramp and is supposed to be; what was wrong with
  `--color-warning-200` is that a ROLE is a meaning, and a meaning has jobs
  rather than positions. The five chart-series keys settle it: numbered, not
  self-referential, flagged by a digit rule, and entirely correct — their number
  is a series identity, they point at semantic tokens, and they compute nothing.
  Asking about reach and shape instead of digits covers all of it with no
  exception list at all.

  What the rule does not claim is stated in its header rather than hidden. The
  subject is the colour namespaces; the radius ladder's `calc()` rungs are
  a real derivation it is meant to have, and the literal measures beside them
  are a different question. A colour namespace not containing the word
  `color` — Tailwind's `--fill-*` and `--stroke-*` — is outside the pattern; this
  file registers none today.

  A deployment that has forked this template carries the same declarations in
  its own theme files and print block. They are unread there too, and they go
  when it takes this change.

- 1eb250d: The step panel's lane frames now open, and step to one another in lane order.

  A step panel draws one frame per lane — the same moment as each actor saw it,
  side by side in a row that exists to be compared. Until now that row was the
  one place in the app where the pictures were smallest and the least openable:
  each frame is 128px wide at 4:3, which is enough to see that a screen has
  something written on it and not enough to read a word of it. The image viewer
  had already been wired to the cover figures, the featured resources, the
  storyboard detail stack and the cell panel's screenshots; this row was the
  motivating case for the whole feature and was the one still left inert.

  Click a frame and it fills the screen, fit to the viewport, with the same
  gestures every other openable image has. From there the arrow keys, the two
  on-screen buttons or a horizontal swipe walk along the row — the same moment,
  the next actor — and the counter says which of how many. Each step returns to
  fit, so no lane arrives already scrolled to a corner of the last one, and
  stepping wraps at both ends because a row of three actors is something a
  reader cycles rather than traverses.

  The row is handed to the viewer as an ordered array plus the index of the
  frame that was clicked. It is not discovered by scanning the container, and
  the distinction is the point of this change rather than an implementation
  detail: the order of these frames is lane order, and lane order is what makes
  stepping mean anything. A scan would reproduce it today and only by accident,
  until the day a wrapper element or a CSS reorder quietly rearranged it and the
  viewer went on claiming to walk the lanes.

  Each frame's accessible name is its lane's, the caption already printed under
  it. No field was added to any record to supply one: a frame carries no caption
  anywhere in the schema, and what the picture shows is the moment the panel's
  summary already describes — the lane only says whose view of it this is.

- 604a780: A blueprint cell's lane rule states five properties, not seven:
  `--background-blueprint-cell-origin` and `--ring-blueprint-cell-soft` are gone,
  because neither carried a value of its own.

  Both had readers, which is what made them look real. The button's `blueprint`
  variant chained through `-origin` on its resting and hover fills and through
  `-soft` on all three of its ring, border and pressed-ring colours, and the
  board's preview-hover and connected-emphasis rules read one apiece. But every
  link in every one of those chains was a `var(name, fallback)`, and the fallback
  was the twin: `-origin` falling through to `--background-blueprint-cell`,
  `-soft` to `--ring-blueprint-cell`.

  So the question was only ever whether some role gave a twin a different value.
  Measured through the token model across all sixteen role blocks — nine lanes
  and seven touchpoint tones — in both themes: sixteen of sixteen identical for
  each pair, textually and as resolved sRGB. Every chain resolves to the same
  colour with the two names absent and the fallback taken, so nothing on the
  board changes.

  Two names for one value is what one authored accent per role exists to remove,
  and the same deletion already stands in the deployment this design system is
  shared with. The lane rule now reads the same in both.

## 1.12.9

### Patch Changes

- 5661884: The agent's cell-content budget advises instead of refusing: a cell longer
  than the budget is written in full, and the reply says so.

  An agent that composed 130 characters of cell text used to lose all of them.
  The write path measured the content against a 120-character cap and threw, so
  the sentence the model had already worked out never reached the database and
  the model was left to guess a shorter one. Nothing in the schema asks for 120.
  It is a judgement about how much copy looks right in a card, backed out of the
  canvas geometry — and a judgement should advise rather than discard work
  already done. `upsert_cell` and `update_cell` now write whatever they are
  given and append a note naming the budget, the length they read, and where
  supporting detail belongs. The two tool descriptions say the same thing, so a
  model reads the budget as an aim rather than a wall.

  The `maxLength` on the Content field in the cell editor stays. A box someone
  is typing into can stop them at the budget before anything is lost, which
  prevents; discarding a finished paragraph after the fact does not.

  Nothing about the board moves, because the render never depended on the
  refusal: a narrative cell already draws at a fixed height and clamps its
  preview to the lines that fit, with an ellipsis, while the whole string stays
  in the cell's own text node for the detail panel and for a screen reader. That
  the height is fixed is an existing assertion about the layout estimate — a
  long cell and a short one size their lane identically — rather than a claim
  about any number of characters, and it is what makes the softer write path
  safe to ship.

- 00c0992: The slice editor calls a slide a slide. The title box asks for a Slide title,
  the button at the end of the strip adds a slide, the tooltip on a card deletes
  one, and the ✕ on a cell badge takes that cell out of the slide. All four said
  "screen" before, which is a word this vocabulary does not use for anything.

  Three words are settled and distinct. A **frame** is one image on one cell —
  column `cells.frame`. A **slide** is one row of a slice — table `slides`.
  **screen** is ordinary English: a display, a viewport, the surface a reader
  happens to be looking at. Letting the schema's own prose call a slide a frame
  is the exact defect the `slides` rename fixed, and
  `scripts/retired-vocabulary.mjs` has recorded it ever since; calling a slide a
  screen is that defect wearing a third word.

  `CONTEXT.md` now defines all four of `frame`, `slide`, `strip` and
  `storyboard`, which it did not before. That is the half of this change that
  matters longest: the glossary is what the next sweep checks itself against, and
  none of the four had an entry to check.

  Behind the strings, the bindings that named a slide are renamed to say so.
  `screenIndex` becomes `slideIndex` in the composer, which had been rendering
  the label `Slide {screenIndex + 1}` — the right word printed from a variable
  named for the wrong one. `mergeSelectionIntoScreens` becomes
  `mergeSelectionIntoSlides`. `sequenceByFrame` and `frameProblems` become
  `sequenceBySlide` and `slideProblems`; `FrameNavButton` and `frameCellIds`
  become `SlideNavButton` and `slideCellIds`; the type `FrameLoss` becomes
  `SlideLoss`, and its own doc comment already said it holds slices that lose
  slides.

  The correction runs in both directions, which is the part worth reading twice.
  Three comments in the presentation view had a _frame_ called a _slide_ — the
  strip described as "the slide's own cell slides", several frames on one slide
  as "cell slides in one slide", the empty state as "no card slide". Those are
  the same defect mirrored, and a sweep that only pushed one word toward the
  other would have deepened them.

  Nothing was pushed further than that. `screen` keeps every legitimate sense it
  has: the Testing Library binding, `screenshot`, and prose about viewports and
  surfaces — including the two comments that say a slice and its presentation are
  one object rather than "two unrelated screens", and that presenting is a mode
  of the slice and "not a separate screen". Both are the ordinary word used
  correctly, and rewriting true sentences to satisfy a vocabulary rule is how the
  sibling `layer`/`lane` sweep mangled forty of them. The layout contracts the
  two spellings already agree on — `slideLayout.ts`, and the `data-slide-canvas`,
  `data-slide-id` and `data-slide-sticky-header` attributes — are untouched.

  The reference documents that describe the `slides` **table** stop calling its
  rows frames: the data model listed the table as "One frame of a slice", the
  adapter contract warned about a "frameless slice" and stranded "orphan frames",
  and the guide said a slice's frames point at live cells. The slice authoring
  **file format** is a separate question and is deliberately left alone — its
  `frames` array is a schema key that existing slice files and the skill's own
  tooling read, so it is a compatibility decision rather than a spelling one.

  The assertion that holds this is an invariant, not a census of today's four
  strings: nothing on the slice surface — no identifier, no string a reader
  sees — is named a screen. It says nothing about how many strings there are, and
  it deliberately makes no claim about `frame`, because a frame is a real thing
  on that surface and any rule about the word would be a list of today's
  identifiers. Comments are outside its subject for the same reason the
  sentences above survive: prose may use an English word, a name may not misuse
  one.

- 3d6ff76: A variant path appears once in the path picker, in the column beside the happy
  path, instead of twice — once on each side.

  The picker lays its paths out in columns, and it decided which column a path
  belonged to by filtering the same list against two sets of kinds, `happy` and
  `variant` on the left, `variant` and `exception` on the right, and treating the
  two results as disjoint. They were not. `variant` was in both, so every variant
  path was drawn in both columns: two checkboxes, the same label and the same
  swatch on each, toggling the same filter, with no way for a reader to tell that
  they were one path.

  The overlap is residue from the migration that took path kinds from four to
  three. `unhappy` and `alternative` were two spellings of one idea and both
  became `variant`, on the reasoning the migration states itself: `exception`
  already carries "this went wrong", so `unhappy` was only ever `variant` with a
  mood attached. Before that fold the two sets were disjoint and the split meant
  something — `alternative` on the left, `unhappy` on the right. Putting the new
  spelling in place of both old ones put one value in both sets, and a `Set`
  takes a repeated member without complaint, so the day the split stopped being
  a split, nothing said so.

  Which column a path belongs in is now answered by a single total map from kind
  to column, consulted once per path — not by asking each column in turn whether
  it wants the path. That is what the two sets could not be: every kind is
  assigned, because the map is a `Record` over the kinds and the compiler will
  not accept a gap, and each is assigned exactly once, because a repeated key is
  a syntax error rather than a silently absorbed duplicate. Assigning a kind to
  two columns is no longer a mistake that renders; it is a thing that cannot be
  written down. `variant` is assigned the primary column, beside the happy path,
  which is where the fold leaves it: after the fold a variant is the alternate
  route and `exception` is the whole of what goes wrong, so the secondary column
  holds exceptions alone. A path whose kind this build does not recognise still
  gets a column, so that a newer schema's row is drawn rather than dropped.

  The test is the invariant the defect broke, and it is not a census: for every
  short arrangement of the kinds the app declares, everything handed to the
  grouping comes back out of it exactly once, with nothing dropped and nothing
  invented. It names no kind and no column, and it does not say how many kinds
  there are — a fourth would be a migration, and it should not also be an edit
  to this test.

- c32ce65: Seventeen files call the `errorMessage` helper they already export instead of inlining it.

## 1.12.8

### Patch Changes

- 083164c: The last three repo-local citations leave the shared files, and the placeholder asset keeps its warning.
- 74dcc40: The create-version dialog's Kind picker offers three kinds, not four — Variant
  is one button now, and the console it warned in stays quiet.

  `PATH_KINDS` listed `variant` twice. It is residue from the change that
  collapsed `unhappy` and `alternative` into the single `variant` the database
  has accepted since `paths_kind_check` was rewritten: both old spellings were
  substituted for the new one, and the roster ended up holding it once for each.

  Nothing failed, and the shape of the roster is why. The kind union is derived
  from the array, and a union dedupes on the way out, so the type stayed correct
  and the compiler had nothing to say. Every label and colour map is a
  `Record<PathKind, …>`, and a repeated key there is a syntax error, so those
  defended themselves. Only the array is iterated — the picker draws one button
  per entry — so the duplicate surfaced in the one place it could: two buttons
  reading Variant, doing the same thing, and React warning about two children
  sharing a key.

  The same substitution left the same mark in two more rosters, found by looking
  for it. The blueprint arrow markers keep their own list of kinds and it also
  held `variant` twice; that one is only ever turned into a lookup map, so the
  second entry overwrote the first with the same value and nothing was visible.
  The agent's `create_path` and `duplicate_path` schemas held it twice as well —
  and alongside it `named`, a fourth value that is not a kind, that no map keys,
  and that the database refuses. That one had teeth: it was offered to the model
  as a legal choice, and picking it built a row the insert would have rejected.
  Both schemas now offer the three kinds the constraint accepts, and their
  descriptions name those kinds rather than the retired spellings.

  The assertion that holds this is an invariant rather than a count. It says each
  roster lists each of its members once, that the rosters and the compiler-guarded
  maps hold the same members as each other, and that a tool-schema enum which
  speaks the path-kind vocabulary speaks nothing else. Nowhere does it say there
  are three kinds — a fourth would arrive as a migration and a decision, and this
  test should not have to be edited when it does.

## 1.12.7

### Patch Changes

- 6923d4b: Sixteen shared files that differ from the deployment's copies by prose alone
  lose their repo-local citations, so the drift gate can hold them. The raw-hex
  exemption for `arrowSituationCatalog.ts` goes with them — its only matches were
  the issue references now gone.

## 1.12.6

### Patch Changes

- bd8617d: A connector arriving at a walled cell on the merged canvas lands on its slot's
  outer edge, so no arrow in the catalog ends by travelling backward.

  An arriving end turns back into its card vertically where there is room, and
  falls back to a side entry where there is not — and a side entry out of the
  right gutter draws its last stub leftward. The markers are `orient="auto"`, so
  the head follows that stub and points backward along a grid whose one ordering
  claim is that time runs left to right.

  Six connectors in the golden geometry catalog still ended that way, all of them
  in the merged view: a backward loop within a lane, an upward cross-lane run,
  both runs of a cell that is a target and a source at once, and both links of an
  A→B→C chain. What walled them was the merged canvas's own shape — a slot there
  stacks one sub-cell per path, and a sub-cell sits hard against its neighbour's
  edge, far too close for a head to turn in between them.

  The stack is one slot, though: every sub-cell in it shares a lane and a step
  column, and the stack as a whole still has a free top and a free bottom. So an
  arriving end now measures its horizontal edges from the stack rather than from
  the card, and a head landing on the stack's outer edge names the lane and the
  column its target does. A departing end still leaves its own card's edge — it
  carries no head, and a line that appeared to start at a neighbour's edge would
  misname its source. A cell with no stacked neighbours reports its own box, so
  every route outside the merged view is untouched, point for point.

  The catalog now asserts this as an invariant over every situation and every
  view mode rather than over the six that were known, and pins the number of runs
  each mode draws, so a head cannot be straightened by dropping the arrow.

  The merged fixture was also wrong about the canvas it models. It stacked
  sub-cells without re-spacing the lanes, which overlapped one lane's sub-cell
  with the next lane's card — two cards sharing the same pixels, which the merged
  grid's `minmax(_, auto)` row tracks cannot produce. The packed column that came
  out of that left an arriving head nowhere at all to land. Lanes are re-spaced
  now, each keeping the gap it had. The single and side-by-side renderings are
  byte-identical.

- 4c32a69: Printing from dark mode prints the light palette, all of it.

  `styles/print.css` forces the light palette onto paper by restating dials
  inside `@media print`, under `:root, .dark`. The `.dark` arm is what takes the
  dark theme's declarations back, and it can only take back a name it mentions.
  The block's header comment said exactly that, in prose, and prose does not run:
  the block was written correct and fell **nineteen dials behind** as the theme
  files grew.

  The reported symptom was the filled control. Dark inverts it to a near-white
  fill, `--primary-lightness: 0.922`, and the print ground is `0.968` — so a
  primary button printed from a dark page came out as an L=0.922 fill on an
  L=0.968 sheet, very nearly invisible. The focus ring (`0.62` instead of `0.58`)
  and links (`--brand-link`, 58.3% instead of 26% lightness) went with it.

  Measuring it through the token model found seventeen more. The stepped ramps —
  `--brand-200`…`--brand-600`, and the five-step warning and destructive ramps —
  are per-theme HSL literals rather than derivations, so nothing downstream
  re-derives them into the light; `theme.css` and `colors.css` register them as
  `hsl(var(--brand-600))` and friends at `:root`, and the dark literal is what
  those read on paper. Dark inverts the ordering, 200 darkest, so a printed
  badge or subtle plate came out near-black on white. `--field-alpha` printed at
  dark's `0.12` rather than `0.015`, putting a grey box round every control. And
  `--hue` was pinned in the print block at `177.6`, the upstream brand hue, where
  the light theme has said `159` since this repository's theme files were
  written — moot while `--chroma` is `0`, and a rebrand away from being the
  filled control printing in the wrong hue.

  The print block now restates every dial the two themes disagree about, at the
  light theme's value. It restates nothing else: dials both themes already agree
  on — `--hue`, `--chroma`, `--radius`, `--primary-chroma` — are absent rather
  than copied defensively, because a second unheld copy is what caused this.

  The rule is an assertion now, not a comment. `lib/tokenModel` gained a `medium`
  argument, so the printed cascade can be resolved the way the screen one already
  could: on `print` the `@media print` block wins, and `colors.css`'s
  `@media screen` dark palette — 216 values print.css therefore never has to
  copy — is what gets set aside instead. `styles/tokens.test.ts` holds four
  things against it. Every dial resolves to one value whichever mode the page was
  in; that value is the light theme's, bar two paper tunings named in the test
  with their reason (`--surface` and `--elevation-step`, because light's `0.995`
  ground leaves the elevation ladder no room above it and on paper the plates
  have to read as plates); the tunings are exactly those two; and nothing is
  restated that the dark theme does not take over.

  None of it counts entries or names the dials the block should hold. A dial
  added to the theme files at differing per-theme values is inside the first rule
  the day it is added, which is the one thing a count of thirteen could never do.

- 92b7f97: The derivation layer converges on the copy the deployment runs, and the surface
  hue is a dial rather than a leak.

  `styles/semantic.css` exists twice — once here and once in the deployment
  imported from this package — and the two copies had drifted 161 lines apart
  after the four authored knobs moved into the theme files. Most of that was
  prose, and prose is a real difference to a byte-for-byte drift gate. Two of the
  differences were not prose, and both are settled here.

  **The ink on the filled control flips on the fill's own lightness.** The
  deployment derived `--primary-foreground` from a per-theme constant, which
  produces near-black ink in both modes and is correct only for an accent that
  happens to be light in both. Measured across the accent range at that
  deployment's hue and chroma, the fixed ink falls to 3.19:1 at L 0.45 and 1.11:1
  at L 0.15 — black text on a black button, failing silently, the same shape as
  the warm-grey surface defect. The flip this file already used holds above
  3.43:1 everywhere and is now the mechanism on both sides. Its own weak point,
  accepted rather than hidden, is that 3.43:1 at L 0.60, just under the
  threshold: clear of the 3:1 floor for UI and large text, short of 4.5:1 for
  body. The comment beside the derivation says so.

  **`--surface-hue` is declared in `styles/themes/dark.css`, and the default in
  `styles/semantic.css` is gone.** The dark theme did not restate the dial, and
  what that MEANT was already the warm `34` from the light file — its selector
  list opens on a bare `:root`, so with nothing later to take it back the dark
  surfaces ran on light's hue, and semantic.css's `var(--hue)` default could
  never win under either theme. Writing `34` down in the dark file changes
  nothing about what renders and turns that leak into a decision; the unreachable
  default then has nothing to defend and goes. Every custom property declared
  under `styles/` was resolved in both themes before and after through
  `tokenModel.resolveValue`: 628 names, zero moved.

  The file also gains the annotation chrome's ink ladder — ten rungs of the same
  absolute white the canvas annotation layer already spells at nine alphas, plus
  the plate's own backing — so that a strength on that bar has a name to be
  reached by. Nothing consumes them here yet; moving the call sites onto them is
  its own change.

  `styles/tokens.test.ts` counts `--surface-hue` among the dials that must be
  declared in both theme files and resolve to a number in each. It is not among
  the mode-invariant ones: a theme picks the neutral ramp's hue, and two themes
  may pick differently.

  `lib/tokenModel.test.ts` restates its liveness example as a property.
  `--colors-white` was the whole example of a name a stylesheet-only scan would
  call dead, and the ink ladder now reads it from a stylesheet; the rule now
  asserts that some declared name is read from source and from no stylesheet,
  which is the fact that was ever load-bearing and survives the next ladder.

- bd8617d: The same-column detour test cites no issue number, so it can be held identical
  across both repositories that read it.

  Its header opened by citing a bare number for the arrowhead bug it was written
  for. That number addresses a different ticket in each repository — here it
  belongs to the release tooling — and the deployment's drift gate refused to
  enrol the file for exactly that reason. The engine the file tests is enrolled,
  so the implementation was held to one copy while the test pinning its head
  direction was not, and could drift.

  The citation is replaced by what it stood for, named in prose: the bug where a
  detoured connector's head pointed the wrong way, measured at eleven arrows on
  one board of a deployment built on this template. Comment-only; the test's
  behaviour is unchanged.

## 1.12.5

### Patch Changes

- 34e8200: A detoured same-column arrow stops pointing its head backward along the time axis.

  Two cells in one step column but different lanes are joined by a vertical
  connector. When another card sits between them the straight run would strike
  through that card's text, so the route brackets out through a column gutter
  instead: out of one card's side, along the gutter, and back into the other
  card's matching side.

  Which gutter it took was decided by reach — the nearer one won. That meant the
  head's direction was decided by reach too. A side-on arrival out of the RIGHT
  gutter draws its last stub leftward, and the markers are `orient="auto"`, so
  the head followed that stub and pointed backward along a grid whose one
  ordering claim is that time runs left to right. A same-step connector does not
  move in time at all, so that head was a plain lie about the dependency. It was
  also inconsistent with the connector's own undetoured form, which ends
  vertically with the head pointing down or up. Measured on one board of a
  deployment built on this template: eleven arrows ended with a leftward final
  segment, on a path containing no backward dependencies whatsoever.

  An arriving end now turns back into its card VERTICALLY where there is room —
  onto the edge facing the other cell first, so the head reads exactly as the
  undetoured connector's does, and onto the far edge as a second chance, where a
  head pointing the other way up still says nothing false about a horizontal
  ordering. A departing end carries no head and still leaves side-on, which is
  what made this route preferable to leaving through an edge another card leans
  against.

  Where both horizontal edges are walled in, the arrival falls back to the side
  entry it always used, and the gutter preference changes to make that fallback
  safe: the LEFT gutter now wins outright rather than the nearer one, because its
  stub always travels forward. The nearer gutter was at most a fraction of a
  column gap closer.

  The new legs are swept for clearance as they will actually be drawn.
  `isSameColumnSideRouteClear` only ever covered the mid-height stubs and the
  stretch of gutter between them, and a vertical arrival leaves the gutter
  somewhere else — an arrival on the far edge leaves it beyond the pair
  altogether. When that sweep is not clear the pair falls back to the two side
  stubs, which the route's own test does cover.

  With both ends side-on the path is the one this builder has always drawn, point
  for point, and the undetoured vertical connector is untouched.

  **This is a narrowing, not a proof.** Where the right gutter is the only route
  and both horizontal edges are walled, the fallback still draws a backward head:
  six connectors in the golden geometry snapshot end that way, all in the
  `integrated` view mode, in S3, S5 and two each in S6 and S10. They passed
  before this change and pass after it — the snapshot was never in its scope.
  Refusing to draw them was tried and rejected, because it removes the six
  arrows along with the six heads, and a plain A→B→C chain silently losing both
  its connectors is worse than a head that leans the wrong way. Giving a walled
  cell somewhere to land is issue #250.

- 1639de9: The radius dial is declared in both theme files, not one.

  `--radius` was declared in `styles/themes/light.css` and nowhere else. It
  reached dark mode anyway, because that file's selector list opens on a bare
  `:root`: everything in it applies under `.dark` too, and dark never took it
  back. The corner radius was therefore correct in both modes for a reason
  nobody wrote down, and one that reads the same as a mistake.

  The same mechanism has already shipped a defect here. `--surface-hue` is
  declared only in the light file, so the warm `34` it carries is what every dark
  surface runs on — invisible today because `--chroma` is `0` and every surface
  is an exact grey whatever the hue says, and documented in
  `styles/themes/dark.css` only after `tokenModel.resolveValue` corrected the
  claim the comment there used to make. A mode-invariant value parked in the
  leaky spot is the next one of those waiting to happen: it looks deliberate
  from the light file and is unreadable from the dark one.

  `styles/themes/dark.css` now declares `--radius: 0.625rem`, the value the light
  file has always carried, so both files answer the question and the selector's
  behaviour stops mattering for it. That is the rule `--hue` already follows — it
  is stated identically in both files, and both say in a comment that it is
  mode-invariant. Nothing about what renders changes: radius resolves to
  `0.625rem` in either theme, before and after, and print is untouched because
  `styles/print.css` restates thirteen dials and radius is not among them.

  `styles/tokens.test.ts` gains the invariant behind that arrangement. A
  mode-invariant dial is one whose own theme file wins in its own theme — so
  removing `--radius` from either file fails, because the survivor would then be
  leaking across to cover for the missing one, which is the arrangement the rule
  exists to forbid — and the two declarations must resolve to the same value.
  `--hue` and `--radius` are the two named today, and a third is a string. It
  replaces an assertion that only asked whether light declared radius at the
  root, which the leak satisfied.

## 1.12.4

### Patch Changes

- 8ef645f: Shared files cite no repo-local identity: 116 issue, ADR, migration, docs-path
  and plan citations across 62 files are replaced by what they were standing in
  for. `erdValueSets` no longer defaults its `source` to one repository's ERD path.

## 1.12.3

### Patch Changes

- 5ae8d0f: The cancellation block that never reached our cancellation is removed.

  `readLifetime.test.ts` had a `query cancellation` block, and it tested nothing
  of ours. It built a raw `QueryObserver` with a `queryFn` of its own, so what it
  asserted was that TanStack aborts the signals it hands out — a library
  guarantee, held whether or not `useSupabaseQuery` passes one on. Reverting the
  read-lifetime port leaves all eleven cases in that file green while the two in
  `useSupabaseQuery.test.tsx` fail on `seen?.aborted`, which is the difference
  between a test that reads as covered and one that is.

  Two cases are deleted and nothing replaces them here: both properties — the
  consumer that leaves, and the read superseded by a key change — are already
  asserted through the hook in `useSupabaseQuery.test.tsx`, where taking the
  signal away makes them fail. Rewriting them against the hook would have been a
  second copy of that file, which is its own defect.

  The rest of `readLifetime.test.ts` is untouched and still bites: the deadline
  that aborts the request it bounded, the timer that does not outlive the answer,
  the caller's own cancellation, the one retry a timeout is worth, and the cache
  retention. Both file headers now say which file owns cancellation, so neither
  claims TanStack's guarantee as ours.

- 430f60c: A shared file names the catalog decision instead of numbering it, so
  `useStakeholders.ts` can be byte-identical in a deployment that numbers the
  same ADR differently.
- 3ce29fb: The lane roster gets its reader, and the jargon lint stops naming a retired
  role.

  `BLUEPRINT_LANE_ROLES` was exported and read by nothing, beside a palette test
  that retyped the role-to-family pairs by hand. The pairs are now read off the
  `[data-blueprint-lane]` rules, so what is measured is what is drawn, and the
  completeness check in `palette.test.ts` compares the selectors it parsed
  against the exported roster rather than counting them — for touchpoint tones as
  well as lanes. A count of nine cannot tell nine roles apart from nine typos; a
  selector renamed out of the vocabulary now fails instead of quietly rendering
  an unstyled row.

  `skills/audit/references/check-jargon-lint.md` told a model auditing someone's
  blueprint that `journey_stage` labels render as headers. `journey_stage` is not
  one of the eight roles `lanes_lane_role_check` admits, and the thing that
  renders as a header is a phase. The note now says so, and adds what the file
  left out: a phase is not a lane, so the lane-role test in the next sentence
  does not reach one.

  The bump is a patch. Nothing here renames a skill, a reference filename, a
  schema filename, an agent, a hook event or an agent tool — the identifier lane
  semver is scoped to. `check-jargon-lint.md` keeps its name and its place; only
  what it says has changed, and a reference document's content is not part of
  that contract.

## 1.12.2

### Patch Changes

- b0e9d12: A read that outlives the thing that wanted it is cancelled, not merely ignored.

  `useSupabaseQuery` now hands its fetcher an abort signal alongside the client,
  and every read passes it to the request (`.abortSignal(signal)`). Leaving a
  view, or changing a query's key, ends the request it started instead of leaving
  it on the wire to arrive, be parsed, and be dropped — on the connection that
  was already too slow, which is the connection that could least afford it.

  The deadline underneath changed shape to make that possible.
  `raceSupabaseQuery` was a `Promise.race` between the request and a timer, and
  racing only decides which answer the caller sees: the loser stayed in flight,
  and nothing cleared the timer, so a request answered in 200ms still held a
  ten-second one. `withSupabaseTimeout` runs the read under a real deadline,
  aborts it when the deadline passes, chains in the caller's own cancellation,
  and clears up after itself. It throws a named `SupabaseTimeoutError`, which is
  what lets `queryClient` tell "this attempt was too slow" — worth one more —
  from "the database said no", which would answer the same however often it is
  asked and is still not retried.

  `awaitOrAbort` covers the one read that cannot take a signal.
  `findFirstServiceId` shares one in-flight promise between callers, so
  cancelling it would cancel the lookup everyone else is awaiting; wrapping the
  _wait_ rather than the _lookup_ lets a caller stop waiting without stopping the
  request. Without it the deadline aborted a controller the shared request never
  saw, and a read that was supposed to be bounded sat in `loading` until the
  network answered.

  The tests assert the behaviour, not the plumbing. That a fetcher is handed an
  `AbortSignal` is a fact its type already states; that abandoning the read ENDS
  it is the thing worth failing on, so every fetcher in
  `useSupabaseQuery.test.tsx` answers only when it is cancelled — against a
  wrapper that hands it nothing, the read hangs and the case reports that the
  abandoned request was never cancelled. `readLifetime.test.ts` covers the pieces
  underneath and `service.test.ts` covers `awaitOrAbort`.

  Six hooks — `useEvidence`, `useScenarioPaths`, `useScenarioSpec`,
  `useSliceScenarioId`, `usePhaseSpec` and `useStepSpec` — differed from their
  copies in the deployment this kit was generalised from by this and nothing
  else, and are now byte-identical to them. Four more (`useOwnerTags`,
  `useLaneSpec`, `useStakeholders`, `useCellDeepLink`) are down to prose written
  in that deployment's vocabulary, which is the one class of difference where
  this side is the general one and the fix belongs on the other.
  `useArchiveAvailable` and `useServicePhases` keep their own forks: the archive
  probe names the relation this template's schema actually carries, and the
  service resolution moves as one coordinated switch across several fetchers or
  not at all.

  `references/adapter-contract.md` says deadline rather than race, and asks a
  replacement backend to accept a cancelled request rather than complete it.
  Nothing here touches a skill name, reference filename, schema filename, agent
  name, hook event or agent tool name, so it is a patch.

## 1.12.1

### Patch Changes

- 79d8cf7: A cell's status is editable from the panel, and its revert restores it.

  `StatusSelect` has been in this tree for a while with nothing wired to it. The
  control existed, `entityStatus.ts` held the six-rung ladder, `cells.status`
  carried the value, the board drew the dashed edge for an unbuilt cell — and the
  one governed vocabulary on the board was still the one thing an author could
  not set. The panel's cell form now carries a Status field between Summary and
  the owner pair, which is where the reference table already said it belonged.

  `CellContentUpdate` gains `status`, and it is required rather than optional
  because `previous` is that same type: `updateCellContent` records `previous` as
  the change's inverse, `executeRevert` replays it as an ordinary update, and a
  `previous` missing one field is a revert that restores four and reports "taken
  back" — a write that succeeded and did less than it claimed, which is the one
  failure the ledger's row-count guard cannot see. Required makes omitting it a
  compile error. `cellPanelEditorStatus.test.tsx` asserts the whole inverse, not
  just its new key: the status in it has to be the one the cell held when the
  form opened.

  No migration. `cells.status` and its `grant update (status) ... to
authenticated` both landed with `21000125000000`, whose comment names "the
  three columns the editors that follow will write" — this is one of those
  editors arriving.

  The editor reads the status off the board rather than off `useCellContent`. The
  board query already selects the column, the normalizer already maps it and
  `entityStatusContract.test.ts` already holds both of those true, so the value is
  in memory before the panel opens and a second per-cell read would pay a
  round-trip for it. Where the board does not hold the cell there is no row to
  read anywhere — the sample-content board, where the editor renders nothing for
  an existing cell — and the fallback is the column's own default rather than a
  guess.

  The agent's `update_cell` reads `status` and hands it straight back. The tool
  takes no status argument and this does not give it one: an edit to a cell's
  wording that quietly marked a proposed surface live would be the sentence the
  agent never said out loud. Widening the tool is a separate decision about the
  agent's surface, and would be the change that moves the version — this one
  touches no skill name, reference filename, schema filename, agent name, hook
  event or tool name, so it is a patch.

- 3fb7818: The default deployment config inlines nothing, so a deployment forks one small
  file instead of a large one.

  `asbDefaultConfig` read its wordmark from a constant and omitted the accent
  entirely, which meant an installation wanting either had to fork
  `src/deploymentConfig.ts` — a module whose resolver, merge rules and reasoning
  it has no quarrel with. `src/config.ts` now carries a `Brand` type and a `BRAND`
  constant beside `ORG_NAME`, and the default reads `{ brand: { name: ORG_NAME,
accent: BRAND.accent }, content: { workspaceTitle: coverContent.title } }`. The
  file to fork is the small one that already exists to be forked.

  Nothing repaints. `coverContent.ts` omits `title` on purpose and `BRAND` ships
  no accent — this kit's `--brand-*` ramp is greyscale, so there is no hue for one
  to be — and both `present()` and `applyBrandAccent` treat an absent value as
  nothing to say. The wordmark still resolves to `ORG_NAME`, which the rendered
  navbar and the whole-app render both assert.

  `applyBrandAccent` takes the shared `Brand` and defaults the block to `BRAND`,
  so a host's bootstrap can set the dial before React exists. The module had no
  test; it has one, and the first assertion is that this template writes no dial
  at all.

- d017da6: Three of the twelve differing hooks converge, and the other nine are held by
  three named things rather than by drift.

  Twelve files under `src/hooks/` differ from their copies in the deployment this
  kit was generalised from by fewer than twenty lines each, which reads like
  drift. It is not. Roughly eighty of those hundred-odd lines are a single
  unported feature appearing once per file, and most of the rest are differences
  that cannot converge at all while they stay where they are.

  **What converged.**

  `useScenarioPaths.ts` the embedded-resource alias goes.
  `scenario:scenarios(name)` and `scenarios(name)`
  fetch the same row through the same embed, and the
  alias only renamed a key this file casts anyway.
  Every other hook that embeds a parent names the
  relation plainly.
  `useSliceScenarioId.ts` the cache key is sorted before it is joined. The
  lookup is `.in('id', …)`, which answers the same
  scenario for any permutation of the same ids, so
  reordering a slice's frames used to mint a fresh
  key for an answer already held — a round trip, and
  a second entry kept beside the first. `sliceScenarioKey`
  is exported, as it is there.
  `useServicePhases.ts` a doubled word, with three more of the same
  artefact fixed alongside it in `useSlices.ts`,
  `lib/service.ts` and `CreateSliceSheet.tsx`. The
  journey-to-service rename replaced the word in a
  phrase that already carried it, and one of the four
  is an error message a slice author can hit.

  **What holds the other nine, in three groups.**

  _The read lifetime._ Every one of the twelve passes an abort signal into its
  request — `async (client, signal)` and `.abortSignal(signal)` — because there
  the query wrapper hands the fetcher one. Here it does not. That contract is
  `useSupabaseQuery.ts` plus `lib/supabaseFetchTimeout.ts` (a `Promise.race`
  becomes a real deadline that aborts the request it bounds, and a named timeout
  error), `lib/queryClient.ts` (which retries that error and not the others),
  `lib/service.ts` (`awaitOrAbort`, so a caller can stop waiting on a shared
  lookup without cancelling it for everyone else) and `useCanvasBlueprints.ts` —
  six files, none of them in this cluster, two of them fifty lines apart on their
  own account. It is its own piece of work and wants its own ticket; until it
  lands, no hook in this cluster can be byte-identical, which is why three of the
  twelve converged and not twelve.

  _Prose written in a deployment's vocabulary._ `useOwnerTags.ts`,
  `useLaneSpec.ts` and `useStakeholders.ts` illustrate their arguments with that
  deployment's own party names, and `useCellDeepLink.ts` describes its share link
  in terms of that deployment's bot, channel and documentation path. This side is
  the general one and should stay so — the fix is on the other side, and it is
  the only class of difference here where the template is ahead. `useStakeholders.ts`
  also cites the catalog decision by number, which is ADR 3 here and a different
  number there; a citation that cannot mean the same thing in both copies has to
  be the template's number in both, or not a number at all.

  _A schema this template does not have._ `useArchiveAvailable.ts` probes for the
  recovery archive before any delete affordance ships. The probe names
  `deleted_structure` here because that is the table `portable-core.schema.sql`
  carries and the one the delete functions write to; there it names a `trash`
  view over an authoring-change log that replaced it. Taking the newer name would
  make the probe answer no on every database this template can build, which is
  the exact failure the hook exists to prevent. It converges when the migration
  does, and not before.

  `useEvidence.ts`, `useScenarioSpec.ts`, `usePhaseSpec.ts` and `useStepSpec.ts`
  differ in nothing except the abort signal, so they converge in full the day the
  read lifetime does.

## 1.12.0

### Minor Changes

- 7757f0e: The App is mountable: `App({ config })` and a typed `DeploymentConfig`.

  A deployment of this template mounts the whole app rather than forking it:
  `import { App } from 'agentic-service-blueprinting'` and render it with a
  `DeploymentConfig` — `brand` (name, logo, accent), `content` (workspace and
  cover titles) and a reserved `agent` section. Missing keys resolve to the
  template's own defaults, so a config of `{}` is the standalone app, and the
  resolved config never aliases the host's object.

  The default export and the standalone entry are unchanged; the named export
  is additive. `package.json` gains an `exports` map — `.` (with a `types`
  condition), `./styles.css` for the stylesheet the host imports, and a `./*`
  wildcard so every deep path a skill or script already resolves keeps
  resolving.

  Consumed as source for now: a git install, resolved by a bundler that
  understands this repo's `@/` alias and Vite's `import.meta.env` and `?raw`.
  A built distribution that has resolved those at build time is the follow-up.

- 7757f0e: The two declared fork seams become configuration, and the App tree gains four
  things a deployment had been carrying alone.

  `STORAGE_PREFIX` was a constant a deployment edited in place; it is now an
  initialisation call, so the namespace is set rather than patched. Reference
  documents are a registry a deployment adds to rather than a list it respells,
  and the accent and the wordmark read the config — the wordmark through
  `content.workspaceTitle ?? brand.name ?? ORG_NAME`, so a workspace's own name
  can no longer end up on another service's board.

  The fourth question — whether mounting also needed a composition seam, since
  a config object cannot express a provider tree — is answered no. The four
  providers a deployment had been carrying were not deployment-shaped:

  - the slug now resolves to a service and the URL says which one. The route
    parser, the store and the resolver were already here; nothing closed them.
  - a comparison built in one scenario no longer follows the reader into the
    next.
  - a write that did not land says so. All four failing write paths ended in a
    `console.error` and read to the user as success.
  - the provider tree writes down its own order, in bands — a band may read the
    bands outside it, never the ones inside — with the three forced edges named
    individually. The write-failure notices sit outside the error boundary on
    purpose, and a test reads the source to keep them there.

  `App({ config })` is therefore sufficient, and no extension point was added
  for a difference that was not one.

### Patch Changes

- 9ef7112: A partner lane is drawn as a partner lane, and the fill map stops disagreeing
  with the constraint.

  `ROLE_STYLES` carried `journey_stage` and `physical_evidence`, neither of which
  `lanes_lane_role_check` admits, and had no fill for `partner_actions`, which it
  does. So a partner lane fell through to a zone fallback — and both fallbacks are
  the support fill, which is why a party outside the service was drawn as one of
  its own support teams.

  There is now a ninth lane fill, `partner-action`, on the gray family: the only
  one neither a lane, a touchpoint tone nor a path draws from. It states all seven
  cell state properties and is measured for contrast in both themes like every
  other fill.

  `ROLE_STYLES` was the fourth copy of the lane-role roster and the only one
  nothing held. `scripts/tests/lane-role-roster.test.mjs` now holds it too, by set
  equality, so a dead key and a missing canonical role both fail.

## 1.11.0

### Minor Changes

- 13be7b2: The cell-detail panel takes one lane resolution and a real placement editor.

  Three lookups become one `laneResolution`; the panel gains an identity block, a
  labelled Touchpoint field with its role badge, and a labelled Summary in place of
  bare prose held up by a negative margin. `hasRealPlacement` widens, and a defect
  came out with it: the old resolution set `backgroundColor` to a role key rather
  than a colour, so the new-cell badge had rendered untinted since it shipped.

  The editor gains the placement block — summary, role, resources and re-link —
  with the save order after `sync_cell_touchpoints`, now pinned by a test.
  `updateTouchpointPlacement`, `updatePlacementResources` and `setFeaturedResource`
  had been here with no caller at all: writable only by a revert.

  The vendor-specific preview affordance is gone, along with the synthetic row it
  put in the resources tab, and `blueprintTechDescriptions.ts` with its last
  caller.

  The merged compare grid and the path band converge, and
  `buildComparePathShortLabels` retires — dead in both repositories, with a
  contract test already asserting the grid uses full path names.

  One accessibility fix rides along: `BlueprintStepStoryboardProps` never declared
  `aria-describedby` though its caller passes one, and TypeScript does not
  excess-property-check hyphenated JSX attributes, so a storyboard cell in a merged
  grid had never announced its path membership.

## 1.10.0

### Minor Changes

- 26b9095: A rename moves the word in every cell, and the registry gains its first writer.

  The registry has been readable since `21000120000000` and writable in every way
  but one: nothing could change what a touchpoint is CALLED. This adds the write,
  and the reason it is a database function rather than a loop in the client is
  the defect that comes with it.

  `cells.content` is the list of names an author types, and a content save
  re-derives placements from that text. Move the registry row alone and the next
  edit to any affected cell hands `sync_cell_touchpoints` the stale name: the
  renamed placement is not wanted, its registry link is taken away, and a fresh
  entry appears under the old name in its stead. The rename undoes itself one
  save later, which is the drift this package exists to end, arrived at from the
  other direction.

  `21000202000000` adds two functions. `rename_content_item(text, text, text)` is
  `immutable` and pure: it tokenises a delimited content string, keeping the
  delimiters, and replaces only the item that IS the old name — so renaming
  `Zoom` leaves `Zoom Recording` untouched, and the author's spacing survives
  verbatim. `rename_touchpoint(uuid, text)` moves the registry row and every
  bearing cell's text in one transaction, decides WHICH cells from the placements
  rather than from a text search, and refuses to finish if any bearing cell still
  names the old value. It returns the previous name and the cells it rewrote, so
  the caller can record an inverse that restores both halves. Both are
  `security definer` behind `is_service_account()` and granted to
  `authenticated` only, the same posture as every other placement function.

  `src/lib/touchpointMutations.ts` is the client half, ported from a deployment
  built on this template, where both halves have been live since 2026-08-30. It
  carries `renameTouchpoint` and, for
  the other scope of the same subject, `updateTouchpointPlacement` — what an
  author has to say about a tool AT ONE CELL. That writer needs
  `update (summary)` on `cell_touchpoints`, which `21000119000000` granted for
  `role` and for nothing else; the grant lands in the same migration as the
  writer, because a write surface with no writer is a row every posture check has
  to account for before any mutation touches the column.
  `cell_touchpoints_update_service_only` still stands over it, so this widens
  which COLUMN an author may write and not who may write one.

  The placement write UPDATES and can never insert, which is what keeps it from
  routing around the touchpoint-bearing gate inside `sync_cell_touchpoints`, and
  its inverse is captured as column values rather than as form strings, so an
  undo can reach imported data an input validator would refuse.

  `rename_touchpoint` and `update_touchpoint_placement` join `WriteFn`, and
  `restore_touchpoint_placement` joins the revert. `touchpointRename.test.ts`
  ports both functions into a model and opens with a RED case that drives it with
  a registry-only rename, so the tests that follow cannot be passing against a
  model unable to exhibit the bug.

- c6506bb: The editor shell and the touchpoint tone converge.

  `EditorShell.tsx` is byte-identical with the deployment it was generalised from
  for the first time since the fork: the aside model is in flow at every width,
  `railOnly` is `asideHidden`, the sidebar carries a `collapsedByReader` binding,
  and `onToggleAgent` is split from `onSelectPanel`. `shellContext.ts` arrives with
  `describeSidebar`, a second error boundary wraps the active tab, the collapsed
  navbar gains a path selector, and `sidebarCollapsedContext` is guarded by a
  per-mount owner identity.

  The mobile canvas question had two answers here and neither covered what the
  other did — one gate withheld the phase frame's opener while a second
  `useMobileShell()` ran for the scenario panels. There is one gate now, at the
  view, travelling down as an optional prop, and the contract test asserts the
  overview holds no `useMobileShell` at all.

  A touchpoint carries its tone and answers to more than one name:
  `touchpoints.tone`, `touchpoints.aliases` and `scenarios.note` arrive as
  columns, and the colour resolver that reads them — registry, then a generic
  seed, then a deterministic hash — is now one file shared with the deployment.

### Patch Changes

- c6506bb: Four of the agent loop's smaller files converge, and the tool lane stops being
  a layer.

  `attachments.ts`, `role.md`, `sessions.ts` and `providers/openai.ts` are
  byte-identical with the deployment. `layer` was the retired spelling in both
  repositories' vocabulary lists and this one already said "tool lane" elsewhere,
  so that was internal drift rather than a fork.

  `sessions.ts`'s comment now carries both repositories' reasons for reading the
  session store rather than the table — the security history one side remembers
  and the no-database case the other does — each stated without naming a column,
  because the schemas fork there.

## 1.9.0

### Minor Changes

- 2facf2e: A lane role is refused where the author can still fix it, not by a constraint
  mid-import.

  Two documents in this repository said opposite things, and both said them
  deliberately. `references/ir-schema.json` and `scripts/validate_ir.py` took any
  lane role matching `^[a-z0-9][a-z0-9_]*$` — the schema is an authoring contract
  and did not want to be a taxonomy. `references/lane-roles.md` and the
  `lanes_lane_role_check` constraint closed the set at eight. So a document
  validated and was then refused on import, and the refusal arrived as a Postgres
  constraint violation rather than as anything the authoring tools had said
  (#204):

                                                                                  ERROR: new row for relation "lanes" violates check constraint
                                                                                  "lanes_lane_role_check" … compliance_review

  That error at least names the value. Meeting it after validation has passed is
  the wrong moment.

  **The schema closes.** Of the three answers — close the schema, open the
  constraint, or document the gap and live with it — closing is the one the rest
  of this repository already assumes. The constraint, the `lanes.lane_role`
  column comment, `docs/erd.mmd` and `references/lane-roles.md` all state the set
  as closed; `lane_role` is read as exhaustive by code that switches on it, so
  opening the column would have meant auditing every such reader for a value none
  had ever seen. Closing costs one bump and a step.
  `references/ir-schema.json` now carries the eight as an `enum` on
  `$defs/lane.properties.role`, `null` included, and `scripts/validate_ir.py`
  errors on a ninth with the offending value, the lane carrying it, all eight
  legal values and the fact that `null` is the answer for a lane none of them
  names.

  **⚠ BREAKING for anyone holding an IR file with a role outside the eight.** IR
  schema version `2026.09.10`, and `python3 scripts/migrate_ir.py <ir-file>
--workspace blueprint-workspace.json --write` carries a document across it.
  `to_2026_09_10` nulls a role outside the set — the generic swimlane it already
  drew as, no style of its own and no divider anchored on it, which is also the
  answer `21000122000000` gave the rows it found. The lane's `display_name` is
  untouched, and that is what makes this a reclassification rather than a
  deletion: the meaning of a compliance lane lives in the name a reader sees, and
  the role only ever said what the renderer must do about the row. A role is
  authored content inside a scenario's subtree, so the step is **not
  content-preserving** — the third, after the edge turnaround at `2026.09.01` and
  the rename at `2026.09.08`. Watched per scenario as those are: a scenario
  holding a nulled role keeps its recorded hash and reads as stale until someone
  re-signs it, and a document carrying none — which is every document a target
  ever accepted — hashes identically and re-anchors.

  No migration stamps `2026.09.10`, and none needs to: nothing in the database
  changed, and a target sitting at `2026.09.08` is still one this checkout
  speaks. `2026.09.09` set that precedent — a wire-format bump with no DDL behind
  it — and this is the second.

  **The eight now live in four places, and something holds them together.** The
  authority is `lanes_lane_role_check` in `supabase/generated/portable-core.schema.sql`.
  JSON Schema cannot import a list and neither can a stdlib-only Python script,
  so closing the schema made two more copies of the roster — and a duplicated
  list with nothing holding it is exactly how this drift started.
  `scripts/tests/lane-role-roster.test.mjs` compares the enum in
  `references/ir-schema.json`, `CANONICAL_ROLES` in `scripts/validate_ir.py` and
  `CANONICAL_LANE_ROLES` in `src/lib/laneRoles.ts` to the constraint, set for
  set, off the committed dump — so it runs on every pull request with no
  database, beside the ERD sweep that already holds `docs/erd.mmd` the same way.

  `to_2026_09_08` parked this question on purpose and is unchanged; its docstring
  now records where the answer landed instead of pointing at an open one.

  What moved with it:

  `references/ir-schema.json` the role `enum`; `2026.09.10` at the
  head of the version enum
  `scripts/validate_ir.py` a ninth role is an error, not a
  silent pass; the closed set is
  documented where the file states what
  it checks
  `scripts/migrate_ir.py` `to_2026_09_10`, the carry
  `src/lib/backend/schemaVersion.ts` `2026.09.10` supported and spoken
  `references/lane-roles.md` says authoring refuses a ninth, and
  § Adding a role lists the multi-file
  act that adds one
  `references/customization.md` § Lane roles no longer advises minting
  an org-defined role
  `skills/map/…/translate-playbook.md` a foreign lane the eight do not name
  maps to `null`, keeping its own label
  `skills/map/…/crosswalk-schema.json` the `custom_role` disposition is
  `generic_lane`
  `skills/map/…/elicitation-protocol.md` non-spine actors get `null`

  Proven by `scripts/tests/run_tests.sh`: `validator-bad4` asserts the refusal,
  `validator-bad4-message` asserts the message says everything the author needs
  to fix it without opening another document, and § 8c carries a `2026.09.07`
  document holding five retired spellings AND one role from outside the set —
  the first five renamed by `to_2026_09_08`, the sixth nulled by
  `to_2026_09_10`, its display name intact.

- 504684a: A touchpoint names its owner.

  `21000131000000` made the touchpoint registry the deployment's and wrote its own
  promissory note in the header: "A touchpoint will carry a `stakeholder_id` — its
  owner. […] The link waits for both ends to be the deployment's, and after this
  file they are." Both ends are, so `21000201000000` adds the link.

  `touchpoints.stakeholder_id` is a nullable `uuid` referencing
  `public.stakeholders (id)`, with `touchpoints_stakeholder_id_idx` beside it and
  `update (stakeholder_id)` granted to `authenticated` in the recipe half. Null is
  the ordinary state, not a gap: `sync_cell_touchpoints` mints a registry row from
  a cell's text with no owner at all, and "nobody has said yet" is what that row
  means.

  The delete action is `set null`, which is where this file deliberately parts
  company with the deployment it generalises. The deployment writes the reference
  with no delete action — NO ACTION, so removing an actor who owns a touchpoint is
  refused — while `lanes.stakeholder_id` in `21000125000000` already committed
  this template to the opposite rule, in as many words: "an actor taken out of the
  cast un-names its lanes rather than pinning itself." Carrying the deployment's
  shape across would leave the cast holding two contradictory opinions about what
  deleting an actor means, un-naming lanes and refusing touchpoints in the same
  breath. One rule, applied to both things that reference the cast. The migration
  asserts the delete action rather than merely describing it, so the choice cannot
  quietly drift back.

  Nothing authored moves. An IR describes one service and has never had a field
  for who owns a tool, so `registryTouchpoint` is unchanged and the schema version
  stays where `21000122000000` left it — the stance `21000123000000`,
  `21000130000000` and `21000131000000` each took. Both seed generators write
  `(id, name, kind, summary, url, origin)` and are unaffected by a nullable column
  they do not name.

  The ERD, `references/data-model.md` and the Supabase connector's column table
  gain the column and the `stakeholders |o--o{ touchpoints` edge. While there,
  `references/data-model.md` loses a stale `services ||--o{ touchpoints : "registry"`
  edge that `21000131000000` should have taken with it when it dropped
  `touchpoints.service_id` — the ERD had already been corrected, and the two
  diagrams disagreed.

- de07cfc: The compare header row leaves the path frame, and the panel takes the
  deployment's fixes.

  `COMPARE_HEADER_WRAP_EXTRA_INSET` and its three call sites are gone: the
  step-header row stays outside the frame, visible, which is the settled answer to
  a question the layout had been carrying both ways. `ResizableComparePanel` gains
  a layout-effect measure, two state-identity bails, drag teardown on one pointer
  with `pointercancel` and unmount, a locked-only estimate floor and opacity-only
  dimming; `ScenarioBlueprintPanel` gains the memo split and a completion-aware
  jump summary. `MergedSectionFrame` takes the rail-outside geometry.

- de07cfc: The reference specifiers and the storage prefix become declared forks.

  Two things could never be the same in this kit and in an app built from it: where
  the agent's reference documents are resolved from, and the prefix on every
  localStorage key. Each is now a small module of its own —
  `src/lib/agent/tools/referenceDocs.ts` and `src/lib/storageNamespace.ts` — so the
  large files above them stop diverging over it. `read.ts` keeps its drift throw and
  its reader and knows nothing about resolution; every storage key is emitted by
  `storageKey(name)` and is byte-for-byte what it was, so nothing stored in a
  browser needs migrating.

  The extras array that adds a deployment's own reference document is a third leaf,
  `referenceNamesExtra.ts`, rather than living in `referenceDocs.ts`: the eval
  harnesses bundle `specs.ts` with rolldown rather than Vite, so there is no `?raw`
  loader on that path and one import would have broken `agent:harness`.

### Patch Changes

- cbc06fb: The last style guard takes the token model, and the widening finds what the
  shape predicts.

  `src/lib/tokenDiscipline.test.ts` was the one guard ADR 6 left on a reader of
  its own: it walked `src/components/**.tsx`, 185 files out of 399, so anything a
  class string said in `lib/`, `hooks/`, `contexts/`, `content/`, `types/` or
  `dev/` was outside every style rule in this repository. It reads
  `tokenModel` now, which means it reads the whole tree, and widening the sample
  once widens every rule that asks.

  Two defects were sitting in the unread part. `lib/filterToolbarButton.ts`
  carried `border-border/60` and `border-border/50` — the exact pattern the
  neutral-edge rule forbids, in a directory that rule did not look at; both
  states take the named `border-muted` rung now, which is tuned to land on the
  `/60` alpha, so the checked edge is pixel-identical. All twenty-seven hex
  matches in the tree are in `src/dev/`: twenty-one real colours in the dev-only
  `/proto/arrows` instrument, which Vite drops from a production build, and six
  `(#NNN)` issue references in fixture prose. Both files are exempted by name and
  with a reason, and a rule beside them fails if an exemption stops matching, so
  a dead carve-out cannot outlive the thing it excused.

  Three rules arrive with the conversion, and all three found call sites written
  against rungs `styles/theme.css` already declares — the sheet converged with
  the deployment's under #327 S3, so the vocabulary was there and nothing held
  anything to it. Nine bare `rounded` utilities (Tailwind hardcodes 4px there and
  `--radius` cannot reach it) take `rounded-sm`, which is the only one of the
  three that moves a pixel: `calc(var(--radius) - 4px)` against `--radius:
0.625rem` is 6px, so those nine corners round two pixels more and, unlike
  before, follow the dial when it turns. Five bracketed z-indexes take the bare
  integer Tailwind v4 wants, compiling to the identical `z-index`; and four
  font-size literals — `text-[8px]`, `text-[9px]`, `text-[2.5rem]` and
  `sm:text-[2.25rem]` — take `text-5xs`, `text-4xs`, `text-5xl` and
  `sm:text-4xl`, each compiling to the same size it replaced. The two
  `text-[0.8rem]` in `components/ui/` are exempt: `components.json` points the
  shadcn CLI at that directory, so a retune there is deleted by the next
  `npx shadcn add`.

  `stripComments` in `tokenModel` now blanks block comments instead of deleting
  them, and `tokenModel.test.ts` holds it to that. Deleting them collapsed every
  newline in a file's header, so every line number the model reported after it
  was wrong — `dev/ArrowSituationCatalogPage.tsx` opens with a thirteen-line
  header, and its `#2563eb` on line 28 was being reported at line 15, on an
  import. Nothing failed while it was wrong, because a passing rule reports no
  lines at all. A guard that names the wrong line is a guard someone stops
  trusting, and converting this file is what made it start naming lines.

## 1.8.1

### Patch Changes

- 77f5feb: A registry row's id is the deployment's, and its identity is its name.

  `scripts/generate_seed_sql.py` derived a registry row's id from
  `entity_uuid(locale, "registry-touchpoint", f"{service_key}#{name}")`. The
  service key was part of the input, so **two services minted two ids for one
  tool**. That was consistent while `unique (service_id, name)` gave each service
  its own row, and wrong the moment `21000131000000` made the catalog one
  deployment-level pool under `unique (name)`: seeding a second service into a
  target that already held the first was refused by `touchpoints_name_key`, in as
  many words (#201).

  **Two changes, and the second is the one that matters.** The derivation drops
  the service key, so a registry id is deployment-stable — the same identity the
  constraint asserts. And the seed stops treating that id as a lookup key: the
  registry upsert reconciles `on conflict (name)`, and a placement resolves its
  `touchpoint_id` by reading the row back rather than writing a derived id at it.
  A derived id is now only what a row that does not yet exist is **born** with.

  That is what makes two things true at once, and only the second needed working
  out. A second service's seed lands on the row that is already there instead of
  being refused — the model ADR 0003 states, which the seeder could not express.
  And a target seeded **before** the derivation changed stays idempotent: its
  rows keep the ids they were born with, and a re-import updates them in place.

  **No migration, and the reason is worth recording.** The issue proposed a
  migration to remap every existing registry id. It cannot be written. The old
  id is `uuid5(ns, f"{locale}:registry-touchpoint:{service_key}#{name}")`, and
  the database holds neither input: there is no `locale` column anywhere — the
  adapter contract says so under Per-locale artifacts — and the seed writes
  `services (id, name, summary)`, never the IR key the derivation used. A
  template migration could compute neither the id it must find nor the id it must
  write. Resolving by name needs neither, which is why it is the fix rather than
  a way around one.

  **What an import may overwrite.** It wins where it SAYS something and says
  nothing where it was merely minted: an entry the IR never listed arrives as
  kind `other` with no summary and no home — "nobody has judged this yet" rather
  than a judgement — so it does not erase what a curator, or another service's
  IR, already recorded under that name. The merge is `21000131000000`'s own, the
  one it used when it folded each service's rows into the shared pool.

  What moved with it:

  `scripts/generate_seed_sql.py` the derivation, the name-keyed upsert,
  `registry_lookup` and the `Sql` escape
  that lets one column be a subquery
  `references/adapter-contract.md` § 4 states the registry's identity rule
  and the merge, where a reader looking for
  idempotence will find it

  Proven against a local Postgres 17 on this template's own portable core. Two
  services whose IRs name the same tool now seed into one target and share one
  registry row, where the second used to be refused. A target seeded with the
  PRE-change generator then takes the post-change seed twice: one registry row,
  still carrying the id it was born with, one placement resolving to it, and an
  app-curated `kind` and `summary` intact across both runs.
  `scripts/tests/run_tests.sh` adds `seed-registry-id` — two services differing
  only in their key mint one registry id, and the locale is still in the
  derivation, so two locales in one target would not collide — and asserts on the
  emitted SQL that the registry upserts on the name and that no placement writes
  a derived id.

- 77f5feb: A schema version a migration stamps belongs in the list of versions this
  template speaks.

  `21000122000000` stamps a migrated database with `2026.09.08`, and so does the
  generated portable core. The value was never added to the enum in
  `references/ir-schema.json`, to `scripts/migrate_ir.py`, or to
  `src/lib/backend/schemaVersion.ts`. So a target that had run every migration in
  order read as INCOMPATIBLE to `scripts/check-target-schema.mjs` — a check
  written to catch a target that is BEHIND, failing the one that was exactly
  right, for two releases (#197).

  **The step is not an identity bump, and reading the migration is what settles
  it.** `21000122000000` closed `lanes.lane_role` to eight values with a CHECK
  constraint, renaming the roles it retired on the way in. The IR's
  `lanes[].role` IS that column: the schema field says `lanes.lane_role` in as
  many words, and `seed_lane_fields` writes the authored string straight into it
  with nothing in between that normalises anything. A document authored at
  `2026.09.07` may therefore carry a role by its retired spelling, and that
  document now meets a database that refuses the word. `to_2026_09_08` renames
  it — five pairs, transcribed from `scripts/retired-vocabulary.mjs`, which is
  the one list this repository keeps of what a retired word became:

  `frontstage_tech` → `frontstage_touchpoints`
  `backstage_tech` → `backstage_touchpoints`
  `support_systems` → `backstage_touchpoints`
  `visual` → `storyboard`
  `step_visual` → `storyboard`

  A lane's role is authored content inside a scenario's subtree, so the step
  declares itself **not content-preserving** — the second step ever to do so,
  after the edge turnaround at `2026.09.01`. That declaration is watched per
  scenario: a file carrying one of the five keeps its recorded sign-off hash and
  reads as stale until someone re-signs it, and a file carrying none of them
  hashes identically on both sides and re-anchors as usual. Most files are the
  second kind.

  **What the step deliberately does not do.** The migration also sets to null
  every role outside the closed eight, an adopter's own word included; it had to,
  because `add constraint` validates every existing row as it is added. A
  document being carried forward is under no such duress, and at the IR level a
  custom role is still legal — the schema admits any `^[a-z0-9][a-z0-9_]*$`, and
  `scripts/validate_ir.py` passes a role far from every canonical one in silence,
  on purpose. Nulling one here would delete authored content the validator had
  just blessed, and would settle by deletion a question nobody has asked: whether
  the IR closes the set the way the database does. A file that keeps a custom
  role is refused by the target's CHECK, loudly and with the value named, which
  is a better answer than a classification that quietly disappears.

  **Added, never moved.** The stamp sits inside an applied migration and inside
  the generated portable core, and an applied record keeps the spelling it was
  written with. `2026.09.09` stays where it is, so the chain now runs `.07` →
  `.08` → `.09` — ordered, continuous, and still a chain in which each step knows
  only its own predecessor.

  What moved with it:

  `references/ir-schema.json` `2026.09.08` in the enum, and the
  description states why it arrived late
  `scripts/migrate_ir.py` `RETIRED_LANE_ROLES` and
  `to_2026_09_08`; `to_2026_09_09` steps
  from `.08` and records what closed
  the hole it left
  `src/lib/backend/schemaVersion.ts` the version, with the reason
  `references/customization.md` § The versioning rule now records how
  the debt was paid, not only that it was
  owed

  Proven by `scripts/tests/run_tests.sh` § 8c (`migrate-lane-roles`): a
  `2026.09.07` document carrying one lane per retired spelling carries forward,
  validates, lands every role inside the closed set, and leaves the custom role
  beside them untouched. `scripts/tests/target-schema.test.mjs` adds the
  regression the issue was found by — a target reporting `2026.09.08` is
  compatible. `scripts/tests/run_tests.sh` § 8 asserts both hops of the chain
  rather than the one that used to skip.

- 6b8074b: Seven of the eleven non-theme stylesheets become one implementation, and the
  four that do not are all blocked by one thing.

  The deployment this kit was generalised from measures the same stylesheets
  through the same reader now that both repositories share `lib/tokenModel.ts`
  (ADR 0006). That is what made this checkable rather than hopeful: every sheet
  below was compared by what its declarations RESOLVE to at the root under each
  theme, before and after, and no name in either theme changed value.

  **What the template took, and why each was a gap rather than a preference.**

  `base.css` the mono seam, filled. `theme.css` has always read
  `var(--font-source-code-pro, …)` and this package has
  always shipped the face; nothing ever injected it, so
  the seam named in one file was answered in neither.
  `utilities.css` a reduced-motion branch for `delayed-appear`, which
  was the one animated surface in the tree with no
  reduced-motion answer.
  `unset-tw-colors.css` the reset list, corrected. `crimson`, `gold`,
  `tomato` and `scale` are our own family names and
  never Tailwind's, so those four lines cleared nothing
  while stating something false about the framework.
  `compat.css` the alias layer's rules, and one alias fewer:
  `--color-foreground-contrast` sat here at exactly the
  value `theme.css` registers, and `theme.css` imports
  later, so this file's copy could never win. It was not
  an alias at all.
  `animations.css` the `--ease-camera` key beside the `--motion-camera`
  duration that was already here, and the skeleton's
  breath — `animate-pulse` snaps between both extremes,
  which on a panel full of bars reads as flicker.
  `tailwind.config.css` three `@source not` lines. Tailwind scans every
  non-gitignored file from the project root, so a class
  named in a document, a test or a script generates that
  class — including, in a guard that lists the shapes it
  FORBIDS, the very vocabulary it exists to forbid.
  `theme.css` four type rungs the ladder was missing at both ends.

  **Two comments went the other way**, because the template's wording was the
  truer one for a file two repositories share: Ubuntu Sans is the _default_ face
  here, not a brand face, and a fork is told what to swap alongside it.

  **The tests came with the files they pin.** A shared implementation whose test
  stays behind is a shared implementation nobody holds to the same promise, so
  `tailwindColorReset.test.ts` and `compatLayer.test.ts` arrive too — the first
  reads Tailwind's own `theme.css` out of `node_modules` and holds the reset list
  against it in both directions, the second forbids an alias that carries a value
  and an alias shadowing a name `theme.css` already registers, which is what
  keeps the deletion above from coming back.

  `motion.test.ts` moved from a regex over one file to a question asked of the
  token model. Its selector pattern could not read `[data-slot='skeleton']` — it
  stopped at the hyphen and threw on the value — and a guard that names its own
  files only ever covers the surfaces that existed when it was written. It reads
  every stylesheet the entry imports now, so the next animated surface is covered
  wherever someone puts it. `motion.ts` gains `MOTION_CAMERA_EASE` to match.

  One census became an invariant: `tokenModel.test.ts` asserted that
  `unset-tw-colors.css` holds seventeen resets. WHICH families belong there is a
  question with an oracle — the framework's own theme file — and
  `tailwindColorReset.test.ts` now answers it, so the count is gone and the shape
  is what remains.

  **What did not converge, and the single reason three of the four share.**
  `colors.css` and `print.css` differ ONLY in per-deployment brand values —
  seven ramp steps written as literals rather than as indirections through the
  dials in `themes/`, and in `print.css` a block that must restate them because
  `themes/dark.css` sets its own copies with no `@media screen` around them.
  `semantic.css` differs in where three dials live, which is the same question
  seen from the other side. All three wait on the brand seam, which is settled
  separately and deliberately leaves `themes/*.css` each deployment's own.
  `blueprint.css` is the fourth, and it waits on work still open elsewhere plus a
  lane role the template's schema does not carry.

## 1.8.0

### Minor Changes

- 89cc073: A touchpoint belongs to the deployment, and a placement links to one inline.

  **⚠ A column is dropped. Apply `21000131000000` before generating a seed from
  this checkout.** `touchpoints.service_id` is gone and uniqueness moved from
  `(service_id, name)` to `(name)` across the whole deployment. The seed
  generators stop emitting the column, so a seed built here needs a target that
  has applied the migration — the ordinary rule that migrations land before the
  artifacts built from them, stated because this is the first drop the seed
  shape follows.

  This finishes ADR 0003 rather than reversing it. That ADR decided the catalog
  of nouns a journey references is one deployment-level pool and landed only the
  actors: `stakeholders` was born with no `service_id` in `21000125000000`, while
  `touchpoints` kept the service scope it was born with. The ADR's own
  consequences say the tools "make the same move in a later migration", and that
  the argument belongs in the file that drops the column. `21000131000000` is
  that file, and it carries the argument. `CONTEXT.md`'s touchpoint entry
  reverses with it, as that ADR said it would.

  The migration folds before it drops, which is the one place it differs from
  the deployment this template was generalised from. That deployment holds a
  single service, so `unique (service_id, name)` and `unique (name)` were already
  the same constraint over its rows and the column could go outright. A template
  cannot assume that: an adopter may hold several services, each with its own
  "Zoom" row. So every placement is repointed at the oldest row of its name, the
  survivor takes any description it was missing from the rows folding into it,
  and the rest are deleted — licensed by the rule the ADR states, that an
  identical name means the identical thing. On a single-service database the fold
  matches nothing.

  `sync_cell_touchpoints` and `set_placement_touchpoint` are rewritten from
  `pg_get_functiondef` rather than restated, so the three migrations that already
  edited those bodies cannot be reverted by hand; each replacement is asserted,
  and the finished body is swept for the word. The other three placement
  functions never named `service_id` and are untouched, and neither rewrite is
  re-granted — `create or replace` keeps a function's ACL, and the migration
  asserts that in the recipe half rather than re-stating it.

  What moved with it:

  `src/hooks/useRegistryTouchpoints.ts` the read is unscoped; the cell →
  path → scenario → phase join went
  with the column
  `src/types/database.ts` `service_id` off Row/Insert/Update,
  and the relationship it keyed
  `scripts/generate_seed_sql.py` mints a registry row with no service
  `scripts/generate_sample_blueprint.mjs` the same, and upserts the registry
  rather than letting a service delete
  cascade to it
  `scripts/check-seed-loads.mjs` `@registry` is the unscoped read the
  hook now makes
  `references/data-model.md`, the registry is one pool, unique by
  `docs/erd.mmd`, name across the deployment
  `docs/connectors/supabase/database.md`

  **A placement offers its own link to the registry.** `RegistryLinks` — one
  block listing a cell's name-only placements, each a bare select and two
  buttons — is replaced by `RegistryLink`, one card per placement, adopted from
  the deployment this template was generalised from. Two things come with it.
  The card names the placement it is about, so the sentence can say which name
  the registry lacks. And the list is filtered by the names the cell's text
  already shows: offering one of those produced a link the database refuses
  ("that cell already shows that touchpoint"), so the entry is left out of the
  list instead of failing on the click. The ledger write and its inverse were
  already in `src/lib/placementLinkMutations.ts` and are unchanged.

  `Registry` is a new panel label, so `scripts/interface-schema-map.mjs` binds it
  to `cell_touchpoints.touchpoint_id` — the same split `Actor` draws over
  `lanes.stakeholder_id`, where the label is the pool and the name is the pointer.

  The journey read is `list_scenarios` and stays that way. The deployment's queue
  settled the name against `list_blueprint`, which this repository never carried:
  `READ_TOOL_NAMES`, `TOOL_SPECS`, `identifiers.json` and
  `references/canvas-adapter.md` all already say `list_scenarios`, and
  `check:read-surface` holds the document to the set. Recorded here so the
  question is answered rather than open.

- a313930: One arrangement, one membership drawing, one cell face.

  **Components removed.** `SideBySideCompareGrid`, `CompareDivergenceStrip` and
  `CompareZoneBadge` are deleted. A fork that imports any of them, or that
  renders `ScenarioBlueprintPanel` with `fixedSwimlaneBodyHeight`, or that hands
  `ResizableComparePanel` a `chromeBar` / `chromeBarHeight`, has a compile error
  to fix rather than a silent behaviour change.

  **A scenario is one board, drawn at two sizes.** The overview used to lay each
  path out in its own narrow grid beside its siblings, and opening the scenario
  re-laid the same paths out as bands on one step axis. Now a tile is the board
  smaller: navigation changes framing, not topology. The swimlane-body height
  model existed only to make those two pictures agree inside a locked-height
  tile, so `expandRowSpecsToSwimlaneBodyHeight` goes with them and a phase row
  aligns on one panel height.

  **Merged membership reads in full.** A cell's member paths were marked with a
  colour wash and an invented two-letter code, which collided whenever two path
  names began with the same letter. They are a thin rounded outline on the
  cell's own face now — one arc per member path — with the full names disclosed
  on hover and on keyboard focus. `getPathWashStyle` is removed from
  `pathColorTheme`; `CompareCellPathRail` is now `CompareCellPathMembership` and
  has no `label`.

  **A cell face is a fixed size, and it shows its status.** Narrative cells no
  longer measure their own text to size themselves and their lane:
  `NARRATIVE_CELL_HEIGHT` is the canvas face and the complete prose lives in the
  detail panel. `TOUCHPOINT_ITEM_HEIGHT` grows to 52 / 42 so two label lines
  fit, storyboard rows to 176 / 168; `getTextBlockMinHeight` and
  `getMaxLineCountInLane` are deleted. A cell's `status` is threaded through the
  path band and the compare block, so an unbuilt cell stops rendering as a
  shipped one.

  **One name change a fork will see.** `isSupportHandoffLane` no longer falls
  back to the lane labels `Support Actions` and `Tech Support Actions` when a
  lane carries no role. A board whose lanes have roles is unaffected; a board
  relying on those two English labels should give those lanes the
  `support_actions` role, or add the mapping to `LEGACY_NAME_TO_ROLE`, which is
  the one declared place a name stands in for a role. `BLUEPRINT_INSERT_HIT_HALF`
  is now exported from `blueprintLayout` rather than declared privately in each
  of the two handle components.

## 1.7.0

### Minor Changes

- ef06086: An edge list is `dependencies`, in the wire format too.

  **⚠ BREAKING for anyone holding an IR file.** A path's `triggers` array is now
  its `dependencies`, at IR schema version `2026.09.09`. An IR authored against
  `2026.09.07` no longer validates and is refused by name;
  `python3 scripts/migrate_ir.py <ir-file> --workspace blueprint-workspace.json
--write` carries it across, in one hop, and re-anchors sign-off. The field is
  renamed in place, so the diff a reviewer reads is the one line whose name
  changed rather than everything below it. Nothing authored moves, so the step is
  content-preserving and every signed scenario re-anchors rather than de-signing.

  The word was settled in three estates and this is the third. The database has
  said `cell_dependencies` since `21000103000000`. The app's domain layer took
  `dependency` at 1.5.0 — `BlueprintData.dependencies`,
  `remapMergedPathDependencies`, and the prose around the arrows. The
  interchange format was the estate left over, which meant the retired word
  survived in exactly the file a person hand-edits (#159).

  What moved with it:

  `references/ir-schema.json` `path.triggers` → `path.dependencies`,
  `$defs/trigger` → `$defs/dependency`,
  and `2026.09.09` at the head of the enum
  `scripts/validate_ir.py` reads and reports the new name; the
  cross-path message says "edges"
  `scripts/generate_seed_sql.py` `seed_trigger_fields` →
  `seed_dependency_fields`
  `scripts/generate_fallbacks.py` follows the field function
  `scripts/adapter_parity.py` follows the field function
  `skills/slice/scripts/slice_tools.py` journey adjacency reads the new name
  `scripts/migrate_ir.py` `to_2026_09_09`, the carry
  `src/lib/backend/schemaVersion.ts` `2026.09.09` supported and spoken
  `references/adapter-contract.md` the parity claim names the new function

  `seed_dependency_fields` is a rename on a published surface: the adapter
  contract's parity claim names the two field functions, so a consumer that calls
  it changes one import.

  The UUIDv5 namespace label stays the string `"trigger"`. It is derivation
  input rather than vocabulary — changing it would give every existing edge a new
  id and stop a re-import being idempotent, which is the one property the
  derivation exists for. `generate_seed_sql.py` says so where it is used.

  `2026.09.08` is skipped, and it is spent rather than free: `21000122000000`
  stamps a migrated database with it for the lane-role vocabulary and never
  taught the IR enum or `migrate_ir.py` the value. Spending it here would give
  one stamp two shapes. Closing that gap means writing the lane-role step that
  migration never shipped, and `references/customization.md` § The versioning
  rule now records the debt where the rule is stated.

  Proven by `scripts/tests/run_tests.sh`: `migrate-triggers-refusal` asserts a
  document spelling the array `triggers` is refused with one error naming the
  upgrade, and `migrate-triggers` asserts it then carries forward — validating,
  landing on the current fixture exactly, and keeping the array in the slot the
  old name held. The two older fixtures keep the spelling they were written
  with, which is what makes the carry a real round trip.

### Patch Changes

- 2181065: Style enforcement rides one token model, and three guards that chose their own
  sample stop choosing.

  `src/lib/tokenModel.ts` is new and is the seam. It answers what the token layer
  declares (with the selector, the wrapping at-rules, the file and the line),
  what a name resolves to at the root under a named theme (`@media print` set
  aside, the `:root`-versus-`.dark` tie broken on the import order read out of
  the entry sheet, `var()` chased through), who consumes it — from a stylesheet
  or from source, as `var(--x)` or as Tailwind v4's bare-value shorthand, with or
  without a fallback — and what the colour is, since the HSL and OKLCH
  conversions, the gamut solver and the contrast formula move here too.
  `docs/adr/0006-one-token-model-is-the-single-style-seam.md` records why, and
  `src/lib/tokenModel.test.ts` asserts the reader itself, sheet by sheet against
  the raw text, because a blind spot in one model is a blind spot in everything
  at once.

  `styles/tokens.test.ts` and `lib/palette.test.ts` are rewritten onto it. Ten of
  the twelve rules in the first fold across unchanged in intent; two retire
  because `palette.test.ts` now holds a strictly stronger form of each — which
  roles exist, and that each declares the full property set, is asserted there
  beside the contrast measurements that need the same parse.

  **Four of the folded rules could not previously be asked properly, and the
  model is what makes them askable.** A dial is now checked for resolving to a
  number under each theme, not merely for appearing in a theme file — `print.css`
  restates thirteen of them inside `@media print`, and `themes/light.css`
  declares most of them under a bare `:root` that matches under dark as well. The
  semantic re-derivation rule now asks whether each of the forty-five tokens sits
  inside a `:root, .dark, .light` block, rather than whether such a block exists
  somewhere in the file. The "no blueprint cell token at the root" rule asks the
  cascade instead of grepping one `:root { … }` block, so a declaration under
  `.dark` or in a later sheet can no longer pass it. And the "only token
  references, never a raw colour" rule now covers the seven touchpoint tone
  blocks alongside the eight lane blocks.

  **Three defects surfaced, and none of them was failing anything before.**

  The reference rule meant to cover Tailwind's bare-value shorthand
  (`w-(--anchor-width)`, `origin-(--transform-origin)`) required a letter before
  the parenthesis, where every such utility ends in a hyphen — so it matched
  nothing the `var()` pattern beside it had not already matched, and nineteen
  references in eight files were outside every rule in that file. They resolve
  now, against a named allowlist of the nine Base UI positioner properties the
  primitives write at runtime.

  Every contrast assertion compared two halves of the same primitive ramp, so the
  board's divider caption — a `gray` ink on a `slate` ground — ran at 2.64:1 in
  light and 2.74:1 in dark inside a file that measures contrast a hundred times.
  Step 1100 does not clear it either (4.11:1 light); `BLUEPRINT_THEME.dividerLabel`
  moves from step 900 to step 1200, the smallest rung that clears AA in both
  themes, and the pair is now measured rather than the step number trusted.

  The interaction-state block matched `[data-blueprint-lane]` only, so all seven
  touchpoint tones were excluded from every contrast assertion in the file —
  seven of fifteen allocated families, setting the same seven properties from the
  same ramps and rendering as cell surfaces exactly the way lanes do. They are
  inside it now, in both themes, and all seven pass.

  Two claims are narrowed rather than widened, because widening the sample proved
  them false as written. "Keeps named paths off the lane families" sampled forty
  synthetic names all hard-coded to `kind: 'variant'`, which `getPathColor`
  short-circuits into the open set — the one family group disjoint from the lanes
  by construction — so `happy` and `exception` were structurally unreachable
  through it. Extended honestly, `happy` is green against the green `actor` lane
  and `variant` is blue against the blue `evidence` lane. Eight lane families plus
  seven tones is fifteen and there is no spare hue to move either to, so the file
  now names both overlaps and holds what it actually can: each is drawn at step
  1100 against a step-500 lane fill, six steps apart. Beside it, the constraint
  nobody had written down — the palette is full — is asserted, so a ninth lane
  fails before it is drawn.

  `themes/dark.css` gains a corrected comment: it claimed `--surface-hue` falls
  back to `var(--hue)` there, and the cascade says otherwise. `themes/light.css`
  declares it under `:root, .light`, the bare `:root` matches under dark, and
  nothing later takes it back — so the dark surfaces run on light's warm 34. Moot
  at chroma 0, and exactly the class of claim the old reader could not check.

  `lib/tokenDiscipline.test.ts` is deliberately untouched and still carries its
  own reader over `src/components/**.tsx`. Converting it changes what it samples,
  which is its own change; the ADR's consequences say so rather than letting the
  gap go unrecorded.

## 1.6.4

### Patch Changes

- 80f4e67: A badge is not a chip, in the figures either.

  #324 stopped `chip` being a name under `src` and #358 stopped it being a
  comment there, and both sweeps walked past `docs/assets/`. Fifty-one class
  strings in the cover figures still said the retired word — forty-one
  `class="chip"` attributes and ten `.chip` rules across ten of the thirteen
  files — because no check had ever opened an SVG looking for a NAME.
  `retired-copy.test.mjs` does open them and was right not to catch this: its
  subject is the words a reader sees, which in an SVG means the text nodes.

  The figures are AUTHORED, so this is an edit to the source and not to an
  output: `scripts/sync-cover-assets.mjs` copies `docs/assets/` to `public/cover/`
  and changes nothing, and `public/cover/` is generated and gitignored. Nine
  files take `badge` straight — the marker those rounded rects draw is the one
  this design system calls a badge, one per thing and never drawn from a set.
  `data-model-hierarchy.svg` is the tenth and could not: it already HAD a
  `.badge`, at 7.5px, on the lane markers in its miniature path panel, which is
  the same thing `blueprint-anatomy.svg` calls a badge. Its phase markers are
  badges too, so they say which badge they are and became `.phaseBadge` rather
  than collapsing two rules with different metrics into one name. Every rule and
  every attribute moved together, so the diff is fifty-three lines for
  fifty-three and no figure renders a pixel differently.

  `scripts/tests/badge-and-tag.test.mjs` gains a third subject, which is the
  half that stops this recurring. A figure is styled only by its own `<style>`
  block — `CoverFigure` serves it through an `<img>`, which seals page CSS out —
  so two assertions hold over one walk of the class vocabulary. No class name
  may say a retired word, in either place a figure can write one: the rule in
  the stylesheet and the token in a `class` attribute. And every class a figure
  uses must have a rule in that same file, which is what makes the first
  assertion impossible to satisfy by halves — rename the rule alone and the
  attributes style nothing, rename the attributes alone and the rule does. The
  converse is deliberately not asserted, and four unused rules stand today: a
  rule nobody uses teaches nobody, because a name is learned where it is used.

  The word list stopped being a literal in the same change. `RETIRED_DESIGN_WORDS`
  is now read off `RENAME_MAP` by the map's own shape — the rows that retired no
  database identifier and carry no migration, which is exactly the kind of rename
  no schema and no generated type can hold and precisely what this file exists to
  hold instead. It selects the `pill`/`chip` row today, a test states that as a
  fact about the map, and a second such row would be picked up on the day it
  lands.

- 0a8a77d: The selection seam reads a cell, not a string.

  `getTouchpointItems` took a cell's `content` and split it, so the touchpoint
  names the board drew were whatever the grid's text happened to say. That is
  one of the two sources a cell has, and since placements became rows it is the
  weaker one: a NAME-ONLY placement (#112) names its touchpoint by name alone,
  because the registry has no entry for it, and nothing obliges the cell's text
  to repeat that name. Split the text and the placement is not merely undrawn —
  it is unreachable, because the same list is what the panel and the touchpoint
  picker select from. `getTouchpointNames` replaces it and takes the cell:
  placements where the cell has them, the text where it does not.

  All five call sites had the cell in hand already — `blueprintCellConnections`,
  twice in `blueprintStepTech`, and the slot-cell branch of `CompareCellBlock` —
  save one, the branch of `CompareCellBlock` that has only a bare `content`
  string, which passes `{ content }` and gets the old reading, correctly: a
  compare slot's face is assembled from text and there are no placements there
  to prefer.

  The text fallback is therefore not dead code and is asserted as behaviour, not
  tolerated as a leftover. The hand-written fixture boards and the compare slots
  hand these readers a cell that never went through the normalizer, and
  splitting the text is what those sources mean.

  `getMaxTouchpointCountInLane` moves with it. The row height a touchpoint lane
  reserves is a count of the same list, and leaving it reading the text alone
  would have drawn each name-only face into a row with no space for it — the
  count and the list have to agree or the fix is a clipping bug. It now counts
  placements where a cell has them and the text where it does not, which is the
  reading `getTouchpointNames` does.

  Whether a name IS a name-only placement is still `isNameOnlyPlacement` in
  `cellTouchpoints.ts`, and deliberately stays there. That predicate reads the
  row as well as the registry link, so a fallback placement — no row and no
  registry — is not mistaken for one; a second predicate keyed on the registry
  link alone would disagree with it on every fixture board.

## 1.6.3

### Patch Changes

- 0d084e4: A storyboard is not a visual.

  `21000122000000` renamed the lane role and the rename map has carried
  `visual` in both its `retired` and `copy` lists ever since. Neither list could
  see the app. Check A reads database identifiers and Check C reads JSX text and
  five props, so between them sat what the `pill`/`chip` row calls the app's own
  vocabulary — a component, a file name, a data attribute, a flag — and the whole
  walkthrough surface was still spelled `Visual` two migrations after the role
  stopped being. 247 occurrences across 51 files; 220 of them moved.

  **Eight files carry the word in their names and no longer do.**
  `visualWalkthrough.ts` → `storyboardWalkthrough.ts`,
  `blueprintVisualPlaceholder.ts` → `blueprintStoryboardPlaceholder.ts`,
  `VisualWalkthroughContext.tsx` → `StoryboardWalkthroughContext.tsx`, and under
  `components/blueprint/`: `BlueprintStepVisual` → `BlueprintStepStoryboard`,
  `VisualWalkthroughShell` / `Modal` → `StoryboardWalkthroughShell` / `Modal`,
  `BlueprintVisualPlayButton` → `BlueprintStoryboardPlayButton`,
  `VisualStepDetailStack` → `StoryboardStepDetailStack`. 165 identifiers follow
  them, including the two flags: `BLUEPRINT_STORYBOARD_LANE_UI_ENABLED` and
  `BLUEPRINT_STORYBOARD_WALKTHROUGH_ENABLED`. The second is still `false` and
  the machinery under it is still deliberately retained — this change moves the
  word and not one line of behaviour.

  **`data-visual-walkthrough-modal` is now
  `data-storyboard-walkthrough-modal`.** It is resolved by string in three
  places and set in one, and all four moved together: the modal sets it,
  `SliceView` and `ServiceOverviewView` query for it, and `print.css` hides it.
  A producer renamed without its readers is the defect this repository has a
  whole check family for.

  **`visual-<stepId>` did not move, because it already had.** The synthesized
  anchor the stacked grid uses is emitted as `storyboard-<stepId>` at all four
  producer sites here; only the comment on `MergedSubCellMember` still described
  the old spelling, and it says what the code does now. The deployment's four
  sites still emit `visual-` and are its own change.

  **Where `visual` is the English adjective it stays.** Fifteen sites: a panel
  is `visually` de-emphasised, WebKit's `visual` viewport is a platform term, a
  divider band has a `visual` width, reading order and `visual` order agree on
  the cover. So do six data values — `Visual` is a lane DISPLAY NAME in content
  that predates `lane_role`, so it keeps its key in `LEGACY_NAME_TO_ROLE` and
  `LANE_STYLES` (whose `'Step Visual'` entry becomes `Storyboard`, the
  deployment's own spelling, since `step_visual` is the role `21000122000000`
  dropped), and `/step-visual-placeholder.svg` is a sentinel a `cells.frame` may
  carry, so renaming the asset would silently turn every placeholder into a real
  frame. Its copy moved; its name is a value.

  **Three sentences came out singular, and the guard is why.** "Step visuals, 3
  images" replaced mechanically says there are three storyboards; one cell is
  one step's storyboard holding three images, so the label is `Step storyboard,
3 images`. `No visuals for this step` is `No storyboard frames for this step`,
  because a storyboard is made of frames and `21000115000000` settled that word.

  `MANGLED` in `scripts/tests/retired-copy.test.mjs` gains three shapes for this
  rename — `storyboardly`, the `storyboardi[sz]e` / `-ation` family, and
  `storyboard element`, which is `visual element` with the noun swapped and
  never what a sentence here means. No pattern is offered for "storyboard
  centre" or "storyboard order": both halves are ordinary English, and the only
  rule separating them is the list of sentences they came from.

  No path in `identifiers.json` moves and none in `check-reference-paths.mjs`
  does, so this is a patch — the plugin contract is untouched and the template
  app is explicitly not the semver surface. Five files a deployment enrols
  byte-identical do move (`blueprintDisplayFlags.ts`,
  `applyBlueprintDisplayFilters.ts`, `BlueprintVisualPlayButton.tsx`,
  `VisualWalkthroughShell.tsx`, `VisualWalkthroughContext.tsx`), so its drift
  gate goes red until it adopts on a pin bump. That is the release order this
  change is written for.

## 1.6.2

### Patch Changes

- 087c571: A badge is not a chip, in comments too.

  #324 stopped `chip` being a NAME under `src` and the copy list stopped it
  reaching a reader, but forty comments went on calling a badge a chip — the
  same gap #327 closed for `layer`, one word over. Neither sweep read comments,
  by design, so the codebase kept teaching the next reader a word the design
  system had withdrawn.

  The sentences say what they mean now. Where the thing is this design system's
  descriptive marker it is a `badge` — `ui/badge.tsx`'s four size variants and
  its warning-role note, the slice presentation's cell badges, the slide
  editor's, the loading skeletons', `SliceHeaderBand`, `MobilePathSelector`,
  `PathMultiSelect`'s badge layouts, `CanvasDesignTools`' preview badge,
  `DevPortal`'s badge row, `AgentPanel`'s accent badge, `tokenDiscipline`'s
  badge that does not track its role, and `ScenarioTitleBadge` /
  `badgeGeometry.test.tsx`, which meant the default SIZE and now say so. Where
  it is something else, the word is the thing: `ui/alert.tsx`'s icon sits on a
  filled square, `SupabaseProvider`'s edit-preview tell is a banner,
  `AnnotationCaptureMenu` and `agent/attachments.ts` / `agent/loop.ts` carry an
  attachment with a label, `ScenarioBlueprintPanel` reads the menubar's `[≠ N]`
  count, and the cell panel's "← Back to Differences" is a button, which is what
  it renders as. Every one of those spellings that the deployment had already
  written is taken from it verbatim rather than reinvented.

  `scripts/tests/badge-and-tag.test.mjs` gains the second half of its own walk.
  One pass over `src` now yields two things — the code with comments stripped,
  and the comments that stripping removed, blanked in place so a line number
  still means what it says — and each gets an assertion. `pill` is in it from
  the start: the tree carries none under `src`, and the cheapest time to guard a
  clean word is while it is clean.

  There is no exemption list, and that is the subject rather than an oversight.
  The four documents this repository exempts everywhere else — that test, a
  changeset, the CHANGELOG and a migration — are outside `src` by construction,
  so the rename map and the guard can still write the retired word down. The
  figures under `docs/assets/` keep theirs: a `class="chip"` is a name, not a
  comment, and this change touches no class string.

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
