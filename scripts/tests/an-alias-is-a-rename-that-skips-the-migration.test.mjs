#!/usr/bin/env node
/**
 * A PostgREST alias can reintroduce a word the database retired.
 *
 * `path_type:kind` in a select string is not a column. It is an instruction to
 * PostgREST to hand the row back with the field called `path_type` — the name
 * a migration renamed away. One such alias put a retired word into 295
 * references across 73 files, and no check could see it:
 * `check-retired-identifiers` sweeps database identifiers and this is not one,
 * and a sweep of the schema snapshot would not find it there either. The word
 * re-entered through the gap between them.
 *
 * `workflowQueries.ts` called its alias "deliberate and temporary" and named
 * the issue that would remove it. That issue closed on 2026-08-31 without
 * removing it. Temporary became permanent by the quietest route there is, and
 * a comment is what failed to stop it, so this is a check instead.
 *
 * THE SUBJECT IS THE ALIAS, NOT THE PROSE — and that narrowing is the whole
 * design. `check-retired-identifiers` argues at length that a check which
 * greps prose needs an exemption for every filename and every sentence, "dozens
 * of entries, each one a place to hide something real." That argument applies
 * here with force: `src/` holds Tailwind's `hover:text`, `visible:ring` and 115
 * more colon pairs per variant, so a repository-wide sweep for `word:word`
 * would be exemptions all the way down. An alias in a select string is the one
 * construct that can rename a live column to a retired word for every consumer
 * at once, it has exact syntax, and it lives only where a select string lives.
 * That is a subject small enough to check without exempting anything.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { RETIRED_IDENTIFIER_FRAGMENTS } from '../retired-vocabulary.mjs'

const REPO_ROOT = process.cwd()
const SOURCE_ROOT = 'src'

/** Files that may hold a select string. */
function sourceFiles(dir) {
  const found = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path))
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      found.push(path)
    }
  }
  return found
}

/**
 * The select strings in `source`.
 *
 * Two shapes reach PostgREST: a literal argument to `.select(`, and a
 * `*_SELECT` constant declared for reuse. Both are read; a template literal is
 * read the same way a quoted one is, because PostgREST parses the text either
 * way.
 */
export function selectStrings(source) {
  const found = []
  const openers = [/\.select\(\s*(['"`])/g, /_SELECT\s*(?:: *[A-Za-z]+)?\s*=\s*(['"`])/g]
  for (const opener of openers) {
    for (const match of source.matchAll(opener)) {
      const quote = match[1]
      const start = match.index + match[0].length
      const end = source.indexOf(quote, start)
      if (end !== -1) found.push(source.slice(start, end))
    }
  }
  return found
}

/**
 * Aliases in `select` whose NAME is a retired word, as `alias:target`.
 *
 * Only the left half is judged. `path_type:kind` is a finding because the row
 * comes back called `path_type`; a `kind:path_type` would be the opposite and
 * is not this check's business, because the right half names a column and
 * `check-retired-identifiers` already owns those.
 */
export function retiredAliases(select) {
  const findings = []
  for (const [, alias, target] of select.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)/g)) {
    if (RETIRED_IDENTIFIER_FRAGMENTS.some((word) => alias.includes(word))) {
      findings.push(`${alias}:${target}`)
    }
  }
  return findings
}

test('no select string aliases a row field to a word the database retired', () => {
  const findings = []
  for (const file of sourceFiles(resolve(REPO_ROOT, SOURCE_ROOT))) {
    const source = readFileSync(file, 'utf8')
    for (const select of selectStrings(source)) {
      for (const alias of retiredAliases(select)) {
        findings.push(`${relative(REPO_ROOT, file)}: ${alias}`)
      }
    }
  }
  assert.deepEqual(
    findings,
    [],
    'a select string renames a live column to a retired word, which hands that ' +
      'word to every consumer of the row at once:\n' + findings.join('\n'),
  )
})

test('the alias is judged by its name, not by what it points at', () => {
  // The direction matters and is easy to get backwards. `path_type:kind` puts
  // the retired word in the app; `kind:path_type` would put it in the query,
  // where a different guard already lives.
  assert.deepEqual(retiredAliases('id, name, path_type:kind, status'), ['path_type:kind'])
  assert.deepEqual(retiredAliases('id, name, kind:some_column'), [])
})

test('an embed alias counts, because it names the field too', () => {
  // `service_scenario:scenarios(name)` returns `row.service_scenario`. The
  // target is a table rather than a column, which changes nothing about the
  // name the consumer reads.
  assert.deepEqual(
    retiredAliases('id,name,service_scenario:scenarios(name)'),
    ['service_scenario:scenarios'],
  )
})

test('both select shapes are read', () => {
  assert.deepEqual(selectStrings(".from('paths').select('id, path_type:kind')"), [
    'id, path_type:kind',
  ])
  assert.deepEqual(selectStrings('export const PATH_LIST_SELECT =\n  `id, path_type:kind`'), [
    'id, path_type:kind',
  ])
  // A test file's prose is not a select string, and neither is a comment that
  // merely contains the words — only a literal in one of the two positions.
  assert.deepEqual(selectStrings('// path_type:kind is an alias'), [])
})
