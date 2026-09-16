// @vitest-environment jsdom
/**
 * The path selector is a plain bordered control.
 *
 * It wore a second, brand-coloured dot beside the label: the label already
 * says which paths are shown, so the dot repeated it in a colour that had
 * nothing to do with the path colours stacked on its left — two dot
 * vocabularies in one control, one of which meant nothing.
 *
 * The brand hue still has to reach exactly four jobs, so the fourth moves
 * INSIDE: the marker on a selected row in the popover, which is the one place
 * in this control where brand marks a choice rather than restating a label.
 *
 * Measured on what is drawn: the trigger's own classes and the marker that
 * carries the brand, not a snapshot of the control.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { PathOption } from '@/components/blueprint/PathMultiSelect'
import { PathSelectorMenu } from '@/components/editor/PathSelectorMenu'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PathSelectionProvider } from '@/contexts/PathSelectionContext'

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

function mount() {
  return render(
    <TooltipProvider>
      <PathSelectionProvider>
        <PathSelectorMenu options={[HAPPY, LATE]} />
      </PathSelectionProvider>
    </TooltipProvider>,
  )
}

const trigger = () => screen.getByLabelText(/^Paths shown/)

/** Open the popover and let its mount settle, so the rows are queryable. */
async function open() {
  fireEvent.click(trigger())
  await act(async () => {})
}

afterEach(cleanup)

describe('the path selector trigger', () => {
  it('sits on the md rung, the rung a plain control sits on', () => {
    mount()
    const classes = trigger().className.split(/\s+/)
    expect(classes).toContain('rounded-md')
    expect(classes).not.toContain('rounded-full')
  })

  it('truncates its label at 10rem', () => {
    mount()
    const label = trigger().querySelector('[data-path-selector-label]')
    expect(label?.className).toContain('max-w-[10rem]')
    expect(label?.className).toContain('truncate')
  })

  it('draws 8px path-colour dots and no second vocabulary beside them', async () => {
    mount()
    await open()
    fireEvent.click(screen.getByRole('button', { name: 'Happy Path' }))
    // Selected, which is the state the brand dot used to appear in.
    expect(trigger().querySelector('[data-path-selector-status]')).toBeNull()
    expect(trigger().className).not.toContain('bg-brand')
    for (const dot of trigger().querySelectorAll('[data-path-selector-dot]')) {
      const classes = dot.className.split(/\s+/)
      expect(classes).toContain('size-2')
      expect(classes).not.toContain('bg-brand')
    }
  })
})

describe('the path selector popover', () => {
  it('marks the selected row with the brand hue — the fourth brand job', async () => {
    mount()
    await open()
    const row = screen.getByRole('button', { name: 'Happy Path' })
    fireEvent.click(row)
    // Read off the attribute: the mark is an SVG, whose `className` is an
    // SVGAnimatedString rather than a string, and a `toContain` on that passes
    // nothing and fails everything.
    const marker = row.querySelector('[data-path-selector-mark]')
    expect(marker?.getAttribute('class')).toContain('text-brand')
  })
})
