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

**Spec** — the descriptive detail hanging off a board object, as opposed to
its place on the board. `cells.function` / `form` / `value_props` / `owner` /
`perceived_owner`; `phases.business_impact` / `operational_requirements`;
`lanes.kpis` / `owner_team` / `tools`; and `business_model` for the service.
Four levels, one word.

Structure is *where a thing sits* — a cell's lane, step and path — and moves
only through an authoring RPC. Spec is *what it is like*, and carries a
column-scoped grant so a panel can edit it without opening the board's shape to
the same path. That split is why the word is load-bearing: `skills/audit`
instructs an agent to read "the spec columns" and skip gracefully when they are
empty, and until now this file had never heard of them.

**Not a UI word.** The interface says Function, Form, Value, Owner — never
"spec fields". The ban is on the *interface*, not the glossary, and reading it
as both is how a word the skills are told to use went undefined on both sides.

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

**Analysis tier** — the four tables that hold records *about* the board rather
than squares of it: `evidence`, `findings`, `slices`, `slice_items`. What unites
them is aboutness — each exists to say something concerning the board, and none
is part of it. Evidence and findings concern cells directly; a slice reaches
cells through the items it presents. Evidence, findings, and slices are
hard-bound directly to the service; a slice item has no direct service binding
and is hard-bound only to its slice. The exact keys and constraint topology
live in `references/data-model.md`.

**`business_model` is not in the tier**, and the schema settles it rather than
taste: it holds no cell reference of any kind. It is the service's spec row —
which is why it belongs under **Spec** above. Its fields live in
`references/data-model.md`.

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

**One rename in this vocabulary is not in the table**, because it never was an
identifier: **derived layer → analysis tier**. Only `findings` is derived — a
human may author a slice — and `layer` is the spelling `21000104` retired when
`layers` became `lanes`. So a word built on a retired spelling was still being
shipped to agents in `skills/slice/SKILL.md`. Nothing in the catalogue moved,
which is why no migration carries it and no check can enforce it.

`scripts/retired-vocabulary.mjs` is the same map in machine-readable form, and
`scripts/tests/retired-vocabulary.test.mjs` fails if the two disagree. Neither
derives from the other on purpose: a prose table should not be load-bearing for
CI, and a documented map that has drifted from the enforced one is a lie in the
file people read to learn the words.

## Words that keep a retired spelling

Four, and each is a fact about the language rather than a queue. A rename sweep
breaks all four, so they are written where the person running that sweep looks.

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

**"derived layer", inside applied migrations and the changelog.** Two migration
filenames (`20260729120000_derived_layer.sql`,
`20260730090000_derived_layer_grants_hardening.sql`) and ten `--` comments
across five applied files keep the retired words, along with the CHANGELOG
entries for the releases that shipped them.

The rule is the same in both places: **an applied or dated record keeps the
spelling it was written with.** Every instance of this template has already run
those files; rewriting them buys tidiness at the cost of making applied
migrations mutable, which is a precedent worth more than the tidiness. A
changelog entry is the same kind of object — it says what shipped, under the
name it shipped with.

Everything an agent or a reader is *shown* uses the current name. That is the
line: the record keeps its spelling, the instruction does not.
