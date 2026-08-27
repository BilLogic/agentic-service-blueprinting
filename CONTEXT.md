# Domain language

Every term this repository uses to mean something particular, defined once.
Definitions only: what a word denotes, not how to use it. Procedure lives in
`docs/`, the schema in `references/data-model.md`, and the routes to both in
`INDEX.md`.

A term is defined here when getting it wrong changes what an agent writes to
the database. Where a term is spelled differently in the database, the
blueprint file and the app, every spelling is given.

## The blueprint

**Service** — the whole thing being blueprinted, and the top container. One
service per deployment, normally.

**Phase** — an ordered stage of a service. A phase may point back at an
earlier phase (`loops_to_phase_id`), which is how a renewal or a repeat visit
is modelled without duplicating the journey.

**Scenario** — a situation within a phase, and the unit a reader navigates.
A scenario owns its steps and its paths.

**Path** — one route through a scenario. A path is named for the *condition*
that routes you down it, never for the activity — the scenario already said
that. Exactly one path per scenario is the `happy` route, the one taken when
nothing intervenes; the others are a `variant` (a different but equally valid
route) or an `exception` (a route taken because something went wrong).

**Step** — a column. Steps are scenario-scoped and shared across the paths of
that scenario; a path selects the steps it uses and their order.

**Lane** — a row, holding one actor's activity across the steps. A lane's
display label is free text in any language; its behaviour comes from a
separate semantic role key (`lane_role`), which is what decides colour,
whether cells render as pills, and where the dividing lines fall.

**Cell** — what one actor does at one moment: the content at the intersection
of a lane and a step on a path. A cell is the unit everything else points at
— a slice quotes cells, a finding names cells, evidence attaches to a cell.

**Line of visibility** — the divider between what the recipient of the service
can see and what they cannot. It is derived from lane roles rather than
stored: it draws below the last customer-facing lane. Its companion, the
**line of interaction**, draws below the lane holding the recipient's own
actions, and separates what the recipient does from what the service does.

**Dependency** — a directed edge from one cell to another on the same path.
Two kinds, and the difference between them is whether the edge draws.

**Trigger** — the drawn kind (`kind = 'trigger'`): this cell makes that one
happen. A handoff, rendered as an arrow.

**Need** — the recorded kind (`kind = 'needs'`): the other cell must already
be true for this one to happen. A precondition, never drawn, because a
blueprint in which every relationship is an arrow cannot be read. A need is
not the inverse of a trigger — "follows" is a trigger read from the far end,
and a precondition causes nothing.

## What the skills produce

**Slice** — a saved one-dimensional cut through the grid, taken for one
audience: an actor's journey, a single moment, one lane, one cell, or a custom
selection. A slice *references* the cells it presents and never copies them,
so the blueprint stays the single source of the text.

**Finding** — one triageable observation about a blueprint, raised by a
consistency check or a change trace. A finding carries a severity, the cells
it concerns, and a triage state: open, resolved, or dismissed. It is a claim
about the blueprint, not a change to it — nothing acts on a finding until a
person triages it.

**Evidence** — one provenance record attached to a cell: where the claim in
that cell came from, and when it was observed. A cell with no evidence is an
assumption; that state is derived from the absence of evidence rows and is
never stored as a flag.

## The rename map

Seven renames landed across `21000103`–`21000111`. They are recorded here
because this is the file a person reads to learn the vocabulary, and because a
sweep that catches every occurrence of a retired word needs to know which
occurrences are not residue.

**These are the current names.** An `alter table … rename` moves the table and
the column and nothing else — the index, the constraint, the policy, the
trigger, the comment and every plpgsql body keep the name they were created
with. `21000102`'s `__rename_schema_objects` moved those from the catalogue
rather than from a hand-written list, and `scripts/check-retired-identifiers.mjs`
now checks that nothing came back.

| Was | Is | Migration |
|---|---|---|
| `layers`, `layer_role`, `cells.layer_id` | `lanes`, `lane_role`, `cells.lane_id` | `21000104000000` |
| `cell_triggers` | `cell_dependencies` | `21000103000000` |
| `service_lifecycles`, `*_service_lifecycle_id` | `services`, `service_id` | `21000106000000` |
| `service_scenarios`, `*_service_scenario_id` | `scenarios`, `scenario_id` | `21000107000000` |
| `row_position`, `column_position`, `slot_position`, `order_position` | `position` | `21000105000000` |
| `description` | `summary` | `21000108000000` |
| `propositions` | `business_model` | `21000111000000` |

The reasoning, where it is worth knowing. `row` and `column` named how a lane
and a step happen to be *drawn* today, and the axis is a rendering fact rather
than a domain one. "Lifecycle" was not a level above the service — it *was* the
service, wearing a longer name. `enables` was left alone, because it was already
the plain word for what it means.

`scripts/retired-vocabulary.mjs` is the same map in machine-readable form, and
`scripts/tests/retired-vocabulary.test.mjs` fails if the two disagree. Neither
derives from the other on purpose: a prose table should not be load-bearing for
CI, and a documented map that has drifted from the enforced one is a lie in the
file people read to learn the words.

## Words that keep a retired spelling

Three, and each is a fact about the language rather than a queue. A rename sweep
breaks all three, so they are written where the person running that sweep looks.

**`slices.description`.** `21000108` renamed `description` to `summary` on the
five tables where it named a one-line précis of a thing. A slice's description
is not that — it is prose the author writes *about* the slice. The word was
right in one place and wrong in five, so five moved. `tech_description`, a link
type, is untouched for the same reason. Because the word is still live, the
`description` row of the map above enforces **no** identifier fragment at all;
`21000108` carries its own assertion instead.

**`evidence.proposition_question_key`.** `propositions` became `business_model`
because that word already meant a *cell's* value proposition. This column is not
that table: it records which of the three validation questions an evidence row
answers — `understand`, `value`, `usability` — and those three are propositions
in the ordinary sense, claims the service is betting on. The rename moved the
container, not the concept. The enforced map keys on the **plural**, so nothing
has to be exempted to keep this.

**`CanvasAnnotationLayer`.** A rendering layer, unrelated to the lane the
blueprint draws. `21000104` says so in its own header. It is a frontend
identifier rather than a database name or anything a reader sees, so no check
that reads the map above can reach it.
