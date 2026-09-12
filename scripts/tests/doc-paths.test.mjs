/**
 * The path sweep refuses a subject a FILTER emptied, not only one a listing
 * did.
 *
 * `trackedPaths` already refused an empty `git ls-files`, and that reads like
 * the whole guard until you follow what the loop actually sweeps: the listing
 * goes through `surfaceDocs`, and a filter that matches nothing empties the
 * subject exactly as completely as a listing that came back empty. The loop
 * runs zero times, no claim in any document is resolved, and the report says
 * `every path named by 0 plugin-surface documents resolves` — a sentence that
 * is true, green, and about nothing. One renamed folder does it.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { join, resolve } from 'node:path'

import { surfaceDocs, trackedPaths } from '../check-doc-paths.mjs'

const ROOT = resolve(new URL('../..', import.meta.url).pathname)

test('a listing with no plugin-surface document in it is refused', () => {
  assert.throws(
    () => surfaceDocs(['README.md', 'src/main.tsx', 'docs/guide/01-the-blueprint-model.md']),
    /no markdown under .*: this check has no subject/,
  )
})

test('the refusal names the folders it looked under', () => {
  assert.throws(() => surfaceDocs([]), /skills\/, references\/, agents\/, hooks\//)
})

test('a listing that does carry the surface comes back, and only the markdown', () => {
  assert.deepEqual(
    surfaceDocs(['README.md', 'references/data-model.md', 'skills/map/SKILL.md', 'hooks/guard.py']),
    ['references/data-model.md', 'skills/map/SKILL.md'],
  )
})

test('this repository has a subject, and the script names what it swept', () => {
  assert.ok(surfaceDocs(trackedPaths()).length > 20)
  const run = spawnSync(process.execPath, [join(ROOT, 'scripts', 'check-doc-paths.mjs')], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  assert.equal(run.status, 0, `${run.stdout}${run.stderr}`)
  assert.match(run.stdout, /every path named by \d+ plugin-surface documents resolves/)
})
