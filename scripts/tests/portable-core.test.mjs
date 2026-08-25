#!/usr/bin/env node
/**
 * The portable-core check, and the parsing that decides what it compares.
 *
 * The parser is the interesting half. A line-wise reader of `create table`
 * bodies looks obviously correct and is not: a multi-line check constraint has
 * continuation lines beginning with `or` and `references`, and the first run of
 * this check reported two columns by those names. The cases below pin that.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  compare,
  parseGeneratedTypes,
  parseInventory,
  parseReferenceTables,
  splitTopLevel,
} from '../check-portable-core.mjs'

const ROOT = new URL('../../', import.meta.url)
const read = (path) => readFileSync(fileURLToPath(new URL(path, ROOT)), 'utf8')

test('the reference snapshot describes exactly what the migrations build', () => {
  // The offline half of the check: the generated types are a second witness to
  // the built schema, and cost nothing to consult.
  const problems = compare(
    parseReferenceTables(read('supabase/schema.reference.sql')),
    parseGeneratedTypes(read('src/types/database.ts')),
  )
  assert.deepEqual(problems, [])
})

test('a multi-line constraint does not become a column', () => {
  const sql = [
    'create table public.evidence (',
    '  id uuid primary key,',
    '  cell_id uuid,',
    '  constraint evidence_exactly_one_target check (',
    '    cell_id is not null',
    '    or step_id is not null',
    '  ),',
    '  step_id uuid references public.steps (id)',
    ');',
  ].join('\n')
  const tables = parseReferenceTables(sql)
  assert.deepEqual([...tables.get('evidence')].sort(), ['cell_id', 'id', 'step_id'])
})

test('a comment cannot introduce a column', () => {
  const sql = [
    'create table public.cells (',
    '  id uuid primary key,',
    '  links jsonb, -- shape text, label text',
    ');',
  ].join('\n')
  assert.deepEqual([...parseReferenceTables(sql).get('cells')].sort(), ['id', 'links'])
})

test('commas inside parentheses and strings do not split a column', () => {
  const pieces = splitTopLevel("a text default 'x, y', b text check (b in ('p','q'))")
  assert.equal(pieces.length, 2)
  assert.match(pieces[1], /^\s*b text/)
})

test('the inventory reads psql tab output and ignores blank lines', () => {
  const tables = parseInventory('cells\tid\ncells\tcontent\n\nphases\tid\n')
  assert.deepEqual([...tables.get('cells')].sort(), ['content', 'id'])
  assert.deepEqual([...tables.get('phases')], ['id'])
})

test('drift is reported in the direction that tells you what to do', () => {
  const reference = new Map([['cells', new Set(['id', 'ghost'])]])
  const actual = new Map([
    ['cells', new Set(['id', 'content'])],
    ['agent_sessions', new Set(['id'])],
  ])
  const problems = compare(reference, actual)
  assert.deepEqual(problems, [
    'the migrations build public.agent_sessions; the snapshot does not describe it',
    'public.cells.content exists in the database and not in the snapshot',
    'public.cells.ghost is in the snapshot and not in the database',
  ])
})
