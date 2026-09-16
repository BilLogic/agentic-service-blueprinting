/**
 * The check that keeps the two hosting rules true, proven by rule files that
 * break it.
 *
 * A guard seen only passing is not evidence. `netlify.toml` and
 * `public/_headers` pass today and would pass just as quietly if the check had
 * stopped reading them, so every branch is driven from a fixture that violates
 * it — no `/assets/*` rule, the rule below the catch-all, the wrong target,
 * the wrong status, a long cache on the shell — and the committed files are
 * asserted last, as one case among several rather than as the whole suite.
 *
 * The rule BELOW the catch-all is the case that matters most: it is the one a
 * diff reads as correct, because every word of the fix is there and only the
 * order is wrong.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  ASSETS,
  HEADERS,
  IMMUTABLE,
  LONG_CACHE_SECONDS,
  MISSING_CHUNK,
  REDIRECTS,
  cacheFindings,
  headerBlocksIn,
  judge,
  outlivesADeploy,
  redirectFindings,
  redirectsIn,
} from '../check-hosting-rules.mjs'

const ROOT = resolve(new URL('../..', import.meta.url).pathname)

/** The missing-chunk rule, as a TOML block. */
const MISSING_CHUNK_BLOCK = [
  '[[redirects]]',
  `  from = "${MISSING_CHUNK.from}"`,
  `  to = "${MISSING_CHUNK.to}"`,
  `  status = ${MISSING_CHUNK.status}`,
].join('\n')

/** The single-page fallback, as a TOML block. */
const CATCH_ALL_BLOCK = [
  '[[redirects]]',
  '  from = "/*"',
  '  to = "/index.html"',
  '  status = 200',
].join('\n')

/** A redirect table that passes: the 404, then the fallback. */
const ORDERED = [
  '[build]',
  '  command = "npm run build"',
  '  publish = "dist"',
  '',
  MISSING_CHUNK_BLOCK,
  '',
  CATCH_ALL_BLOCK,
  '',
].join('\n')

/** A `_headers` file that passes: the CSP for everything, the year for hashes. */
const CACHED = [
  '/*',
  "  Content-Security-Policy: default-src 'self'",
  '',
  ASSETS,
  `  Cache-Control: ${IMMUTABLE}`,
  '',
].join('\n')

/* ------------------------------------------------------------- the parsers */

test('the redirect table is read in the order the host reads it', () => {
  const blocks = redirectsIn(ORDERED)
  assert.deepEqual(
    blocks.map((block) => block.from),
    [MISSING_CHUNK.from, '/*'],
  )
  // `publish = "dist"` sits under `[build]`, and a table header closes the
  // block, so no redirect picks it up as a key of its own.
  assert.equal(blocks[0].to, MISSING_CHUNK.to)
  assert.equal(blocks[0].status, MISSING_CHUNK.status)
})

test('a header belongs to the path it is indented under', () => {
  const blocks = headerBlocksIn(CACHED)
  assert.deepEqual(
    blocks.map((block) => block.path),
    ['/*', ASSETS],
  )
  assert.deepEqual(
    blocks[1].headers.map((header) => header.name),
    ['Cache-Control'],
  )
  // A header before any path belongs to nothing, and a comment is not a path.
  assert.deepEqual(headerBlocksIn('# a note\n  Cache-Control: no-store\n'), [])
})

test('a cache outlives a deploy when it is immutable or at least a day', () => {
  assert.equal(outlivesADeploy(IMMUTABLE), true)
  assert.equal(outlivesADeploy(`public, max-age=${LONG_CACHE_SECONDS}`), true)
  assert.equal(outlivesADeploy(`public, max-age=${LONG_CACHE_SECONDS - 1}`), false)
  assert.equal(outlivesADeploy('no-store'), false)
})

/* -------------------------------------------------------------- the order */

test('the ordered table passes', () => {
  assert.deepEqual(redirectFindings(ORDERED), [])
})

test('a table with no /assets rule fails', () => {
  const found = redirectFindings([CATCH_ALL_BLOCK, ''].join('\n'))
  assert.equal(found.length, 1)
  assert.match(found[0], new RegExp(`^${REDIRECTS}:1 has no`))
})

test('the rule below the catch-all fails, which is the diff that reads as correct', () => {
  const inverted = [CATCH_ALL_BLOCK, '', MISSING_CHUNK_BLOCK, ''].join('\n')
  const found = redirectFindings(inverted)
  assert.equal(found.length, 1)
  assert.match(found[0], /BELOW the `\/\*` catch-all on line 1/)
})

test('the wrong target and the wrong status each fail on their own line', () => {
  const flattened = redirectFindings(
    [
      '[[redirects]]',
      `  from = "${MISSING_CHUNK.from}"`,
      '  to = "/index.html"',
      '  status = 200',
      '',
      CATCH_ALL_BLOCK,
      '',
    ].join('\n'),
  )
  assert.equal(flattened.length, 2)
  assert.match(flattened[0], /the target has to be/)
  assert.match(flattened[1], /the status has to be 404/)
})

test('a table with no catch-all fails, because there is nothing to precede', () => {
  const found = redirectFindings([MISSING_CHUNK_BLOCK, ''].join('\n'))
  assert.equal(found.length, 1)
  assert.match(found[0], /has no `\/\*` catch-all/)
})

/* -------------------------------------------------------------- the cache */

test('the cached headers pass', () => {
  assert.deepEqual(cacheFindings(CACHED), [])
})

test('headers with no /assets block fail', () => {
  const found = cacheFindings("/*\n  Content-Security-Policy: default-src 'self'\n")
  assert.equal(found.length, 1)
  assert.match(found[0], new RegExp(`^${HEADERS.replace('/', '\\/')}:1 has no`))
})

test('a short cache on the hashed assets fails', () => {
  const found = cacheFindings([ASSETS, '  Cache-Control: public, max-age=600', ''].join('\n'))
  assert.equal(found.length, 1)
  assert.match(found[0], /rather than/)
})

test('an /assets block with no Cache-Control fails', () => {
  const found = cacheFindings([ASSETS, '  X-Frame-Options: DENY', ''].join('\n'))
  assert.equal(found.length, 1)
  assert.match(found[0], /carries no Cache-Control/)
})

test('a long cache on anything unhashed fails', () => {
  for (const path of ['/*', '/index.html', '/favicon.svg', '/step-visuals/*']) {
    const found = cacheFindings([CACHED, path, `  Cache-Control: ${IMMUTABLE}`, ''].join('\n'))
    assert.equal(found.length, 1, path)
    assert.match(found[0], /outlives a deploy/)
  }
  // A day is the line: a shorter revalidation policy is nobody's business here.
  assert.deepEqual(
    cacheFindings([CACHED, '/*', '  Cache-Control: public, max-age=300', ''].join('\n')),
    [],
  )
})

/* ------------------------------------------------- and the committed files */

test('the committed rule files pass, and the check counted them', () => {
  const said = judge(ROOT)
  assert.deepEqual(said.findings, [])
  assert.ok(said.count > 0, 'a green line over no rules is the defect this check exists for')
  assert.equal(
    said.count,
    redirectsIn(readFileSync(resolve(ROOT, REDIRECTS), 'utf8')).length +
      headerBlocksIn(readFileSync(resolve(ROOT, HEADERS), 'utf8')).length,
  )
})
