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
 *  - the theme dial set the semantic layer derives from must exist in both
 *    themes, and the canvas brand-seam tokens must hold colour values,
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
 * (`'--x': value`), Tailwind arbitrary properties (`[--x:value]`), and
 * imperative `setProperty('--x', …)` calls. */
const tsDeclarations = new Set([
  ...[...TS.matchAll(/['"](--[\w-]+)['"]\s*:/g)].map((m) => m[1]),
  ...[...TS.matchAll(/\[(--[\w-]+):/g)].map((m) => m[1]),
  ...[...TS.matchAll(/setProperty\(\s*['"](--[\w-]+)['"]/g)].map((m) => m[1]),
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
    const unresolved = [...refs].filter((t) => !resolves(t))
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

describe('theme dials and semantic layer', () => {
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
 * Canvas brand seam (kept from the original template guard set).
 * ------------------------------------------------------------------ */
const BLUEPRINT = stripComments(
  readFileSync(join(STYLES_DIR, 'blueprint.css'), 'utf8'),
)
const blueprintDecls = new Map(
  [...BLUEPRINT.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [
    m[1],
    m[2].trim(),
  ]),
)

const CANVAS_COLOR_TOKENS = [
  '--canvas-phase-frame',
  '--canvas-phase-accent',
  '--canvas-phase-frame-hover',
  '--canvas-phase-accent-hover',
  '--canvas-phase-badge-foreground',
  '--canvas-panel-bg',
  '--canvas-panel-border',
  '--canvas-panel-badge',
  '--canvas-panel-badge-foreground',
  '--canvas-panel-bg-hover',
  '--canvas-panel-border-hover',
  '--canvas-panel-badge-hover',
  '--canvas-panel-surface-hover',
]

describe('canvas brand seam', () => {
  it('declares the canvas chrome tokens with colour values', () => {
    for (const token of CANVAS_COLOR_TOKENS) {
      const value = blueprintDecls.get(token)
      expect(value, `blueprint.css missing ${token}`).toBeDefined()
      expect(value, `${token} is not a colour: ${value}`).toMatch(
        /^(#[0-9a-f]{3,8}|oklch\(|rgb|hsl)/i,
      )
    }
  })

  it('declares the raise shadow token', () => {
    expect(blueprintDecls.get('--canvas-raise-shadow')).toMatch(/rgba?\(/)
  })

  it('resolves every var(--canvas-*) reference in blueprint.css', () => {
    const referenced = new Set(
      [...BLUEPRINT.matchAll(/var\((--canvas-[\w-]+)\)/g)].map((m) => m[1]),
    )
    expect(referenced.size).toBeGreaterThan(0)
    for (const token of referenced) {
      expect(blueprintDecls.has(token), `blueprint.css missing ${token}`).toBe(
        true,
      )
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
