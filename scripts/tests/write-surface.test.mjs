#!/usr/bin/env node
/**
 * The documented write surface, and the parsing that keeps it honest.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import {
  compare,
  declaredWriteTools,
  differences,
  documentedWriteTools,
} from '../check-write-surface.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

test('this tree documents exactly the write tools it has', () => {
  assert.deepEqual(compare(ROOT), { undocumented: [], unknown: [], duplicated: [] })
})

test('the documented list stops at the em dash, before ui_command', () => {
  const row =
    '| Edit IR JSON | call write tools: `upsert_cell`, `create_lane` — plus `ui_command`' +
    "'s few commands. That is the FULL write surface; nothing else writes. |"
  assert.deepEqual(documentedWriteTools(row), ['upsert_cell', 'create_lane'])
})

test('the declared set is read out of the Set literal, not the whole file', () => {
  const source = [
    "export const READ_TOOL_NAMES = new Set(['get_cell'])",
    'export const WRITE_TOOL_NAMES = new Set([',
    "  'upsert_cell',",
    "  'create_lane',",
    '])',
    "const other = 'update_path'",
  ].join('\n')
  assert.deepEqual(declaredWriteTools(source), ['upsert_cell', 'create_lane'])
})

test('a difference names the tool, in either direction', () => {
  assert.deepEqual(differences(['upsert_cell', 'create_evidence'], ['upsert_cell', 'create_lane']), {
    undocumented: ['create_lane'],
    unknown: ['create_evidence'],
    duplicated: [],
  })
})

test('a tool listed twice is reported once', () => {
  const wrong = differences(['create_lane', 'create_lane'], ['create_lane'])
  assert.deepEqual(wrong.duplicated, ['create_lane'])
})

test('a missing claim fails loudly rather than comparing an empty list', () => {
  assert.throws(() => documentedWriteTools('# Canvas adapter\n\nNo such row.\n'))
  assert.throws(() => declaredWriteTools('export const TOOL_SPECS = []\n'))
})
