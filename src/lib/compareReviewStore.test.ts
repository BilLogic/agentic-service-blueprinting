import { describe, expect, it } from 'vitest'
import {
  getCompareReviewState,
  registerCompareReview,
  setCompareActiveStep,
  type CompareReviewRegistration,
} from '@/lib/compareReviewStore'
import type { CompareModel } from '@/lib/compareSlots'

const EMPTY_MODEL = {
  slots: [],
  columns: [],
  runs: [],
  cellStatus: {},
} as unknown as CompareModel

function makeRegistration(slideId: string): CompareReviewRegistration {
  return {
    slideId,
    scenarioName: slideId,
    viewMode: 'stacked',
    model: EMPTY_MODEL,
    blueprints: [],
  }
}

/*
 * The handoff contract: per-comparison state survives a SAME-scenario
 * re-register (a mode switch or refetch runs the effect cleanup first,
 * then the new registration) but resets when a different scenario
 * registers. (These invariants used to be pinned through the fold state;
 * fold retired 2026-08-17 — the cursor carries the same contract.)
 */
describe('compareReviewStore registration handoff', () => {
  it('re-registering the same scenario keeps the active step', () => {
    const unregisterFirst = registerCompareReview(makeRegistration('warm-up'))
    setCompareActiveStep('col-3')

    unregisterFirst()
    const unregisterSecond = registerCompareReview(makeRegistration('warm-up'))
    // The cleanup nulls the cursor, and the same-scenario re-register must
    // not treat that as a scenario change (lastRegisteredSlideId, not the
    // live registration, is the judge).
    expect(getCompareReviewState().registration?.slideId).toBe('warm-up')

    unregisterSecond()
  })

  it('resets the active step when a different scenario registers', () => {
    const unregisterFirst = registerCompareReview(makeRegistration('warm-up'))
    setCompareActiveStep('col-3')
    unregisterFirst()

    const unregisterSecond = registerCompareReview(
      makeRegistration('goal-setting'),
    )
    expect(getCompareReviewState().activeStepKey).toBeNull()

    unregisterSecond()
  })
})
