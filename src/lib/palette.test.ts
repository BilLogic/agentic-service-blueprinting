import { describe, expect, it } from 'vitest'
import { BLUEPRINT_THEME } from '@/lib/blueprintTheme'
import {
  BLUEPRINT_LANE_ROLES,
  CELL_STEP,
  TOUCHPOINT_TONES,
} from '@/lib/blueprintCellStyle'
import {
  PATH_IDENTITY_PERIOD,
  PATH_KIND_COLORS,
  getPathColor,
  getPathDashArray,
} from '@/lib/pathColorTheme'
import {
  chromaCeiling,
  contrast,
  derivedFillInk,
  dial,
  inSrgbGamut,
  oklch,
  oklchFromSrgb,
  oklchToLinearSrgb,
  palette,
  resolveColor,
  resolveColorValue,
  resolvePaletteToken,
  resolveValue,
  stylesheet,
  type Rgb,
} from '@/lib/tokenModel'

/**
 * The app resolves every colour through `var()`, so nothing in the browser can
 * be measured from here. This suite resolves the same tokens against the
 * stylesheets and measures the pairs the interface actually renders.
 *
 * It replaces a runtime contrast solver that computed ring lightness per cell.
 * The solver only ever saw light mode — it took a hex fill, and dark mode never
 * produced one. Reading the stylesheet checks both themes, which is the part
 * that was missing rather than the part that was expensive.
 *
 * The colour maths, the ramps and the cascade all come from `tokenModel` now.
 * This file used to carry its own resolver — HSL and OKLCH conversions, a
 * `colors.css` reader, a contrast solver, and a dial reader that took the
 * first `--name:` match in one theme file. That last one is the shape retired
 * by the decision that one token model is the single style seam: it could tell
 * you what a file said and never what the cascade produced, which is a
 * different number wherever more than one rule declares a name. The maths
 * below is unchanged; the reader is shared, so widening it widens every rule
 * at once.
 */
const THEMES = { light: palette('light'), dark: palette('dark') }

/** Resolve a `var(--color-family-step)` string against one theme. */
const resolve = resolvePaletteToken

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
   * that its brand fill is still legible. The gamut-headroom one is written to
   * hold at chroma 0 and to bite the moment a fork turns the dials up, which
   * is exactly when it matters.
   */
  const semantic = stylesheet('semantic.css').text

  /*
   * The seam itself: `--primary` is still the three dials and nothing else.
   *
   * Asserted as a SHAPE rather than a value, because the value is what a fork
   * is invited to change. If someone replaces the derivation with a literal,
   * every dial below stops driving anything and the assertions in this block
   * would go on passing against numbers nothing reads.
   */
  it('is still derived from the per-theme dials', () => {
    expect(semantic).toMatch(
      /--primary:\s*oklch\(\s*var\(--primary-lightness\)\s+var\(--primary-chroma\)\s+var\(--primary-hue\)\s*\)/,
    )
  })

  /*
   * Every number below comes through the cascade, not off a page.
   *
   * `dial()` asks what wins at the root under a theme, which is a different
   * question from what one file says — and the difference is not academic
   * here. `print.css` declares `--hue`, `--surface` and eleven more dials
   * inside `@media print`, and `themes/light.css` declares most of them under
   * a bare `:root` that matches under dark as well. A reader that took the
   * first match in a file would answer both cases wrong.
   */
  const HUE = dial('--hue', 'light')

  const THEME_DIALS = {
    light: {
      L: dial('--primary-lightness', 'light'),
      C: dial('--primary-chroma', 'light'),
      ringL: dial('--ring-lightness', 'light'),
      surface: dial('--surface', 'light'),
      surfaceHue: dial('--surface-hue', 'light'),
    },
    dark: {
      L: dial('--primary-lightness', 'dark'),
      C: dial('--primary-chroma', 'dark'),
      ringL: dial('--ring-lightness', 'dark'),
      surface: dial('--surface', 'dark'),
      surfaceHue: dial('--surface-hue', 'dark'),
    },
  } as const

  it('runs both themes on one brand hue', () => {
    // A hue that differs between themes is a brand that changes when the
    // lights go out. The dial is mode-invariant by design and both theme
    // files say so in a comment; this is the part that holds them to it.
    expect(dial('--hue', 'dark')).toBe(HUE)
  })

  it('wears one identity in both themes, whatever a fork dials it to', () => {
    /*
     * This used to read `expect(THEME_DIALS.light.C).toBe(0)` four times over,
     * and its own comment conceded the point: "the one assertion that is about
     * the TEMPLATE rather than the mechanism … a fork updates this expectation
     * deliberately". An assertion a fork must edit is an assertion that does
     * not travel, and the greyscale seam is already stated where it belongs —
     * in `themes/light.css`, beside the dials themselves.
     *
     * What replaces it is the claim the number was standing in for. A brand
     * that changes saturation when the lights go out is two brands, exactly as
     * a brand that changes hue is — and the hue half of that is asserted
     * directly above. Held as a relation, it is true of the neutral template
     * (0 and 0) and of a branded deployment (0.135 and 0.135) alike, and it
     * fails for the thing either of them would get wrong.
     */
    expect(THEME_DIALS.dark.C).toBe(THEME_DIALS.light.C)
    expect(dial('--brand-chroma', 'dark')).toBe(dial('--brand-chroma', 'light'))
  })

  it('declares every chroma dial in both theme files, so none arrives by leak', () => {
    /*
     * The other half of "a brand should never arrive by accident", and the
     * half that is actually a mechanism: `themes/light.css` declares most of
     * its dials under a bare `:root`, which matches under dark as well. A dial
     * written in one file and not the other is inherited by the other mode
     * rather than chosen for it — and `light.css` says so in as many words
     * beside `--surface-hue`: a dial that arrives in the other mode by leak
     * reads the same as one that arrived by mistake.
     *
     * `--chroma` is on this list but NOT on the mode-invariance one above. It
     * tints the canvas rather than the identity, and a dark theme that wants a
     * breath of colour in its greys where the light one wants none is a real
     * choice rather than a drift — it just has to be a written one.
     */
    const themes = {
      light: stylesheet('themes/light.css').text,
      dark: stylesheet('themes/dark.css').text,
    }
    for (const name of ['--chroma', '--primary-chroma', '--brand-chroma']) {
      for (const [theme, text] of Object.entries(themes)) {
        expect(`${theme} declares ${name}`).toBe(
          new RegExp(`^\\s*${name}:`, 'm').test(text)
            ? `${theme} declares ${name}`
            : `${theme} inherits ${name}`,
        )
      }
    }
  })

  it('inverts the fill between themes, since a neutral one has to', () => {
    // A mode-invariant fill only works when chroma separates it from the
    // canvas. At chroma 0 the fill has to flip with the theme or it vanishes
    // into the surface it sits on.
    expect(THEME_DIALS.light.L).toBeLessThan(THEME_DIALS.light.surface)
    expect(THEME_DIALS.dark.L).toBeGreaterThan(THEME_DIALS.dark.surface)
  })

  it.each(['light', 'dark'] as const)(
    'puts the filled control and the identity on one hue: %s',
    (theme) => {
      // A filled control on a different brand from every other surface in the
      // app is the failure this guards. It used to be asked of a `--brand-*`
      // ramp of HSL literals sitting beside the dial, converted and compared;
      // the ramp is gone, because a stepped family is named for a hue and
      // never for a role, so the question is now asked of the two fills
      // themselves. They agree by construction — both read `--hue` — and this
      // is what holds them to it if one of them is ever given a hue of its
      // own.
      expect(resolveColorValue('--primary', theme).h).toBe(HUE)
      expect(resolveColorValue('--brand', theme).h).toBe(HUE)
    },
  )

  describe.each(['light', 'dark'] as const)('%s', (theme) => {
    const { L, C, ringL, surface, surfaceHue } = THEME_DIALS[theme]
    const fill = oklch(L, C, HUE)
    const canvas = oklch(surface, 0, surfaceHue)

    it('resolves to the triple its dials describe', () => {
      // The cascade's own answer, not a restatement of the dials: this is what
      // `--primary` computes to at the root under this theme, and it is the
      // value every measurement below is really about.
      const resolved = resolveValue('--primary', theme)
      expect(resolved).toBe(`oklch( ${L} ${C} ${HUE} )`)
    })

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
  /*
   * role → family, read off the `[data-blueprint-lane]` rules rather than
   * retyped beside them.
   *
   * The role half of a hand-typed pair was never read — every assertion below
   * takes the family and ignores the name — so the list could only ever be
   * measured against itself: a lane whose rule was missing from
   * `blueprint.css` went unmeasured while nine contrast checks passed against
   * the families the list still named. Reading the rules measures what is
   * drawn, and `interaction states` below holds the set of them to
   * `BLUEPRINT_LANE_ROLES`.
   */
  const lanes: ReadonlyArray<readonly [string, string]> = [
    ...stylesheet('blueprint.css').text.matchAll(
      /\[data-blueprint-lane='([a-z-]+)'\] \{[^}]*--background-blueprint-cell:\s*var\(--color-([a-z]+)-\d+\)/g,
    ),
  ].map(([, role, family]) => [role, family] as const)

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

/*
 * The ink `[data-blueprint-fill]` derives for a fill is mirrored in JS by
 * `derivedFillInk` in `tokenModel`, rather than asserted against one
 * hard-coded ink — a hard-coded ink is exactly what this pairing replaced.
 * `text-white` measured 1.17-2.33:1 in dark mode, and a test that only knew
 * about one value could not have caught it.
 */
describe('path badges', () => {
  const paths = Object.entries(PATH_KIND_COLORS)

  describe.each(['light', 'dark'] as const)('%s', (theme) => {
    it.each(paths)('%s pairs with legible derived ink', (_type, token) => {
      const fill = resolve(token, theme)
      expect(contrast(fill, derivedFillInk(fill))).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe.each(['light', 'dark'] as const)('%s open set', (theme) => {
    // The type defaults were measured above, but a variant draws its badge
    // from the open set — four more fills whose derived ink has to hold the
    // same floor.
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

  it('keeps the open set clear of the two reserved colours', () => {
    /*
     * The reservation is only worth what it costs if a reader never sees the
     * reserved hues used for anything else. Name-independence — that a
     * `happy` or an `exception` answers from its type and never looks at what
     * the path is called — is asserted in `pathColorTheme.test.ts`, where the
     * function lives. What is asserted HERE is the other half, and the half
     * that is about the palette: the set a variant is drawn from does not
     * contain either reserved colour, so nothing that is not a happy path can
     * come out looking like one.
     *
     * Compared by FAMILY rather than by token, because a variant drawn one
     * step off the happy path's green would still read as green. Both sides
     * are read off the module, so a fork that re-hues the whole thing is
     * measured on its own colours rather than on the template's.
     */
    const family = (token: string) => /--color-([a-z]+)-/.exec(token)![1]
    const reserved = new Set(
      (['happy', 'exception'] as const).map((kind) =>
        family(PATH_KIND_COLORS[kind]),
      ),
    )
    const open = new Set(
      Array.from({ length: 40 }, (_, i) =>
        family(getPathColor({ kind: 'variant', name: `Path ${i}` })),
      ),
    )
    expect([...open].filter((f) => reserved.has(f))).toEqual([])
  })

  it('gives every non-happy path a dash off the open set, not a type default', () => {
    // The failure this replaces: every named path fell through to its type's
    // one dash, so colour was the only channel telling them apart
    // (SC 1.4.1). Only `happy` keeps a type dash, because a scenario can only
    // ever hold one of those.
    //
    // Distinctness ACROSS a roster is deliberately not asserted: the open set
    // is finite, so two names can share a slot, and the guarantee on offer is
    // that colour and dash travel together — never that colour separates two
    // paths a dash does not.
    const named = [
      'Set Preferences',
      'Import Preferences',
      'Update Preferences',
    ].map((name) => getPathDashArray({ kind: 'variant', name }))
    expect(new Set(named).size).toBeGreaterThan(1)
    expect(named.every((dash) => dash !== undefined)).toBe(true)
    expect(
      getPathDashArray({ kind: 'happy', name: 'Anything at all' }),
    ).toBeUndefined()
  })

  it('draws one family with several patterns, so the dash carries its own information', () => {
    // Colour and dash index the same slot through lists of DIFFERENT length,
    // so a repeated colour lands on a different dash and the pair stays unique
    // for the lowest common multiple of the two — which, the lengths being
    // coprime, is their product.
    //
    // This used to assert the opposite: one colour, always one dash. That made
    // the second channel redundant with the first, which is the same as having
    // one — two paths sharing a colour shared a dash too and were
    // indistinguishable (SC 1.4.1).
    //
    // Both lengths are MEASURED off the module rather than retyped, so a fifth
    // family or an eighth pattern is caught here instead of quietly halving
    // the number of paths a board can draw apart.
    const sample = Array.from(
      { length: 400 },
      (_, i) => ({ kind: 'variant' as const, name: `Path ${i}` }),
    )
    const colours = new Set(sample.map(getPathColor)).size
    const dashes = new Set(sample.map(getPathDashArray)).size
    expect(colours * dashes).toBe(PATH_IDENTITY_PERIOD)

    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
    expect(gcd(colours, dashes)).toBe(1)

    // Coprime lengths are the claim; this is the consequence a reader cares
    // about — one family is drawn with more than one pattern, so the pattern
    // is carrying information the hue does not.
    const perColour = new Map<string, Set<string | undefined>>()
    for (const path of sample) {
      const colour = getPathColor(path)
      const seen = perColour.get(colour) ?? new Set()
      seen.add(getPathDashArray(path))
      perColour.set(colour, seen)
    }
    expect(
      [...perColour.values()].every((patterns) => patterns.size > 1),
    ).toBe(true)
  })
})

/**
 * Board chrome — the ink-on-ground pairs the frame actually renders.
 *
 * These are CROSS-FAMILY pairs: a gray ink on a slate ground. Every other
 * assertion in this file measures a pair whose halves come from the same
 * primitive family, which is the sampling that let the divider caption run at
 * 2.64:1 inside a file that measures contrast a hundred times. A guard picks
 * the region where its property already holds unless something makes it look
 * elsewhere.
 *
 * The floor is 4.5:1 because both of these are text, and small text: the
 * divider caption is an uppercase badge at the bottom of the type scale.
 * Neither is anywhere near the large-text threshold.
 */
describe.each(['light', 'dark'] as const)('board chrome: %s', (theme) => {
  const pairs: ReadonlyArray<readonly [string, string, string]> = [
    [
      'divider caption',
      BLUEPRINT_THEME.dividerLabel,
      BLUEPRINT_THEME.dividerBg,
    ],
    ['label rail header', BLUEPRINT_THEME.headerText, BLUEPRINT_THEME.labelRail],
  ]

  it.each(pairs)('%s clears AA on its own row', (_name, ink, ground) => {
    expect(
      contrast(resolve(ink, theme), resolve(ground, theme)),
    ).toBeGreaterThanOrEqual(4.5)
  })
})

describe('lane roles and touchpoint tones stay disjoint', () => {
  const css = stylesheet('blueprint.css').text
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

  it('shares no family, so a touchpoint can never read as its lane', () => {
    const lanes = familiesIn('lane')
    const tones = familiesIn('tone')
    expect(lanes.size).toBeGreaterThan(0)
    expect(tones.size).toBeGreaterThan(0)
    expect([...lanes].filter((f) => tones.has(f))).toEqual([])
  })

  it('keeps the open set off the lane families', () => {
    // A variant is drawn as a line across the lanes it touches. Before the
    // open set moved onto the tone families, most such paths rendered in the
    // hue of a lane they crossed.
    const lanes = familiesIn('lane')
    const pathFamilies = new Set(
      Array.from({ length: 40 }, (_, i) =>
        getPathColor({ kind: 'variant', name: `Path ${i}` }),
      ).map((token) => /--color-([a-z]+)-/.exec(token)![1]),
    )
    expect(pathFamilies.size).toBeGreaterThan(1)
    expect([...pathFamilies].filter((f) => lanes.has(f))).toEqual([])
  })

  /*
   * The claim this file used to make, and the one it can actually hold.
   *
   * The test above was titled "keeps NAMED paths off the lane families" and
   * sampled forty synthetic names all hard-coded to `kind: 'variant'`.
   * `getPathColor` short-circuits every other kind straight to
   * `PATH_KIND_COLORS`, so the sample could only ever produce the open
   * families — the one set that is disjoint from the lanes by construction.
   * `happy` and `exception` were structurally unreachable through it, and
   * `happy` is green against the green `actor` lane.
   *
   * Widening the sample fails, and that failure is the finding. The honest fix
   * is to narrow the claim rather than reshuffle the palette: nine lane
   * families plus seven touchpoint tones is sixteen, and there is no spare
   * hue for green to move to. What CAN be held is that the overlap is exactly
   * ONE, known, and drawn at a weight nothing can confuse with a lane fill.
   *
   * It was two until the open set reserved green and red. `variant` was blue
   * against the blue `evidence` lane, and unlike green it had somewhere to go:
   * a variant reads the open set now, and the type entry it falls back to
   * moved onto that set's first family. One overlap is a fact about a full
   * palette; two was a fact about nobody having looked.
   */
  const KNOWN_LANE_OVERLAP = ['happy']

  it('has exactly one path type sharing a lane family, and names it', () => {
    const lanes = familiesIn('lane')
    const overlapping = Object.entries(PATH_KIND_COLORS)
      .filter(([, token]) => lanes.has(/--color-([a-z]+)-/.exec(token)![1]))
      .map(([type]) => type)
    expect(overlapping).toEqual(KNOWN_LANE_OVERLAP)
  })

  it('draws that overlap at a different weight from the lane it crosses', () => {
    // What makes the one collision survivable: the path is a line at the text
    // step, the lane is a fill six steps lighter. Same family, nothing like
    // the same colour.
    const laneFill = Number(CELL_STEP.surface)
    for (const type of KNOWN_LANE_OVERLAP) {
      const step = Number(
        /--color-[a-z]+-(\d+)/.exec(
          PATH_KIND_COLORS[type as keyof typeof PATH_KIND_COLORS],
        )![1],
      )
      expect(step).toBeGreaterThan(laneFill)
    }
  })

  /*
   * The constraint nobody had written down: the palette is FULL.
   *
   * Nine families to lanes, seven to touchpoint tones, sixteen in all and
   * nothing spare — `partner-action` took the one spare family the count used
   * to hold in reserve. It is invisible until someone tries to add a tenth
   * lane and finds there is nowhere for it to go — and it is the reason the
   * fix above is a narrowed claim rather than a reallocation.
   */
  it('states its own allocation, so a tenth lane fails before it is drawn', () => {
    const lanes = familiesIn('lane')
    const tones = familiesIn('tone')
    expect(lanes.size).toBe(9)
    expect(tones.size).toBe(7)
    expect(new Set([...lanes, ...tones]).size).toBe(16)
  })
})

/*
 * Lanes AND touchpoint tones. The tones used to get set membership and a
 * `size > 0` guard while the lanes got a completeness check plus hover,
 * pressed, ring and text contrast in both themes — and the gap was
 * structural, not incidental: the regex below matched
 * `[data-blueprint-lane=…]` only, so all seven tones were excluded from every
 * contrast assertion in the file. Seven of our sixteen allocated families were
 * exempt from every check. They set the same seven properties from the same
 * ramps and render as cell surfaces exactly the way lanes do; there was never
 * a reason beyond the shape of one regex.
 */
describe.each([
  ['lane', BLUEPRINT_LANE_ROLES],
  ['tone', TOUCHPOINT_TONES],
] as const)('interaction states: %s', (attr, roster) => {
  const css = stylesheet('blueprint.css').text
  /** Every `[data-blueprint-*]` rule, as role → { property: family-step }. */
  const roleRules = [
    ...css.matchAll(
      new RegExp(`\\[data-blueprint-${attr}='([a-z-]+)'\\] \\{([^}]*)\\}`, 'g'),
    ),
  ].map(([, role, body]) => ({
    role,
    props: Object.fromEntries(
      [
        ...body.matchAll(
          /(--[a-z-]+-blueprint-cell[a-z-]*):\s*var\(--color-([a-z]+-\d+)\)/g,
        ),
      ].map(([, prop, token]) => [prop, token]),
    ) as Record<string, string>,
  }))

  // Every property a role must define. Kept in step with the consumers: a
  // token nothing reads does not belong on the list, because then the test is
  // asserting the stylesheet against itself rather than against the app.
  const REQUIRED = [
    '--background-blueprint-cell',
    '--background-blueprint-cell-hover',
    '--background-blueprint-cell-pressed',
    '--ring-blueprint-cell',
    '--foreground-blueprint-cell',
  ]

  it('defines every state on every role', () => {
    // The exported roster is asserted, not merely counted. A count of nine
    // cannot tell nine roles apart from nine typos, and the attribute these
    // selectors match is written by `blueprintLaneAttrs` /
    // `blueprintToneAttrs` from a member of that roster — so a role added to
    // the type without a CSS block, and a selector renamed out of the
    // vocabulary, both fail here rather than rendering an unstyled row.
    expect(roleRules.map(({ role }) => role).sort()).toEqual([...roster].sort())
    for (const { role, props } of roleRules) {
      for (const key of REQUIRED) {
        expect(`${role}:${key}`).toBe(props[key] ? `${role}:${key}` : 'MISSING')
      }
    }
  })

  describe.each(['light', 'dark'] as const)('%s', (theme) => {
    it.each(roleRules.map((r) => [r.role, r] as const))(
      '%s: hover and pressed each move further from rest',
      (_role, { props }) => {
        const at = (key: string) =>
          THEMES[theme].get(props[key]) as [number, number, number]
        const rest = at('--background-blueprint-cell')
        // A state nobody can see is not a state.
        expect(
          contrast(rest, at('--background-blueprint-cell-hover')),
        ).toBeGreaterThan(1.03)
        expect(
          contrast(rest, at('--background-blueprint-cell-pressed')),
        ).toBeGreaterThan(
          contrast(rest, at('--background-blueprint-cell-hover')),
        )
      },
    )

    it.each(roleRules.map((r) => [r.role, r] as const))(
      '%s: text stays legible on the hover and pressed surfaces too',
      (_role, { props }) => {
        const at = (key: string) =>
          THEMES[theme].get(props[key]) as [number, number, number]
        const text = at('--foreground-blueprint-cell')
        expect(
          contrast(text, at('--background-blueprint-cell-hover')),
        ).toBeGreaterThanOrEqual(4.5)
        expect(
          contrast(text, at('--background-blueprint-cell-pressed')),
        ).toBeGreaterThanOrEqual(4.5)
      },
    )
  })
})

/**
 * How far apart two rendered colours are, in the space they are authored in.
 *
 * OKLab is near enough uniform that a Euclidean distance in it is a perceptual
 * one, and unlike a contrast ratio it counts a hue step and a chroma step as
 * separation rather than seeing lightness alone. Both colours are the
 * GAMUT-MAPPED ones: two triples the browser chroma-reduces onto each other
 * are one colour on the screen whatever the dials said.
 */
const perceptualDistance = (a: Rgb, b: Rgb) => {
  const lab = (rgb: Rgb) => {
    const [l, c, h] = oklchFromSrgb(rgb)
    const radians = (h * Math.PI) / 180
    return [l, c * Math.cos(radians), c * Math.sin(radians)] as const
  }
  const [al, aa, ab] = lab(a)
  const [bl, ba, bb] = lab(b)
  return Math.hypot(al - bl, aa - ba, ab - bb)
}

/**
 * One just-noticeable difference, and the floor for 'these are two colours'.
 *
 * A fact about eyes rather than about this palette, which is what lets it
 * travel — no brand is named by it and none can be tuned around it. The
 * neutral template clears it by an order of magnitude, a deployment that
 * gives both fills one accent and separates them by lightness alone clears it
 * comfortably, and a palette that dials one fill onto the other lands at zero
 * and fails.
 */
const JUST_NOTICEABLE = 0.02

/**
 * Identity and action are two fills.
 *
 * `--brand` and `--primary` share the accent hue and nothing else. If they
 * resolve to one colour the split is decoration, and every component that
 * reaches for one of them is really reaching for the other.
 *
 * Measured off the cascade rather than recomputed from the dials, so a change
 * to the derivation is visible here rather than mirrored here.
 */
describe.each(['light', 'dark'] as const)('brand fill: %s', (theme) => {
  const brand = resolveColor('--brand', theme)
  const primary = resolveColor('--primary', theme)

  it('is a different colour from the action fill', () => {
    /*
     * A perceptual distance, not a contrast ratio.
     *
     * This used to ask `contrast(brand, primary) > 1.5`, and both halves of
     * that were the template's greyscale talking. Contrast is a function of
     * lightness alone, so it cannot see either of the ways a branded palette
     * separates these two fills — a hue apart and a chroma apart both measure
     * 1:1 — and 1.5 was read off a neutral seam that stands a near-black
     * control beside a mid-grey identity. A deployment that gives both fills
     * its accent and separates them by lightness alone measures 1.27 and
     * fails a floor it has not violated.
     *
     * The claim underneath was never a legibility one; it is that identity
     * and action are TWO fills. Held as a distance in OKLab it is the same
     * claim for every brand, and it is the claim that actually bites: a pair
     * no viewer can tell apart is one fill however it was dialled.
     */
    expect(perceptualDistance(brand, primary)).toBeGreaterThan(JUST_NOTICEABLE)
  })

  it.each(['warning', 'destructive', 'info', 'success'] as const)(
    'stays clear of the %s signal, so the signal still signals',
    (role) => {
      /*
       * The failure a rebrand introduces and a greyscale template cannot
       * have. Three of the four status hues pull fifteen percent of the way
       * toward the accent for harmony, and `--success-hue` is PINNED rather
       * than pulled for a reason semantic.css states in as many words: with
       * the brand at 177.6 a brand-relative green would collide with
       * `--primary`, and a success state has to stay distinguishable from a
       * brand fill. That reason had nothing holding it — an accent moved onto
       * a category anchor takes the category's fill with it, and a
       * destructive that is the brand fill has lost the channel a fill exists
       * to carry.
       *
       * Both accents, because either one can be the colour a status fill
       * lands on, and the same just-noticeable floor for the same reason it
       * is used above: it names no hue, so no brand can be tuned around it.
       * The neutral template clears it by seven times over and the teal
       * deployment by three at its closest — dark success, which is the pair
       * the pinned hue was pinned for.
       */
      const signal = resolveColor(`--${role}`, theme)
      expect(perceptualDistance(signal, brand)).toBeGreaterThan(JUST_NOTICEABLE)
      expect(perceptualDistance(signal, primary)).toBeGreaterThan(
        JUST_NOTICEABLE,
      )
    },
  )

  it('is the accent at the lightness the dials authorise, and nothing else', () => {
    // `bg-brand` repointed from a ramp step, `hsl(var(--brand-default))`, to
    // this derivation, and then the ramp was deleted — so the step it used to
    // read is no longer there to compare against. What replaces that
    // comparison is the derivation itself: the fill is the accent at the two
    // brand dials, and a theme that wants a different identity turns those
    // two numbers rather than re-typing seven.
    const value = resolveColorValue('--brand', theme)
    expect(value.l).toBeCloseTo(dial('--brand-lightness', theme), 6)
    expect(value.c).toBeCloseTo(dial('--brand-chroma', theme), 6)
    expect(value.h).toBeCloseTo(dial('--hue', theme), 6)
    expect(value.alpha).toBe(1)
  })

  it('carries ink at the floor a mid-lightness fill can hold', () => {
    // 3:1, not the 7:1 `--primary` clears. The on-colour flip is shared by
    // every role so the roles stay interchangeable, and its worst ground is a
    // fill near L 0.6 — which is exactly where a neutral identity sits. No ink
    // of any lightness clears 4.5:1 on a mid grey; a deployment that authors a
    // real accent moves off the trough by moving the dials.
    expect(
      contrast(resolveColor('--brand-foreground', theme), brand),
    ).toBeGreaterThanOrEqual(3)
  })
})

/**
 * The role vocabulary, measured on the grounds each name claims.
 *
 * Every one of these is a contrast claim the name itself makes:
 * `--text-{role}` says it is ink on the page, `--text-on-surface-{role}` says
 * it is ink on the role's own tint. A name that says where it sits can be
 * held to it, which is the point of naming the job rather than the position —
 * `--destructive-600` claimed nothing, so nothing could be checked.
 *
 * Both grounds are resolved from the cascade rather than assumed, so a retune
 * of the tint moves the measurement of the ink that sits on it.
 */
const ROLE_NAMES = [
  'primary',
  'brand',
  'warning',
  'destructive',
  'info',
  'success',
  'secondary',
] as const

describe.each(['light', 'dark'] as const)('role ink: %s', (theme) => {
  const page = resolveColor('--background', theme)

  it.each(ROLE_NAMES)('%s reads as ink on the page', (role) => {
    // 4.5:1 — body text, because that is what these are for. The name this
    // replaces at the call site is `text-destructive`, which resolves to the
    // solid fill: a colour tuned for ink to sit ON it, never measured as ink.
    expect(
      contrast(resolveColor(`--text-${role}`, theme), page),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it.each(ROLE_NAMES)('%s reads as ink on its own tint', (role) => {
    // The ground here is the role's tint, not the page. A status word on a
    // ten-percent wash of itself measures about 2.3:1, which is the defect
    // that made two ink names necessary rather than one.
    const tint = resolveColor(`--surface-${role}`, theme)
    expect(
      contrast(resolveColor(`--text-on-surface-${role}`, theme), tint),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it.each(ROLE_NAMES)('%s tints without becoming a fill', (role) => {
    // A resting tint has to be visible and has to stay a surface. The band is
    // where the hand-composed `bg-{role}/10` and `/15` call sites this name
    // replaces already sat, measured: 1.10 to 1.33 against the page.
    const tint = resolveColor(`--surface-${role}`, theme)
    expect(contrast(tint, page)).toBeGreaterThan(1.05)
    expect(contrast(tint, page)).toBeLessThan(1.5)
  })

  it.each(ROLE_NAMES)('%s washes over a surface rather than replacing it', (role) => {
    // The wash is translucent by construction, which is the whole difference
    // between it and the tint — it is painted over a surface that already
    // exists. Measured as a composite on the page, because that is the only
    // way a translucent colour has a value at all.
    const wash = resolveColor(`--wash-${role}`, theme, { over: page })
    expect(contrast(wash, page)).toBeGreaterThan(1)
    expect(contrast(wash, page)).toBeLessThan(1.5)
  })
})

/**
 * The role edge, and how quiet it stays.
 *
 * Not a 3:1 rule. SC 1.4.11 asks that of a boundary REQUIRED to identify a
 * control or its state, and this is not one — an alert carries its variant in
 * a tinted surface and a filled icon square, and the border can go without the
 * variant becoming unreadable. Held to that floor the edge would read as a
 * rule around the box, several times louder than the neutral hairline drawn
 * beside it.
 *
 * What it is held to instead is the interval the recipe this system follows
 * uses: a role border one step off the surface it edges, which measured across
 * that theme's own four alert variants spans 1.21:1 to 1.34:1 against the
 * surface underneath. Both ends matter. Too little and there is no edge; too
 * much and it stops being one.
 *
 * The ground is the role's own tint, because that is what the edge is a step
 * off. Its distance from the page follows from that and is asserted as a
 * direction rather than a number.
 */
describe.each(['light', 'dark'] as const)('role edge: %s', (theme) => {
  const page = resolveColor('--background', theme)

  it.each(ROLE_NAMES)('%s sits one quiet step off its own tint', (role) => {
    // 1.22 to 1.28 across all fourteen today, inside the band at both ends.
    const ratio = contrast(
      resolveColor(`--border-${role}`, theme),
      resolveColor(`--surface-${role}`, theme),
    )
    expect(ratio).toBeGreaterThanOrEqual(1.2)
    expect(ratio).toBeLessThanOrEqual(1.35)
  })

  it.each(ROLE_NAMES)('%s steps away from the page, not back toward it', (role) => {
    // The direction, which no ratio can carry on its own: contrast is
    // unsigned, so an edge that stepped the wrong way would satisfy the band
    // above while landing between the tint and the canvas. The tint is already
    // a step off the page and the edge is a step further along the same span.
    const tint = resolveColor(`--surface-${role}`, theme)
    expect(
      contrast(resolveColor(`--border-${role}`, theme), page),
    ).toBeGreaterThan(contrast(tint, page))
  })

  it.each(ROLE_NAMES)('%s is solid, so its value does not depend on what is behind it', (role) => {
    // The whole reason the alpha form failed. A translucent border is a
    // different colour on every surface it crosses, and `resolveColor` refuses
    // to measure one without a ground — so this is the assertion, not a
    // separate check of the declaration text.
    expect(() => resolveColor(`--border-${role}`, theme)).not.toThrow()
  })
})
