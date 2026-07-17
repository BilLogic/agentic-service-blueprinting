---
title: Generalization audit — PLUS-specific code inventory
date: 2026-07-16
status: draft
---

# Generalization Audit

Inventory of every hardcoded PLUS-specific ID, flag, shim, and magic string that blocks other orgs from using this app as a template. Produced for Phase 0-A of [the skill plan](plans/2026-07-16-001-feat-service-blueprint-agent-skill-plan.md).

Remediation classes: **parameterize** (make configurable), **generalize** (replace mechanism), **delete** (remove in scrubbed template; may stay in the PLUS instance), **move-to-adapter** (belongs in backend adapter territory).

## Findings

| Location | What it is | Why it blocks generalization | Remediation | Effort | Feeds Phase 0 unit |
| --- | --- | --- | --- | --- | --- |
| [useLifecyclePhases.ts:8-14](../src/hooks/useLifecyclePhases.ts) | `DEFAULT_LIFECYCLE_ID`, `IN_SESSION_PHASE_ID`, `PRE_SESSION_PHASE_ID` | App only loads the PLUS lifecycle; foreign content invisible | Parameterize: load first/only lifecycle from DB, config override | M | blocks everything |
| [blueprintLayout.ts:10-70](../src/lib/blueprintLayout.ts) | Magic layer names: `PILL_CELL_LAYER_NAMES` ('Front Stage Tech', 'Back Stage Tech', **'Computer Systems'** — a third name the plan didn't list), `VISUAL_LAYER_NAME` + 'Step Visual', `INTERACTION_LINE_AFTER_LAYER_NAMES`, visibility line after 'Front Stage Actions', `INTERNAL_INTERACTION_LINE_AFTER_LAYER_NAMES` | Cell semantics AND the three blueprint divider lines are all keyed to exact English names | Generalize → `layer_role` lookup; role vocabulary must also encode **line anchoring** (which roles the interaction/visibility/internal lines draw after) | L | 0-C (core) |
| [blueprintArrowGeometry.ts](../src/lib/blueprintArrowGeometry.ts) (2,543 lines; 24 hardcoded UUIDs) | **Bigger than the plan knew**: dozens of per-scenario, per-cell arrow-routing special cases (`isReportingAnIssueFrontStageTechToRegularTutorTrigger`, Regular-Tutor loop corridors, etc.) keyed to specific cell UUIDs | Couples routing to PLUS cell IDs; ~1,500 of 2,543 lines are special cases | Special cases are **inert for foreign content** (ID match fails → default routing). Delete from template; long-term (v2): data-driven routing hints | S (template) / L (generalize) | scrubbed template |
| [resolveBlueprint.ts:26-258](../src/lib/resolveBlueprint.ts) | Fallback-wins merge: fallback content overrides DB names/descriptions/pictures; invokes repair shims | New org's DB content silently overridden by stale PLUS fallbacks | Generalize: DB wins when non-empty; fallbacks only when source is fallback | M | 0-D (core) |
| [repairDiscoverySadPathBlueprint.ts](../src/lib/repairDiscoverySadPathBlueprint.ts) (88 ln), [repairWarmUpAlternatePathBlueprint.ts](../src/lib/repairWarmUpAlternatePathBlueprint.ts) (77 ln) | Scenario-specific data repair shims, gated by PLUS scenario IDs | Inert for foreign content but dead weight; invoked from resolveBlueprint | Delete in template; unhook from resolveBlueprint in 0-D | S | 0-D, template |
| [blueprintDisplayFlags.ts](../src/lib/blueprintDisplayFlags.ts) (49 ln) | Per-scenario rollout flags keyed by PLUS scenario IDs | Foreign scenarios get default-off behaviors | Delete: default-on for all scenarios in template | S | template |
| [slides.ts:104-124](../src/types/slides.ts) | Post→Pre-session loop detected by phase ID **and English label** ('Post-session'/'Pre-session') | Breaks for foreign IDs and any non-English label — breaks the bilingual promise | Generalize: trust `loops_to_phase_id` FK alone, drop ID/label heuristics | S | 0-D/0-E |
| [sideBySideCompareLayout.ts:20,292,665](../src/lib/sideBySideCompareLayout.ts) | Imports `layerHasRegularTutorInLaneLoopCorridor` from arrow geometry | Generic side-by-side layout coupled to a PLUS routing shim | Generalize: corridor detection from data (trigger shape), not scenario identity | M | 0-E |
| [src/data/](../src/data/) (~45 files) + `parallelSessionScenarioIds.ts`, `parallelSessionPartnerLead` + `UI_HIDDEN_PATH_IDS_BY_SCENARIO` ([blueprintFallbacks.ts:931](../src/data/blueprintFallbacks.ts)) | All PLUS blueprint content, fallback registry, hidden-path sets, `FALLBACK_SLIDES` | Is the PLUS instance's content | Delete in template; replaced by `generate_fallbacks.py` output (Phase 3) | L (mechanical) | template, Phase 3 |
| [techPillColors.ts](../src/lib/techPillColors.ts), [blueprintTechDescriptions.ts](../src/lib/blueprintTechDescriptions.ts), [blueprintTechPictures.ts](../src/lib/blueprintTechPictures.ts) (480 ln combined) | PLUS-branded tech pills (Zoom, Pencil, PLUS App) with colors/copy/screenshots | Foreign tech vocab gets no styling; PLUS branding leaks | Generalize: move per-tech copy/pictures into cell `links` (`tech_description` type already exists); template ships neutral palette | M | template, Phase 3 |
| [EditorChrome.tsx:9](../src/components/editor/EditorChrome.tsx) | "PLUS" wordmark in app chrome | Branding | Parameterize: org-name config | S | template |
| [package.json:2](../package.json) | `"name": "plus-service-hub"` | Identity | Parameterize in template | S | template |
| [scripts/apply_pending_goal_setting_migrations.mjs:15](../scripts/apply_pending_goal_setting_migrations.mjs) | Hardcoded Supabase `PROJECT_REF` | Points at the PLUS project | Move-to-adapter (superseded by Phase 3 import scripts); delete in template | S | template, Phase 3 |
| `public/blueprint-images/` | PLUS product screenshots | Content | Delete in template | S | template |
| [blueprintTheme.ts](../src/lib/blueprintTheme.ts), [visualWalkthrough.ts](../src/lib/visualWalkthrough.ts), [slideLayout.ts](../src/lib/slideLayout.ts), [blueprintVisualPlaceholder.ts](../src/lib/blueprintVisualPlaceholder.ts) | Grep hits (mostly 'zoom' UI terms); low-confidence residue | Possible stray PLUS references | Verify during template scrub sweep | S | template |
| Legacy `public.services` table (from `20250602160000_initial.sql`, never dropped) | Dead table in live DBs | Schema noise in template provisioning | Delete in template's schema (drop from clean DDL) | S | template, Phase 3 |

| [EditorContext.tsx](../src/contexts/EditorContext.tsx) `getScenarioDisplayViewType` | Hardcodes side-by-side display, UI-disabling the integrated view (merge itself works — verified with the scale fixture) | `view_type: integrated` scenarios can't display as stored | Generalize: honor the stored view_type | S | template |

## Summary by remediation class

- **Parameterize**: 3 (lifecycle/phase IDs, org wordmark, package name)
- **Generalize**: 5 (layer roles + line anchors, fallback-wins, loop detection, side-by-side corridor coupling, tech pills)
- **Delete in template**: 7 (arrow special cases, repair shims, display flags, src/data content, screenshots, migration script, legacy table)
- **Move-to-adapter**: 1 (hosted-push script)

## Recommended remediation order

1. **0-C `layer_role`** — the keystone; vocabulary must include line-anchor semantics (`interaction_line_after`, `visibility_line_after`, `internal_line_after` as role attributes), pill rendering, and visual rows.
2. **0-D fallback-wins neutralization** — also unhooks both repair shims and switches loop detection to FK-only.
3. **0-E variant pairs** — includes decoupling sideBySideCompareLayout from the Regular-Tutor corridor shim.
4. **Template scrub** — the delete class (arrow special cases, flags, data/, images, script, legacy table) + parameterize class (IDs, wordmark, name).

## Findings that adjust plan assumptions

1. **The magic-name surface is wider than 5 names**: 'Computer Systems' is a third pill layer, and three separate divider-line name-lists exist. The `layer_role` design must carry line-anchor semantics, not just cell rendering. (Affects Phase 0-C design.)
2. **blueprintArrowGeometry.ts is the largest PLUS-coupling in the codebase** (~1,500 lines of per-cell special cases) — but it fails safe for foreign content. Template scrub deletes it cheaply; true generalization is v2.
3. **Loop detection by English label** directly contradicts the dual-language decision — must be fixed in Phase 0, not deferred.
