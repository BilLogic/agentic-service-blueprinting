import { afterEach, describe, expect, it } from 'vitest'
import {
  configureStoryboardBorders,
  hasEmbeddedStoryboardFrame,
} from '@/lib/storyboardWalkthrough'

/*
  Whether a frame draws its own border is a fact about an installation's image
  FILES, and nothing in the blueprint records it: a cell carries the path, not
  the picture. So it is the one storyboard fact that reaches this module from
  the deployment config rather than from the board — the lanes a walkthrough
  steps through and the label each one carries are both read off the lanes
  themselves, and neither needs a seam.

  Reset after each case: the store is module state, the way the pin table and
  the cell budget are, and a test that leaves a list behind changes the next.
*/
afterEach(() => {
  configureStoryboardBorders()
})

describe('hasEmbeddedStoryboardFrame', () => {
  it('borders every frame when no deployment named any — the template state', () => {
    expect(hasEmbeddedStoryboardFrame('/artwork/first-batch/step-1.png')).toBe(
      false,
    )
  })

  it('matches a named path as a substring, so a deployment names a folder', () => {
    configureStoryboardBorders(['/first-batch/', '/second-batch/'])
    expect(hasEmbeddedStoryboardFrame('/artwork/first-batch/step-1.png')).toBe(
      true,
    )
    expect(hasEmbeddedStoryboardFrame('/artwork/second-batch/step-9.png')).toBe(
      true,
    )
    expect(hasEmbeddedStoryboardFrame('/artwork/third-batch/step-1.png')).toBe(
      false,
    )
  })

  it('replaces rather than merges, and an empty list is the template state', () => {
    configureStoryboardBorders(['/first-batch/'])
    configureStoryboardBorders(['/second-batch/'])
    expect(hasEmbeddedStoryboardFrame('/artwork/first-batch/step-1.png')).toBe(
      false,
    )

    configureStoryboardBorders([])
    expect(hasEmbeddedStoryboardFrame('/artwork/second-batch/step-9.png')).toBe(
      false,
    )
  })
})
