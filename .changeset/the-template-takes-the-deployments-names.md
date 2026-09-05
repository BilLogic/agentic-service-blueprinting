---
'agentic-service-blueprinting': patch
---

The template takes the deployment's names and its camera policy.

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
