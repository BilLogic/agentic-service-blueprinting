---
'agentic-service-blueprinting': minor
---

The sample board reaches the deployment seam, and the nav helpers stop
guessing which board they are about.

`DeploymentConfig` gains a `sample.nav`: the board a deployment shows before
its own data arrives. `ResolvedDeploymentConfig.sample.nav` is guaranteed
non-empty the way `brand.name` is guaranteed a string — the template's default
supplies one, and an overlay of an EMPTY array reads as "I have nothing to
say" rather than "show nothing", the same reading `present()` already gives an
`undefined` field.

The array itself moves out of `@/types/nav` into `@/data/sampleNav`, which is
a deployment's own content. `types/nav.ts` is now types and pure helpers with
no sample in it.

Eleven helpers lose their `= FALLBACK_NAV` default parameter. A default that
names one particular board makes a forgotten argument invisible: the call site
compiles, and answers about a board nobody is looking at.
`overviewFlowArrowAnchor.test.ts` had pinned exactly that — two assertions
recording the wrong answers an omission produced. Those calls no longer
compile.

`EditorProvider` reads the sample through `useDeploymentConfig`, so it now
requires `DeploymentConfigProvider` above it — the nesting `App.tsx` already
has, with the seam outermost.
