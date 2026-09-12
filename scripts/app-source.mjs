/**
 * Where the application's source is: this repository's `src`, or the package's.
 *
 * A deployment that imports this repository as a dependency can stop keeping a
 * copy of the application and read it out of `node_modules` instead. The build
 * config that decides this is a file the deployment holds byte-identical to
 * this repository's, so the choice cannot be made by editing it there. It is
 * made by what is on disk: the first root that exists wins.
 *
 * ONE ANSWER, FOUR PLACES, AND A TEST. `vite.config.ts` states this pair for
 * the bundler and the two tsconfigs state it for the compiler, and neither can
 * be the one copy: a compiler cannot import a module, and the config is loaded
 * by bundling it on its own — it is also a file a deployment holds
 * byte-identical while its `scripts/` is its own, so a config that imports
 * this module is a config that does not load in the tree that needs it most.
 * (That is measured, not feared: `src/deploymentRoot.test.ts` stands a
 * deployment up out of the four build files alone, and it refused exactly that
 * import.) So this is a fourth statement of the same fact, and
 * `tests/the-build-and-a-walk-find-one-root.test.mjs` holds all four equal —
 * the same shape and the same argument as the two lists the authoring log's
 * seam is held by. What this module exists for is the checks that WALK the
 * application: a walk that starts somewhere the build does not is measuring a
 * tree nobody ships, and a walk that starts at a root that is not there
 * measures nothing at all and reports it in green.
 *
 * `src` is ALL OR NOTHING. TypeScript's `paths` falls back per MODULE and this
 * falls back per ROOT, so the two agree exactly when `src` is wholly present
 * or wholly absent, and can disagree on a tree that is half-vendored. Do not
 * half-vendor one.
 *
 * IT REFUSES WHEN NEITHER ROOT IS THERE rather than handing back the first. A
 * tree with no application is not a tree with an empty application: an alias
 * pointed at a directory that does not exist fails each import with a message
 * about that import, and a walk pointed at one sweeps nothing and passes. Both
 * are cheaper to read as one sentence naming the two places that were looked
 * in.
 *
 * The repository root is the caller's fact, so the caller says it — the same
 * reason `erd-value-sets.mjs` takes its source label rather than defaulting to
 * one repository's layout.
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** The roots, in order, relative to a repository root. */
export const APP_SOURCE_ROOTS = [
  'src',
  'node_modules/agentic-service-blueprinting/src',
]

/**
 * The first of `APP_SOURCE_ROOTS` that exists under `repoRoot`, absolute.
 *
 * Throws when neither does, naming both.
 */
export function appSourceRoot(repoRoot) {
  const roots = APP_SOURCE_ROOTS.map((root) => resolve(repoRoot, root))
  const found = roots.find((root) => existsSync(root))
  if (!found) {
    throw new Error(
      `no application source under ${repoRoot}: neither ${roots.join(' nor ')} exists`,
    )
  }
  return found
}
