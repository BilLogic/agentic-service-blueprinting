/**
 * The three checks that keep `AGENTS.md` a router, each proven by a router that
 * breaks it (#139).
 *
 * A guard seen only passing is not evidence: the committed router passes today,
 * and it would pass just as quietly if the check had stopped looking. So every
 * rule here is driven from a subject that violates it — a padded tier, an added
 * prohibition, a dead pointer, a buried trigger, an item that names nothing —
 * and the committed router is asserted last, as one case among several rather
 * than as the whole suite.
 *
 * The pointer sweep is exercised against throwaway repositories, because its
 * rules are about a document's structure and a temporary tree can hold a broken
 * one without the repository having to. The budget and the ratchet are
 * exercised through their pure `verdict` functions, so a failing branch can be
 * asserted without a prohibition or a padded file ever being written into the
 * real router.
 *
 * Same suite as the deployment's `the-router-is-a-router.test.mjs`, plus the
 * two cases for what differs here: a Python pointer is swept, and the exempt
 * section is § Rules that hold for every skill.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { BUDGET, SLACK, measure as measureChars, verdict as budgetVerdict } from '../check-router-budget.mjs'
import {
  RECORDED,
  countProhibitions,
  measure as measureBans,
  verdict as negationVerdict,
} from '../check-negation-ratchet.mjs'
import { EXEMPT_SECTION, itemsIn, leadingWord, pointersIn, sweep } from '../check-pointers.mjs'

const ROOT = resolve(new URL('../..', import.meta.url).pathname)

function run(script) {
  const result = spawnSync(process.execPath, [join(ROOT, 'scripts', script)], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  return { code: result.status, out: `${result.stdout}${result.stderr}` }
}

/** A throwaway repo: a router plus whatever files the test says exist. */
function repo(router, files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'router-'))
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), body)
  }
  writeFileSync(join(root, 'AGENTS.md'), router)
  return { root, done: () => rmSync(root, { recursive: true, force: true }) }
}

/* ------------------------------------------------------------- the budget */

test('the committed always-loaded tier is under its budget', () => {
  const { code, out } = run('check-router-budget.mjs')
  assert.equal(code, 0, out)
})

test('a tier over budget fails, and the failure says by how much', () => {
  const { failures } = budgetVerdict({
    counted: [{ file: 'AGENTS.md', chars: BUDGET + 42 }],
    total: BUDGET + 42,
  })
  assert.equal(failures.length, 1)
  assert.match(failures[0], /over budget/)
  assert.match(failures[0], /42 over/)
})

test('a tier far under budget fails too, asking for the budget to be lowered', () => {
  const total = BUDGET - SLACK - 1
  const { failures } = budgetVerdict({ counted: [{ file: 'AGENTS.md', chars: total }], total })
  assert.equal(failures.length, 1, 'a budget that no longer describes the file is a stale budget')
  assert.match(failures[0], /lower BUDGET/)
})

test('the pass line names every file it counted', () => {
  const { line } = budgetVerdict(measureChars())
  assert.match(line, /AGENTS\.md/)
  assert.match(line, /to spare/)
})

/* ---------------------------------------------------------- the ratchet */

test('the committed tier scores exactly its recorded prohibition count', () => {
  const { code, out } = run('check-negation-ratchet.mjs')
  assert.equal(code, 0, out)
  assert.equal(measureBans().total, RECORDED.tokens)
})

test('a prohibition added to the tier fails, and the failure names the file', () => {
  const { failures } = negationVerdict({
    files: 1,
    counts: { 'AGENTS.md': RECORDED.tokens + 1 },
    total: RECORDED.tokens + 1,
  })
  assert.equal(failures.length, 1)
  assert.match(failures[0], new RegExp(`rose ${RECORDED.tokens} -> ${RECORDED.tokens + 1}`))
  assert.match(failures[0], /AGENTS\.md/)
})

test('a tier that lost a file fails rather than reporting a smaller, greener number', () => {
  const { failures } = negationVerdict({ files: 0, counts: {}, total: 0 })
  assert.equal(failures.length, 1)
  assert.match(failures[0], /shrank/)
})

test('a fall passes, with the new number to record', () => {
  const { failures, line } = negationVerdict({ files: 1, counts: {}, total: 0 })
  assert.deepEqual(failures, [])
  assert.match(line, /Down \d+: lower RECORDED\.tokens to 0\./)
})

test('quoted speech and code spans are not prohibitions', () => {
  assert.equal(countProhibitions('Never widen a grant.'), 1)
  assert.equal(countProhibitions('Say "I don\'t know" rather than guessing.'), 0)
  assert.equal(countProhibitions('The column `never_null` is set.'), 0)
})

/* ----------------------------------------------------------- the sweep */

test('a pointer to a file that exists resolves', () => {
  const r = repo('## Routes\n\n- **Vocabulary** — load `docs/a.md` first.\n', { 'docs/a.md': '# A' })
  try {
    assert.deepEqual(sweep(r.root).failures, [])
  } finally {
    r.done()
  }
})

test('a pointer to a missing file fails, and names it', () => {
  const r = repo('## Routes\n\n- **Vocabulary** — load `docs/gone.md` first.\n', { 'docs/here.md': '# H' })
  try {
    const { failures } = sweep(r.root)
    assert.equal(failures.length, 1)
    assert.match(failures[0], /docs\/gone\.md/)
    assert.match(failures[0], /does not resolve/)
  } finally {
    r.done()
  }
})

test('a section pointer checks the heading, case-insensitively', () => {
  const r = repo('## Routes\n\n- **Imports** read `docs/t.md` § Validating an import.\n', {
    'docs/t.md': '# T\n\n## Validating An Import\n',
  })
  try {
    assert.deepEqual(sweep(r.root).failures, [])
  } finally {
    r.done()
  }
})

test('a section pointer to a renamed heading fails', () => {
  const r = repo('## Routes\n\n- **Imports** read `docs/t.md` § Imports.\n', {
    'docs/t.md': '# T\n\n## Exports\n',
  })
  try {
    const { failures } = sweep(r.root)
    assert.equal(failures.length, 1)
    assert.match(failures[0], /§ Imports/)
  } finally {
    r.done()
  }
})

test('a routing item that leads with filler fails, and names the word', () => {
  const router =
    '## Skill routing\n\n| Trigger | Load |\n|---|---|\n| Any task that writes | `docs/a.md` |\n| Writes of any kind | `docs/a.md` |\n'
  const r = repo(router, { 'docs/a.md': '' })
  try {
    const { failures, triggers } = sweep(r.root)
    assert.equal(triggers, 2, 'the header and separator rows are the table frame, not items')
    assert.equal(failures.length, 1)
    assert.match(failures[0], /"Any task that writes" leads with "any"/)
  } finally {
    r.done()
  }
})

test('a routing item carrying no pointer fails — a body in the router', () => {
  const r = repo('## Routes\n\n- Scenario, path, phase, step, cell, lane, dependency, need.\n', {
    'docs/a.md': '',
  })
  try {
    const { failures } = sweep(r.root)
    assert.equal(failures.length, 1)
    assert.match(failures[0], /carries no pointer/)
  } finally {
    r.done()
  }
})

test('a rule that holds for every skill is exempt from the trigger rules, and its pointer still has to resolve', () => {
  const bare = repo(
    `## ${EXEMPT_SECTION}\n\n- Secrets live in a gitignored .env and nowhere else.\n`,
  )
  try {
    assert.deepEqual(sweep(bare.root).failures, [], 'a rule needs no pointer and no trigger word')
  } finally {
    bare.done()
  }
  const dead = repo(
    `## ${EXEMPT_SECTION}\n\n- Secrets: see \`docs/gone.md\` § Secrets.\n`,
    { 'docs/here.md': '' },
  )
  try {
    const { failures } = sweep(dead.root)
    assert.equal(failures.length, 1)
    assert.match(failures[0], /docs\/gone\.md/)
  } finally {
    dead.done()
  }
})

test('a Python pointer is swept — the validator and the secret hook are not prose', () => {
  const live = repo('## Routes\n\n- **Validation** is `scripts/validate_ir.py` exit 0.\n', {
    'scripts/validate_ir.py': '',
  })
  try {
    assert.deepEqual(sweep(live.root).failures, [])
  } finally {
    live.done()
  }
  const dead = repo('## Routes\n\n- **Validation** is `scripts/validate_ir.py` exit 0.\n', {
    'scripts/other.py': '',
  })
  try {
    const { failures } = sweep(dead.root)
    assert.equal(failures.length, 1)
    assert.match(failures[0], /validate_ir\.py/)
  } finally {
    dead.done()
  }
})

test('a bare filename names a shape, not a place, and is skipped', () => {
  const r = repo('x', { 'docs/x.md': '' })
  try {
    assert.deepEqual(pointersIn("a skill's own `SKILL.md` is the contract", r.root), [])
  } finally {
    r.done()
  }
})

test('a directory pointer resolves against the directory', () => {
  const r = repo('## Routes\n\n- **Workspaces** carry their own `references/`.\n', {
    'references/customization.md': '',
  })
  try {
    assert.deepEqual(sweep(r.root).failures, [])
  } finally {
    r.done()
  }
})

test('an item keeps its wrapped continuation lines, so a pointer may land on the second line', () => {
  const router = '## Routes\n\n- **Editing** anything under `skills/` means running\n  `scripts/sync.mjs` afterwards.\n'
  const r = repo(router, { 'skills/map/SKILL.md': '', 'scripts/sync.mjs': '' })
  try {
    const items = itemsIn(router)
    assert.equal(items.length, 1)
    assert.equal(leadingWord(items[0].trigger), 'editing')
    assert.deepEqual(sweep(r.root).failures, [])
  } finally {
    r.done()
  }
})

test('the committed router passes the sweep', () => {
  const { failures } = sweep()
  assert.deepEqual(failures, [], failures.join('\n'))
})
