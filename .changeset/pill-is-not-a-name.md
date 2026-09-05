---
'agentic-service-blueprinting': patch
---

Pill is retired outside touchpoints too.

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
