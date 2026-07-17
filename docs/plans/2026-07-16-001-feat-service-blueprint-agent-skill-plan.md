---
title: "feat: Publishable service-blueprinting agent skill (generalizing uno-blueprint)"
type: feat
status: active
date: 2026-07-16
---

# ✨ Publishable Service-Blueprinting Agent Skill

## Overview

Create a publishable Claude Code **plugin** (working name: `service-blueprinting`) that generalizes the uno-blueprint workflow Bill and Meryem built, so any org/team can go from "scattered service documentation" (or nothing at all) to a **deployed, evolving service blueprint** backed by the uno-blueprint frontend and their choice of backend.

The skill is **specialized to creating and managing service blueprints** — six capabilities:

1. **Ingest** — parse existing service journey/blueprint documentation in any format (text/md, PDF, docx, FigJam/Figma via MCP, spreadsheets) into a structured intermediate representation (IR) matching the blueprint data model.
2. **Co-create** — guided elicitation to fill in or build a blueprint from scratch when docs are missing or only describe the *system*, not the *journey* — right-sized: a founder mapping one flow skips the lifecycle ceremony; a huge multi-actor journey gets chunked one scenario at a time.
3. **Present** — render the blueprint with the uno-blueprint React + Vite + shadcn frontend ([BilLogic/plus-uno-blueprint](https://github.com/BilLogic/plus-uno-blueprint)), including a **print/PDF view** for stakeholders who won't open a web app.
4. **Import** — provision the correct ERD on the org's chosen backend and load the content, via a **backend adapter contract**: Supabase is the reference adapter (local or hosted, e.g. `osybxeojvsqcwxkgnalm.supabase.co`); the no-DB fallback files are themselves an adapter and the zero-infra/any-host option. (Live-DB mode requires a PostgREST-compatible read API — see Design principles.)
5. **Translate** — adapt an org's *existing* blueprint that doesn't match our template (different lane structures, FigJam/spreadsheet blueprints, classic Shostack format) onto this data model via a reviewed crosswalk mapping, customizing layers/roles to fit rather than forcing their vocabulary into ours.
6. **Update** — evolve a blueprint over time as a first-class flow: the skill detects an existing/deployed workspace, accepts delta edits or new source docs, re-imports idempotently, and points at redeploy. A blueprint touched once is a failure; touched monthly is the product.

**Deliberately NOT a capability: deployment.** Hosting a static Vite app is generic agent competence — any bot figures out Netlify/Vercel without our help. The skill ships only `references/deploy-notes.md` with the blueprint-specific gotchas (SPA redirect, `VITE_SUPABASE_*` env vars, **public-exposure warning for client data**, one site per locale), and the template app carries a ready `netlify.toml`. Everything generic is left to the agent.

Dogfood target: **project Ecoeled** (`/Users/billguo/Documents/Claude/Projects/Ecoeled`).

## Problem Statement

The uno-blueprint app is done (frontend + backend), but the *workflow* that produced it is locked inside this repo and Bill/Meryem's heads:

- Content authoring today is **~700 hand-written SQL content migrations** with hand-allocated deterministic UUIDs, duplicated into **~45 hand-written TS fallback files** (`src/data/`). No org could replicate this.
- The repo is entangled with PLUS-specific content: hardcoded lifecycle/phase/scenario IDs ([useLifecyclePhases.ts:8-14](../../src/hooks/useLifecyclePhases.ts)), scenario "repair" shims, display-flag ID sets, fallback-wins merge logic, PLUS screenshots.
- Cell semantics are carried by **magic English layer names** (`'Front Stage Tech'`, `'Visual'`, `'Front Stage Actions'` → line of visibility) in [blueprintLayout.ts:11-31](../../src/lib/blueprintLayout.ts) — invisible, undocumented contract.
- There is no import pipeline, no write access path (RLS is SELECT-only for anon; **no write policies exist** — [20250603120000_service_blueprint.sql:246-262](../../supabase/migrations/20250603120000_service_blueprint.sql)), and no deploy config (no `netlify.toml`, no CI).

A publishable skill turns this one-off into a repeatable, teachable method — and publicizes the workflow.

## Proposed Solution

A **plugin with one skill** (`service-blueprinting` — kept under the SKILL.md 500-line budget via `references/` playbooks), organized around one canonical artifact: a human-editable **intermediate representation (IR)** in YAML, validated by JSON Schema, living in a git-tracked workspace alongside a `blueprint-workspace.json` state file (enables resume, per-scenario progress, idempotent re-import, sign-off integrity, and the update flow).

```
(template repo root — plugin and template app live in ONE repo; see topology)
├── .claude-plugin/plugin.json           # name, semver, author, license, keywords
├── skills/
│   └── blueprint/SKILL.md               # THE skill (service-blueprinting) — detect workspace state → scaffold / ingest /
│                                        #   co-create / translate / review / sign-off / import / update; phase depth
│                                        #   loads on demand from references/ playbooks (progressive disclosure)
├── agents/
│   ├── document-reader.md               # reads sources → structure: corpus survey (classify journey/system/sensitive),
│   │                                    #   single-doc deep-read with provenance, or foreign-blueprint lane extraction
│   ├── blueprint-reviewer.md            # fresh-context adversarial review of the drafted IR before sign-off
│   └── render-checker.md                # drives the browser through every scenario/view post-import/deploy, screenshots
├── hooks/hooks.json                     # workspace-status on session start · auto-validate on IR edits · secret guard on writes
├── src/ · supabase/ · docs/ · …         # the template app itself (frontend + schema), incl. docs/erd.mmd (templated ERD)
├── references/                          # progressive disclosure: SKILL.md stays small, depth loads on demand
│   ├── ingest-playbook.md               # docs → IR: triage, parallel document-readers, skeleton preview
│   ├── cocreate-playbook.md             # elicitation flow, right-sizing branches
│   ├── translate-playbook.md            # foreign blueprint → crosswalk → IR
│   ├── review-import-playbook.md        # grid previews, sign-off, adapter import, verification
│   ├── deploy-notes.md                  # blueprint-specific gotchas ONLY (SPA redirect, env vars, exposure warning, per-locale sites)
│   ├── data-model.md                    # ERD, tables, ordering, view/path types
│   ├── ir-schema.json                   # JSON Schema for the IR
│   ├── adapter-contract.md              # backend adapter operations (see Phase 1)
│   ├── crosswalk-schema.json            # translation mapping artifact (see Phase 2)
│   ├── layer-roles.md                   # semantic role ↔ display-name contract + custom roles
│   ├── elicitation-protocol.md          # co-creation question script with right-sizing branches
│   ├── customization.md                 # roles, theming, view types, portfolio conventions, template upgrades
│   └── generalization-audit.md          # hardcoded-ID/shim inventory + status
├── scripts/
│   ├── validate_ir.py                   # schema + referential-integrity checks + scale warnings
│   ├── generate_seed_sql.py             # IR → transactional scenario-replace seed SQL
│   └── generate_fallbacks.py            # IR → generated data module for no-DB mode
├── assets/
│   ├── schema.ddl.sql                   # portable DDL + trigger function (host-neutral)
│   ├── policies.supabase.sql            # Supabase-specific RLS/anon policy layer
│   └── HANDOFF.md.template              # per-workspace maintenance README (where the IR lives, how to update/redeploy)
│                                        # (netlify.toml lives at the template app root — not a skill asset)
├── README.md / LICENSE / CHANGELOG.md
└── (marketplace.json entry in the distribution repo)
```

**Pipeline:** `source docs → IR (YAML) → validate → human review/sign-off → import (adapter) → build check → deploy`, then an **update loop**: `delta edits/docs → IR change → validate → sign-off → re-import → redeploy`.

### Why the IR is the keystone

The frontend's canonical normalized shape already exists: `BlueprintData {path, layers[], steps[], cells[], triggers[]}` ([normalizeBlueprint.ts:178-211](../../src/lib/normalizeBlueprint.ts), [blueprint.ts:53-59](../../src/types/blueprint.ts)). The IR mirrors it plus a lifecycle/phase/scenario manifest. One IR feeds **both** import targets:

- **Seed SQL** in the existing `supabase/seeds/` pattern — **transactional scenario-scoped replace** (delete-and-reinsert inside one transaction; FK cascades handle children), dependency order `paths → steps → path_steps → layers → cells → cell_triggers` (required by the `cells_validate_path_match` DB trigger, [20250604000000_scenario_steps_path_steps.sql:61-92](../../supabase/migrations/20250604000000_scenario_steps_path_steps.sql)). Scenario-replace (not `on conflict do update`) so rows *removed* from the IR can't survive as orphans.
- **Generated fallback module** replacing the 45 hand-written `src/data/` files — zero-infrastructure default mode; the app already fully works offline ([useScenarioBlueprint.ts:59-72](../../src/hooks/useScenarioBlueprint.ts)).

## Technical Approach

### Skill & agent architecture (final form, review round 5 — 2026-07-16)

**ONE skill (`service-blueprinting`) + three agents + three hooks + deterministic scripts.** Four shapes were compared across the review rounds (4 skills / 1 / 7 / 2 / this). Two insights settled it: (a) users never memorize model-invoked skills — natural language triggers them — and all blueprint work shares one vocabulary, so one skill with `references/` playbooks (progressive disclosure) covers it; (b) **the skill is specialized to the blueprint domain — anything a generic agent already does well is out.** Deployment is the case in point: hosting a Vite app is table-stakes agent knowledge, so it's not a capability, just `references/deploy-notes.md` with the blueprint-specific gotchas (SPA redirect, env vars, public-exposure warning, per-locale sites) plus a ready `netlify.toml` in the template app. The former `publish` skill is gone entirely.

Boundary tests applied: **a skill earns existence only for specialized domain knowledge a generic agent lacks; an agent earns a definition only if it needs a specific system prompt or tool scope; everything else is references.** (Locale translation is fanned out to generic subagents per skill guidance — no bespoke definition needed.)

| Skill | Covers | Dispatches |
| --- | --- | --- |
| `service-blueprinting` | The blueprint lifecycle: entry-state detection (nothing / docs / foreign blueprint / mid-pipeline / deployed / inherited) → scaffold, ingest, co-create, translate, review, hash-bound sign-off, import via adapter, update-in-place. Phase depth loads on demand from `references/*-playbook.md`. Before any content goes public, it surfaces the exposure warning from deploy-notes — but the deploying itself is the agent's generic competence | `document-reader`, `blueprint-reviewer`, `render-checker`; generic subagents for per-scenario locale translation |

| Agent | Does | Why a predefined agent |
| --- | --- | --- |
| `document-reader` | Reads sources → structure, in three modes set by the dispatching prompt: corpus survey (classify journey / system / sensitive-exclude at Ecoeled scale), single-doc deep-read with provenance, foreign-blueprint lane/column extraction | All three are "read something, return structure" — one definition, parallel fan-out, keeps the main conversation clean |
| `blueprint-reviewer` | Fresh-context adversarial review of the drafted IR before sign-off | A context that never saw the parsing catches what the drafting context is anchored on |
| `render-checker` | Drives the browser through every scenario/view after import/deploy, confirms rendering, screenshots | Mechanical, per-scenario, evidence-producing; needs browser tool scope |

| Hook | Fires | Purpose (setup-friction relief) |
| --- | --- | --- |
| Workspace status | Session start in a blueprint workspace | Injects current state ("2 of 6 scenarios drafted; EN imported, ZH pending") so any session resumes intelligently |
| Auto-validate | After any edit to `blueprint/*.yaml` | Runs `validate_ir.py` immediately — hand-edits never silently break the IR; "did you mean…" surfaces at edit time, not import time |
| Secret guard | Before file writes | Blocks service-role keys/credential patterns from landing in committable files |

Skills carry conversational guidance in the main thread (elicitation, review loops, sign-off belong where the user is); agents exist only for context isolation and parallel/mechanical work; hooks enforce what must *always* happen regardless of what the model remembers; correctness-critical steps (referential validation, seed-SQL/fallback generation, UUIDv5 derivation) live in `scripts/` — executed, never model-improvised.

**Loop engineering** (per [Getting started with loops](https://claude.com/blog/getting-started-with-loops)): the skill is written for agents running loops, so every phase ends at a **deterministic, quantitative stop condition** — never a subjective "looks done":

| Phase loop | Exit condition |
| --- | --- |
| Ingest/co-create a scenario | `validate_ir.py` exit 0 + scenario marked drafted in workspace state |
| Review | `blueprint-reviewer` findings resolved + sign-off hash recorded |
| Import | Transaction committed + read-back verification counts match the IR |
| Present | `tsc --noEmit` + `vite build` exit 0 + `render-checker` confirms every scenario renders |

The `blueprint-reviewer` agent is the post's "second-agent review for unbiased feedback" pattern. The per-scenario status in `blueprint-workspace.json` gives goal-based loops (`/goal`) verifiable criteria ("all 6 scenarios signed off") so a user can run long ingestions unattended without premature termination; SKILL.md playbooks state each loop's stop condition explicitly rather than assuming single-turn sufficiency. Token guidance follows too: `document-reader` survey mode is a candidate for a smaller model; fan-outs are piloted on a few documents before running a whole corpus.

**Guidance over prescription.** The skill's consumer is an LLM-powered agent, so SKILL.md files are written as *guidance* — explaining intent and trade-offs so the agent can steer each org's customization conversationally — with **hard requirements only where the system actually breaks**: import dependency order, the sign-off gate, secrets rules, running the validator before import, and never fabricating a blueprint from system-only docs. Each reference doc marks which of its content is REQUIRED vs. guidance, so a capable agent adapts freely without violating the contract.

### Design principles

- **Host-agnostic backend, honestly stated**: all imports go IR → adapter, and nothing outside an adapter may assume Supabase. Skill guidance presents the no-DB fallback and live-DB modes as **co-equal options and asks** — it never default-assumes Supabase. But the frontend *reads* via PostgREST-style embedded selects with `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` — so **live-DB mode requires Supabase or a PostgREST-compatible endpoint**; a bare Postgres host can receive writes but cannot serve the app. The truly any-host recipe is the **no-DB fallback adapter** (generated data files + static hosting anywhere). Both facts are documented rather than papered over.
- **Host-agnostic deploy**: the build always produces a static `dist/`; the deploy skill treats hosts as interchangeable recipes (SPA-redirect equivalents documented per host), with Netlify as the worked example.
- **Model/agent-agnostic by format, verified on Claude Code in v1**: SKILL.md files follow the portable Agent Skills format (plain markdown + executable scripts); the heavy lifting (validation, generation) lives in deterministic scripts, not model behavior; MCP-dependent steps (Figma, Supabase MCP) always have a CLI/manual degradation path. v1 verifies on Claude Code; a non-Claude harness smoke test is a stretch goal, not a claim.
- **Frontend fixed by choice**: the React + Vite + shadcn template is the presentation layer — the one deliberately non-agnostic piece.
- **Scalable & customizable**: the schema already supports unbounded layers/steps/paths — the frontend and validator must not cap them (validator emits soft warnings above thresholds, never errors). A client whose journey involves more actors/agents simply gets more layer lanes. The layer-role vocabulary is extensible (canonical set + org-defined custom roles rendering as generic rows), and **no role is hardcoded as the mandatory spine** — internal-ops blueprints with no "customer" layer are first-class. Every customization point (roles, theming, view types, path types) is documented in `references/customization.md`.
- **Comparison as a general primitive**: the side-by-side view takes **any two labeled blueprint variants** — "designed vs. reality" is just the default labeling. This one IR-level decision also serves version-compare (before/after redesign) and stakeholder-disagreement views at near-zero marginal cost. (Diff/versioning *workflows* are v2; the data shape is v1.)

### Use-case coverage (from review round, 2026-07-16)

- **Design-target personas (v1)**: in-house service designer, PM (no Docker, wants the designed-vs-reality gap analysis), and founder-with-nothing-written (pure elicitation). The consultant/agency persona (Bill & Meryem's own) defines the portfolio + handoff requirements; the "engineer told to set this up" persona defines the adapter-contract documentation bar.
- **Entry-state routing**: the router skill's first move is workspace inspection — nothing / prose docs / structured research / existing foreign-format blueprint / **existing deployed instance** / inherited half-finished workspace — and routes to create, ingest, translate, update, or resume accordingly. (Full consistency-audit of inherited workspaces is v2; state detection is v1.)
- **Design-now-build-later** (IR shape reserves these; no v1 UX): per-cell `evidence`/`attribution` fields (researcher traceability, stakeholder-merge conflicts modeled as data), variant pairs beyond designed/reality, appendable partially-valid IR (future live workshop mode), portfolio tooling (v1 documents the per-client convention: one git workspace per client, per-client env/deploy registry, `HANDOFF.md` generated per workspace).
- **Non-goals (declared, not silent)**: real-time multi-user editing (that's rebuilding Miro), in-browser WYSIWYG editing (the frontend presents; editing goes through the skill — two editing surfaces means permanent sync bugs), auth/multi-tenancy in the template (deployment-target concern; options documented), auto-populating "reality" from analytics, bidirectional sync back to FigJam/Miro, non-journey diagrams (org charts, gantt — the skill declines early and points elsewhere), 3+ simultaneous locales, and slides/FigJam export (v2; **print/PDF is in v1**).

### Repository & workspace topology

| Location | What lives there | Phases |
| --- | --- | --- |
| **Template + plugin repo** (new, one repo — e.g. `BilLogic/service-blueprinting`) | Both halves of the published work: (a) the plugin — `.claude-plugin/plugin.json`, `skills/`, `agents/`, `references/`, `scripts/`, `assets/` — and (b) the scrubbed template app — org-agnostic frontend + schema-only migrations (incl. `layer_role`) + sample seed + **templated ERD diagram** in its docs; stamped `schema_version`. One repo = one URL to publicize; every scaffolded workspace carries the skills with it (workspace plugin version = template version, upgraded together via the upgrade recipe) | 0–4, 6 |
| **Source repo** ([plus-uno-blueprint](https://github.com/BilLogic/plus-uno-blueprint)) | Stays as the live PLUS instance; Phase 0 audit + `layer_role` work happens here, then gets extracted into the template | 0 |
| **User workspace** (any org's directory, **git-tracked**) | Template clone + `blueprint/` dir (IR YAML, `blueprint-workspace.json`, generated `HANDOFF.md`). Two authors collaborate via normal git branching; sign-off is per-branch. Ecoeled dogfood workspace: `/Users/billguo/Documents/Claude/Projects/Ecoeled` | 2–5 |
| **Marketplace repo** (new — e.g. `BilLogic/claude-plugins`) | `.claude-plugin/marketplace.json` listing the plugin, `source` pinned to a git sha. Must exist before Phase 6 can ship | 6 |

### Architecture decisions

| Decision | Default | Rationale |
| --- | --- | --- |
| IR format | YAML + JSON Schema, in git-tracked `blueprint/` dir | Human-editable, diffable, validator-enforceable; git gives versioning/rollback/collaboration for free |
| ID allocation | **UUIDv5 derived from IR keys** (namespace over `org/scenario/path/layer/step` + locale, NFC-normalized for CJK) | Idempotent re-import by construction; keeps SQL and fallbacks in sync; replaces manual `a0000000-…` suffix ranges |
| Re-import semantic | **Scenario-scoped delete-and-reinsert in one transaction** (everywhere — seed SQL and adapters) | Simple, correct with FK cascades; no orphans from removed IR rows; direct Studio edits documented as unsupported, and a **pre-import read-back diff** warns "DB differs from last import — export first?" |
| Sign-off integrity | IR content hash recorded in `blueprint-workspace.json` at sign-off; import verifies and re-gates on mismatch | Hand-edits after approval can't slip into an import |
| Write path | Local `supabase db reset` seed > user-run CLI against hosted > Supabase MCP `apply_migration` | Never handle service-role keys in chat or write them to committable files |
| First-run mode | **No-DB fallback generation** | Zero infra (no Docker), matches offline behavior; upgrade path to Supabase documented |
| Review medium | Rendered markdown grid preview per scenario (paginated for large grids) → conversational edits → explicit sign-off gate before import | Non-technical users can't edit YAML safely |
| Dual-locale topology | **One import target + one deployment per locale** (e.g. two Netlify sites, or one active locale per environment) | Per-locale artifacts with no `locale` column would render duplicate trees in a shared DB; the frontend can't filter |
| Prereqs | Check-and-instruct, never auto-install | Node, supabase CLI, Docker, netlify CLI, pandoc all optional per phase |
| Deploy | Netlify first-class (preview deploy → user confirms → prod), static-host-generic recipes | Matches existing reference deployment |

### Implementation Phases

#### Phase 0 — Generalize the template (prerequisite work in plus-uno-blueprint)

The skill can't present another org's content until the frontend is org-agnostic. Deliverables:

- [x] **Generalization audit**: enumerate every hardcoded ID/flag/shim — `DEFAULT_LIFECYCLE_ID` + phase IDs ([useLifecyclePhases.ts:8-14](../../src/hooks/useLifecyclePhases.ts)), scenario display flags ([blueprintDisplayFlags.ts:7-29](../../src/lib/blueprintDisplayFlags.ts)), `UI_HIDDEN_PATH_IDS_BY_SCENARIO` ([blueprintFallbacks.ts:931](../../src/data/blueprintFallbacks.ts)), loop detection by ID+label ([slides.ts:104-124](../../src/types/slides.ts)), repair shims (`repairDiscoverySadPathBlueprint.ts`, `repairWarmUpAlternatePathBlueprint.ts`) — classify each: parameterize / generalize / delete.
- [x] **Layer-role contract** (decided — see Decisions 1): add an explicit `layer_role` semantic key separate from display name — schema migration on `layers`, frontend switches from name matching to role lookup, legacy name→role mapping shim for existing PLUS content. Unblocks bilingual (Chinese) rendering. Role vocabulary is **extensible**: canonical set + org-defined custom roles rendering as generic rows; **no mandatory spine role** (internal-ops blueprints have no customer lane).
- [x] **Variant-pair generalization**: side-by-side comparison takes two labeled blueprint variants instead of a hardcoded designed/reality assumption (see Design principles).
- [x] **Neutralize fallback-wins merge** ([resolveBlueprint.ts:46-258](../../src/lib/resolveBlueprint.ts)): generated/DB content must not be silently overridden by stale fallbacks after a user upgrades from no-DB to Supabase mode.
- [x] **Print stylesheet** for the blueprint views (per-path print/PDF export — the v1 export story).
- [x] **Scrubbed template** (see Decisions 2): a `template` branch/repo with zero PLUS content — clean schema-only migrations extracted from the 713-file mix (the 9 schema migrations in [DATABASE.md:119-131](../../supabase/DATABASE.md) + `paths_note` + the new `layer_role`), empty/sample seed, no PLUS fallbacks or screenshots.
- [x] **Accurate ERD diagrams for both repos** — first-timers learning the skill/template must be able to read the model at a glance. Regenerate [docs/erd.mmd](../erd.mmd) in plus-uno-blueprint from the live schema (it's stale: omits `paths.note`, and will need `layer_role`; same for `schema.reference.sql`), and ship a **templated ERD** (mermaid, rendered in the README/docs) in the template repo showing the generic model with layer roles and view/path-type enums annotated. Ideally generated from the migrations so it can't drift again.
- [x] Success criteria: fresh acquisition builds and renders sample content with **zero PLUS content**; all three `view_type`s and four `path_type`s render generically (verify side-by-side isn't shim-dependent — Ecoeled needs it); **a generated scale fixture (10+ layer lanes, 15+ steps, multiple paths, custom roles) renders in every view including the runtime integrated merge** (`mergeIntegratedBlueprint.ts`).

#### Phase 1 — Plugin scaffold + IR + contracts

- [x] Plugin skeleton per publishing conventions (model: `harness-designing` plugin at `~/.claude/plugins/cache/harness-designing/harness-designing/3.0.0/`): `plugin.json` (semver, author, license, keywords), README, CHANGELOG, LICENSE.
- [x] `references/ir-schema.json` — full IR schema: lifecycle → phases (order, loops_to) → scenarios (`view_type`, variant labels) → paths (`path_type`, note) → layers (role + display name, row order) → steps + per-path `path_steps` order → cells (content, description, picture, `links` with `url`/`tech_description` types) → triggers. Text fields bilingual (`{en, zh}`-style locale maps). Reserved per-cell fields: **provenance** (source doc + section), `needs_review` confidence flag, `evidence`, `attribution`.
- [x] `references/adapter-contract.md` — the backend adapter interface, written so a stranger could implement a new host: schema provisioning (incl. trigger function), transactional all-or-nothing import with scenario-replace semantics, idempotent re-import, **read-back verification after import**, target identification + confirmation (wrong-project protection), secret-handling rules. The Supabase adapter and the no-DB fallback generator must both conform — the fallback being expressible as an adapter is the contract's acceptance test.
- [x] `scripts/validate_ir.py` — schema validation plus referential integrity: cells referencing steps absent from `path_steps` (would abort mid-import at the DB trigger), duplicate/gapped column positions, cross-path triggers, unknown layer roles ("did you mean…" for near-miss names like `'Frontstage Tech'` / `'前台技术'`); soft scale warnings (never caps).
- [x] `blueprint-workspace.json` state-file spec: **per-scenario status** (not just per-phase — partial completion is a promise), IR path + sign-off content hash, target mode/DB project ref per locale, template `schema_version` **with compat check** and a documented "upgrade template in place" recipe (consultants will have N stale client workspaces the month the template evolves).
- [x] One SKILL.md (`service-blueprinting`) with a pushy third-person description covering the blueprint vocabulary (the description is the sole trigger mechanism), performing **entry-state detection** (nothing / docs / foreign blueprint / existing clone / stale clone / mid-pipeline / **deployed-needs-update** / inherited workspace), loading phase playbooks from `references/` on demand, and **confirming target directory before writing anything**. Written in the **guidance-over-prescription voice** (hard requirements explicitly marked; everything else steerable), and per **loop-engineering practice** every playbook states its phase's deterministic exit condition (validator exit code, sign-off hash, read-back counts, build + render checks) so agents self-verify instead of judging "done" subjectively — see the Loop engineering table in Skill & agent architecture.
- [x] Three agent definitions: `document-reader` (three read modes), `blueprint-reviewer`, `render-checker` (see Skill & agent architecture).
- [x] `hooks/hooks.json`: session-start workspace status, post-edit IR auto-validation, pre-write secret guard. **Implementation guards** (from adversarial review): every hook script checks for `blueprint-workspace.json` and exits instantly in non-blueprint sessions (plugin hooks fire everywhere once enabled); the secret guard scopes its pattern to service-role-style JWTs to avoid false-positive blocking, with a clear override message; hook scripts resolve paths via the plugin root, never hardcoded.
- [x] SKILL.md uses **explicit playbook-gating language** ("before importing, read `references/review-import-playbook.md`") — the known failure mode of lifecycle-spanning single skills is the agent winging a phase instead of loading its playbook; the auto-validate hook and sign-off gate are the backstops. (Shape validated against the official skill-creator: a single 485-line skill covering an equally complex lifecycle via references/agents/scripts.)

#### Phase 2 — Ingestion, co-creation & translation skill

- [ ] Document triage first: list candidate files, ask user which describe journeys (mitigates context blowup on big corpora — Ecoeled has 900+ files) and **exclusion of sensitive files** (credentials like `账号信息.txt`, DB dumps must never enter the IR).
- [ ] Format handling: md/text native; docx/pdf via conversion (pandoc / pdf tooling; flag scanned PDFs as unsupported v1); FigJam/Figma via MCP when connected — degradation without MCP is **CSV/table export or text extraction only** (a PDF of a spatial board is effectively the excluded whiteboard-image case; say so rather than pretend); xlsx via tabular extraction. Whiteboard photos: out of scope v1.
- [ ] **Cheap skeleton preview before IR**: propose the lifecycle/phase/scenario outline as markdown first — a wrong parse costs one message, not a rebuild.
- [ ] **The critical branch**: detect when docs describe the *system* (manuals, inventories) rather than a *journey* — do not fabricate a blueprint from a user manual; switch to co-creation mode using docs as reference material. This is the worst failure mode (plausible, wrong, presented as parsed truth).
- [ ] **Existing-blueprint translation** (capability 6): when the org already has a *structured* blueprint, build a **crosswalk mapping** — their lanes/columns/swimlanes → our roles/layers/steps/paths — as a reviewable, reusable artifact (`references/crosswalk-schema.json`), presented for approval before conversion. Rules for N:1 lane merges and canonical Shostack rows (e.g. physical evidence → a custom role); unmapped lanes become org-defined custom roles or land in an explicit `unmapped` bucket — never silently dropped. **v1 inputs: xlsx/CSV, markdown tables, FigJam via MCP; Miro only via CSV/board export** (no API path).
- [ ] `references/elicitation-protocol.md` — ordered question script mapped to the model, **with right-sizing branches**: "single flow?" → auto-wrap in a default lifecycle+phase and skip the ceremony; huge journeys → chunk one scenario per session. Asks "whose journey is the spine?" explicitly (B2B multi-stakeholder, internal-ops). Supports partial completion (2 of 6 scenarios now, more later — tracked per-scenario in workspace state).
- [ ] Review loop: markdown grid preview per scenario (paginated above ~8 layers/12 steps — a 10×20 grid in chat is unreadable) → conversational corrections → validator re-runs after any hand edit → **sign-off records the IR content hash**; import refuses on hash mismatch.

#### Phase 3 — Import skill (adapters)

- [ ] `scripts/generate_fallbacks.py` — IR → single generated data module (replaces the hand-written registry pattern: `FALLBACK_BY_PATH` / `FALLBACK_PATHS_BY_SCENARIO` / `FALLBACK_BY_SCENARIO` / `FALLBACK_SLIDES`), with generated-file header warning; must produce type-checking TS (CJK string escaping is the likely failure — run `tsc --noEmit` after generation). Conforms to the adapter contract.
- [ ] `scripts/generate_seed_sql.py` — IR → one transactional seed file per locale in the [supabase/seeds/](../../supabase/seeds/) pattern; UUIDv5 IDs; scenario-replace semantics; correct dependency order; deliberately-invalid IR must leave the DB untouched (all-or-nothing).
- [ ] Supabase provisioning: `assets/schema.ddl.sql` (portable DDL + trigger function, host-neutral) + `assets/policies.supabase.sql` (anon-role RLS — Supabase-specific, kept out of the shared asset), schema_version stamped; local path via CLI (`supabase db reset`), hosted via **user-run** CLI commands with their own credentials or Supabase MCP `apply_migration`; echo project ref + confirm before any write.
- [ ] **Pre-import read-back diff**: compare current DB content against the last-imported state; if they differ (manual Studio edits), warn and offer an export before replacing.
- [ ] **Read-back verification after import** (adapter contract): row counts + spot checks against the IR.
- [ ] Dual-locale: one target per locale (Decision/defaults) — the skill tracks per-locale targets in workspace state.
- [ ] Secrets rules: anon key OK in `.env` (verify `.gitignore` first); service-role key never written to disk by the skill, never pasted through chat.
- [ ] Idempotency test: import → edit IR → re-import → no duplicates, no orphans, correct render.

#### Phase 4 — Present, update & deploy notes

- [ ] Local: `npm run dev` guidance + `render-checker` verification of each scenario/view_type; print/PDF view guidance for stakeholder deliverables.
- [ ] **Template app ships its own deploy config** (template repo, not a skill asset): `netlify.toml` with build command, `dist/` publish dir, **SPA redirect `/* /index.html 200`** (classic silent failure), node version. The `dist/` output must serve correctly from a bare static server.
- [ ] `references/deploy-notes.md` — blueprint-specific gotchas ONLY; generic hosting how-to is deliberately absent (any agent knows it): `VITE_SUPABASE_*` env vars at build time, SPA-redirect equivalents per host, one site per locale, and always `tsc --noEmit` + `vite build` before deploying (generated-file type errors are an ingestion bug loop, not a template problem).
- [ ] **Update loop** (capability 6): skill detects deployed workspace → delta edits or new docs → IR change → validate + re-sign-off → re-import via adapter → then point the agent at rebuild/redeploy per deploy-notes. In fallback mode: regenerate → `tsc` → build → redeploy.
- [ ] **Public-exposure warning** (hard requirement in deploy-notes + skill guidance): deploying makes content public (anon SELECT on all tables + static site). Surface it before any content goes live; mention access-control options with costs stated honestly (Netlify password protection is a **paid** feature; free alternatives: edge basic-auth or not deploying publicly). Ecoeled operational data qualifies as sensitive.
- [ ] Generate `HANDOFF.md` in the workspace (from template): where the IR lives, how to update, how to redeploy — the offboarding story for consultant engagements.

#### Phase 5 — Dogfood on Ecoeled

Important framing from the corpus survey: **Ecoeled has no existing journey artifact** — the session guide is a question list; the manuals are system docs. So Ecoeled primarily exercises **co-creation** (Phase 2's branch), not raw ingestion. Expected mapping (write down before dogfooding so success is checkable):

- Lifecycle = EcoeLed smart-lighting platform; phases = 3 goals (asset mgmt / precise operations / accurate energy mgmt); scenarios = 6 tasks, `view_type: side-by-side` with variant labels "platform as designed" vs. "how it's actually done" (paper/WeChat/phone); paths: happy = platform-as-designed, alternative/exception = offline reality; layers = 3 actor roles (municipal manager, field technician, sysadmin) + tech/visual rows.
- Primary inputs: `EcoeLed_Session_Guide_EN_clean.md` + `Project/00_project_context.md` (both already markdown — no conversion needed for the core path); **plus Bill's Figma diagrams via the Figma MCP and Notion documentation via the Notion MCP** — the dogfood deliberately exercises the MCP ingestion paths, not just local files; docx/pdf conversion exercised on secondary docs.
- Language: **dual EN + ZH** (Decisions 3) — bilingual IR (`{en, zh}` text fields), per-locale generated artifacts and deployments. CJK pitfalls: NFC normalization before UUIDv5, TS escaping, domain-term translation review (灯杆/配电箱). Ecoeled thereby also serves as the acceptance test for the bilingual pipeline.
- **Backend choice stays open** — the dogfood runs the no-DB fallback as its primary path; Supabase is an optional second pass, not assumed. This doubles as the anti-bias test: the skill's guidance must present fallback and live-DB as co-equal options and ask, never default-assume Supabase.
- **Also exercise the update loop**: after the first deploy, make a post-session content edit and take it to production through the skill.
- To also validate *ingestion* against real journey docs, plan a second fixture: re-ingest PLUS's own source docs and compare against the existing hand-built blueprints (closing the loop). A third micro-fixture (a Shostack-style spreadsheet) exercises translation.
- Capture every friction point as a skill fix; this is the acceptance test for publishability.

#### Phase 6 — Publish

- [ ] Marketplace entry (`marketplace.json`: name, description, source pinned to a git `sha`, category, tags), following `~/.claude/plugins/marketplaces/compound-engineering-plugin/.claude-plugin/marketplace.json` as the small-scale model. Marketplace repo must exist first (see topology).
- [ ] Eval suite per skill-creator practice: realistic should-trigger prompts + near-miss should-NOT-trigger cases (skills under-trigger on simple queries by design). Must include **no-keyword phrasings** ("get our FigJam service map into Supabase", "map how customers actually experience onboarding") — the description enumerates journey-map/service-design/frontstage-backstage vocabulary, not just "blueprint"; run the description-optimization loop (`run_loop.py`) against this set.
- [ ] README with the workflow story (this is also the publicity artifact for Bill & Meryem's method), quickstart, the Ecoeled case study, and the declared non-goals.
- [ ] Stretch: smoke-test the skill files in one non-Claude harness that reads the Agent Skills format.

## System-Wide Impact

- **Interaction graph**: router inspects workspace state → ingest/translate writes IR + state → import reads IR, writes via adapter + updates state → deploy reads build output + state → update re-enters the loop at ingest or import. The workspace state file is the only cross-skill coupling; each skill checks preconditions against it.
- **Error propagation**: validator catches referential errors *before* the DB trigger can abort mid-import; imports are single-transaction so partial failure leaves the DB unchanged; read-back verification catches silent partial writes; build errors block deploy and route back to generation, not manual template fixes.
- **State lifecycle risks**: (a) stale fallbacks overriding fresh DB content on the no-DB→Supabase upgrade path — resolved in Phase 0 by neutralizing fallback-wins; (b) direct Supabase Studio edits clobbered by re-import — pre-import read-back diff warns and offers export; (c) hand-edited generated files overwritten — header warning + diff check; (d) IR edited after sign-off — content-hash gate; (e) template evolves under N client workspaces — schema_version compat check + upgrade recipe.
- **API surface parity**: seed-SQL and fallback-generation adapters must stay behaviorally identical (same IR in → same render out); the idempotency test runs against both.
- **Integration test scenarios**: (1) fresh dir → co-create 1 scenario → fallback mode → local render; (2) same IR → local Supabase → identical render; (3) import → IR edit → re-import → no dupes/orphans; (4) invalid IR (cell w/o path_step) → import refuses, DB untouched; (5) Chinese-language IR → build passes, layer semantics render; (6) **scale fixture (10+ lanes, 15+ steps) → validates with soft warnings only, imports, renders in all views**; (7) **post-deploy edit → update loop → change live in production, both modes**.

## Acceptance Criteria

### Functional
- [ ] From an empty directory, the skill acquires the template, co-creates a minimal blueprint conversationally (right-sized — no lifecycle ceremony for a single flow), and renders it locally with **no database and no PLUS content visible**.
- [ ] Given mixed-format docs (md + docx + pdf), the skill produces a validated IR with provenance, presents a skeleton preview then a grid preview, and blocks import until sign-off (hash-bound).
- [ ] The skill correctly refuses to fabricate a blueprint from system-only docs and pivots to co-creation.
- [ ] IR imports into local and hosted Supabase transactionally with read-back verification; re-import after edits is idempotent (no dupes, no orphans).
- [ ] All three `view_type`s and four `path_type`s render generically from non-PLUS content (Phase 0 criteria, promoted).
- [ ] Deploy succeeds on Netlify with SPA redirects, and the same `dist/` serves correctly from a bare static server; deploy only proceeds after explicit public-exposure confirmation.
- [ ] **Update**: a post-deploy content edit reaches production through the skill in both fallback and Supabase modes.
- [ ] Ecoeled dogfood produces rendered dual-locale side-by-side blueprints matching the expected mapping above.
- [ ] **Scalability**: the scale fixture (10+ layer lanes, org-defined custom roles, 15+ steps) validates, imports, and renders in every view — including the runtime integrated merge — without code changes.
- [ ] **Translation**: an existing structured blueprint with non-matching lanes (e.g. a Shostack-style spreadsheet) converts via a reviewed crosswalk with zero silently dropped lanes.

### Non-Functional
- [ ] No secrets ever written to committable files; wrong-project writes prevented by ref echo + confirm; pre-import diff protects manual DB edits from silent loss.
- [ ] Every SKILL.md < 500 lines; references one level deep; validator/generators are scripts (executed, not context-loaded).
- [ ] The no-DB fallback generator conforms to the adapter contract (the contract's acceptance test).
- [ ] All negative tests from the breakage catalog pass (layer-name typos warned, cross-path triggers rejected, etc.).

### Quality Gates
- [ ] Eval suite (should/should-not trigger) passes; tested against a second model tier.
- [ ] `plugin.json` + marketplace entry validate; version pinned by sha.

## Decisions (locked 2026-07-16)

1. **Layer semantics → explicit `layer_role` field.** Add a semantic role key (e.g. `customer_actions`, `frontstage_actions`, `frontstage_tech`, `backstage_tech`, `visual`, `support_process`) separate from the display name, via a schema migration + frontend change in the template repo. Display labels become free-form in any language. Phase 0 absorbs this as its first deliverable; magic-name detection in [blueprintLayout.ts:11-31](../../src/lib/blueprintLayout.ts) switches to role lookup with a legacy name-mapping shim for existing PLUS content. Vocabulary extensible; no mandatory spine role.
2. **Distribution → scrubbed public template repo.** A clean template (separate repo or `template` branch): schema-only migrations (including the new `layer_role`), sample seed, no PLUS content. The skill acquires it via degit/clone. Maintenance owner: Bill/Meryem; skill stamps the template `schema_version` it was built against and checks compat on update.
3. **Ecoeled language → dual EN + ZH.** Bilingual IR (`{en, zh}` text fields); generators emit one artifact set per locale; **one import target + one deployment per locale**. An in-app locale switcher is future work, not v1.

## Adopted defaults (locked at review, 2026-07-16 — overridable if Bill objects)

4. **ID strategy: UUIDv5-from-IR-keys.** Each ID derives from the locale-independent IR key plus the locale, so the EN and ZH artifact sets are parallel and each re-import stays idempotent. Manual suffix ranges retired.
5. **Plugin shape (final, round 5): ONE skill** — `service-blueprinting`, the specialized blueprint-lifecycle skill (scaffold / ingest / co-create / translate / review / import / update), playbooks in `references/` per progressive disclosure — **+ three agents** (`document-reader`, `blueprint-reviewer`, `render-checker`) **+ three hooks** (workspace status, IR auto-validate, secret guard) + deterministic scripts. **Deployment is not a capability** — generic agent competence, covered only by `references/deploy-notes.md` + the template's own `netlify.toml`. Boundary tests: a skill exists only for specialized domain knowledge; an agent needs a specific system prompt or tool scope; everything else is references. Plugin and template live in **one repo**. Skill text is written as guidance-with-marked-requirements for LLM agent consumers.
6. **v1 scope (revised per host-agnosticism):** import goes through the backend **adapter contract** — v1 ships the Supabase adapter (local/hosted) + the no-DB fallback adapter; live-DB mode requires Supabase or a PostgREST-compatible endpoint (stated, not assumed away); deploy guidance is static-host-generic with Netlify as the worked example; no whiteboard-image ingestion in v1; FigJam without MCP degrades to CSV/table export only.
7. **Dual-locale mechanism: per-locale generated artifacts** (two seed files / two fallback modules from one bilingual IR) with per-locale deploy targets; no `locale` column, no duplicated scenarios; in-app locale switcher deferred.
8. **Capability additions from review round: Update (capability 7) and print/PDF export in v1**; slides/FigJam export, workshop live-capture mode, inherited-workspace audit, and version-diff workflows are v2 — but the IR shape reserves their fields (variant pairs, evidence/attribution, appendable partial validity) now.

## Dependencies & Risks

| Risk | Mitigation |
| --- | --- |
| Phase 0 generalization is larger than expected (713 migrations, 45 fallback files, shims, + new: variant pairs, print stylesheet, scale fixture) | Audit first; timebox; the scrubbed template only needs schema + engine, not migration archaeology |
| Magic layer names break non-English content | `layer_role` decided; validator warns on unknown roles |
| LLM parsing hallucinates structure from big docs | Provenance + `needs_review` flags; triage step; skeleton preview; sign-off gate; system-vs-journey branch |
| RLS lockdown blocks writes | Seed-SQL via CLI as primary path; never handle service-role keys |
| Ecoeled corpus contains client credentials/sensitive data | Exclusion step in triage; public-exposure confirmation at deploy |
| Skill under-triggers (discovery is description-only) | Pushy descriptions + eval loop per skill-creator practice |
| Template evolves under N client workspaces | schema_version compat check + documented upgrade recipe |
| Frontend layout breaks at scale (10+ lanes, integrated merge) | Scale fixture in Phase 0 success criteria + integration test 6 |

## Sources & References

### Internal (uno-blueprint repo)
- Data model: [supabase/DATABASE.md](../../supabase/DATABASE.md) (start here), [docs/erd.mmd](../erd.mmd), [docs/scenario-steps-design.md](../scenario-steps-design.md), [supabase/schema.reference.sql](../../supabase/schema.reference.sql) (both stale re: `paths.note`)
- Canonical app shape: [src/types/blueprint.ts:53-59](../../src/types/blueprint.ts), [src/lib/normalizeBlueprint.ts:178-211](../../src/lib/normalizeBlueprint.ts)
- Offline/fallback mode: [src/hooks/useScenarioBlueprint.ts:59-72](../../src/hooks/useScenarioBlueprint.ts), [src/data/blueprintFallbacks.ts](../../src/data/blueprintFallbacks.ts)
- Magic layer names: [src/lib/blueprintLayout.ts:11-31](../../src/lib/blueprintLayout.ts)
- Import-order trigger: [supabase/migrations/20250604000000_scenario_steps_path_steps.sql:61-92](../../supabase/migrations/20250604000000_scenario_steps_path_steps.sql)
- RLS (read-only): [supabase/migrations/20250603120000_service_blueprint.sql:246-262](../../supabase/migrations/20250603120000_service_blueprint.sql)
- Existing generator precedents: [scripts/generate_goal_setting_check_update_paths.py](../../scripts/generate_goal_setting_check_update_paths.py), [scripts/apply_pending_goal_setting_migrations.mjs](../../scripts/apply_pending_goal_setting_migrations.mjs)

### Skill/plugin authoring models
- Loop engineering: [Getting started with loops](https://claude.com/blog/getting-started-with-loops) — deterministic exit conditions, verification encoded in SKILL.md, second-agent review, token/model right-sizing
- Skill spec & best practices: `~/.claude/plugins/cache/compound-engineering-plugin/compound-engineering/2.42.0/skills/create-agent-skills/` (SKILL.md, references/)
- Eval workflow: `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/skill-creator/skills/skill-creator/SKILL.md`
- Whole-plugin model: `~/.claude/plugins/cache/harness-designing/harness-designing/3.0.0/`
- Marketplace manifests: `~/.claude/plugins/marketplaces/compound-engineering-plugin/.claude-plugin/marketplace.json`

### Dogfood corpus (Ecoeled)
- Primary: `EcoeLed_Session_Guide_EN_clean.md` (3 goals → 6 tasks, platform-vs-reality, per-goal tables), `Project/00_project_context.md` (3 actor roles, closed-loop work-order flow)
- Secondary/conversion tests: `EcoeLed_Discovery_Session_Guide.docx`, platform manuals (+ `EN_Translations/*.md`), `Research Assets/*.svg`
- Exclusions: `账号信息.txt` (credentials), `lighting_c.sql` + `dumps/` (client DB), media

### Live endpoints (reference architecture)
- Frontend: https://uno-blueprint.netlify.app · Backend: https://osybxeojvsqcwxkgnalm.supabase.co · Repo: https://github.com/BilLogic/plus-uno-blueprint
