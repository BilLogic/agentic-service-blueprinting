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

test('a redefined constraint reads as its LAST definition, across lines', () => {
  // Both halves of this were silent failures in 21000114000000.
  //
  // The rule used to be "exactly one definition, or throw", on the reasoning
  // that a redefinition should fail loudly rather than be read stale. But
  // dropping and re-adding the constraint is how an enum changes, so the rule
  // made the ordinary case an error. The file is generated in migration
  // order, so the last definition is the one a fresh database ends up with.
  const twice = [
    "constraint cell_triggers_kind_check check (kind in ('trigger','needs'))",
    "  add constraint cell_dependencies_kind_check",
    "  check (kind in ('leads_to', 'enables'));",
  ].join('\n')
  // ...and it is written across three lines, which the one-line pattern did
  // not match at all — so the sweep read the ORIGINAL constraint and reported
  // agreement with a column that had changed underneath it.
  assert.deepEqual(enforcedKinds(twice), ['leads_to', 'enables'])
  assert.throws(() => enforcedKinds('-- no constraint here\n'))
})

test('the documented values stop at the end of the enum sentence', () => {
  const row =
    '- `cell_dependencies.kind`: `leads_to` \\| `enables`. `leads_to` draws and' +
    ' `enables` does not, and neither is `trigger`.'
  assert.deepEqual(documentedKinds(row), ['leads_to', 'enables'])
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
  const read = () => 'a line\nthe tracer walks `trigger` edges\ndeep `needs` chains\n'
  assert.deepEqual(retiredMentions(files, read), [
    { file: files[0], line: 2, found: '`trigger`', instead: '`leads_to`' },
    { file: files[0], line: 3, found: '`needs`', instead: '`enables`' },
  ])
})

test('the English verb "needs" is left alone outside a code span', () => {
  assert.deepEqual(retiredMentions(['x.md'], () => 'a slice needs a cell\n'), [])
})

test('the database trigger these documents discuss is not a retired kind', () => {
  // `references/data-model.md` has a section on the integrity trigger
  // `cells_validate_path_match`. A bare word sweep read every line of it as a
  // dependency kind, which is why the subject is the code span and not the
  // word — narrowing the subject rather than dropping `trigger` from the list.
  const prose = 'The DB trigger cells_validate_path_match enforces, on insert:\n'
  assert.deepEqual(retiredMentions(['references/data-model.md'], () => prose), [])
})
