---
'agentic-service-blueprinting': patch
---

A touchpoint cell says what state it is in, and keeps the height the canvas
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
