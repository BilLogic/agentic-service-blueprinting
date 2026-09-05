#!/usr/bin/env node
/**
 * The standalone boundary, checked where a careless comment would break it.
 *
 * Two things have to hold at once and pull against each other: a real
 * reference has to fail, and the ordinary English the tree is full of has to
 * pass. The second half is the one that decides whether the check survives —
 * a guard that fires on `unobserve` gets deleted rather than fixed.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { isScanned, scannedFiles, violationsIn } from '../check-standalone.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

const labels = (source) => violationsIn(source).map((hit) => hit.label)

test('this tree names no deployment it was generalised from', () => {
  const found = scannedFiles().flatMap((path) =>
    violationsIn(readFileSync(`${ROOT}/${path}`, 'utf8')).map(
      ({ line, label }) => `${path}:${line} — ${label}`,
    ),
  )
  assert.deepEqual(found, [])
})

test('a reintroduced reference is caught and its line is reported', () => {
  const found = violationsIn('a\n// ported from uno-blueprint\nb\n')
  assert.deepEqual(
    found.map(({ line, label }) => ({ line, label })),
    [
      { line: 2, label: 'uno' },
      { line: 2, label: 'uno-bot / uno-blueprint' },
    ],
  )
  assert.equal(found[0].text, '// ported from uno-blueprint')
})

test('uno is word-bounded, so ordinary English passes', () => {
  // Each of these appears in the tree today. An unbounded /uno/ fails on all
  // four and the check does not survive its first week.
  assert.deepEqual(labels('observer.unobserve()'), [])
  assert.deepEqual(labels('-- an unowned cell'), [])
  assert.deepEqual(labels('left unopposed by the reviewer'), [])
  assert.deepEqual(labels('the notion of "selected"'), [])
})

test('PLUS is case-sensitive, because lowercase plus is legitimate copy', () => {
  assert.deepEqual(labels('import { Plus } from "lucide-react"'), [])
  assert.deepEqual(labels('the four skills plus polish'), [])
  assert.deepEqual(labels('A plus B'), [])
  assert.deepEqual(labels('the PLUS workspace'), ['PLUS (case-sensitive)'])
})

test('product vocabulary is not coupling and is deliberately unmatched', () => {
  assert.deepEqual(labels('aria-label="View in Figma"'), [])
  assert.deepEqual(labels('styled after Notion properties'), [])
  assert.deepEqual(labels('a chat bot on Slack, or anywhere else'), [])
  assert.deepEqual(labels('Copyright (c) 2026 BilLogic'), [])
})

test('the vendored mirror is skipped; its source is not', () => {
  assert.equal(isScanned('references/layer-roles.md'), true)
  assert.equal(isScanned('src/lib/agent/skill/references/layer-roles.md'), false)
})

test('an untracked file is in the subject — the sweep sees what a commit would', () => {
  // A changeset written and checked before `git add` passed the script and
  // failed CI (#180). The subject is tracked plus untracked-not-ignored, and
  // the two never disagree because there is one function.
  const root = mkdtempSync(join(tmpdir(), 'standalone-'))
  try {
    const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' })
    git('init', '-q')
    writeFileSync(join(root, '.gitignore'), 'ignored.md\n')
    writeFileSync(join(root, 'tracked.md'), 'fine\n')
    git('add', '.gitignore', 'tracked.md')
    writeFileSync(join(root, 'untracked.md'), 'fine\n')
    writeFileSync(join(root, 'ignored.md'), 'fine\n')
    const files = scannedFiles(root)
    assert.ok(files.includes('tracked.md'))
    assert.ok(files.includes('untracked.md'))
    assert.ok(!files.includes('ignored.md'))
    assert.equal(new Set(files).size, files.length)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
