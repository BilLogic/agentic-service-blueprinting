import { SAMPLE_NAV } from '@/data/sampleNav'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
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
const fallbackFirstPhaseId = getMainSlides(SAMPLE_NAV)[0]!.id

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

  it('cannot be asked without a nav', () => {
    // This used to be the defect: the helper defaulted to the sample nav, so
    // a call site that forgot to pass the loaded one silently got answers
    // about a board nobody was looking at — `LOADED_NAV[0]` false and
    // `LOADED_NAV[1]` true, both backwards. The default is gone, so that call
    // no longer compiles and the wrong answer has nowhere to come from.
    //
    // What is left to assert is that the sample is just another nav: handed
    // it, the helper answers about IT, with no special standing.
    const sampleFirst = getMainSlides(SAMPLE_NAV)[0]!
    expect(isOverviewFlowArrowAnchorPhase(sampleFirst, SAMPLE_NAV)).toBe(true)
    expect(isOverviewFlowArrowAnchorPhase(sampleFirst, LOADED_NAV)).toBe(false)
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
