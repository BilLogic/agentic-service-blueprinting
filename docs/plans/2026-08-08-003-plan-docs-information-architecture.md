---
title: Docs information architecture — post-migration structure, per-doc outlines, README narrative
type: plan
status: executed-2026-08-17
date: 2026-08-08
revised: 2026-08-08 (round 2 — Bill: soften the thesis, define See-it-live, clean up the arc, simplify the tree)
relates:
  - docs/plans/2026-08-08-001-plan-migration-v2-uno-parity.md (Phase 4 executes this)
  - docs/plans/2026-08-08-002-plan-docs-asset-revamp.md (the figures this IA houses)
---

> **Executed 2026-08-17.** README rewritten against this plan and the four
> guides created at `docs/guide/`. Deltas from the plan, all deliberate:
> the four `sb:` figures live in guide/03 rather than the README (the
> revised progressive-disclosure note), `skill-architecture` re-embeds
> downward from README into guide/03, and the demo-video section stays as
> placeholders until the recordings exist.

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

### 3. See it live (~15 lines · hero screenshot + the video set)

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
- **The videos** (Bill, round 3: several recordings ARE part of See it
  live). One per practice scenario, same locked roster and order as §5:
  ground a decision · compare paths · align stakeholders · keep it honest.
  Each video portrays the practice first, then the three-ways beat
  (UI → in-app agent → IDE), per the asset plan's recording replan. Listed
  here as titled links/embeds, one line each; §5's vignettes link back to
  their matching video rather than re-embedding. Until recorded, this
  subsection simply doesn't exist — no placeholders.

### 4. The blueprint model (~34 lines · figures: F2 organized · F3 path · F4 cell · F5 slice)

**Revised 2026-08-08 (Bill):** the cell and slice figures move up from
guide/01 into the README, so §4 reads as one continuous zoom — structure,
then one path, then one cell, then one slice. Density note: four figures
back to back is the longest such stretch in the document; if it drags in
review, F4 and F5 are the two to demote back into guide/01.

The nitty-gritty §2's definition deferred: how a blueprint is actually
organized. Hierarchy figure (lifecycle → phase → scenario → path), three
bridging sentences, anatomy figure (lanes × steps, cells, triggers, the two
lines — with the new role-legend strip). Two bullets survive from today's
"Key semantics": layer_role in one line (the legend now carries it) and
view modes in one line, naming compare as first-class practice ("designed
vs. reality, current vs. proposed, side by side"). Everything deeper —
cells' spec fields, evidence/findings, slices, steps-scoping, import order
— is one link: guide/01.

### 5. When your team reaches for it (~28 lines · NO figure — prose, round 6)

The heart, now carried entirely by writing (Bill: the per-skill figures in
§6 cover the concrete use cases; this section earns recognition through
voice, not a diagram). Four short paragraphs **in a service designer's
voice, worded against the textbook** (Løvlie/Polaine/Reason ch. 6 — the
wording anchors live in the asset plan):

1. *Situate a change* — briefed on one touchpoint, but situating it in the
   wider journey shows what it actually touches; play out the "what if…"
   before anyone commits.
2. *Compare journeys* — as-is against to-be, this path against that one,
   side by side; the two most common uses of a blueprint, rendered.
3. *Slice it for the room* — the journey summary for leadership, the
   channel view for the web team, the touchpoint spec for the squad;
   print it, take it to the meeting.
4. *Keep it coherent* — find the touchpoints pushing in opposite
   directions and the gaps everyone thought somebody else owned.

Each paragraph links its guide/02 walkthrough; demo recordings attach per
scenario when produced. Closes with the three-ways sentence — the README's
only agent mention above §6.

### 6. The plugin (~18 lines · figure: F6 overview of the sb skill set and agent fleet)

**Revised 2026-08-08 (Bill) — progressive disclosure.** The README no
longer carries a figure per command. It carries ONE plugin figure: the
four skills, the docs and scripts each one uses, and the agent fleet they
call on. Prose names the skills in a clause each and links to guide/03,
where every command gets its own section and its own figure (F8–F11).

### 6b. How to make use of the blueprint (~12 lines · figure: F7)

The four ways the same rows are reached — the app, the agent inside it,
your agentic tools, and Claude in Slack or your own bot — over one
foundation. Prose owns who may do what; the figure owns "same data,
different surfaces".

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

**The weave — every planned asset, both homes:**

| Asset | README | Guide |
| --- | --- | --- |
| `why-now.svg` (new) | §2 inline | — (case study reuses it) |
| hero screenshot | §3 inline | — |
| scenario videos ×4 | §3 embeds | guide/02 §1 links back |
| `data-model-hierarchy.svg` (keep + pointer line) | §4 inline | guide/01 §1 re-embed |
| `blueprint-anatomy.svg` (keep + role legend) | §4 inline | guide/01 §2 re-embed |
| ~~`practice-scenarios.svg`~~ | CUT round 6 — §5 is prose in textbook voice | guide/02 §1 stays prose too |
| `sb-map.svg` (new; artifact strip carries the pipeline) | §6 inline | guide/03 §§1,3 re-embed |
| `sb-slice.svg` (new) | §6 inline | guide/03 §1 + guide/01 §4 link |
| `sb-audit.svg` (new) | §6 inline | guide/03 §1 re-embed |
| `sb-whatif.svg` (new) | §6 inline | guide/03 §1 re-embed |
| `cell-anatomy.svg` (new) | — | guide/01 §3 |
| `slicing-model.svg` (new) | — | guide/01 §4 |
| `four-ways-in.svg` (new) | — | guide/02 §2 |
| `skill-architecture.svg` (total revamp) | — | guide/03 §2 |
| ~~`from-docs-to-blueprint.svg`~~ | CUT (round 5) — content lives in creating-a-blueprint's artifact track + guide/03 §3 prose | — |
| `erd.mmd` (deferred to Migration v2 P1) | — | guide/04 §2 links it |

Rule the table enforces: every SVG has exactly one README home OR one guide
home as its primary, and depth pages stand alone (re-embeds allowed
downward, never a guide figure floating up into the README past the
5-figure budget).

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
   · IDE skills · external agents (MCP / dedicated bots — uno's live Slack
   uno-bot, built on the canonical blueprint contract, is the proof case to
   cite); per way: who it's for, what it can do, smallest example.
   Enforcement footnote table → guide/04.
3. **Presenting and sharing** — present a slice · print/PDF · deep links
   `[P2]` · read-only public deploy as the share-out default.

### guide/03 — The plugin (~180 lines · figures: skill-architecture, from-docs-to-blueprint; re-embeds skill-workflow)

For the adopter installing it and the engineer extending it. Answers: *how
does the machinery work, and what lands on my disk?*

1. **The four skills** — one H3 each: when it fires, what it loads, its
   exit gate.
2. **The agents** — five, and the fresh-context / deliberately-blind design
   rule *(figure: skill-architecture)*.
3. **From your docs to a blueprint** *(no dedicated figure — reads off
   creating-a-blueprint's artifact track, re-embedded here)* — sources in →
   one validated blueprint file (here, once, parenthetically: "internally
   called the IR") → workspace companions (state, sign-off hashes, findings
   ledger) → generated outputs (no-DB module, seed) → deployed app. Gates
   in plain words; `.mono` filename table for the engineer.
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

## docs/INDEX.md (~30 lines, GENERATED)

*(Round 7: uno executed its IA with a generated INDEX —
`scripts/generate-docs-index.mjs` reading doc frontmatter, header warning
"edit frontmatter or the script, never this file." Adopt the same pattern
here; it also subsumes the asset plan's count-drift idea — one generator
script owns every derivable number in the docs.)*

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
