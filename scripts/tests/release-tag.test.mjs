#!/usr/bin/env node
/**
 * The tag, checked where a release would break it.
 *
 * The interesting case is the one this repo is in today: zero tags, one
 * released version, and a check that has to say so without going red — while
 * still being a real guard the moment a tag exists.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  localTags,
  releasedVersions,
  tagFaults,
  tagFor,
  versionAtTag,
} from '../check-release-tag.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

const faults = (overrides) =>
  tagFaults({ tags: [], released: [], version: '0.4.0', taggedTree: null, ...overrides })

test('this checkout has no tag that lies about what it points at', () => {
  const version = JSON.parse(readFileSync(`${ROOT}/package.json`, 'utf8')).version
  const tags = localTags()
  const found = tagFaults({
    tags,
    released: releasedVersions(readFileSync(`${ROOT}/CHANGELOG.md`, 'utf8')),
    version,
    taggedTree: tags.includes(tagFor(version)) ? versionAtTag(tagFor(version)) : null,
  })
  assert.deepEqual(found, [])
})

test('the released versions are the release headings, not the title', () => {
  const source = '# Changelog\n\nBlurb about 9.9.9.\n\n## 0.5.0 — 2026-08-24\n\n## 0.4.0\n'
  assert.deepEqual(releasedVersions(source), ['0.5.0', '0.4.0'])
})

test('an untagged repo passes, and says that it is untagged', () => {
  assert.deepEqual(faults({ released: ['0.4.0'] }), [])
})

test('once tagging has started, a later release may not skip it', () => {
  const found = faults({
    tags: ['v0.5.0'],
    released: ['0.6.0', '0.5.0', '0.4.0'],
    version: '0.6.0',
  })
  assert.deepEqual(found, ['release 0.6.0 has no tag v0.6.0'])
})

test('releases that shipped before tagging did are left where they are', () => {
  const found = faults({
    tags: ['v0.5.0'],
    released: ['0.5.0', '0.4.0', '0.3.0'],
    version: '0.5.0',
  })
  assert.deepEqual(found, [])
})

test('--require fails on the current version with nothing else tagged', () => {
  const found = faults({ released: ['0.4.0'], require: true })
  assert.deepEqual(found, ['version 0.4.0 is released in the CHANGELOG and has no tag'])
})

test('a tag whose tree states another version is named as a liar', () => {
  const found = faults({
    tags: ['v0.4.0'],
    released: ['0.4.0'],
    taggedTree: '0.3.0',
  })
  assert.deepEqual(found, [
    'tag v0.4.0 points at a tree whose package.json says 0.3.0',
  ])
})

test('a tag for a version no release heading records is a tag nobody can read', () => {
  const found = faults({ tags: ['v9.9.9'], released: ['0.4.0'] })
  assert.equal(found[0], 'tag v9.9.9 names a version the CHANGELOG never released')
})

test('a tag that is not v<semver> is refused rather than parsed', () => {
  assert.deepEqual(faults({ tags: ['v0.4'], released: ['0.4.0'] }), [
    'tag v0.4 is not v<major>.<minor>.<patch>',
  ])
})
