---
'agentic-service-blueprinting': minor
---

`@/…` can resolve to the package, so a deployment need not keep a copy of `src`

A deployment that imports this repository as a dependency should be able to
read the application out of `node_modules` instead of holding a copy of every
file. It could not, and the reason was three lines of build configuration.

`vite.config.ts`, `tsconfig.json` and `tsconfig.app.json` each map `@` to
`./src`, and a deployment holds all three byte-identical to this repository's.
So the deployment could not point the alias at the package without editing a
file it has promised not to change — and with no local `src`, every `@/…`
import in this package fails to resolve. Measured against a real deployment
tree with `src` removed: `TS2307: Cannot find module '@/config'` and the same
for every other alias, from this package's own files.

Each mapping now names TWO roots, tried in order: `./src`, then
`./node_modules/agentic-service-blueprinting/src`. TypeScript's `paths` takes
an array and falls back per module. `vite.config.ts` chooses the first root
that exists on disk.

Nothing observable changes here or in any deployment that still has a `src`:
the first root always exists and the second is never reached. With `src`
removed, the same deployment tree typechecks and builds clean.

`src` is all or nothing. `paths` falls back per MODULE and the Vite side per
ROOT, so the two agree exactly when `src` is wholly present or wholly absent
and can disagree on a half-vendored tree.
