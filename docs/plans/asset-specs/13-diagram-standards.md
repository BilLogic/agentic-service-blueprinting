---
title: Diagram standards — the requirements every figure must meet
type: plan
status: draft-for-review
date: 2026-08-08
supersedes: the scattered rules in 00-style-guide.md and 11-copy-and-voice.md (both remain as detail references)
governs: every figure in docs/assets/
---

# Diagram standards

Written after F1 went through nine review rounds. Everything learned in
those rounds is consolidated here as requirements, followed by a per-figure
audit of what is already out of compliance. **Read this before touching any
remaining figure.**

---

## Part 1 — What the review taught us

Nine rounds on one figure, and the same five faults kept surfacing. They
are the reason the rest of this document exists.

| Fault | How it showed up | The rule it produced |
|---|---|---|
| **Telling what could be shown** | "what it holds — what research found · how the work runs · …" as a text row; "the same account of the service, now with a reader that opens it constantly" as a caption | §3 Show over tell |
| **Unnecessary difference between compared things** | left grid 270 wide with 6 cells, right grid 244 wide with 13 — the eye compared layouts instead of content | §4 Comparison figures |
| **Copy that performs instead of describes** | "too much for thursday's meeting", "drift is quiet — nobody notices until it bites", em dashes everywhere | §2 Copy and voice |
| **Drawing from memory instead of source** | a cell panel invented with the wrong tabs and a findings section that does not exist in the product | §6 Fidelity |
| **Layout drift** | guardrail text bleeding under panels, uneven padding (16 left / 42 right), text blocks sitting high in their cards | §1 Canvas and layout |

Two further decisions worth recording because they cost several rounds
each: **titles** settled into three families only (§2.1), and **what the
figure carries versus what the prose carries** is decided per figure in
`12-text-vs-visual.md`, not improvised while drawing.

---

## Part 2 — The requirements

### §1 Canvas and layout

1. `viewBox="0 -G 880 H"`. Width is always 880. `G` is the title gutter
   (36–44).
2. **A background rect is mandatory** — full canvas, `rx="14"`,
   `fill="#fafbfc"`, `stroke="#e2e4e9"`. Transparent figures fail on
   dark-mode screens.
3. Title: inline `font-size="15" font-weight="700" fill="#273036"`, at
   `x="16"`, in the gutter. Never a class.
4. **Padding is uniform and symmetric.** Panel inner margin 16 on every
   side; 24 between columns inside a panel; 24 between panels; equal top
   and bottom padding. If the left inset and the right inset differ, the
   figure is wrong.
5. **Text blocks are centred in their container** — horizontally and
   vertically. A four-line block in a 78px card is centred on the card's
   midline, not top-hung.
6. **Nothing overlaps anything.** Full-width text under a panel row will
   collide; check the render, not the intent.

### §2 Copy and voice

1. **Titles** — three families, nothing else:
   - anatomy: `Inside a single path` · `Inside a single cell`
   - definitional: `How a blueprint is organized` · `Types of slices` ·
     `The skill set and agent fleet` (a figure that names its subject rather
     than explaining it; no `sb` prefix, no "overview of")
   - commands: `How to use sb:map` (command in `.mono`)
   - plus the one thesis figure: `Why teams need a service blueprint`
   No em-dash taglines. No sentences.
2. **Body copy** — lowercase fragments, present tense, no terminal
   periods. CAPS rails for section labels. `.mono` only for literals.
3. **No em dashes anywhere.** They read as machine-written. Use a colon,
   a comma, or two sentences.
4. **Describe the mechanism, not the feeling.** No stakes, no drama, no
   consequences.
5. **Never characterise the reader or their organisation.** Not their
   calendar, not their documents, not their diligence.
6. **No jokes, aphorisms, or punchlines.** If it would land in a keynote,
   it does not go on a figure.
7. **The artifact is a "blueprint", never a "map".** "map" is only the
   command `sb:map` or the verb.
8. **Claims must be checkable.** "stays in sync" is a mechanism;
   "keeps everyone aligned" is a promise. Cut promises.
9. **Line lengths within a text block are balanced.** Four ragged lines
   in one chip is a defect; two even ones are correct.
10. **No internal jargon** in reader-facing figures ("IR", table names,
    tier vocabulary).

### §3 Show over tell — the standing check

Before a figure ships, read every string and ask: *is this describing
something the drawing already does, or something it should?* If the fact
can be drawn, draw it and delete the line.

| Told | Shown instead |
|---|---|
| "what it holds — research, how the work runs, …" | sparse one-bar cells versus dense two-bar cells |
| "a headline, and not much under it" | a dashed, nearly empty detail card |
| "supports progressive disclosure" | one cell outlined, dropping into a full detail card |
| "human–agent collaboration" | arrows from each role into the agent, and from the agent across the blueprint |
| "read across every lane and column" | thirteen arrows landing on individual cells in all four lanes |

**What may stay as text:** participant names, section rails, literal UI
labels inside a mock, and a quantity no drawing can carry alone — a *rate*
("opened a few times a year"). Everything else earns its place by being
drawn.

A figure needs **no caption at all** if the drawing carries the point. F1
has none.

### §4 Comparison figures (before/after, this/that)

1. **Shared elements must be identical** — same size, same coordinates,
   same slot positions, same row heights. Any difference the reader sees
   should be a difference that means something.
2. **Only meaningful differences vary.** In F1: cell content density,
   who points at what, what a cell opens into, and the read rate.
3. **State labels go in badges** — a pill carrying `BEFORE` / `AFTER`,
   followed by the descriptive rail text on the same baseline. The badge
   tint may carry meaning (F1's AFTER badge is amber, matching the agent).
4. **Equivalent gestures use equivalent geometry** — the same cell slot,
   the same straight drop-line, on both sides.
5. **No decorative variance.** Rotation, jitter and hand-drawn effects
   introduce difference that means nothing.

### §5 Pointers, arrows and z-order

1. **Arrows land on the specific thing they mean** — a cell, not the lane
   band containing it. If a role reads several lanes, draw one arrow per
   cell it reads.
2. **Drop-lines are straight.** Vertical from the element to the card
   below it.
3. **Route connectors around content, not through it.** Where a line must
   leave a grid, exit past its edge rather than crossing cells.
4. **Draw arrows after the thing they land on**, or they disappear under
   it. This bug shipped once already.
5. Marker geometry is fixed: `markerWidth="8" markerHeight="8" refX="6"
   refY="3"`, path `M0,0 L7,3 L0,6 Z`, fill matching the line.

### §6 Fidelity — figures that depict the product

1. **Read the source before drawing a UI.** The cell-panel figure was
   drawn from memory and got the header, the tab names, the field
   placement and the presence of findings all wrong.
2. **Depict what exists.** If findings have no UI, they do not appear in a
   UI figure.
3. **Counts come from a script**, never typed. The shipped architecture
   figure claimed "14 DOCS" against an actual 29.
4. **Re-verify at draft time.** The plugin layout changed twice in one
   week.
5. **Sample content is generic, never a real service's.** These figures ship
   to strangers mapping their own services; PLUS content, client content, or
   an invented domain all read as "this tool is for that, not for me".
   - A free-text field is drawn as a **placeholder bar**, not invented prose.
     Bar widths vary; that is what shows density.
   - Only **structural literals** appear as text: lane names, `Step 4`,
     `Phase › ⋯ › Path`, tab names, counts, field labels.
   - Where a figure must show an example to demonstrate a mechanism (a
     finding, a change request), use a neutral generic service and keep it to
     one line.
6. **No chrome that teaches nothing.** Window buttons, expand/close icons and
   scrollbars are not the subject; cut them.

### §7 Colour and shape vocabulary

Fixed meanings — a tint used decoratively is a defect:

- **green** `#e8f3ed` / `#9dbfa9` — human judgement: review, sign-off,
  triage, gates passed.
- **blue** `#d9e4ea` / `#9aadbe` — structure and data; also the emphasis
  pair for the active or focused object.
- **amber** `#fdf1e3` / `#d4b483` — agents and automation.
- **pink** `#fbe9f0` / `#f2cfdf` — findings and divergence.
- **neutral** `#eceef2` / `#d4d4da` — de-emphasised, other, collapsed.
- Lane palette stays exactly as the shipped anatomy figure defines it.
- **Skill identity** (F7 only): where several skills' connectors share one
  field, each skill takes a hue and every line it owns carries that hue.
  `sb:map` blue, `sb:slice` green, `sb:audit` pink, `sb:whatif` purple.
  The colour is the skill's identity, not the fixed meaning above, and it is
  legible only because each container is filled with the same hue directly
  beside its lines. Do not carry this ramp into a figure that also draws
  lanes or findings.
- **Dashed** = derived, virtual, not-stored, read-only, or a working copy.
  Dash patterns: `5 4`, `4 3`, `6 4`. Nothing else.
- No gradients, no shadows, no legend blocks, no numbered circles.

### §8 Text budget

- Callouts, labels and captions count. **Labels inside a UI mock do not** —
  they are the subject being depicted, and shortening them would make the
  figure lie.
- **Callouts cap at 6** per figure. A seventh fact belongs in the guide.
  One exception: a **reference plate** documenting a surface may carry one
  callout per section that surface has, and nothing beyond that. A section
  drawn without a callout reads as decoration, which is what left `Evidence`
  and `Resources` unexplained in the first F4 redraw.
- Skill figures: about 12 text elements total. The pre-fix `sb-audit` had
  26 of our own words; that was the disease.

### §9 Process

1. One figure at a time, rendered and screenshotted before review.
2. Check the render at real scale — bleed, collision and z-order bugs are
   invisible in source.
3. Decide the prose/figure division first (`12-text-vs-visual.md`), draw
   second.
4. Where a figure depicts a surface or a package, verify against source in
   the same session it is drawn.

---

## Part 3 — Compliance audit of the existing set

Measured, not remembered. All figures pass canvas width and background
rect; the failures are copy and concept.

| # | Figure | Em dashes | Text elems | Known gaps against these standards |
|---|---|---|---|---|
| F1 | `why-now.svg` | 0 | 25 | **compliant** — the reference implementation |
| F2 | `data-model-hierarchy.svg` | 0 | 30 | compliant; shipped figure, untouched |
| F3 | `blueprint-anatomy.svg` | 0 | 27 | compliant; shipped figure, legend removed |
| F4 | `cell-anatomy.svg` | 0 | 48 (10 callouts, one per field) | **compliant** — the canvas with one cell selected, projected into the panel below it; free-text values are placeholder bars, breadcrumb is structural (`Phase › ⋯ › Path › Step 4`); 6 callouts in F3's idiom; panel verified against `BlueprintCellDetailPanel.tsx`, including sentence-case field labels |
| F5 | `slicing-model.svg` | 0 | 16 | **compliant** — the five cuts lead as parallel thumbnails; below them the same slice on the canvas and in presentation, linked by the play control; type keys verified against `slice-schema.json`, both surfaces against `SliceView.tsx` / `SlicePresentation.tsx` |
| F6 | `four-ways-in.svg` | 0 | 13 | **compliant** — titled `The four ways in`; four plain cards named for what they are; amber stroke marks agent-capable, dashed marks read-only, arrow pairs carry read/write (labelled once, on the first pair) |
| F7 | `skill-architecture.svg` | 0 | 46 | **compliant** — redrawn: three even columns (skills · shared references · agents); one container per shared doc; per-doc links drawn as one rail per skill, verified against each SKILL.md; docs ordered so every skill's set is contiguous; arrowheads reserved for the spawn relation |
| F8 | `sb-map.svg` | 0 | 11 | **compliant** — caption cut (it restated the drawing) |
| F9 | `sb-slice.svg` | 0 | 10 | **compliant** — output is now one document per cut, all five types (`journey` `step` `lane` `cell` `custom`); invented audiences, the grid caption and the closing caption all cut |
| F10 | `sb-audit.svg` | 0 | 12 | **compliant** — caption cut; the two left callouts cut as duplicates of the findings rows they described |
| F11 | `sb-whatif.svg` | 0 | 11 | **compliant** — caption cut; the dashed panel and the accept row already carry it |
| — | `why-now-a.svg`, `why-now-b.svg` | 2 each | 14 / 21 | **delete** — superseded prototypes |

### Cleanup order

1. **Em-dash sweep** across F4, F5, F6, F7, F8, F10, F11 — mechanical,
   one pass.
2. **Delete** `why-now-a.svg` and `why-now-b.svg`.
3. **F4** redraw — filled panel, per-section callouts, ≤6 callouts.
4. **F5** redraw — five types lead; postures demoted.
5. **F6** redraw — schematic, less chrome.
6. ~~**F7** redraw — wiring and agent fleet.~~ Done: 36 text elements, three
   even columns, one pointer family (skill to agent).
7. ~~Re-run this audit.~~ Done 2026-08-17: all nine figures in
   `docs/assets/` plus the two shipped ones are 880 wide, carry the
   background rect, and contain **zero em dashes**. Superseded files
   `docs/skill-workflow.svg` and the stale root copy of
   `docs/skill-architecture.svg` deleted; `blueprint-anatomy.svg` and
   `data-model-hierarchy.svg` moved into `docs/assets/`; README embeds
   repointed and its two duplicate skill sections collapsed into one.
   Still open, and **not** an asset task: `docs/erd.mmd` regenerates from
   the migrated schema (migration plan, phase 1 step 3).

---

## Part 4 — Pre-flight checklist

Run against every figure before it is shown:

- [ ] 880 wide · background rect present · title inline 15/700 in the gutter
- [ ] padding symmetric; text blocks centred in their containers
- [ ] nothing overlaps; checked in a render, not in source
- [ ] title in one of the three families; no em-dash tagline
- [ ] **no em dashes anywhere in the file**
- [ ] every line describes a mechanism, not a feeling
- [ ] nothing characterises the reader or their organisation
- [ ] every string that could be drawn instead, is drawn
- [ ] comparison panels share identical geometry for shared elements
- [ ] arrows land on specific elements; drop-lines straight; drawn above
      what they land on
- [ ] tints used only with their fixed meanings; dashed only for derived
- [ ] callouts ≤ 6; counts generated, not typed
- [ ] UI depictions verified against source this session
