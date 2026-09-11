import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { declarationsIn } from '@/lib/tokenModel'

/**
 * The two-scope `--font-weight-normal` knob. ADR 0012 takes the mechanism
 * from the reference and declines the 450: Inter reads light at 400, Ubuntu
 * Sans holds its colour at 400 down to 12px, so both scopes stay at 400.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const THEME = readFileSync(resolve(HERE, 'theme.css'), 'utf8')
const MONO_SELECTOR = '.font-mono, code, kbd, pre, samp'

describe('the working-weight knob', () => {
  it('declares --font-weight-normal once per scope, both at 400', () => {
    const sans = declarationsIn('theme.css').filter(
      (entry) =>
        entry.name === '--font-weight-normal' &&
        entry.selector.includes('@theme'),
    )
    const mono = declarationsIn('theme.css').filter(
      (entry) =>
        entry.name === '--font-weight-normal' &&
        entry.selector.includes('.font-mono'),
    )
    expect(sans).toHaveLength(1)
    expect(mono).toHaveLength(1)
    expect(sans[0]?.value).toBe('400')
    expect(mono[0]?.value).toBe('400')
    expect(mono[0]?.selector).toBe(MONO_SELECTOR)
  })

  it('records the Inter reasoning as a comment naming the type-ladder decision', () => {
    const at = THEME.indexOf('--font-weight-normal:')
    expect(at).toBeGreaterThan(-1)
    const comment = THEME.slice(0, at).match(/\/\*[\s\S]*?\*\/\s*$/)?.[0]
    expect(comment, 'a comment immediately above the sans knob').toBeDefined()
    expect(comment).toMatch(/the decision that a rung owns size and leading/)
    expect(comment).toMatch(/Inter/)
    expect(comment).toMatch(/Ubuntu Sans/)
    expect(comment).toMatch(/450/)
  })
})
