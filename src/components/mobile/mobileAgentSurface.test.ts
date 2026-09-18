import { describe, expect, it } from 'vitest'
import { sourceOf } from '@/lib/sourceTree'

/**
 * THE ONE CLAIM OF THE PHONE'S AGENT SURFACE THAT ONLY THE SOURCE CAN HOLD.
 *
 * The scrim is a class string on a portal, and its constancy is a fact about
 * what a compositor does with it — nothing that runs under jsdom resolves
 * either, and the regression it guards (the wash made conditional again, so
 * it flashed on every agent jump with its opacity and its hit target on
 * different clocks) is invisible to any assertion about rendered state. A
 * source guard is the honest instrument here, and it failed silently for a
 * whole release before there was one.
 *
 * The phase line this file used to guard beside it has moved twice, and both
 * moves stand. Its WORDING belongs to `describeSelection`, so the guard that
 * a shell still calls it sits beside that renderer in
 * `lib/shellContext.test.ts` — which is what still covers the DESKTOP shell,
 * since nothing drives that one end to end. The PHONE's half is now driven:
 * `src/slices/phoneAgentJump.slice.test.tsx` jumps the real shell to a phase,
 * asserts the reported line in the words the navigation tool matches, and its
 * second red strips the line and requires the tool to answer that the
 * selection was not verified. Reading this file for an interpolation held
 * less than either and is gone.
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
