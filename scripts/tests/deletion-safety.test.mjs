#!/usr/bin/env node
/**
 * Deletion guardrails (phase 7).
 *
 * The plan's ordering rule is that no delete affordance ships before its
 * archive exists. These tests hold that rule and the two ways a confirm dialog
 * can quietly lie: undercounting the cascade, and implying an undo it cannot
 * perform.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
// Through the alias, not up two directories. A deployment reads the
// application out of `node_modules/agentic-service-blueprinting` and has no
// `src` to walk up into, so `../../src/lib/…` is a file that is not there and
// the suite cannot even load. `@/…` is the same pair of roots the build
// resolves, so this import lands on whichever one holds the application.
import {
  DELETION_NOUNS,
  confirmationMatches,
  deletionReadiness,
  readDeletionImpact,
  splitByRecoverability,
  summarizeImpact,
  summarizeSliceImpact,
} from '@/lib/deletionSafety.ts'

test('deleting is unavailable without the archive', () => {
  const result = deletionReadiness(false)
  assert.equal(result.canDelete, false)
  assert.match(result.reason, /could not be undone/)
})

test('deleting is available once the archive exists', () => {
  assert.deepEqual(deletionReadiness(true), { canDelete: true })
})

test('a slice with a null key is not counted as recoverable', () => {
  const { recoverable, unrecoverable } = splitByRecoverability([
    { slice_id: '1', title: 'Good', cell_keys: ['a/b/c/d/e'] },
    { slice_id: '2', title: 'Orphan', cell_keys: ['a/b/c/d/e', null] },
    { slice_id: '3', title: 'Blank', cell_keys: [''] },
  ])
  assert.deepEqual(recoverable.map((s) => s.title), ['Good'])
  assert.deepEqual(unrecoverable.map((s) => s.title), ['Orphan', 'Blank'])
})

/**
 * The inverted case. A slice is in this list *because* it loses cells, so no
 * keys at all is the least recoverable state there is — but `.some()` on an
 * empty array is false, which would have read as "nothing missing, fine".
 */
test('a slice with no keys at all is unrecoverable, not recoverable', () => {
  const { recoverable, unrecoverable } = splitByRecoverability([
    { slice_id: '1', title: 'No keys', cell_keys: [] },
  ])
  assert.deepEqual(recoverable, [])
  assert.deepEqual(unrecoverable.map((s) => s.title), ['No keys'])
})

test('the impact counts cells and arrows, and names affected slices', () => {
  const summary = summarizeImpact({
    label: 'Regular Customer',
    cell_count: 6,
    dependency_count: 4,
    affected_slices: [
      { slice_id: '1', title: 'Warm-up journey', cell_keys: ['k1'] },
    ],
  })
  assert.deepEqual(summary.facts, [
    { count: 6, noun: 'cell' },
    { count: 4, noun: 'arrow' },
  ])
  assert.match(summary.warnings[0], /1 slice will lose slides: “Warm-up journey”/)
})

test('unrecoverable slices are called out separately', () => {
  const { warnings } = summarizeImpact({
    label: 'Discovery',
    cell_count: 2,
    dependency_count: 0,
    affected_slices: [{ slice_id: '1', title: 'Old', cell_keys: [null] }],
  })
  assert.ok(!warnings.some((line) => /will lose slides/.test(line)))
  assert.ok(warnings.some((line) => /cannot be restored by undo/.test(line)))
})

/**
 * The dialog must not contradict itself in adjacent lines. "Nothing is
 * destroyed without a copy behind it" printed directly under "these slices
 * cannot be restored by undo" is two opposite claims, and the reassuring one
 * is the one that gets believed.
 */
test('the archive reassurance is qualified when some slices cannot come back', () => {
  const unqualified = summarizeImpact({
    label: 'Clean',
    cell_count: 3,
    dependency_count: 0,
    affected_slices: [{ slice_id: '1', title: 'Keyed', cell_keys: ['k1'] }],
  })
  assert.ok(unqualified.reassurances.some((line) => /nothing is destroyed/i.test(line)))

  const qualified = summarizeImpact({
    label: 'Lossy',
    cell_count: 3,
    dependency_count: 0,
    affected_slices: [{ slice_id: '1', title: 'Old', cell_keys: [null] }],
  })
  assert.ok(qualified.warnings.some((line) => /cannot be restored by undo/.test(line)))
  assert.ok(!qualified.reassurances.some((line) => /nothing is destroyed/i.test(line)))
  assert.ok(
    qualified.reassurances.some((line) => /not the slice slides named above/.test(line)),
  )
})

test('no arrows means no arrow count', () => {
  const summary = summarizeImpact({
    label: 'Step 1',
    cell_count: 1,
    dependency_count: 0,
    affected_slices: [],
  })
  assert.deepEqual(summary.facts, [{ count: 1, noun: 'cell' }])
  assert.deepEqual(summary.warnings, [])
})

/**
 * A slice delete must never lead with a cell count. Cells are the one thing it
 * does NOT destroy, and putting their number in the destruction column is the
 * scariest possible way to say "nothing happens to these".
 */
test('a slice delete counts slides, and says the cells survive', () => {
  const summary = summarizeSliceImpact({
    label: 'Customer journey',
    slide_count: 5,
    referenced_cell_count: 12,
  })
  assert.deepEqual(summary.facts, [{ count: 5, noun: 'slide' }])
  assert.ok(summary.reassurances.some((line) => /12 blueprint cells/.test(line)))
  assert.ok(summary.reassurances.some((line) => /stay exactly as they are/.test(line)))
})

test('a slice delete admits it has no archive behind it', () => {
  const { warnings } = summarizeSliceImpact({
    label: 'Empty',
    slide_count: 0,
    referenced_cell_count: 0,
  })
  assert.ok(warnings.some((line) => /no archive for slices/.test(line)))
})

/**
 * `lane` and `step` used to be unrepresentable here, because their
 * `deletion_impact` branch counted something other than what their delete
 * removed — a lane undercounted what its delete took several times over. The
 * predicates now address exactly what each delete takes, so both are
 * deletable and both need a noun for the confirm sentence.
 */
test('every deletable kind has a noun for the confirm sentence', () => {
  for (const kind of ['scenario', 'path', 'step', 'lane', 'slice']) {
    assert.ok(
      typeof DELETION_NOUNS[kind] === 'string' && DELETION_NOUNS[kind].length > 0,
      `${kind} has no noun`,
    )
  }
})

/**
 * The half of the fix that cannot be expressed in the type: `remove_step` is
 * path-scoped, so a step impact without its path has no true number to
 * report. Refusing beats guessing — an unscoped count would be an overcount,
 * and an overcount in a delete dialog reads as "this is bigger than it is".
 */
test('a step impact refuses without the path it is scoped to', async () => {
  await assert.rejects(
    async () => readDeletionImpact({}, 'step', 'some-step-id'),
    /path/i,
  )
})

test('the confirmation is exact and case-sensitive', () => {
  assert.equal(confirmationMatches('Happy Path', 'Happy Path'), true)
  assert.equal(confirmationMatches('  Happy Path  ', 'Happy Path'), true)
  assert.equal(confirmationMatches('happy path', 'Happy Path'), false)
  assert.equal(confirmationMatches('Happy', 'Happy Path'), false)
})

test('an empty label can never be confirmed', () => {
  assert.equal(confirmationMatches('', ''), false)
  assert.equal(confirmationMatches('   ', '   '), false)
})
