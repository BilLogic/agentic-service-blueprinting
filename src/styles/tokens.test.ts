import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Token drift guard for the ported design-system foundation. The app
 * resolves every colour through `var()`, so an accidentally deleted or
 * renamed token fails silently in the browser (the property just doesn't
 * apply). This suite parses the stylesheets directly:
 *
 *  - every bare `var(--x)` reference in any stylesheet must resolve to a
 *    declaration somewhere in src/styles/,
 *  - every custom-property reference in a component must resolve to a
 *    stylesheet declaration, an inline declaration in TS, or a runtime
 *    property injected by a library (allowlisted by prefix),
 *  - the theme dial set the semantic lane derives from must exist in both
 *    themes, and every blueprint component token a lane rule promises must
 *    actually be declared for every lane role,
 *  - the motion tokens in animations.css must agree with lib/motion.ts.
 */

const STYLES_DIR = fileURLToPath(new URL('.', import.meta.url))
const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))

function walk(dir: string, ext: string[]): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(path, ext))
    else if (ext.some((e) => entry.name.endsWith(e))) out.push(path)
  }
  return out
}

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

const CSS_FILES = walk(STYLES_DIR, ['.css'])
const CSS = CSS_FILES.map((f) => stripComments(readFileSync(f, 'utf8'))).join(
  '\n',
)
const TS = walk(SRC_DIR, ['.ts', '.tsx'])
  .filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')

/** Custom properties declared anywhere in the stylesheets (including inside
 * `@theme` blocks — those teach Tailwind the name and, for plain `@theme`,
 * emit the property). */
const cssDeclarations = new Set(
  [...CSS.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]),
)

/** Custom properties declared from TS: inline style objects
 * (`'--x': value`), Tailwind arbitrary properties (`[--x:value]`),
 * imperative `setProperty('--x', …)` calls, and the named constants those
 * calls go through (`const FOO_VAR = '--x'`) — a token set through a named
 * constant is still declared by this app, and reading only literal
 * `setProperty` calls would miss every one of them. */
const tsDeclarations = new Set([
  ...[...TS.matchAll(/['"](--[\w-]+)['"]\s*:/g)].map((m) => m[1]),
  ...[...TS.matchAll(/\[(--[\w-]+):/g)].map((m) => m[1]),
  ...[...TS.matchAll(/setProperty\(\s*['"](--[\w-]+)['"]/g)].map((m) => m[1]),
  ...[...TS.matchAll(/=\s*['"](--[\w-]+)['"]/g)].map((m) => m[1]),
])

/** Properties injected at runtime by libraries (never declared in source). */
const RUNTIME_PREFIXES = [
  '--tw-', // Tailwind internal
  '--drawer-', // shadcn/base-ui drawer state
  '--stack-', // drawer stacking
  '--nested-drawers',
  '--accordion-', // base-ui accordion panel height
  '--radix-', // radix primitives
]

function resolves(token: string): boolean {
  return (
    cssDeclarations.has(token) ||
    tsDeclarations.has(token) ||
    RUNTIME_PREFIXES.some((p) => token.startsWith(p))
  )
}

/** Prefixes left behind when a token name is built by interpolation. */
const COMPOSED_TOKEN_PREFIXES = ['--color-']

describe('token resolution', () => {
  it('resolves every bare var(--x) reference in the stylesheets', () => {
    const unresolved = new Set(
      [...CSS.matchAll(/var\((--[\w-]+)\)/g)]
        .map((m) => m[1])
        .filter((t) => !resolves(t)),
    )
    expect([...unresolved]).toEqual([])
  })

  it('resolves every custom-property reference in components', () => {
    const refs = new Set([
      // var(--x) inside class strings and style values
      ...[...TS.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]),
      // Tailwind shorthand: duration-(--motion-micro), w-(--sidebar-width)…
      ...[...TS.matchAll(/[a-z]\((--[\w-]+)\)/g)].map((m) => m[1]),
    ])
    const unresolved = [...refs]
      // Names composed at runtime — `var(--color-${family}-${step})` — arrive
      // here truncated at the interpolation. The families and steps they
      // compose from are covered by palette.test.ts, which resolves the real
      // token against colors.css.
      .filter((token) => !COMPOSED_TOKEN_PREFIXES.includes(token))
      .filter((t) => !resolves(t))
    expect(unresolved).toEqual([])
  })
})

/* ------------------------------------------------------------------ *
 * Theme dials: the inputs semantic.css derives everything from. Each
 * must be declared in both theme files or a whole derivation chain
 * silently collapses in one mode.
 * ------------------------------------------------------------------ */
const LIGHT = stripComments(
  readFileSync(join(STYLES_DIR, 'themes/light.css'), 'utf8'),
)
const DARK = stripComments(
  readFileSync(join(STYLES_DIR, 'themes/dark.css'), 'utf8'),
)

const DIALS = [
  '--hue',
  '--chroma',
  '--surface',
  '--elevation-step',
  '--contrast',
  '--foreground-lightness',
  '--muted-foreground-level',
  '--tertiary-foreground-level',
  '--primary-lightness',
  '--primary-chroma',
  '--ring-lightness',
  '--warning-lightness',
  '--destructive-lightness',
  '--info-lightness',
  '--success-lightness',
]

/** Semantic tokens the shadcn components consume via theme.css. */
const SEMANTIC_TOKENS = [
  '--background',
  '--foreground',
  '--canvas',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--primary-border',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--tertiary',
  '--tertiary-foreground',
  '--accent',
  '--accent-foreground',
  '--destructive',
  '--destructive-foreground',
  '--warning',
  '--warning-foreground',
  '--info',
  '--info-foreground',
  '--success',
  '--success-foreground',
  '--border',
  '--input',
  '--ring',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
  '--sidebar-selected',
  '--sidebar-selected-foreground',
  '--sidebar-selected-rail',
  '--sidebar-ancestor',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
]

const SEMANTIC = stripComments(
  readFileSync(join(STYLES_DIR, 'semantic.css'), 'utf8'),
)

describe('theme dials and semantic lane', () => {
  it('declares every dial in both themes', () => {
    for (const dial of DIALS) {
      expect(LIGHT.includes(`${dial}:`), `light missing ${dial}`).toBe(true)
      expect(DARK.includes(`${dial}:`), `dark missing ${dial}`).toBe(true)
    }
  })

  it('declares --radius in the light theme root', () => {
    expect(LIGHT).toMatch(/--radius:\s*[\d.]+rem/)
  })

  it('derives every semantic token in semantic.css', () => {
    for (const token of SEMANTIC_TOKENS) {
      expect(SEMANTIC.includes(`${token}:`), `semantic missing ${token}`).toBe(
        true,
      )
    }
  })

  it('re-derives under .dark and .light subtree scopes', () => {
    // Custom properties resolve var() at computed-value time, before
    // inheritance — a subtree that re-declares a dial (presentation stage)
    // needs the derivations re-declared at that scope.
    expect(SEMANTIC).toMatch(/:root\s*,\s*\.dark\s*,\s*\.light\s*\{/)
  })
})

/* ------------------------------------------------------------------ *
 * Blueprint component tokens. A cell's resting colour comes from its LANE,
 * which comes from data, so blueprint.css hands the value to the shared
 * rules through `--{property}-blueprint-{part}` custom properties declared
 * per `[data-blueprint-lane]`. Nothing type-checks that contract — a lane
 * that declares six of the seven just renders a fallback — so it is checked
 * here: every lane role promises the same set.
 * ------------------------------------------------------------------ */
const BLUEPRINT = stripComments(
  readFileSync(join(STYLES_DIR, 'blueprint.css'), 'utf8'),
)

/** The per-lane declaration blocks, keyed by the lane role they style. */
const LANE_BLOCKS = new Map(
  [
    ...BLUEPRINT.matchAll(
      /\[data-blueprint-lane='([a-z-]+)'\]\s*\{([^}]*)\}/g,
    ),
  ].map(([, role, body]) => [role, body]),
)

const CELL_TOKENS = [
  '--background-blueprint-cell',
  '--background-blueprint-cell-origin',
  '--background-blueprint-cell-hover',
  '--background-blueprint-cell-pressed',
  '--ring-blueprint-cell',
  '--ring-blueprint-cell-soft',
  '--foreground-blueprint-cell',
]

describe('blueprint component tokens', () => {
  it('styles every lane role the cell styling module knows about', async () => {
    const { CELL_STEP } = await import('@/lib/blueprintCellStyle')
    expect(CELL_STEP).toBeDefined()
    expect(LANE_BLOCKS.size).toBeGreaterThanOrEqual(8)
  })

  it('declares the full cell token set on every lane', () => {
    for (const [role, body] of LANE_BLOCKS) {
      for (const token of CELL_TOKENS) {
        expect(
          body.includes(`${token}:`),
          `lane '${role}' is missing ${token}`,
        ).toBe(true)
      }
    }
  })

  it('assigns only token references, never a raw colour', () => {
    // The whole point of the tier: a component token hands over a value that
    // was chosen in colors.css or semantic.css. A literal here would be a
    // colour invented at the consumer, invisible to both themes' palettes.
    for (const [role, body] of LANE_BLOCKS) {
      for (const [, token, value] of body.matchAll(
        /(--[\w-]+):\s*([^;]+);/g,
      )) {
        expect(
          value.trim().startsWith('var(') ||
            value.trim().startsWith('color-mix('),
          `lane '${role}' assigns a literal to ${token}: ${value.trim()}`,
        ).toBe(true)
      }
    }
  })

  it('declares no blueprint cell token at :root', () => {
    // Every consumer reads these as `var(--…-blueprint-…, fallback)`, and the
    // fallback arm IS the default state. A root declaration would make the
    // property always resolve, so the default would become unreachable.
    const rootBlocks = [...BLUEPRINT.matchAll(/:root\s*\{([^}]*)\}/g)]
    for (const [, body] of rootBlocks) {
      for (const token of CELL_TOKENS) {
        expect(body.includes(`${token}:`), `${token} declared at :root`).toBe(
          false,
        )
      }
    }
  })
})

/* ------------------------------------------------------------------ *
 * Motion vocabulary: animations.css and lib/motion.ts state the same
 * numbers; change both together or this fails.
 * ------------------------------------------------------------------ */
const ANIMATIONS = stripComments(
  readFileSync(join(STYLES_DIR, 'animations.css'), 'utf8'),
)

describe('motion tokens', () => {
  const pairs: Array<[string, RegExp]> = [
    ['--motion-structural', /--motion-structural:\s*(\d+)ms/],
    ['--motion-fade', /--motion-fade:\s*(\d+)ms/],
    ['--motion-fade-stagger', /--motion-fade-stagger:\s*(\d+)ms/],
    ['--motion-camera', /--motion-camera:\s*(\d+)ms/],
    ['--motion-micro', /--motion-micro:\s*(\d+)ms/],
  ]

  it('declares all five motion durations', () => {
    for (const [token, re] of pairs) {
      expect(ANIMATIONS, `animations.css missing ${token}`).toMatch(re)
    }
  })

  it('agrees with lib/motion.ts', async () => {
    const motion = await import('../lib/motion')
    const value = (re: RegExp) => Number(ANIMATIONS.match(re)?.[1])
    expect(value(pairs[0][1])).toBe(motion.MOTION_STRUCTURAL_MS)
    expect(value(pairs[1][1])).toBe(motion.MOTION_FADE_MS)
    expect(value(pairs[2][1])).toBe(motion.MOTION_FADE_STAGGER_MS)
    expect(value(pairs[3][1])).toBe(motion.MOTION_CAMERA_MS)
    expect(value(pairs[4][1])).toBe(motion.MOTION_MICRO_MS)
    expect(ANIMATIONS).toContain(motion.MOTION_STRUCTURAL_EASE)
  })
})
