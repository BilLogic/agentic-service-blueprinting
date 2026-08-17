---
title: Asset spec — cell-anatomy.svg
type: plan
status: draft-for-review
date: 2026-08-08
asset: docs/assets/cell-anatomy.svg
home: guide/01 §3 only
style: 00-style-guide.md governs; annotated-UI motif
prerequisite: verify panel layout/proportions against uno's shipped cell detail panel at draft time
---

# cell-anatomy.svg — what accrues on a cell

## Job

Answers: *when I open a cell, what am I looking at and what can attach to
it?* Teaches the model THROUGH the surface the reader will meet
(annotated-UI, per Bill round 5). Textbook grounding: a touchpoint is the
intersection of time and channel — an individual cell — and "user
registers online" is a touchpoint, not yet a design brief; the panel is
where it becomes one.

## Canvas

`viewBox="0 -44 880 524"`. Title: **"Inside a single cell"** (deliberate
sibling of the shipped "Inside a single path").

## Layout

- **Left third (x=16, w=260)**: grid excerpt — 3 lanes × 3 steps of the
  mini-grid at readable scale, one cell carrying the emphasis stroke
  (`#9aadbe` @1.5) as the selected cell. Two idioms shown ON the grid:
  a solid trigger arrow leaving the selected cell (anatomy's `.trigger`)
  and a needs relation drawn as NO arrow + a small chip on the panel
  side. Left-rail captions with leader lines (anatomy idiom):
  - "one action sets off another" (on the trigger)
  - "a dependency shows in the panel — no arrow, on purpose" (on needs)
- **Right two-thirds (x=300, w=564)**: wireframe mock of the cell detail
  panel — header bar with cell title placeholder + close affordance, tab
  row, then content regions in the panel's real order (verify at draft):
  1. spec fields as four labeled rows: `function` · `form` ·
     `value props` · `owner` (neutral placeholder bars for values)
  2. evidence section: two filled 22h rows + one dashed-outline empty
     row (`4 3`)
  3. findings section: one row with pink dot + status pill
  Callout pointers (leader lines to 9.5px labels in the right margin,
  top-to-bottom so reading order is stable):
  - `function` → "what this action does for the journey"
  - `form` → "how it shows up — screen, call, letter, script"
  - `value props` → "why it's worth doing, per audience"
  - `owner` → "who answers for it"
  - dashed evidence row → "no evidence yet = an assumption — absence is
    the flag, nothing is stored"
  - findings row → "open · dismissed · resolved — dismissed stays
    dismissed"
- **Footer**: centered `.sub` @10px: "this cell also appears in 2 slices
  — see the slicing figure".

## Consistency notes

- The mock is wireframe fidelity: real layout and proportions, neutral
  fills (`#fafbfc`/`#ffffff`/hairlines), placeholder bars instead of
  copy — NO invented UI text beyond the labeled field names.
- Callout labels are the register test: definitional fragments, one per
  pointer, no stacking two facts on one leader.
- Six callouts is the ceiling — if a seventh fact demands entry, it goes
  to guide/01 prose instead.
