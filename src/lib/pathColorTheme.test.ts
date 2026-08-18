import { describe, expect, it } from 'vitest'
import {
  getPathColor,
  getPathDashArray,
  getPathDashArrayFromKey,
  getPathSectionBorderStyle,
  getPathWashStyle,
} from '@/lib/pathColorTheme'

/**
 * Path identity has to survive both a monochrome print and a viewer who
 * cannot separate the hues (SC 1.4.1), so every path carries a stroke
 * pattern as well as a colour.
 */
describe('path identity', () => {
  it('gives every non-happy type a distinct dash pattern', () => {
    const closed = [
      { path_type: 'happy', name: 'Happy Path' },
      { path_type: 'unhappy', name: 'Sad Path' },
      { path_type: 'exception', name: 'Boom' },
      { path_type: 'alternative', name: 'Alternate Path' },
    ] as const
    const dashes = closed.map(getPathDashArray)
    expect(dashes[0]).toBeUndefined() // happy stays solid
    const nonHappy = dashes.slice(1)
    expect(new Set(nonHappy).size).toBe(nonHappy.length)
  })

  it('separates two unregistered alternative paths', () => {
    const a = { path_type: 'alternative', name: 'Alpha Detour' } as const
    const b = { path_type: 'alternative', name: 'Beta Detour' } as const
    // They may share a hue slot, but not both a hue and a dash.
    const same =
      getPathColor(a) === getPathColor(b) &&
      getPathDashArray(a) === getPathDashArray(b)
    expect(same).toBe(false)
  })

  it('reads the same dash from a colour key as from the path', () => {
    const path = { path_type: 'unhappy', name: 'Sad Path' } as const
    expect(getPathDashArrayFromKey('unhappy:Sad Path')).toBe(
      getPathDashArray(path),
    )
    // Bare key with no colon is the legacy default-path form.
    expect(getPathDashArrayFromKey('happy')).toBeUndefined()
  })

  it('dashes the section frame for every type except happy', () => {
    expect(
      getPathSectionBorderStyle({ path_type: 'happy', name: 'Happy Path' })
        .borderStyle,
    ).toBe('solid')
    expect(
      getPathSectionBorderStyle({ path_type: 'exception', name: 'Boom' })
        .borderStyle,
    ).toBe('dashed')
  })
})

/**
 * Merged-view wash doctrine: path affiliation is a `background-image`
 * layered over the cell face's own background (bounds + radius inherited,
 * never a separate tint box), at 16% color-mix in oklab — 24% repainted the
 * cell, 10% was invisible. The lane colour stays the primary identity.
 */
describe('getPathWashStyle', () => {
  it('returns nothing for no member colours (fully-shared cells carry no wash)', () => {
    expect(getPathWashStyle(undefined)).toBeUndefined()
    expect(getPathWashStyle([])).toBeUndefined()
  })

  it('paints one member as a flat 16% oklab wash background-image', () => {
    const style = getPathWashStyle(['#10B981'])
    expect(style).toBeDefined()
    expect(style!.backgroundImage).toContain('linear-gradient')
    expect(style!.backgroundImage).toContain(
      'color-mix(in oklab, #10B981 16%, transparent)',
    )
  })

  it('paints N members as N equal vertical stripes', () => {
    const style = getPathWashStyle(['#10B981', '#3B82F6'])
    expect(style!.backgroundImage).toContain('90deg')
    expect(style!.backgroundImage).toContain('#10B981 16%, transparent) 0.00% 50.00%')
    expect(style!.backgroundImage).toContain('#3B82F6 16%, transparent) 50.00% 100.00%')
  })
})
