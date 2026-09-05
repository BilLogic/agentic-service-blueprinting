# Domain language

Every term this repository uses to mean something particular, defined once.
Definitions only: what a word denotes, not how to use it. Procedure lives in
`docs/`, the schema in `references/data-model.md`, and the routes to both in
`INDEX.md`.

A term is defined here when getting it wrong changes what an agent writes to
the database. Where a term is spelled differently in the database, the
blueprint file and the app, every spelling is given.

**This file is definitions and nothing else.** That constraint is its whole
value: an agent or a person can read it end to end before touching anything,
and it stays readable because it never grows a second job. It said so while
three of its six sections were something else, which is how a promise nothing
enforces ends up. `scripts/check-glossary-only.mjs` holds it there now, so the
sentence has a build behind it rather than a habit.

Three reference sections used to live here and now live where they are
enforced. The rename map is
[`scripts/retired-vocabulary.mjs`](scripts/retired-vocabulary.mjs), the one
list three checks read, and its header carries why each name went and which
renames the word lists deliberately leave out. The four words retired as
identifiers rather than as words are the header of
[`scripts/check-retired-identifiers.mjs`](scripts/check-retired-identifiers.mjs),
beside the exemption list that applies them. Every panel label and the column
behind it is
[`references/interface-schema-map.md`](references/interface-schema-map.md),
generated from the list CI acts on.

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

**Touchpoint** — a thing the service owns that a moment happens through: an
app, a document, a physical object, a channel. One `touchpoints` row per
service and name — the registry — carrying the touchpoint's kind, summary and
home once, not per cell.

**Placement** — one touchpoint used at one cell: a `cell_touchpoints` row with
the summary and role for THAT moment, and the resources it points at hanging
off it. A placement names its touchpoint one of two ways and exactly one — by
`touchpoint_id` into the registry, or by `name` alone.

**Name-only placement** — a placement whose touchpoint the registry lacks. It
is still a placement: drawn dashed on the board, opening the same panel, and
offered "Link to registry" there. Never matched to the entry it resembles by a
rule; the choice is the author's.

**Stakeholder** — an actor in the service: a recipient, staff, a partner, a
provider or a team. One `stakeholders` row per name across the whole
deployment — the cast list — carrying the actor's kind, summary and aliases
once; no service owns one, and a service "has" an actor exactly when one of
its lanes names it (ADR 0003). A lane names its actor by `stakeholder_id`; a
structural lane — the storyboard, the touchpoint rows — names nobody.

**Status** — how far along a cell or a path is, on one shared six-value
vocabulary, the `entity_status` domain: `proposed`, `planned`, `built`,
`live`, `at_risk`, `deprecated`. Default `live` — a current-state blueprint
documents what is in use. Paths share it deliberately; a second vocabulary for
the same question drifts from the first within a month.

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
`A leads_to B` puts the cause. (The `needs` that `21000114000000` retired put it at the target, so
those edges turned around in `21000114000000`.) The panel names each end:
**Follows** and **Leads to** for the drawn kind, **Enabled by** and
**Enables** for the recorded one.

The retired values — `cell_dependencies.kind = 'trigger'` and
`cell_dependencies.kind = 'needs'` — are values, not identifiers, so the
identifier sweep has no fragment to key on and the copy sweep no reader-facing
word: a database *trigger* is a live subject in these documents, and "needs"
is English. `scripts/check-dependency-kinds.mjs` holds them instead, across
every rulebook tree an agent or reader follows — in their code-span form, and
in the short list of phrases where either word can only be a dependency kind
("trigger-vs-needs", the slashed pair, either word beside "edge"), which is
what caught the two documents that spelled the pair with no backticks at all.

The same is true of `scenarios.layout = 'side-by-side'`,
`scenarios.layout = 'integrated'`, `paths.kind = 'unhappy'` and
`paths.kind = 'alternative'`, which `21000116000000` folded into `stacked`,
`exception` and `variant`, of `scenarios.layout = 'single'`, which
`21000117000000` folded into `stacked`, and of `resources.kind = 'other'`,
which `21000118000000` folded into `attachment`: values, so no fragment and
no copy word. `cell_touchpoints.url` and `cell_touchpoints.screenshots`, which
`21000119000000` moved into `resources` as a featured link and attachments,
retire no fragment either: `url` is a live column on `resources`, and
"screenshots" is English wherever a render check takes them.
`scripts/value-set-claims.mjs` holds them — a list in any swept document
that names one is stale, unless the sentence records the retirement and
cites the migration — and holds every documented value set to the CHECK
that defines it, read off the schema dump.

## What the skills produce

**Records about the board** — `evidence`, `findings`, `slices`, `slides` hold
what is said *concerning* the board rather than squares of it. Evidence and
findings concern cells directly; a slice reaches cells through the slides it
presents. Evidence, findings and slices are hard-bound to the service; a slide
has no direct service binding and is hard-bound only to its slice. The exact
keys and constraint topology live in `references/data-model.md`.

**There is deliberately no collective noun for the four.** Two were tried and
both claimed something untrue of half the set;
[`scripts/retired-vocabulary.mjs`](scripts/retired-vocabulary.mjs) records
which, and why. What they have instead is an OWNER, and the write surface says who — because a
table's owner is whoever may change it, not whoever reads it most:

| record | written by | belongs to |
| --- | --- | --- |
| `slices`, `slides` | `create_slice`, `update_slice`, `replace_slides` | the slice |
| `audit_findings` | `create_finding`, `update_finding` | the audit |
| `evidence` | `create_evidence`, `update_evidence` | the cell |

**Evidence belongs to the cell**, not to whichever reader reaches for it. It
is research provenance — recorded when a blueprint is imported, cited by a
slice, weighed by an audit — and no ONE reader's work is what it is for, so
naming it after the audit would be wrong in the direction a slice would notice
first. The cell is the claim the source grounds, and it is the one thing every
evidence row the agent can write names.

That row said **nobody** until the agent gained `create_evidence` and
`update_evidence`, and "nobody" was a fact about the roster rather than a
position: the panel was the only writer, so no tool named the table. The
moment one did, the honest answer had to be a real owner — which is what
rule 2 of `who-writes-what` exists to force.

So write the owner you mean — *the slice's record*, *the audit's findings*,
*the cell's evidence*. Where a statement genuinely covers all four — a grant, a
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

## The writing vocabulary

Five words for how a document is written and reached, shared with the
deployment this kit was generalised from so that one harness review of both
repositories uses one language.

**Pointer** — a line held in always-loaded context that names material outside
it and the branch that should reach it: a row of `AGENTS.md` § Skill routing, a
path beside a rule that holds for every skill. Its wording, not its target,
decides whether a session gets there. What a pointer points at is a
*reference* — which in this repository is also the name of a folder, and
`references/` is exactly that: the rulebook a skill reaches by pointer.

**Ladder** — where a piece of writing sits by how immediately a session needs
it: an in-file step, then an in-file reference, then a **disclosed** reference
behind a pointer. A skill's `SKILL.md` is the top rung of its own ladder, and
the reference files it names are the rungs below.

**Disclosed** — a reference pushed out of the always-loaded tier and behind a
pointer, loaded only when that pointer fires. Everything under `docs/`,
`skills/` and `references/` is disclosed; `AGENTS.md` is the tier itself, and
`scripts/always-loaded.mjs` is the list that says which is which.

**Leading word** — the first word of a routing item, chosen so that it is the
word carrying the branch — *vocabulary*, *routing*, *editing* — and front-loaded
so a scanned pointer triggers on it. `scripts/check-pointers.mjs` is what holds
it there.

**Sprawl** — a document too long even when every line of it is live: attention
thins across the whole of it. The cure is the ladder rather than a shorter
sentence. Distinct from *bloat*, which is dead weight.
