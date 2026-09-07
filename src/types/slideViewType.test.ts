import { describe, expect, it } from 'vitest'
import { asSlideViewType, getSlideViewType } from '@/types/nav'

describe('asSlideViewType', () => {
  it('keeps the two stored tokens', () => {
    expect(asSlideViewType('stacked')).toBe('stacked')
    expect(asSlideViewType('merged')).toBe('merged')
  })

  it('reads the retired single as stacked — one path is one band', () => {
    expect(asSlideViewType('single')).toBe('stacked')
  })

  it('falls back to stacked for anything outside the CHECK', () => {
    expect(asSlideViewType('side-by-side')).toBe('stacked')
    expect(asSlideViewType('')).toBe('stacked')
  })
})

describe('getSlideViewType', () => {
  it('is the stored token, and stacked when a slide has none', () => {
    expect(
      getSlideViewType({ id: 's', index: 0, label: 'S', layout: 'merged' }),
    ).toBe('merged')
    expect(getSlideViewType({ id: 's', index: 0, label: 'S' })).toBe('stacked')
  })
})
