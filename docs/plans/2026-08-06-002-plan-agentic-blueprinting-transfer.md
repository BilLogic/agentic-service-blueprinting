---
title: Transfer uno-blueprint's proven patterns into the starter kit
type: plan
status: active
date: 2026-08-06
source: uno-blueprint docs/plans/2026-08-06-002 (adapted)
---

# 🚚 The transfer plan — uno-blueprint → agentic-service-blueprinting

## Overview

This repo is three things shipped as one versioned package (CHANGELOG:
"workspace plugin version = template version", currently 0.2.2 @ `695cd12`):

1. the **sb plugin** — skills, agents, references, scripts (the agentic harness);
2. the **template app** — a frontend that renders a service blueprint;
3. the **adapters** — no-DB fallback generator and Supabase, co-equal per
   `references/adapter-contract.md`.

uno-blueprint has spent two days as the proving ground: Supabase-aligned
design system, matcha brand, motion tokens, TanStack Query with an explicit
invalidation contract, an access model, a zero lint baseline, TS7 tooling, and
a pile of review-hardened fixes. The template still runs the OLD frontend — a
monolithic `src/index.css`, pre-token, pre-everything.

This plan sequences the transfer so the template ships what uno-blueprint
proved, the plugin sheds its stress-test defects, and the transferable ideas
land as *rules*, not copied files.

## The framing that governs every decision here

**This repo is an open-source starter kit.** An adopter clones it and gets:

- a **working frontend out of the box** — renders immediately off the shipped
  sample scenario (`src/data/blueprintFallbacks.ts` + `scaleFixture.ts`), no
  backend, no env vars, no account;
- the **full agentic harness** — `skills/`, `agents/`, `references/`,
  `scripts/` stay here and are the product, not scaffolding around it;
- **their own data**, supplied through the harness (ingest → IR → adapter);
- **their own backend choice**. Supabase is the paved road for a fast start —
  schema, policies, seed generator, migrations all ready — but it is an
  *option offered*, never a default assumed. An adopter on another backend
  asks the agent to interpret the documented rules and implement their own
  adapter; the contract is written so a stranger can.

Two consequences, and they override the source plan where they conflict:

- **No port may deepen Supabase coupling.** Today it is narrow: 8 files under
  `src/` touch Supabase at all, behind `SupabaseProvider` + `lib/supabase.ts`,
  with `resolveBlueprint`/`mergeSlidesWithFallback` making the no-DB path
  first-class. That narrowness is a feature to defend, not an accident.
- **Anything Supabase-specific is documented as a recipe, not a rule.**
  Top-level rules describe the *contract*; the Supabase way of satisfying it
  lives where an adopter who picked Supabase will find it, and an adopter who
  didn't can ignore.

## What transfers (and what deliberately doesn't)

### A. Plugin fixes — todos/018, smallest first

1. **Scratch files in the 0.2.2 package** (`.tmp_fp_pure.py`,
   `.tmp_fp_compute.py`/`.ipynb`, `.tmp_fp_out.json`, `.tmp_run_sha256.py`):
   delete; add a packaging ignore. Commit `9b3adc2` already did this dance
   once and they came back — the ignore is the actual fix, not the deletion.
   Extra weight under the starter-kit framing: these ship to every adopter.
2. **slice SKILL.md fallback caveat**: copy the exact "workspaces scaffolded
   before this skill shipped may lack these files — fall back to plugin root"
   clause audit/whatif carry.
3. **`audit_tools.py dedupe`** raw traceback on malformed JSON → formatted
   error like its sibling subcommands.
4. **Ecoeled workspace upgrade** (`~/Documents/Claude/Projects/Ecoeled/
   blueprint-workspace`): run the customization.md upgrade recipe to 0.2.3;
   refresh the stale `fault-repair-closed-loop` sign-off hash (its friction
   #19). A *workspace* action outside this repo — do it after the plugin fixes
   so it upgrades onto fixed files. Also the kit's first real dogfood of the
   upgrade path an adopter will walk.

### B. Template frontend — port the proven architecture

Port in the same order the proving ground did; the order encoded the
dependencies.

1. **CSS architecture**: kill `src/index.css` (368 lines, monolithic); adopt
   the `src/styles/` split (imports-only entry, dials in `themes/`,
   derivations in `semantic.css`, `@theme inline` map in `theme.css`). Carry
   the hard-won rules as comments — they are the transfer: fallback chains
   OUTSIDE `var()` slots; seam variables distinctly named (`--app-font-sans`,
   never self-referential — `@theme inline` emits the property);
   `--surface-hue` default-plus-override is the one sanctioned dual
   declaration.
2. **Token discipline**: `text-2xs/3xs`, `--motion-*` + `--ease-structural`,
   `--shadow-floating`, `--primary-border`. Bring the two drift tests
   (`palette.test.ts` pattern, `motion.test.ts` incl. its reduced-motion
   coverage assertion) — the tests are what makes the tokens stick. Note:
   there is no vitest in this repo yet, so this step *adds* the test harness.
3. **Brand seam, not brand copy**: the kit gets the OKLCH machinery (hue dial,
   gamut-checked primary, derived border) with a neutral default, NOT uno's
   matcha. Rebranding to their own colour is a thing an adopter does on day
   one, so the hue dial is a headline feature — document the oklch-skill
   method in the styling README: contrast moves by L, chroma checked against
   the ceiling per-space, C% consistency judged not assumed.
4. **Query layer — backend-agnostic, adapted not copied.** ⚠ The source
   plan's `useSupabaseQuery` wrapper is Supabase-shaped; porting it verbatim
   couples the kit to Supabase and breaks the adapter contract. Port the
   *pattern*: TanStack `queryClient` + a fetch-source seam the Supabase
   adapter and the no-DB fallback both satisfy. Carry the lesson verbatim at
   the top of the module: *staleTime Infinity means every mutation MUST
   invalidate every read-prefix it touches; the proving ground's reviews
   caught five forgotten prefixes* (scenario-paths, lane-sources, evidence,
   value-audiences, and the revert path). Gate: the no-DB path must still
   render with zero env vars after this lands.
5. **Component patterns**: SegmentedControl-over-toggle-group, command-driven
   slash menu, shape-true skeletons discipline (EditorLoadingSkeletons'
   import-the-real-constants trick), CanvasEmptyState variants, the
   arrow-geometry horizontal-entry anchor convention.
6. **Tooling**: zero lint baseline + the eslint config shape (scoped
   react-refresh off for contexts, `^_` ignore patterns); vitest single
   harness; TS7 side-by-side (`@typescript/native` for typecheck, TS6 for
   typescript-eslint) with the collapse note; the `--font-source-code-pro`
   injection in base.css. Adopter-facing: a clone must pass `lint`, `build`,
   and `test` green on first run, or the kit ships broken.

### C. Backend rules — contract at the top, Supabase as a recipe

The source plan puts three access-model rules verbatim into AGENTS.md. Under
the starter-kit framing they split by audience:

**Backend-neutral, → AGENTS.md** (true of any host, states the contract an
adopter's own adapter must meet):

1. Public/anon reads reach the published presentation surface only.
2. Authenticated writes go through one ledgered funnel — a single audited
   entry point, not scattered table access.
3. Privileged credentials never leave the operator's machine and never reach
   the client bundle.

**Supabase-specific, → `supabase/DATABASE.md` + the adapter contract**
(how *this* paved road satisfies the above, ignorable by anyone who didn't
pick it): SECURITY DEFINER + revoked table grants + `SET search_path` +
in-body auth check; anon RLS in `assets/policies.supabase.sql`.

Plus the operational lessons as a migration-authoring note in
`supabase/DATABASE.md`:

- A per-role `REVOKE` is a no-op while the PUBLIC default grant stands —
  revoke from PUBLIC.
- Every hosted `apply_migration` gets a same-day committed migration file, or
  a rebuild silently regresses it (the security review's P2). Sharper here:
  the repo has exactly one migration file, so this discipline is being
  established, not restored.
- The evidence-undo coupling pattern: verbatim-row restores depend on lax
  insert policies; tightening and restore-RPC-ification travel together.

### D. What does NOT transfer

- The matcha brand values (kit keeps a neutral default; hue is a dial).
- uno's Supabase project specifics (IDs, seeds, Ecoeled data). Under the kit
  framing this is not just tidiness — a leaked project ref in a public repo is
  a security issue. Grep every ported file before it lands.
- The agent-panel provider/key UX — the kit may want it, but it's feature
  work, not pattern transfer; decide separately.
- `compat.css` and other flagged-for-deletion residue (todos/016) — don't
  export debt.
- Any assumption that a backend exists. If a ported component cannot render
  against the shipped fallback data, it is not ready to transfer.

## Sequencing

| Phase | Work | Gate |
| --- | --- | --- |
| 1 | A1–A3 plugin fixes | `scripts/tests/run_tests.sh` green |
| 2 | Version bump 0.2.3 + CHANGELOG; reinstall marketplace cache | `/plugin` reinstall picks up 0.2.3; sb skills still register |
| 3 | A4 Ecoeled workspace upgrade | its bundled validator exit 0; sign-off hashes recomputed |
| 4 | B1–B2 CSS + tokens + drift tests | build green, drift tests pass, template renders unchanged-by-default |
| 5 | B3–B6 seam/query/components/tooling | lint 0, tests green, **and** clean clone renders with no `.env` |
| 6 | C rules split into AGENTS.md + `supabase/DATABASE.md` | reads correctly against the actual `supabase/` dir; AGENTS.md names no Supabase-only mechanism |
| 7 | Visual eval (both themes) + scaffolded-workspace smoke test + **cold-clone adopter walk** | render-checker walk clean; a fresh clone gets to a rendered blueprint with no account |

Phases 1–3 are an afternoon; 4–5 are the real port (uno's commits from
`65a94b6` through `82cc969` are effectively a replay script); 6–7 close it.

## Risks

| Risk | Mitigation |
| --- | --- |
| Template app has diverged structurally from uno's pre-migration state | Diff `src/` trees first; port by concern, not by patch |
| Plugin version bump breaks the installed Ecoeled workspace mid-upgrade | Phase order: fix plugin → bump → THEN upgrade workspace onto the fixed version |
| Copying files instead of rules re-imports uno-specific debt | Section D is the guard; review each ported file for uno-isms (project IDs, matcha values, Ecoeled references) |
| **The port quietly makes Supabase mandatory** | Phase 5 gate is a clean clone with no `.env` rendering the sample scenario; B4 is adapted, not copied; §C keeps Supabase out of AGENTS.md |
| **The kit ships broken to its first adopter** | Phase 7 cold-clone walk: clone → install → dev → see a blueprint, with no account and no reading of docs |
| Two repos drift again after transfer | The drift tests travel with the tokens; AGENTS.md rules travel with the model — both self-enforce |

## Sources

- Proving-ground history: uno-blueprint `65a94b6..82cc969` (the replay script)
- Source plan: uno-blueprint `docs/plans/2026-08-06-002` (this is the adapted copy)
- todos/018 (sb defects), todos/016 (residue not to export)
- uno-blueprint `docs/plans/2026-08-06-001` (access model, decisions + couplings)
- Stress-test report (sb suite health, 2026-08-06)
- This repo @ `695cd12` (0.2.2); `references/adapter-contract.md` is the
  governing document for anything backend-shaped
