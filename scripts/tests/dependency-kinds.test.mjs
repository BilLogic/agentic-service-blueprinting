#!/usr/bin/env node
/**
 * The documented dependency vocabulary, and the parsing that keeps it honest.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import {
  compare,
  differences,
  documentedKinds,
  enforcedKinds,
  retiredMentions,
} from '../check-dependency-kinds.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

test('this tree documents the kind vocabulary its constraint enforces', () => {
  assert.deepEqual(compare(ROOT), { undocumented: [], unknown: [], retired: [] })
})

test('the enforced values come out of the CHECK constraint', () => {
  const sql = "  constraint cell_triggers_kind_check check (kind in ('trigger','needs')),"
  assert.deepEqual(enforcedKinds(sql), ['trigger', 'needs'])
})

test('the constraint is matched under the table name it was renamed to', () => {
  const sql = "constraint cell_dependencies_kind_check check (kind in ('trigger', 'needs'))"
  assert.deepEqual(enforcedKinds(sql), ['trigger', 'needs'])
})

test('a redefined constraint fails rather than being read stale', () => {
  const twice = [
    "constraint cell_triggers_kind_check check (kind in ('trigger','needs'))",
    "constraint cell_dependencies_kind_check check (kind in ('trigger','needs','maybe'))",
  ].join('\n')
  assert.throws(() => enforcedKinds(twice))
  assert.throws(() => enforcedKinds('-- no constraint here\n'))
})

test('the documented values stop at the end of the enum sentence', () => {
  const row =
    '- `cell_dependencies.kind`: `trigger` \\| `needs`. `trigger` is temporal and' +
    ' `needs` is functional, and neither is `leads_to`.'
  assert.deepEqual(documentedKinds(row), ['trigger', 'needs'])
})

test('a missing enum row fails loudly rather than comparing an empty list', () => {
  assert.throws(() => documentedKinds('## Enums\n\n- `paths.path_type`: `happy`.\n'))
})

// The defect this check was written for: the doc taught two values the
// column has never accepted.
test('a value the constraint refuses is named, in either direction', () => {
  assert.deepEqual(differences(['leads_to', 'enables'], ['trigger', 'needs']), {
    undocumented: ['trigger', 'needs'],
    unknown: ['leads_to', 'enables'],
  })
})

test('the retired words are caught in prose, with file and line', () => {
  const files = ['skills/whatif/references/whatif-playbook.md']
  const read = () => 'a line\nthe tracer walks `leads_to` edges\ndeep `enables` chains\n'
  assert.deepEqual(retiredMentions(files, read), [
    { file: files[0], line: 2, found: 'leads_to', instead: 'trigger' },
    { file: files[0], line: 3, found: '`enables`', instead: '`needs`' },
  ])
})

test('the English verb "enables" is left alone outside a code span', () => {
  assert.deepEqual(retiredMentions(['x.md'], () => 'the switch enables the pair\n'), [])
})
