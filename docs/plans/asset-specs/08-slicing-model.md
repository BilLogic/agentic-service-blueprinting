---
title: Asset spec — slicing-model.svg
type: plan
status: draft-for-review
date: 2026-08-08
asset: docs/assets/slicing-model.svg
home: guide/01 §4 only
style: 00-style-guide.md governs; annotated-UI motif in band 3
prerequisite: verify composer/present surfaces against uno's shipped slice UI at draft time
---

# slicing-model.svg — how slices relate to the blueprint

## Job

Answers, in order (Bill round 5): *how does a slice relate to the
blueprint?* then *what kinds are there?* then *what do the two postures
look like?* Textbook grounding: the chapter's four ways of taking
detailed slices — journey summaries, phase/step summaries, channel
summaries, touchpoint specifications — plus our custom.

## Canvas

`viewBox="0 -44 880 624"`. Title: **"A slice is a lens on the blueprint"**.

## Layout — three labeled bands

- **Band 1 (y=8, h≈190) — THE RELATIONSHIP.** CAPS band label: `A LENS,
  NOT A COPY`. Left: mini-grid quote (~300×150, dimmed) with five cells
  highlighted (emphasis stroke). Right: an ordered filmstrip of four
  frames (rx=8 cards in a row, numbered `1 ·` … `4 ·`). Dashed `4 3`
  threads from each frame back to its grid cells. Two `.sub` annotations:
  "frames point at live cells — update the cell, the slice sees it" ·
  "re-import the scenario and the slice survives (refs by key)".
- **Band 2 (y≈212, h≈150) — FIVE WAYS TO CUT.** CAPS band label: `FIVE
  WAYS TO CUT`. Five thumbnails of the SAME dimmed grid (~120×70 each, at
  the 5-column pitch), each with a different selection pattern in the
  emphasis stroke: reading-order sweep across lanes · one column · one
  row · a single cell · an arbitrary dashed lasso. Under each, `.chip`
  label + `.sub` textbook name where one exists:
  - `journey` — "the journey summary"
  - `step` — "a phase or step, across every lane"
  - `lane` — "a channel, across the whole life cycle"
  - `cell` — "one touchpoint, specified"
  - `custom` — "whatever the question needs"
- **Band 3 (y≈386, h≈200) — ONE SLICE, TWO POSTURES.** CAPS band label:
  `ONE SLICE, TWO POSTURES`. Two annotated-UI mocks side by side
  (~380×170 each):
  - left, `.chip` "design": composer wireframe — frame strip along the
    bottom, storyboard area, visible edit affordances as neutral chips;
    one callout: "compose frames; cited cells stay live links"
  - right, `.chip` "present": one frame full-bleed inside a dark surround
    (`#273036` at 8% — the only dark surface in the whole set), zero
    chrome; one callout: "full-bleed for the room; print/pdf from here"
  Between them a short connector with edge-label pill: "same slice".

## Consistency notes

- Band 2's five thumbnails must be visually parallel (same grid, same
  size, only the selection differs) — the taxonomy reads as variations,
  which is the point.
- The dark surround in band 3 is a sanctioned one-off (presentation mode
  IS a dark room); confirm it doesn't fight the background rect —
  inset it as a card, never touching canvas edges.
- Dashed elements: band 1 threads + band 2 lasso only.
- sb-slice.svg (spec 03) shows three audience decks; this figure owns the
  full taxonomy — don't duplicate audience tags here.
