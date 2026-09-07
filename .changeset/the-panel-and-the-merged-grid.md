---
'agentic-service-blueprinting': minor
---

The cell-detail panel takes one lane resolution and a real placement editor.

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
