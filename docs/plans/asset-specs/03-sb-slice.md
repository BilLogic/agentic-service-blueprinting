---
title: Asset spec — sb-slice.svg
type: plan
status: draft-for-review
date: 2026-08-08
asset: docs/assets/sb-slice.svg
home: README §6; guide/03 re-embed, guide/01 §4 links
style: 00-style-guide.md + the template in 02-sb-map.md govern
---

# sb-slice.svg — the whole map → the view each audience needs

## Job

Answers: *what does sb:slice do for me?* The map is too much for the
room; each audience gets its cut. Textbook grounding: the chapter's four
named slices (journey summary · phase/step summary · channel summary ·
touchpoint specification).

## Template deltas only

- Title: **"sb:slice — the view each audience needs"** (skill name mono).
- LEFT tab: `THE WHOLE BLUEPRINT`. Contents: mini-grid quote at ~260×150,
  DIMMED (context, per rule), deliberately dense — all lanes, many cells,
  a `.sub` beneath: "every lane, every step, every path — too much for
  thursday's meeting".
- Skill chip: **sb:slice** · `.sub` "cut the view you need".
- Guardrail CAPS: `A LENS, NOT A COPY — STAYS IN SYNC`.
- RIGHT tab: `THE VIEW EACH AUDIENCE NEEDS`. Contents: three small slice
  decks (depth idiom, 3-frame filmstrips ~90×54 each), vertically
  stacked at 26px+ pitch, each with a `.chip` label + arrow-free audience
  tag in a `.sub`:
  - `journey summary` → "for leadership"
  - `channel view` → "for the web team"
  - `touchpoint spec` → "for the squad"
  Dashed threads (`4 3`, `#b6bac2`) from the top deck's frames back to
  two cells in the left grid — the soft-ref visual: the slice points at
  live cells.
- Caption: "the whole blueprint is too much for the room; each audience
  gets the slice that speaks to them"

## Consistency notes

- Deck labels use the TEXTBOOK's slice names, not our internal type enum
  (journey/step/lane/cell) — guide/01 makes the correspondence explicit;
  this figure speaks the practitioner's language.
- The back-reference threads are the ONLY dashed elements — they carry
  the not-a-copy claim; don't add more.
- Custom slices deliberately absent here (three decks read cleaner than
  five); slicing-model.svg (spec 08) owns the full type taxonomy.
