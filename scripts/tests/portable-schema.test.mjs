/**
 * The schema dump of the portable core: what makes it deterministic, and
 * what it must not carry. The identifier sweep here is the static twin of
 * `check:identifiers` — that one asks a database, this one reads the file a
 * database would build, so it runs on every pull request without one.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalize, SCHEMA } from '../generate-portable-schema.mjs'
import { RETIRED_IDENTIFIER_FRAGMENTS, retiredFragmentsIn } from '../retired-vocabulary.mjs'

/** Identifiers in a dump: SQL with its comments, string literals and dollar bodies' prose stripped. */
export function identifiersIn(sql) {
  const code = sql
    .replace(/^--.*$/gm, '')
    .replace(/'(?:[^']|'')*'/g, "''")
  return new Set(code.match(/\b[a-z_][a-z0-9_]*\b/g) ?? [])
}

test('the varying lines are the ones normalize removes', () => {
  const raw = [
    '--',
    '-- PostgreSQL database dump',
    '--',
    '',
    '\\restrict hDaFAnzrrAPTT5gRofhYoVpHjXhpEsHwbEqCBMTfhj1H',
    '',
    '-- Dumped from database version 17.11 (Homebrew)',
    '-- Dumped by pg_dump version 17.11 (Homebrew)',
    '',
    'SET statement_timeout = 0;',
    '\\unrestrict hDaFAnzrrAPTT5gRofhYoVpHjXhpEsHwbEqCBMTfhj1H',
    '',
  ].join('\n')
  assert.equal(normalize(raw), '--\n-- PostgreSQL database dump\n--\n\nSET statement_timeout = 0;\n')
})

test('a retired fragment inside an identifier is found; inside prose it is not', () => {
  const sql = "CREATE TABLE public.lanes (\n    lane_role text\n);\n-- the old layer table\nCOMMENT ON TABLE public.lanes IS 'was a layer once';\nCREATE INDEX cells_layer_step ON public.cells USING btree (lane_id);"
  const stale = [...identifiersIn(sql)].filter((id) => retiredFragmentsIn(id).length > 0)
  assert.deepEqual(stale, ['cells_layer_step'])
})

test('the committed dump names nothing the rename map retired', () => {
  const dump = readFileSync(SCHEMA, 'utf8')
  const stale = [...identifiersIn(dump)].filter((id) => retiredFragmentsIn(id).length > 0).sort()
  assert.deepEqual(
    stale,
    [],
    `the portable core still holds an identifier carrying a retired fragment (${RETIRED_IDENTIFIER_FRAGMENTS.join(', ')}). ` +
      'A rename that reached the table and not its constraint or index is the usual cause; write the migration that finishes it.',
  )
})
