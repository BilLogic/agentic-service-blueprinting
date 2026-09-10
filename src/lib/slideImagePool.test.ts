import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/*
  A slide keeps a POOL of images and chooses one of them, or none.

  It used to hold one uploaded image that, when set, replaced its whole strip.
  Two things were wrong with that, and only the first was ever written down.

  The written one: the substitution was silent. `21000115000000` kept the
  column and named what would settle it — "if it should later become an append
  to the strip rather than a substitute". Append turned out to be the wrong
  answer too: an author who wants ONE drawn image instead of three fragments
  is not asking for four.

  The unwritten one: an author who wanted the second frame ALONE could not ask
  at all. Two states, and the useful middle unreachable.

  These are source assertions rather than a render, because what is held is
  the vocabulary and the branches, and a render test would pin the DOM of a
  card that is still being designed.
*/

const field = readFileSync(
  fileURLToPath(
    new URL('../components/editor/SlideIllustrationField.tsx', import.meta.url),
  ),
  'utf8',
)

const presentation = readFileSync(
  fileURLToPath(
    new URL('../components/editor/SlicePresentation.tsx', import.meta.url),
  ),
  'utf8',
)

describe('a slide chooses from its images', () => {
  it('labels the row with the schema’s word for it', () => {
    // Three thumbnails and no label is a guess. `strip` is what the glossary
    // calls this, and the reader here is the reader who reads that.
    expect(field).toContain('Strip\n')
  })

  it('offers frames and uploads in ONE row, not as two modes', () => {
    // The whole point: a frame and an upload are both things the slide can
    // show, so they are both pressable and both live in the same list.
    expect(field).toContain('void showFrame(cellId)')
    expect(field).toContain('void showIllustration(src)')
    expect(field).toContain('void showStrip()')
  })

  it('lets an upload join the pool without displacing an earlier one', () => {
    // A single-valued column would drop every image after the first — the
    // loss `cell_touchpoints.screenshots` was made an array to stop.
    expect(field).toContain('illustrations: [...uploads, publicUrl]')
  })

  it('falls back to the strip when the shown image leaves the pool', () => {
    // The choice must be a member of the pool: a write that dropped one and
    // left the other would land on a state the check constraint refuses.
    expect(field).toContain(
      'activeIllustration: activeIllustration === src ? null : activeIllustration',
    )
  })

  it('counts the displaced frames from the cells rather than storing one', () => {
    // A remembered count goes stale the moment a slide's citations change
    // under it.
    expect(field).toContain('resolveSlideStrip(blueprint, slide)')
    expect(field).toContain('Standing in for ${frames.length} frame')
  })

  it('says so when the cells carry no frames at all', () => {
    // Previously invisible: a blank stage with no reason given.
    expect(field).toContain('These cells carry no frames.')
  })

  it('renders the strip whenever the slide made no choice', () => {
    // Including a choice that no longer resolves. The strip is always a true
    // answer about a slide; a blank stage is never an informative one.
    expect(presentation).toContain('const chosen = activeSlideImage(blueprint, item)')
    expect(presentation).toContain(
      'resolveSlideStrip(blueprint, item).slice(0, 3)',
    )
  })
})
