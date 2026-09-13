/**
 * A folder the sweep is told to read, and the repository does not have, sweeps
 * as empty.
 *
 * The swept folders are each repository's own (`scripts/repo-config.mjs`), and
 * a repository without a plugin surface has `docs/` and no `references/`,
 * `skills/` or `agents/`. A sweep that threw on the first missing folder would
 * take down every guard that reads prose, over a fact about the tree rather
 * than a defect in it.
 *
 * The folder list is passed explicitly rather than read from the config, so
 * the case holds the same in every repository whatever its own list says.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { ROOT_DOCS, sweptDocs } from '../swept-docs.mjs'

/** A throwaway tree holding exactly the files named. */
function tree(files) {
  const root = mkdtempSync(join(tmpdir(), 'swept-'))
  for (const rel of files) {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), '# doc\n')
  }
  return { root, done: () => rmSync(root, { recursive: true, force: true }) }
}

const PLUGIN_DIRS = ['docs', 'references', 'skills', 'agents']

/**
 * A sink that keeps the announcement out of this run's annotations.
 *
 * Each tree below is deliberately missing folders, so each sweep of one has
 * something true to announce — and an annotation raised by a fixture is an
 * annotation a reader has to learn to ignore. `a-skip-is-said-out-loud.test.mjs`
 * is where the announcement itself is asserted.
 */
const QUIET = { env: {}, write: () => {}, append: () => {} }

test('a tree with docs/ and no plugin surface sweeps its docs and nothing else', () => {
  const t = tree([...ROOT_DOCS, 'docs/guide.md', 'docs/engineering/checks.md', 'docs/adr/0001-a.md'])
  try {
    assert.deepEqual(sweptDocs(t.root, PLUGIN_DIRS, QUIET), [
      ...ROOT_DOCS,
      'docs/engineering/checks.md',
      'docs/guide.md',
    ])
  } finally {
    t.done()
  }
})

test('a tree with none of the swept folders sweeps its root docs alone', () => {
  const t = tree(ROOT_DOCS)
  try {
    assert.deepEqual(sweptDocs(t.root, PLUGIN_DIRS, QUIET), ROOT_DOCS)
  } finally {
    t.done()
  }
})

test('a folder that exists is still swept beside one that does not', () => {
  const t = tree([...ROOT_DOCS, 'skills/map/SKILL.md'])
  try {
    assert.deepEqual(sweptDocs(t.root, PLUGIN_DIRS, QUIET), [...ROOT_DOCS, 'skills/map/SKILL.md'])
  } finally {
    t.done()
  }
})
