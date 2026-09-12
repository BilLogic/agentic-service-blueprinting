---
audience: agents
summary: What this blueprint is, how to read a cell, what absence and status mean, and how paths relate to a scenario's main route — the hand-written core — followed by the vocabulary and the schema, rendered from the code and the catalog when a database is connected.
sources: src/lib/panelTerms.ts, src/types/database.ts, public.schema_comments(), scripts/generate-agent-account.mjs
---

# The blueprint, for agents

This document is a deployment's account of the schema, for any agent that
reads it. The first part is written by hand and says what the catalog cannot.
The two parts after it are rendered — from the entity definitions the board
shows a reader, and from the table and column comments in the database — and
`npm run check:agent-account` fails when either source changes and this file
does not.

With no database connected, the generated sections stay empty and this
document is not registered as an agent reference. A deployment that has a
database runs `npm run agent-account` and then registers the result through
`registerReferenceDocs` or `REFERENCE_NAMES_EXTRA`. The template's reference
loader never imports this file by path.

## What it is

A service blueprint is a grid of one service, end to end. Phases run left to
right in time. Each phase holds scenarios: situations the service has to
handle. A scenario is drawn as one or more paths, and each path is a grid of
steps (columns, in that path's order) by lanes (rows: the customer, the staff
they see, the staff they do not, the tools each uses). A cell is what happens
at one lane in one step on one path. Everything else hangs off cells:
resources a cell points at, touchpoint placements, evidence, dependencies
between cells, and slices that cite cells.

## How to read it

Orient at phase and scenario level first, then open one scenario's grid. Read
a cell's `content` as the sentence of record — the thing that happens — and
its `summary` as the longer account. The spec fields (`function`, `form`,
`value_props`, `owner`, `perceived_owner`) say what the moment must do, how it
must feel, who gains, who owns it and who the customer believes owns it. A
step's `summary` is the one sentence that makes the whole column legible; a
lane's `owner_team`, `kpis` and `tools` say who staffs the row and what they
are measured on.

## What absence means

- A cell with no evidence rows is an assumption. Say so when you cite it.
- A cell with no dependency rows has none recorded — report "none recorded",
  which is different from "independent".
- Every cell and path carries a `status`, defaulting to `live`: this is a
  current-state blueprint, and it documents what is in use. Future state is
  read off `status`, and only there — path names carry no convention.
- A placement with a `name` and no `touchpoint_id` is a real tool the
  registry lacks. Treat it as a touchpoint; the registry is the part that is
  behind.
- A cell with no resources points at nothing yet. Report the gap rather than
  guessing at a tool.
- A `null` placement `role` means nobody has judged it — neither core nor
  peripheral.

## What a status licenses you to say

`status` is one vocabulary on cells and paths, the `entity_status` domain:
`proposed`, `planned`, `built`, `live`, `at_risk`, `deprecated`.

- `proposed` — designed and discussed, with no build card behind it. Say "may
  never happen".
- `planned` — committed and carded, no code yet. Say "committed, not started".
- `built` — code exists, in build or QA, nobody uses it. Say "built, not
  deployed".
- `live` — in use today. This is what the service does. The default.
- `at_risk` — live and failing in a way somebody has measured. Say both
  halves.
- `deprecated` — on the way out. Say so, and point at what replaces it if a
  dependency says.

When the question is about today, answer from `live` and `at_risk`. When it is
about the roadmap, answer from `proposed`, `planned` and `built`.

## Paths and the main route

A path's `kind` is `happy`, `variant` or `exception`. The happy path IS the
scenario's main route. A variant is equally normal, chosen by a condition. An
exception is a rule or a failure diverting the route. Nothing connects across
paths: each path owns its lanes and cells, and shares the scenario's steps
through `path_steps` in its own order. A scenario's `layout` is `stacked` or
`merged` — how the board is drawn, a display setting and not a kind.
Dependencies between cells are `leads_to` (this cell makes the other happen,
drawn as an arrow) or `enables` (the other must already be in place).

## The vocabulary

Rendered from `ENTITY_KIND_DEFINITIONS` in `src/lib/panelTerms.ts` — the six
kinds the board defines for a reader who has never seen one. Empty until a
connected database has run `npm run agent-account`.

<!-- generated:vocabulary from src/lib/panelTerms.ts — edit the source, then npm run agent-account -->

<!-- /generated:vocabulary -->

## The schema, as the catalog describes it

Rendered from `pg_description` through `public.schema_comments()`, laid over
the column inventory in `src/types/database.ts`. A dash is a column nobody has
described yet; the coverage ratchets upward in
`docs/engineering/agent-account-baseline.json`. Renaming a column and rewriting
its description are the same migration.

<!-- generated:schema from public.schema_comments() and src/types/database.ts — edit the migration, then npm run agent-account -->

<!-- /generated:schema -->
