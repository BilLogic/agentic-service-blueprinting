import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/*
  A slide shows a SET of images, in an order somebody chose.

  Three shapes led here, and each was wrong in a way the next one fixed.

  1. ONE image that REPLACED the strip, in silence. A slide could show
     something its own cells did not with nothing reporting it, which is why
     the instance dropped its copy of the column outright.

  2. One image, said out loud. Better, and still an exception dressed as a
     feature: an author with three uploads could show exactly one of them.

  3. A set. An author picks members — a cited cell's frame, one of their own
     images, or a mix — and an EMPTY set is the default, meaning the slide
     shows the frames of the cells it cites, which is what most slides do.

  These are source assertions rather than a render, because what is held is
  the vocabulary and the branches. A render test would pin the DOM of a card
  that is still being designed.
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

describe('a slide shows a set of images', () => {
  it('labels the row with the model’s word for it', () => {
    // Thumbnails and no label is a guess. `strip` is what the glossary calls
    // this, at a step and at a slide alike.
    expect(field).toContain('Strip\n')
  })

  it('ticks members rather than switching between two modes', () => {
    // The tick is a checkbox, and a checkbox is the whole claim: any mix of
    // cited frames and the slide's own images can be shown together.
    expect(field).toContain('role="checkbox"')
    expect(field).toContain('aria-checked={on}')
    expect(field).toContain("stripWith({ cellId }, !on)")
    expect(field).toContain("stripWith({ imageUrl: src }, !on)")
  })

  it('opens an image the way every other image in the app opens', () => {
    // The thumbnail's job is the viewer; the tick is a separate target.
    // Two meanings on one click would make both of them guesses.
    expect(field).toContain('<ZoomableImage')
    expect(field).toContain('siblings={siblings}')
  })

  it('draws a tile the same size whatever the count', () => {
    // `flex-1` made a lone `+` stretch to the card's whole width, which said
    // "this is a big empty thing" about a slide that simply has no frames.
    expect(field).toContain('w-16 shrink-0')
    expect(field).not.toContain('min-w-0 flex-1')
  })

  it('appends a tick rather than re-sorting what an author arranged', () => {
    expect(field).toContain(
      'return on ? [...current, member] : current.filter((entry) => !same(entry))',
    )
  })

  it('drops an image and its membership in one write', () => {
    // A member may only name an image the slide has, so dropping one and
    // leaving the other lands on a state the database refuses.
    expect(field).toContain('images: uploads.filter((candidate) => candidate !== src)')
    expect(field).toContain("strip: stripWith({ imageUrl: src }, false)")
  })

  it('falls back to the cited cells when nothing is chosen', () => {
    // Including when a chosen strip's members no longer resolve. The cells
    // are always a true answer about a slide; a blank stage is never an
    // informative one.
    expect(presentation).toContain('const chosen = resolveChosenStrip(blueprint, item)')
    expect(presentation).toContain(
      'chosen.length > 0 ? chosen : resolveSlideStrip(blueprint, item).slice(0, 3)',
    )
  })

  it('does not cap a strip somebody assembled', () => {
    // Three is a cap on a DERIVED list nobody picked. A strip an author
    // assembled shows what they assembled.
    expect(presentation).toContain('The chosen strip is NOT capped at three')
  })

  it('says what the slide is showing, in the model’s words', () => {
    expect(field).toContain('The slide shows the frames of the cells it cites.')
    expect(field).toContain('These cells carry no frames.')
    expect(field).toContain('The slide shows what is ticked, in the order it was ticked.')
  })
})
