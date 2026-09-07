---
'agentic-service-blueprinting': minor
---

The editor shell and the touchpoint tone converge.

`EditorShell.tsx` is byte-identical with the deployment it was generalised from
for the first time since the fork: the aside model is in flow at every width,
`railOnly` is `asideHidden`, the sidebar carries a `collapsedByReader` binding,
and `onToggleAgent` is split from `onSelectPanel`. `shellContext.ts` arrives with
`describeSidebar`, a second error boundary wraps the active tab, the collapsed
navbar gains a path selector, and `sidebarCollapsedContext` is guarded by a
per-mount owner identity.

The mobile canvas question had two answers here and neither covered what the
other did — one gate withheld the phase frame's opener while a second
`useMobileShell()` ran for the scenario panels. There is one gate now, at the
view, travelling down as an optional prop, and the contract test asserts the
overview holds no `useMobileShell` at all.

A touchpoint carries its tone and answers to more than one name:
`touchpoints.tone`, `touchpoints.aliases` and `scenarios.note` arrive as
columns, and the colour resolver that reads them — registry, then a generic
seed, then a deterministic hash — is now one file shared with the deployment.
