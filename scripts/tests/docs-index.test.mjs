/**
 * The two index files are only ever as true as the frontmatter they are read
 * out of, and as complete as the subject they are built from.
 *
 * Both halves are judgement, and neither had a test. `frontmatter` decides
 * what a document claims to answer — a block that is not there, a key that is
 * not there, and a summary with a colon in it are each a different answer, and
 * the middle one is the failure this script exists to report: a document with
 * no `summary:` is named, not given a blank cell. `collectFrom` is the loop
 * over the swept documents, and the one thing it has to get right besides the
 * summary is the file that vanished between the listing and the read — a gap
 * the index walks past rather than reporting as a missing summary, which would
 * send a reader to add a line to a file that is gone.
 *
 * The documents are handed in. The walk that finds them is the `commit`
 * subject of `scripts/sweep.mjs`, tested once in the sweep's own suite.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'

import { collect, collectFrom, frontmatter } from '../generate-docs-index.mjs'

/** A sweep-shaped object over the documents named, each with the text given. */
function swept(files) {
  return {
    files: Object.keys(files).sort(),
    read: (path) => (path in files ? files[path] : null),
  }
}

test('a document with no frontmatter block claims nothing', () => {
  assert.deepEqual(frontmatter('# A title\n\nsummary: not in a block\n'), {})
  assert.deepEqual(frontmatter(''), {})
})

test('a frontmatter block is read as a flat map, and a line with no colon is not a key', () => {
  assert.deepEqual(frontmatter('---\nsummary: what it answers\nstatus: protocol\n---\n# A'), {
    summary: 'what it answers',
    status: 'protocol',
  })
  assert.deepEqual(frontmatter('---\nsummary: a\nnot a key\n---\n'), { summary: 'a' })
})

test('a summary keeps every colon after the first, which is where the sentence is', () => {
  // `summary: How to read it: the short version` is one value, not a truncated
  // one — the split is on the FIRST colon and the rest is the summary.
  assert.deepEqual(frontmatter('---\nsummary: How to read it: the short version\n---\n'), {
    summary: 'How to read it: the short version',
  })
})

test('a block written with CRLF is still a block', () => {
  assert.deepEqual(frontmatter('---\r\nsummary: a\r\n---\r\n# A'), { summary: 'a' })
})

test('every document handed in is indexed under its path within docs/, with its own summary', () => {
  const { protocol, problems } = collectFrom(
    swept({
      'docs/overview.md': '---\nsummary: What the folders mean\n---\n',
      'docs/engineering/checks.md': '---\nsummary: What each check holds\n---\n',
    }),
  )
  assert.deepEqual(protocol, [
    { path: 'engineering/checks.md', summary: 'What each check holds' },
    { path: 'overview.md', summary: 'What the folders mean' },
  ])
  assert.deepEqual(problems, [])
})

test('a document that states no summary is a problem, and is not indexed', () => {
  const { protocol, problems } = collectFrom(
    swept({
      'docs/overview.md': '---\nsummary: What the folders mean\n---\n',
      'docs/silent.md': '---\nstatus: protocol\n---\n# No summary',
      'docs/bare.md': '# Not even a block\n',
    }),
  )
  assert.deepEqual(protocol, [{ path: 'overview.md', summary: 'What the folders mean' }])
  assert.deepEqual(problems, [
    { path: 'bare.md', missing: 'summary' },
    { path: 'silent.md', missing: 'summary' },
  ])
})

test('a document listed and gone before the read is skipped, not reported as missing a summary', () => {
  // The listing is taken a moment before the read. A file that went away in
  // between reads as null, and telling its author to add a `summary:` to it
  // would be advice about a file nobody can open.
  const { protocol, problems } = collectFrom({
    files: ['docs/gone.md', 'docs/overview.md'],
    read: (path) => (path === 'docs/overview.md' ? '---\nsummary: kept\n---\n' : null),
  })
  assert.deepEqual(protocol, [{ path: 'overview.md', summary: 'kept' }])
  assert.deepEqual(problems, [])
})

test('collect reads the sweep it is handed rather than walking a tree of its own', () => {
  assert.deepEqual(
    collect('/nowhere', swept({ 'docs/overview.md': '---\nsummary: handed in\n---\n' })),
    { protocol: [{ path: 'overview.md', summary: 'handed in' }], problems: [] },
  )
})
