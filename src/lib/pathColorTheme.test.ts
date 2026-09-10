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
  it('gives every non-happy path its own dash pattern', () => {
    // The dash belongs to the PATH, not to its type. It used to belong to the
    // type — one entry each — which was fine while a scenario held at most one
    // path per type and wrong the moment one held several variants. Only
    // `happy` keeps a type dash, because a scenario can only ever have one.
    //
    // Dash uniqueness is load-bearing rather than decorative: an `exception`
    // takes the reserved type colour, so within a scenario the dash is the
    // ONLY channel separating one exception from another.
    const paths = [
      { kind: 'happy', name: 'Signs up without conflicts' },
      { kind: 'exception', name: 'Payment declined' },
      { kind: 'exception', name: 'Address unverifiable' },
      { kind: 'variant', name: 'Pays by invoice' },
    ] as const
    const dashes = paths.map(getPathDashArray)
    expect(dashes[0]).toBeUndefined() // happy stays solid
    const nonHappy = dashes.slice(1)
    expect(new Set(nonHappy).size).toBe(nonHappy.length)
  })

  it('holds a reserved type to its colour whatever the path is called', () => {
    // Green and red are spent so a reader can trust them without learning
    // anything, which only works if the name cannot override them. This is the
    // assertion that keeps the reservation real: `getPathColor` does not
    // consult the name for either type at all.
    expect(getPathColor({ kind: 'happy', name: 'Anything at all' })).toBe(
      getPathColor({ kind: 'happy', name: 'Something else entirely' }),
    )
    expect(getPathColor({ kind: 'exception', name: 'Payment declined' })).toBe(
      getPathColor({ kind: 'exception', name: 'Address unverifiable' }),
    )
  })

  it('tells two exceptions apart, though the reservation gives them one colour', () => {
    // What reserving a colour costs, stated as a test rather than left to be
    // discovered. Every exception on a board is the same fill by design, so
    // inside one scenario the dash is the ONLY channel a reader has for
    // telling one from another — which is why the dash is read from the path
    // and not, as it once was, from the type.
    const both = ['Payment declined', 'Address unverifiable'] as const
    const colours = both.map((name) => getPathColor({ kind: 'exception', name }))
    expect(new Set(colours).size).toBe(1) // one reserved colour, by design
    const dashes = both.map((name) =>
      getPathDashArray({ kind: 'exception', name }),
    )
    expect(new Set(dashes).size).toBe(2)
  })

  it('keeps a variant on one colour wherever it appears', () => {
    // The slot is keyed on the NAME alone. Keying it on `${kind}:${name}` is
    // what the retired registry did, and a re-type silently dropped a path out
    // of its entry and re-coloured it — with the dash moving too.
    const here = { kind: 'variant', name: 'Set Preferences' } as const
    const there = { kind: 'variant', name: 'Set Preferences' } as const
    expect(getPathColor(here)).toBe(getPathColor(there))
    expect(getPathDashArray(here)).toBe(getPathDashArray(there))
  })

  it('separates two unregistered custom-named paths', () => {
    const a = { kind: 'variant', name: 'Alpha' } as const
    const b = { kind: 'variant', name: 'Beta' } as const
    // They may share a hue slot — four families is not many — but not both a
    // hue and a dash. The pair is the guarantee.
    const same =
      getPathColor(a) === getPathColor(b) &&
      getPathDashArray(a) === getPathDashArray(b)
    expect(same).toBe(false)
  })

  it('separates two names built from the same letters', () => {
    // 'Alpha'/'Beta' above pass under any hash, including a plain character
    // sum — their letters differ. Anagrams are the case a sum cannot see, and
    // they are not hypothetical: two plausible names for sibling routes in one
    // scenario took the same colour AND the same dash under the sum this file
    // used to hash with.
    const a = { kind: 'variant', name: 'Check Preferences' } as const
    const b = { kind: 'variant', name: 'Preferences Check' } as const
    const same =
      getPathColor(a) === getPathColor(b) &&
      getPathDashArray(a) === getPathDashArray(b)
    expect(same).toBe(false)
  })

  it('reads the same dash from a colour key as from the path', () => {
    const path = { kind: 'exception', name: 'Payment declined' } as const
    expect(getPathDashArrayFromKey('exception:Payment declined')).toBe(
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
