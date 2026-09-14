---
audience: designers, developers
summary: The slice focus tab and its dim, presentation's dark subtree, the two editing surfaces that split by what they are good at, the set of images a slide shows, and slide mode.
sources: src/components/editor/SliceView.tsx, src/components/editor/SlicePresentation.tsx, src/components/editor/SliceSlideEditor.tsx, src/components/editor/SlideImagesField.tsx, src/components/editor/SliceSlideComposer.tsx, src/lib/slideImages.ts, src/styles/blueprint.css, src/styles/semantic.css
claims:
  - src/components/blueprint/ScenarioSlideFilters.tsx
  - src/components/blueprint/ScenarioSlideHeader.tsx
  - src/components/editor/CanvasSlideConnectors.tsx
  - src/components/editor/SliceEditSession.tsx
  - src/components/editor/SliceSlideEditor.tsx
  - src/components/editor/SliceHeaderBand.tsx
  - src/components/editor/SlicePresentation.tsx
  - src/components/editor/SliceSlideComposer.tsx
  - src/components/editor/SliceView.tsx
  - src/components/editor/SlideImagesField.tsx
  - src/components/editor/SlideArtboard.tsx
  - src/components/editor/SlideModeView.tsx
  - src/components/editor/SlideNav.tsx
  - src/components/editor/SlideStickyHeader.tsx
last-reviewed: 2026-08-26
---

# Slice view

A slice is a saved cut of the board for one audience — a view, not a copy. On
screen it is **the normal blueprint**, with membership applied on top: same
zoom/pan canvas, same cell panel, opened on the slice's scenario, with
non-members dimmed and members ringed and numbered.

Three postures: the **focus tab** (the live canvas with the membership overlay),
**presentation** (a dark full-bleed stage, its own tab, or full-bleed on mobile),
and **slide mode**, which is a sidebar surface rather than a slice concept at
all.

Design mode **is** edit mode here — the tab *is* the editor, so the slide strip
and the picker mount at the surface rather than behind a separate Edit button.
Two overlapping "clicks mean something else" states was one too many.

## The dim

The slice dim is CSS, not React, driven by one container attribute and one
per-cell attribute:

- **Members** keep a role-accent ring and a soft shadow lift, and they keep it
  whether or not the dim is up. The ring takes the lane's accent so members pop
  at overview zoom.
- **Non-members** go to `opacity: 0.6` with `saturate(0.3) grayscale(0.55)`.

The opacity number is the interesting part, because it used to be 0.22.
Opacity composites the cell's black text against the canvas along with its fill,
so at 0.22 the text measured **1.61:1** against its own cell. Measured across
the lane fills: 0.45 gives ~3.0:1, 0.55 ~4.2:1, 0.6 ~5.0:1. **The desaturate
does the de-emphasis work the opacity used to overreach for.** If you are
tempted to push the dim further, push the saturation, not the alpha.

There is no scrim plane — per-cell dim, desaturate and grey — because the slice
tab wraps the normal blueprint view and the grid keeps its own stacking
contexts.

### What the filter costs, measured

A per-cell `filter` makes every non-member cell its own render surface, which
re-rasterizes when the camera scale changes. Measured 2026-08-26 rather than
guessed: a 240-frame scripted zoom-and-pan sweep across the 0.08–0.26 band —
the band that puts the most cells on screen at once — run against the In-session
phase canvas (338 cells) with the shipped declaration applied to the first N of
them and to none. Chromium, 880×700 viewport, dev build, three interleaved
repetitions:

| cells carrying the filter | mean frame | p95 | frames over 16.7 ms (of 238) |
| --- | --- | --- | --- |
| 0 | 11.3 ms | 17.6 ms | 22 |
| 37 | 11.1 ms | 18.0 ms | 19 |
| 56 | 11.1 ms | 17.9 ms | 24 |
| 112 | 11.2 ms | 17.2 ms | 20 |
| 169 | 12.0 ms | 25.0 ms | 29 |
| 225 | 11.8 ms | 24.8 ms | 30 |
| 281 | 13.6 ms | 26.3 ms | 53 |
| 338 | 14.4 ms | 33.4 ms | 61 |

Flat to ~112, first moves at ~170, and by ~280 it has roughly doubled the
dropped-frame count. The production build reproduces both ends (0 → 12.4 ms
mean / 18.1 ms p95; 338 → 15.9 ms / 33.4 ms), so this is raster, not dev-server
overhead. The `opacity` costs nothing at any count measured — the whole bill is
the filter.

**Slice focus never gets near the knee.** A v1 slice is single-scenario
(`useSliceScenarioId`), so the dim only ever covers one board: 31 of 37 cells on
the sample board, and about 56 on the largest live board this was measured
against. Both sit in the flat stretch, where the sweep cannot tell the filter from no filter.
Coverage bounds it a second way — non-member cells never painted more than ~16%
of the viewport at any zoom, because cards have gaps and zooming in takes cells
off screen as fast as it grows them.

So the look stays and there is nothing to trade. The number to keep is the
headroom: about 3× in cell count, spent only if slices ever go multi-scenario.
Re-measure then, and re-measure for a phone — this was a desktop Chromium, and
the knee moves with the device.

A separate draft state, `data-slice-picked`, uses the **primary** accent rather
than the member ring, deliberately: while picking, "in this draft" and "in some
saved slice" are different states that can both be true on the same cell.

**Editing lifts the dim entirely** — you cannot pick a cell you cannot see.
Clicking a member re-focuses, clicking elsewhere lifts the dim, and chrome (the
cell panel, the navbar, canvas nav, the zoom indicator, the annotation toolbar,
the walkthrough modal) is neutral. A drag past 5px is a pan, not a click. While
de-focused a floating "Showing all · Back to slice" button appears, and it counts
as chrome so clicking it does not re-trigger the rule.

## Presentation, and why the semantic layer re-derives per scope

The presentation stage carries `.dark` **regardless of the app theme**, and the
slice header band rides at the top of it in dark tokens with Return where the
focus tab shows Present — presentation is a mode of the slice, not a separate
screen. Slides render synchronously from the cached slice data; navigation never
refetches. Keyboard is scoped to the container, not to `window`.

That subtree `.dark` is the reason for one of the design system's more surprising
rules, and it is worth knowing here because this surface is the only thing that
forces it: **every semantic derivation is re-declared at each scope that can
override a dial** (`:root, .dark, .light`). Custom properties resolve their
`var()`s at computed-value time, which happens *before* inheritance — so a
descendant that re-declares a dial cannot retroactively re-derive anything
declared only at `:root`. `.light` is in the list for the same reason: it lets a
subtree force light inside a dark ancestor — the colour foundations carry the
whole of that rule.

`SliceHeaderBand` is one component in two modes, so switching between them reads
as a mode change on one object rather than two unrelated screens. Every colour
is a token, so it picks up dark tokens for free inside the stage. When the
sidebar is collapsed the band renders nothing and hands its identity and primary
action to the floating button.

## Two editing surfaces, split by what they are good at

Clicking a cell on the canvas adds it to the **active slide**, or removes it from
wherever it is. That single rule is what makes the two surfaces one editor
rather than two: **the strip says where new cells land, the canvas says which
cells.**

**Drag lives in the strip, never on the artboard.** The canvas is a pan/zoom
surface, and a drag that starts on a cell is already the camera's gesture. So
the canvas adds and removes by clicking, and the strip decides grouping and
order. Inside the strip there are two deliberately distinct drag targets: a cell
badge moves between slides, a slide header reorders slides. Drop position is read
from the pointer's Y against the badge's midpoint — top half inserts before,
bottom half after — and shown as a 2px primary rule above or below the badge.
(Those two indicators are the file's arbitrary `shadow-[…]` literals; they are
hairline rules, not shadows, and there is no token for a directional insertion
bar, which is a gap in the elevation foundations rather than a licence here.)

Badge labels use the cell's described label, not its id: `070110` is an address,
and nobody recognises their content by address.

`SliceSlideComposer` does ordering **and** grouping in one list. Presets were
the wrong idea — grouping is something people shape cell by cell, and since they
are already dragging to reorder, both belong in one gesture space. Cells between
two dividers are one slide, so reordering and re-bucketing are the same drag.

Its drag is **pointer events, not HTML5 drag-and-drop**, and the reason is worth
carrying to the next drag surface: that API failed here twice — first silently
refusing to start without a `dataTransfer` payload, then fighting the popover for
the pointer — and its failures all present the same way, the row snapping back
and the user being told, in effect, that they imagined the gesture. Pointer
capture has one owner and no such moods.

> Note the live divergence: `SliceSlideEditor` still uses HTML5 drag-and-drop
> while `SliceSlideComposer` documents why it abandoned it. If a third drag
> surface appears, copy the composer.

**One word, everywhere: slide.** The row in `slides`, the card in the
composer and the thing the reader sees in presentation are one concept, so they
are one word. This surface used to carry three — a *frame* was the row, a
*screen* was what the reader saw, and the code kept `frame` — while "frame"
also meant one image on one cell, two lanes away. It was settled thus: a **frame**
is one image on one cell, a step's frames across the lanes are its **strip**,
and a **slide** is one screen of a slice.

## A slide shows a set of images, and an untouched slide shows its cells' frames

A slide has never had a picture of its own, and still does not. It had a column
that held one until 2026-08-30, and that column REPLACED the frames of the cells
the slide cited rather than joining them — two answers to what the slide shows,
with the reader never told which had won — so it was dropped rather than shipped
(`20260830270000`). The note left there said that a slide carrying a picture no
cell owns would have to APPEND to the strip rather than suppress it, and that it
would be a different change. This is that change.

What a slide shows is now an ordered SET, and the author's relationship to it
has two states:

- **Untouched** (`slides.shows_all_images`, the default): every cited cell's
  frame, in the slide's cell order, tracking the board as it changes. Every
  slide that existed before this feature is in this state and stays in it
  without anybody doing anything — there is no backfill, because materialising
  today's frames into rows would freeze each slide against the board it was cut
  from.
- **Authored**: exactly the members in `slide_images`, in their order,
  **including none**. That last case is why the flag exists at all: an empty set
  cannot tell "nobody has touched this" from "somebody emptied it", and the two
  render as opposites.

A member names one source — a cited cell, or an uploaded image. A cell member
names the CELL, so replacing that cell's artwork changes what the slide shows
without touching a row; an upload joins the same set as a peer and is the only
tile that can be removed, because a cell's frame belongs to the cell and can
only be unticked.

`SlideImagesField` is where an author does all of this, on the slide card in the
editor's strip. It is offered on SAVED slides only, because a member is keyed by
`slides.id`; and every gesture in it is a write rather than an edit staged for
Save, which is why the field reads the slice's rows and not the draft beside it.
The presentation stage renders the same resolver (`imagesThisSlideShows`) and
never truncates: a slide that says it shows five images shows five.

Un-citing a cell drops that cell's member and nothing else — the other members
keep their positions, the uploads stay, and an authored empty set stays
authored. In the editor the carry-forward happens in TypeScript, because a Save
deletes the slice's rows and inserts them again; in the database a trigger does
the same for the service key, which is the only writer that can edit
`slides.cell_ids` in place.

## Slide mode and the rest

- **`SlideNav`'s expansion state lives in `EditorContext`, not locally.** Local
  state died on every mode switch, skeleton swap and presentation tab, since all
  of those unmount the sidebar. It is also deliberately never derived from
  selection — that is what makes collapsing a phase leave the camera alone.
- Slide mode's sidebar `+` affordances belong to Edit mode; in View the sidebar
  navigates and nothing more.
- `SlideStickyHeader` composes the phase menubar header, the compare controls and
  the path selector; its description falls back to the selected path's summary.
- `ScenarioSlideFilters` is a path-filter wrapper that stops pointer and click
  propagation so canvas gestures do not fire underneath it.
- **Loading is one vocabulary for the whole chain.** One label, one skeleton hold
  key for slice → scenario → blueprint, and the header band stays a skeleton
  through stage two: the band is canvas furniture like the toolbar — it waits,
  and both arrive on the beat the board opens its first lane.

> `SlideArtboard` and `CanvasSlideConnectors` are the artboard-canvas machinery
> and have no live importers today. They are documented as claimed rather than
> described in depth; do not infer a shipped surface from their presence.
