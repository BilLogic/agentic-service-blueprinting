---
title: "Fix 12 skill frictions surfaced by the Ecoeled dogfood"
type: fix
status: completed
date: 2026-07-21
---

# Fix 12 skill frictions surfaced by the Ecoeled dogfood

## Overview

Dogfooding the `agentic-service-blueprinting` skill on the **Ecoeled** project (10-phase
bilingual government-streetlight service blueprint) surfaced 12 `skill`-type frictions,
logged in the workspace clone's `DOGFOOD_FRICTION_LOG.md`. Four are already fixed and
validated in the workspace clone and need porting upstream; the rest are real skill gaps,
documentation holes, or deferred design questions.

This plan sequences all 12 into four tiers by fix cost and confidence:

- **Tier 1 — Port validated fixes** (mechanical; diffs already proven in the clone)
- **Tier 2 — Real skill gaps** (net-new logic + writeup)
- **Tier 3 — Playbook / doc notes** (prose only)
- **Tier 4 — Deferred** (need a design decision; parked with rationale)

**Two source trees:**
- **Skill repo (target of all fixes):** `/Users/billguo/Desktop/agentic-service-blueprinting`
  — skill manifest at `skills/blueprint/SKILL.md`, subagents in `agents/`, generators in
  `scripts/`, prose in `references/`, reference app in `src/`.
- **Workspace clone (source of validated Tier-1 diffs):**
  `/Users/billguo/Documents/Claude/Projects/Ecoeled/blueprint-workspace` — has the proven
  fixes; also holds `DOGFOOD_FRICTION_LOG.md` (the origin record).

## Problem Statement

The skill worked end-to-end but forced real rework during the dogfood. Grouped by cost of
the friction:

- **Silent visual-quality regressions.** Non-English lanes fell to a flat cream fallback
  because the color map was keyed by English lane *name*, not `layer_role` (#5). Trigger
  arrows were unreadably small (#17). A `:focus-within` grey `color-mix` muddied cell colors
  the moment a user clicked into a frame (#21). None of these fail a validator — they just
  look broken, so they cost a full round of "why does this look wrong" before diagnosis.
- **Stale nav leaking into every deployed app.** `generate_fallbacks.py --register` wires
  blueprint *data* but not *nav*; `FALLBACK_SLIDES` is hand-authored and drifts (#3). During
  the dogfood the sample/scale-fixture nav leaked into the 10-phase app until hand-fixed.
- **Parallel drafting diverged.** Ten phases drafted by independent agents cast the customer
  as `backstage_actions`, dropped the customer spine, and named the same actor group four
  different ways — because there is no canonical role+label vocabulary to anchor them (#20).
  This was the single biggest quality lever and required a whole normalization pass.
- **Whole-file sign-off blocks incremental work.** Sign-off binds a SHA-256 of the *entire*
  IR file; adding one phase de-signs every previously-signed scenario even though their
  content is unchanged (#19).
- **Docs over-promise and under-document.** Scripts advertise "stdlib-only" while implying
  YAML authoring is first-class (it needs PyYAML, which PEP 668 blocks) (#2). The playbooks
  say nothing about multi-account Supabase connectors + `permission denied` (#1), FigJam
  whole-board extraction blowing the token limit (#4), or a freshly-added MCP needing a
  session reload before it's reachable (#22).
- **Two open design questions** parked: divider line rendering above tall cells (#18), and
  where journey-stage images come from when an org has no screenshots (#6).

## Proposed Solution

Work tier by tier. Tier 1 is a low-risk mechanical port that can land first and independently.
Tier 2 carries the real design work. Tier 3 is prose. Tier 4 is explicitly deferred with a
recorded decision, not silently dropped.

Every code change to the reference app must keep `tsc --noEmit` clean (CJK escaping is the
known failure mode) and keep `scripts/tests/run_tests.sh` green. Every generator change must
be covered by the existing stdlib test harness.

---

## Technical Approach

### Phase 1 — Tier 1: Port validated fixes (mechanical, low-risk, land first)

All four diffs are already applied and rendering correctly in the workspace clone. The port
target is the skill repo, whose files are at the *pre-fix* state. Confirmed current skill-repo
state in parentheses.

#### 1.1 — Role-based cell colors [#5]

**Skill repo state:** `src/lib/blueprintTheme.ts` has only the English-name-keyed
`LAYER_STYLES` (line 183); `getBlueprintLayerStyle(layerName, zone)` is 2-arg (line 248); no
`ROLE_STYLES`.

**Clone (target state):** `ROLE_STYLES` map at `blueprintTheme.ts:255–284`, 3-arg
`getBlueprintLayerStyle(layerName, zone, role?)` with precedence `role → name → zone-fallback`
(lines 286–296), grid callers pass `layer.role`.

**Edits — `src/lib/blueprintTheme.ts`:**
- Add the `ROLE_STYLES: Record<string, BlueprintLayerStyle>` map (roles → `BLUEPRINT_CELL_PALETTE`
  fills): `visual/step_visual/journey_stage → visual`, `physical_evidence/backstage_tech →
  powderBlue`, `customer_actions → mint`, `frontstage_tech → lavender`, `frontstage_actions →
  blush`, `backstage_actions → peach`, `support_systems → cream`.
- Change `getBlueprintLayerStyle` to accept `role?: string | null` and prefer
  `role ? ROLE_STYLES[role] : undefined` before `LAYER_STYLES[layerName]` before the zone
  fallback. Keep `LAYER_STYLES` as the documented legacy fallback for pre-role content.

**Edits — grid callers, add `layer.role` as 3rd arg:**
- `src/components/blueprint/ServiceBlueprintGrid.tsx:236` → `getBlueprintLayerStyle(layer.name, zone, layer.role)`
- `src/components/blueprint/SideBySideCompareGrid.tsx:414` → add `layer.role`
- `src/components/blueprint/IntegratedBlueprintGrid.tsx:529` → add `layer.role`
- **Gotcha (4th caller):** `src/components/blueprint/VisualWalkthroughModal.tsx:26` also calls
  `getBlueprintLayerStyle(entry.layerName, 'frontstage')`. It renders from a walkthrough
  `entry`, not a `layer`. Check whether `entry` carries a role; if yes, pass it, if no, leave
  2-arg (backward compatible — the new param is optional). Decide, don't skip silently.

**Pill colors sub-item — do NOT port the clone's `techPillColors.ts` values.** The clone pinned
14 Ecoeled-specific Chinese pill labels (green `#DCF3E4` / slate `#DCE6F5` / amber `#F8E6D0`
families). The skill repo already ships the *correct* template default: empty
`TECH_PILL_COLORS` + deterministic `getTechPillFill` hash palette. The real fix for #5's pill
half is **documentation**: add a short "pinning an org pill palette" note to
`references/customization.md` showing how a project fills `TECH_PILL_COLORS` (label → hex).
Leave the map empty upstream.

**Acceptance:** a blueprint authored with Chinese (or any non-English) lane labels renders
role-colored cells, not flat cream. `tsc --noEmit` clean.

#### 1.2 — Arrow size [#17]

**Skill repo:** `src/lib/blueprintArrowGeometry.ts:19` `ARROW_CHEVRON_SIZE = 7`; line 22
`ARROW_STROKE_WIDTH = 1.5`.
**Edit:** set `ARROW_CHEVRON_SIZE = 16`, `ARROW_STROKE_WIDTH = 3` (matches clone).
**Acceptance:** trigger chevrons legible at default zoom. Universal, no content dependency.

#### 1.3 — Drop the panel-blend CSS [#21]

**Skill repo:** `src/index.css:171–178` has the live
`[data-phase-scenario-panel]:hover/:focus-within [data-blueprint-cell-anchor] { --blueprint-cell-bg-panel: color-mix(... #c8c8d0 12%) }`
rule.
**Edit:** remove the `color-mix` blend rule (replace with the clone's explanatory comment at
`index.css:171–172`).
**Gotcha — dead plumbing.** Removing only the rule leaves `--blueprint-panel-cell-blend: #c8c8d0`
(`index.css:162`) and its TS plumbing (`blueprintTheme.ts` `panelCellBlend: '#C8C8D0'` line 47,
`BLUEPRINT_PANEL_CELL_BLEND_VAR` line 59, emitted in `getBlueprintPanelHoverCssVars` line 92)
declared-but-unused. A clean upstream port should also delete the now-dead var + plumbing.
(Unrelated `color-mix` in `src/components/ui/button.tsx:15` is shadcn — leave it.)
**Acceptance:** clicking into a frame keeps role colors stable; no grey shift. No dead
`panelCellBlend` references remain.

#### 1.4 — Generate the nav list from the IR, and rename "slides" → "nav" [#3]

**Terminology fix first.** The reference app's left-sidebar navigation (one entry per phase +
scenario) is confusingly called `FALLBACK_SLIDES` (type `Slide`, in `src/types/slides.ts`) —
"slides" is deck baggage; these are nav entries, not presentation slides. **Rename** as part
of this item: `FALLBACK_SLIDES → FALLBACK_NAV`, type `Slide → NavItem`, file
`src/types/slides.ts → src/types/nav.ts`, and update every import (grids, app shell, and the
generator's output target). Mechanical but repo-wide — grep `Slide`/`slides` to catch all
references before/after.

**Generation is NOT a pure port — no nav generator exists in either tree.** The clone's
`FALLBACK_SLIDES` (`types/slides.ts:76–217`) is a hand-materialized array; the skill repo's
`slides.ts:83` is likewise hand-authored ("keep in sync with `supabase/seed.sql` by editing
both together"). `scripts/generate_fallbacks.py` emits `GENERATED_SCENARIO_IDS` (script line
158) and `blueprintFallbacks.ts` DATA only — zero nav references.

**Edit — `scripts/generate_fallbacks.py`:** add a nav emitter that walks the IR
(`lifecycle → phases → scenarios`) and writes/rewrites a marked block of `FALLBACK_NAV` in
`src/types/nav.ts` (one `phase-pN` main entry per phase + one child scenario entry with
`parentId`/`viewType`/`description`), the same zip the clone did by hand. Reuse the existing
`--register` marker-block rewrite pattern (`REGISTRY_FILE` at script line 54) so it's an
idempotent in-place regeneration, not a full-file overwrite.
**Cleanup:** this obsoletes the hand-sync note and removes the path by which the sample /
`scaleFixture` nav leaks into a real app. Confirm `generate_scale_fixture.mjs` (references
`slides.ts` in comments at lines 421/463/486) still works or update its expectations + the
renamed path.
**Acceptance:** the `Slide`/`slides` name is gone (grep-clean); running
`generate_fallbacks.py --register` on the Ecoeled IR produces the same nav set as the
hand-authored 10-phase list (matching ids, `parentId`, `viewType`, `description`); a fresh
clone with a different IR gets correct nav with no sample/scale leakage. Add a generator test
to `scripts/tests/run_tests.sh`.

**Phase 1 exit:** all four fixes in the skill repo, `tsc --noEmit` clean, `run_tests.sh` green,
reference app renders the Ecoeled IR with role colors + big arrows + stable panel colors + a
generated nav.

---

### Phase 2 — Tier 2: Real skill gaps (design + writeup)

#### 2.1 — Canonical lane vocabulary [#20] — highest quality lever

**Gap:** no `references/lane-vocabulary.md`; the closest is `references/layer-roles.md` (role
*definitions*, not a *convergence* vocabulary). Per `skills/blueprint/SKILL.md:106–118`, per-phase
drafting is done by the **main context** (no dedicated drafter subagent) — only
`document-reader`, `blueprint-reviewer`, `render-checker` exist in `agents/`. So the vocabulary
must be fed into (a) `SKILL.md` drafting instructions and (b) the `blueprint-reviewer` checklist,
not a drafter agent.

**Edits:**
1. **New `references/lane-vocabulary.md`** — ship:
   - The canonical 7 roles + one canonical **display label per role** (kill "same actor named
     four ways": `前台·易壳BD / 前台·易壳（售前对接）/ 前台·我方人工 / 前台·现场…` must converge).
   - **"Who is the customer of THIS phase?" guidance keyed by phase-type** (sales/procurement/
     setup/operations/assessment/renewal), so independent drafters put the customer on the
     `customer_actions` spine instead of miscasting the buyer as `backstage_actions`.
   - A short crosswalk from common actor-lane source layouts (FigJam actor lanes, Notion
     Shostack 5-lane) to the canonical roles.
2. **`skills/blueprint/SKILL.md`** — in the drafting section, require the drafter (main context)
   to load `references/lane-vocabulary.md` and use canonical roles+labels; add "identify the
   phase's customer first" as an explicit pre-draft step.
3. **`agents/blueprint-reviewer.md`** — add a findings category: flag any lane whose role/label
   deviates from `lane-vocabulary.md`, any phase missing a `customer_actions` spine, and any
   actor group labeled inconsistently across phases.

**Acceptance:** re-drafting ≥2 phases independently against the vocabulary yields consistent
role assignment + identical labels for the same actor group, with a customer spine in every
customer-facing phase. `blueprint-reviewer` flags a deliberately-miscast lane in a test IR.

#### 2.2 — Per-scenario sign-off hash [#19]

**Gap:** sign-off is defined in prose (`references/workspace-state.md:71`,
`references/review-import-playbook.md:36–47`) as SHA-256 of the **whole IR file bytes** — there
is **no code** computing or verifying it (grep `hashlib`/`sha256` in `scripts/` → nothing;
it's agent-executed). Adding a phase changes the file → every prior per-scenario sign-off
goes stale (exactly what bit the dogfood: ⑥'s hash went stale after the 9-phase merge).

**Edits:**
1. **Rebind semantics to per-scenario content.** Update `references/workspace-state.md` +
   `references/review-import-playbook.md`: the signed unit is a canonical serialization of
   **one scenario's** subtree (paths/layers/steps/path_steps/cells/triggers), hashed
   independently. `blueprint-workspace.json` grows a per-scenario `content_hash` under each
   `scenarios.<id>` entry; the top-level whole-file `sign_off` becomes optional/derived.
2. **Add a helper `scripts/compute_signoff_hash.py`** (stdlib-only) that emits the canonical
   per-scenario hash so sign-off + import verification are deterministic and not
   hand-computed. Define the canonical serialization (stable key order, NFC, locale-scoped)
   explicitly in the doc so zh and en hash independently.
3. **Import gate:** import verifies the per-scenario hash of each scenario it touches and
   refuses on mismatch — unchanged scenarios stay signed when a sibling is added.
**Acceptance:** adding an 11th phase to a signed 10-phase IR leaves the 10 prior scenarios'
hashes unchanged and still importable; only the new scenario needs sign-off. Helper script
covered by `run_tests.sh`.

#### 2.3 — Commit IR to JSON default; scrub YAML/stdlib claims [#2]

**Gap:** `scripts/validate_ir.py:11` ("Stdlib only … no pip installs assumed"), `:135` ("PyYAML
is not installed and this validator is stdlib-only"), plus `generate_fallbacks.py:35`,
`generate_seed_sql.py:29`, and CLI help at `validate_ir.py:152` / `generate_fallbacks.py:251` /
`generate_seed_sql.py:481` all imply YAML authoring is first-class while the code is JSON-native
and only reads YAML *if PyYAML imports*. PEP 668 blocks the system `pip install pyyaml` on the
dogfood machine — so YAML was never actually authorable.

**Decision to lock (see Open Questions):** make **JSON the sole documented authoring format**;
keep the optional YAML read-path but demote it to an undocumented convenience, OR drop it. The
code already works stdlib-only in JSON — this is mostly truth-in-advertising.

**Edits:** scrub `README.md` / `skills/blueprint/SKILL.md` / script docstrings + CLI help to say
"IR is JSON" without implying YAML parity; keep the honest "stdlib-only" claim (it's true for
JSON). If dropping YAML: remove the PyYAML branch + its tests (`run_tests.sh:120–138`).
**Acceptance:** no doc or help text implies YAML authoring works out of the box; a clean stdlib
Python can author + validate + generate with zero installs.

**Phase 2 exit:** vocabulary shipped + wired into SKILL.md + reviewer; per-scenario sign-off
documented + helper landed + import gated; JSON-default docs consistent. `run_tests.sh` green.

---

### Phase 3 — Tier 3: Playbook / doc notes (prose only, cheap, bundle together)

#### 3.1 — Multi-account Supabase connectors [#1]
`references/adapter-contract.md` + `references/deploy-notes.md`: document that the Supabase MCP
is per-account/per-org; importing to a project in another account needs a **second connector**
added for that account (the Slack/Notion/Figma multi-account pattern). Note the failure signature:
a bare `permission denied` with no project context means wrong-account connector — detect it and
tell the user to add the right connector, don't retry blindly.

#### 3.2 — FigJam per-frame fetch [#4]
`references/ingest-playbook.md` (currently only line 4/line 30 mention FigJam-via-MCP): add that
a **whole-board** extraction (Ecoeled hit ~87k chars) exceeds the MCP tool token limit. Playbook:
get board metadata / a screenshot first, identify the target **frame node id**, and fetch
**per-frame** — never the whole board.

#### 3.3 — Freshly-added MCP needs a session reload [#22]
`references/review-import-playbook.md` (Phase B pre-flight) + `deploy-notes.md`: a `claude mcp add`
done mid-session is **not reachable until a Claude Code reload**. If the import target is
"unreachable despite the user having authenticated," the fix is a reload, not more retries — say
so and prompt it.

**Acceptance:** each of the three docs answers its friction in a way that would have unblocked
the dogfood without trial-and-error. No code.

---

### Phase 4 — Tier 4: Deferred (record the decision, don't silently drop)

#### 4.1 — Divider line renders above tall cells [#18]
Interaction/visibility divider sometimes paints **above** a tall/multi-line cell block instead
of strictly between lanes. Needs investigation in the divider-anchoring geometry (likely divider
vertical position computed vs. single-line cell height). Universal but isolated. **Deferred:**
needs a focused render investigation; not blocking. Track as its own follow-up.

#### 4.2 — Journey-stage image source [#6]
No documented path for sourcing `step_visual` / `journey_stage` images when an org has no
screenshots yet. **Deferred pending a UX decision** (see Open Questions): manual screenshots vs.
FigJam frame exports vs. a graceful empty-visual-row placeholder. Park until decided; don't ship
a half-answer.

---

## System-Wide Impact

- **Interaction graph.** `getBlueprintLayerStyle` is called by all three grids +
  `VisualWalkthroughModal` — the signature change must stay backward-compatible (new arg
  optional) so the modal caller doesn't break. `generate_fallbacks.py` gaining a slides emitter
  means `--register` now writes two files (`blueprintFallbacks.ts` + `nav.ts`); anything that
  assumed it only touches data must be re-checked (`generate_scale_fixture.mjs`). The
  `slides.ts → nav.ts` rename also touches every importer of the `Slide` type.
- **Error propagation.** Per-scenario sign-off (2.2) changes the import refusal contract: import
  now refuses per-scenario, not whole-file. The import path + any state-reading code that assumes
  a single `sign_off.content_hash` must read the new per-scenario field.
- **State lifecycle.** `blueprint-workspace.json` schema grows a per-scenario `content_hash`;
  migrate existing workspace files (or treat missing per-scenario hash as "unsigned, re-sign").
- **API surface parity.** Doc claims (#2) and the actual script capabilities must agree —
  the scrub is exactly a parity fix between prose and code.
- **Integration scenarios worth a manual pass:** (a) render a non-English IR and confirm role
  colors; (b) add a phase to a signed IR and confirm siblings stay signed; (c) regen nav from a
  non-Ecoeled IR and confirm no sample leakage; (d) re-draft two phases against the vocabulary and
  diff role/label consistency.

## Acceptance Criteria

### Tier 1
- [ ] `ROLE_STYLES` + 3-arg resolver in skill `blueprintTheme.ts`; 3 grids pass `layer.role`;
      `VisualWalkthroughModal` caller decision recorded
- [ ] `ARROW_CHEVRON_SIZE = 16`, `ARROW_STROKE_WIDTH = 3`
- [ ] panel `color-mix` blend rule removed **and** dead `--blueprint-panel-cell-blend` var +
      TS plumbing deleted
- [ ] `slides`→`nav` rename landed (`FALLBACK_NAV`/`NavItem`/`types/nav.ts`, grep-clean);
      `generate_fallbacks.py` emits `FALLBACK_NAV` from the IR; reproduces the 10-phase nav;
      generator test added; no sample/scale nav leakage
- [ ] `tsc --noEmit` clean, `scripts/tests/run_tests.sh` green

### Tier 2
- [ ] `references/lane-vocabulary.md` shipped (roles + canonical labels + phase-type customer
      guidance + source-layout crosswalk); wired into `SKILL.md` drafting + `blueprint-reviewer`
- [ ] per-scenario sign-off documented in `workspace-state.md` + `review-import-playbook.md`;
      `compute_signoff_hash.py` landed + tested; import gates per-scenario
- [ ] JSON-default: no doc/help text implies YAML parity; stdlib claim stays honest

### Tier 3
- [ ] multi-account Supabase note (#1), FigJam per-frame note (#4), MCP-reload note (#22) added
      to the named references

### Tier 4
- [ ] #18 and #6 left `open` in `DOGFOOD_FRICTION_LOG.md` with the deferral rationale, and
      referenced here (§4.1/§4.2) as the tracked home until a follow-up plan picks them up

## Dependencies & Risks

- **Tier 1 is independent and should land first** — pure port, de-risks the visible regressions
  immediately, no dependency on Tier 2/3.
- **2.2 (per-scenario hash) is the riskiest** — it changes the import contract and the workspace
  state schema. Sequence it after Tier 1 and give it its own review + migration story.
- **CJK escaping** in generated `.ts` (`slides.ts`, `blueprintFallbacks.ts`) is the known
  `tsc` failure mode — verify the slides emitter escapes correctly.
- **Don't over-port #5:** the Ecoeled pill values are content, not template. Porting them would
  bake a client's Chinese labels into the skill.

## Open Questions (resolve during implementation)

1. **#2 YAML:** demote-and-keep the optional YAML read-path, or delete it outright? (Leaning
   delete — it's never usable without PyYAML and creates the false-parity problem.)
2. **#6 journey images:** which sourcing model does the skill endorse — manual screenshots,
   FigJam frame export, or empty-row placeholder? Blocks 4.2.
3. **1.1 `VisualWalkthroughModal`:** does the walkthrough `entry` carry a role to pass, or stay
   2-arg?
4. **2.2 migration:** treat a workspace file missing per-scenario hashes as fully unsigned
   (safe, forces re-sign) or best-effort backfill from the old whole-file hash?

## Sources & References

- **Origin record:** `~/Documents/Claude/Projects/Ecoeled/blueprint-workspace/DOGFOOD_FRICTION_LOG.md`
  (12 skill frictions: #1 supabase multi-account, #2 YAML/JSON, #3 slides-from-IR, #4 FigJam,
  #5 role colors, #6 journey images, #17 arrows, #18 divider, #19 sign-off hash, #20 lane vocab,
  #21 panel blend, #22 MCP reload)
- **Validated Tier-1 diffs (clone):** `blueprintTheme.ts:255–296`, `ServiceBlueprintGrid.tsx:236`,
  `SideBySideCompareGrid.tsx:414`, `IntegratedBlueprintGrid.tsx:529`, `blueprintArrowGeometry.ts:19,22`,
  `index.css:171–172`, `types/slides.ts:76–217`
- **Skill-repo targets:** `src/lib/blueprintTheme.ts:183,248`, `src/lib/blueprintArrowGeometry.ts:19,22`,
  `src/index.css:171–178`, `src/lib/techPillColors.ts:10`, `scripts/generate_fallbacks.py:54,158`,
  `src/types/slides.ts:83`, `references/workspace-state.md:71`, `references/review-import-playbook.md:36–47`,
  `scripts/validate_ir.py:11,135`, `references/layer-roles.md`, `references/ingest-playbook.md:4,30`,
  `references/adapter-contract.md`, `references/deploy-notes.md`, `agents/blueprint-reviewer.md`,
  `skills/blueprint/SKILL.md:106–118`
