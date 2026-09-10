import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const field = readFileSync(
  fileURLToPath(new URL('../components/editor/SlideImagesField.tsx', import.meta.url)),
  'utf8',
)

const presentation = readFileSync(
  fileURLToPath(new URL('../components/editor/SlicePresentation.tsx', import.meta.url)),
  'utf8',
)

describe('a slide shows a set of images', () => {
  it('labels the row Images, never Strip', () => {
    expect(field).toContain('Images\n')
    expect(field).not.toMatch(/\bStrip\b/)
  })

  it('sizes tiles as w-16 shrink-0', () => {
    expect(field).toContain('w-16 shrink-0')
  })

  it('ticks and unticks rather than choosing one member', () => {
    expect(field).toContain('aria-pressed={on}')
    expect(field).toContain('toggleCell(')
  })

  it('expands via ZoomableImage with siblings', () => {
    expect(field).toContain('ZoomableImage')
    expect(field).toContain('siblings={siblings}')
  })

  it('does not offer remove on cell frames', () => {
    expect(field).not.toMatch(/Remove this/)
  })

  it('never truncates presentation at 3', () => {
    expect(presentation).toContain('imagesThisSlideShows')
    expect(presentation).not.toContain('.slice(0, 3)')
  })
})
