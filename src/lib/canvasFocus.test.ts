import { describe, expect, it } from 'vitest'
import { getCanvasFocusFitInsets } from '@/lib/canvasFocus'

describe('canvas focus framing', () => {
  it('centers focused content inside symmetric control clearance', () => {
    const insets = getCanvasFocusFitInsets('detail')

    expect(insets.topInset).toBe(insets.bottomInset)
  })

  it('keeps the overview centered without overlay clearance', () => {
    expect(getCanvasFocusFitInsets('home')).toMatchObject({
      topInset: 0,
      bottomInset: 0,
    })
  })
})
