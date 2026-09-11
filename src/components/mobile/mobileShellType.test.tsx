// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ReactElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MobileNavSheet } from '@/components/mobile/MobileNavSheet'
import { MobilePathSelector } from '@/components/mobile/MobilePathSelector'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'

/**
 * #545: the mobile shell is the only surface in this batch that renders
 * below the `md` breakpoint, so its `xs` chrome has to be checked at phone
 * width. iOS zooms a focused field whose computed size is under 16px; the
 * shell itself has no fields, and the settings inputs it hosts already sit
 * on `text-lg` below `md` (#534). Overflow on the bar is `truncate`, not a
 * clip of glyphs.
 */

const PHONE_WIDTH_PX = 375
const HERE = dirname(fileURLToPath(import.meta.url))
const INPUT = readFileSync(
  resolve(HERE, '../ui/input.tsx'),
  'utf8',
)

afterEach(cleanup)

/**
 * Render `ui` inside a 375px phone frame.
 *
 * @param ui - chrome to measure
 */
function renderAtPhoneWidth(ui: ReactElement) {
  return render(
    <div data-phone-frame style={{ width: PHONE_WIDTH_PX }}>
      {ui}
    </div>,
  )
}

describe('mobile chrome at phone width', () => {
  it('the path control and the title fit the bar without a field that would zoom', () => {
    renderAtPhoneWidth(
      <MobileTopBar
        title="A long phase name that should ellipsize rather than overflow"
        navOpen={false}
        onToggleNav={() => {}}
        rightSlot={
          <MobilePathSelector
            paths={[
              {
                id: 'p1',
                name: 'Happy path with a long label',
                kind: 'happy',
                summary: null,
                note: null,
              },
              {
                id: 'p2',
                name: 'Exception',
                kind: 'exception',
                summary: null,
                note: null,
              },
            ]}
            activePathId="p1"
            onSelect={() => {}}
          />
        }
      />,
    )

    const frame = document.querySelector('[data-phone-frame]')
    expect(frame).not.toBeNull()

    const title = screen.getByRole('heading', { level: 1 })
    expect(title.className).toMatch(/\btext-sm\b/)
    expect(title.className).toMatch(/\btruncate\b/)
    expect(title.className).not.toMatch(/\btext-(?:2xs|3xs|4xs|5xs)\b/)

    const path = screen.getByLabelText('Path: Happy path with a long label')
    expect(path.tagName).toBe('BUTTON')
    expect(path.className).toMatch(/\btext-xs\b/)
    expect(path.className).toMatch(/\bmax-w-40\b/)
    expect(path.querySelector('.truncate')).not.toBeNull()
    expect(path.className).not.toMatch(/\btext-(?:2xs|3xs|4xs|5xs)\b/)

    expect(frame?.querySelectorAll('input, textarea, select')).toHaveLength(0)
  })

  it('empty-index copy at xs sits in padded rows, not a clipped line', () => {
    renderAtPhoneWidth(
      <MobileNavSheet
        open
        onOpenChange={() => {}}
        surface="blueprints"
        onSurfaceChange={() => {}}
        slices={[]}
        slicesLoading={false}
        phases={[]}
        scenariosByPhase={new Map()}
        slides={[]}
        phasesLoading={false}
        expandedPhaseIds={new Set()}
        onPhaseExpandedChange={() => {}}
        selectedPhaseId={null}
        selectedScenarioId={null}
        onSelectSlice={() => {}}
        onSelectScenario={() => {}}
      />,
    )

    const empty = screen.getByText('No phases in this workspace yet.')
    expect(empty.className).toMatch(/\btext-xs\b/)
    expect(empty.className).toMatch(/\bpx-2\b/)
    expect(empty.className).not.toMatch(/\btext-(?:2xs|3xs|4xs|5xs)\b/)
    expect(empty.className).not.toMatch(/\boverflow-hidden\b/)
  })

  it('settings fields stay at 16px below md, so focus does not zoom the page', () => {
    /*
      Measured assertion, not a layout probe: jsdom will not compute the
      focused size of a field inside the settings sheet. The phone hosts
      those fields through the shared Input primitive, which #534 moved to
      `text-lg md:text-sm` so `base` dropping to 15px could not zoom iOS.
      `lg` is 1rem — 16px at the root this app never overrides.
    */
    expect(INPUT).toMatch(/\btext-lg\b/)
    expect(INPUT).toMatch(/\bmd:text-sm\b/)
    const lgFirst = INPUT.indexOf('text-lg')
    const smAtMd = INPUT.indexOf('md:text-sm')
    expect(lgFirst).toBeGreaterThan(-1)
    expect(smAtMd).toBeGreaterThan(lgFirst)
  })
})
