---
title: Migration v2 — bring the starter kit to uno-blueprint parity
type: plan
status: draft-for-review
date: 2026-08-08
supersedes: docs/plans/2026-08-06-002-plan-agentic-blueprinting-transfer.md (scope, not principles)
sources:
  - uno-blueprint main @ 37fd2e5 (49 commits since 82cc969 — compare v3, mobile shell, eval harness maturity, tier model)
  - this repo @ 695cd12 + uncommitted Phase-1 fixes
  - uno-blueprint docs/plans/2026-08-08-003 (docs information-architecture plan)
---

# Migration v2 — the starter kit catches up to the proving ground

## STATUS REFRESH — 2026-08-08 (end of day; supersedes stale claims below)

Both repos moved after this plan was written. Current truth:

**This repo is at 0.3.0** (`274c4a0..3e7127a`): Phase 0's plugin fixes are
LANDED (`b80af90`), the version was cut, and the structure changed to the
**per-skill resource layout** — 8 shared root `references/` + per-skill
`references/` and `scripts/` under each of `skills/{map,slice,audit,whatif}`.
The IR now carries the wave-2 spec fields (`1472c5b` — an IR schema change;
Phase 6's "confirm schema_version unchanged" is now "bump and CHANGELOG
it"). Skill eval sets landed in-plugin (`4998869`). Canvas-adapter rules
single-homed (`c5fab6c`).

**Phase 1 is substantially DONE**: the derived-layer DDL is in
`supabase/migrations/` (`20260729120000_derived_layer.sql` +
`20260730090000_..._grants_hardening.sql` + `20260803001000_slices_origin_
allows_human.sql`). Still open from Phase 1: the **service-tier recipe**
(no service_account / RPC-assert migrations here yet), **ERD regen** (now
unblocked — do it), **seed/fixture parity for derived rows**, and the
adapter-contract no-DB findings note.

**Phase 0 residue**: `package.json` still says `0.0.0` (version invariant
still broken — one-line fix) and the Ecoeled workspace upgrade hasn't run.

**uno-blueprint executed its docs IA** (`c410d10`, `73b6504`): generated
`docs/INDEX.md` via `scripts/generate-docs-index.mjs`, full
product/design/engineering/reference trees, boot-protocol AGENTS.md.
Phase 4 here mirrors that — adopt the **generated-INDEX script** pattern
rather than a hand-written map. uno's `decisions/` was left empty, which
supports this repo's decision to cut that layer.

**New uno surface a port must now account for** (`71cb1f7`, `93f1c22`):
a canonical cross-repo **blueprint contract** (`src/lib/blueprintContract.
ts`, `urlViewState.ts`) with a CI probe (`bot-contract-probe.yml`), shared
**semantic-search DDL** (versioned migrations 20260809…), and **uno-bot** —
a Slack consumer hitting the deployed blueprint. The bot is live proof of
the "external agent" way-in; the contract + probe pattern is worth porting
as the template's own consumer-contract story (new Phase 2/3 line item).
Eval harness in uno is now one-sourced on the app's real tool surface
(`1d33428`) — port that shape, not the older mirrored-cases shape.

Everything below stands except where this section corrects it.

## Why a v2 plan

The 2026-08-06 transfer plan was written when the delta was "design system +
access model." Since then uno-blueprint shipped **49 commits / +17k lines**
that change what the product *is*:

- **Compare v3 cockpit** — stacked bands, difference ledger, divergence strip,
  fold, Merged-as-reading-preset (branch canvas gate measured FAIL, honestly).
- **Mobile shell** — view-only for every tier, journey reader + touch map,
  semantic zoom, tokenized shell widths.
- **In-app agent harness at full parity** — 14 write + 11 UI tools + ~20
  registered UI commands, mobile read roster, BYO-key providers
  (google/anthropic/openai), vendored skills/references synced from this repo.
- **Automated grading** — `scripts/agent-harness/`: 21 cases, 89 rubric lines,
  deterministic `[T]` trace checks + LLM `[J]` judge lines, every line citing
  the written rule it traces to; `--smoke` (keyless), `--repeat N` majority
  voting; 168 committed transcripts.
- **Service-account tier model** — RESTRICTIVE policies on 13 tables,
  `is_service_account()` asserted inside all 21 SECURITY DEFINER RPCs; three
  personas (anon view / signed-in view+chat / service edit+agent-writes).
- **Derived layer live** — slices, findings (fingerprint dedupe), evidence on
  main with UI, mutations, and canvas write tools.
- **Docs IA plan** — uno is about to restructure its docs by audience
  (product/design/engineering/decisions). The kit's docs should be planned
  against that shape, not the old chronological one.

Meanwhile this repo's honest state: **transfer Phase 1 done but uncommitted**
(dirty tree — scratch-file deletions, `.gitignore`, audit_tools error
formatting, slice fallback clause, and the old plan file itself all
unstaged/untracked); template frontend untouched (monolithic `src/index.css`,
no vitest, no TanStack); **the derived layer has no DDL here at all** — the
sb:slice/audit/whatif skills' persistence targets are fully specified in
references but absent from the shipped schema, ERD, and seed pipeline;
README still says "The skill" (singular); `skill-architecture.svg` and
`skill-workflow.svg` predate the four-skill split; `package.json` says
`0.0.0` against the CHANGELOG's "plugin version = template version" invariant.

## The revised vision — what an adopter gets

Clone → `npm install` → `npm run dev` → a rendered service blueprint with
**zero config, zero account**. From there, four capability tiers they can
climb one at a time:

1. **Read** — the template app off shipped fallback data: board overview,
   scenario detail, compare cockpit, slices & presentation, print/PDF, and a
   phone-friendly reader (mobile shell). Shareable `?cell=` deep links.
2. **Author with the IDE agent** — the four `sb:*` skills (map/slice/audit/
   whatif) against their own documents → validated IR → import via an adapter
   (Supabase paved road, or their own per the contract).
3. **Author in the app** — sign in, in-app agent with the same four skills,
   full write parity through ledgered RPCs, findings triage on canvas,
   revertible session ledger. BYO API key, localStorage only.
4. **Verify** — run the eval harness against their own deployment:
   `--smoke` needs no key; with a key, 89 graded rubric lines tell them
   whether *their* configuration of the agent still follows the rules. The
   grade report is the kit's regression contract, offered to adopters.

That last tier is the identity claim of "agentic service blueprinting": not
just skills that write blueprints, but a **shipped, graded harness proving
the agent behaves** — nobody else's starter kit has that.

## Standing principles (carried, still override everything)

Unchanged from the v1 plan: starter-kit framing; no port may deepen Supabase
coupling (no-DB fallback must render with zero env vars); Supabase is a
recipe, not a rule; rules travel, debt doesn't (no matcha values, no uno
project IDs, no Ecoeled data — grep every ported file); backend-neutral
access contract in AGENTS.md, Supabase mechanics in `supabase/DATABASE.md`.

New principle: **the eval harness travels with the agent.** An agent surface
ported without its rubric lines is not ported — the grading is what made
uno's agent trustworthy (five eval rounds, 65→84 line progression), and it is
the only artifact that keeps it trustworthy after adopters modify it.

## Phases

### Phase 0 — stop the bleeding (an hour)

1. Commit the uncommitted Phase-1 fixes + track the v1 plan file (one
   `git stash`/checkout from losing both today).
2. Fix the version invariant: `package.json` 0.0.0 → match plugin manifest.
3. Cut **0.2.3** = the v1-plan Phase 1+2 release (plugin fixes only), so the
   Ecoeled workspace can upgrade onto a stable rung before the big port.
4. Ecoeled workspace upgrade to 0.2.3 (v1 plan A4 — its bundled validator
   exit 0, sign-off hashes recomputed). Also re-check Ecoeled's Supabase
   project for the `rename_owner_tag` anon-execute defect found and fixed in
   uno (lwphwygorbbwdobnjygo, not yet audited).

### Phase 1 — derived layer becomes real here (backend)

The one gap the v1 plan didn't cover, and it grows with every skill change.

1. Extend the consolidated template migration (or add a second numbered one —
   decision below) with the derived layer: `slices`, `slice_items`,
   `findings` (open-fingerprint partial unique index), `evidence`,
   `propositions`, plus the cell spec fields and `cell_triggers.kind`
   (trigger|needs).
2. Port the **tier model as the Supabase recipe**: `is_service_account()`,
   RESTRICTIVE write policies, in-body RPC asserts, findings
   INSERT-requires-open, column-narrowed findings UPDATE. Parameterized —
   service accounts configurable, per the uno port note.
3. Regenerate `erd.mmd` + `supabase/schema.reference.sql` + seed generator
   coverage for the new tables; fixture parity test extends to derived rows.
4. Update `references/adapter-contract.md` + `data-model.md`: what a no-DB
   adopter does about findings/slices (answer: `audit_tools.py` ledger files
   are already the no-DB findings store — say so normatively).
5. Migration-authoring notes into `supabase/DATABASE.md` (v1 plan §C ops
   lessons: REVOKE-from-PUBLIC, same-day committed migration files,
   evidence-undo/insert-policy coupling — plus the new one: RESTRICTIVE
   policies never bind SECURITY DEFINER RPCs, guard in-body).

### Phase 2 — template frontend port (the big one)

v1 plan B1–B6 in the same order (CSS split → tokens+drift tests → brand
seam/hue dial neutral default → backend-agnostic query seam → component
patterns → tooling incl. vitest + zero-lint), **plus the new surfaces**:

- **Compare v3**: viewTypeVocabulary two-seam map, StackedCompareGrid +
  path bands, difference ledger + panelState single owner, divergence strip,
  fold, Merged reading preset. Keep `compareGate.report.test` as a
  *reporting* test — adopters measure their own data's gate.
- **Mobile shell**: `useMobileShell` fork, journey reader, touch contract
  (touch-none, slop pending-pan, ghost-pointer reset), snap sheets
  (base-ui Drawer + `defaultSnapPoint` trap), semantic zoom (0.35 tier),
  view-only-every-tier decision carried as the default.
- **Slices/findings/evidence UI**: SliceView/Presentation/composer, evidence
  tab, findings surfaced via agent tools (matches Phase 1 schema).
- **Deep links** (`?cell=` + CSS.escape guard) and the step-visual image
  discipline (300px cap rationale documented — the mobile OOM lesson).

Gates unchanged: build/lint/test green AND a clean clone renders the sample
scenario with no `.env`. Every ported surface must render against fallback
data or it doesn't ship.

### Phase 3 — in-app agent + eval harness port

Previously "decide separately"; now decided: it ships. This is the pillar.

1. **Agent runtime**: `src/lib/agent/` (loop, role.md, specs/registry split,
   providers, uiBridge/uiCommands, placement/dock, sessions + persistence,
   mobile roster whitelist). Writes dispatch onto the same mutation wrappers
   the UI uses — the ledger/revert/invalidation contract comes free and must
   stay that way.
2. **Vendoring**: `scripts/sync-agent-skill.mjs` pattern inverts here — this
   repo IS the canonical source; the template app vendors from its own
   `skills/` + `references/` (no cross-repo sync needed — one repo, one copy
   discipline, a `--check` drift guard in CI/test).
3. **Eval harness**: port `scripts/agent-harness/` with cases rewritten
   against the shipped **sample fixture** (not Warm-Up/uno rows — reads must
   be real against the adopter's own data or the no-DB fixture). Keep the
   family structure (routing/grounding/writes/errors/injection), `[T]`+`[J]`
   grading, rule-citation per line, `--smoke`/`--repeat`. Target: harness
   runs keyless out of the box (`--smoke`), graded with any one provider key.
4. **Agent parity migrations**: the RPCs the write tools depend on
   (duplicate_scenario, add_lane-returns-ids, duplicate_path slot-aware)
   fold into the Phase 1 consolidated schema.

### Phase 4 — docs & assets revamp (this repo's mirror of uno's IA plan)

1. **README rewrite**: four skills first-class (kill "The skill" singular),
   the four-tier adopter story above as the spine, repo map corrected
   (5 agents, 29 refs, audit/slice tools in the scripts table), Supabase
   framing neutralized in "Connect your agents", styles pointer updated,
   demo placeholders resolved or removed.
2. **SVG regeneration**:
   - `skill-architecture.svg` → four skills, 5 agents, honest reference
     counts, all playbooks.
   - `skill-workflow.svg` → the full loop: map (draft→sign-off→import→verify)
     **plus** the derived cycle (slice → audit → findings triage → whatif →
     accept → promote → re-import). This is the headline diagram.
   - `blueprint-anatomy.svg` stays (accurate). `data-model-hierarchy.svg`
     gains an optional derived-layer companion panel or a second figure.
   - `erd.mmd` regenerated from Phase 1 schema.
3. **Lightweight audience IA**, mirroring uno's plan at kit scale: keep
   `references/` as the agent-facing layer (it already is), add a small
   `docs/` split — adopter guide / operator guide (Supabase recipe) /
   decisions — with an INDEX. Don't over-build; the kit's docs budget is a
   fraction of uno's. Answers uno IA-plan open question 5: plugin docs live
   HERE, uno's docs link over.
4. **AGENTS.md**: keep the router role, add the three backend-neutral access
   rules (v1 §C) + boot pointers into the docs INDEX. Also close
   `docs/notes/2026-08-05` residue: `schema_version` gets a normative home in
   `ir-schema.json`; slice-playbook origin contradiction fixed.

### Phase 5 — dogfood + verification

1. Ecoeled workspace upgrade to the new version (second rung; the 7
   re-drafted scenarios' re-sign-off is Bill's separate task but the upgrade
   must not disturb their `drafted` state).
2. Cold-clone adopter walk: clone → install → dev → rendered blueprint, no
   account, no docs reading. Then the agent tier: paste a key → chat cites
   real cells.
3. `render-checker` full walk (both themes, mobile viewport included now).
4. Eval harness green on the sample fixture: `--smoke` clean, and one real
   graded run committed as the reference transcript set.

### Phase 6 — publish (unchanged from v1 Phase 6)

Marketplace listing, demo recordings, version **0.3.0** (the port is a minor
bump story: new surfaces, no breaking IR change — confirm IR schema_version
unchanged; if Phase 1 touches IR, bump it and say so in CHANGELOG).

## Decisions needed from Bill before execution

1. **Frontend port scope**: full uno parity (compare v3 + mobile + slices +
   agent panel) as planned above, or a curated subset first (design system +
   slices) with compare/mobile in 0.4? Full parity recommended — the surfaces
   interlock (ledger/panelState, mobile roster, fold agent parity) and
   splitting them re-creates drift.
2. **Migration topology**: extend the single consolidated
   `20260716200000_template_schema.sql` in place (clean for new adopters,
   breaks anyone who already applied it) vs. additive second migration
   (honest upgrade path). Recommend **additive** — the kit now has at least
   one real downstream (Ecoeled) and the upgrade path is itself a product
   feature being dogfooded.
3. **Eval harness provider default**: keep Gemini-default (matches uno) or
   neutral "first key found wins"? Recommend neutral with Gemini as the
   documented example.
4. **Sample fixture size**: current fixture vs. a richer one that makes
   compare/fold/audit demonstrable out of the box (compare needs 2+ paths
   with real divergence; audit needs plantable findings). Recommend enriching
   the fixture as part of Phase 2 — the empty-feeling demo is the kit's
   biggest first-impression risk.
5. **Anon sandbox mode** (uno plan 2026-08-05-001, approved there but
   unbuilt): in scope for the kit's deployed-demo story, or out until uno
   builds it? Recommend out — track as a shared future feature.

## Sequencing & size

| Phase | Work | Gate | Size |
| --- | --- | --- | --- |
| 0 | Commit fixes, version sanity, 0.2.3, Ecoeled rung 1 | plugin tests green; workspace validator exit 0 | hours |
| 1 | Derived-layer DDL + tier recipe + ERD/seeds | `supabase db reset` clean (needs Docker or hosted scratch project); fixture parity test green | M |
| 2 | Frontend port incl. compare/mobile/slices | lint 0, vitest green, clean clone renders keyless | XL |
| 3 | Agent + eval harness | `--smoke` green; one graded run ≥ uno's guard-set bar on ported lines | L |
| 4 | Docs + SVGs + IA | INDEX routes; SVGs match inventory counts exactly | M |
| 5 | Dogfood + walks | render-checker clean; cold-clone walk clean | M |
| 6 | Publish 0.3.0 | marketplace install works from clean cache | S |

Phases 1↔2 partially parallel (schema vs styles don't collide); 3 depends on
both; 4 can draft alongside but finalizes after 3 (counts must be true).

## Risks (v1 risks stand; new ones)

| Risk | Mitigation |
| --- | --- |
| Port scope balloons — 49 commits is not a replay script anymore | Port by surface with per-surface gates; the fallback-data render rule culls anything not actually generalized |
| Eval cases silently depend on uno data shapes (Warm-Up names, cell ids) | Case rewrite against the fixture is explicit Phase 3 work, not find-and-replace; `[T]` predicates re-derived |
| Derived-layer DDL drifts from references (two specs, one truth) | Phase 1 gate includes a schema-vs-slice-schema.json consistency check; references cite the migration |
| Mobile/compare port carries uno-specific behavior decisions adopters may not want | Each carried decision (view-only mobile, Merged preset, fold opt-in) documented in decisions/ with the evidence, framed as defaults not dogma |
| uno docs IA lands mid-port and moves paths this plan cites | Cite uno paths as "@ 37fd2e5"; Phase 4 re-links after uno's Phase 1 |
| Dirty tree loses Phase-1 work before Phase 0 runs | Phase 0 step 1 is literally first |
