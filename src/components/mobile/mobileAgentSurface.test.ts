import { describe, expect, it } from 'vitest'
import { sourceOf } from '@/lib/sourceTree'

/**
 * TWO CLAIMS OF THE PHONE'S AGENT SURFACE THAT ONLY THE SOURCE CAN HOLD.
 *
 * Both are about text the shell hands to somebody else — the navigation
 * tools' verifier, and the browser's compositor — and both failed silently
 * for a whole release. Neither is reachable from a unit under test: the phase
 * line is interpolated inside the shell's own context array, and the scrim is
 * a class string on a portal that only a real layout resolves. A source guard
 * is the honest instrument here, and it catches the exact regression that
 * happened: the line deleted, and the scrim made conditional again.
 */
const SHELL = sourceOf('components/mobile/MobileShell.tsx')
const SHEET = sourceOf('components/mobile/MobileAgentSheet.tsx')

describe('the phone reports its selection the way the tools read it', () => {
  it('emits a phase line in the shape the navigation verifier matches', () => {
    expect(SHELL).toContain('Selected phase: none')

    // The verifier's own pattern, from `waitForNavigation` in uiBridge: the
    // id in parentheses at the end of its own line. A phase line that reads
    // well but drops the id verifies nothing, and the tool then tells the
    // model a landed jump failed.
    const selectedLine = /^Selected phase: .*\(p-1\)$/m
    const rendered = `Selected phase: "Discover" (p-1)`
    expect(selectedLine.test(rendered)).toBe(true)
    expect(SHELL).toContain('`Selected phase: "${getSlideDisplayLabel(')
    expect(SHELL).toContain('(${phase.id})`')
  })
})

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
