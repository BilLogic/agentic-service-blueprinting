#!/usr/bin/env node
/**
 * A PostgREST embed of a multiply-reachable table must name its foreign key.
 *
 * `cells` reaches `lanes` two ways: `cells_lane_id_fkey` on `(lane_id)`, and
 * the composite `cells_path_matches_lane_fkey` on `(lane_id, path_id)` that
 * enforces a cell's lane belonging to its path. PostgREST will not choose
 * between them — it answers `PGRST201`, a 300 listing the candidates, and the
 * client throws.
 *
 * `useStepSpec` asked for `lanes!inner(...)` with no hint. It was the FOURTH
 * of four queries in that hook and the only decorative one — the storyboard
 * frames — so a lookup for pictures failed the whole hook, and every step
 * panel in the app read "That step could not be loaded." The panel then
 * swallowed `result.message`, so the 300 never reached anyone; what the reader
 * saw was a breadcrumb that had degraded to the bare word "Step".
 *
 * `workflowQueries.ts` already documents this exact trap for `resources` —
 * "PostgREST answers an ambiguous embed with a 300 listing the candidates
 * rather than with rows" — and hints it correctly. The knowledge was in the
 * repository; nothing enforced it. This is the enforcement.
 *
 * WHAT THIS CAN AND CANNOT SEE. The pairs below were read from a live
 * database's `pg_constraint`, not inferred: nothing in the repository models a
 * foreign key's target and columns, so there is no way to derive them from the
 * files today. That makes this list a FIXTURE, and a fixture can go stale — so
 * the honest scope of this test is "the ambiguity we know about cannot come
 * back". Widening it to every embed needs a replay that models foreign keys
 * first; that is worth doing and is not this.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const REPO_ROOT = process.cwd()

/**
 * Embeds that PostgREST cannot resolve without a hint, as source → target.
 *
 * Verified against production's catalog on 2026-09-01. A pair earns its place
 * here by having more than one foreign key between the same two tables.
 */
const AMBIGUOUS = [
  {
    source: 'cells',
    target: 'lanes',
    keys: ['cells_lane_id_fkey', 'cells_path_matches_lane_fkey'],
  },
]

function sourceFiles(dir) {
  const found = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) found.push(...sourceFiles(path))
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) found.push(path)
  }
  return found
}

/**
 * `.from(X).select(Y)` pairs in `source`, as `{ root, select }`.
 *
 * The root is half the question — `lanes` embedded from `paths` is legal and
 * from `cells` is not — so a select string is worthless here without the table
 * it was asked of. A `*_SELECT` constant is resolved to its literal first, so
 * `PATH_BLUEPRINT_SELECT` is judged against the `paths` it is used with rather
 * than against the file it is declared in.
 */
export function selectsWithRoot(source) {
  const constants = new Map()
  for (const match of source.matchAll(
    /const\s+([A-Z][A-Z0-9_]*_SELECT)\s*(?::\s*[A-Za-z]+)?\s*=\s*(['"`])([\s\S]*?)\2/g,
  )) {
    constants.set(match[1], match[3])
  }

  const found = []
  for (const match of source.matchAll(
    // The gap may hold `.eq()`, `.abortSignal()` or a comment — the frames
    // query's own explanation is 467 characters of it — but never a second
    // `.from(`, which would mean this select belongs to a different table.
    /\.from\(\s*['"`]([A-Za-z_]+)['"`]\s*\)((?:(?!\.from\()[\s\S]){0,1600}?)\.select\(\s*(?:(['"`])([\s\S]*?)\3|([A-Z][A-Z0-9_]*_SELECT))/g,
  )) {
    const root = match[1]
    const select = match[4] ?? constants.get(match[5])
    if (select !== undefined) found.push({ root, select })
  }
  return found
}

/**
 * Every embed in `select`, as `{ parent, target, hints, text }`.
 *
 * The parent matters and cannot be grepped for: `PATH_BLUEPRINT_SELECT`
 * embeds `lanes` from `paths` — one foreign key, perfectly legal — in the same
 * string that embeds `cells`. A rule that asked "does this file mention cells"
 * called that a defect. So the string is WALKED: depth tracks the nesting and
 * the enclosing embed's name is the parent, with `root` for the top level.
 */
export function embeds(select, root = 'root') {
  const found = []
  const stack = [root]
  const token = /([A-Za-z_][A-Za-z0-9_]*)((?:![A-Za-z_]+)*)\s*\(|\)/g
  for (const match of select.matchAll(token)) {
    if (match[0] === ')') {
      if (stack.length > 1) stack.pop()
      continue
    }
    const [, name, hintText] = match
    const hints = (hintText || '').split('!').filter(Boolean)
    found.push({ parent: stack.at(-1), target: name, hints, text: match[0].trim() })
    stack.push(name)
  }
  return found
}

/**
 * Embeds in `select` that PostgREST cannot resolve, given `pairs`.
 *
 * `lanes!cells_lane_id_fkey!inner(` is hinted; `lanes!inner(` and `lanes(` are
 * not. `!inner` is a cardinality modifier, never a key — which is exactly the
 * confusion that produced the bug, so it is the case the matcher must get
 * right rather than the one it may skip.
 */
export function unresolvableEmbeds(select, pairs, root = 'root') {
  return embeds(select, root)
    .filter((embed) =>
      pairs.some(
        (pair) => pair.source === embed.parent && pair.target === embed.target,
      ),
    )
    .filter((embed) => !embed.hints.some((hint) => hint.endsWith('_fkey')))
}

test('no select embeds a multiply-reachable table without its key', () => {
  const findings = []
  for (const file of sourceFiles(resolve(REPO_ROOT, 'src'))) {
    for (const { root, select } of selectsWithRoot(readFileSync(file, 'utf8'))) {
      for (const embed of unresolvableEmbeds(select, AMBIGUOUS, root)) {
        const pair = AMBIGUOUS.find(
          (entry) => entry.source === embed.parent && entry.target === embed.target,
        )
        findings.push(
          `${relative(REPO_ROOT, file)}: ${embed.text} under ${root} — ` +
            `${pair.source} reaches ${pair.target} through ${pair.keys.join(' and ')}`,
        )
      }
    }
  }
  assert.deepEqual(
    findings,
    [],
    `PostgREST answers these with PGRST201, a 300, not rows:\n${findings.join('\n')}`,
  )
})

test('a cardinality modifier is not a key', () => {
  // The distinction the bug turned on: `!inner` looks like a hint and is not.
  const at = (select) => unresolvableEmbeds(select, AMBIGUOUS, 'cells').map((e) => e.text)
  assert.deepEqual(at('frame, lanes!inner(name)'), ['lanes!inner('])
  assert.deepEqual(at('frame, lanes(name)'), ['lanes('])
  assert.deepEqual(at('frame, lanes!cells_lane_id_fkey!inner(name)'), [])
  // Order is the caller's choice; PostgREST accepts the key on either side.
  assert.deepEqual(at('lanes!inner!cells_lane_id_fkey(name)'), [])
})

test('the same embed is legal from a parent with one key', () => {
  // PATH_BLUEPRINT_SELECT embeds `lanes` from `paths` AND embeds `cells`, in
  // one string. A rule that could not tell the two parents apart called the
  // legal one a defect — which it did, before this test parsed the nesting.
  assert.deepEqual(unresolvableEmbeds('id, lanes ( id, name )', AMBIGUOUS, 'paths'), [])
  assert.equal(
    unresolvableEmbeds('id, cells ( lanes ( name ) )', AMBIGUOUS, 'paths').length,
    1,
  )
})

test('the live query this was written for is hinted', () => {
  const source = readFileSync(resolve(REPO_ROOT, 'src/hooks/useStepSpec.ts'), 'utf8')
  const frames = selectsWithRoot(source).filter(({ select }) => select.includes('frame'))
  assert.ok(frames.length > 0, 'the storyboard frames query went missing')
  for (const { root, select } of frames) {
    assert.deepEqual(unresolvableEmbeds(select, AMBIGUOUS, root), [])
  }
})
