/**
 * THE VENDORED RULEBOOK HOLDS THE COPIES AND NOTHING ELSE.
 *
 * `sync-canvas-skills.mjs` names every source and where its copy goes, and it
 * used to compare in one direction only: source to target. A file in the
 * vendored tree that no entry names was compared against nothing, and the
 * check reported a match.
 *
 * That matters more than a stray file usually would, because two prose sweeps
 * are fenced on the claim it makes. `check-standalone.mjs` and
 * `check-content-coupling.mjs` both exclude the vendored tree by name, each on
 * the ground that the sync holds it identical to a source those sweeps already
 * read. An orphan there was therefore read by nothing at all: not by the sync,
 * and not by either sweep that skipped it on the sync's word.
 *
 * So the walk goes both ways, and this drives it. The tree is staged rather
 * than described: the script resolves its own root from where it sits, so a
 * copy of it beside copies of the four trees it touches is the only way to
 * plant a file in the vendored copy without planting one in this repository.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(new URL('../..', import.meta.url).pathname)

/** The four trees the sync reads or writes, copied into a throwaway root. */
const STAGED = [
  'scripts/sync-canvas-skills.mjs',
  'references',
  'skills',
  'src/lib/agent/skill',
]

function stage() {
  const root = mkdtempSync(join(tmpdir(), 'vendored-'))
  for (const path of STAGED) {
    const to = join(root, path)
    mkdirSync(dirname(to), { recursive: true })
    cpSync(join(ROOT, path), to, { recursive: true })
  }
  return { root, done: () => rmSync(root, { recursive: true, force: true }) }
}

/** The sync, run in a staged root. `{ status, output }`, never throwing. */
function run(root, ...args) {
  try {
    const output = execFileSync('node', [join(root, 'scripts/sync-canvas-skills.mjs'), ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { status: 0, output }
  } catch (error) {
    return { status: error.status, output: `${error.stdout ?? ''}${error.stderr ?? ''}` }
  }
}

test('a staged copy of this repository’s trees is in step with itself', () => {
  const t = stage()
  try {
    const { status, output } = run(t.root, '--check')
    assert.equal(status, 0, output)
  } finally {
    t.done()
  }
})

test('a file in the vendored tree that no source produced is drift', () => {
  const t = stage()
  try {
    writeFileSync(join(t.root, 'src/lib/agent/skill/references/orphan.md'), '# not a copy\n')
    const { status, output } = run(t.root, '--check')
    assert.equal(status, 1, output)
    assert.match(output, /orphan: src\/lib\/agent\/skill\/references\/orphan\.md/)
  } finally {
    t.done()
  }
})

test('the same holds under the skills half of the copy', () => {
  const t = stage()
  try {
    writeFileSync(join(t.root, 'src/lib/agent/skill/skills/invented.md'), '# not a copy\n')
    const { status, output } = run(t.root, '--check')
    assert.equal(status, 1, output)
    assert.match(output, /orphan: src\/lib\/agent\/skill\/skills\/invented\.md/)
  } finally {
    t.done()
  }
})

test('copying, not only checking, refuses a source that is not there', () => {
  // The copying run counted a missing source as drift and then printed `done`
  // and exited 0, which is the same sentence a clean run prints.
  const t = stage()
  try {
    rmSync(join(t.root, 'references/lane-roles.md'))
    const { status, output } = run(t.root)
    assert.equal(status, 1, output)
    assert.match(output, /missing source: references\/lane-roles\.md/)
    assert.doesNotMatch(output, /^done$/m)
  } finally {
    t.done()
  }
})
