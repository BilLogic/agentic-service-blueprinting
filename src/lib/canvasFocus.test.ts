import { describe, expect, it } from 'vitest'
import { getCanvasFocusFitInsets } from '@/lib/canvasFocus'

describe('canvas focus framing', () => {
  it('centers focused content inside symmetric control clearance', () => {
    const insets = getCanvasFocusFitInsets('detail')

    expect(insets.topInset).toBe(insets.bottomInset)
  })

  /*
    The phone's agent sheet stays open across a jump and covers the lower 60%
    of the screen. It REPLACES the control clearance rather than stacking on
    it — the controls sit inside the strip the sheet already hides, and adding
    the two would frame the target into a sliver.
  */
  it('takes the occluded bottom over the control clearance, not on top of it', () => {
    expect(getCanvasFocusFitInsets('detail', 420)).toMatchObject({
      topInset: 56,
      bottomInset: 420,
    })
  })

  it('ignores an occlusion smaller than the clearance it already keeps', () => {
    expect(getCanvasFocusFitInsets('detail', 12).bottomInset).toBe(
      getCanvasFocusFitInsets('detail').bottomInset,
    )
  })

  it('keeps the overview centered without overlay clearance', () => {
    expect(getCanvasFocusFitInsets('home')).toMatchObject({
      topInset: 0,
      bottomInset: 0,
    })
  })
})
