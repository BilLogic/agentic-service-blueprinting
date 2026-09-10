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
    expect(field).toContain('Remove this image')
    expect(field).not.toContain('Remove this frame')
  })

  it('lets an upload join the set on a unique path', () => {
    expect(field).toContain('joinUpload(publicUrl)')
    expect(field).toContain('illustrationPath(sliceId, itemId, file.type)')
    expect(field).toContain('upsert: false')
    expect(field).toContain('isRenderableImageSrc(publicUrl)')
  })

  it('never truncates presentation at 3', () => {
    expect(presentation).toContain('imagesThisSlideShows')
    expect(presentation).not.toContain('.slice(0, 3)')
  })
})
