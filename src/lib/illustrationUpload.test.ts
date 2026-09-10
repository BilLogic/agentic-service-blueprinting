import { describe, expect, it } from 'vitest'
import {
  illustrationPath,
  keysInSlideUploadFolder,
  slideUploadFolder,
} from '@/lib/illustrationUpload'

describe('slide upload storage paths', () => {
  it('puts each upload under slices/<sliceId>/<slideId>/ with a unique name', () => {
    const first = illustrationPath('slice-1', 'slide-1', 'image/png')
    const second = illustrationPath('slice-1', 'slide-1', 'image/png')
    expect(first).toMatch(/^slices\/slice-1\/slide-1\/.+\.png$/)
    expect(second).toMatch(/^slices\/slice-1\/slide-1\/.+\.png$/)
    expect(first).not.toEqual(second)
  })

  it('does not share a folder across sibling slides', () => {
    expect(slideUploadFolder('slice-1', 'slide-a')).not.toEqual(
      slideUploadFolder('slice-1', 'slide-b'),
    )
  })

  it('names every listed object for removal', () => {
    const folder = slideUploadFolder('slice-1', 'slide-1')
    expect(
      keysInSlideUploadFolder(folder, [{ name: 'a.png' }, { name: 'b.jpg' }]),
    ).toEqual([`${folder}/a.png`, `${folder}/b.jpg`])
  })
})
