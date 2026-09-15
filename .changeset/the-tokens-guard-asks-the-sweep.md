---
'agentic-service-blueprinting': patch
---

The application's last guard that resolved a root from its own file asks the sweep

The tokens guard sweeps the `commit` subject for prose that spells a registered
custom property, and it used to hand that sweep a root it had computed itself —
`resolve(dirname(fileURLToPath(import.meta.url)), '../..')`, two hops of path
arithmetic that a file carries with it when it moves. It names no root now. The
sweep's default is the tree the run is in, which is where `lib/sourceTree`
takes the application's reading from too.

`deploymentRoot.test.ts` was doing the same thing one hop up, to reach the
build files it copies into a scratch tree and the `node_modules` it links
beside them. It reads `process.cwd()` now.

**No test module under `src/` computes a repository root from
`import.meta.url`.** What remains there are reads of files outside the
application — the authored figures, the generated schema, the migrations, the
published references — each addressed relative to its own module rather than
used as a root, which is a different thing and not this one.

This SWAPS which opinion is trusted rather than simply deleting one, and the
trade is worth naming: the old spelling was right whatever directory the runner
started in, and the new one is right because the runner starts at the root. For
a guard of the APPLICATION that is the only available answer — the application
is a deployment's `src` laid over the package's, so a guard resolved from its
own location inside `node_modules` would measure the package instead of the
tree that installed it. The opposite spelling stays deliberately in
`scripts/tests/every-sweep-knows-what-it-measures.test.mjs`, which measures the
scripts of THIS tree and says why in its own header; nothing here disturbs it.

The assertions are untouched. `scripts/sweep.mjs` is untouched too: it already
answered this question, and a deployment holding it byte-identical has nothing
to take.
