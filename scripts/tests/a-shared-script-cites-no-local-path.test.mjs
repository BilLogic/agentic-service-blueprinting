/**
 * A SCRIPT THIS PACKAGE PUBLISHES NAMES NO DOCUMENT ITS READER LACKS.
 *
 * `src/citations.test.ts` holds the same rule over the whole of `src/`,
 * because every file there is shared — a deployment reads the application out
 * of this package and the question of which files it holds does not arise.
 * `scripts/` is the one tree where that is false. A deployment keeps its own
 * scripts, most of them nothing like these, and shares the handful where both
 * repositories run the same check. So the subject is NAMED here rather than
 * walked for, and each name carries the reason it is shared.
 *
 * These six were measured byte-identical to a deployment's copies and refused
 * enrolment anyway, every one of them for a `docs/` path. Two of those paths
 * were already wrong: one sent a deployment's maintainer to a connector
 * document and an npm alias that repository does not have, and the generator
 * wrote its ratchet baseline to a path only one tree ever had. Nobody had met
 * either yet, which is the whole argument for a fence rather than a sweep.
 *
 * `citations.ts` carries the rule this reads. The short version is that a
 * `docs/` path is a defect when it reaches a reader standing in their own
 * repository as a dangling reference — so a tree both repositories have is
 * named in words, a value about the running repository's own tree comes from
 * `repo-config.mjs`, and a fixture is spelled so it cannot be mistaken for
 * either.
 *
 * THE LIST IS NAMED, AND CLOSED UNDER IMPORT. Naming the subject is what lets
 * each entry carry the reason it is shared, which is a judgement no walk can
 * make. But a named list of six fenced six files and not the modules those
 * six are built out of, and that is how `agent-account.mjs` — every line of
 * the generator's logic, reached by a relative import from a file on the list
 * — kept a message naming a document only one repository has, for a release,
 * behind a green guard. A relative import is not a judgement call: a
 * deployment that holds the importer byte-identical cannot run it without
 * holding what it imports. So the last test below walks the imports and
 * refuses a module that is on neither list.
 *
 * `repo-config.mjs` is the one import that is deliberately NOT shared, and it
 * is the reason the closure needs two lists rather than one. It is the seam:
 * every field in it is a fact about the running repository, which is exactly
 * why a shared script reaches for it instead of spelling the value.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'

import { DOCUMENT_PATH } from '@/citations.ts'

const ROOT = resolve(new URL('../..', import.meta.url).pathname)

/**
 * The scripts this package publishes for a deployment to hold byte-identical,
 * and why each one is shared. A file here is read by people in two
 * repositories, so it cites no identity local to either.
 */
export const SHARED_SCRIPTS = new Map([
  [
    'scripts/agent-account.mjs',
    'the generator’s whole logic, and the failures it words for a reader in either tree',
  ],
  [
    'scripts/always-loaded.mjs',
    'one list of what a session is handed before it decides anything, read by three checks',
  ],
  ['scripts/app-source.mjs', 'where the application is, answered once for every walk in either tree'],
  ['scripts/check-glossary-only.mjs', 'every repository holds its own glossary to one shape'],
  ['scripts/check-negation-ratchet.mjs', 'the ratchet is the mechanism; the count is repo-local'],
  ['scripts/check-pointers.mjs', 'a pointer either resolves or it does not, wherever the router lives'],
  ['scripts/check-router-budget.mjs', 'the budget is the mechanism; what is spent against it is repo-local'],
  [
    'scripts/check-target-schema.mjs',
    'asking a live target whether it was migrated is the same question everywhere',
  ],
  ['scripts/generate-agent-account.mjs', 'one generator, each repository’s own document and baseline'],
  ['scripts/swept-docs.mjs', 'one list of swept prose, read by every sweep in both repositories'],
  [
    'scripts/tests/the-router-is-a-router.test.mjs',
    'the router’s three checks, proven the same way on both sides',
  ],
])

/**
 * The prose lines of `text` — comments only, the way `proseLines` reads a
 * source file — is deliberately NOT what this uses. The gate a deployment
 * runs is line-based over bytes and cannot parse this language, so the
 * subject here is every line, exactly as that gate sees it. A guard that read
 * less than the gate would pass files the gate then refuses, which is the
 * failure it exists to prevent.
 */
function citedPaths(text) {
  return text
    .split('\n')
    .flatMap((line, index) => {
      const match = DOCUMENT_PATH.exec(line)
      return match ? [`${index + 1}: ${match[0]}`] : []
    })
}

test('a published shared script names no document an adopter does not have', () => {
  const offenders = []
  for (const path of SHARED_SCRIPTS.keys()) {
    for (const finding of citedPaths(readFileSync(join(ROOT, path), 'utf8'))) {
      offenders.push(`${path}:${finding}`)
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'A deployment holds these byte-identical and reads them in its own tree, where a docs/ ' +
      'path resolves to something else or to nothing. Name the document by its subject, put ' +
      'the value in scripts/repo-config.mjs, or — if it is a fixture — spell it so it cannot ' +
      `be read as an address:\n${offenders.join('\n')}`,
  )
})

/**
 * The modules a shared script may import that this package does NOT publish
 * for a deployment to hold byte-identical, and why each is the exception.
 */
export const REPO_LOCAL_IMPORTS = new Map([
  [
    'scripts/repo-config.mjs',
    'the seam itself — every field is a fact about the running repository, which is why a shared script reaches for it rather than spelling the value',
  ],
])

/**
 * The paths a module imports relatively, resolved against the repository root.
 *
 * Only relative specifiers: a bare one is a package, and a package arrives
 * the same way in either tree. The match is deliberately textual, because the
 * subject is what the file SAYS rather than what a bundler would resolve — a
 * specifier no scanner can see is one no reader can follow either.
 */
function relativeImports(path, text) {
  const here = dirname(path)
  return [...text.matchAll(/\bfrom\s+'(\.[^']*)'/g)].map((match) =>
    join(here, match[1]).split(sep).join('/'),
  )
}

test('every published shared script exists, and says why it is shared', () => {
  // Both directions of the same claim. A renamed script leaves an entry that
  // reads as a fence and guards nothing; an entry with no reason is a list
  // somebody has to reconstruct before they can add to it.
  for (const [path, reason] of SHARED_SCRIPTS) {
    assert.ok(readFileSync(join(ROOT, path), 'utf8').length > 0, `${path} is listed and empty`)
    assert.ok(reason.length > 20, `${path} is listed with no reason worth reading`)
  }
})

test('the guard reads what the deployment’s gate reads, not only the comments', () => {
  // The two wrong citations that prompted this both sat in comments, but the
  // generator's baseline path was a string literal in ordinary code — and a
  // byte-identity gate reads that line too. Driving the guard from a subject
  // that violates it in each position is the only way to know it does.
  assert.deepEqual(citedPaths(' * See docs/connectors/supabase/database.md § Did it run.'), [
    '1: docs/connectors/supabase/database.md',
  ])
  assert.deepEqual(citedPaths("const B = resolve(ROOT, 'docs/reference/baseline.json')"), [
    '1: docs/reference/baseline.json',
  ])
  // And the shapes that are not addresses stay out, so the fence is one a
  // contributor can live behind.
  assert.deepEqual(citedPaths("import doc from './docs/blueprint.md?raw'"), [])
  assert.deepEqual(citedPaths(' * the decision records are append-only'), [])
})

test('the list is closed under import — a shared script imports nothing unclassified', () => {
  // The gap this closes: `generate-agent-account.mjs` was fenced and every
  // line it runs lived in `agent-account.mjs`, which was not. A relative
  // import is not a judgement call — a deployment holding the importer
  // byte-identical cannot run it without holding what it imports — so the
  // walk decides the subject and the two lists decide only the reason.
  const unclassified = []
  for (const path of SHARED_SCRIPTS.keys()) {
    for (const imported of relativeImports(path, readFileSync(join(ROOT, path), 'utf8'))) {
      if (SHARED_SCRIPTS.has(imported) || REPO_LOCAL_IMPORTS.has(imported)) continue
      unclassified.push(`${path} imports ${imported}`)
    }
  }
  assert.deepEqual(
    unclassified,
    [],
    'A module reached by a relative import from a shared script travels with it. Add it to ' +
      'SHARED_SCRIPTS with the reason it is shared — and hold it to the same rule — or, if it ' +
      `is repo-local like the config, to REPO_LOCAL_IMPORTS with the reason:\n${unclassified.join('\n')}`,
  )
})

test('both lists name a file that is there, and every reason is one worth reading', () => {
  for (const [path, reason] of REPO_LOCAL_IMPORTS) {
    assert.ok(readFileSync(join(ROOT, path), 'utf8').length > 0, `${path} is listed and empty`)
    assert.ok(reason.length > 20, `${path} is listed with no reason worth reading`)
  }
})
