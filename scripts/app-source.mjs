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
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

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

/**
 * The directory the application's root sits in, absolute.
 *
 * This is the package: `<repo>` where the application is this repository's
 * own `src`, and `<repo>/node_modules/agentic-service-blueprinting` where it
 * is the one this tree depends on. It is what a FINDING is reported relative
 * to, so a path reads `src/components/…` on either side and a check's expected
 * paths are one list rather than one per deployment.
 */
export function appPackageRoot(repoRoot) {
  return dirname(appSourceRoot(repoRoot))
}

/**
 * An application path — `src/lib/panelTerms.ts` — wherever the application is.
 *
 * The argument is the path as a reader writes it and as a finding prints it,
 * which is the whole reason this takes `src/…` rather than the part after it:
 * the caller states one path, and the same string is what it reports.
 *
 * IT REFUSES A PATH THAT IS NOT THERE, naming the root it looked under. A
 * check that reads a file it names by hand has already decided that file is
 * its subject, so the file's absence is the subject's absence.
 */
export function appFile(repoRoot, path) {
  const inside = path.replace(/^\/*/, '')
  if (!/^src(?:\/|$)/.test(inside)) {
    throw new Error(`not an application path: ${path} does not start with src/`)
  }
  const found = join(appPackageRoot(repoRoot), inside)
  if (!existsSync(found)) {
    throw new Error(`no ${inside} under ${appPackageRoot(repoRoot)}: this check has no subject`)
  }
  return found
}

/** `appFile`, read. */
export function readAppFile(repoRoot, path, encoding = 'utf8') {
  return readFileSync(appFile(repoRoot, path), encoding)
}

/** Directory names a walk of the application never descends into. */
const NEVER_WALKED = new Set(['node_modules'])

function filesUnder(dir) {
  const found = []
  for (const entry of readdirSync(dir).sort()) {
    if (entry.startsWith('.') || NEVER_WALKED.has(entry)) continue
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) found.push(...filesUnder(path))
    else found.push(path)
  }
  return found
}

/**
 * Every application file `matches` accepts, as `src/…` paths, sorted.
 *
 * A WALK THAT FINDS NOTHING THROWS. An empty subject and a clean one print the
 * same green line, and the green one goes on being printed every run after —
 * the run that would have caught the defect looks exactly like the run before
 * it. So the absence of a subject is a failure here, and it names the root it
 * swept and what it was looking for.
 *
 * @param {string} repoRoot
 * @param {(path: string) => boolean} [matches] Called with the `src/…` path.
 * @param {string} [subject] What the caller is looking for, for the message.
 */
export function appFiles(repoRoot, matches = () => true, subject = 'file') {
  const source = appSourceRoot(repoRoot)
  const base = dirname(source)
  const found = filesUnder(source)
    .map((path) => relative(base, path).split('\\').join('/'))
    .filter((path) => matches(path))
    .sort()
  if (found.length === 0) {
    throw new Error(
      `no ${subject} under ${source}: this walk has no subject, which is a ` +
        `failure and not a pass`,
    )
  }
  return found
}
