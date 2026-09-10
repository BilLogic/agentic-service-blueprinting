import { describe, expect, it } from 'vitest'
import {
  ANNOTATION_FILL_SWATCHES,
  ANNOTATION_PEN_SWATCHES,
  ANNOTATION_STICKY_SWATCHES,
  ANNOTATION_STROKE_SWATCHES,
} from '@/lib/canvasAnnotations'
import { contrast, derivedFillInk, resolvePaletteToken } from '@/lib/tokenModel'

/**
 * The selected-swatch checkmark has to be visible on the swatch it marks.
 *
 * It was not. `isPaleAnnotationSwatch()` picked a frozen near-black ink for
 * every swatch but one, while the fills are theme-flipping ramp steps — so in
 * dark mode the check measured 1.13-1.20:1 on the step-300 fill row and
 * 1.33-1.72:1 on the step-500 sticky row, and the one "safe" swatch took the
 * `text-white` branch onto slate-1200, which flips to near-white in dark:
 * 1.17:1, white on white. Light mode failed too, on the step-1100 stroke row,
 * at 2.50:1 for violet.
 *
 * Four rows, two themes, and nothing looked at any of it, because a membership
 * test reads like a decision.
 *
 * The check is `aria-hidden` and the selected state is carried on
 * `aria-pressed`, so the applicable criterion is SC 1.4.11 (3:1 for a
 * non-text indicator) rather than 1.4.3. Every dark-mode value above failed
 * that lower bar by a wide margin too.
 *
 * These pairs cross primitive families — a slate ink on a violet fill — which
 * is where every colour defect found in this system so far has lived, and
 * exactly what the per-family sampling in `palette.test.ts` could not see.
 */

const ROWS = {
  'shape fill (step 300)': ANNOTATION_FILL_SWATCHES,
  'sticky (step 500)': ANNOTATION_STICKY_SWATCHES,
  'stroke (step 1100)': ANNOTATION_STROKE_SWATCHES,
  'pen (step 900)': ANNOTATION_PEN_SWATCHES,
} as const

/** SC 1.4.11 — a non-text indicator against its adjacent colour. */
const FLOOR = 3

describe.each(['light', 'dark'] as const)('%s', (theme) => {
  for (const [row, swatches] of Object.entries(ROWS)) {
    it.each([...swatches])(`${row}: %s carries a visible check`, (swatch) => {
      const fill = resolvePaletteToken(swatch, theme)
      expect(contrast(fill, derivedFillInk(fill))).toBeGreaterThanOrEqual(FLOOR)
    })
  }
})

describe('the swatch set as a whole', () => {
  it('has no pair the derivation cannot carry', () => {
    // The floor above is per-swatch; this is the same measurement stated as a
    // minimum, so a palette change that drags the weakest pair down names the
    // number it landed on rather than just failing one parameterised case.
    // Tightest today: pen `pink-900`, 3.36:1 in both themes.
    const all = Object.values(ROWS).flatMap((swatches) => [...swatches])
    const worst = Math.min(
      ...(['light', 'dark'] as const).flatMap((theme) =>
        all.map((swatch) => {
          const fill = resolvePaletteToken(swatch, theme)
          return contrast(fill, derivedFillInk(fill))
        }),
      ),
    )
    expect(worst).toBeGreaterThanOrEqual(FLOOR)
  })

  it('measures every swatch, so an empty row cannot pass', () => {
    const counts = Object.values(ROWS).map((swatches) => swatches.length)
    expect(counts).toEqual([10, 9, 10, 10])
  })
})
