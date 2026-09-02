/**
 * Every value set the prose states is one the schema accepts.
 *
 * `retired-copy` sweeps retired IDENTIFIERS in JSX. This sweeps retired and
 * wrong VALUES in Markdown — `side-by-side`, `unhappy`, `alternative`,
 * `trigger` — which is the class #102 measured across seven sites after the
 * stack renamed the columns and left the values beside them. The catalog is
 * `portable-core.schema.sql`, the dump of what the portable core builds, so
 * this runs with no database on every pull request; the same grammar runs
 * in the instance against its live catalog.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SCHEMA } from '../check-instance-vocabulary.mjs'
import { sweptDocs } from '../swept-docs.mjs'
import { catalogFromSchema, valueSetFindings } from '../value-set-claims.mjs'

const ROOT = process.cwd()

test('no document states a value set the schema refutes', () => {
  const catalog = catalogFromSchema(readFileSync(SCHEMA, 'utf8'))
  assert.ok(catalog.columns.size >= 10, 'the dump has value lists to hold the docs to')
  const findings = []
  for (const relative of sweptDocs(ROOT)) {
    const text = readFileSync(`${ROOT}/${relative}`, 'utf8')
    findings.push(...valueSetFindings({ text, source: relative, medium: 'markdown' }, catalog))
  }
  assert.deepEqual(
    findings,
    [],
    'A document states values the schema does not accept, or names a value the rename map retired. ' +
      'Either the sentence is a claim about today and is wrong, or it is history and should say what the value became and in which migration:\n' +
      findings.join('\n'),
  )
})
