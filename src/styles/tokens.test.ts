import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Token drift guard. The app resolves every colour through `var()`, so an
 * accidentally deleted or renamed token fails silently in the browser (the
 * property just doesn't apply). This suite parses the stylesheets directly:
 * the tokens the chrome depends on must exist, hold parseable values, and
 * every `var(--canvas-*)` reference in blueprint.css must resolve to a
 * declaration in tokens.css.
 */

const TOKENS_CSS = readFileSync(
  fileURLToPath(new URL('./tokens.css', import.meta.url)),
  'utf8',
)
const BLUEPRINT_CSS = readFileSync(
  fileURLToPath(new URL('./blueprint.css', import.meta.url)),
  'utf8',
)

function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) return ''
  const end = css.indexOf('\n}', start)
  return css.slice(start, end)
}

function declarations(css: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const match of css.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    out.set(match[1], match[2].trim())
  }
  return out
}

const stripped = TOKENS_CSS.replace(/\/\*[\s\S]*?\*\//g, '')
const rootTokens = declarations(block(stripped, ':root'))
const darkTokens = declarations(block(stripped, '.dark'))

/** Semantic (shadcn-contract) tokens the components map through Tailwind. */
const SEMANTIC_TOKENS = [
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--destructive',
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
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
]

/** Brand-seam + neutral canvas chrome tokens consumed by blueprint.css. */
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

describe('tokens.css', () => {
  it('declares every semantic token in :root and .dark', () => {
    for (const token of SEMANTIC_TOKENS) {
      expect(rootTokens.has(token), `:root missing ${token}`).toBe(true)
      expect(darkTokens.has(token), `.dark missing ${token}`).toBe(true)
    }
  })

  it('declares --radius in :root', () => {
    expect(rootTokens.get('--radius')).toMatch(/^[\d.]+rem$/)
  })

  it('declares the canvas chrome tokens with colour values', () => {
    for (const token of CANVAS_COLOR_TOKENS) {
      const value = rootTokens.get(token)
      expect(value, `:root missing ${token}`).toBeDefined()
      expect(value, `${token} is not a colour: ${value}`).toMatch(
        /^(#[0-9a-f]{3,8}|oklch\(|rgb|hsl)/i,
      )
    }
  })

  it('declares the raise shadow token', () => {
    expect(rootTokens.get('--canvas-raise-shadow')).toMatch(/rgba?\(/)
  })

  it('resolves every var(--canvas-*) reference in blueprint.css', () => {
    const referenced = new Set(
      [...BLUEPRINT_CSS.matchAll(/var\((--canvas-[\w-]+)\)/g)].map(
        (match) => match[1],
      ),
    )
    expect(referenced.size).toBeGreaterThan(0)
    for (const token of referenced) {
      expect(rootTokens.has(token), `tokens.css missing ${token}`).toBe(true)
    }
  })

  it('resolves semantic oklch values (no malformed declarations)', () => {
    for (const [token, value] of [...rootTokens, ...darkTokens]) {
      if (!value.startsWith('oklch(')) continue
      expect(value, `${token} malformed: ${value}`).toMatch(
        /^oklch\([\d.]+ [\d.]+ [\d.]+( \/ [\d.]+%)?\)$/,
      )
    }
  })
})
