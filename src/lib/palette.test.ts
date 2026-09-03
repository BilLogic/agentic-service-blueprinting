import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CELL_STEP } from '@/lib/blueprintCellStyle'
import {
  PATH_TYPE_COLORS,
  getPathColor,
  getPathDashArray,
} from '@/lib/pathColorTheme'

/**
 * The app resolves every colour through `var()`, so nothing in the browser can
 * be measured from here. This suite resolves the same tokens against
 * `colors.css` and measures the pairs the interface actually renders.
 *
 * It replaces a runtime contrast solver that computed ring lightness per cell.
 * The solver only ever saw light mode — it took a hex fill, and dark mode never
 * produced one. Reading the stylesheet checks both themes, which is the part
 * that was missing rather than the part that was expensive.
 */

const COLORS_CSS = fileURLToPath(
  new URL('../styles/colors.css', import.meta.url),
)
const SEMANTIC_CSS = fileURLToPath(
  new URL('../styles/semantic.css', import.meta.url),
)
const LIGHT_THEME_CSS = fileURLToPath(
  new URL('../styles/themes/light.css', import.meta.url),
)
const DARK_THEME_CSS = fileURLToPath(
  new URL('../styles/themes/dark.css', import.meta.url),
)

type Rgb = [number, number, number]

function hslToRgb(h: number, s: number, l: number): Rgb {
  const sat = s / 100
  const light = l / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = light - c / 2
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  return [r + m, g + m, b + m]
}

/**
 * OKLCH → linear sRGB (Björn Ottosson's matrices). The brand tokens are the
 * one part of the system authored in OKLCH rather than picked off the HSL
 * ramps, so they need their own resolver; `resolve()` below only speaks
 * `--color-family-step`.
 */
function oklchToLinearSrgb(l: number, c: number, hDeg: number): Rgb {
  const h = (hDeg * Math.PI) / 180
  const a = c * Math.cos(h)
  const b = c * Math.sin(h)
  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  ]
}

const inSrgbGamut = (rgb: Rgb) => rgb.every((v) => v >= -1e-6 && v <= 1 + 1e-6)

/**
 * The other direction: gamma-encoded sRGB → OKLCH hue in degrees. Needed
 * because the `--brand-*` ramp is authored as HSL literals, so its OKLCH hue
 * — the thing `--primary` has to agree with — is not readable off the page.
 */
function oklchHue([r, g, b]: Rgb): number {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360
}

/** Gamma-encoded sRGB, so these values can meet the `Rgb` the solver expects. */
function oklch(l: number, c: number, hDeg: number): Rgb {
  return oklchToLinearSrgb(l, c, hDeg).map((v) => {
    const clamped = Math.min(1, Math.max(0, v))
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * clamped ** (1 / 2.4) - 0.055
  }) as Rgb
}

/** Largest in-gamut chroma at this lightness and hue, to 4dp. */
function chromaCeiling(l: number, hDeg: number): number {
  let lo = 0
  let hi = 0.5
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (inSrgbGamut(oklchToLinearSrgb(l, mid, hDeg))) lo = mid
    else hi = mid
  }
  return lo
}

function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (v: number) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  )
  return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2))
}

/** `--color-{family}-{step}` values for one theme, keyed `family-step`. */
function readScale(theme: 'light' | 'dark'): Map<string, Rgb> {
  const css = readFileSync(COLORS_CSS, 'utf8')
  const start = css.indexOf(theme === 'light' ? ':root {' : '@media screen {')
  const block = theme === 'light' ? css.slice(start, css.indexOf('@media screen {')) : css.slice(start)
  const scale = new Map<string, Rgb>()
  const declaration =
    /--color-([a-z]+)-(\d+):\s*hsla?\(\s*([\d.]+)(?:deg)?,\s*([\d.]+)%,\s*([\d.]+)%/g
  for (const [, family, step, h, s, l] of block.matchAll(declaration)) {
    scale.set(`${family}-${step}`, hslToRgb(Number(h), Number(s), Number(l)))
  }
  return scale
}

const THEMES = { light: readScale('light'), dark: readScale('dark') }

/** Resolve a `var(--color-family-step)` string against one theme. */
function resolve(token: string, theme: 'light' | 'dark'): Rgb {
  const match = /--color-([a-z]+-\d+)/.exec(token)
  if (!match) throw new Error(`not a palette token: ${token}`)
  const value = THEMES[theme].get(match[1])
  if (!value) throw new Error(`missing from colors.css: ${match[1]}`)
  return value
}

describe('palette', () => {
  it.each(['light', 'dark'] as const)('%s scale parsed', (theme) => {
    // A format change that broke the regex would otherwise make every
    // assertion below pass against an empty map.
    expect(THEMES[theme].size).toBeGreaterThan(180)
  })
})

describe('brand fill', () => {
  /*
   * `--primary` and everything derived from it are authored in OKLCH against
   * the per-theme dials — NOT off the HSL ramps — so this block resolves the
   * declarations on disk and measures what they compute to.
   *
   * The template ships the seam neutral (`--primary-chroma: 0`), so most of
   * what is asserted here is the DERIVATION rather than a particular colour:
   * a fork raises the chroma dial and these same assertions become the guard
   * that its brand fill is still legible. Two of them (the gamut headroom and
   * the ramp-hue agreement) are written to hold at chroma 0 and to bite the
   * moment a fork turns the dials up, which is exactly when they matter.
   */
  const semantic = readFileSync(SEMANTIC_CSS, 'utf8')
  const light = readFileSync(LIGHT_THEME_CSS, 'utf8')
  const dark = readFileSync(DARK_THEME_CSS, 'utf8')

  const dial = (css: string, name: string) => {
    const match = new RegExp(`--${name}:\\s*([\\d.]+)`).exec(css)
    if (!match) throw new Error(`dial not found: --${name}`)
    return Number(match[1])
  }

  const HUE = dial(light, 'hue')
  const SURFACE = dial(light, 'surface')

  // --primary: oklch(var(--primary-lightness) var(--primary-chroma) var(--primary-hue))
  const declared =
    /--primary:\s*oklch\(\s*var\(--primary-lightness\)\s+var\(--primary-chroma\)\s+var\(--primary-hue\)\s*\)/.exec(
      semantic,
    )
  if (!declared) {
    throw new Error(
      '--primary is no longer derived from the per-theme dials; the seam moved',
    )
  }

  const THEME_DIALS = {
    light: {
      L: dial(light, 'primary-lightness'),
      C: dial(light, 'primary-chroma'),
      ringL: dial(light, 'ring-lightness'),
      surface: SURFACE,
      css: light,
    },
    dark: {
      L: dial(dark, 'primary-lightness'),
      C: dial(dark, 'primary-chroma'),
      ringL: dial(dark, 'ring-lightness'),
      surface: dial(dark, 'surface'),
      css: dark,
    },
  } as const

  it('ships hue-neutral, so nothing inherits a previous brand', () => {
    // The one assertion that is about the TEMPLATE rather than the mechanism:
    // a fork that brands the app updates this expectation deliberately, which
    // is the point — a brand should never arrive by accident.
    expect(THEME_DIALS.light.C).toBe(0)
    expect(THEME_DIALS.dark.C).toBe(0)
    expect(dial(light, 'chroma')).toBe(0)
    expect(dial(dark, 'chroma')).toBe(0)
  })

  it('inverts the fill between themes, since a neutral one has to', () => {
    // A mode-invariant fill only works when chroma separates it from the
    // canvas. At chroma 0 the fill has to flip with the theme or it vanishes
    // into the surface it sits on.
    expect(THEME_DIALS.light.L).toBeLessThan(THEME_DIALS.light.surface)
    expect(THEME_DIALS.dark.L).toBeGreaterThan(THEME_DIALS.dark.surface)
  })

  it('sits on the brand ramp rather than beside it', () => {
    // A hue dial that drifts off the `--brand-*` ramp puts the filled control
    // on a different brand from every other surface in the app — the failure
    // this guard exists for. The ramp is authored as HSL literals, so it is
    // compared as CONVERTED. Greyscale steps carry no hue to compare, so the
    // check applies to whatever steps a fork has actually tinted.
    const steps = [
      ...light.matchAll(/--brand-(\d00):\s*([\d.]+)deg\s+([\d.]+)%\s+([\d.]+)%/g),
    ]
    expect(steps.length).toBeGreaterThanOrEqual(5)
    const tinted = steps.filter(([, , , s]) => Number(s) > 0)
    for (const [, , h, s, l] of tinted) {
      const hue = oklchHue(hslToRgb(Number(h), Number(s), Number(l)))
      expect(Math.abs(hue - HUE)).toBeLessThan(0.5)
    }
  })

  describe.each(['light', 'dark'] as const)('%s', (theme) => {
    const { L, C, ringL, surface } = THEME_DIALS[theme]
    const fill = oklch(L, C, HUE)
    const canvas = oklch(surface, 0, HUE)

    it('leaves the fill itself un-gamut-mapped', () => {
      // Headroom is why a fork should set chroma as a fraction of the ceiling
      // rather than at it: the browser silently chroma-reduces anything past
      // it, which makes the declared value a lie and freezes the next retune.
      expect(C).toBeLessThan(chromaCeiling(L, HUE) + Number.EPSILON)
      expect(inSrgbGamut(oklchToLinearSrgb(L, C, HUE))).toBe(true)
    })

    it('carries its ink at AAA', () => {
      // --primary-foreground: the hard flip
      //   oklch(from --primary clamp(0.205, (0.62 - l) * 100, 0.985) c*0.08 h)
      // — near-white ink on a dark fill, dark ink on a light one, with a trace
      // of the fill's own chroma so a branded fill's ink is not flat grey.
      const inkL = Math.min(0.985, Math.max(0.205, (0.62 - L) * 100))
      const ink = oklch(inkL, C * 0.08, HUE)
      expect(contrast(fill, ink)).toBeGreaterThanOrEqual(7)
    })

    it('keeps the focus ring legible on the canvas', () => {
      // SC 1.4.11. --ring: oklch(from --primary var(--ring-lightness) c*1.3 h).
      // Measure the GAMUT-MAPPED value: c*1.3 can sit over the ceiling once a
      // fork raises the chroma, and this would otherwise pass on a colour no
      // browser draws.
      const ring = oklch(
        ringL,
        Math.min(C * 1.3, chromaCeiling(ringL, HUE)),
        HUE,
      )
      expect(contrast(ring, canvas)).toBeGreaterThanOrEqual(3)
    })

    it('keeps the button hairline distinct from the fill it edges', () => {
      // --primary-border: oklch(from --primary calc(l - 0.12) calc(c*1.25) h).
      // The ×1.25 is often gamut-mapped away, so the edge is carried by the
      // lightness step alone — which means the lightness step has to hold.
      const borderL = L - 0.12
      const border = oklch(
        borderL,
        Math.min(C * 1.25, chromaCeiling(borderL, HUE)),
        HUE,
      )
      // 1.1, not the 1.4 a mid-lightness brand fill can hold: a NEUTRAL fill
      // sits near the end of the lightness range (0.205 light / 0.922 dark),
      // where a −0.12 step has little room left and no chroma to help. The
      // floor is here to catch the edge disappearing entirely, not to demand
      // a separation the neutral seam cannot physically produce.
      expect(contrast(border, fill)).toBeGreaterThan(1.1)
    })
  })
})

describe('blueprint cells', () => {
  // role → family, mirroring the [data-blueprint-lane] rules in blueprint.css.
  const lanes: ReadonlyArray<readonly [string, string]> = [
    ['storyboard', 'slate'],
    ['evidence', 'blue'],
    ['actor', 'green'],
    ['frontstage-touchpoint', 'violet'],
    ['frontstage-action', 'pink'],
    ['backstage-touchpoint', 'lime'],
    ['backstage-action', 'orange'],
    ['support', 'amber'],
  ]

  describe.each(['light', 'dark'] as const)('%s', (theme) => {
    it.each(lanes)('%s: ring reads against its own surface', (_lane, family) => {
      // SC 1.4.11 — the ring is the focus affordance and the slice-member
      // outline. Radix step 8 is specified to be legible on steps 1–5.
      const ring = resolve(`--color-${family}-${CELL_STEP.ring}`, theme)
      const surface = resolve(`--color-${family}-${CELL_STEP.surface}`, theme)
      expect(contrast(ring, surface)).toBeGreaterThanOrEqual(3)
    })

    it.each(lanes)('%s: text reads against its own surface', (_lane, family) => {
      const text = resolve(`--color-${family}-${CELL_STEP.text}`, theme)
      const surface = resolve(`--color-${family}-${CELL_STEP.surface}`, theme)
      expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5)
    })

    it.each(lanes)('%s: hover is distinguishable from rest', (_lane, family) => {
      const rest = resolve(`--color-${family}-${CELL_STEP.surface}`, theme)
      const hover = resolve(`--color-${family}-${CELL_STEP.hover}`, theme)
      expect(contrast(rest, hover)).toBeGreaterThan(1.03)
    })
  })
})

/**
 * The ink `[data-blueprint-fill]` derives for a fill, mirrored in JS.
 *
 * The CSS is `oklch(from <fill> clamp(0.12, calc((0.62 - l) * 100), 0.99)
 * calc(c * 0.08) h)` — Supabase's `*-foreground` formula. The clamp is a
 * step function in practice: any fill below L 0.62 gets L 0.99 ink, anything
 * above gets 0.12, because the multiplier is 100. Chroma drops to 8% so the
 * ink is tinted rather than stark, and the hue rides along.
 *
 * Mirrored here rather than asserted against one hard-coded ink, because a
 * hard-coded ink is exactly what this pairing replaced: `text-white` measured
 * 1.17-2.33:1 in dark mode, and a test that only knew about one value could
 * not have caught it.
 */
function derivedFillInk(fill: Rgb): Rgb {
  const [l, c, h] = oklchFromSrgb(fill)
  const inkL = Math.min(0.99, Math.max(0.12, (0.62 - l) * 100))
  return oklch(inkL, c * 0.08, h)
}

/** Gamma-encoded sRGB -> OKLCH triple (the inverse `oklch()` above needs). */
function oklchFromSrgb([r, g, b]: Rgb): [number, number, number] {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const l_ = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m_ = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s_ = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const B2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  return [L, Math.hypot(A, B2), ((Math.atan2(B2, A) * 180) / Math.PI + 360) % 360]
}

describe('path badges', () => {
  const paths = Object.entries(PATH_TYPE_COLORS)

  describe.each(['light', 'dark'] as const)('%s', (theme) => {
    it.each(paths)('%s pairs with legible derived ink', (_type, token) => {
      const fill = resolve(token, theme)
      expect(contrast(fill, derivedFillInk(fill))).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe.each(['light', 'dark'] as const)('%s open set', (theme) => {
    // The type defaults were measured above, but a custom-named path draws
    // its badge from the open set — seven more fills that also render white
    // text.
    const open = [
      ...new Set(
        Array.from({ length: 40 }, (_, i) =>
          getPathColor({ kind: 'variant', name: `Path ${i}` }),
        ),
      ),
    ]
    it.each(open)('%s pairs with legible derived ink', (token) => {
      const fill = resolve(token, theme)
      expect(contrast(fill, derivedFillInk(fill))).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe.each(['light', 'dark'] as const)('%s divider tag', (theme) => {
    // Not a path colour, but the same `[data-blueprint-fill]` rule paints it —
    // and it was the worst of the `text-white` sites at 1.17:1 in dark mode.
    it('pairs with legible derived ink', () => {
      const fill = resolve('--color-slate-1200', theme)
      expect(contrast(fill, derivedFillInk(fill))).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('separates two unregistered custom-named paths', () => {
    const a = getPathColor({ kind: 'variant', name: 'Alpha' })
    const b = getPathColor({ kind: 'variant', name: 'Beta' })
    expect(a === b).toBe(false)
  })

  it('gives a custom-named path a dash off the open set, not the type default', () => {
    // The failure this replaces: every custom-named path fell through to its
    // type's one dash, so colour was the only channel telling them apart
    // (SC 1.4.1). They must instead hash into the open set, exactly like
    // their colour does — the pairing is asserted below.
    //
    // Distinctness ACROSS a roster is deliberately not asserted: the open set
    // is finite, so two names can share a slot, and the guarantee on offer is
    // that colour and dash travel together — never that colour separates two
    // paths a dash does not.
    const typeDefault = getPathDashArray({
      kind: 'variant',
      name: 'Alternate Path',
    })
    const named = [
      'Set Preferences',
      'Check Preferences',
      'Update Preferences',
    ].map((name) => getPathDashArray({ kind: 'variant', name }))
    expect(new Set(named).size).toBeGreaterThan(1)
    expect(named.every((dash) => dash !== undefined)).toBe(true)
    expect(typeDefault).toBe('12 5')
  })

  it('pairs a distinct dash with every family in the open set', () => {
    // Colour and dash hash off the same key, so the pattern is a real second
    // channel for SC 1.4.1 only if the two lists are the same length.
    const seen = new Map<string, string | undefined>()
    for (let i = 0; i < 40; i++) {
      const path = { kind: 'variant' as const, name: `Path ${i}` }
      const colour = getPathColor(path)
      const dash = getPathDashArray(path)
      if (seen.has(colour)) expect(seen.get(colour)).toBe(dash)
      else seen.set(colour, dash)
    }
    expect(new Set(seen.values()).size).toBe(seen.size)
  })
})

describe('lane roles and touchpoint tones stay disjoint', () => {
  const css = readFileSync(
    fileURLToPath(new URL('../styles/blueprint.css', import.meta.url)),
    'utf8',
  )
  const familiesIn = (attr: string) =>
    new Set(
      [
        ...css.matchAll(
          new RegExp(`\\[data-blueprint-${attr}='[a-z-]+'\\] \\{([^}]*)\\}`, 'g'),
        ),
      ].flatMap(([, body]) =>
        [...body.matchAll(/--color-([a-z]+)-/g)].map(([, f]) => f),
      ),
    )

  it('shares no family, so a pill can never read as its lane', () => {
    const lanes = familiesIn('lane')
    const tones = familiesIn('tone')
    expect(lanes.size).toBeGreaterThan(0)
    expect(tones.size).toBeGreaterThan(0)
    expect([...lanes].filter((f) => tones.has(f))).toEqual([])
  })

  it('keeps named paths off the lane families too', () => {
    // A custom-named path is drawn as a line across the lanes it touches.
    // Before the open set moved onto the tone families, most such paths
    // rendered in the hue of a lane they crossed.
    const lanes = familiesIn('lane')
    const pathFamilies = new Set(
      Array.from({ length: 40 }, (_, i) =>
        getPathColor({ kind: 'variant', name: `Path ${i}` }),
      ).map((token) => /--color-([a-z]+)-/.exec(token)![1]),
    )
    expect(pathFamilies.size).toBeGreaterThan(1)
    expect([...pathFamilies].filter((f) => lanes.has(f))).toEqual([])
  })
})

describe('interaction states', () => {
  const css = readFileSync(
    fileURLToPath(new URL('../styles/blueprint.css', import.meta.url)),
    'utf8',
  )
  /** Every `[data-blueprint-lane]` rule, as role → { property: family-step }. */
  const laneRules = [
    ...css.matchAll(/\[data-blueprint-lane='([a-z-]+)'\] \{([^}]*)\}/g),
  ].map(([, role, body]) => ({
    role,
    props: Object.fromEntries(
      [...body.matchAll(/(--[a-z-]+-blueprint-cell[a-z-]*):\s*var\(--color-([a-z]+-\d+)\)/g)]
        .map(([, prop, token]) => [prop, token]),
    ) as Record<string, string>,
  }))

  // Every property a lane role must define. Kept in step with the consumers:
  // a token nothing reads does not belong on the list, because then the test
  // is asserting the stylesheet against itself rather than against the app.
  const REQUIRED = [
    '--background-blueprint-cell',
    '--background-blueprint-cell-origin',
    '--background-blueprint-cell-hover',
    '--background-blueprint-cell-pressed',
    '--ring-blueprint-cell',
    '--ring-blueprint-cell-soft',
    '--foreground-blueprint-cell',
  ]

  it('defines every state on every lane role', () => {
    expect(laneRules).toHaveLength(8)
    for (const { role, props } of laneRules) {
      for (const key of REQUIRED) {
        expect(`${role}:${key}`).toBe(props[key] ? `${role}:${key}` : 'MISSING')
      }
    }
  })

  describe.each(['light', 'dark'] as const)('%s', (theme) => {
    it.each(laneRules.map((r) => [r.role, r] as const))(
      '%s: hover and pressed each move further from rest',
      (_role, { props }) => {
        const at = (key: string) =>
          THEMES[theme].get(props[key]) as [number, number, number]
        const rest = at('--background-blueprint-cell')
        // A state nobody can see is not a state.
        expect(contrast(rest, at('--background-blueprint-cell-hover'))).toBeGreaterThan(1.03)
        expect(
          contrast(rest, at('--background-blueprint-cell-pressed')),
        ).toBeGreaterThan(contrast(rest, at('--background-blueprint-cell-hover')))
      },
    )

    it.each(laneRules.map((r) => [r.role, r] as const))(
      '%s: text stays legible on the hover and pressed surfaces too',
      (_role, { props }) => {
        const at = (key: string) =>
          THEMES[theme].get(props[key]) as [number, number, number]
        const text = at('--foreground-blueprint-cell')
        expect(contrast(text, at('--background-blueprint-cell-hover'))).toBeGreaterThanOrEqual(4.5)
        expect(contrast(text, at('--background-blueprint-cell-pressed'))).toBeGreaterThanOrEqual(4.5)
      },
    )
  })
})
