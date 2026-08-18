import { describe, expect, it } from 'vitest'
import {
  getPathColor,
  getPathDashArray,
  getPathDashArrayFromKey,
  getPathSectionBorderStyle,
} from '@/lib/pathColorTheme'

/**
 * Path identity has to survive both a monochrome print and a viewer who cannot
 * separate the hues (SC 1.4.1), so every path carries a stroke pattern as well
 * as a colour. The colour side is measured in `palette.test.ts`, which can
 * resolve the tokens against the stylesheet.
 */
describe('path identity', () => {
  it('gives every non-happy type a distinct dash pattern', () => {
    // Only the closed types resolve to their own `PATH_TYPE_DASH` entry. A
    // `named` path — and an `alternative` one with no registry entry — hashes
    // into the open set instead, so asking for its "type dash" measures the
    // hash rather than the type. Those are covered by the colour+dash pairing
    // assertion in palette.test.ts.
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

  it('separates two unregistered custom-named paths', () => {
    const a = { path_type: 'alternative', name: 'Alpha' } as const
    const b = { path_type: 'alternative', name: 'Beta' } as const
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
