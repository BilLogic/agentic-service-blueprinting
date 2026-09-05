---
'agentic-service-blueprinting': minor
---

A step says what its moment is, and the service panel may write its own.

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
