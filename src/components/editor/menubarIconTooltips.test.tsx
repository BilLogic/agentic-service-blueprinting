// @vitest-environment jsdom
/**
 * Every icon-only control in the phase menubar says what it does.
 *
 * `aria-label` is the tell: a button carries one exactly when its face does
 * not carry its name. A name on its own is not enough, because hover is
 * never the only way in — a sighted reader hovering a glyph learns nothing,
 * and a keyboard reader focusing it learns nothing either. So every such
 * button in the bar is asked twice, by pointer
 * and by focus, and must answer with a tooltip that says what the control
 * DOES — action copy, never the label read back (`IconTooltip`, rule 2).
 *
 * The roster is total. A button the roster does not know fails the test, so
 * a new glyph cannot arrive silent; a roster entry no button matches fails
 * too, so the roster cannot outlive the bar it describes.
 */
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PathOption } from '@/components/blueprint/PathMultiSelect'
import { SlideStickyHeader } from '@/components/editor/SlideStickyHeader'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EntityDetailProvider } from '@/contexts/EntityDetailContext'
import { PathSelectionProvider } from '@/contexts/PathSelectionContext'
import type { NavItem } from '@/types/nav'

// The Stacked/Merged toggle reads the scenario's layout off the editor; the
// bar under test has no editor, so it answers with the default.
vi.mock('@/contexts/EditorContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/contexts/EditorContext')>()),
  useEditor: () => ({
    getScenarioDisplayViewType: () => 'stacked',
    setScenarioDisplayViewType: () => {},
  }),
}))

const PHASE: NavItem = { id: 'phase-1', index: 0, label: 'Onboarding' }
const SCENARIO: NavItem = {
  id: 'scenario-1',
  index: 1,
  label: 'Employment & Access',
  parentId: 'phase-1',
}
const HAPPY: PathOption = {
  id: 'happy:Happy Path',
  name: 'Happy Path',
  summary: null,
  kind: 'happy',
}
const LATE: PathOption = {
  id: 'variant:Late Join',
  name: 'Late Join',
  summary: null,
  kind: 'variant',
}

/**
 * What each glyph button must say. Keyed by the accessible name, which is the
 * part a screen reader already has; the value is the part the sighted and
 * the keyboard reader were missing.
 */
const ROSTER: Array<{ name: RegExp; says: string }> = [
  { name: /^Stacked$/, says: 'Show each path as its own band' },
  { name: /^Merged$/, says: 'Show the paths merged into one grid' },
  { name: /^Paths shown/, says: 'Choose which paths are shown' },
]

/** Base UI's hover, as jsdom can deliver it — see `entityHeader.test.tsx`. */
function hover(element: HTMLElement) {
  fireEvent.pointerOver(element, { pointerType: 'mouse' })
  fireEvent.mouseEnter(element)
  fireEvent.mouseMove(element)
}
function unhover(element: HTMLElement) {
  fireEvent.mouseLeave(element)
  fireEvent.pointerLeave(element)
}

const OPEN_DELAY_BUDGET = { timeout: 3000 }

// Base UI's tooltip popup carries no `role="tooltip"`; the `data-slot` the
// app's own wrapper stamps on it is the seam.
const tooltipSaying = (text: string) =>
  [...document.querySelectorAll('[data-slot="tooltip-content"]')].find(
    (node) => node.textContent?.trim() === text,
  ) ?? null

const glyphButtons = () =>
  [
    ...document.querySelectorAll<HTMLButtonElement>(
      '[data-editor-navbar] button[aria-label]:has(svg)',
    ),
  ]

function mountBar() {
  /*
    Inside the entity panel's provider, which `EditorShell` mounts above every
    tree in the app. The header's title is an affordance that reads the panel
    through `useEntityDetail`, and that hook throws outside the provider rather
    than returning an inert value — so a surface rendered on its own brings it.
  */
  return render(
    <EntityDetailProvider>
      <TooltipProvider>
        <PathSelectionProvider>
          <SlideStickyHeader
            slide={SCENARIO}
            slides={[PHASE, SCENARIO]}
            paths={[HAPPY, LATE]}
            selectedPathIds={[HAPPY.id, LATE.id]}
          />
        </PathSelectionProvider>
      </TooltipProvider>
    </EntityDetailProvider>,
  )
}

afterEach(cleanup)

describe('the phase menubar, glyph by glyph', () => {
  it('has a roster entry for every glyph button, and a button for every entry', () => {
    mountBar()
    const names = glyphButtons().map((b) => b.getAttribute('aria-label') ?? '')
    const unlisted = names.filter((n) => !ROSTER.some((e) => e.name.test(n)))
    expect(unlisted, 'glyph buttons the roster does not know').toEqual([])
    const unmatched = ROSTER.filter((e) => !names.some((n) => e.name.test(n)))
    expect(unmatched.map((e) => e.name.source), 'roster entries no button matches').toEqual([])
  })

  for (const entry of ROSTER) {
    it(`"${entry.name.source}" says what it does on hover`, async () => {
      mountBar()
      const button = glyphButtons().find((b) =>
        entry.name.test(b.getAttribute('aria-label') ?? ''),
      )!
      hover(button)
      await waitFor(
        () => expect(tooltipSaying(entry.says)).not.toBeNull(),
        OPEN_DELAY_BUDGET,
      )
      unhover(button)
    })

    it(`"${entry.name.source}" says what it does on keyboard focus`, async () => {
      mountBar()
      const button = glyphButtons().find((b) =>
        entry.name.test(b.getAttribute('aria-label') ?? ''),
      )!
      // Keyboard modality first: a tooltip opens for a focus the reader can
      // see, and Base UI decides that from how focus arrived.
      fireEvent.keyDown(document.body, { key: 'Tab' })
      act(() => button.focus())
      await waitFor(
        () => expect(tooltipSaying(entry.says)).not.toBeNull(),
        OPEN_DELAY_BUDGET,
      )
    })
  }
})
