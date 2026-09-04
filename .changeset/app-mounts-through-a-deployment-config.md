---
'agentic-service-blueprinting': minor
---

The App is mountable: `App({ config })` and a typed `DeploymentConfig`.

A deployment of this template mounts the whole app rather than forking it:
`import { App } from 'agentic-service-blueprinting'` and render it with a
`DeploymentConfig` — `brand` (name, logo, accent), `content` (workspace and
cover titles) and a reserved `agent` section. Missing keys resolve to the
template's own defaults, so a config of `{}` is the standalone app.

The default export and the standalone entry are unchanged; the named export
is additive. `package.json` gains an `exports` map (`.`, `./package.json`
and a `./*` wildcard, so every deep path a skill or script already resolves
keeps resolving).
