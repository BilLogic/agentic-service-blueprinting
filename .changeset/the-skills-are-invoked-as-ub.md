---
'agentic-service-blueprinting': major
---

The skills are invoked as `ub:`

The plugin is `ub`, installed from the `ub-marketplace`, and its four skills
are `ub:map`, `ub:slice`, `ub:audit` and `ub:whatif`. The composer offers and
runs `/ub:<skill>`; a bare segment such as `/audit` still only finds the skill
and never runs it. The router, the skills, the agents, the references, the
hooks (whose messages now open `[ub]`), the skill evals, the cover page and its
figures, and the bundled sample blueprint all use the new names, and the app's
default organisation name and page title are Uno Blueprint.

A deployment reinstalls the plugin as `ub@ub-marketplace` and uses the `ub:`
names wherever it invokes a skill. The overlay and import Vite plugins are named
`uno-blueprint:overlay` and `uno-blueprint:vite-imports`, so a deployment
config that looks either up by name follows them. The default-config exports
are `templateDefaultConfig`, `templateDefaultCellBudget` and
`templateDefaultAgentSearch`, so a deployment that imports any of them imports
it by that name.
