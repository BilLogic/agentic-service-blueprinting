import { describe, expect, it } from 'vitest'
import { BLUEPRINT_THEME } from '@/lib/blueprintTheme'
import {
  BLUEPRINT_LANE_ROLES,
  CELL_STEP,
  TOUCHPOINT_TONES,
} from '@/lib/blueprintCellStyle'
import {
  PATH_TYPE_COLORS,
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
  oklchToLinearSrgb,
  palette,
  resolveColor,
  resolveColorValue,
  resolvePaletteToken,
  resolveValue,
  stylesheet,
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

  it('ships hue-neutral, so nothing inherits a previous brand', () => {
    // The one assertion that is about the TEMPLATE rather than the mechanism:
    // a fork that brands the app updates this expectation deliberately, which
    // is the point — a brand should never arrive by accident.
    expect(THEME_DIALS.light.C).toBe(0)
    expect(THEME_DIALS.dark.C).toBe(0)
    expect(dial('--chroma', 'light')).toBe(0)
    expect(dial('--chroma', 'dark')).toBe(0)
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

  /*
   * The claim this file used to make, and the one it can actually hold.
   *
   * The test above was titled "keeps NAMED paths off the lane families" and
   * sampled forty synthetic names all hard-coded to `kind: 'variant'`.
   * `getPathColor` short-circuits every other kind straight to
   * `PATH_TYPE_COLORS`, so the sample could only ever produce the seven open
   * families — the one set that is disjoint from the lanes by construction.
   * `happy` and `exception` were structurally unreachable through it, and
   * `happy` is green against the green `actor` lane.
   *
   * Widening the sample fails, and that failure is the finding. The honest fix
   * is to narrow the claim rather than reshuffle the palette: nine lane
   * families plus seven touchpoint tones is sixteen, and there is no spare
   * hue for green or blue to move to. What CAN be held is that the overlap is
   * exactly this list, known, and drawn at a weight nothing can confuse with a
   * lane fill.
   */
  const KNOWN_LANE_OVERLAP = ['happy', 'variant']

  it('names every path type that shares a lane family', () => {
    const lanes = familiesIn('lane')
    const overlapping = Object.entries(PATH_TYPE_COLORS)
      .filter(([, token]) => lanes.has(/--color-([a-z]+)-/.exec(token)![1]))
      .map(([type]) => type)
    expect(overlapping).toEqual(KNOWN_LANE_OVERLAP)
  })

  it('draws every overlap at a different weight from the lane it crosses', () => {
    // What makes the collisions survivable: the path is a line at the text
    // step, the lane is a fill six steps lighter. Same family, nothing like
    // the same colour.
    const laneFill = Number(CELL_STEP.surface)
    for (const type of KNOWN_LANE_OVERLAP) {
      const step = Number(
        /--color-[a-z]+-(\d+)/.exec(
          PATH_TYPE_COLORS[type as keyof typeof PATH_TYPE_COLORS],
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
    '--background-blueprint-cell-origin',
    '--background-blueprint-cell-hover',
    '--background-blueprint-cell-pressed',
    '--ring-blueprint-cell',
    '--ring-blueprint-cell-soft',
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
    // 1.5:1 is not a legibility floor, it is a "these are two colours" floor.
    // The pair is at 4.43 light and 3.21 dark today; a fork that dialled brand
    // onto primary would land at 1.
    expect(contrast(brand, primary)).toBeGreaterThan(1.5)
  })

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
