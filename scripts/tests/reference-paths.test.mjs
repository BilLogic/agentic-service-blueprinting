/**
 * The path-stability check, and the list it holds.
 *
 * The check itself is one `existsSync` per line, so what is worth testing is
 * the list and the failure: that every imported path is really there right
 * now, that a moved file is reported by name rather than counted, and that
 * the list cannot quietly acquire a path outside the interface it guards.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CONSUMER_IMPORTS,
  absences,
  trackedPaths,
} from '../check-reference-paths.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

test('every path the deployment imports exists and is tracked', () => {
  const tracked = new Set(trackedPaths())
  assert.deepEqual(
    absences(CONSUMER_IMPORTS, tracked, (path) => existsSync(join(ROOT, path))),
    [],
  )
})

test('the list is eighteen references and four skill bodies', () => {
  const skills = CONSUMER_IMPORTS.filter((path) => path.endsWith('/SKILL.md'))
  assert.equal(skills.length, 4)
  assert.equal(CONSUMER_IMPORTS.length - skills.length, 18)
  assert.equal(new Set(CONSUMER_IMPORTS).size, CONSUMER_IMPORTS.length)
})

test('a moved reference is named, not counted', () => {
  const tracked = new Set(['references/data-model.md'])
  const found = absences(
    ['references/data-model.md'],
    tracked,
    () => false,
  )
  assert.deepEqual(found, [
    { path: 'references/data-model.md', reason: 'no file at this path' },
  ])
})

test('a file present but untracked would not ship in a git install', () => {
  const found = absences(['references/data-model.md'], new Set(), () => true)
  assert.equal(found.length, 1)
  assert.match(found[0].reason, /untracked/)
})

test('a path outside references/ or skills/ is refused', () => {
  const found = absences(['src/lib/agent/skills.ts'], new Set(), () => true)
  assert.deepEqual(found, [
    { path: 'src/lib/agent/skills.ts', reason: 'not under references/ or skills/' },
  ])
})
