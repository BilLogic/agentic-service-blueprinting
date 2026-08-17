---
title: Asset spec — sb-map.svg (defines the shared skill template)
type: plan
status: draft-for-review
date: 2026-08-08
asset: docs/assets/sb-map.svg
home: README §6 (first of four); guide/03 re-embed
style: 00-style-guide.md governs; this file ADDITIONALLY defines the before→after template 03–05 inherit
---

# sb-map.svg — scattered descriptions → one shared picture

## Job

Answers: *what does sb:map do for me?* Transformation, not process: the
pile you have becomes the picture everyone works from.

## The shared skill template (normative for 02–05)

`viewBox="0 -40 880 340"` (title gutter 40, content 300). Three regions:

- **LEFT panel** — x=16 w=340 h=210 y=16. Panel per style guide; CAPS
  tab names what you have.
- **CENTER** — the transformation. One heavy flow arrow (workflow's
  `.flow` idiom, `#8e8e93` @1.8, marker per style guide) from left panel
  edge (x=356) to right panel edge (x=524), riding through the **skill
  chip**: amber card (`#fdf1e3`/`#d4b483`, rx=14, ~150×54) centered at
  x=440, `.title mono` skill name + `.sub` four-word plain subtitle.
  Directly beneath the chip, one CAPS micro-line (8px, `.06em`): the
  **guardrail**.
- **RIGHT panel** — x=524 w=340 h=210 y=16, same construction; CAPS tab
  names what you get.
- **Caption** — one centered `.sub` @10px at y≈286: the situation
  sentence, textbook voice, lowercase, no period.

Identical geometry across all four skill figures; only panel content,
chip text, guardrail, and caption vary. No gate diamonds, no agent chips,
no follow-chips inside these figures.

## Content inventory (exact strings)

- Title: **"sb:map — from scattered sources to a service blueprint"**
  (title is the one place `.mono` register mixes into a sentence-case
  title; render skill name in mono at 15px).
- LEFT tab: `WHAT YOU HAVE`. Contents: four offset artifact cards (depth
  idiom, slight rotations forbidden — offsets only), each with a `.mono`
  corner label: `research-notes.md` · `journey map (figjam)` ·
  `ops-runbook.xlsx` · `interview transcript`. `.sub` under the pile:
  "four tools, four partial truths".
- Skill chip: `.title mono` **sb:map** · `.sub` "map your service".
- Guardrail CAPS: `VALIDATED · REVIEWED · SIGNED OFF BY YOU`.
- RIGHT tab: `WHAT YOU GET`. Contents: mini-grid quote (~200×110, lane
  tints at full strength — this is the one place the grid is NOT dimmed:
  it's the product, not context) + beneath it a 22h `.mono` chip row:
  `blueprint.json — one validated file` and a second row `rendered app ·
  no database required`.
- Caption: "scattered descriptions of the service become one picture the
  whole team — and its agents — work from"

## Consistency notes

- The right-panel grid at full tint strength deliberately breaks the
  "quoted structure is dimmed" rule — sanctioned here only, because the
  grid is the OUTPUT. 03–05 dim their grids (context there).
- Artifact filenames are plausible-generic, never uno/Ecoeled real names.
- The absorbed pipeline lives in the two `.mono` chip rows — do not grow
  them into a pipeline drawing.
