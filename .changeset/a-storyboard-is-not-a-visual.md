---
"agentic-service-blueprinting": patch
---

A storyboard is not a visual.

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
