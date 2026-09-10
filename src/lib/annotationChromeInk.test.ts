import { describe, expect, it } from 'vitest'
import {
  contrast,
  hslToRgb,
  resolveValue,
  type Rgb,
  type Theme,
} from '@/lib/tokenModel'

/**
 * The ink ladder for the annotation chrome, measured on the bar it sits on.
 *
 * The bar is the one surface in this design system that does not follow the
 * theme (`--background-annotation-chrome`, `semantic.css`), and it once
 * had no ink name at all: `CanvasAnnotationLayer` spelled absolute white
 * forty-four times, in eleven spellings at nine alphas, and the style guard
 * carried a written-down deferral saying so. Two things have to stay true of the ladder that replaced
 * those whites, and neither is checkable by reading the stylesheet.
 *
 * FIRST, mode invariance. Every rung derives from `--colors-white`, global.css's
 * fixed primitive, precisely so that a bar floating over a board of coloured
 * cells does not become one more thing that flips when the presentation stage
 * goes `.dark`. A rung quietly re-pointed at a themed name would still look
 * right in whichever mode its author had open. This asks the model for the
 * value under each theme and holds the two against each other, which is the
 * assertion that would have caught the `--surface-hue` defect.
 *
 * SECOND, contrast. The three inks are the only rungs that carry text, and each
 * one's job description says what it sits on: the chrome. Measuring is the
 * point — the tertiary rung is 55% white, which is the kind of number that gets
 * typed because it looked right, and it clears 4.5:1 by less than half a stop.
 *
 * Parameterised over the rung list rather than counted: adding a rung means
 * adding one string, and a census of "there are ten" would break on the next
 * one for no reason.
 */

/** Every rung of the ladder, ink first. */
const RUNGS = [
  '--foreground-annotation-chrome',
  '--foreground-annotation-chrome-secondary',
  '--foreground-annotation-chrome-tertiary',
  '--border-annotation-chrome-overlay',
  '--border-annotation-chrome-divider',
  '--border-annotation-chrome-selected',
  '--border-annotation-chrome',
  '--wash-annotation-chrome',
  '--wash-annotation-chrome-strong',
  '--ring-annotation-chrome',
  '--background-annotation-plate',
] as const

/** The three rungs that carry text, and so answer to a contrast floor. */
const INKS = [
  '--foreground-annotation-chrome',
  '--foreground-annotation-chrome-secondary',
  '--foreground-annotation-chrome-tertiary',
] as const

/** WCAG SC 1.4.3 for body-sized text. */
const FLOOR = 4.5

const THEMES: Theme[] = ['light', 'dark']

/** An `hsl(H S% L% / A)` value as a colour and an alpha. */
function parseHsl(value: string): { rgb: Rgb; alpha: number } {
  const parts =
    /hsla?\(\s*([\d.]+)(?:deg)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%\s*(?:\/\s*([\d.]+))?\s*\)/.exec(
      value,
    )
  if (!parts) throw new Error(`not an hsl() value: ${value}`)
  return {
    rgb: hslToRgb(Number(parts[1]), Number(parts[2]), Number(parts[3])),
    alpha: parts[4] === undefined ? 1 : Number(parts[4]),
  }
}

const resolve = (name: string, theme: Theme): string => {
  const value = resolveValue(name, theme)
  if (value === undefined) throw new Error(`not declared: ${name}`)
  return value
}

/** `fg` at its own alpha, composited over `bg`, the way the browser paints it. */
const over = (fg: { rgb: Rgb; alpha: number }, bg: Rgb): Rgb =>
  bg.map((channel, i) =>
    fg.alpha * fg.rgb[i] + (1 - fg.alpha) * channel,
  ) as unknown as Rgb

const chrome = (theme: Theme): Rgb =>
  parseHsl(resolve('--background-annotation-chrome', theme)).rgb

describe('the annotation chrome ink ladder', () => {
  it.each(RUNGS)('%s holds one value across both themes', (rung) => {
    const [light, dark] = THEMES.map((theme) => resolve(rung, theme))
    expect(dark).toBe(light)
  })

  it.each(RUNGS)('%s is opaque white dialled by alpha alone', (rung) => {
    // The ladder is one material at nine strengths. A rung that drifted onto a
    // different hue or lightness would still be mode-invariant, and would still
    // pass the test above.
    for (const theme of THEMES) {
      expect(parseHsl(resolve(rung, theme)).rgb).toEqual([1, 1, 1])
    }
  })

  describe.each(THEMES)('%s', (theme) => {
    it.each(INKS)('%s clears the text floor on the bar', (ink) => {
      const ground = chrome(theme)
      const painted = over(parseHsl(resolve(ink, theme)), ground)
      expect(contrast(painted, ground)).toBeGreaterThanOrEqual(FLOOR)
    })
  })
})
