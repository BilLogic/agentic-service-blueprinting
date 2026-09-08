# Changelog

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
