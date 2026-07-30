---
title: "Derived layer expansion — overview & integration (slices, audit, whatif)"
type: feat
status: active
date: 2026-07-29
---

# Derived layer expansion — overview & integration

## Enhancement Summary

**Deepened on:** 2026-07-29, after the initial plan set, with 9 parallel research/review
agents: repo-divergence explorer (uno ↔ template), Supabase best-practices researcher
(doc-verified), architecture, data-integrity, security, performance, simplicity/YAGNI,
agent-native-parity, and TypeScript/React reviewers.

**Key changes vs. the first draft:**
1. **New rollout order (user decision):** implement backend + frontend on **uno-blueprint
   first** for design validation → port to this template + build the skills → dogfood the
   skills on Ecoeled. See "Rollout & port-back" below.
2. **Decision 6 (new):** cell/lane/phase spec columns get an explicit canon + preservation
   story — three reviewers independently found that human panel edits would be silently
   wiped by scenario re-import.
3. **Decision 4 revised:** the hash ceremony is demoted to *conditional* — with
   omit-when-absent optionals, schema v2 alone changes zero hashes; two reviewers confirmed
   the ceremony as originally written gated on a no-op.
4. A found-before-shipped bug: importer UUIDv5 trigger ids must incorporate `kind`, else a
   same-pair trigger+needs edge is a **primary-key collision** (plan 002).
5. Security hardening package (critical: disable public sign-ups; high: keep restricted
   evidence out of public bundles/sidecars) folded into plans 002–004.
6. Simplicity pass: references-reorg/rename moved off the critical path; several
   insurance features marked defer-with-dissent-noted rather than cut (they implement
   user-locked design).

**This is the umbrella plan.** Implementation detail lives in three sibling plans:

| Plan | Scope |
|---|---|
| [002 — backend & schema](./2026-07-29-002-feat-derived-layer-backend-schema-plan.md) | New tables, spec columns, RLS/auth, IR + pipeline changes, sweep, validator generator |
| [003 — frontend experience](./2026-07-29-003-feat-slices-frontend-experience-plan.md) | Tabs, focus/presentation, cell panel v2, sidebar, lenses, findings, compare view |
| [004 — skills, agents, references](./2026-07-29-004-feat-skills-agents-references-expansion-plan.md) | slice/audit/whatif skills, auditor + impact-tracer agents, map extensions, (deferred) reorg |

## Overview

Today the plugin has one skill: gather context, produce a blueprint. Once the blueprint
exists the user is on their own. This expansion closes that gap with the full
"blueprint as operational source of truth" loop, grounded in Løvlie/Polaine/Reason
*Service Design: From Insight to Implementation* ch. 6 (four ways of taking **slices**
through a blueprint, plus business-side interrogations):

- **slice** — derive 1D cuts (journey / step / lane / cell / custom) into app-renderable
  slices and handoff documents, with optional storyboard illustrations.
- **audit** — sweep the blueprint for incoherence and business risk.
- **whatif** — decision support: change replay, restaging, prioritization.
- **map** (rename of `blueprint`, deferred until skills stage) — authoring, extended with
  proposition intake, evidence, and cell spec fields.

## Rollout & port-back (user decision, 2026-07-29)

1. **Stage 1 — uno-blueprint** (`/Users/billguo/Desktop/uno-blueprint`,
   github.com/BilLogic/plus-uno-blueprint): implement plan 002 backend + plan 003 frontend
   directly, validate the design against real PLUS content. **`git pull` before any
   change** (verified clean on `main` @ `1a4308c` at planning time).
2. **Stage 2 — this template**: port validated backend + frontend back; build the skills
   (plan 004).
3. **Stage 3 — Ecoeled**: dogfood the skills end-to-end on the Ecoeled workspace.

**Divergence facts that shape stage 1 → 2 (from the repo-comparison report):**

- **Schemas are byte-identical** (both `schema.reference.sql` match except headers); the
  new migration is additive and ports verbatim. Caveats: on uno the migration filename
  must sort after uno's latest (`20260717183429_*`), and uno's live DB still carries the
  legacy `public.services` table — regenerating `database.ts` on uno will resurrect its
  type; drop the table first or hand-strip after regen.
- **Prep commits on uno before feature work** (turns the two riskiest merges into
  trivial ones):
  1. Port template commit `b4b4db2` — `Slide`→`NavItem` / `FALLBACK_SLIDES`→`FALLBACK_NAV`
     rename (`src/types/slides.ts` → `src/types/nav.ts`, ~23 importing files) + add
     `src/config.ts` (`ORG_NAME`).
  2. Take the template's `useLifecyclePhases.ts` (lifecycle resolved by `created_at`,
     not uno's hardcoded seed UUIDs) — `useSlices(lifecycleId)` must not be built on a
     hardcoded id.
- **Copy-safe surfaces (identical today — keep them that way):** `SupabaseProvider`,
  `BlueprintCellDetailPanel`, `CellDependencyTable`, `EditorShell`,
  `useScenarioBlueprint`, `layerRoles.ts`, all 22 `src/components/ui/*`, `index.css`,
  `ROLE_STYLES`. These are the biggest feature surfaces — no uno-specific shortcuts in
  them.
- **Careful-merge surfaces:** `EditorContext.tsx` (rename + uno's stubbed view-type
  logic), `blueprintLayout.ts` (345 diff lines, different corridor APIs),
  `blueprintFallbacks.ts` (uno hand-written vs template generated-marker),
  `ServiceBlueprintGrid.tsx` (corridor block), `blueprintCellDependencies.ts`.
- **Traps while on uno:** never key new code on layer *names* (`'Regular Tutor'`
  temptations abound); don't extend `blueprintDisplayFlags.ts` (PLUS-UUID-gated,
  template-deleted); avoid touching `blueprintArrowGeometry.ts` (1693 diff lines,
  unportable).
- Plans 002/003 are written against template naming (`nav.ts`, `ORG_NAME`, generated
  fallbacks); the prep commits above make that vocabulary true on uno too.

## Locked ontology (unchanged from design conversation)

| Entity | One-line definition | Written by |
|---|---|---|
| lifecycle → phase → scenario → path → lane × step → cell | existing structural grid | map |
| **cell** (extended) | + `function`, `form`, `value_props[{for,value}]`, `owner`, `perceived_owner`; `links` presented as "Resources" | map + human panel edits (see decision 6) |
| **lane** (extended) | + `owner_team`, `kpis[]`, `tools[]` | map + human |
| **phase** (extended) | + `business_impact`, `operational_requirements` | map + human |
| **cell link** | `kind`: `trigger` (temporal) or `needs` (functional, source-requires-target, panel-only render v1) + label + why-note; on existing `cell_triggers`, no rename | map |
| **evidence** | source row for a cell or proposition question; **assumption = derived zero-evidence state, never stored** | map + human |
| **proposition** | one per lifecycle: business-model answers + three validation questions (`understand` / `value` / `usability`) | map + human (UI card added — parity fix) |
| **slice** | ordered selection of existing cells; type `journey/step/lane/cell/custom`; never creates cells | slice skill + human |
| **slice item** | frame grouping consecutive slice cells; caption, narrative, illustration | slice skill + human |
| **finding** | audit/whatif/import-sweep output: check, severity, cell set, note, status | audit + whatif + sweep |

Write invariants: **map writes cells · slice writes slices · audit/whatif/sweep write
findings · whatif writes no cells ever · map may flip `findings.status` only to supersede
promoted whatif findings · humans edit whatever the frontend exposes, same tables.**

## Decision log

Decisions 1–5 from the original planning pass, 6–8 added by the deepening review.

1. **Write path = Supabase Auth (implicit flow) + authenticated write policies.**
   Doc-verified specifics: implicit flow, NOT PKCE (PKCE magic links fail cross-device);
   **public sign-ups must be disabled** + `shouldCreateUser: false` (else "authenticated"
   = anyone on the internet — CRITICAL security finding); per-command policies with the
   `TO` clause (never deprecated `auth.role()`); column-level `REVOKE`/`GRANT` where the
   design says "these columns only" (RLS cannot scope columns). Anonymous/no-DB deploys:
   read-only, mutation UI hidden.
2. **Derived data survives re-import via soft references** (uuid[] / uuid, no FK cascade
   to cells) + `cell_keys` recovery columns + post-import orphan sweep. Sweep also
   detects key-reuse mislinks (stored key ≠ current key of a still-valid uuid).
   Exception: `evidence.service_lifecycle_id` is a **hard FK** — lifecycles are upserted,
   never deleted, by the importer, and the FK provides the retention/deletion story.
3. **Evidence is DB-canonical, outside the signed subtree.** Sidecar export exists for
   re-import survival but is **gitignored by default** (interview excerpts in a public
   repo = leak). Legacy IR `cell.evidence: string[]` converts to rows on import.
4. **Hash discipline, ceremony now conditional.** Optional IR fields are omitted when
   absent, never null-filled — so schema v2 changes **zero** existing hashes (verified
   reasoning, two reviewers). Ship the hash-stability test; write `rehash_signoff.py`
   only for the one real case: scenarios whose IR files are rewritten (e.g. stripping
   legacy evidence strings). No blanket ceremony gate.
5. **URL-param view state** (`?slice=<id>` + presentation params) via a single
   `urlViewState` module with `history.replaceState` — makes slice views shareable and
   render-checker-reachable. Boot restore modeled as *pending intent* (a found bug:
   EditorContext's boot effect would clobber deep links before DB data arrives).
6. **Cell/lane/phase spec columns: DB-preserved across re-import** *(new — three
   reviewers independently flagged the split-brain)*. Human panel edits write these
   columns; the importer's scenario replace must **snapshot spec columns before delete
   and restore them after reinsert** (UUIDv5-stable ids make this exact), so human edits
   survive. The map skill additionally gains a reconcile step (diff DB spec columns vs
   IR before re-export) so agents see human edits. Spec columns are declared **outside
   the hashed subtree semantics** the same way evidence is: editing them never de-signs
   a scenario (they're presentation/spec detail, not signed service content) — recorded
   in `workspace-state.md`.
7. **Findings integrity kept, simplified where safe.** Keep `run_id` + fingerprint +
   per-check supersede (audit correctness) with a DB backstop: partial unique index on
   open `(lifecycle, fingerprint)`. *Simplicity reviewer dissent noted:* wipe-and-rerun
   would suffice for a solo user; retained because the DB backstop makes the cost ~zero.
8. **Skills stage re-sequenced.** The `blueprint`→`map` rename and the references/ reorg
   move **off the critical path** (stage 2+, own commit, coordinated with a plugin
   version bump) — the slice skill lands first *alongside* the existing skill in the
   existing flat references/ layout. (Simplicity finding; also de-risks the live Ecoeled
   workspace.)

## Build order (rewritten for the rollout)

**Stage 1 — uno-blueprint (validate the design):**
- 1a. Prep commits: pull; nav rename port; `useLifecyclePhases` port; (optional) drop
  `public.services`.
- 1b. Plan 002 Phase 1 migration (filename sorted after uno's latest) + types regen.
- 1c. Plan 003 Phase 0–2: strict-mode pre-task, view-state module + tabs, slice
  rendering (focus + presentation) — fed initially by hand-inserted slice rows.
- 1d. Plan 003 Phase 3–4: auth + CRUD + panel v2 + sidebar + lens; findings panel
  (fed by hand-inserted findings).
- **Gate: design validated by user on real PLUS content.**

**Stage 2 — template + skills:**
- 2a. Port migration + frontend (per divergence report tiers).
- 2b. Plan 002 Phase 2 pipeline (IR v2, generators, sweep, validator generator, tests).
- 2c. Plan 004: slice skill → audit + auditor → whatif + impact-tracer; reorg + rename
  last.
- **Gate: full agent loop passes on the sample IR.**

**Stage 3 — Ecoeled dogfood:** run slice/audit/whatif against the live Ecoeled
workspace; friction log; hash-stability verified against its signed scenarios.

## System-wide impact

- **Interaction graph:** import (map) → spec-column snapshot/restore → orphan sweep →
  auto-finding → findings panel; slice edit flips `generated→customized` → regeneration
  warns; whatif promote → map playbook → de-sign notice (content changes only) →
  re-import → sweep.
- **Error propagation:** importer transactional per scenario + advisory lock shared with
  the sweep (race fix); Gemini failures degrade to text-only frames; audit partial
  failure is check-scoped.
- **State lifecycle risks:** re-import window (readers see old-or-new per statement;
  cross-request straddle renders tombstones, never crashes); key renames (sweep +
  recovery keys); spec-column preservation (decision 6).
- **API surface parity** (agent-native review): every frontend mutation has an agentic
  twin; propositions got their missing UI card; the shared TS validator got a real
  generator + drift test; `[Send to map]` transport specified (download on deployed
  builds, file in local dev).
- **Integration test scenarios:** (1) slice → re-import unchanged IR → intact;
  (2) key rename → sweep flags + re-links; (3) evidence add → no hash change; (4) panel
  spec edit → re-import → edit survives; (5) audit ×2 → no duplicates; (6) no-DB build
  renders slices from snapshot **with zero evidence excerpts in the bundle**.

## Acceptance criteria (umbrella)

- [ ] Stage gates above pass in order.
- [ ] End-to-end demo: map → slice (illustrated journey) → audit → whatif → promote →
      nothing orphans, no human edit lost, sign-off state explicit throughout.
- [ ] Security package verified: anon cannot write; sign-ups disabled documented as
      REQUIRED; no evidence excerpt reachable in any public bundle, sidecar default, or
      public-read table.
- [ ] Ecoeled signed scenarios keep identical hashes under schema v2 (stability test).

## Sources

- **Origin: design conversation 2026-07-29** (ontology, UX prototypes, decision points).
- Textbook: Løvlie/Polaine/Reason, *Service Design*, ch. 6.
- Research reports (2026-07-29, in-session): repo divergence (uno@1a4308c vs
  template@97f937d), Supabase best-practices (doc-verified), architecture,
  data-integrity, security, performance, simplicity, agent-native, TypeScript reviews;
  spec-flow gap analysis (48 gaps); dogfood frictions plan
  [2026-07-21-001](./2026-07-21-001-fix-dogfood-skill-frictions-plan.md).
