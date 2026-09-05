import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  PANEL_SHEET_DEFAULT_SNAP,
  PANEL_SHEET_SNAP_POINTS,
  rememberedSheetSnap,
  rememberSheetSnap,
  resetSheetSnapMemory,
} from '@/lib/panelSheetSnap'

const src = (relative: string) =>
  readFileSync(resolve(__dirname, '..', relative), 'utf8')

/**
 * THE CAP IS THE POINT OF THIS FILE.
 *
 * The first attempt at #133 shipped a snap point of `1` and a test asserting
 * the sheet's own class string carried no `max-h-`. That was true and
 * irrelevant: the ceiling lives in the vendored popup, as
 * `--drawer-content-max-height: calc(100dvh - 6rem)` on the y axis. The sheet
 * rendered 96px short of the viewport on a 812px phone — measured, 716 — and
 * the test passed the whole time.
 *
 * So the assertion has to be about the primitive's cap and our stops together,
 * not about our class string alone.
 */
describe('every stop sits under the drawer primitive’s own ceiling', () => {
  const drawer = src('components/ui/drawer.tsx')

  /**
   * A stop as a percentage of the viewport, using the PRIMITIVE's rules and
   * not our own. `resolveSnapPointValue` reads a number <= 1 as a fraction, a
   * number > 1 as pixels, and a string only when it ends `px` or `rem`.
   * Everything else resolves to `null` and the sheet silently sits at its cap.
   *
   * The first version of this helper parsed `svh` with its own regex, so
   * `['40svh','70svh']` passed every assertion here while the shipped sheet
   * opened at 88%. Parsing a unit the primitive rejects is how a test agrees
   * with itself instead of with the code.
   */
  const asViewportPercent = (point: number | string): number => {
    if (typeof point === 'number') return point <= 1 ? point * 100 : NaN
    return NaN
  }

  it('the primitive still caps the y axis, and still does it at 6rem', () => {
    // If this fails the vendored drawer changed and the headroom below is no
    // longer the number being reasoned about. That is a reason to re-derive
    // the stops, not to delete this test.
    expect(drawer).toContain(
      'data-[swipe-axis=y]:[--drawer-content-max-height:calc(100dvh-6rem)]',
    )
    expect(drawer).toContain('max-h-(--drawer-content-max-height,none)')
  })

  it('no stop asks for a height the cap forbids', () => {
    // 6rem is 96px at the default root size. On the shortest phone this app
    // targets (~568px) that is ~17% of the viewport, so anything at or above
    // 83svh is unreachable somewhere. Every stop must clear that with room.
    const SHORTEST_VIEWPORT_PX = 568
    const CAP_PX = 96
    const reachableCeiling = ((SHORTEST_VIEWPORT_PX - CAP_PX) / SHORTEST_VIEWPORT_PX) * 100

    for (const point of PANEL_SHEET_SNAP_POINTS) {
      const percent = asViewportPercent(point)
      expect(percent, `${point} is not a viewport-relative length`).not.toBeNaN()
      expect(
        percent,
        `${point} exceeds the ${reachableCeiling.toFixed(1)}% the primitive's cap allows on a ${SHORTEST_VIEWPORT_PX}px viewport`,
      ).toBeLessThan(reachableCeiling)
    }
  })

  it('the primitive still reads only numbers, px and rem', () => {
    // The reason every stop above is a NUMBER. base-ui's
    // `resolveSnapPointValue` returns null for any other unit, and a null stop
    // does not throw — the sheet just sits at its capped full height. If this
    // assertion fails because base-ui grew `svh` support, that is good news
    // and the stops may become lengths again; it is not a reason to delete it.
    const resolver = readFileSync(
      resolve(
        __dirname,
        '..',
        '..',
        'node_modules/@base-ui/react/drawer/root/useDrawerSnapPoints.mjs',
      ),
      'utf8',
    )
    expect(resolver).toContain("trimmed.endsWith('px')")
    expect(resolver).toContain("trimmed.endsWith('rem')")
    expect(resolver).not.toContain("endsWith('svh')")
    expect(resolver).not.toContain("endsWith('vh')")
  })

  it('no stop claims the full viewport', () => {
    // Separately from the cap: a sheet that covers the board stops being an
    // inspector. `MobileAgentSheet` records 92svh reading as a takeover, and
    // the mobile shell's model is a live canvas under non-modal sheets.
    for (const point of PANEL_SHEET_SNAP_POINTS) {
      expect(point).not.toBe(1)
      expect(String(point)).not.toMatch(/^100(svh|dvh|vh|%)$/)
    }
  })
})

describe('the stops themselves', () => {
  it('are two, ascending', () => {
    expect(PANEL_SHEET_SNAP_POINTS).toHaveLength(2)
    expect(PANEL_SHEET_SNAP_POINTS[0]).toBe(0.4)
    expect(PANEL_SHEET_SNAP_POINTS[1]).toBe(0.7)
  })

  it('the taller one is the height the sheet already shipped with', () => {
    // `max-h-[70svh]` was the old cap. Keeping it means the taller stop is
    // today's behaviour rather than a fresh claim about how tall is too tall.
    expect(PANEL_SHEET_SNAP_POINTS[1]).toBe(0.7)
  })

  it('opens on the lower one', () => {
    expect(PANEL_SHEET_DEFAULT_SNAP).toBe(PANEL_SHEET_SNAP_POINTS[0])
  })
})

describe('the sheet remembers its stop for the session', () => {
  beforeEach(resetSheetSnapMemory)

  it('opens at the default before anything is dragged', () => {
    expect(rememberedSheetSnap()).toBe(PANEL_SHEET_DEFAULT_SNAP)
  })

  it('hands back the stop the reader settled on', () => {
    rememberSheetSnap(0.7)
    expect(rememberedSheetSnap()).toBe(0.7)
  })

  it('ignores a value that is not one of the stops', () => {
    // `onSnapPointChange` reports whatever the primitive resolved. An
    // off-list value would be remembered forever and then handed back as a
    // controlled `snapPoint` the primitive would reject — a sheet that opens
    // nowhere, once, and never recovers.
    rememberSheetSnap(0.7)
    rememberSheetSnap(0.93)
    expect(rememberedSheetSnap()).toBe(0.7)
  })
})

describe('the shell wires it up', () => {
  const shell = src('components/blueprint/panelShell.tsx')

  it('passes the stops only in the sheet posture', () => {
    // A pinned desktop card has room for its whole content, and snap points
    // would hand it a 100dvh height it must not have.
    expect(shell).toMatch(
      /snapPoints=\{mobile \? PANEL_SHEET_SNAP_POINTS : undefined\}/,
    )
    expect(shell).toMatch(/snapPoint=\{mobile \? snapPoint : undefined\}/)
  })

  it('records the stop on change', () => {
    expect(shell).toContain('rememberSheetSnap(next)')
  })

  it('the sheet sets no height of its own', () => {
    // Snap points need `--drawer-content-height: 100dvh` to survive; `!h-auto`
    // is `height: auto !important` and beats it, which is why snap points
    // could not work before this change.
    const mobileClasses =
      /mobile\s*\n?\s*\?[\s\S]*?'([^']*--drawer-inset:0px[^']*)'/.exec(shell)?.[1]
    expect(mobileClasses, 'the mobile class string was not found').toBeTruthy()
    expect(mobileClasses).not.toMatch(/h-auto/)
    expect(mobileClasses).not.toMatch(/max-h-/)
  })
})
