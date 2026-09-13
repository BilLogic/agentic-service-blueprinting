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
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { appSourceRoot } from '../app-source.mjs'
import {
  isScanned,
  scannedFiles,
  violationsIn,
  violationsUnder,
} from '../check-standalone.mjs'

const REPO_ROOT = process.cwd()

const labels = (source) => violationsIn(source).map((hit) => hit.label)

test('this tree names no deployment it was generalised from', () => {
  // Through `violationsUnder`, which is the function `check-standalone.mjs`
  // itself runs. This test used to re-walk the subject by hand, and the
  // hand-written copy was missing the guard the script had had for months —
  // which is how one release window turned a green tree into a red suite
  // (#632). One walk, one guard, two callers.
  const found = violationsUnder().map(
    ({ path, line, label }) => `${path}:${line} — ${label}`,
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

test('a citation of the source repository is not coupling', () => {
  assert.deepEqual(labels('Moved from BilLogic/plus-uno-blueprint ADR 0012 (#551).'), [])
  assert.deepEqual(labels('See BilLogic/plus-uno-blueprint#617'), [])
  assert.deepEqual(labels('uno is a deployment'), ['uno'])
  assert.deepEqual(
    labels('PLUS lives in data, see BilLogic/plus-uno-blueprint'),
    ['PLUS (case-sensitive)'],
  )
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

test('a listing every predicate rejects is refused, not swept as clean', () => {
  // Two steps stand between `git ls-files` and the subject — the listing, and
  // a predicate that can reject every path in it. Either coming back empty
  // produced the same green line the full sweep produces, with a `0` in it.
  const root = mkdtempSync(join(tmpdir(), 'standalone-empty-'))
  try {
    const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' })
    git('init', '-q')
    // Listed, and outside the subject: the vendored mirror is skipped by name.
    mkdirSync(join(root, 'src/lib/agent/skill/references'), { recursive: true })
    writeFileSync(join(root, 'src/lib/agent/skill/references/a.md'), 'fine\n')
    git('add', '-A')
    assert.throws(() => scannedFiles(root), /no scanned file under .*: git listed 1 path/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

/* ------------------------------- a listing is older than the read it feeds */

/**
 * A repository whose index names a path the working tree no longer has, which
 * is what `npm run version` leaves behind between consuming the changesets and
 * `git add`. Returns the root; the caller removes it.
 */
function repoListingSomethingGone() {
  const root = mkdtempSync(join(tmpdir(), 'standalone-gone-'))
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' })
  git('init', '-q')
  writeFileSync(join(root, 'gone.md'), 'fine\n')
  writeFileSync(join(root, 'kept.md'), 'the PLUS workspace\n')
  git('add', 'gone.md', 'kept.md')
  rmSync(join(root, 'gone.md'))
  return root
}

test('a sweep whose listed file is gone completes and skips it', () => {
  const root = repoListingSomethingGone()
  try {
    // The listing really does still name it — otherwise this proves nothing.
    assert.ok(scannedFiles(root).includes('gone.md'))

    // And the sweep runs past the gap rather than throwing over it, and is
    // still reporting when it comes out the other side: `gone.md` sorts first,
    // so the violation below is only reachable through the skip.
    assert.deepEqual(
      violationsUnder(root).map(({ path, line, label }) => `${path}:${line} — ${label}`),
      ['kept.md:1 — PLUS (case-sensitive)'],
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('a sweep whose listed file is unreadable for another reason still fails', () => {
  // The half that matters. Tolerating every read failure would be a shorter
  // patch and a worse one: a sweep that quietly skips what it cannot open
  // reports nothing and is indistinguishable from a clean tree.
  //
  // `a/b.md` is committed, then `a` is replaced by a FILE — so the index still
  // names `a/b.md` and reading it gives ENOTDIR rather than ENOENT. Nothing
  // vanished; the tree is in a state the walk cannot explain, and that is news.
  const root = mkdtempSync(join(tmpdir(), 'standalone-unreadable-'))
  try {
    const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' })
    git('init', '-q')
    mkdirSync(join(root, 'a'))
    writeFileSync(join(root, 'a', 'b.md'), 'fine\n')
    git('add', 'a/b.md')
    rmSync(join(root, 'a'), { recursive: true })
    writeFileSync(join(root, 'a'), '')

    assert.ok(scannedFiles(root).includes('a/b.md'))
    assert.throws(
      () => violationsUnder(root),
      (error) => error.code === 'ENOTDIR',
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('the sweep reads the whole tree, not a handful of directories', () => {
  // The breadth, because the skip above is safe only while something counts
  // what came back. A walk that had quietly stopped descending — or one
  // skipping every file it could not open — looks exactly like a clean tree,
  // right up until a reintroduced reference lands in the part it stopped
  // reading.
  //
  // THE DIRECTORIES ARE DISCOVERED RATHER THAN NAMED. A list written here is a
  // list of THIS tree's folders, and this file is one a deployment holds
  // byte-identical: `src/` is not there when the application is read out of
  // the package, `skills/` is not there in a tree with no plugin surface, and
  // a test asserting either would fail on a tree that is not wrong. What holds
  // everywhere is that every directory git reports a scannable file in is a
  // directory the sweep reached.
  const listed = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  )
    .split('\0')
    .filter((path) => path !== '')
  assert.ok(listed.length > 0, 'git listed no file at all, so there is no tree to sweep')

  const files = scannedFiles()
  assert.ok(files.length > 0, 'the sweep came back empty, which is not a clean tree')

  const directories = new Set(
    listed.filter(isScanned).filter((path) => path.includes('/')).map((path) => `${path.split('/')[0]}/`),
  )
  assert.ok(directories.size > 3, `only ${directories.size} directories in the subject`)
  for (const dir of [...directories].sort()) {
    assert.ok(files.some((path) => path.startsWith(dir)), `${dir} is not in the subject`)
  }
})

test('the application is in the subject wherever this tree keeps its own', () => {
  // The half the discovery above cannot state: a tree that keeps the
  // application in its own `src` must be sweeping it, and a tree that reads
  // the application out of the package must not — that copy is a dependency,
  // not something this commit would carry, and it is the template's own code
  // in any case. `app-source.mjs` is what says which tree this is.
  const files = scannedFiles()
  const own = appSourceRoot(REPO_ROOT) === join(REPO_ROOT, 'src')
  assert.equal(
    files.some((path) => path.startsWith('src/')),
    own,
    own
      ? 'this tree keeps the application in src/ and the sweep is not reading it'
      : 'this tree reads the application out of the package, so src/ cannot be in its commit',
  )
})
