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
  it('gives every non-happy kind a distinct dash pattern', () => {
    // Only the closed kinds resolve to their own `PATH_TYPE_DASH` entry. A
    // path with no registry entry hashes into the open set instead, so asking
    // for its "kind dash" measures the hash rather than the kind. Those are
    // covered by the colour+dash pairing assertion in palette.test.ts.
    //
    // THREE kinds since 21000116000000, not four: `unhappy` and `alternative`
    // were one kind under two names, and they are now one dash. Two paths that
    // used to differ by kind alone still read apart, because the registry keys
    // on kind AND name — `variant:Sad Path` and `variant:Alternate Path` are
    // separate entries, and that separation was always doing the work.
    const closed = [
      { kind: 'happy', name: 'Happy Path' },
      { kind: 'variant', name: 'Sad Path' },
      { kind: 'exception', name: 'Boom' },
    ] as const
    const dashes = closed.map(getPathDashArray)
    expect(dashes[0]).toBeUndefined() // happy stays solid
    const nonHappy = dashes.slice(1)
    expect(new Set(nonHappy).size).toBe(nonHappy.length)
  })

  it('separates two unregistered custom-named paths', () => {
    const a = { kind: 'variant', name: 'Alpha' } as const
    const b = { kind: 'variant', name: 'Beta' } as const
    // They may share a hue slot, but not both a hue and a dash.
    const same =
      getPathColor(a) === getPathColor(b) &&
      getPathDashArray(a) === getPathDashArray(b)
    expect(same).toBe(false)
  })

  it('reads the same dash from a colour key as from the path', () => {
    const path = { kind: 'variant', name: 'Sad Path' } as const
    expect(getPathDashArrayFromKey('variant:Sad Path')).toBe(
      getPathDashArray(path),
    )
    // Bare key with no colon is the legacy default-path form.
    expect(getPathDashArrayFromKey('happy')).toBeUndefined()
  })

  it('dashes the section frame for every type except happy', () => {
    expect(
      getPathSectionBorderStyle({ kind: 'happy', name: 'Happy Path' })
        .borderStyle,
    ).toBe('solid')
    expect(
      getPathSectionBorderStyle({ kind: 'exception', name: 'Boom' })
        .borderStyle,
    ).toBe('dashed')
  })
})
