#!/usr/bin/env node
/**
 * The build and the checks look for the application in the same two places.
 *
 * Where the application lives is one fact, and four files state it: the Vite
 * config for the bundler, the two tsconfigs for the compiler, and
 * `scripts/app-source.mjs` for every check that walks the tree. None of them
 * can be derived from the others — a compiler cannot import a module, and the
 * config is bundled on its own in a tree that may not have this module at all
 * — so what makes them one fact is this test, the way the rename map's two
 * lists and the authoring log's two halves are held.
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
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'
import { resolveConfig } from 'vite'

import { APP_SOURCE_ROOTS, appSourceRoot } from '../app-source.mjs'

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
