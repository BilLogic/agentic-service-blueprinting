---
summary: State that must outlive a mount point, or be read by code with no hooks available to it, lives in a module-level store read through useSyncExternalStore rather than in context — two named conditions, not a state-management strategy.
---

# 5. Cross-surface state is a module store, not context

**Status** Accepted — 2026-09-06
**Context** [#163](https://github.com/BilLogic/agentic-service-blueprinting/issues/163)

## Context

State shared across surfaces that do not share a provider lives in a
module-level store, read through `useSyncExternalStore`. Context is for state
that has a tree.

Two conditions send state here, and either one is sufficient:

1. **It must survive a mount point changing.** The agent chat renders from two
   places — docked in the sidebar, floating over the canvas — and a drag flips
   which one exists *mid-gesture*. Component state dies in that gap, taking the
   drop-target ring, the open session and a half-typed message with it.
2. **Code with no hooks available to it must read it.** The agent's UI-context
   collector is plain functions, and `lib/service.ts` resolves the active
   service's id inside fetchers that are not components. A value both a
   component and a bare function must agree on has nowhere else to live.

The live instances each carry their reason in their own header comment:
`agent/placement.ts`, `agent/panelState.ts`, `agent/settings.ts`,
`agent/sessions.ts`, `contexts/activeServiceStore.ts`,
`contexts/shellBootStore.ts`, `contexts/sidebarCollapsedContext.ts`,
`lib/compareReviewStore.ts`, `lib/openCellStore.ts`, `lib/authoringSession.ts`,
and `hooks/useMobileShell.ts` (a media query as an external store).

## Consequences

**The snapshot must be reference-stable between writes.** A `getSnapshot` that
builds a fresh object per call loops the render. Every store here caches its
snapshot and bumps it on write; that is not an optimisation, it is the
contract.

**Persistence is decoupled from emission.** A drag emits on every pointermove,
and a synchronous `JSON.stringify` plus a storage write per frame is a real
cost for a value nobody reads until the next boot. Callers flush at the end of
a gesture.

**Default is still derived state and props.** This is the escape hatch for two
named conditions, not a state-management strategy. A store reached for because
prop-drilling felt tedious is a store nobody can find the writer of.

**A deployment inherits the pattern, not the instances.** These stores are
application code: a deployment that mounts this template gets them as they
are, and the rule that decides where a NEW piece of state goes is what this
record is for.
