import { describe, expect, it } from 'vitest'

import { normalizeEntityExamples } from '@/lib/serviceSpecMutations'

/**
 * What the entity-examples NORMALISER promises, exercised rather than read.
 *
 * The claim that would have caught the defect this path is written against:
 * that an emptied input drops its key rather than storing a blank. The read
 * renders a blank as nothing and an absent key as nothing, but only the absent
 * key is what a fresh deployment has, so the two must not diverge.
 *
 * The WRITE around it is no longer tested here. It was, against a hand-rolled
 * fake of the one chain it built — and the three claims that fake existed for
 * (the normalised map reaches the row, a write matching no row is a failure,
 * the undo carries the previous map) are now made for every spec level at once
 * in `specWrites.test.ts`, over the shared in-memory database. Two fakes of the
 * same PostgREST chain is the duplication that folded the six write modules
 * into one; keeping a second copy here to say the same thing about one of them
 * would be the same defect in the tests.
 */
describe('normalizeEntityExamples', () => {
  it('trims each value and drops the blanks', () => {
    expect(
      normalizeEntityExamples({
        service: '  The whole home retrofit  ',
        phase: '',
        scenario: '   ',
        path: 'The happy path',
      }),
    ).toEqual({
      service: 'The whole home retrofit',
      path: 'The happy path',
    })
  })

  it('keeps only the six known kinds, in canonical order', () => {
    const normalized = normalizeEntityExamples({
      lane: 'The installer lane',
      service: 'The whole retrofit',
      // A key no kind owns must not ride into the jsonb.
      touchpoint: 'not a core kind',
    } as never)
    expect(Object.keys(normalized)).toEqual(['service', 'lane'])
  })
})
