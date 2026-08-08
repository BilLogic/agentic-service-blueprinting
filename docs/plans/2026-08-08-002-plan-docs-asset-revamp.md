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

## Asset 2 — `skill-workflow.svg` : REVAMP + ADDITION

**Current:** depicts only the sb:map pipeline (Draft → Review & sign-off →
Import → Verify & deploy) yet is captioned in the README as the whole
"Agentic blueprinting workflow".

**New figure — two connected loops** (this is the headline diagram):

- **Authoring loop (sb:map)** — keep the existing four-phase rail, it is
  correct: ingest/co-create → review & sign-off (hash) → import via adapter
  → verify & deploy. Compress horizontally to make room.
- **Living loop (new)** — the derived cycle that runs after a blueprint is
  live: `sb:slice` (cut stakeholder views) → `sb:audit` (blind check roster
  → findings, fingerprint-deduped) → triage (open/dismissed/resolved) →
  `sb:whatif` (trace change downstream, variant never touches DB) → accept →
  change request → promote via sb:map → **re-import**, which closes the loop
  back into the authoring rail.
- Junction points labeled: sign-off hashes guard whatif's staleness check;
  re-import is transactional scenario-replace; findings survive re-import via
  fingerprints.
- Rail beneath: which gate must pass at each hop (validator exit 0, reviewer
  pass, read-back verification, hash match) — carries the old figure's
  "gate" idea across both loops.

Layout: authoring loop upper track, living loop lower track, re-import arrow
connecting them on the right. May need viewBox height ~560; width stays 880.

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
| 2 | `practice-scenarios.svg` | new — scenario vignettes + three-ways footer (Gap 1) | now |
| 3 | `skill-architecture.svg` | total revamp (4 skills / 5 agents / 29 refs / gates) | now |
| 4 | `skill-workflow.svg` | revamp + living loop | now |
| 5a | `cell-anatomy.svg` | new | now |
| 5b | `slicing-model.svg` | new (incl. design vs present) | now |
| 6 | `blueprint-anatomy.svg` | + role legend strip (Gap 4) | now, cheap |
| 7 | `four-ways-in.svg` | new (Gap 2b) | next |
| 8 | `from-docs-to-blueprint.svg` | new, de-jargoned, docs-page only (Gap 3) | next |
| 9 | `data-model-hierarchy.svg` | unchanged + one pointer line | now, trivial |
| 10 | `erd.mmd` | deferred to Migration v2 Phase 1 | later |
| — | compare/view-modes figure | covered as a practice-scenarios vignette; dedicated figure after the port | later |
| — | eval/grading figure | deferred to Phase 3 | later |
| — | demo recordings | replanned: one per practice scenario, three-ways beat at the end | after figure 2 locks the roster |

Draft order: **1 → 2** (the two Bill-directed figures lock the narrative) →
3 → 4 → 5a → 5b → 6 → 7 → 8, still one figure at a time for review.
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
2. skill-workflow two-loop layout: stacked tracks (proposed) vs. one circular
   loop? Stacked keeps the existing left-to-right reading grammar; circular
   is prettier but breaks the house style's rail idiom.
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
