/**
 * Check B's extraction, exercised directly.
 *
 * The check reports nothing today, and a check that reports nothing looks
 * exactly the same whether the codebase is clean or the extraction is broken.
 * These fixtures are the difference — the same reason `check-harness`'s
 * `test:scripts` exists upstream: a guard nobody has watched fail is a guard
 * nobody knows works.
 *
 * The fixtures deliberately name dead relations. That is why
 * `check-database-names.mjs` excludes test files from its own subject; without
 * that exclusion this file would fail the check it is testing.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  databaseNames,
  findings,
  namedObjects,
  qualifiedRelations,
  stringLiterals,
  withoutComments,
  withoutHashComments,
} from '../check-database-names.mjs'
import { retiredFragmentsIn } from '../retired-vocabulary.mjs'

test('an embed hint is found however the query string was assembled', () => {
  assert.deepEqual(databaseNames('cells?select=id,phase:phases(name)', 'url'), ['phases', 'cells'])
  // Nested, with the outer parenthesis already consumed by the previous match.
  // This is the shape that hid a dead relation upstream: the offending name is
  // on the inside, and a pattern that consumes its delimiter steps over it.
  assert.deepEqual(databaseNames('phase:phases(lifecycle:service_lifecycles(name))', 'select'), [
    'phases',
    'service_lifecycles',
  ])
  assert.deepEqual(databaseNames('lanes!cells_lane_id_fkey(name)', 'select'), [
    'lanes',
    'cells_lane_id_fkey',
  ])
})

test('.from() and .rpc() name their argument and nothing else', () => {
  assert.deepEqual(databaseNames('  layers  ', 'from'), ['layers'])
  assert.deepEqual(databaseNames('search_blueprint', 'rpc'), ['search_blueprint'])
  assert.deepEqual(databaseNames('', 'from'), [])
})

test('a relation named in a comment is not a use of it', () => {
  const code = ["// supabase.from('service_lifecycles')", "supabase.from('services')"].join('\n')
  assert.deepEqual(
    namedObjects(code).map((one) => one.name),
    ['services'],
  )
  assert.ok(withoutComments(code).includes('services'))
})

test('a literal keeps its line number across comments and newlines', () => {
  const literals = stringLiterals(["/* two", "   lines */", "const a = 'here'"].join('\n'))
  assert.deepEqual(
    literals.map((one) => [one.value, one.line]),
    [['here', 3]],
  )
})

test('the retired words this repo enforces are the ones it would catch', () => {
  // Every fragment in the map, shown catching something and not catching a
  // word that merely contains a lookalike.
  assert.deepEqual(retiredFragmentsIn('cells_layer_step_slot_unique'), ['layer'])
  assert.deepEqual(retiredFragmentsIn('service_lifecycle_id'), ['lifecycle'])
  assert.deepEqual(retiredFragmentsIn('propositions'), ['propositions'])
  // The permanent survivors, neither of which is a finding.
  assert.deepEqual(retiredFragmentsIn('proposition_question_key'), [])
  assert.deepEqual(retiredFragmentsIn('slices.description'), [])
  assert.deepEqual(retiredFragmentsIn('tech_description'), [])
})

test('the whole check reports nothing on this repo, and would report a plant', () => {
  assert.deepEqual(findings(), [])
  // The plant goes through the same extraction the walk feeds, so a broken
  // extractor cannot pass this by returning an empty list.
  const planted = namedObjects("supabase.from('layers').select('cell:cell_triggers(id)')")
  // `namedObjects` is the raw extraction and reports `cell_triggers` twice —
  // once from the embed-syntax scan and once from the `.select(` scan. That is
  // why `findings()` dedupes by site; asserting the set here keeps this test
  // about extraction rather than about the dedupe.
  assert.deepEqual(
    [...new Set(planted.filter((one) => retiredFragmentsIn(one.name).length > 0).map((one) => one.name))].sort(),
    ['cell_triggers', 'layers'],
  )
})

/* -------------------------------------------- the schema-qualified rule (Python) */

/**
 * The rule that was added because this check watched a real one go past:
 * `21000111` renamed `propositions`, and `generate_seed_sql.py` kept emitting
 * `to_regclass('public.propositions')`, which returns null instead of failing.
 * The fixture is that line, verbatim.
 */
test('a qualified relation is found in generated SQL, at the right line', () => {
  const code = [
    'def verify(lc_id):',
    '    return (',
    '        "  if to_regclass(\'public.propositions\') is not null then\\n"',
    '        f"    select count(*) into n from public.propositions where service_id = {lc_id};\\n"',
    '    )',
  ].join('\n')
  assert.deepEqual(
    qualifiedRelations(code, 'python'),
    [
      { line: 3, name: 'propositions', kind: 'schema-qualified relation' },
      { line: 4, name: 'propositions', kind: 'schema-qualified relation' },
    ],
  )
})

test('a whole-line # comment is not code, and blanking it keeps the line numbers', () => {
  const code = ['x = 1', '# public.layers was renamed', 'y = "public.lanes"'].join('\n')
  assert.deepEqual(qualifiedRelations(code, 'python'), [
    { line: 3, name: 'lanes', kind: 'schema-qualified relation' },
  ])
  // Blanked rather than dropped — a line that disappears shifts every line
  // number after it, and a finding that points at the wrong line is worse than
  // a finding nobody can find.
  assert.equal(withoutHashComments(code).split('\n').length, 3)
})

test('the rule reads JavaScript too, and a comment there is still not code', () => {
  const code = ['// public.service_lifecycles is gone', "sql(`select * from public.service_lifecycles`)"].join('\n')
  assert.deepEqual(
    namedObjects(code).filter((one) => one.kind === 'schema-qualified relation'),
    [{ line: 2, name: 'service_lifecycles', kind: 'schema-qualified relation' }],
  )
})

test('Python is read by the qualified rule alone', () => {
  // `stringLiterals` knows `//`, `/* */` and three quote characters, none of
  // which is a Python triple-quoted string. Handing it `.py` would not find
  // more — it would mis-tokenize and find less. So the embed grammar, which is
  // a PostgREST shape and does not occur in Python anyway, is not run there.
  const code = 'q = "cells?select=id,phase:phases(name)"'
  assert.deepEqual(namedObjects(code, 'python'), [])
  assert.equal(namedObjects(code).length > 0, true)
})
