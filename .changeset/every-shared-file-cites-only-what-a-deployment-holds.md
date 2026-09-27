---
'uno-blueprint': patch
---

Every shared file cites only what a deployment holds

Four shared scripts still pointed at files only this template has, and now
name the thing rather than its path: `check-target-schema.mjs` (the IR
validator and the application's schema-version module), `agent-account.mjs`
(the panel-terms module and the database types), `authoring-archivers.mjs`
(the authoring-log module), and `check-harness-claims.mjs`, whose adoption
message sent the reader to the package's customization reference by a path
their tree lacks. The router suite's path-shaped fixtures move under `notes/`.

Shared files that spoke as if only the template read them now say what
holds on both sides, naming the template where they mean it.
`always-loaded.mjs` said "here that is `AGENTS.md`" and kept a census of near
misses only one side had. `vite.config.ts`, `tsconfig.json`,
`tsconfig.app.json` and `tsconfig.node.json` said "here" for "in the
template" — the second root "never reached here", `deployment/` "does not
exist here" — which a deployment holding the same bytes reads as false.
`sweep.mjs`, `verdict.mjs`, `seed-list.mjs`, `check-harness-claims.mjs` and
`check-target-schema.mjs` had the same slip in a sentence each: "this tree
here", "every check in this repository", "a deployment of this template".

The shared-file guard grows to match. A `scripts/…` file cited from a shared
file must be one `SHARED_SCRIPTS` or `REPO_LOCAL_IMPORTS` accounts for. A new
`SHARED_CONFIGS` list names the build configuration a deployment holds
byte-identical — `vite.config.ts`, the three tsconfigs, `eslint.config.js`,
`components.json` — and `SHARED_DATA` the triage-label map and the step
placeholder; both are held to the same rules. A third rule refuses a file
named under a tree only the template keeps — the plugin manifest, the hook,
the eval fixtures, the handoff template — which a deployment neither holds nor
reads out of the package. `src/…`, the reference documents and the skills
stay outside it: they are the package's published surface, which a
deployment reads by fixed path.

The published lists now match what a deployment actually holds.
`erd-value-sets.mjs` and `one-badge-one-size.test.mjs` were held
byte-identical by a deployment but missing from `SHARED_SCRIPTS`, so no
template-side guard read them; both are listed now, with their reasons.

Comments and tests only; no behaviour changes. A deployment that holds these
files takes the new bytes with the pin bump. `SHARED_SCRIPTS` keeps its
shape, so the deployment-side reader of that list is unaffected.
