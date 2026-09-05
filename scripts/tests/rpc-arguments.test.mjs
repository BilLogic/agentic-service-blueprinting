#!/usr/bin/env node
/**
 * The RPC argument guard, and the parsing that keeps it honest.
 *
 * Each case is a call the check has to be able to read, driven from a fixture
 * that breaks the rule — the committed tree is asserted last, as one case
 * rather than as the whole suite.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  compare,
  objectKeys,
  problemsAt,
  rpcCallSites,
  schemaFunctions,
} from '../check-rpc-arguments.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

const SCHEMA = `
CREATE FUNCTION public.set_cell_dependency(source_cell_id uuid, target_cell_id uuid, kind text DEFAULT 'leads_to'::text, name text DEFAULT NULL::text, note text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$ begin end $$;

CREATE FUNCTION public.sync_cell_resources(p_cell_id uuid, p_rows jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$ begin end $$;
`

test('this tree calls every RPC with the arguments the schema declares', () => {
  assert.deepEqual(compare(ROOT), [])
})

test('a parameter list is read with its defaults, so required means required', () => {
  const functions = schemaFunctions(SCHEMA)
  assert.deepEqual(functions.get('set_cell_dependency'), [
    {
      accepted: ['source_cell_id', 'target_cell_id', 'kind', 'name', 'note'],
      required: ['source_cell_id', 'target_cell_id'],
    },
  ])
})

test('the `p_` prefix is a parameter name like any other — PostgREST strips nothing', () => {
  const functions = schemaFunctions(SCHEMA)
  const site = { fn: 'sync_cell_resources', line: 1, keys: [{ key: 'cell_id', spread: false }] }
  const problems = problemsAt(site, functions)
  assert.equal(problems.length, 3)
  assert.match(problems[0], /called with cell_id, which is not one of its parameters/)
  assert.match(problems[1], /called without p_cell_id/)
  assert.match(problems[2], /called without p_rows/)
})

test('the stray key #168 shipped is named, along with the function it went to', () => {
  const source = [
    "return call<string>(client, 'set_cell_dependency', {",
    '  source_cell_id: input.sourceCellId,',
    '  target_cell_id: input.targetCellId,',
    "  kind: input.kind ?? 'leads_to',",
    '  label: input.label ?? null,',
    '})',
  ].join('\n')
  const [site] = rpcCallSites(source)
  assert.equal(site.fn, 'set_cell_dependency')
  assert.deepEqual(problemsAt(site, schemaFunctions(SCHEMA)), [
    'set_cell_dependency is called with label, which is not one of its parameters' +
      ' (source_cell_id, target_cell_id, kind, name, note)',
  ])
})

test('a revert spec is a call too — an inverse posts the same body', () => {
  const source = [
    'return {',
    "  fn: 'set_cell_dependency',",
    '  args: { source_cell_id: a, target_cell_id: b, label: previous },',
    '}',
  ].join('\n')
  const [site] = rpcCallSites(source)
  assert.equal(site.fn, 'set_cell_dependency')
  assert.deepEqual(
    site.keys.map(({ key }) => key),
    ['source_cell_id', 'target_cell_id', 'label'],
  )
})

test('a read is swept with the writes, and shorthand is a key', () => {
  const source = "return read<Impact>(client, 'deletion_impact', { kind, target_id: targetId })"
  assert.deepEqual(rpcCallSites(source), [
    {
      fn: 'deletion_impact',
      line: 1,
      keys: [
        { key: 'kind', spread: false },
        { key: 'target_id', spread: false },
      ],
    },
  ])
})

test('a nested object contributes no keys of its own', () => {
  assert.deepEqual(
    objectKeys("lane_set: [{ name: 'Customer' }], scenario_id: id").map(({ key }) => key),
    ['lane_set', 'scenario_id'],
  )
})

test('a spread is reported rather than guessed at', () => {
  const site = { fn: 'set_cell_dependency', line: 9, keys: objectKeys('...args, kind') }
  assert.deepEqual(problemsAt(site, schemaFunctions(SCHEMA)), [
    'set_cell_dependency is called with ...args, whose keys this check cannot read',
  ])
})

test('a function the schema does not have fails by name', () => {
  const site = { fn: 'set_cell_label', line: 3, keys: [] }
  assert.deepEqual(problemsAt(site, schemaFunctions(SCHEMA)), [
    'set_cell_label is not a function in supabase/generated/portable-core.schema.sql',
  ])
})

test('a caller with no call sites fails loudly rather than passing empty', () => {
  // A parser that stopped matching would otherwise report a clean tree, which
  // is the one failure a comparison check cannot afford to make quietly.
  const root = mkdtempSync(join(tmpdir(), 'rpc-arguments-'))
  mkdirSync(join(root, 'src/lib'), { recursive: true })
  mkdirSync(join(root, 'supabase/generated'), { recursive: true })
  writeFileSync(join(root, 'src/lib/authoringRpc.ts'), 'export const nothing = true\n')
  writeFileSync(join(root, 'supabase/generated/portable-core.schema.sql'), SCHEMA)
  assert.throws(() => compare(root), /no RPC call sites/)
  rmSync(root, { recursive: true, force: true })
})
