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

**Not a UI word.** The interface says Function, Form, Value proposition,
Owner — never "spec fields". The ban is on the *interface*, not the glossary,
and reading it as both is how a word the skills are told to use went undefined
on both sides.

**Line of visibility** — the divider between what the recipient of the service
can see and what they cannot. It is derived from lane roles rather than
stored: it draws below the last customer-facing lane. Its companion, the
**line of interaction**, draws below the lane holding the recipient's own
actions, and separates what the recipient does from what the service does.

**Dependency** — a directed edge from one cell to another on the same path.
Two kinds, and the difference between them is whether the edge draws.

**Leads to** — the drawn kind (`kind = 'leads_to'`): this cell makes that one
happen. A handoff, rendered as an arrow.

**Enables** — the recorded kind (`kind = 'enables'`): this cell makes that one
possible without causing it. A precondition, never drawn, because a blueprint
in which every relationship is an arrow cannot be read. Both kinds read
source-first: `A enables B` puts the precondition at the source, the same end
`A leads_to B` puts the cause. (The retired `needs` put it at the target, so
those edges turned around in `21000114000000`.) The panel names each end:
**Follows** and **Leads to** for the drawn kind, **Enabled by** and
**Enables** for the recorded one.

The retired values — `cell_dependencies.kind = 'trigger'` and
`cell_dependencies.kind = 'needs'` — are values, not identifiers, so the
identifier sweep has no fragment to key on and the copy sweep no reader-facing
word: a database *trigger* is a live subject in these documents, and "needs"
is English. `scripts/check-dependency-kinds.mjs` holds them instead, in their
code-span form, across every rulebook tree an agent or reader follows.

## What the skills produce

**Records about the board** — `evidence`, `findings`, `slices`, `slides` hold
what is said *concerning* the board rather than squares of it. Evidence and
findings concern cells directly; a slice reaches cells through the slides it
presents. Evidence, findings and slices are hard-bound to the service; a slide
has no direct service binding and is hard-bound only to its slice. The exact
keys and constraint topology live in `references/data-model.md`.

**There is deliberately no collective noun for the four.** Two were tried and
both claimed something untrue of half the set; the rename map below records
which, and why. What they have instead is an OWNER, and the write surface says who — because a
table's owner is whoever may change it, not whoever reads it most:

| record | written by | belongs to |
| --- | --- | --- |
| `slices`, `slides` | `create_slice`, `update_slice`, `replace_slides` | the slice |
| `findings` | `record_finding`, `set_finding_status` | the audit |
| `evidence` | no agent tool at all — the panel writes it | **nobody** |

**Evidence is the one with no owner**, and here that is visible in the roster
rather than argued: nothing in `WRITE_TOOL_NAMES` writes it. It is research
provenance — recorded when a blueprint is imported, cited by a slice, weighed
by an audit — and no ONE reader's work is what it is for. Naming it after the
audit would be wrong in the direction a slice would notice first.

So write the owner you mean — *the slice's record*, *the audit's findings*,
*evidence*. Where a statement genuinely covers all four — a grant, a
migration's scope — enumerate them, which is four words against a category name
that has twice had to be replaced.
`scripts/tests/who-writes-what.test.mjs` holds the table above against
`WRITE_TOOL_NAMES`, so a renamed tool or a new write with no owner fails
`npm test` rather than leaving this table quietly wrong.

**`business_model` is not one of them**, and the schema settles it rather than
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
| `cell_dependencies.kind = 'trigger'`, `cell_dependencies.kind = 'needs'` | `cell_dependencies.kind = 'leads_to'`, `cell_dependencies.kind = 'enables'` | `21000114000000` |

The reasoning, where it is worth knowing. `row` and `column` named how a lane
and a step happen to be *drawn* today, and the axis is a rendering fact rather
than a domain one. "Lifecycle" was not a level above the service — it *was* the
service, wearing a longer name. `enables` was left alone, because it was already
the plain word for what it means.

**One rename in this vocabulary is not in the table**, because it never was an
identifier and because it ended in no word at all. `evidence`, `findings`,
`slices` and `slides` were the **derived layer**, then the *analysis tier*, and
are now four records with an owner each — the table under "What the skills
produce" above. Both collective nouns failed the same way, by claiming
something untrue of half the set:

- *derived layer* — only `findings` is derived; a person may author a slice.
  And `layer` is the spelling `21000104000000` retired when `layers` became
  `lanes`, so the word was built on a word this template had withdrawn. It was
  still being shipped to agents in `skills/slice/SKILL.md`.
- *analysis tier* — evidence is source material and a slice is a presentation
  for an audience. Neither is analysis. It also collided with `tier`, which
  already means an access level here (`20260818002000_service_account_tier`),
  so one word named both what a reader may write and what they may write it
  to.

Nothing in the catalogue ever moved, which is why no migration carries either
word. What enforces the replacement is not this vocabulary map but the write
surface: `scripts/tests/who-writes-what.test.mjs` holds the ownership table
against `WRITE_TOOL_NAMES`, so a renamed tool or an unowned new write fails
`npm test`. That is the check neither collective noun ever had — both were
adopted, both went stale, and nothing anywhere noticed.

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
| **Follows** | `cell_dependencies.kind` | Names a VALUE read from one end rather than a column: these rows are `kind = 'leads_to'` arriving. The schema stores one row and the panel shows it twice, once from each end, so the label has to say which end a reader is standing at — and no column could be called this. |
| **Leads to** | `cell_dependencies.kind` | The same value from the other end — `kind = 'leads_to'` leaving, and here the label IS the value minus its underscore. What the pair carries that `kind` cannot is the direction, which is why the arriving end keeps a word of its own. |
| **Enabled by** | `cell_dependencies.kind` | The recorded kind, arriving — `kind = 'enables'` with this cell as the target. The same one-row-two-ends rule as Follows: without its own word, a reader standing at the target reads "Enables › A" as this cell enabling A, the exact inversion the rename ended. |
| **Enables** | `cell_dependencies.kind` | The word IS the value — `kind = 'enables'` leaving, the recorded dependency that never draws — and `kind` is the name of the place holding it. |
| **Tech in this step** | `cells.content` | Not a field of anything: it heads the technology standing in the same step that nothing on this cell points at, and each item under it is one line parsed out of a tech cell's content. `content` names where the words live; the label names which cells they came from. |
| **Evidence** | `evidence` | — |
| **Resources** | `resources` | — |

Six rows out of fourteen carry a reason, and each one is a decision rather
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

**`Resources` was the sharp one, and the answer to it was not a rename.**
`cells.links` carried two things a reader meets under two names — the `url`
entries the Resources tab lists, and the `tech_description` entries the grid
draws as a touchpoint's prose. One column, two concepts, named after neither.
No label could fix that: `Links` over the tab would promise both and show one,
and `Resources` on the column would be wrong for half its rows. So the map
carried the divergence as a recorded decision and said the fix would be a
schema change rather than a naming one.

`21000113000000` made that change. `resources` holds what a cell — or one
touchpoint placement — points at, `cell_touchpoints` holds the per-moment
summary, screenshots and design link, and `cells.links` is gone. **The row that
carried the reason is deleted rather than rewritten**, which is what that
promise meant: `Resources` and `resources` are the same word, so the row that
remains is an aligned one like `Evidence`, and rule 4 forbids it a reason. The
label stays in the map because every panel label must — a word nobody bound to
a name is the defect the map exists to catch — but the divergence it was
holding open has stopped existing rather than acquired a better excuse.

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

Four, and each is a fact about the language rather than a queue. A rename sweep
breaks all four, so they are written where the person running that sweep looks.

**`slices.description`.** `21000108` renamed `description` to `summary` on the
five tables where it named a one-line précis of a thing. A slice's description
is not that — it is prose the author writes *about* the slice. The word was
right in one place and wrong in five, so five moved. `tech_description`, a link
type, was untouched for the same reason, and is now gone with the column that
held it — `21000113000000` moved that prose onto `cell_touchpoints.summary`,
where it is the one-line précis the word `summary` names. Because the word is
still live on `slices`, the
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
