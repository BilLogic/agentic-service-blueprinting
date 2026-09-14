/**
 * ONE MODULE ANSWERS "GIVE ME THE FILES FOR THIS SUBJECT".
 *
 * Every check in this repository used to begin the same way and end
 * differently: resolve a root from its own location, walk a directory, decide
 * what a missing folder means, decide what a file that vanished between the
 * listing and the read means — and then, a hundred lines in, judge something.
 * Five helpers grew up around the first half (`app-source`, `swept-docs`,
 * `read-listed`, `repository-only`, `unverified`), each answering one piece
 * for the checks that knew to call it, and a check written without one of
 * them got that piece wrong in the way the helper's header describes. This
 * module is the first half, once. A check names a Subject, receives its
 * files, and contains only its judgement.
 *
 * A SUBJECT is a named tree and its rule: where its root is, which files are
 * its, and what "cannot see the subject" means there. There are seven, and
 * the answers differ in ways that matter:
 *
 *   app              The application — a deployment's `src` laid over the
 *                    package's, per path (the Overlay; `overlay.mjs` is the
 *                    rule the build applies, and this is the same rule for a
 *                    walk). Paths read `src/…` wherever the file is. No
 *                    application anywhere is a FAILURE: a walk of nothing
 *                    passes every rule at once.
 *   docs             This repository's prose: every markdown file at the
 *                    root but the changelog, and the markdown under the
 *                    folders `repo-config.mjs` names — minus the dated
 *                    records, whose words are the day they were written. A
 *                    named folder this tree lacks is a SKIP SAID OUT LOUD: a
 *                    repository without a plugin surface has no `skills/`,
 *                    and that is a fact about the tree, announced once so a
 *                    misspelt name cannot pass as one.
 *   scripts          This repository's own executable code: `scripts/` and
 *                    the scripts under `skills/<skill>/scripts/`, which a model
 *                    runs against a live database. A deployment's scripts
 *                    are its own, so the root is always this tree's. No
 *                    scripts is a FAILURE.
 *   migrations       `supabase/migrations/`, the `.sql` files, this tree's. None is a
 *                    FAILURE.
 *   references       `references/`, the published surface of THIS
 *                    repository. A repository without one is a SKIP SAID OUT
 *                    LOUD, for the reason `docs` gives.
 *   reference-docs   The PACKAGE's `references/`, read and never written —
 *                    what a check holds this tree's own documents against,
 *                    out of the installed package in a deployment and out of
 *                    this tree here. None is a FAILURE, and so is an installed
 *                    package that ships none: the deployment's own documents
 *                    are never handed back as the package's.
 *   deployment-seed  A deployment's seed, in a checkout beside this one.
 *                    Local only: exactly one sibling that ships a seed and is
 *                    not another checkout of this package. None, or several,
 *                    is a SKIP SAID OUT LOUD with the reason, because both
 *                    mean "nothing to run against".
 *
 * WHAT COMES BACK is the same shape for every subject: the files as a
 * finding prints them (repo-relative, forward slashes, sorted), the base
 * those paths hang off, `locate(path)` for the one file a check names by
 * hand, and `read(path)`, which returns null for a file that vanished between
 * the listing and the read and throws for every other failure — the rule
 * `read-listed.mjs` states, applied here so no check states it again. `where`
 * narrows `files` and nothing else: `locate` and `read` answer for any path
 * under the subject, so a check can walk a corner of the application and still
 * read the one file it names by hand. `seen` says whether the subject was
 * there; when it was not and the subject skips, the skip has already been
 * said and `files` holds what could still be swept — nothing for
 * `references` and `deployment-seed`, the root documents for `docs`, whose
 * folders are each a fact of their own.
 *
 * A SWEEP THAT FINDS NOTHING THROWS, whatever the subject, once the `where`
 * filter has run: an empty subject and a clean one print the same green line,
 * and the green one goes on being printed every run after. The refusal names
 * the subject and the root it swept so the message is the one a reader needs.
 * A subject that skips is the exception, and says so first.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
// By package name, not relative: a deployment enrols this module byte-identical
// and reaches the overlay rule through the package it installed, the same
// spelling `vite.config.ts` uses; here the name resolves by self-reference.
import { resolveOverlaid } from 'agentic-service-blueprinting/overlay'
import { repoConfig } from './repo-config.mjs'
import { chooseDeployment, packageName, resolveSeedFiles, siblingCandidates } from './seed-list.mjs'
import { unverified } from './unverified.mjs'

/** The package a deployment reads the application out of. */
export const APP_PACKAGE = 'agentic-service-blueprinting'

/** The subjects, in the order this header explains them. */
export const SUBJECTS = [
  'app',
  'docs',
  'scripts',
  'migrations',
  'references',
  'reference-docs',
  'deployment-seed',
]

/** Directory names no walk descends into. */
const NEVER_WALKED = new Set(['node_modules'])

/** `path`, spelled the way a finding prints it. */
const slashed = (path) => path.split(sep).join('/')

/**
 * Every file under `dir`, absolute, sorted; a path the listing named and the
 * tree no longer has is skipped, and every other failure throws — the
 * vanished-file rule, applied to the stat between listing and descent.
 */
function filesUnder(dir) {
  const found = []
  for (const entry of readdirSync(dir).sort()) {
    if (entry.startsWith('.') || NEVER_WALKED.has(entry)) continue
    const path = join(dir, entry)
    let stats
    try {
      stats = statSync(path)
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
    if (stats.isDirectory()) found.push(...filesUnder(path))
    else found.push(path)
  }
  return found
}

/**
 * The contents of an absolute path, or null if it is no longer there. Only
 * ENOENT is a vanishing; a permission, a directory where a file belongs, a
 * device error are facts about the tree and throw.
 */
function readOrNull(path, encoding = 'utf8') {
  try {
    return readFileSync(path, encoding)
  } catch (error) {
    if (error && error.code === 'ENOENT') return null
    throw error
  }
}

// ── app ────────────────────────────────────────────────────────────────────

/**
 * The application's layers under `root`, overlay first and the package last,
 * each present on disk: `[src, package]`, `[src]` or `[package]`. Empty when
 * there is no application anywhere.
 */
export function appLayers(root) {
  return [
    resolve(root, 'src'),
    resolve(root, 'node_modules', APP_PACKAGE, 'src'),
  ].filter((layer) => existsSync(layer))
}

/**
 * The directory a `src/…` path hangs off: the package's when the package is
 * installed — a resident is reported at the same `src/…` path as the file it
 * stands for — and this tree's otherwise.
 */
function appBase(root) {
  const packaged = resolve(root, 'node_modules', APP_PACKAGE, 'src')
  return existsSync(packaged) ? dirname(packaged) : resolve(root)
}

/**
 * `src/…` resolved through the overlay: the first layer that holds it, else
 * the package's path for it. With one layer there is nothing to overlay and
 * the answer is that layer's file.
 */
function locateAppFile(root, path) {
  const layers = appLayers(root)
  if (layers.length === 0) throw noApplication(root)
  const inside = path.replace(/^src\//, '')
  if (inside === path) throw new Error(`not an application path: ${path} does not start with src/`)
  if (layers.length === 1) return join(layers[0], inside)
  return resolveOverlaid(inside, layers).path
}

function noApplication(root) {
  return new Error(
    `no application source under ${root}: neither src nor ` +
      `node_modules/${APP_PACKAGE}/src exists`,
  )
}

/** The union of the layers' files, overlay winning, as `src/…` paths. */
function appFiles(root) {
  const layers = appLayers(root)
  if (layers.length === 0) throw noApplication(root)
  const seen = new Set()
  for (const layer of layers) {
    for (const file of filesUnder(layer)) seen.add(`src/${slashed(relative(layer, file))}`)
  }
  return [...seen].sort()
}

// ── docs ───────────────────────────────────────────────────────────────────

/** The one root document no sweep reads: a record of what shipped, dated. */
export const UNSWEPT_ROOT_DOCS = ['CHANGELOG.md']

function rootDocs(root) {
  return readdirSync(root)
    .filter((name) => /\.md$/.test(name) && !UNSWEPT_ROOT_DOCS.includes(name))
    .sort()
}

function docsFiles(root, io) {
  const dirs = repoConfig.sweptDirs
  const missing = dirs.filter((dir) => !existsSync(resolve(root, dir)))
  if (missing.length > 0) {
    unverified(
      `the prose under ${missing.join(', ')}`,
      `${missing.length === 1 ? 'that folder is' : 'those folders are'} named as swept and ` +
        `this tree does not have ${missing.length === 1 ? 'it' : 'them'}, so every prose guard ` +
        `ran over the ${dirs.length - missing.length} folder(s) that are here and the root ` +
        `documents. Correct the name, or remove it from the swept list.`,
      io,
    )
  }
  const under = dirs
    .map((dir) => resolve(root, dir))
    .filter((dir) => existsSync(dir))
    .flatMap((dir) => filesUnder(dir))
    .map((path) => slashed(relative(root, path)))
    .filter((path) => /\.md$/.test(path))
    .filter((path) => !repoConfig.datedRecords.some((dir) => path.startsWith(`${dir}/`)))
    .sort()
  return { files: [...rootDocs(root), ...under], seen: missing.length < dirs.length }
}

// ── scripts, migrations, references, reference-docs ────────────────────────

const SCRIPT_FILE = /\.(?:[cm]?js|[cm]?ts|py|sh)$/

function scriptsFiles(root) {
  const roots = [resolve(root, 'scripts')]
  const skills = resolve(root, 'skills')
  if (existsSync(skills)) {
    for (const skill of readdirSync(skills).sort()) {
      const dir = join(skills, skill, 'scripts')
      if (existsSync(dir)) roots.push(dir)
    }
  }
  if (!existsSync(roots[0])) throw new Error(`no scripts/ under ${root}: this tree has no scripts`)
  return roots
    .flatMap((dir) => filesUnder(dir))
    .map((path) => slashed(relative(root, path)))
    .filter((path) => SCRIPT_FILE.test(path))
    .sort()
}

function filesIn(root, dir, subject) {
  const absolute = resolve(root, dir)
  if (!existsSync(absolute)) throw new Error(`no ${dir} under ${root}: this tree has no ${subject}`)
  return filesUnder(absolute)
    .map((path) => slashed(relative(root, path)))
    .sort()
}

/**
 * The package's root: the installed package in a deployment, this tree here.
 * Decided by whether the package is installed, not by whether it ships the
 * folder asked for — an installed package with no `references/` is a failure
 * to report, not a reason to answer with the deployment's own documents as if
 * they were the package's.
 */
function packageBase(root) {
  const installed = resolve(root, 'node_modules', APP_PACKAGE)
  return existsSync(installed) ? installed : resolve(root)
}

// ── deployment-seed ────────────────────────────────────────────────────────

/**
 * The deployment's seed: the files its `[db.seed]` names, in load order, as
 * paths under the deployment's own root — or the one `supabase/seed.sql`
 * where it states no list. A list an entry of which is not there stops the
 * sweep, for the reason `seed-list.mjs` gives.
 */
function deploymentSeedFiles(root, io) {
  const chosen = chooseDeployment(siblingCandidates(root), packageName(root))
  if (chosen.skip) {
    unverified(
      "a deployment's seed against this template's portable core",
      `${chosen.skip}; check out a deployment beside this repository, or run the ` +
        'deployment seed check with --seed <path>.',
      io,
    )
    return { base: resolve(root), files: [], seen: false }
  }
  const files = resolveSeedFiles(join(chosen.dir, 'supabase', 'seed.sql')).map((file) =>
    slashed(relative(chosen.dir, file)),
  )
  return { base: chosen.dir, files, seen: true }
}

// ── the one entry point ────────────────────────────────────────────────────

/**
 * @typedef {{
 *   subject: string,
 *   base: string,
 *   files: string[],
 *   seen: boolean,
 *   locate: (path: string) => string,
 *   read: (path: string, encoding?: BufferEncoding) => string | null,
 * }} Sweep
 */

/**
 * The files for one subject.
 *
 * @param {{
 *   subject: 'app' | 'docs' | 'scripts' | 'migrations' | 'references' | 'reference-docs' | 'deployment-seed',
 *   root?: string,
 *   where?: (path: string) => boolean,
 *   what?: string,
 *   io?: Parameters<typeof unverified>[2],
 * }} options `root` is the repository the check runs in (the process's
 *   working directory by default — a check's own location says nothing about
 *   which tree it is checking); `where` narrows the files; `what` names what
 *   the caller is looking for, for the refusal; `io` is where a skip is said.
 * @returns {Sweep}
 */
export function sweep({ subject, root = process.cwd(), where = () => true, what, io } = {}) {
  if (!SUBJECTS.includes(subject)) {
    throw new Error(`not a subject: ${subject}; one of ${SUBJECTS.join(', ')}`)
  }
  const repo = resolve(root)
  let base = repo
  let files
  let seen = true
  let locate = (path) => join(base, path)

  switch (subject) {
    case 'app':
      base = appBase(repo)
      files = appFiles(repo)
      locate = (path) => locateAppFile(repo, path)
      break
    case 'docs':
      ;({ files, seen } = docsFiles(repo, io))
      break
    case 'scripts':
      files = scriptsFiles(repo)
      break
    case 'migrations':
      files = filesIn(repo, 'supabase/migrations', 'migrations').filter((path) => /\.sql$/.test(path))
      break
    case 'references':
      if (!existsSync(resolve(repo, 'references'))) {
        unverified(
          'the published reference surface',
          'this tree has no references/ folder, which a repository without a plugin ' +
            'surface does not; a check over it ran over nothing.',
          io,
        )
        files = []
        seen = false
      } else {
        files = filesIn(repo, 'references', 'references')
      }
      break
    case 'reference-docs':
      base = packageBase(repo)
      files = filesIn(base, 'references', 'reference documents').filter((path) => /\.md$/.test(path))
      break
    case 'deployment-seed':
      ;({ base, files, seen } = deploymentSeedFiles(repo, io))
      break
    default:
      throw new Error(`unreachable subject ${subject}`)
  }

  const kept = files.filter((path) => where(path))
  if (seen && kept.length === 0) {
    throw new Error(
      `no ${what ?? subject} under ${base}: this walk has no subject, which is a failure and ` +
        'not a pass',
    )
  }

  return {
    subject,
    base,
    files: kept,
    seen,
    locate,
    read: (path, encoding = 'utf8') => readOrNull(locate(path), encoding),
  }
}
