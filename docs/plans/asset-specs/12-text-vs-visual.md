---
title: Text vs. visual — what each paragraph says, what each figure shows
type: plan
status: draft-for-review
date: 2026-08-08
governs: every figure in the set and the prose it sits beside
---

# Text vs. visual

One rule above all: **if the paragraph and the figure say the same thing,
one of them is deleted.** Prose is good at definitions, sequence, caveats
and guarantees. Figures are good at position, containment, quantity, rate,
and "what it actually looks like". Each row below assigns the labour.

## The final set — 11 figures, in reading order

Placement revised 2026-08-08 (Bill): the **model and overview figures move
into the README**, and the **four skill figures move out of it** into the
per-skill sections of guide/03 — progressive disclosure, so the front door
shows what a blueprint is and what the plugin is, and the detail of each
command waits until someone goes looking for it.

| # | Title | File | Appears |
|---|---|---|---|
| F1 | Why teams need a service blueprint | `why-now.svg` | README §2 |
| F2 | How a blueprint is organized | `data-model-hierarchy.svg` | README §4 |
| F3 | Inside a single path | `blueprint-anatomy.svg` | README §4 |
| F4 | Inside a single cell | `cell-anatomy.svg` | README §4 |
| F5 | Types of slices | `slicing-model.svg` | README §4 |
| F6 | Where a blueprint is used | `four-ways-in.svg` | README §5b |
| F7 | Overview of the sb skill set and agent fleet | `skill-architecture.svg` | README §6 |
| F8 | How to use `sb:map` | `sb-map.svg` | guide/03 · sb:map |
| F9 | How to use `sb:slice` | `sb-slice.svg` | guide/03 · sb:slice |
| F10 | How to use `sb:audit` | `sb-audit.svg` | guide/03 · sb:audit |
| F11 | How to use `sb:whatif` | `sb-whatif.svg` | guide/03 · sb:whatif |

The hero screenshot sits between F1 and F2 (README §3); the four scenario
recordings sit with it and are linked again from guide/02.

**Density note.** §4 now runs four figures back to back (organized → path →
cell → slice). That reads as a deliberate zoom sequence, but it is the
longest stretch of figures in the document — if it drags, F4 and F5 are the
two to demote into guide/01, since they are the deepest zoom.

### Redundancy found while aligning

- **F9 vs F5 — the real collision.** "How a blueprint is sliced" and "How
  slices work" were two titles over the same subject. Fixed by scope:
  **F9 (`sb:slice`) is the act** (the whole blueprint in, per-audience views out — a
  skill figure, symmetric with map/audit/whatif), **F5 is the taxonomy**
  (the five cut shapes, then what a slice points at), titled
  **"Types of slices"**.
  **F5 settled at two bands (2026-08-17).** The five cuts lead. Below them,
  the same slice drawn twice — on the canvas and in presentation — linked by
  the play control that moves between them. The band the figure *lost* is
  the lens-and-threads band: "a frame points at a live cell" and "a slice
  survives re-import because it refers by key" are both mechanisms a reader
  cannot see in a drawing, and the threads made the figure look like it was
  about wiring. Both sentences move to guide/01 §4 prose.
- **F7 vs F1 — a softer collision, resolved by keeping both.** Now that #5 shows who reads the
  blueprint and how often, #11's job shrinks to "which doors exist". That
  may be a paragraph plus the hero screenshot rather than a figure.
  **Decision needed** (see the end of this file).
- **F2 / F3 / F4 / F5 are zoom levels, not repeats** — structure, one
  path, one cell, one slice. Kept.

## The division, figure by figure — same reading order

| Figure | The paragraph says | The figure shows | Why the split works |
|---|---|---|---|
| **F1 · Why teams need a service blueprint** | The argument: agents joining teams; documents written for their own purpose — increasingly written *by* agents, from partial context; service design's frame; why consulting a blueprint used to be expensive. | Two states of the same blueprint. Left: three roles each reading the lanes they own, cells holding a headline and little else, one nearly empty detail card. Right: the same roles plus an agent — people now also routing questions through it — the agent reading across every lane and column, cells carrying real content, and one cell opened into full detail. | Everything the drawing can carry is drawn: who reads it, which lanes they read, how much is in a cell, and what opening one yields. Prose keeps only the argument and the reason the old way was thin. |
| **F2 · How a blueprint is organized** | The levels by name, and why paths exist — variants of one scenario. That phases can loop back. | Containment and scale: each level nested inside the last, drawn as successive zoom-ins. | Prose can name four levels; it cannot make you feel one sitting inside another. No level names in the caption. |
| **F3 · Inside a single path** | Definitions, one sentence each: lane, step, cell, trigger, line of interaction, line of visibility. | Their geometry — lanes as rows, steps as columns, the lines falling between lane groups, an arrow crossing them. | Position *is* the meaning here. Prose defines the vocabulary; the figure shows where each thing sits. |
| **F4 · Inside a single cell** | What a cell is, and why the panel is where a touchpoint becomes a brief rather than a label. | A skeleton of the panel with **every section filled**, callout-annotated in F3's idiom — one callout per section naming what that section captures. A reference plate, not an argument. | Prose gives the reason to fill it in; the figure is the specification of what "filled in" means. *(Revised: the trigger-vs-needs teaching is dropped — it belongs in F3's arrow vocabulary, not here.)* |
| **F5 · Types of slices** | What a slice is for, that it references cells rather than owning them, and that it survives re-import. | The taxonomy, foregrounded: the five cut shapes over the same grid — journey, step, lane, cell, custom — each with the audience it suits. | Prose carries the "view, not a copy" mechanics; the figure is the catalogue. The five thumbnails ARE the list, so prose never enumerates them. |
| **F6 · Where a blueprint is used** | Who can do what — visitor reads, member asks, service account authors — and that enforcement is server-side. | The surfaces: four places the same rows are reached from, over one foundation. | Prose owns permissions, which a drawing always fudges. The figure owns "same data, different surfaces". Moved ahead of the plugin figure so the reader learns *where they would meet a blueprint* before meeting the tooling that builds one. |
| **F7 · Overview of the sb skill set and agent fleet** | What the plugin is, that each skill loads one playbook at a time, spawns readers that return summaries, and ends each step on a check. | The wiring: four skills, the docs and scripts attached to each, and the agent fleet they call on. | Prose owns the discipline and the reason for it; the figure owns the parts and their connections. This is the README's only plugin figure — per-command detail waits for guide/03. |
| **F8 · How to use `sb:map`** | The sequence and the gates — validated, reviewed, signed off by you — and that nothing is written until you accept. | The transformation: a pile of sources on one side, a live blueprint and the files it generates on the other. | Prose owns order and guarantees, which drawings state badly. The figure owns "what you end up holding". |
| **F9 · How to use `sb:slice`** | Why you'd cut a view, who each cut is for, and that slices stay current as cells change. | One dense blueprint becoming three audience-shaped decks, each pointing back. | Prose names audiences; the figure shows subtraction — that a slice is less, not other. |
| **F10 · How to use `sb:audit`** | What the roster checks, that each check runs blind, how findings dedupe, the three triage states, and that nothing is auto-fixed. | Two example conditions visible on the grid, and what the resulting findings list looks like. | Prose owns mechanics and guarantees; the figure owns "what a finding looks like when it lands". |
| **F11 · How to use `sb:whatif`** | That the trace runs on a copy, what protects the sign-off, and how an accepted change is promoted. | The shape of impact — one flagged cell, the cells downstream of it, and the summary that comes back. | Prose owns the guarantees; the figure owns spread — how far a small change reaches. |

## §2 paragraph — updated per your note

Paragraph 1 gains the point that agents increasingly write the documents
too:

> Agents are joining product teams, and what they are handed as context is
> a folder of documents — each written for its own purpose, none describing
> the service end to end. Increasingly the agent wrote them itself: a PRD
> drafted from whatever was in the window at the time, carrying the same
> gaps forward. In our own evaluation the riskiest setup was not an agent
> with no context, but an agent with documents alone — an out-of-date page
> gets restated as current fact.

Paragraphs 2 and 3 unchanged: service design has long built frames for
people to coordinate around a service, the blueprint being the strongest
of them; what changed is the cost of consulting one, which is now low
enough to happen on every question rather than at planning moments.

## Decisions needed

1. ~~#11 keep or cut~~ — KEPT, retitled "How to make use of the blueprint"
   (Bill, 2026-08-08).
2. ~~#5 title~~ — RESOLVED: **"Why blueprint"**.
3. **F1 frequency encoding — the open question, stated properly.** The
   figure has to show that the blueprint is read *rarely* by people and
   *constantly* by an agent. Three ways to draw that, each with a cost:

   - **Ticks on a time axis.** A horizontal line for, say, a quarter, with
     a few marks where the team opens the blueprint (kickoff, a planning
     session, a review) and a dense run of marks for the agent. *Shows a
     rate — reads per unit of time — which is exactly the claim.* Cost: it
     introduces a time axis the rest of the figure doesn't have, and at a
     glance it can look like a chart with data behind it, which there
     isn't.
   - **Query lines into the frame.** No time axis; just a couple of thick
     lines from "the team" and a fan of thin ones from "an agent", both
     landing on the blueprint. *Shows volume and simultaneity, and stays in
     the visual language the rest of the set already uses.* Cost: it says
     "more" but not "more often" — a reader could read it as the agent
     asking bigger questions rather than asking constantly.
   - **Just label it.** Two chips: "opened at planning moments" and "read
     on every question". Cheapest and unambiguous. Cost: it is prose
     wearing a figure's clothes — the contrast is asserted, not shown,
     which is the thing the figure was added to fix.

   My read: **ticks on a time axis**, because rate is the whole point and
   the other two either understate it or state it in words. The chart-like
   risk is manageable — no numbers, no gridlines, no axis labels beyond a
   single "one quarter" at the end.
4. ~~Skill-figure titles~~ — RESOLVED: "How to use `sb:map`" and siblings,
   command rendered in mono inside the title.
