---
title: Docs asset revamp — the four SVGs (+ ERD) catch up to the four-skill reality
type: plan
status: draft-for-review
date: 2026-08-08
scope: documentation assets only — no code, no schema, no README prose beyond captions/alt text
relates: docs/plans/2026-08-08-001-plan-migration-v2-uno-parity.md (Phase 4 item 2, pulled forward)
---

# Docs asset revamp

Standalone slice of Migration v2 Phase 4, runnable now while uno-blueprint
code/doc cleanup proceeds independently. Nothing here depends on the frontend
port or the derived-layer DDL landing.

## Shared visual language (the constraint on every asset)

All four SVGs are hand-authored, one system: `viewBox` 880 wide, system font
stack, ink `#273036`, rail-label gray `#8a8f98` with letter-spacing, mono
chips for file/skill names, no external assets. Revamps and new figures stay
in this language — same width, same classes, same restraint. New figures get
the same "one idea per figure" discipline the existing set has.

## Asset 1 — `skill-architecture.svg` : TOTAL REVAMP

**Current (stale on every count):** titled "How the skill works", singular
"SKILL / SKILL.md always loaded"; 3 of 5 agents; "references/ 14 DOCS"
against an actual 29; playbook row missing audit / whatif / slice.

**New figure — "How the sb plugin works":** four columns matching the actual
package anatomy, drawn from the repo tree (counts generated, not typed —
see Process):

1. **Skills (4)** — `sb:map` · `sb:slice` · `sb:audit` · `sb:whatif`, one
   line each on when it fires; note that each loads fresh and pulls only its
   own playbook + references (progressive disclosure — the surviving idea
   from the old figure, restated for four entry points).
2. **Agents (5)** — document-reader (3 modes), blueprint-reviewer, auditor
   (one blind auditor per check), impact-tracer (graph walk, depth cap),
   render-checker. Annotate the design rule: fresh-context / deliberately
   blind — the reviewer never saw the drafting, the auditor never sees other
   checks.
3. **References (29)** — grouped, not enumerated: playbooks (7) · schemas (4)
   · check roster (7) · contracts & vocab (adapter-contract, canvas-adapter,
   layer-roles, lane-vocabulary, elicitation-protocol, …). Exact count in a
   chip; groups carry counts.
4. **Scripts & gates** — validate_ir.py (the exit-0 gate), audit_tools.py
   (fingerprint/dedupe/no-DB ledger), slice_tools, seed/fallback generators,
   compute_signoff_hash. Plus the 3 hooks as a footer strip (session status,
   IR auto-validate, secret guard).

Cross-column arrows: skill → spawns agents → gated by scripts; references
flow into both. One caption line: "Two consumer surfaces, one source of
truth" — IDE plugin and the in-app canvas agent both read these files
(canvas-adapter is the translation seam).

## Asset 2 — the workflow: SPLIT INTO TWO SVGs (Bill, 2026-08-08 round 4)

**Current:** one `skill-workflow.svg` depicting only the sb:map pipeline,
captioned as the whole workflow. Earlier rounds proposed one two-loop
figure; Bill's call: **break it up** — each loop is its own asset, each
readable alone, connected by a repeated visual motif.

*(Round 6, Bill: the two loop figures break down further — **one SVG per
skill**, each explaining its concrete, separated use case. This also
replaces the practice-scenarios figure: the per-skill figures ARE the
use-case visuals. `skill-workflow.svg` retires.)*

### The four skill figures — one shared template

`sb-map.svg` · `sb-slice.svg` · `sb-audit.svg` · `sb-whatif.svg`. Each
~880×320, identical three-band template so they read as a matched set:

1. **Situation band** (top): the practice moment in service-design voice,
   one line, grounded in the textbook (Løvlie/Polaine/Reason, *Service
   Design: From Insight to Implementation*, ch. 6 — the wording anchors
   below).
2. **Flow rail** (middle): that skill's stations left to right, green gate
   diamonds between, amber agent chips beneath the stations that spawn
   them.
3. **Artifact strip** (bottom): what exists when the skill finishes.

Each figure ends in a small chip naming which skill typically follows —
the set chains without needing a master loop figure.

### 2-map — `sb-map.svg`

Situation: *"You have research, journey maps, a FigJam — scattered
descriptions of the service, and no single picture everyone can work
from."* Rail: sources → draft (per-cell provenance) → review & sign-off
(hash) → import → verify. Artifact strip absorbs the cut pipeline figure:
docs cluster → one validated blueprint file (`.mono` blueprint.json) →
generated app data → live blueprint. Follow-chip: → slice / audit.

### 2-slice — `sb-slice.svg`

Situation: *"The whole blueprint is too much for Thursday's meeting — you
need the journey summary for leadership, the channel view for the web
team."* Rail: pick a cut (the textbook's four slices: journey summary ·
phase/step column · channel row · touchpoint cell — plus custom) → compose
frames → present / hand off. Artifact: a slice deck pointing back at live
cells (dashed soft refs). Follow-chip: → present · audit.

### 2-audit — `sb-audit.svg`

Situation: *"Two touchpoints are pushing in opposite directions, and
nobody noticed — the gaps everyone thought somebody else was responsible
for."* Rail: check roster (blind, one auditor per check) → findings
(fingerprint-deduped, pink) → triage (open / dismissed / resolved).
Artifact: the findings ledger. Follow-chip: → whatif · map (update).

### 2-whatif — `sb-whatif.svg`

Situation: *"Before anyone commits — what happens to the rest of the
service if we change this?"* (the textbook's "What if…" scenarios played
out on the blueprint, its "If… then" decisions). Rail: name the change →
trace downstream (variant file, never the live DB) → weigh displaced
demand → accept → change request → promote via map → re-import. Gate:
sign-off hash staleness guard. Artifact: the change request. Follow-chip:
→ map (re-import closes the loop).

### Textbook wording anchors (for all four situation bands + README §5 prose)

From ch. 6, use THIS vocabulary, not ours: "as-is" and "to-be" states ·
"sketching" a service on the blueprint · playing out "What if…" scenarios,
working through "If… then" decisions with all stakeholders · zooming in
and out between big picture and detail · situating a touchpoint in the
wider journey · journey / phase & step / channel summaries and touchpoint
specifications as the four slices · touchpoints pushing in opposite
directions · the gaps everyone thought somebody else was responsible for ·
the blueprint as the central source from which other specification
documents are created · print it, hang it on the wall, take it to
meetings.

## Asset 3 — data model + slices: SEPARATE COMPANION FIGURE (recommendation)

**Question raised:** extend `data-model-hierarchy.svg` with the derived
layer, or create a separate figure highlighting its relationship to the
original entities?

**Decision (Bill, 2026-08-08): TWO separate companion figures**, not one —
the derived layer has two distinct stories and one figure would blur them.
The original hierarchy figure stays untouched either way. Reasons the
companion approach wins over extending the original stand: the existing
figure answers "how is a blueprint *organized*" and answers it well; the
derived layer is views and judgments **over** that structure, and the
pointing relationships are the story dedicated figures can foreground.

### 3a — `cell-anatomy.svg` : what accrues on a cell

The cell as the anchor everything attaches to. One large cell drawn center
(same chip language as blueprint-anatomy), attachments radiating with typed
connectors:

- **Spec fields** — function / form / value_props / owner: authored content
  ON the cell (solid, part of the core row).
- **Triggers vs needs** — `cell_triggers.kind`: trigger draws an arrow on
  canvas; needs is panel-only, no arrow (show both renderings side by side —
  this distinction confuses first-time readers most).
- **Evidence** — rows hanging on the cell; "assumption" = the derived
  zero-evidence state, explicitly *not stored* (dashed annotation).
- **Findings** — cite the cell by *cell_key* (soft ref; fingerprint =
  check + sorted keys; dedupe states open / dismissed / resolved shown as a
  three-chip lifecycle).
- **Slice membership** — the cell appears in N slices (footer chips,
  pointing forward to figure 3b).
- **Propositions** — link findings/evidence toward change intent (smallest
  element; drop if it crowds).

Caption rule on-figure: derived attachments never block or mutate the core;
soft refs degrade gracefully on re-import.

### 3b — `slicing-model.svg` : how entities get sliced, and the two postures

Top half — **what a slice cuts**: the core hierarchy as a faded spine
(visually quoting the original figure, dimmed), with the five slice types
each shown as a selection outline over it: journey (cross-lane run) / step
(one column) / lane (one row) / cell (single) / custom (arbitrary set).
Selected members flow into **slice_items** frames — ordered screens, soft
cell refs, survive scenario re-import by key.

Bottom half — **the two postures of a slice**:

- **Design** — composer view: frame strip, storyboard, drag-to-mint screens,
  reorder chips; where slice_items get authored and cited cells stay live
  links back to the blueprint.
- **Presentation** — full-bleed stakeholder view: one frame at a time,
  chrome collapsed, print/PDF exit. Same data, zero editing affordances.

One connector between the halves: "same slice, two renderings." Posture
labels use the app's real vocabulary (Design / Present) so figure and UI
teach each other. Note for drafting: postures describe the *template app's
intended* slice surfaces — verify vocabulary against the ported UI when
Migration v2 Phase 2 lands; until then uno-blueprint's shipped slice UI is
the reference.

**Small touch-up to the original:** none structurally; add one dim footer
line "analysis layer over this structure → see the slicing figure" so
readers know the companions exist. Original stays otherwise untouched.

**Persistence honesty (required label):** this repo's shipped Supabase schema
does not yet contain these tables (Migration v2 Phase 1). Figures 3a/3b depict
the model as specified in `references/slice-schema.json`, audit/whatif
playbooks, and canvas-adapter — which IS normative for skills today (no-DB
ledger via audit_tools.py; canvas persistence in uno). A small "persistence"
footnote states this so the figure doesn't over-claim, and stops being needed
the day Phase 1 lands.

## Asset 4 — `erd.mmd` : DEFERRED, with a stopgap

Current ERD (9 entities) truthfully matches the shipped schema — regenerating
it with derived tables would make it *lie* until Phase 1 DDL exists. Do not
touch the entity set now. Stopgap: header comment pointing at
`derived-layer.svg` + slice-schema.json for the specified-but-not-yet-DDL'd
layer. Full regen is Migration v2 Phase 1 step 3, where it belongs.

## Asset 5 — `blueprint-anatomy.svg` : NO STRUCTURAL CHANGE, one legend strip

Verified accurate. A `needs`-kind trigger glyph stays out — needs edges draw
no arrows by design, and anatomy depicts what renders (3a carries that
distinction instead).

One addition proposed by the reviewer pass below: a **role legend strip**
along the figure's edge — the eight `layer_role` keys, the rendering each
one drives (color, pill cells, divider lines), and the note that the
interaction and visibility lines are *derived from roles*, not authored, with
custom/`null` falling back to generic swimlanes. See Reviewer pass §G2.

---

# Reviewer pass — reading this repo as a first-time user

Hat swapped: someone lands on the README having heard "service blueprints
as a database for agents." They are a service designer, a product designer,
or a design engineer. They have twenty minutes. What do the figures teach
them, in what order, and what do they still not know at the end?

## What works today

- `blueprint-anatomy` and `data-model-hierarchy` are genuinely good — right
  altitude, one idea each, and together they teach the vocabulary
  (lifecycle/phase/scenario/path, lanes × steps, cells, triggers, the two
  lines) a newcomer needs before anything else makes sense.
- The `See it live` link does real work: a rendered blueprint beats any
  diagram for "what is this."

## The four gaps, in the order a newcomer hits them

### Gap 1 — "When would my team reach for this?" (highest value; replanned 2026-08-08 per Bill)

*(Supersedes the earlier `product-surfaces.svg` proposal — a six-surface UI
tour led with screens instead of situations, gave the phone reader unearned
billing, and foregrounded agentic features Bill wants treated as a bonus,
not the pitch.)*

The README never shows the **situations** the tool serves. A service
designer doesn't ask "what are the screens"; they ask "is this for the
meeting I have on Thursday?"

**Proposed new figure — `practice-scenarios.svg`.** Vignette strip: named
moments from real service/product design practice, each drawn as situation →
what the blueprint does for it. Candidate roster (trim to 4 in drafting):

1. **Ground a product decision** — "where does this feature sit, what does
   it touch downstream?" Scope a change, write a PRD anchored in the
   journey, trace ripple effects. *The case study's evidenced win (clearer
   PRDs, sharper scope) and the everyday moment a product team recognizes —
   the one worth leading with.*
2. **Compare paths** — designed vs. reality, current vs. proposed, segment
   A vs. B. A staple of service-design practice; the app renders variants
   side by side. (Bill: worth explicit mention.)
3. **Align stakeholders** — cut a slice for Thursday's meeting: one
   audience, one storyline, presented full-bleed; onboarding a new teammate
   is the same move.
4. **Keep it honest** — audit the blueprint against how the service actually
   runs; triage findings; the poster-that-became-a-database only stays true
   if checked.

**The agent beat comes second, deliberately.** A footer rail — not a
per-vignette feature — reads: *every scenario runs three ways: in the app ·
chatting with the in-app agent · from your IDE.* Agentic capability is the
bonus on top of recognizable practice, never the headline (Bill's explicit
framing).

**Demo recordings replanned to match:** each recording portrays ONE
scenario as practice first, then shows the three ways to run it. The
placeholder list in the README (currently organized by *consumer* — IDE
agent / inline agent / human) reorganizes by *scenario*. Recording plan
follows the figure's final roster.

### Gap 2 — split into TWO figures (Bill's clarification, 2026-08-08)

Two different things were tangled in one proposal. Both are wanted:

**2a — `why-now.svg` — the thesis, at the top of the README.** Sets tone
before any product content. Two strands converging:

- *Strand 1 — context engineering has a gap.* Agents are becoming team
  members; expectations rise to match. Teams feed them piles of documents;
  documents describe parts, not the end-to-end service — and the case
  study's eval showed documents alone make an agent **confidently wrong**
  (aspirational docs stated as current fact), worse than no context.
- *Strand 2 — service design has long practiced a version of this for
  humans.* Coordinating people, processes, touchpoints so a service feels
  seamless is the practice of making a service understandable to its
  participants — alignment infrastructure for humans. The blueprint is one
  of its strongest forms. Its known limitation: too big and expensive for
  human brains to consult daily — so it lived on the wall between planning
  cycles. (Wording softened per Bill 2026-08-08 — never "already solved.")
- *Convergence:* the agent is just a new participant in the service — and it
  removes the consultation cost. Structured as data, the blueprint becomes
  the shared lens both humans and agents reason through: poster → database.

Source material: the PLUS case study (Notion, "Service Design Is the
Missing Layer in AI Context Engineering") — incl. the eval-ladder chips
(no context → docs → blueprint → blueprint+guide) if they fit without
crowding. This figure is also reusable in the case study itself and any
talk/post — design it as the canonical thesis visual, not README-only.

**2b — `four-ways-in.svg` — how people and agents experience the app.**
The former who-touches figure, reframed from access control to *experience*:
the blueprint center; four ways in — browse the app · chat with the in-app
agent · work from the IDE (`sb:*` skills) · connect any MCP agent
(Slack/claude.ai, read-only). Arrow labels say what each way is *for*;
enforcement (tiers/rosters/RLS) demotes to small print — it's the
security-posture picture too, but that's the footnote, not the frame.

### Gap 3 — the pipeline figure, de-jargoned (was "ir-pivot"; Bill: "idk what IR is lol")

That confusion IS the finding: **"IR" is internal vocabulary and must not
appear in onboarding materials** — yet today's README drops "**sources → IR**
(JSON, validated)" in its pipeline one-liner unexplained. Two consequences:

- The figure survives but renamed and re-worded — working title
  `from-docs-to-blueprint.svg`: your scattered sources (docs, FigJam,
  spreadsheets, a conversation) → **one validated blueprint file** you
  review and sign off → generated app data (works with no database, or
  seeds Supabase/your own backend) → the deployed blueprint. Gates drawn as
  checkpoints in plain words (validated · reviewed · signed off). The
  literal filenames and the term "IR" appear only in small mono annotations
  for the engineer who will meet them on disk.
- Demoted from README inline to the Machinery docs page (per the figure
  budget). A README caption may link it; minute-five readers never need it.
- Cheap prose fix rides along: the README pipeline one-liner rewords to
  plain language when captions are committed.

### Gap 4 — "Which lane does this go in?" (where mapping actually stalls)

The first real task a service designer attempts is placing their own
activity into lanes. `layer_role` is the load-bearing concept — it drives
every rendering decision and both derived lines — and it is a prose bullet
under Key semantics. This is the highest-frequency stall in practice.

**Not a new figure** — a legend strip on `blueprint-anatomy.svg` (Asset 5
above). Cheaper, and it belongs where the reader already is.

### Deliberately NOT proposed

- **A compare/view-modes figure.** Real gap, but the vocabulary is in flux
  (single/side-by-side/integrated in this repo vs. stacked/merged/fold in
  uno). Drawing it now guarantees a redraw. Fold the *concept* (a scenario
  has path variants) into `product-surfaces`; revisit after the port.
- **An eval/grading figure.** Strong differentiator, weak onboarding value —
  nobody evaluates trust in minute five. Revisit at Migration v2 Phase 3
  when the harness actually ships here.
- **An onboarding-path/quickstart figure.** The README's own structure is
  that map; a figure of a table of contents is decoration.

## G. Reorganization proposals

### G1 — Three families, stated out loud

Nine figures without a taxonomy is a pile. Name the families and let the
README's section order follow them:

| Family | Answers | Figures |
| --- | --- | --- |
| **Why** — the thesis | context engineering gap × service design practice | why-now |
| **Model** — what a blueprint is | vocabulary, structure | data-model-hierarchy · blueprint-anatomy · cell-anatomy · slicing-model |
| **Practice** — when and how you use it | scenarios, ways in | practice-scenarios · four-ways-in |
| **Machinery** — how it's produced | skills, agents, artifacts, gates | skill-architecture · skill-workflow · from-docs-to-blueprint |

### G2 — Model before machinery (the README's current order is backwards)

Today: idea → why → live → **the skill** (architecture, workflow) → **the
blueprint model** → setup. A newcomer meets `document-reader` and
`blueprint-reviewer` before they know what a lane is.

Proposed order: **why (thesis figure) → see it live → the blueprint model
(Model family) → when you'd use it (Practice family) → how it's produced
(Machinery) → get set up → reference.** `skill-architecture` in particular is an *internals* figure —
valuable to someone extending the plugin, wrong for minute two. Demote it
to the Machinery section or to a dedicated `docs/` page linked from there.

### G3 — A figure budget for the README

Nine figures inline is a scroll, not an onboarding. Rule: **README carries at
most five** — hierarchy, anatomy, product-surfaces, skill-workflow, ir-pivot.
The rest (cell-anatomy, slicing-model, who-touches, skill-architecture) live
in `docs/` pages the README links by name, each page one figure plus the
prose that figure needs. That is also the seed of the audience-split docs
IA in Migration v2 Phase 4 — this plan stops producing loose SVGs and starts
producing the pages they belong to.

### G4 — Every figure earns a one-line "what this answers" caption

Current captions describe the drawing; they should state the question. "How
the skill works" → "Which skill loads, who it spawns, and what gates each
step." Cheap, and it makes G3's budget decision self-evident (any figure
without a distinct question is a merge candidate).

## Revised asset roadmap (supersedes the Assets list above where they differ)

| # | Asset | Verdict | Priority |
| --- | --- | --- | --- |
| 1 | `why-now.svg` | new — the thesis (Gap 2a); canonical visual, reusable in the case study | now, first |
| 2 | ~~`practice-scenarios.svg`~~ | CUT round 6 — README scenarios go prose-only, textbook voice; per-skill figures carry the use cases | — |
| 3 | `skill-architecture.svg` | total revamp (4 skills / 5 agents / 29 refs / gates); re-inventory tree first | now |
| 4a–d | `sb-map.svg` · `sb-slice.svg` · `sb-audit.svg` · `sb-whatif.svg` | new — one per skill, shared three-band template; replaces the loop pair (round 6); sb-map absorbs the pipeline artifact track; skill-workflow.svg retires | now |
| 5a | `cell-anatomy.svg` | new | now |
| 5b | `slicing-model.svg` | new (incl. design vs present) | now |
| 6 | `blueprint-anatomy.svg` | + role legend strip (Gap 4) | now, cheap |
| 7 | `four-ways-in.svg` | new (Gap 2b) | next |
| 8 | ~~`from-docs-to-blueprint.svg`~~ | CUT round 5 — merged into 4a's artifact track; guide/03 keeps the prose | — |
| 9 | `data-model-hierarchy.svg` | unchanged + one pointer line | now, trivial |
| 10 | `erd.mmd` | deferred to Migration v2 Phase 1 | later |
| — | compare/view-modes figure | covered as a practice-scenarios vignette; dedicated figure after the port | later |
| — | eval/grading figure | deferred to Phase 3 | later |
| — | demo recordings | replanned: one per practice scenario, three-ways beat at the end | after figure 2 locks the roster |

Draft order: **1 (why-now) → 4a sb-map** (locks the shared skill template)
→ 4b–d (slice · audit · whatif, fast once the template holds) → 3
(skill-architecture) → 5a cell-anatomy → 5b slicing-model → 6 anatomy
legend → 7 four-ways-in — one figure at a time for review. README §5
scenario PROSE (textbook voice) drafts alongside the skill figures since
they share the wording anchors.
Reorganization (G1–G4) executes last, as the captions + README-order commit,
because the budget decision needs the finished set. README five-figure
budget under the new roster: why-now · hierarchy · anatomy ·
practice-scenarios · skill-workflow; all else on docs pages.

## README touchpoints (captions only, in this plan's scope)

- Recaption skill-architecture ("How the sb plugin works — four skills,
  five agents, …") and skill-workflow ("The full loop — authoring and
  living").
- Insert `cell-anatomy.svg` after `blueprint-anatomy.svg` (zooms into what
  anatomy shows from outside) and `slicing-model.svg` after
  `data-model-hierarchy.svg`, each with a two-line bridge sentence.
- The full README rewrite (four-skill restructure, tier story, repo-map
  corrections) stays in Migration v2 Phase 4 — not here.

## Visual system — one language for all eleven

Extracted from the four shipped SVGs (they already agree); every new/revamped
asset uses exactly this and nothing else:

- **Canvas**: `viewBox` 880 wide, height per figure (~360–630). System font
  stack; `.mono` (ui-monospace) reserved for filenames, skill names, and
  literal terms (`sb:map`, `blueprint.json`).
- **Background — never transparent** (Bill, round 5): every figure opens
  with a full-canvas rounded rect filled `#fafbfc` with a `#e2e4e9` hairline
  border, so figures hold up on dark-mode screens (GitHub dark, docs sites).
  Applies retroactively to the four shipped SVGs in the same commit that
  moves them to docs/assets/.
- **The annotated-UI motif** (new, Bill round 5): where a figure explains a
  *surface*, don't invent an abstract composition — draw a faithful,
  simplified vector mock of the actual app UI (wireframe fidelity: real
  layout, real proportions, neutral fills, no text-level detail) and
  dissect it with callout pointers (1px `#8a8f98` leader lines to 9.5px
  labels outside the mock). Used by cell-anatomy, slicing-model's posture
  band, and four-ways-in. Mocks reference uno's shipped UI until the
  template port lands; re-verify proportions at draft time.
- **Type scale** (existing classes): section/rail label 10px 700
  letter-spaced `#8a8f98` · box title 11px 700 `#273036` · chip 10–11px
  600 · annotation 9.5px 700 letter-spaced.
- **Surfaces**: white `#ffffff` cards on `#fafbfc`/`#f4f5f7` group panels,
  borders `#c9ccd4`/`#d4d4da`/`#e2e4e9`. Dashed border = derived/virtual/
  not-stored. Dimmed (40% opacity) = context being quoted, not taught.
- **Semantic tints** (the four already in use, now given fixed meanings so
  the set reads as one system):
  - **green** `#e8f3ed` / stroke `#9dbfa9` — human practice & judgment:
    review, sign-off, triage, presenting, gates passed.
  - **blue** `#d9e4ea`–`#e9eff4` / stroke `#9aadbe` — structure & data:
    the blueprint itself, files, schema, imports.
  - **amber** `#fdf1e3` / stroke `#d4b483` — agents & automation: skills
    firing, subagents, generated artifacts.
  - **pink** `#fbe9f0` / stroke rose — findings & divergence: audit
    results, conflicts, differences. (Sparingly.)
- **Connectors**: 1.5px solid `#9aadbe` arrows for flow; dashed for
  soft/derived references; no arrowheads on "needs"-style relations. Gate
  markers = small green diamond on the connector with a one-word label.
- **Recurring motifs** (what makes the set feel like one family): the
  faded-spine quote (a figure that builds on the core hierarchy draws it
  dimmed, same chip shapes as data-model-hierarchy) · the "live blueprint"
  chip (2a hands to 2b) · the gate rail (thin strip under any process
  figure) · the three-ways footer (practice-scenarios only).

## Per-asset look

**`why-now.svg`** (~880×420) — the only figure allowed a touch of rhetoric.
Two horizontal strands entering from the left as labeled bands: top strand
amber ("agents joining teams" — small doc-pile icon cluster with a
"confidently wrong" annotation chip in pink), bottom strand green ("service
design practice" — a tiny classic blueprint thumbnail with a wall-calendar
annotation: consulted a few times a year). They converge mid-canvas into
one blue node — the structured blueprint ("poster → database" as the
label) — from which two thin arrows exit right to twin consumers: team ·
agents, sharing one "shared lens" caption. Eval-ladder chips (open
question 8) would sit as four small steps under the convergence point if
included. No UI drawn anywhere — this figure is ideas only.

**`practice-scenarios.svg` — CUT** (round 6, Bill). No figure: the four
per-skill SVGs carry the concrete use cases now, and the README's
scenarios section becomes **prose only, in a service designer's voice**,
re-worded against the textbook anchors above — e.g. "you've been briefed
on one touchpoint, but situating it in the wider journey shows the scope
is broader" · "as-is vs. to-be, side by side" · "the journey summary for
leadership, the channel view for the web team" · "two touchpoints pushing
in opposite directions." The three-ways line survives as the section's
closing prose sentence.

**`sb-map.svg` / `sb-slice.svg` / `sb-audit.svg` / `sb-whatif.svg`**
(~880×320 each) — visual spec is the shared three-band template + per-skill
content defined in the Asset 2 section above: situation band in textbook
voice · flow rail with green gate diamonds and amber agent chips ·
artifact strip · follow-chip chaining to the next skill. Matched set:
identical band heights, identical title treatment (`.mono` skill name +
plain-English subtitle), the ONLY figure-to-figure variation is rail
content. sb-map's artifact strip carries the absorbed pipeline (docs → one
validated file → generated app data → live blueprint).

**`data-model-hierarchy.svg`** — unchanged + one 9.5px dim footer line
pointing at the slicing figure.

**`blueprint-anatomy.svg`** — unchanged + role-legend strip along the
bottom edge: eight `.mono` role keys, each with its lane-color swatch
(the tints already in the figure) and a 3-word rendering note; final cell
of the strip: "custom / null → generic lane · the two lines derive from
roles".

**`cell-anatomy.svg`** (~880×480) — *(REDESIGNED round 5: abstract radial
composition scrapped; Bill's direction — use the actual UI and dissect it
with pointers.)* The annotated-UI motif at full size: left third = a small
blueprint-grid excerpt with one cell selected (its real in-grid rendering);
the remaining two thirds = a faithful wireframe mock of the **cell detail
panel as it actually opens in the app** — header, tab row, spec fields
(function / form / value props / owner) laid out as the panel lays them
out, evidence section, findings section. Callout pointers dissect it from
the outside margins: each spec field gets a one-line "what goes here";
evidence gets the assumption-as-absence note on a dashed empty row;
findings get the open/dismissed/resolved lifecycle chips; a pointer pair on
the grid excerpt distinguishes a drawn trigger arrow vs. a needs relation
("shown in the panel, no arrow — on purpose"). Footer pointer: "this cell
appears in N slices →". The figure teaches the model THROUGH the surface
the reader will actually meet.

**`slicing-model.svg`** (~880×620) — *(REDESIGNED round 5; the old spec
buried the two questions Bill named. The figure now answers them in order,
as three labeled bands:)*

- **Band 1 — "A slice is a lens on the blueprint, not a copy."** (the
  relationship question, answered first and biggest). One mini blueprint
  grid (quoting anatomy, dimmed) with a handful of cells highlighted; thin
  arrows pull those exact cells rightward into an ordered frame deck (the
  slice). Two annotations: the frames *point back* at cells (dashed
  soft-ref connectors — update the cell, the slice sees it), and deleting/
  re-importing the blueprint never breaks the slice (refs by key).
- **Band 2 — "Five ways to cut."** (the types question, answered
  explicitly). Five small thumbnails of the SAME dimmed grid, each with a
  different selection pattern highlighted: journey = a reading-order sweep
  across lanes · step = one column · lane = one row · cell = a single
  cell · custom = an arbitrary dashed lasso. One-word label + one use-case
  clause under each.
- **Band 3 — "One slice, two postures."** Annotated-UI motif: two wireframe
  mocks of the actual slice surfaces side by side — the composer (frame
  strip, storyboard, edit affordances) and the presentation view (one
  frame full-bleed, chrome gone) — with two callouts each, and the "same
  slice" connector between them.

**`four-ways-in.svg`** (~880×440) — *(RECOMPOSED round 5; the
corners-converging layout was weak).* New composition: **one blueprint,
four surfaces.** A full-width blue foundation bar across the bottom — the
blueprint as structured data (mini-grid motif + `.mono` "one source of
truth"). Above it, four equal mini-scenes in a row, each an annotated-UI
wireframe of the surface where that consumption actually happens: a
browser window (the app — read, compare, present) · the app with the agent
dock open (ask & author, amber accent) · an IDE window with `sb:` in the
composer (map & maintain, amber, `.mono`) · a chat surface (Slack /
claude.ai via MCP — query from anywhere, dashed border = read-only). One
drop-line from each scene into the foundation bar, labeled with what that
way is FOR. Small-print footer: tiers/rosters/RLS enforcement — security
as footnote, not frame.

**`skill-architecture.svg`** (~880×520, total redraw) — four columns under
one roof, matching the package: SKILLS (4 amber cards, `.mono` names, one
firing line each) · AGENTS (5 white cards, "fresh context · blind" badge
row) · REFERENCES (blue group panel, grouped stacks with generated counts)
· SCRIPTS & GATES (green-accented, validator/tools/generators; hooks as a
3-chip footer). Thin arrows: skills → agents; references → both; scripts
gate the flow (green diamonds). Bottom caption band: "one source of truth,
two consumers — IDE plugin · canvas agent" with two small outlet chips.
**Drafting prerequisite (round 5):** the skill setup changed recently
(0.2.2 structural pass — `skills/blueprint` → `skills/map`, audit_tools
reference impl, slice fallback clause — plus uncommitted fixes in the
tree); re-inventory the ACTUAL tree (incl. uncommitted state, once
committed) immediately before drafting, and take every count from the
count script, not from this plan.

**`from-docs-to-blueprint.svg` — CUT** (round 5, Bill: "what's this???").
The standalone pipeline figure kept failing its audience twice (first as
"IR", then de-jargoned) — the concept doesn't earn a figure of its own.
Its content merges into `creating-a-blueprint.svg` as the artifact track
under the rail (sources → one validated file → generated data), which is
where the reader is already looking when the question arises. Guide/03's
"what lands on disk" section keeps the prose + the `.mono` filename table;
IR is introduced there, once, parenthetically.

Consistency checklist applied at every figure review: 880 wide · type
scale classes reused verbatim · tints only with their fixed meanings ·
dashed = derived/virtual · gates always green diamonds · `.mono` only for
literals · any quoted structure drawn dimmed in data-model chip shapes.

## Process — how review works

1. Draft order: skill-architecture → skill-workflow → cell-anatomy →
   slicing-model (ascending novelty; style questions settle on the easiest
   one first; 3b reuses 3a's cell chip and the spine-quoting idiom).
2. Each figure rendered to Bill individually for review before the next
   starts; iterate per figure. Nothing lands in README until all three
   approved.
3. **Counts are generated, not typed:** a tiny script (`scripts/` or
   throwaway) derives skill/agent/reference/playbook counts from the tree
   at draft time; the numbers in the SVGs are checked against it in review.
   (The old figure's "14 DOCS" rotted precisely because it was typed.)
   Optional hardening, Bill's call: keep the script as a test that greps the
   SVGs' count chips against the tree — the drift-test pattern applied to
   documentation.
4. One commit per approved figure + a final captions commit. All on a
   branch; PR when the set is complete.

## Open questions for Bill's review

1. ~~Companion vs. extend-original~~ — RESOLVED (Bill, 2026-08-08): two
   companion figures, cell-anatomy + slicing-model; original untouched.
2. ~~skill-workflow layout~~ — RESOLVED (Bill, 2026-08-08): split into two
   assets, `authoring-loop.svg` + `living-loop.svg`, interlocked via the
   shared "live blueprint" chip; each keeps the left-to-right rail grammar.
3. Count-drift test (Process 3) — worth keeping as a permanent test, or
   review-time script only?
4. Dark-mode variants: current SVGs are light-only (README renders them on
   GitHub which now serves both themes; hardcoded `#273036` ink goes
   near-invisible on dark). In scope now (CSS `prefers-color-scheme` inside
   the SVGs, or GitHub's `#gh-dark-mode-only` dual-image trick), or defer?
5. ~~product-surfaces / ir-pivot / who-touches scope~~ — RESOLVED (Bill,
   2026-08-08): product-surfaces replaced by `practice-scenarios` (no phone
   reader, scenario-first, agent as bonus); Gap 2 split into `why-now` +
   `four-ways-in`; ir-pivot de-jargoned to `from-docs-to-blueprint`,
   docs-page only.
6. `practice-scenarios` vignette roster: the four proposed (ground a
   decision / compare paths / align stakeholders / keep it honest) — right
   set? Right lead? Trim to 3?
7. README figure budget (G3, max five inline + `docs/` pages for the rest) —
   adopt now, or keep everything inline until the docs IA lands in
   Migration v2 Phase 4?
8. `why-now` eval-ladder chips (no context → docs → blueprint → +guide, with
   the "confidently wrong" finding): include in the figure, or keep the
   thesis figure clean and let the case study carry the evidence?
