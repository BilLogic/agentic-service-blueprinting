import { describe, expect, it } from 'vitest'
import { sourceOf } from '@/lib/sourceTree'

/**
 * A CLAIM OF THE PHONE'S AGENT SURFACE THAT ONLY THE SOURCE CAN HOLD.
 *
 * The scrim is a class string on a portal that only a real layout resolves,
 * so no unit can reach it, and it failed silently for a whole release. A
 * source guard is the honest instrument here, and it catches the exact
 * regression that happened: the wash made conditional again.
 *
 * The phase line the shell reports used to be guarded here the same way —
 * by reading this file for its interpolation — because the sentence was
 * assembled inline and had no interface to ask. It has one now
 * (`describeSelection`), and the claim is asserted against the renderer both
 * shells and the navigation verifier share, where a fourth spelling of the
 * format cannot drift.
 */
const SHEET = sourceOf('components/mobile/MobileAgentSheet.tsx')

describe('the sheet scrim is one constant state', () => {
  const overlay = SHEET.match(/overlayClassName="([^"]*)"/)

  it('is a literal string, not a value the flight can change', () => {
    // A template or a ternary here is the choreography that was removed: the
    // wash flashed on every agent jump, and its opacity and its hit target
    // ran on different clocks.
    expect(overlay?.[1]).toBeDefined()
    expect(SHEET).not.toMatch(/overlayClassName=\{/)
  })

  it('carries no transition and no second opacity for anything to animate', () => {
    const classes = (overlay?.[1] ?? '').split(/\s+/)
    expect(classes).toContain('bg-background/40')
    expect(classes.filter((name) => name.startsWith('bg-background/'))).toHaveLength(1)
    expect(classes.some((name) => /^(transition|duration|opacity|animate)-/.test(name))).toBe(false)
  })
})
