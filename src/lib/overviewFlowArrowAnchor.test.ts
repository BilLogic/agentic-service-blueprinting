import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  FALLBACK_NAV,
  getMainSlides,
  isOverviewFlowArrowAnchorPhase,
  type NavItem,
} from '@/types/nav'

const overviewSource = readFileSync(
  fileURLToPath(
    new URL('../components/editor/ServiceOverviewView.tsx', import.meta.url),
  ),
  'utf8',
)

/*
  A loaded nav whose first phase is NOT the fallback's first, and whose second
  phase is. The anchor is the phase every flow arrow in the column aligns its
  centre to, so the two lists disagreeing is the whole question: resolve
  against the fallback and the second phase anchors a column drawn over the
  first.
*/
const fallbackFirstPhaseId = getMainSlides(FALLBACK_NAV)[0]!.id

const LOADED_NAV: NavItem[] = [
  { id: 'phase-intake', index: 1, label: 'Intake' },
  { id: fallbackFirstPhaseId, index: 2, label: 'Delivery' },
]

describe('overview flow-arrow anchor', () => {
  it('is the first main phase of the nav it is handed', () => {
    expect(isOverviewFlowArrowAnchorPhase(LOADED_NAV[0]!, LOADED_NAV)).toBe(
      true,
    )
    expect(isOverviewFlowArrowAnchorPhase(LOADED_NAV[1]!, LOADED_NAV)).toBe(
      false,
    )
  })

  it('answers about the fallback when it is handed nothing', () => {
    // Not a bug in the helper — its default is what makes the call site's
    // omission invisible, and this is the answer that omission produces.
    expect(isOverviewFlowArrowAnchorPhase(LOADED_NAV[0]!)).toBe(false)
    expect(isOverviewFlowArrowAnchorPhase(LOADED_NAV[1]!)).toBe(true)
  })

  it('is asked about the phases the overview loaded, not the fallback', () => {
    // Every call the overview makes, with its whitespace taken out. Omitting
    // the list is the defect, so the ARGUMENTS are what this reads — and a
    // second call site added without them fails here too.
    const calls = [
      ...overviewSource
        .replace(/\s+/g, '')
        .matchAll(/isOverviewFlowArrowAnchorPhase\(([^)]*)\)/g),
    ].map((call) => call[1])

    expect(calls).toEqual(['phase,slides,'])
  })
})
