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
import { execFileSync, spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

test('this checkout can see tags, so the guard has something to hold', () => {
  // The counterweight to the case above. Every assertion in `tagFaults` is
  // written over the tags that exist, so an empty list makes all of them
  // vacuous — and this repository has a hundred tags, which means an empty
  // answer here is a checkout that cannot see them rather than a repository
  // that has none.
  //
  // THIS IS NOT A LOCAL-ONLY ASSERTION, and the first run of it proved that:
  // `actions/checkout` does not fetch tags, and the fetch that gets them sat
  // two dozen steps below `npm test`, so the suite ran against none. The fetch
  // now runs beside `npm ci`, before anything reads a tag. A red line here is
  // that ordering having come undone — which is the state the whole guard
  // exists to refuse, so it must never be softened into a skip.
  assert.ok(
    localTags().length > 0,
    'no v* tag is visible, so every claim check:release-tag makes is vacuously true. ' +
      'Locally: git fetch --tags. In CI: the `git fetch --tags --force` step in ' +
      '.github/workflows/ci.yml has to run before this suite.',
  )
})

/**
 * The script beside the two files it reads, in a throwaway root.
 *
 * It resolves its own repository root from where it sits, so the only way to
 * run it against a tree that is not this one is to put a copy of it in that
 * tree. `unverified.mjs` travels with it because it is imported.
 */
function stage() {
  // Realpath, because the script decides it is the entry point by comparing
  // `process.argv[1]` against its own resolved URL — and a temporary directory
  // reached through a symlinked root would make it decide it is not.
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'release-tag-')))
  mkdirSync(join(root, 'scripts'))
  for (const file of ['scripts/check-release-tag.mjs', 'scripts/unverified.mjs']) {
    cpSync(join(ROOT, file), join(root, file))
  }
  writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '0.4.0' }))
  writeFileSync(join(root, 'CHANGELOG.md'), '# Changelog\n\n## 0.4.0\n')
  const run = () =>
    spawnSync(process.execPath, [join(root, 'scripts/check-release-tag.mjs')], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, GIT_CEILING_DIRECTORIES: tmpdir() },
    })
  return { root, run, done: () => rmSync(root, { recursive: true, force: true }) }
}

test('a tree with no git behind it is a failure, not an empty tag list', () => {
  // `localTags` turned every git failure into `[]`, so a tree that is not a
  // repository, a checkout handed no tags and a box with no git on it all
  // printed the same reassuring `no release tags yet` and exited 0.
  const t = stage()
  try {
    const run = t.run()
    assert.notEqual(run.status, 0, `${run.stdout}${run.stderr}`)
    assert.match(run.stderr, /git tag --list v\* failed/)
  } finally {
    t.done()
  }
})

test('a repository that genuinely has no tag passes, and says what went unheld', () => {
  const t = stage()
  try {
    execFileSync('git', ['init', '-q'], { cwd: t.root })
    const run = t.run()
    assert.equal(run.status, 0, `${run.stdout}${run.stderr}`)
    assert.match(run.stdout, /no release tags yet/)
    assert.match(run.stderr, /^::warning::unverified — every release tag\./m)
  } finally {
    t.done()
  }
})

test('once tagging has started, a release inside the era may not skip it', () => {
  const found = faults({
    tags: ['v0.6.0', 'v0.4.0'],
    released: ['0.6.0', '0.5.0', '0.4.0'],
    version: '0.6.0',
  })
  assert.deepEqual(found, ['release 0.5.0 has no tag v0.5.0'])
})

// The release commit states the new version before any tag for it can exist:
// the tag is cut on `main`, after the merge. Judging it in the default mode
// would make every version bump unmergeable — its own CI would demand a tag
// that cannot be cut yet.
test('the version being released is not judged in the default mode', () => {
  const found = faults({
    tags: ['v0.4.0'],
    released: ['0.5.0', '0.4.0'],
    version: '0.5.0',
  })
  assert.deepEqual(found, [])
})

test('--require judges exactly that version, and says how to fix it', () => {
  const found = faults({
    tags: ['v0.4.0'],
    released: ['0.5.0', '0.4.0'],
    version: '0.5.0',
    require: true,
  })
  assert.deepEqual(found, ['version 0.5.0 is released in the CHANGELOG and has no tag'])
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
