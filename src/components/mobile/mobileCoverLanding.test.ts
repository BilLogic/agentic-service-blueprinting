import { describe, expect, it } from 'vitest'
import { sourceOf } from '@/lib/sourceTree'

/**
 * THE ONE CLAIM OF THE PHONE'S FIRST LOAD THAT ONLY THE SOURCE CAN HOLD.
 *
 * This file's other two claims — the cover is the landing screen with the
 * drawer shut, and the phone's cover CTA opens the first scenario through the
 * shared seam — are DRIVEN now, by the first three taps of
 * `src/slices/phoneAgentJump.slice.test.tsx`, and they are gone from here
 * rather than asserted twice.
 *
 * The one below is not, and cannot be. It says the landing view is a view in
 * its own right and is NOT derived from an empty selection — the regression
 * it catches is the shell computing `landing` from "no scenario and no
 * phase", which makes the cover and the empty state the same screen and
 * brings the cover back the moment a selection is cleared. Nothing that runs
 * the shell can tell those two apart: the slice never reaches a both-null
 * selection after the cover, because every way off the cover selects
 * something and nothing in the flow deselects. A run that COULD reach it
 * would be a different flow and a different file's; until one exists, the
 * shape of the expression is the only place this claim lives.
 */
describe('the phone opens on the cover', () => {
  it('does not derive the landing view from an empty selection', () => {
    const shell = sourceOf('components/mobile/MobileShell.tsx')
    expect(shell).not.toMatch(
      /selectedScenarioId === null &&\s*selectedPhaseId === null/,
    )
  })
})
