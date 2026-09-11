import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { declarationsIn } from '@/lib/tokenModel'

/**
 * The expand half of the type ladder: new values land on the names the tree
 * already uses, and the sub-12px rungs stay so nothing that still names them
 * breaks. ADR 0012 is the ruling; this file is what would fail if a running-text
 * rung lost its pairing, or if the two scopes collapsed into one.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const INPUT = readFileSync(resolve(HERE, '../components/ui/input.tsx'), 'utf8')

const RUNGS = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'] as const

const SANS: Record<(typeof RUNGS)[number], string> = {
  xs: '.75rem',
  sm: '.8125rem',
  base: '.9375rem',
  lg: '1rem',
  xl: '1.125rem',
  '2xl': '1.375rem',
  '3xl': '1.75rem',
  '4xl': '2.125rem',
  '5xl': '2.875rem',
}

const MONO: Record<(typeof RUNGS)[number], string> = {
  xs: '.75rem',
  sm: '.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
}

const RATIO: Record<(typeof RUNGS)[number], string> = {
  xs: 'calc(1 / .75)',
  sm: 'calc(1.25 / .875)',
  base: 'calc(1.5 / 1)',
  lg: 'calc(1.75 / 1.125)',
  xl: 'calc(1.75 / 1.25)',
  '2xl': 'calc(2 / 1.5)',
  '3xl': 'calc(2.25 / 1.875)',
  '4xl': 'calc(2.5 / 2.25)',
  '5xl': '1',
}

const SUB_XS = {
  '--text-2xs': '0.6875rem',
  '--text-3xs': '0.625rem',
  '--text-4xs': '0.5625rem',
  '--text-5xs': '0.5rem',
} as const

const MONO_SELECTOR = '.font-mono, code, kbd, pre, samp'

/**
 * Collapse a CSS numeric so `.8125rem` and `0.8125rem` compare equal.
 *
 * @param value - a declaration value
 */
function compactRem(value: string): string {
  return value.replace(/0+\./, '.').replace(/ /g, '')
}

/**
 * The theme.css declaration of `name` whose selector contains `needle`.
 *
 * @param name - custom property
 * @param needle - substring of the selector list
 */
function declaredAs(name: string, needle: string) {
  return declarationsIn('theme.css').find(
    (entry) => entry.name === name && entry.selector.includes(needle),
  )
}

describe('the type ladder', () => {
  it('declares nine sans rungs and their ratios once, on the theme root', () => {
    for (const rung of RUNGS) {
      const size = declaredAs(`--text-${rung}`, '@theme')
      const leading = declaredAs(`--text-${rung}--line-height`, '@theme')
      expect(size, `--text-${rung} on @theme`).toBeDefined()
      expect(compactRem(size?.value ?? ''), rung).toBe(compactRem(SANS[rung]))
      expect(leading, `--text-${rung}--line-height on @theme`).toBeDefined()
      expect(compactRem(leading?.value ?? ''), `${rung} pairing`).toBe(
        compactRem(RATIO[rung]),
      )
    }
  })

  it('declares the nine mono sizes on the mono scope, and no line-heights there', () => {
    for (const rung of RUNGS) {
      const size = declaredAs(`--text-${rung}`, '.font-mono')
      expect(size, `--text-${rung} on the mono scope`).toBeDefined()
      expect(size?.selector).toBe(MONO_SELECTOR)
      expect(compactRem(size?.value ?? ''), rung).toBe(compactRem(MONO[rung]))
    }
    const monoLeadings = declarationsIn('theme.css').filter(
      (entry) =>
        entry.selector === MONO_SELECTOR &&
        entry.name.endsWith('--line-height'),
    )
    expect(monoLeadings).toEqual([])
  })

  it('keeps the four sub-12px rungs at the values call sites still name', () => {
    for (const [name, value] of Object.entries(SUB_XS)) {
      const entry = declaredAs(name, '@theme')
      expect(entry, name).toBeDefined()
      expect(entry?.value).toBe(value)
    }
  })

  it('gives text-sm a 13px face and an 18.57px box in prose, and 14px / 20px in code', () => {
    // The ratio is `calc(1.25 / .875)`: a 20px line box for what was a 14px
    // rung. The same ratio meeting sans sm (13px) is 18.571…px; meeting mono
    // sm (14px) is 20px. Read off the declarations, not restated as literals.
    const sans = declaredAs('--text-sm', '@theme')
    const mono = declaredAs('--text-sm', '.font-mono')
    const leading = declaredAs('--text-sm--line-height', '@theme')
    const sansRem = Number.parseFloat(sans?.value ?? '')
    const monoRem = Number.parseFloat(mono?.value ?? '')
    const ratio = 1.25 / 0.875
    expect(leading?.value.replace(/\s+/g, '')).toBe('calc(1.25/.875)')
    expect(sansRem * 16).toBe(13)
    expect(monoRem * 16).toBe(14)
    expect(sansRem * 16 * ratio).toBeCloseTo(18.57, 2)
    expect(monoRem * 16 * ratio).toBe(20)
  })

  it('sizes the field input at 16px below md and 13px above it', () => {
    // `lg` is exactly 1rem, the iOS zoom-on-focus floor. `base` drops to 15px
    // in this same edit, so the input cannot stay on it.
    expect(INPUT).toMatch(/\btext-lg\b/)
    expect(INPUT).toMatch(/\bmd:text-sm\b/)
    expect(INPUT).not.toMatch(/\btext-base\b/)
  })
})
