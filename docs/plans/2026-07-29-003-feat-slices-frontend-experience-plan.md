---
title: "Slices frontend — tabs, focus/presentation, cell panel v2, findings, compare"
type: feat
status: completed
date: 2026-07-29
---

# Slices frontend experience

> Shipped. Phase 5's compare view landed in its evolved Compare v3 form
> (stacked bands + ledger + strip; merged grid) rather than as drafted here.

## Enhancement Summary (deepened 2026-07-29)

Reviewed by performance, TypeScript/React, architecture, security, agent-native agents.
Material changes vs. first draft:
1. **State architecture rewritten:** `TabDescriptor` is now a real discriminated union
   with `frame` evicted from tab identity; tabs live in a reducer; focus and frame state
   live in scoped sibling contexts (the codebase's own `BlueprintCellDetailContext`
   pattern), not EditorContext.
2. **Found bug pre-empted:** EditorContext's boot effect clobbers URL deep links before
   DB data arrives — restore is now modeled as pending intent.
3. **Performance package:** presentation navigation is cache-first (no per-keypress
   queries); only the active tab stays mounted; the dim is a scrim/one-shot repaint —
   never a transitioned `filter`; "in slices" derives from the already-loaded slice list.
4. **Hooks unified:** one `useSupabaseQuery` state machine (status union) instead of four
   copies of the 240-line hand-rolled pattern.
5. **Keyboard fix:** the real keydown clash is `VisualWalkthroughModal` (not
   EditorSequenceNav, which has no key handler) — presentation scopes keys via container
   focus, not window listeners.
6. **Parity fixes:** proposition card added; `[Send to map]` transport specified;
   storyboard affordances; `&lens=` URL param.
7. **Pre-task:** enable TypeScript `strict` (currently OFF — this feature leans entirely
   on null-safety).

**Implementation target: uno-blueprint first** (plan 001 rollout). Prereq prep commits on
uno: pull; port the `Slide→NavItem` rename (template `b4b4db2`) + `src/config.ts`; take
the template's `useLifecyclePhases` (no hardcoded lifecycle id). Traps on uno: never key
on layer names; don't extend `blueprintDisplayFlags.ts`; stay out of
`blueprintArrowGeometry.ts`. The four biggest surfaces this plan touches
(`SupabaseProvider`, `BlueprintCellDetailPanel`, `CellDependencyTable`, `EditorShell`)
are byte-identical across repos — keep them portable.

Stack facts: React 19 + Vite, no router (Context state), Tailwind v4, shadcn base-nova
(`accordion` and `context-menu` not yet installed — add both), grid is flex rows with
arithmetic positions (`blueprintLayout.ts`), panel is a context-driven 20rem drawer,
lane styling via `layer_role` only.

## Phase 0 — Pre-tasks

- `git pull` on uno; prep commits above.
- Add `"strict": true` to `tsconfig.app.json`; fix fallout (small codebase now, never
  smaller).
- Install shadcn `accordion` + `context-menu`.
- Split `BlueprintCellDetailContext`: move `previewHover` out of the monolithic memo
  (own context or pure CSS data-attribute) — today one hover re-renders every cell in
  every mounted grid, and this plan multiplies consumers of that context.

## Phase 1 — View state: tabs + URL

**Types (discriminated union; `frame` is view state, not identity):**

```ts
type TabDescriptor =
  | { kind: 'blueprint' }                       // pinned, unique, non-closable
  | { kind: 'slice';   sliceId: string }
  | { kind: 'present'; sliceId: string }

type TabKey = 'blueprint' | `slice:${string}` | `present:${string}`
const tabKey = (t: TabDescriptor): TabKey =>
  t.kind === 'blueprint' ? 'blueprint' : `${t.kind}:${t.sliceId}`
```

**Tabs as a reducer** (open/close/activate/closeForSlice) — dedupe via `tabKey`, pinned
invariant, close-active→activate-neighbor are pure, unit-testable transitions. Lives in
a new `ViewStateContext` sibling to EditorContext (whose 11-dep memo stays untouched).

**URL state (`src/lib/urlViewState.ts`)** — one module owns param names:

```ts
type UrlViewState =
  | { kind: 'blueprint'; lens?: 'assumption' }
  | { kind: 'slice';   sliceId: string; lens?: 'assumption' }
  | { kind: 'present'; sliceId: string; frame: number }
parseUrlViewState(search): UrlViewState | null   // frame: Number.isInteger, clamp ≥0
serializeUrlViewState(state): string
```

Rules: write via `history.replaceState` from one `useUrlViewState` hook; **debounce
frame writes ~250ms** (Safari throttles replaceState); **no popstate listener** (dead
code without pushState); **boot restore = pending intent** — hold the parsed state until
slices/scenarios finish loading, then activate or tombstone; never write it into
EditorContext at boot (its `slides[0]` reset effect would clobber it). `lens` rides the
URL (parity fix — shareable, render-checker-reachable).

**Tab strip** above the shell main area; **only the active tab's content mounts**
(perf: each grid holds ResizeObservers, resize listeners, decoded screenshot bitmaps;
optional later: LRU-2 with `content-visibility: hidden`, never `display:none` — zeroed
rects garbage the arrow layer). Per-tab scroll/frame persisted on the descriptor.
Right-click open-in-new-tab via shadcn `context-menu`; equivalent menu items for
keyboard/touch.

## Phase 2 — Slice rendering (read-only first; validates design in stage 1)

**Data:** one shared state machine, then thin hooks:

```ts
type QueryResult<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T; source: 'database' | 'fallback' | 'snapshot' }
  | { status: 'error'; message: string; fallback: T | null }
useSupabaseQuery<T>(key, fetcher, fallback): QueryResult<T>
```

`useSlices` / `useSlice` / `useEvidence` / `useFindings` ≈ 15 lines each. Extend
`BlueprintSource` with `'snapshot'` deliberately (no `null` overloading). Do NOT fold
`useScenarioBlueprint` into it in this plan. Server-side membership queries must use
`.contains('cell_ids', [id])` / `.overlaps(...)` — `= ANY` never hits the GIN index.

**Focus mode (slice tab):** slice cells full color + circled sequence badges (top-left
border corner) rendered by a `SliceFocusOverlay` positioned from `blueprintLayout.ts`
arithmetic — the grid's own diff stays minimal (a `data-focus` container attribute + the
modifier-click hook). Dim = one absolutely-positioned scrim (`color-mix` wash toward
canvas) with slice cells z-raised above it; sit the scrim above the forward-arrow layer
(`z-[2]`) and above wrap arrows (`z-[30]`) so arrows dim too, badges higher still.
**Never add `filter` to the cell transition list** (`index.css:174`) — a transitioned
filter repaints every cell every frame; if the dim eases, transition `opacity` only.
No `backdrop-filter` on a scrollable grid. Global de-focus: click anywhere outside a
slice cell lifts the dim (readable at all times — never blur); slice cell or corner pill
re-focuses; precedence over cell deselection. Focus state lives in a per-view
`SliceFocusContext` mounted inside the slice tab.

Tombstones for dangling `cell_ids` ("cell removed" chip, skipped in numbering, warning
count in header). Cross-scenario slices: v1 slices are **single-scenario** (slice skill
enforces; simplicity finding) — filmstrip greys out-of-view frames with "jump to
scenario" as the v2 path. Integrated view highlights when ANY merged underlying uuid
matches (`resolveBlueprintCellId`).

**Presentation mode (own tab):** stage (illustration `?v=` cache-busted, caption,
narrative, cell chips → focus mode), filmstrip of cells with frame brackets, mini-map
locator. **Navigation is cache-first**: frames render synchronously from cached
`useSlice` data; freshness via debounced revalidate (~300ms after last keypress) or
Realtime subscription later — never a query per keypress. Keyboard scoped to the
container (`tabIndex={-1}` + `onKeyDown`, focused on tab activation) — the real
window-listener clashes are `VisualWalkthroughModal`, the cell panel, and the sidebar;
container focus sidesteps all three. Grid stays mounted across frames. Empty slice →
empty-state card; single cell → stage only.

## Phase 3 — Auth, CRUD, panel v2, sidebar, lens, proposition

**Auth (decision 1, doc-verified):** implicit flow (default), NOT PKCE (magic links
opened cross-device fail PKCE); `signInWithOtp({ email, options: { emailRedirectTo:
window.location.origin, shouldCreateUser: false } })`; offer the 6-digit OTP-code entry
too (corporate link-prefetch scanners consume magic links). `onAuthStateChange`
registered once, synchronous callback. `SupabaseProvider` gains `canWrite` (documented
as a **visibility hint** — RLS is the authority; hidden-not-disabled everywhere).
Netlify `_headers` CSP (`img-src 'self' <project>.supabase.co; connect-src ...`);
validate `illustration.src` on write and render: `https:` + host allowlist (external
images are an XSS-adjacent vector into every viewer's session).

**Optimistic concurrency (the three sharp edges, verbatim into implementation):**
1. Conflict branch is **`data.length === 0`**, not `error !== null` (PostgREST returns
   200 + empty on zero rows matched).
2. The `.eq('updated_at', token)` value must be the **verbatim string** PostgREST
   returned — one pass through `Date` truncates microseconds and every save becomes a
   phantom conflict. Carry it as an opaque `UpdatedAtToken = string`.
3. `updated_at` is trigger-maintained (plan 002 convention) — never client-set.
Empty result is ambiguous (changed/deleted/RLS-hidden): refetch and branch — row gone →
tombstone + close tab; present → merge/reload toast.

**Slice CRUD:** modifier-click (cmd/shift) enters selection without opening the panel;
floating `[Create slice (n)]` → title → new tab in edit mode. Edit mode: toggle cells,
drag-reorder (position swaps rely on the deferred unique constraint), bracket-drag
between frames, `⊕` frame split, inline captions; any edit flips `origin` to
`customized` (regeneration warns). Delete via tab menu + confirm. Validation:
`src/lib/sliceValidation.ts` — **generated by `generate_slice_validator.py`** (plan 002),
plain type-guard predicates, no zod; findings status transitions included so panel and
skills enforce identical rules.

**Cell panel v2** (rework of the 629-line `BlueprintCellDetailPanel`, identical in both
repos): keep context selection, breadcrumb, picture, cross-navigation. Header: cell
title + single role-colored lane chip. Four tabs (icon+tooltip triggers at 20rem,
expand-to-40rem affordance, validate zh):
- **Overview:** description; FUNCTION; FORM; VALUE (`value_props`). Hidden until
  authored; one `[✎ specify]`.
- **Dependencies:** grouped SET OFF BY / SETS OFF (kind=trigger) / NEEDS (kind=needs)
  rows — lane · step, label chip, why-line (`note`); row click cross-navigates. Drop
  uno's `abbreviateConnectionLayerName` while in here (template already did).
  Read-only in v1 (link editing is agent-path only — recorded asymmetry).
- **Evidence:** `○ assumption` derived state, source rows, `[+ add source]` (canWrite).
  For anonymous-but-configured sessions the tab shows "sign in to view evidence" — do
  NOT render all-assumption from an empty restricted read.
- **Resources:** existing `links` via `normalizeCellLinks()`, UI label only.
Inline edit (canWrite) writes the granted spec columns; survives re-import via plan 002
decision 6. Footer: "In slices" — **derived client-side from the cached `useSlices`
list** (microseconds), not a per-open GIN query; compute against all merged uuids in
integrated view; defer any server fallback to footer expansion.

**Sidebar:** "Slices" accordion section in `SlideModeSidebarNav`, ordered by
`slices.position`, type chip, click opens tab.

**Proposition card (parity fix):** compact card on the lifecycle/service-overview
surface — view + canWrite inline edit of the five fields + three validation questions
with evidence links. Lane chip click → mini-popover (owner_team/kpis/tools); phase
fields on the phase overview.

**Assumption lens:** toolbar toggle behind a feature const; counts from the public
`evidence_counts` view (one grouped fetch per scenario per activation, held as a stable
`Map`, invalidated only on Evidence-tab mutations); tint via container
`data-lens` + per-cell `data-no-evidence` attributes; `&lens=assumption` in the URL.
Disabled with tooltip when counts are unavailable.

## Phase 4 — Findings panel

Drawer pattern; severity-sorted, grouped by check; resolve/dismiss under canWrite
(status-only column grant enforces server-side; transitions in the generated validator).
Click → cells focus via the same scrim machinery; tombstones reused. Empty state links
to "run an audit" instructions (the capability-hint pattern — reuse it on frames without
illustrations: "ask the slice skill to storyboard this").

## Phase 5 — Whatif compare view

Variants arrive as IR files loaded through `normalizeBlueprint` as an ephemeral
scenario, rendered in the existing `SideBySideCompareGrid` — **local-dev loop only**
(fallbacks are build-time modules); the deploy-safe artifact is whatif's comparison
markdown doc. Markers ▓ changed / ✚ new load / ✖ broken link from the whatif finding
set; impact-tracer narrative in the panel. Actions: `[Discard]`; `[Send to map]` —
**local dev:** writes the change-request file into the workspace; **deployed builds:**
downloads the change-request JSON for the user to hand to the map skill. Whole-whatif
promote only, v1.

## Component inventory

New: `ViewStateContext` (tabs reducer + URL hook), `urlViewState.ts`, `TabStrip`,
`SliceFocusOverlay`, `SliceFocusContext`, `SlicePresentation`, `SliceEditBar`,
`SlicesSidebarSection`, `PropositionCard`, `FindingsPanel`, `AssumptionLensToggle`,
`CompareMarkers`, `useSupabaseQuery` + 4 thin hooks, `sliceValidation.ts` (generated).
Modified: `EditorShell`, `SlideModeView`, `BlueprintCellDetailPanel` (major),
`CellDependencyTable`, `SupabaseProvider` (canWrite), `BlueprintCellDetailContext`
(hover split), `ServiceBlueprintGrid` (data-focus attr + modifier-click only),
`blueprintFallbacks` registry, `index.css` (lens/scrim tokens; NOT the cell transition
list), Netlify `_headers`.

Naming hazard (architecture finding): the codebase says "slides" everywhere for
scenario nav (`SlideModeView`, `FALLBACK_SLIDES`…) — one letter from "slices". Keep DB
`slices`; prefix new frontend modules `slice*` and never abbreviate either; note in
review checklist.

## Acceptance criteria

- [ ] Prep commits landed on uno; `strict` on; build green.
- [ ] Hand-inserted slice renders in focus + presentation; `?slice=` deep link
      survives refresh (pending-intent restore verified against the boot-clobber path).
- [ ] Presentation arrows: zero network requests during navigation (devtools check);
      keys captured only while the presentation container has focus.
- [ ] Focus toggle causes no layout shift and no arrow recompute; dim readable; badges
      persist when de-focused.
- [ ] CRUD parity under canWrite; all mutation UI hidden when anonymous or no-DB;
      concurrent-edit conflict shows toast + correct branch (deleted vs changed).
- [ ] Panel v2 at 20rem with zh strings; Evidence tab never renders false assumptions
      for anonymous sessions; dependencies show why-lines.
- [ ] Proposition card round-trips; lens matches `evidence_counts`; findings
      click-to-focus works; tombstones never crash.
- [ ] `tsc -b && vite build` green on uno AND (stage 2) template; render-checker pass
      across scenarios × views × slices.

## Sources

- Origin: plan 001 + design conversation (ASCII prototypes, tab model, soft-dim
  correction, panel tabs).
- Deepening reviews: TypeScript/React (P0-1..P2-8 incl. the EditorContext boot-clobber
  bug at lines 86–90 and the strict-mode gap), performance (ranked 1–7 incl. the
  context fan-out and arrow-layer hotspots), security (4.x auth/CSP/src validation),
  architecture (ViewStateContext seam, naming hazard, lens-on-restricted-reads),
  agent-native (proposition card, lens param, Send-to-map transport), Supabase
  researcher (implicit flow, `.contains()`, storage `?v=`).
- Repo divergence report (prep commits, copy-safe vs careful-merge surfaces, traps).
