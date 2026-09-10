import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/*
  An illustration on a slide REPLACES the strip of the cells it cites — set
  the column and `SlicePresentation` drops those frames entirely. The
  glossary promises the opposite: what a slide shows is the strip of the cells
  it cites, "so a slide and the board cannot disagree".

  They can. The behaviour is wanted — one drawn illustration instead of three
  fragments is what authors reach for — so what has to hold is not that the
  substitution stops, but that it is never SILENT. The instance that shipped
  this first dropped the column over exactly this, and its migration named the
  defect as the silence rather than the substitution: a slide could show
  something its own cells did not, "with nothing reporting the disagreement".

  These are source assertions rather than a render, because what is being held
  is the copy and the branches, and a render test would pin the DOM of a card
  that is still being designed.
*/

const source = readFileSync(
  fileURLToPath(
    new URL('../components/editor/SliceStoryboardField.tsx', import.meta.url),
  ),
  'utf8',
)

describe('a slide illustration says what it replaces', () => {
  it('offers the two states as a named choice, not an implication', () => {
    // A bare "add an image" button leaves the mode to be discovered by
    // tripping it. The pair says there are two, and which one is on.
    expect(source).toContain('<SegmentedControl')
    expect(source).toContain('value="frames"')
    expect(source).toContain('value="picture"')
  })

  it('counts the displaced frames from the cells rather than storing one', () => {
    // A remembered count goes stale the moment a slide's citations change
    // under it. `frames` is resolved on every render from the cited cells.
    expect(source).toContain('resolveSlideStrip(blueprint, slide)')
    expect(source).toContain('Standing in for ${frames.length} frame')
  })

  it('keeps the displaced frames on screen as the receipt', () => {
    // Dimmed rather than removed: the reader can see what the illustration is
    // standing in for without leaving the card.
    expect(source).toContain("current && 'opacity-45'")
  })

  it('says so when the cells carry no frames at all', () => {
    // Previously invisible in both directions — a blank stage with no reason
    // given, and an illustration that looked like it was replacing something.
    expect(source).toContain('These cells carry no frames.')
    expect(source).toContain('stands in for nothing')
  })

  it('does not reopen the file dialog when the active mode is re-selected', () => {
    // The segmented control fires on every activation, including one that
    // does not change the value.
    expect(source).toContain(
      "if (value === (current ? 'picture' : 'frames')) return",
    )
  })
})
