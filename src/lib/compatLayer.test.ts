import { describe, expect, it } from 'vitest'
import { declarationsIn, namesIn } from '@/lib/tokenModel'

/**
 * The compat layer, and the two ways an alias stops being an alias.
 *
 * `compat.css` exists so Supabase's spelling resolves here — a snippet lifted
 * from their docs, or a component vendored out of their tree, works without
 * being rewritten first. That makes it the one layer with no consumers by
 * design, which is also what makes it easy to get wrong in a way nothing
 * notices.
 *
 * ONE. An alias that carries a value is not an alias; it is a second place the
 * colour is written, and the two drift.
 *
 * TWO. An alias that duplicates a name `theme.css` already registers is not a
 * synonym for anything — `--color-foreground-contrast` sat here at exactly
 * `theme.css`'s value, and since `theme.css` imports later, this file's copy
 * could never win. A declaration that reads like a fallback, sitting in a file
 * that sorts too early to be one.
 */

const COMPAT = 'compat.css'

describe('the compat layer', () => {
  it('reads the file', () => {
    expect(declarationsIn(COMPAT).length).toBeGreaterThan(0)
  })

  it('declares nothing but bare aliases', () => {
    const notAnAlias = declarationsIn(COMPAT)
      .filter((entry) => !/^var\(--[a-zA-Z0-9-]+\)$/.test(entry.value))
      .map((entry) => `${entry.name}: ${entry.value}`)
    expect(notAnAlias).toEqual([])
  })

  it('points every alias at a name semantic.css declares', () => {
    const semantic = namesIn('semantic.css')
    const dangling = declarationsIn(COMPAT)
      .map((entry) => ({
        name: entry.name,
        target: /^var\((--[a-zA-Z0-9-]+)\)$/.exec(entry.value)?.[1] ?? '',
      }))
      .filter((alias) => !semantic.has(alias.target))
      .map((alias) => `${alias.name} -> ${alias.target}`)
    expect(dangling).toEqual([])
  })

  it('aliases no name theme.css already registers', () => {
    const registered = namesIn('theme.css')
    const shadowed = [...namesIn(COMPAT)]
      .filter((name) => registered.has(name))
      .sort()
    expect(shadowed).toEqual([])
  })
})
