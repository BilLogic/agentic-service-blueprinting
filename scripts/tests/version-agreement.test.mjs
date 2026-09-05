#!/usr/bin/env node
/**
 * The one version number, checked where a release would break it.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import {
  changelogVersion,
  disagreements,
  lockfileVersion,
  versions,
} from '../check-version-agreement.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

test('this tree states one version everywhere', () => {
  assert.deepEqual(disagreements(versions(ROOT)), [])
})

test('the changelog version is the first release heading, not the title', () => {
  const source = '# Changelog\n\nBlurb about 9.9.9.\n\n## 0.5.0 — 2026-08-24\n\n## 0.4.0\n'
  assert.equal(changelogVersion(source), '0.5.0')
  assert.equal(changelogVersion('# Changelog\n\nNothing released yet.\n'), null)
})

test('a disagreement names the file, what it says, and what it should say', () => {
  const wrong = disagreements({
    'package.json': '0.5.0',
    '.claude-plugin/plugin.json': '0.4.0',
    'CHANGELOG.md': '0.5.0',
  })
  assert.deepEqual(wrong, [
    { file: '.claude-plugin/plugin.json', version: '0.4.0', expected: '0.5.0' },
  ])
})

test('a missing changelog heading disagrees rather than passing quietly', () => {
  const wrong = disagreements({ 'package.json': '0.5.0', 'CHANGELOG.md': null })
  assert.equal(wrong.length, 1)
  assert.equal(wrong[0].version, null)
})

test('the lockfile states its version twice, and the check reads it as one', () => {
  assert.equal(
    lockfileVersion({ version: '1.5.0', packages: { '': { version: '1.5.0' } } }),
    '1.5.0',
  )
})

test('a lockfile that disagrees with itself states no version at all', () => {
  // `npm install` rewrites both from package.json; a lockfile carrying two
  // numbers was edited by hand, and neither is trusted.
  assert.equal(
    lockfileVersion({ version: '1.5.0', packages: { '': { version: '0.5.0' } } }),
    null,
  )
})

test('a lockfile behind the manifest is a disagreement, not a dirty worktree', () => {
  const wrong = disagreements({
    'package.json': '1.5.0',
    '.claude-plugin/plugin.json': '1.5.0',
    'CHANGELOG.md': '1.5.0',
    'package-lock.json': '0.5.0',
  })
  assert.deepEqual(wrong, [
    { file: 'package-lock.json', version: '0.5.0', expected: '1.5.0' },
  ])
})
