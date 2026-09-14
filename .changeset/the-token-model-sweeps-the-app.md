---
'agentic-service-blueprinting': patch
---

**The token model now reads the application the build assembles, not the
package it happens to live in.** `src/lib/tokenModel.ts` found its stylesheets
and its TypeScript by resolving `src/` from its own file location and walking
it. That is right in this tree and wrong in every deployment: a consumer
installs this package under `node_modules`, so the walk opened the PACKAGE's
`src/styles` and never the deployment's own. Every rule riding the model —
`styles/tokens.test.ts`, `lib/tokenModel.test.ts`, `lib/tokenDiscipline.test.ts`
— then judged the package inside a consumer and passed, having measured nothing
about the application that consumer builds, which is where a deployment's token
dials actually live.

Both walkers are now the `app` subject of `scripts/sweep.mjs`: the CSS set and
the TypeScript set are filtered out of `sweep({ subject: 'app' }).files`, and
every read goes through the sweep's `read`. That is the same overlay rule the
build applies — a deployment's `src` over the package's, per path — so the
model reads the deployment's stylesheet wherever the deployment has one and the
package's everywhere else. The module drops `node:fs`, `node:path` and
`node:url` and no longer knows where it is installed; the root is the tree the
run is in, which is the rule `sweep.mjs` states for every check.

The two tests follow. `tokenModel.test.ts` opens the raw file through the same
sweep rather than through a path resolved from its own location, so it agrees
with the model in a deployment instead of only here. `tokenDiscipline.test.ts`
keeps its independent second walk — a file whose whole point is that there
should be one model still needs a counterpart the model cannot talk it into
agreeing — but takes its enumeration from the sweep too: which files the
application HAS is the build's rule, and only the filter and the comparison
were ever this test's to own.

No file set moved in this repository: the sweep lists the same fifteen
stylesheets and the same 476 non-test sources the old walk found.
