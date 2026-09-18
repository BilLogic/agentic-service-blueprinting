import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import '@/lib/validationJit'
import { sourceOf } from '@/lib/sourceTree'

/**
 * Two halves, and the second is the one that earns its place.
 *
 * That the flag is set is cheap to assert and cheap to keep true. That it is
 * set IN TIME is neither: zod memoises the probe's answer on first read, the
 * first read happens while `App`'s import graph evaluates, and an import
 * block is exactly the kind of thing a tidying pass sorts. Sorted, this
 * module's import moves down, the probe runs first, the refusal comes back,
 * and every runtime assertion still passes — the flag would be set, just
 * after the only moment it mattered.
 *
 * So the position is held textually, the way `bootstrap.test.ts` holds its
 * import list: a runtime test cannot see order it has already disturbed by
 * importing.
 */
describe('the compiled-parser probe', () => {
  it('is off', () => {
    expect(z.config().jitless).toBe(true)
  })

  it('is turned off by the first import the app root makes', () => {
    const code = sourceOf('App.tsx').replace(/\/\*[\s\S]*?\*\//g, '')
    const [first] = [...code.matchAll(/^import\s+(?:.*?from\s+)?'([^']+)'/gm)].map(
      (m) => m[1],
    )
    expect(first).toBe('@/lib/validationJit')
  })
})
