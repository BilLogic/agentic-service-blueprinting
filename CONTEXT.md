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

## The interface→schema map

Every word a panel puts in front of a reader, and the name behind it. The
rename map above records the words that **changed**; this records what every
current word is **bound to**, the agreements included. A table of divergences
alone cannot say that the rest are fine — "not listed" would mean both
"aligned" and "nobody looked", and that ambiguity is the state
[#89](https://github.com/BilLogic/agentic-service-blueprinting/issues/89) was
raised about: *"how come we have inconsistent naming from front and backend
again (i.e., resources vs. links)?"* The complaint was never that the words
differ. It was that no document said which of the differences were on purpose.

The interface word is a **panel label** — the `label` and `title` props of the
four components that put a field's name in front of a reader, plus the cell
panel's tab table. The schema word is a `table.column`, or a bare table where
the label heads a whole relation rather than one field of it. The two **agree**
when they are the same word once case, spaces and a foreign key's `_id` are set
aside; singular and plural agree too, because the label over a relation names
the thing and the table names the collection. Anything further apart than that
owes the third column a reason.

| The interface says | The schema says | Why they differ |
|---|---|---|
| **Content** | `cells.content` | — |
| **Summary** | `cells.summary` | — |
| **Owner** | `cells.owner` | — |
| **Perceived owner** | `cells.perceived_owner` | — |
| **Function** | `cells.function` | — |
| **Form** | `cells.form` | — |
| **Value proposition** | `cells.value_props` | `props` abbreviates this exact phrase and no other. A label is read once and a name is typed daily, so the panel spells out what the schema shortens. |
| **Dependencies** | `cell_dependencies` | The relation names both ends, because a dependency always runs from one cell to another. The tab is already standing inside a cell, so the prefix would be the one word on it that told a reader nothing. |
| **Set off by** | `cell_dependencies.kind` | Names a VALUE read from one end rather than a column: these rows are `kind = 'trigger'` arriving. The schema stores one row and the panel shows it twice, once from each end, so the label has to say which end a reader is standing at — and no column could be called this. |
| **Sets off** | `cell_dependencies.kind` | The same value from the other end — `kind = 'trigger'` leaving. Renaming the pair to the glossary's word, Trigger, would trade one non-column word for another and close no divergence; what the two labels carry that `kind` cannot is the direction. |
| **Needs** | `cell_dependencies.kind` | The word IS the value — `kind = 'needs'`, the recorded dependency that never draws — and `kind` is the name of the place holding it. This is the row of the three whose label the schema already says out loud. |
| **Tech in this step** | `cells.content` | Not a field of anything: it heads the technology standing in the same step that nothing on this cell points at, and each item under it is one line parsed out of a tech cell's content. `content` names where the words live; the label names which cells they came from. |
| **Evidence** | `evidence` | — |
| **Resources** | `cells.links` | One column, two interface concepts. The tab lists the entries typed `url`; the entries typed `tech_description` are the touchpoint prose the grid draws, and a tab called Links would promise both and show one. Splitting the column so each concept has its own name is a schema change rather than a naming one, and until that lands the label names the subset it shows. |

Seven rows out of fourteen carry a reason, and each one is a decision rather
than an accident. That is the claim the table exists to make checkable, and
[`scripts/tests/labels-name-their-columns.test.mjs`](scripts/tests/labels-name-their-columns.test.mjs)
checks it four ways: every panel label has a row, every row is a label some
panel still says, every row names something the schema has, and a divergent row
carries a reason while an aligned row does not. The last pair is the one worth
stating out loud. A reason recorded about a label that never diverged reads as
a decision and settles nothing, and a reason column with decoration in it is a
column readers learn to skip — taking the real ones with it.

**Two labels were renamed rather than reasoned about**, which is the other half
of what this table is for. The panel said **Text** where the column is
`cells.content`, and **Value** where it is `cells.value_props`; both columns
were already right while the words above them were not, so the labels now say
Content and Value proposition. Neither is a migration — a label rename moves
words on a screen — and neither needs a row in the rename map above, which
records what the *schema* was called.

**`Resources` is the sharp one, and the answer to it is not a rename.**
`cells.links` carries two things a reader meets under two names — the `url`
entries the Resources tab lists, and the `tech_description` entries the grid
draws as a touchpoint's prose. One column, two concepts, named after neither.
No label can fix that: `Links` over the tab would promise both and show one,
and `Resources` on the column would be wrong for half its rows. The fix is a
schema change — a table of its own for each concept, which means a migration, a
regenerated `src/types/database.ts`, an IR schema revision and every skill that
writes a link — and that is deliberately **not** in scope here, where the ask
was a map and a check that keeps it honest. The row above converts the
divergence from an accident into a recorded decision today; the split, when it
comes, deletes that row rather than editing it.

**The subject is panel labels, and that is narrower than "words on screen" on
purpose.** *Line of visibility* and *line of interaction* reach a reader as
drawings rather than as the name of a field, and are derived from lane roles at
render time, so there is nothing to bind them to. So it is for every heading
that names a view rather than a field. A word that heads no field has no name
to be bound to, and a rule pretending otherwise would be a rule nobody could
satisfy — which is the failure mode that gets a check deleted rather than
fixed.

**The enforced half is a second list, deliberately, exactly as the rename map's
is.** `LABEL_COLUMNS` in that test file is what CI reads; this table is what a
person reads; neither derives from the other, and a parity test fails when they
disagree — verbatim, reason text included, so editing one cell in one place
goes red.

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

**`evidence.proposition_question_key`, and the label above `cells.value_props`.**
`propositions` became `business_model` because that word already meant a *cell's*
value proposition. The column is not that table: it records which of the three
validation questions an evidence row answers — `understand`, `value`,
`usability` — and those three are propositions in the ordinary sense, claims the
service is betting on. The rename moved the container, not the concept.

Both enforced lists key on the **plural**, so nothing has to be exempted to keep
either. The identifier list always did. The copy list held the singular as well
until the interface→schema map above had to name `cells.value_props`, which
abbreviates "value proposition" and nothing else: a guard that flagged that
label would have pushed a reader away from the name of the column they were
editing. `scripts/tests/retired-copy.test.mjs` asserts the split — the plural
still flagged on screen, the singular deliberately not — so the shorter list
reads as the decision it is rather than as a word someone quietly dropped.

**`CanvasAnnotationLayer`.** A rendering layer, unrelated to the lane the
blueprint draws. `21000104` says so in its own header. It is a frontend
identifier rather than a database name or anything a reader sees, so no check
that reads the map above can reach it.
