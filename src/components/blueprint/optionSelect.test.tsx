// @vitest-environment jsdom
/**
 * Status is the same control as the selects beside it (#256).
 *
 * The bug: the cell panel's Status row was a native `<select>` between two
 * designed ones — the browser's own chevron and line box, `h-7` clipping
 * "Live — in use today" along the bottom, `w-fit` re-sizing the row every
 * time the value changed.
 *
 * jsdom performs no layout, so "nothing is clipped" and "the width does not
 * move" are not measurable here. What IS observable, and what the geometry
 * follows from, is asserted: the trigger names its value in full without the
 * list ever being opened, the list carries every full label, choosing hands
 * back the value, and the trigger is in the tab order.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StatusSelect } from '@/components/blueprint/StatusSelect'
import { ENTITY_STATUS, ENTITY_STATUS_LABEL } from '@/lib/entityStatus'

const triggers = () =>
  [...document.querySelectorAll<HTMLElement>('[data-slot="select-trigger"]')]
const trigger = () => triggers()[0]
const options = () => screen.queryAllByRole('option')
const open = (element: HTMLElement) =>
  fireEvent.mouseDown(element, { button: 0 })
// A real mouse pick has to START on the item: Base UI ignores a click whose
// pointer never went down there (an item can open under the cursor).
function choose(name: string) {
  const option = screen.getByRole('option', { name })
  fireEvent.pointerDown(option, { pointerType: 'mouse', button: 0 })
  fireEvent.click(option)
}

afterEach(cleanup)

describe('the status select', () => {
  it('names its value in full before the list is ever opened', () => {
    render(<StatusSelect value="live" onChange={() => {}} />)
    expect(trigger().textContent).toContain(ENTITY_STATUS_LABEL.live)
    expect(options()).toEqual([])
  })

  it('lists every status by its full label, and hands back the one chosen', async () => {
    const onChange = vi.fn()
    render(<StatusSelect value="live" onChange={onChange} />)
    open(trigger())
    await waitFor(() => expect(options()).toHaveLength(ENTITY_STATUS.length))
    expect(options().map((o) => o.textContent?.trim())).toEqual(
      ENTITY_STATUS.map((status) => ENTITY_STATUS_LABEL[status]),
    )
    choose(ENTITY_STATUS_LABEL.deprecated)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('deprecated'))
  })

  it('is in the tab order', () => {
    render(<StatusSelect value="live" onChange={() => {}} />)
    expect(trigger().tabIndex).toBeGreaterThanOrEqual(0)
  })
})
