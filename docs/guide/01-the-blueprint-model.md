---
summary: What you are looking at when you open a blueprint — the hierarchy from service to cell, how lanes and steps make the grid, what a single cell holds, and where the interaction and visibility lines come from.
---

# The blueprint model

**For** anyone who will read or author a blueprint.
**Answers** what exactly am I looking at?

## 1. The hierarchy

![How a blueprint is organized](../assets/data-model-hierarchy.svg)

A **service** holds ordered **phases**. A phase can loop back to an
earlier one (`loops_to_phase_id`), which is how renewals and repeat visits
are modelled without duplicating the journey.

A phase holds **scenarios** — the distinct situations a customer can be in.
A scenario holds **paths**: variants of the same situation, such as the
happy path and the one where the payment fails.

**Steps are scenario-scoped columns.** They are canonical per scenario;
each path *includes* a subset of them and assigns its own column order
through `path_steps` (the full model is in
[`references/data-model.md`](../../references/data-model.md)). Two paths in one scenario therefore
line up column by column, which is what makes side-by-side comparison
meaningful rather than approximate.

## 2. Lanes and roles

![Inside a single path](../assets/blueprint-anatomy.svg)

Lanes are rows, one actor each. Steps are columns, time running left to
right. Rendering is driven by `lanes.lane_role`, a semantic key, never by
the lane's display name — so lane labels are free-form, in any language,
and a blueprint in Chinese renders exactly like one in English.

| `lane_role` | Row |
| --- | --- |
| `customer_actions` | what the customer does |
| `frontstage_actions` | what staff do in view of the customer |
| `frontstage_tech` | the customer-facing systems |
| `backstage_actions` | what staff do out of view |
| `backstage_tech` | the systems behind them |
| `support_systems` | what everything else rests on |
| `visual` / `step_visual` | imagery attached to a step |

Custom roles and `null` render as generic swimlanes. The **line of
interaction** and **line of visibility** are derived from these roles
rather than drawn by hand, so they cannot drift out of agreement with the
lanes they separate.

## 3. Cells

![Inside a single cell](../assets/cell-anatomy.svg)

A cell is what one actor does at one step. Beyond its content it carries:

- **Owner** and **perceived owner.** Kept separately because the
  interesting case is when they differ: the customer thanks a team that was
  not accountable for the moment.
- **Function, form, value proposition.** What it has to accomplish, how it
  comes across, and who gets what from it.
- **Dependencies.** `Set off by` and `Sets off` are the arrows drawn on the
  grid. `Needs` is a dependency with no arrow: the cell cannot happen
  without it, but it is not what triggers it.
- **Evidence.** The sources the cell rests on. A cell with none reads as an
  assumption, which is a finding rather than a gap in the tooling.
- **Resources.** What the cell points at — one row each, with a name and a
  url. A resource can belong to one touchpoint on the cell rather than to the
  cell at large, so a design link documents the tool it is about.
- **Slices.** Which slices quote this cell.

## 4. Slices

![Types of slices](../assets/slicing-model.svg)

A slice is a lens on the blueprint, not a copy of it. Its frames point at
live cells, so updating a cell updates every slice that quotes it, and a
re-import leaves slices intact because they refer to cells by key rather
than by position.

Five ways to slice, from `slice-schema.json`:

| Type | What it holds |
| --- | --- |
| `journey` | one actor's path, summarized |
| `step` | one step, top to bottom across every lane |
| `lane` | one lane, left to right across the service |
| `cell` | one cell, in full |
| `custom` | whatever the question needs |

Each has a document template in
[`skills/slice/references/slice-templates.md`](../../skills/slice/references/slice-templates.md).

A slice is read in two places: **on the canvas**, where it is the blueprint
with everything else dimmed, and **in presentation**, one frame at a time
on a dark surface with a filmstrip and a locator. Same slice, two ways of
looking at it.

## 5. View modes

Per scenario: `single`, `side-by-side` (any set of labelled variants, such
as designed versus reality), and `integrated` (a runtime merge of the
paths). Comparison is per slot, so a difference in one cell is a difference
you can point at.
