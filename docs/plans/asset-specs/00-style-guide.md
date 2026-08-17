---
title: Asset specs — shared style guide
type: plan
status: draft-for-review
date: 2026-08-08
governs: every spec in docs/plans/asset-specs/
source-of-truth: extracted from the four shipped SVGs in docs/ (they already agree)
---

# Style guide — the figure system

Every new figure must be indistinguishable in style from the shipped four.
This file is the contract; per-asset specs list only their deviations.

## Canvas

- Root `<svg>` with `viewBox="0 -G 880 H"` — width always 880; `G` is the
  title gutter (36–44), `H` the total height. No `width`/`height` attrs.
- `font-family` on the `<svg>` element itself:
  `-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif`.
- Figure title: inline-styled (never a class) `font-size="15"
  font-weight="700" fill="#273036"`, sentence case, no period, at `x="16"`,
  baseline ≈ 26 above y=0 (i.e. y=-18 in a -44 gutter).
- Left content margin x=16; right inset 10–16 from 880. Annotation rails
  may sit at x=8–10.
- **NEW RULE (sanctioned deviation, Bill 2026-08-08): full-canvas
  background** — first element after `<defs>`: rect covering the viewBox,
  `rx="14" fill="#fafbfc" stroke="#e2e4e9"`, so figures survive dark-mode
  screens. Retrofit the four shipped SVGs in the docs/assets move commit.
  (Shipped files are currently transparent — this is the one place new
  figures deliberately differ until the retrofit lands.)

## Type classes (reuse verbatim)

| class | spec |
|---|---|
| `.title` | 11px / 700 / `#273036` |
| `.chip` | 10–11px / 600 / `#273036` |
| `.sub` | 9–9.5px / `#9ca3af` |
| `.anno`/`.rail`/`.head`/`.col` (CAPS labels) | 8–10px / 700 / `#8a8f98`, letter-spacing `.09em`@10px · `.07em`@9.5px · `.06em`@8px |
| `.pill` | 10.5px / 700 / `#4f4b47` |
| `.mono` | family-only modifier: ui-monospace stack; ONLY for literal artifact names |
| `.dim` | fill `#9ca3af` modifier |

## Shape vocabulary

- Panels: `rx=10–12`, fill `#fafbfc`, stroke `#c9ccd4` @1.3, with a
  separate 22h `rx=6` tab above when titled.
- Cards: `rx=8` (44h rows) or `rx=14` (54–56h), white or tinted.
- Cells: `rx=6`, 100×40. List rows: `rx=5`, 22h, 26px pitch.
- Pills: fully rounded (`rx≈h/2`).
- Stroke ladder: 1 hairline → 1.2 secondary → 1.3 panels → 1.4–1.5
  emphasized card → 1.6 boundary → 1.8 heavy flow.
- Dashes: boundary `5 4` or `4 3`; loop `6 4`. Nothing else. Dashed =
  derived / virtual / not-stored / read-only.
- Depth stack idiom: 3 congruent rects offset (+6,-6) or (-10,+10), fills
  `#f4f5f7`/`#fafbfc`/`#ffffff` back→front, darker stroke on front only.
- No gradients, no shadows, no legend blocks, no numbered circles.

## Color semantics (fixed meanings)

- Ink `#273036` · dim `#9ca3af` · rails `#8a8f98`.
- Lane palette (anatomy/data-model, keep exact): customer `#e8f3ed`/pill
  `#cfe6d9`/stroke `#9dbfa9` · frontstage `#fdf1e3`/`#f6e0bd`/`#d4b483` ·
  backstage `#fbe9f0`/`#f2cfdf` · support `#ecebf5`/`#d9d6ec`.
- Emphasis (the active/focused thing): fill `#d9e4ea` + stroke `#9aadbe`.
- De-emphasis / other / collapsed: `#eceef2` + `#d4d4da`.
- Green (`#e8f3ed`+`#9dbfa9`) doubles as gate/pass. Amber
  (`#fdf1e3`+`#d4b483`) doubles as skill/automation accent. Pink
  (`#fbe9f0`) doubles as findings/divergence. Use tints sparingly and only
  with these meanings.

## Connectors

- One `<marker>` per file: `markerWidth="8" markerHeight="8" refX="6"
  refY="3" orient="auto"`, path `M0,0 L7,3 L0,6 Z`, fill = line color.
- `<path>` for anything with a marker; `<line>` for rules only.
- Straight orthogonal for short hops; cubic Bézier (~60px control lead-in)
  for cross-column; right-angle polylines for loops.
- Leader lines: `#b6bac2` @1, markerless. Edge labels ride in white 18h
  `rx=9` pills, `stroke #e2e4e9`, centered text.

## Layout rhythm

- Column pitch ~230; inter-column gap for edges ~130. Row pitch 76
  (44h card + 32 gap). List pitch 26. Lane row 60 + 12 group gap.
- Card text: title baseline card_y+24 (54h) / +19 (44h); sub +16–17.
- Captions: CAPS label then `.sub` lines at +13px steps. Centered under
  panels (data-model idiom) or left-rail with leaders (anatomy idiom).
- Footer: one centered `.sub` @10px, ~22px below last row.
- Overflow: dimmed `+ N more …` row, never truncation.

## Voice (embedded text)

Lowercase fragments, no terminal periods, present tense, verb-first,
definitional not instructional. Contractions fine. Parentheticals for
examples. Middot for numbering (`1 · Draft`). `.mono` only for literals.
Counts as top-right `text-anchor="end"` micro-labels — every count comes
from the generator script, never typed. **The artifact is a "blueprint",
never a "map"** (Bill 2026-08-08) — "map" appears only as the skill name
`sb:map` or as a verb ("map your service"). Match register to the shipped
strings: "one action sets off another" · "users can't see below this
line" · "deterministic checks between phases".

## New motifs (this cycle, sanctioned)

- **Annotated-UI**: simplified vector mock of the real app surface
  (layout + proportion true, neutral fills, no text detail), dissected by
  `#8a8f98` leader lines to 9.5px labels outside the mock. Verify
  proportions against uno's shipped UI at draft time.
- **Mini-grid quote**: any figure referencing the blueprint draws it as a
  dimmed miniature using anatomy's lane tints at 40% weight — same shapes,
  never a new abstraction.
- **Before→after template** (the four skill figures): defined in 02–05;
  identical geometry across the set.

## Show, don't tell — the standing check (Bill, 2026-08-08)

Before a figure ships, read every string on it and ask: *is this line
describing something the drawing already does, or failing to?* If a fact
can be drawn, draw it and delete the line. Worked examples from F1:

| Told (cut) | Shown instead |
|---|---|
| "what it holds — what research found · how the work runs · …" | the cells themselves: sparse single-bar cells on the left, dense two-line cells on the right |
| "a headline, and not much under it" | a dashed, nearly empty detail card under the old blueprint |
| "supports progressive disclosure" | one cell outlined and opened into a full detail card below the grid |
| "the same account of the service — now with a reader that opens it constantly" | thirteen agent arrows crossing every lane and column, against three human ones |

What may stay as text: the participants' names, section rails, and a
quantity no drawing can carry on its own (a *rate* — "opened a few times a
quarter"). Everything else earns its place by being drawn.

## Review checklist (run per figure)

**Show > tell** (above) · 880 wide · gutter title inline 15/700 · background rect present · classes
from this file only · tints only with fixed meanings · marker geometry
exact · dashes only `5 4`/`4 3`/`6 4` · counts generated · voice lowercase
fragment · no legends/badges/shadows · quoted structure dimmed in
data-model chip shapes.
