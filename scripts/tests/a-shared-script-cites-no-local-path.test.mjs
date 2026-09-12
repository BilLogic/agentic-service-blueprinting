/**
 * A SCRIPT THIS PACKAGE PUBLISHES NAMES NO DOCUMENT ITS READER LACKS.
 *
 * `src/citations.test.ts` holds the same rule over the whole of `src/`,
 * because every file there is shared — a deployment reads the application out
 * of this package and the question of which files it holds does not arise.
 * `scripts/` is the one tree where that is false. A deployment keeps its own
 * scripts, most of them nothing like these, and shares the handful where both
 * repositories run the same check. So the subject is NAMED here rather than
 * walked for, and each name carries the reason it is shared.
 *
 * These six were measured byte-identical to a deployment's copies and refused
 * enrolment anyway, every one of them for a `docs/` path. Two of those paths
 * were already wrong: one sent a deployment's maintainer to a connector
 * document and an npm alias that repository does not have, and the generator
 * wrote its ratchet baseline to a path only one tree ever had. Nobody had met
 * either yet, which is the whole argument for a fence rather than a sweep.
 *
 * `citations.ts` carries the rule this reads. The short version is that a
 * `docs/` path is a defect when it reaches a reader standing in their own
 * repository as a dangling reference — so a tree both repositories have is
 * named in words, a value about the running repository's own tree comes from
 * `repo-config.mjs`, and a fixture is spelled so it cannot be mistaken for
 * either.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { DOCUMENT_PATH } from '@/citations.ts'

const ROOT = resolve(new URL('../..', import.meta.url).pathname)

/**
 * The scripts this package publishes for a deployment to hold byte-identical,
 * and why each one is shared. A file here is read by people in two
 * repositories, so it cites no identity local to either.
 */
export const SHARED_SCRIPTS = new Map([
  ['scripts/check-glossary-only.mjs', 'every repository holds its own glossary to one shape'],
  ['scripts/check-negation-ratchet.mjs', 'the ratchet is the mechanism; the count is repo-local'],
  ['scripts/check-target-schema.mjs', 'asking a live target whether it was migrated is the same question everywhere'],
  ['scripts/generate-agent-account.mjs', 'one generator, each repository’s own document and baseline'],
  ['scripts/swept-docs.mjs', 'one list of swept prose, read by every sweep in both repositories'],
  ['scripts/tests/the-router-is-a-router.test.mjs', 'the router’s three checks, proven the same way on both sides'],
])

/**
 * The prose lines of `text` — comments only, the way `proseLines` reads a
 * source file — is deliberately NOT what this uses. The gate a deployment
 * runs is line-based over bytes and cannot parse this language, so the
 * subject here is every line, exactly as that gate sees it. A guard that read
 * less than the gate would pass files the gate then refuses, which is the
 * failure it exists to prevent.
 */
function citedPaths(text) {
  return text
    .split('\n')
    .flatMap((line, index) => {
      const match = DOCUMENT_PATH.exec(line)
      return match ? [`${index + 1}: ${match[0]}`] : []
    })
}

test('a published shared script names no document an adopter does not have', () => {
  const offenders = []
  for (const path of SHARED_SCRIPTS.keys()) {
    for (const finding of citedPaths(readFileSync(join(ROOT, path), 'utf8'))) {
      offenders.push(`${path}:${finding}`)
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'A deployment holds these byte-identical and reads them in its own tree, where a docs/ ' +
      'path resolves to something else or to nothing. Name the document by its subject, put ' +
      'the value in scripts/repo-config.mjs, or — if it is a fixture — spell it so it cannot ' +
      `be read as an address:\n${offenders.join('\n')}`,
  )
})

test('every published shared script exists, and says why it is shared', () => {
  // Both directions of the same claim. A renamed script leaves an entry that
  // reads as a fence and guards nothing; an entry with no reason is a list
  // somebody has to reconstruct before they can add to it.
  for (const [path, reason] of SHARED_SCRIPTS) {
    assert.ok(readFileSync(join(ROOT, path), 'utf8').length > 0, `${path} is listed and empty`)
    assert.ok(reason.length > 20, `${path} is listed with no reason worth reading`)
  }
})

test('the guard reads what the deployment’s gate reads, not only the comments', () => {
  // The two wrong citations that prompted this both sat in comments, but the
  // generator's baseline path was a string literal in ordinary code — and a
  // byte-identity gate reads that line too. Driving the guard from a subject
  // that violates it in each position is the only way to know it does.
  assert.deepEqual(citedPaths(' * See docs/connectors/supabase/database.md § Did it run.'), [
    '1: docs/connectors/supabase/database.md',
  ])
  assert.deepEqual(citedPaths("const B = resolve(ROOT, 'docs/reference/baseline.json')"), [
    '1: docs/reference/baseline.json',
  ])
  // And the shapes that are not addresses stay out, so the fence is one a
  // contributor can live behind.
  assert.deepEqual(citedPaths("import doc from './docs/blueprint.md?raw'"), [])
  assert.deepEqual(citedPaths(' * the decision records are append-only'), [])
})
