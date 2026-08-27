/**
 * Check A's parts, exercised without a database.
 *
 * The check itself needs Postgres and only meets one in CI, which is why it
 * carries a `--self-test`. These cover the halves that do not: the query is
 * BUILT from the word list rather than restating it, and the parser has to
 * tell a result row from the chatter psql wraps it in.
 *
 * The parser test is not hypothetical. The first CI run to reach a real
 * database crashed here — `TypeError: Cannot read properties of undefined` —
 * because a multi-statement script makes psql echo a command tag per
 * statement, and a tag has no tabs in it. The self-test found the parser
 * before it could find a schema, which is a fair trade and an argument for
 * this file.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { findings, parseRows, selfTestSql, sweepSql } from '../check-retired-identifiers.mjs'
import { RETIRED_IDENTIFIER_FRAGMENTS } from '../retired-vocabulary.mjs'

test('a command tag is not a row', () => {
  // Verbatim shape of what `psql -At -F '\t'` writes for the self-test script.
  const out = ['BEGIN', 'CREATE TABLE', 'table\tzz_selftest_layer_table\tlayer', 'ROLLBACK'].join('\n')
  assert.deepEqual(parseRows(out), [
    { kind: 'table', identifier: 'zz_selftest_layer_table', word: 'layer' },
  ])
})

test('a row keeps all three of its fields, and blank lines are not rows', () => {
  const out = ['', 'function body\tsearch_blueprint\tlifecycle', '  ', ''].join('\n')
  assert.deepEqual(parseRows(out), [
    { kind: 'function body', identifier: 'search_blueprint', word: 'lifecycle' },
  ])
})

test('the sweep is built from the word list, and refuses an empty one', () => {
  const sql = sweepSql(['layer', "o'brien"])
  assert.match(sql, /values \('layer'\), \('o''brien'\)/)
  // Every catalogue this claims to read, named in the query it builds.
  for (const kind of ['pg_class', 'pg_attribute', 'pg_constraint', 'pg_policy',
                      'pg_trigger', 'pg_type', 'pg_proc', 'pg_description']) {
    assert.ok(sql.includes(kind), `the sweep never reads ${kind}`)
  }
  assert.throws(() => sweepSql([]), /the map is empty/)
})

test('the self-test plants a retired word and always rolls back', () => {
  const sql = selfTestSql()
  assert.match(sql, /^begin;/)
  assert.match(sql, /rollback;$/)
  const planted = /create table public\.(zz_selftest_\w+)/.exec(sql)
  assert.ok(planted, 'the self-test plants nothing')
  assert.ok(
    RETIRED_IDENTIFIER_FRAGMENTS.some((word) => planted[1].includes(word)),
    'the planted name carries no retired word, so reporting it would prove nothing',
  )
})

test('an exemption is matched on "kind identifier", the way the check names it', () => {
  const rows = [{ kind: 'index', identifier: 'cells_layer_step_slot_unique', word: 'layer' }]
  assert.equal(findings(rows).length, 1)
  assert.deepEqual(
    findings(rows, [{ identifier: 'index cells_layer_step_slot_unique', because: 'x'.repeat(30) }]),
    [],
  )
})
