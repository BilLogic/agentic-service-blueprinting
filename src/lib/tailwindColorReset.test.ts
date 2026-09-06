import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { namesIn } from '@/lib/tokenModel'

/**
 * `unset-tw-colors.css` against Tailwind's own theme, in both directions.
 *
 * The reset is enforcement by construction — `text-gray-500` resolves to our
 * gray because the namespace is emptied before `colors.css` refills it — and it
 * is the one piece of token discipline that works without a lint rule. Which
 * makes the list itself load-bearing, and the list was wrong in the quiet
 * direction: `crimson`, `gold`, `tomato` and `scale` are our own family names,
 * never Tailwind's, so those four lines cleared nothing.
 *
 * A stale list fails silently either way — an unset for a family that does not
 * exist does nothing, and a missing unset leaves Tailwind's colour reachable
 * under a name we thought we owned. Neither shows up in compiled output as
 * anything but a colour nobody looked at, so the oracle is the framework
 * itself: `tailwindcss/theme.css`, read from `node_modules`, updated by the
 * upgrade that would otherwise break this.
 */

const require = createRequire(import.meta.url)

/** The colour families Tailwind's own theme layer defines. */
function tailwindFamilies(): Set<string> {
  const theme = readFileSync(require.resolve('tailwindcss/theme.css'), 'utf8')
  return new Set(
    [...theme.matchAll(/^\s*--color-([a-z]+)-\d+\s*:/gm)].map(
      (match) => match[1],
    ),
  )
}

/** The families `unset-tw-colors.css` empties. */
function resetFamilies(): Set<string> {
  return new Set(
    [...namesIn('unset-tw-colors.css')]
      .map((name) => /^--color-([a-z]+)-\*$/.exec(name)?.[1])
      .filter((family): family is string => Boolean(family)),
  )
}

/** The families `theme.css` registers a numbered ramp for. */
function ourFamilies(): Set<string> {
  return new Set(
    [...namesIn('theme.css')]
      .map((name) => /^--color-([a-z]+)-\d+$/.exec(name)?.[1])
      .filter((family): family is string => Boolean(family)),
  )
}

describe('the Tailwind colour reset', () => {
  it('reads all three sides', () => {
    // Without this, a selector or resolve change that emptied any one of them
    // would make both rules below pass by having nothing to compare.
    expect(tailwindFamilies().size).toBeGreaterThan(15)
    expect(resetFamilies().size).toBeGreaterThan(10)
    expect(ourFamilies().size).toBeGreaterThan(10)
  })

  it('unsets nothing Tailwind does not define', () => {
    const tailwind = tailwindFamilies()
    const noop = [...resetFamilies()].filter((f) => !tailwind.has(f)).sort()
    expect(noop).toEqual([])
  })

  it('unsets every family we redefine that Tailwind also defines', () => {
    const tailwind = tailwindFamilies()
    const reset = resetFamilies()
    const leaking = [...ourFamilies()]
      .filter((family) => tailwind.has(family) && !reset.has(family))
      .sort()
    expect(leaking).toEqual([])
  })
})
