import { describe, expect, it } from 'vitest'
import { BRAND } from '@/config'
import {
  BRAND_ACCENT_DIAL,
  applyBrandAccent,
  brandAccentHue,
  type StyleTarget,
} from '@/lib/brandAccent'

/**
 * The reader for `brand.accent`, and the one thing this template needs it to
 * do: nothing.
 *
 * `BRAND` here carries no accent — the kit's `--brand-*` ramp is greyscale, so
 * there is no hue for one to name — and `asbDefaultConfig` passes that absence
 * straight through. The assertion below is what makes that provable rather
 * than argued: the dial the theme files declare is never written, so a
 * standalone build paints exactly what its stylesheet says. It is the guard on
 * `config.ts` too, since the day somebody fills `BRAND.accent` in for a
 * template that still ships grey, this fails and says so.
 *
 * The accents measured further down are arbitrary colours, not any
 * installation's own: what is asserted is the arithmetic and the write, and a
 * real brand's hex in a shared file would read as data rather than a fixture.
 */

/** A root element that only remembers what was set on it. */
function fakeRoot(): StyleTarget & { written: Record<string, string> } {
  const written: Record<string, string> = {}
  return {
    written,
    style: {
      setProperty: (property: string, value: string) => {
        written[property] = value
      },
    } as StyleTarget['style'],
  }
}

describe('applyBrandAccent', () => {
  it('writes nothing for this template, whether the brand is passed or defaulted', () => {
    expect(BRAND.accent).toBeUndefined()

    const defaulted = fakeRoot()
    expect(applyBrandAccent(defaulted)).toBeUndefined()
    expect(defaulted.written).toEqual({})

    // The shape `DeploymentConfigProvider` passes: a block built from the
    // resolved config, whose accent field is present and undefined.
    const passed = fakeRoot()
    expect(applyBrandAccent(passed, { accent: BRAND.accent })).toBeUndefined()
    expect(passed.written).toEqual({})
  })

  it('writes an accent onto the dial as its own hue', () => {
    const root = fakeRoot()
    expect(applyBrandAccent(root, { accent: '#2E8B57' })).toBe(154.9)
    expect(root.written).toEqual({ [BRAND_ACCENT_DIAL]: '154.9' })
  })

  it('reads a three-digit hex, and throws on one it cannot read', () => {
    expect(brandAccentHue('#3C9')).toBe(165.4)
    expect(() => brandAccentHue('seafoam')).toThrow(/not a hex colour/)
  })
})
