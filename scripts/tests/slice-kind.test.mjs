#!/usr/bin/env node
/**
 * Reading a slice's type off the selection.
 *
 * The type steers which sidebar group a slice lands in, so a wrong answer is
 * a slice nobody finds again. What is tested is that the shapes people
 * actually pick get the names people would give them — and that the
 * degenerate cases resolve one way rather than by whichever branch is first.
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
import { deriveSliceType, describeSliceType } from '@/lib/sliceKind.ts'

/** A fake grid: `id` is "step/lane". */
const at = (id) => {
  const [step, lane] = id.split('/')
  return { step, lane }
}
const derive = (ids) => deriveSliceType(ids, at)

test('one cell is a cell, whatever its position', () => {
  assert.equal(derive(['1/customer']), 'cell')
})

test('nothing picked has no shape to report', () => {
  assert.equal(derive([]), 'custom')
})

test('one lane across several steps is a journey', () => {
  assert.equal(derive(['1/customer', '2/customer', '3/customer']), 'journey')
})

test('one step across several lanes is a step', () => {
  assert.equal(derive(['2/customer', '2/staff', '2/tech']), 'step')
})

test('two cells in one lane and one step read as a journey, not a step', () => {
  // Degenerate: it satisfies both. Journey is what a reader would call two
  // cells sitting side by side in a lane, so the order of the checks is a
  // decision and not an accident.
  assert.equal(derive(['1/customer', '1/customer']), 'lane')
  assert.equal(derive(['1/customer', '2/customer']), 'journey')
})

test('cells scattered across lanes and steps are custom', () => {
  assert.equal(derive(['1/customer', '2/staff', '5/tech']), 'custom')
})

test('a cell whose position cannot be read makes the whole guess custom', () => {
  // Three unknowns all report lane null, which a Set happily calls "one
  // lane" — a slice confidently filed under LANE on no evidence is worse
  // than one filed under CUSTOM honestly.
  assert.equal(
    deriveSliceType(['a', 'b'], () => ({ step: null, lane: null })),
    'custom',
  )
  // One unknown among known positions also disqualifies the guess.
  assert.equal(
    deriveSliceType(['1/customer', 'gone'], (id) =>
      id === 'gone'
        ? { step: null, lane: null }
        : { step: '1', lane: 'customer' },
    ),
    'custom',
  )
})

test('the description counts cells and names the shape', () => {
  assert.equal(describeSliceType('journey', 3), '3 cells down one lane — a journey')
  assert.equal(describeSliceType('cell', 1), 'One cell, read closely')
  assert.equal(describeSliceType('step', 1), '1 cell across one moment — a step')
})
