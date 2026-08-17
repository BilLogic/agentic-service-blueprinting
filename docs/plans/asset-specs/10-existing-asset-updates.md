---
title: Asset spec — updates to the four shipped assets + ERD regen
type: plan
status: draft-for-review
date: 2026-08-08
assets: blueprint-anatomy.svg · data-model-hierarchy.svg · skill-workflow.svg (retire) · erd.mmd
style: 00-style-guide.md governs
---

# Updates to existing assets

## blueprint-anatomy.svg — role legend strip (additive only)

The figure is verified accurate; nothing inside the drawing changes.
Addition: a legend strip along the bottom edge (below the current content
box; viewBox height grows accordingly):

- Eight entries at two rows of four, each: 13h lane-color swatch pill
  (the EXACT fills already in the figure) + `.mono` role key + 3-word
  `.sub` rendering note:
  - `customer_actions` — "green band, top"
  - `frontstage_actions` — "amber band"
  - `backstage_actions` — "pink band"
  - `frontstage_tech` / `backstage_tech` — "pill cells" (share a note)
  - `support_systems` — "violet band"
  - `visual` / `step_visual` — "imagery rows" (share a note)
  (exact notes verified against `src/lib/layerRoles.ts` at draft time)
- Final entry, full-width `.sub`: "custom or null renders as a generic
  lane — the two lines derive from roles, never from names"
- Strip gets its own CAPS label: `LAYER ROLES DRIVE THE RENDERING`.
- Plus the background-rect retrofit (style guide §Canvas).

## data-model-hierarchy.svg — one pointer line (additive only)

- One dim footer `.sub` @10px, centered: "slices, findings, and evidence
  live on top of this structure — see the slicing figure".
- Background-rect retrofit. Nothing else.

## skill-workflow.svg — RETIRE

Replaced by the four skill figures (specs 02–05). Delete after README §6
lands; git history keeps it. Do not leave both in docs/assets/.

## erd.mmd — regenerate from shipped migrations (deferral lifted)

- Source of truth: `supabase/migrations/20260716200000_template_schema.sql`
  + `20260729120000_derived_layer.sql` + subsequent derived-layer
  migrations. Regenerate the full entity set — core 9 + derived
  (slices, slice_items, findings, evidence, propositions, plus
  cell-spec/trigger-kind column changes).
- Keep attribute-level detail (the shipped ERD's altitude).
- Header comment: generated-from note naming the migration files, so the
  next schema change knows to regen rather than hand-edit.
- Moves to docs/assets/ with the SVGs; README/DATABASE.md links updated.

## The moves commit (sequencing)

One commit: create docs/assets/, move all figures + erd.mmd, retrofit
background rects on the three surviving shipped SVGs, update every link
(README, DATABASE.md, plan docs). Run the link check before committing.
