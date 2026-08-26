#!/usr/bin/env node
/**
 * The documented read surface, and the parsing that keeps it honest.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import {
  compare,
  declaredReadTools,
  differences,
  documentedReadTools,
  phantomTools,
  registeredTools,
} from '../check-read-surface.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

test('this tree documents exactly the read tools it has, and no phantoms', () => {
  assert.deepEqual(compare(ROOT), {
    undocumented: [],
    unknown: [],
    duplicated: [],
    phantom: [],
  })
})

test('the documented list stops at the em dash, before the claim', () => {
  const row =
    '| Read the blueprint | call read tools: `get_cell`, `list_slices` — none of' +
    ' them move the canvas. That is the FULL read surface; nothing else reads. |'
  assert.deepEqual(documentedReadTools(row), ['get_cell', 'list_slices'])
})

test('the declared set is read out of its own Set literal, not a neighbour', () => {
  const source = [
    "export const WRITE_TOOL_NAMES = new Set(['upsert_cell'])",
    'export const READ_TOOL_NAMES = new Set([',
    "  'get_cell',",
    "  'list_slices',",
    '])',
    "const other = 'get_blueprint'",
  ].join('\n')
  assert.deepEqual(declaredReadTools(source), ['get_cell', 'list_slices'])
})

test('a difference names the tool, in either direction', () => {
  assert.deepEqual(differences(['get_cell', 'search_blueprint'], ['get_cell', 'list_slices']), {
    undocumented: ['list_slices'],
    unknown: ['search_blueprint'],
    duplicated: [],
  })
})

test('a tool listed twice is reported once', () => {
  assert.deepEqual(differences(['get_cell', 'get_cell'], ['get_cell']).duplicated, ['get_cell'])
})

// The four names that had drifted into PROSE rather than into a row. A
// row-scoped check walks straight past these, which is why the sweep exists.
test('a tool name invented anywhere in the prose is caught', () => {
  const markdown = [
    'Read the docs with parallel `get_reference` calls.',
    'Record findings via `create_finding`, resolve them via `update_finding`.',
    '`search_blueprint` answers without moving the canvas.',
  ].join('\n')
  assert.deepEqual(phantomTools(markdown, ['read_reference', 'record_finding']), [
    'get_reference',
    'create_finding',
    'update_finding',
    'search_blueprint',
  ])
})

test('the sweep spares the non-tool identifiers it is told about', () => {
  assert.deepEqual(phantomTools('slots are ordered by `position`', ['get_cell']), [])
})

test('the sweep ignores single words, which are never tool names', () => {
  assert.deepEqual(phantomTools('the `content` field and `needs`', ['get_cell']), [])
})

test('a missing claim fails loudly rather than comparing an empty list', () => {
  assert.throws(() => documentedReadTools('# Canvas adapter\n\nNo such row.\n'))
  assert.throws(() => declaredReadTools('export const TOOL_SPECS = []\n'))
  assert.throws(() => registeredTools('export const TOOL_SPECS = []\n'))
})
