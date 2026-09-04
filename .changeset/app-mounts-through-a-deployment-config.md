---
'agentic-service-blueprinting': minor
---

The App is mountable: `App({ config })` and a typed `DeploymentConfig`.

A deployment of this template mounts the whole app rather than forking it:
`import { App } from 'agentic-service-blueprinting'` and render it with a
`DeploymentConfig` — `brand` (name, logo, accent), `content` (workspace and
cover titles) and a reserved `agent` section. Missing keys resolve to the
template's own defaults, so a config of `{}` is the standalone app, and the
resolved config never aliases the host's object.

The default export and the standalone entry are unchanged; the named export
is additive. `package.json` gains an `exports` map — `.` (with a `types`
condition), `./styles.css` for the stylesheet the host imports, and a `./*`
wildcard so every deep path a skill or script already resolves keeps
resolving.

Consumed as source for now: a git install, resolved by a bundler that
understands this repo's `@/` alias and Vite's `import.meta.env` and `?raw`.
A built distribution that has resolved those at build time is the follow-up.
