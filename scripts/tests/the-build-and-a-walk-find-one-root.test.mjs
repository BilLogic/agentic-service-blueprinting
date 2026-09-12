#!/usr/bin/env node
/**
 * The build and the checks look for the application in the same two places.
 *
 * Where the application lives is one fact, and more than one file states it:
 * the Vite config for the bundler, the two tsconfigs for the compiler,
 * `scripts/app-source.mjs` for every check that walks the tree, and any script
 * that has to resolve one application file before `app-source.mjs` could be
 * asked. None of them can be derived from the others — a compiler cannot
 * import a module, and the config is bundled on its own in a tree that may not
 * have this module at all — so what makes them one fact is this test, the way
 * the rename map's two lists and the authoring log's two halves are held.
 *
 * THE SUBJECT IS DISCOVERED, NOT LISTED. This test named four files and a
 * fifth was written without it: `agent-account.mjs` states the pair for the
 * two files it reads, correct on the day it was written and held by nothing
 * after. A test that names its subject cannot notice a subject it was not
 * told about, which is the one failure this test exists to prevent. So the
 * statements are swept for, and the four that MUST be there are asserted to be
 * among what came back rather than being the whole of it.
 *
 * WHAT GOES WRONG WHEN THEY DISAGREE is not a build failure. A deployment that
 * reads the application out of the package resolves `@/…` into
 * `node_modules`, and a check still starting at `src` there walks a directory
 * that is not present: it sweeps nothing, finds nothing, and passes. Every
 * run after that reports success without looking at anything, which is the one
 * failure a check cannot report itself.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import ts from 'typescript'
import { resolveConfig } from 'vite'

import { APP_SOURCE_ROOTS, appSourceRoot } from '../app-source.mjs'
import { statementsOfTheRoots } from '../roots-stated.mjs'

const REPO_ROOT = process.cwd()

/** The TypeScript configs that map `@/…`, and the one that only an editor reads. */
const TSCONFIGS = ['tsconfig.json', 'tsconfig.app.json']

/** `paths['@/*']` as the file writes it, comments and all. */
function appPaths(file) {
  const read = ts.readConfigFile(resolve(REPO_ROOT, file), ts.sys.readFile)
  assert.equal(read.error, undefined, `${file} does not parse`)
  return read.config.compilerOptions.paths['@/*']
}

test('every tsconfig maps the alias to the same roots, in the same order', () => {
  // Order is the rule: the first root that exists wins, so a pair in the other
  // order is a different answer on a tree that has both.
  const expected = APP_SOURCE_ROOTS.map((root) => `./${root}/*`)
  for (const file of TSCONFIGS) {
    assert.deepEqual(appPaths(file), expected, `${file} names other roots`)
  }
})

test('the build config names the same roots', () => {
  // Read as text rather than resolved, because resolving only ever yields the
  // root that exists HERE — and the root that does not exist here is the whole
  // point of the pair.
  const config = readFileSync(resolve(REPO_ROOT, 'vite.config.ts'), 'utf8')
  for (const root of APP_SOURCE_ROOTS) {
    assert.ok(
      config.includes(`'./${root}'`),
      `vite.config.ts does not name ./${root}, so the build and the checks ` +
        `are looking in different places`,
    )
  }
})

test('the alias the build resolves is the root a walk starts at', async () => {
  // The pair, executed: whatever the two lists say, these are the directories
  // this tree actually hands the bundler and a check.
  const config = await resolveConfig(
    { configFile: resolve(REPO_ROOT, 'vite.config.ts') },
    'serve',
  )
  const alias = config.resolve.alias.find((entry) => entry.find === '@')
  assert.equal(alias.replacement, appSourceRoot(REPO_ROOT))
})

/**
 * The files that cannot be absent from the sweep, whatever else it finds.
 *
 * Not the subject — the subject is whatever states the pair — but the proof
 * that the sweep RAN. A discovery that reads no file and finds no disagreement
 * agrees with a tree in which every statement is correct, and goes on agreeing
 * after the regex stops matching anything.
 */
const MUST_STATE_THE_PAIR = [
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.app.json',
  'scripts/app-source.mjs',
]

test('every statement of the pair is discovered, and the sweep found the build', () => {
  const statements = statementsOfTheRoots(REPO_ROOT)
  assert.ok(
    statements.length > 0,
    'no file in this tree states where the application is, which is not a ' +
      'tree this test can be run in',
  )
  const files = new Set(statements.map((statement) => statement.file))
  for (const file of MUST_STATE_THE_PAIR) {
    assert.ok(
      files.has(file),
      `${file} states the roots and this sweep did not find it, so the sweep ` +
        `is not reading what it is supposed to read`,
    )
  }
})

test('every statement names this repository\'s root first', () => {
  // The order is the rule: the first root that exists wins, so a file naming
  // the package's root without naming its own before it is a file that answers
  // differently from the build on a tree that has both.
  const wrong = statementsOfTheRoots(REPO_ROOT)
    .filter((statement) => !statement.ordered)
    .map((statement) => `${statement.file}: ${statement.packaged} without ${statement.repository}`)
  assert.deepEqual(
    wrong,
    [],
    `a statement of where the application is names the package's root and not ` +
      `this repository's, or names them in the other order:\n${wrong.join('\n')}`,
  )
})

test('a sixth statement that names only the package is reported', () => {
  // What the listed subject could not see. The file is new, the pair is wrong
  // in it, and nothing had to be added here for the sweep to say so.
  const root = mkdtempSync(join(tmpdir(), 'roots-'))
  try {
    mkdirSync(join(root, 'scripts'))
    writeFileSync(
      join(root, 'scripts', 'a-sixth-statement.mjs'),
      "export const WHERE = 'node_modules/agentic-service-blueprinting/src/lib/x.ts'\n",
    )
    const found = statementsOfTheRoots(root)
    assert.deepEqual(
      found.map((statement) => [statement.file, statement.repository, statement.ordered]),
      [['scripts/a-sixth-statement.mjs', 'src/lib/x.ts', false]],
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
