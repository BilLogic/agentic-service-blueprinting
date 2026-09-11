// @vitest-environment jsdom
/**
 * Every place a reader picks a path says how far along that path is.
 *
 * Dot, name, status: the same three the scenario panel shows. Inside a picker
 * the row is already one control — a button, a checkbox label, a menu item —
 * so the status is part of that control's text rather than a second control
 * nested in it. A focusable badge inside the row would take a click meant for
 * the row, and a nested control is one a screen reader cannot reach cleanly.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  PathMultiSelect,
  type PathOption,
} from '@/components/blueprint/PathMultiSelect'
import { WalkthroughPathSelect } from '@/components/blueprint/WalkthroughPathSelect'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ENTITY_STATUS_SHORT } from '@/lib/entityStatus'
import type { BlueprintData } from '@/types/blueprint'

afterEach(cleanup)

const PLANNED: PathOption = {
  id: 'variant:Card declined',
  name: 'Card declined',
  summary: null,
  kind: 'variant',
  status: 'planned',
}
const LIVE: PathOption = {
  id: 'happy:First visit',
  name: 'First visit',
  summary: null,
  kind: 'happy',
  status: 'live',
}

function blueprint(option: PathOption, id: string): BlueprintData {
  return {
    path: {
      id,
      name: option.name,
      summary: null,
      note: null,
      kind: option.kind,
      status: option.status ?? 'live',
    },
    lanes: [],
    steps: [],
    cells: [],
    dependencies: [],
  }
}

/** The badge is text in its row, never a focusable of its own. */
function expectStatusInsideOneControl(word: string) {
  const badge = screen.getByText(word)
  const row = badge.closest('button, label, [role^="menuitem"]')
  expect(row).not.toBeNull()
  expect(badge.hasAttribute('tabindex')).toBe(false)
}

describe('path status in the pickers', () => {
  it.each(['vertical', 'notion', 'toolbar'] as const)(
    'shows each path’s status in the %s picker',
    (layout) => {
      render(
        <TooltipProvider>
          <PathMultiSelect
            paths={[LIVE, PLANNED]}
            selectedPathIds={[LIVE.id]}
            onToggle={() => {}}
            layout={layout}
          />
        </TooltipProvider>,
      )
      expectStatusInsideOneControl(ENTITY_STATUS_SHORT.planned)
      expectStatusInsideOneControl(ENTITY_STATUS_SHORT.live)
    },
  )

  it('shows nothing for an option built without a status', () => {
    const { container } = render(
      <TooltipProvider>
        <PathMultiSelect
          paths={[{ ...LIVE, status: undefined }]}
          selectedPathIds={[]}
          onToggle={() => {}}
          layout="vertical"
        />
      </TooltipProvider>,
    )
    expect(container.textContent).not.toContain(ENTITY_STATUS_SHORT.live)
  })

  it('shows each path’s status in the walkthrough’s path menu', async () => {
    render(
      <TooltipProvider>
        <WalkthroughPathSelect
          blueprints={[blueprint(LIVE, 'p-live'), blueprint(PLANNED, 'p-planned')]}
          value="p-live"
          onChange={() => {}}
        />
      </TooltipProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Choose a different path/ }))
    await screen.findByText(ENTITY_STATUS_SHORT.planned)
    expectStatusInsideOneControl(ENTITY_STATUS_SHORT.planned)
  })
})
