---
title: Docs information architecture — post-migration structure, per-doc outlines, README narrative
type: plan
status: draft-for-review
date: 2026-08-08
revised: 2026-08-08 (round 2 — Bill: soften the thesis, define See-it-live, clean up the arc, simplify the tree)
relates:
  - docs/plans/2026-08-08-001-plan-migration-v2-uno-parity.md (Phase 4 executes this)
  - docs/plans/2026-08-08-002-plan-docs-asset-revamp.md (the figures this IA houses)
---

# Docs IA — the end state after Migration v2

## The whole structure at a glance

```
README.md          the front door — carries the full story (below)
AGENTS.md          agent boot file (router + access rules), ~80 lines
docs/
  INDEX.md         one-page map: every doc, the question it answers
  guide/
    01-the-blueprint-model.md      what a blueprint is, in detail
    02-using-it-in-practice.md     the scenarios, the four ways in, presenting
    03-the-plugin.md               skills, agents, pipeline, your own backend
    04-operations.md               deploy, Supabase recipe, access, upgrading
  assets/          all SVGs (moved from docs/ root)
  plans/ notes/    history — append-only, unchanged
references/        the AGENT-facing layer — unchanged; INDEX explains the split
supabase/DATABASE.md   stays with the schema; gains migration-authoring notes
```

That's it: **README + four numbered guides + INDEX.** Guides are numbered in
reading order; each absorbs what round 1 spread across 15 small pages.
Principles carried from uno's IA plan: three layers never mixed
(reference / history / queue); code owns facts, docs own intent; frontmatter
(`audience · summary · sources · last-reviewed`) on every guide. Sections
gated on unported features carry `[P2]` (frontend port) / `[P3]` (agent +
eval) tags — everything untagged is writable now.

Deliberately absent: audience-split dirs (uno has four internal audiences;
the kit has one adopter wearing different hats — the guides ARE the hats),
an engineering/ tree (adopters extend, they don't maintain our codebase),
and a decisions/ layer for now (plans/ + INDEX carry the "why" until
adopters actually ask — revisit at publish).

## README — the narrative

The arc in one sentence: **why this exists → see it → understand it →
recognize yourself in it → how it's made → run it.**

~160 lines of prose, 5 inline figures (the asset-plan budget). Where each
of the ten figures lives is listed at the end of this section.

### 1. Header (~8 lines)

Name + the keeper paragraph ("stops being a poster and becomes a
database"). Two bullets naming what's in the box — the `sb` plugin, the
app template — links only, one line each. No skill names yet.

### 2. Why now (~22 lines · figure: `why-now.svg`)

The thesis, three beats mirroring the figure, **plus the plain definition
early** so a reader who's never seen a blueprint can follow everything
after:

- Agents are becoming team members, and teams feed them piles of documents.
  Documents describe parts of the product, not the end-to-end service — in
  our eval, documents alone made the agent *confidently wrong*.
- Service design **has spent decades on a version of this problem** —
  making a service understandable to the people who deliver it. *(Softened
  per review: "has long practiced," "developed a strong form for," never
  "already solved.")* Its central tool is the service blueprint: **one map
  of the whole journey — what the user experiences frontstage, and the
  people, processes, and systems backstage that make it work.** ← the plain
  definition, two sentences, right here. Its known limitation: rich but
  heavy — consulting one takes facilitation and context, so in practice it
  comes off the wall a few times a year.
- An agent is a new participant in the service, and it doesn't share that
  limitation: stored as structured data, the blueprint becomes something
  both the team and its agents consult continuously — a shared lens, not a
  poster.

Ends with the case-study link for the full argument + eval ladder.

### 3. See it live (~12 lines · one hero screenshot, not a drawn figure)

Now the reader knows what they're looking at (that was §2's job — this is
the ordering answer: plain definition BEFORE the demo, detailed model
after). Contents, concretely:

- **A hero screenshot** of the deployed PLUS blueprint (real UI, one
  canonical shot — the only screenshot in the README).
- **The link**, one line of framing: the in-house blueprint this template
  was generalized from.
- **Three "try this" bullets**: click a phase and open a scenario · flip
  between paths (or compare them side by side) · open a cell and read what
  sits behind the moment.

No demo-recording placeholders here — recordings land inside §5's
scenarios when they exist (asset plan: one per practice scenario).

### 4. The blueprint model (~25 lines · figures: `data-model-hierarchy.svg`, `blueprint-anatomy.svg`)

The nitty-gritty §2's definition deferred: how a blueprint is actually
organized. Hierarchy figure (lifecycle → phase → scenario → path), three
bridging sentences, anatomy figure (lanes × steps, cells, triggers, the two
lines — with the new role-legend strip). Two bullets survive from today's
"Key semantics": layer_role in one line (the legend now carries it) and
view modes in one line, naming compare as first-class practice ("designed
vs. reality, current vs. proposed, side by side"). Everything deeper —
cells' spec fields, evidence/findings, slices, steps-scoping, import order
— is one link: guide/01.

### 5. When your team reaches for it (~30 lines · figure: `practice-scenarios.svg`)

The heart. Four vignettes under the figure, 3–4 lines each, locked order:
**ground a product decision → compare paths → align stakeholders → keep it
honest.** Each: the situation in the reader's words → what the blueprint
does for it → link to the guide/02 walkthrough. Demo recordings embed per
vignette when produced.

Closes with the three-ways line as prose — *"every one of these runs three
ways: click through the app, ask the in-app agent, or work from your IDE"*
— the README's only agent mention above §6. Agent stays the bonus.

### 6. How blueprints get made (~15 lines · figure: `skill-workflow.svg`)

One figure of machinery depth: install the plugin, ask for a map. The
authoring loop (draft → review → sign off → import → verify) and the living
loop (slice → audit → what-if → promote → re-import). The four skills are
named here for the first time, one clause each. Everything deeper — the
architecture figure, the pipeline, agents, gates, other backends — is one
link: guide/03. (Today's "How it works" subsection and the
skill-architecture figure move out of the README entirely.)

### 7. Get set up (~25 lines)

Today's section, structurally kept: no-DB quickstart → add a database →
deploy → connect your agents. Edits: "Connect your agents" reframes the
Supabase-MCP path as one recipe among adapters, not "the deployed blueprint
is a Supabase project"; exposure note stays, links guide/04 for the tier
model `[P2]`.

### 8. Reference (~12 lines)

Corrected scripts table (+ audit_tools, slice_tools) · corrected repo map
(4 skills, 5 agents, styles pointer post-port) · closing line: "full map in
docs/INDEX.md".

**Figure placement summary** — README inline (5): why-now · hierarchy ·
anatomy · practice-scenarios · skill-workflow. Guides: cell-anatomy +
slicing-model → guide/01 · four-ways-in → guide/02 · skill-architecture +
from-docs-to-blueprint → guide/03. Plus the §3 hero screenshot (not part of
the SVG set).

## The four guides — outlines

Each guide: H1 + a two-line "who this is for / what it answers" header,
then the sections below. Budgets are ceilings.

### guide/01 — The blueprint model (~180 lines · figures: cell-anatomy, slicing-model; re-embeds hierarchy + anatomy)

For anyone who'll read or author a blueprint. Answers: *what exactly am I
looking at?*

1. **The hierarchy** — lifecycle → phases (incl. loops back) → scenarios →
   paths; steps as scenario-scoped columns shared across paths (absorbs
   `docs/scenario-steps-design.md`; that file retires).
2. **Lanes and roles** — the full eight-role table (README's legend strip,
   expanded), free-form labels/any language, custom + null fallback, the
   two derived lines.
3. **Cells** *(figure: cell-anatomy)* — spec fields with one good/one bad
   example each · triggers vs needs and when to use which · evidence and
   assumption-as-absence · findings + open/dismissed/resolved lifecycle.
   Persistence-honesty note until Migration v2 P1, then deleted.
4. **Slices** *(figure: slicing-model)* — what a slice is (a view, not a
   copy; soft refs survive re-import) · five types with a use case each ·
   frames and ordering · Design vs Present postures · `[P2]` composer
   walkthrough.
5. **View modes** — single / side-by-side / compare vocabulary.

### guide/02 — Using it in practice (~150 lines · figures: practice-scenarios re-embed, four-ways-in)

For the designer/PM deciding whether — and how — this fits their week.
Answers: *what do I actually do with it?*

1. **The four scenarios, walked** — one H2 each, README vignettes expanded:
   situation → walkthrough in the app → the same move via agent (IDE +
   in-app, one paragraph — the bonus beat) → what good looks like.
   Compare-paths section speaks service-design vocabulary explicitly.
   Demo recordings embed here.
2. **Four ways in** *(figure: four-ways-in)* — browse · in-app agent `[P3]`
   · IDE skills · external MCP; per way: who it's for, what it can do,
   smallest example. Enforcement footnote table → guide/04.
3. **Presenting and sharing** — present a slice · print/PDF · deep links
   `[P2]` · read-only public deploy as the share-out default.

### guide/03 — The plugin (~180 lines · figures: skill-architecture, from-docs-to-blueprint; re-embeds skill-workflow)

For the adopter installing it and the engineer extending it. Answers: *how
does the machinery work, and what lands on my disk?*

1. **The four skills** — one H3 each: when it fires, what it loads, its
   exit gate.
2. **The agents** — five, and the fresh-context / deliberately-blind design
   rule *(figure: skill-architecture)*.
3. **From your docs to a blueprint** *(figure: from-docs-to-blueprint)* —
   sources in → one validated blueprint file (here, once, parenthetically:
   "internally called the IR") → workspace companions (state, sign-off
   hashes, findings ledger) → generated outputs (no-DB module, seed) →
   deployed app. Gates in plain words.
4. **The loop and its gates** *(re-embed skill-workflow)* — deterministic
   exits, never "looks done"; cadence guidance (a blueprint touched once is
   a failure).
5. **Your own backend** — the adapter contract in prose; the three access
   rules any backend must satisfy; "ask your agent to implement the
   contract" as the worked path; adapter-contract.md is normative.
6. `[P3]` **Trusting your agent: the eval harness** — what it checks, trace
   vs judge lines, `--smoke` keyless, reading a grade, when to re-run.

### guide/04 — Operations (~140 lines · no figures)

For whoever runs a deployment. Answers: *how do I run this responsibly?*

1. **Deploy** — static host basics, env at build time, SPA redirect,
   per-locale sites, the public-exposure decision tree (absorbs the
   human-facing half of deploy-notes; the reference file stays for agents).
2. **The Supabase recipe** — opt-in framing explicit; local stack, hosted,
   migrations workflow (DATABASE.md owns authoring rules), seed/verify,
   types.
3. **Access and security** `[P1/P2]` — three personas · the three
   backend-neutral rules explained · how Supabase satisfies them · UX gates
   vs the security wall (rosters and view-only mobile are NOT the wall) ·
   key handling (BYO agent keys, localStorage, secret-guard hook).
4. **Upgrading** — version invariant (plugin = template) · CHANGELOG ·
   the customization.md recipe · recompute sign-off hashes after.

## docs/INDEX.md (~30 lines)

Table: doc · the question it answers · phase tag if gated. Then the agent
routing block (task family → guide + references), and the two-line
docs-vs-references split: *references/ is what the agent loads while
working; docs/ is what you read to understand.*

## AGENTS.md — the delta

Keeps the router (skill → SKILL.md map for non-Claude runtimes). Gains:
boot protocol (read INDEX, load by task) · the three backend-neutral access
rules · the guide frontmatter contract. Under ~80 lines.

## Moves and retirements

| Current | Fate |
| --- | --- |
| docs/*.svg | → docs/assets/ (links updated) |
| docs/scenario-steps-design.md | absorbed into guide/01; retired |
| docs/generalization-audit.md | → docs/notes/ (history) |
| docs/erd.mmd | → docs/assets/; regenerated at Migration v2 P1 |

## Sequencing

| Step | Work | Depends on |
| --- | --- | --- |
| 1 | Skeleton + INDEX + asset moves + AGENTS.md delta | nothing |
| 2 | README rewrite | why-now + practice-scenarios figures approved |
| 3 | guide/01 + guide/03 §§1–4 | model + machinery figures approved |
| 4 | guide/02 + guide/03 §5 | four-ways-in + pipeline figures |
| 5 | guide/04 | Migration v2 P1 for §3; rest now |
| 6 | guide/03 §6 (evals) | Migration v2 P3 |

## Open questions for Bill

1. Four guides (proposed) vs. splitting guide/01 (model) and guide/03
   (plugin) further — each is ~180 lines; comfortable ceiling, or too fat?
2. Hero screenshot in §3 — static PNG (simple, goes stale gracefully) or a
   short looping GIF of the click-through?
3. Case-study link target: Notion page is workspace-internal — public
   version planned, or README carries the evidence summary itself until
   then?
4. decisions/ layer stays cut until publish — confirm.
