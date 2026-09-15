/**
 * A CHECK IS A JUDGEMENT AND A ONE-LINE SHELL, AND STAYS THAT WAY.
 *
 * The epilogue every check used to carry — a guard deciding whether it was the
 * command, a rule about what an empty subject means, a summary line, an exit —
 * is `verdict.mjs` now. Nothing stops the next check from growing its own copy
 * back, and the copies were invisible precisely because each was read beside
 * its own check rather than beside the others. So the shape is swept for here,
 * over the `scripts` subject rather than a list, and a check added tomorrow is
 * swept tomorrow.
 *
 * WHAT IS ASSERTED IS THE SHAPE, NOT THE WORDING. A check may still print on
 * its own account — a usage error, a census that belongs ahead of the
 * judgement, an advisory report — and this says nothing about those. What it
 * refuses is the three things the module owns: taking the exit rather than
 * setting it, deciding for itself whether it is the command, and ending in
 * anything other than the one call.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { sweep } from '../sweep.mjs'

const ROOT = new URL('../..', import.meta.url).pathname

/** Every check script this repository ships, out of the `scripts` subject. */
const CHECKS = sweep({
  subject: 'scripts',
  root: ROOT,
  where: (path) => /^scripts\/check-[^/]+\.mjs$/.test(path),
  what: 'check script',
}).files

const sourceOf = (path) => readFileSync(join(ROOT, path), 'utf8')

test('there are check scripts to sweep', () => {
  // The refusal the whole set is about, applied to this suite: a filter that
  // matched nothing would make every assertion below vacuously true.
  assert.ok(CHECKS.length > 20, `only ${CHECKS.length} check scripts found`)
})

test('no check takes the exit — it is set, so the process finishes speaking', () => {
  // `process.exit` abandons whatever the runtime has buffered. Seventeen checks
  // called it and seven did not, and the long reports are exactly the ones that
  // could lose their last lines.
  const offenders = CHECKS.filter((path) => /process\.exit\s*\(/.test(sourceOf(path)))
  assert.deepEqual(
    offenders,
    [],
    'a check calls process.exit. Return a judgement and let verdict.mjs set the code; ' +
      'an exit code the module has no words for is set with process.exitCode and a return.',
  )
})

test('no check decides for itself whether it is the command', () => {
  // The idiom compares resolved PATHS, because a hand-built `file://` held
  // against import.meta.url no-ops under a directory with a space in its name.
  // Thirteen headers said so and no two said it the same way; `isTheCommand`
  // says it once.
  const offenders = CHECKS.filter((path) => /process\.argv\[1\]/.test(sourceOf(path)))
  assert.deepEqual(
    offenders,
    [],
    'a check carries its own is-main guard. The guard is whenRun(import.meta.url, judge).',
  )
})

test('every check ends in the one shell, over a judgement a test can reach', () => {
  const wrong = []
  for (const path of CHECKS) {
    const source = sourceOf(path)
    const last = source.trimEnd().split('\n').at(-1)
    if (last !== 'whenRun(import.meta.url, judge)') wrong.push(`${path} ends: ${last}`)
    if (!/export (async )?function judge\b/.test(source)) {
      wrong.push(`${path} exports no judge`)
    }
  }
  assert.deepEqual(
    wrong,
    [],
    'A check is a judgement and a shell. The judgement is exported so a test can hand it a ' +
      'tree and read the findings back without starting a process, and the shell is one line.',
  )
})
