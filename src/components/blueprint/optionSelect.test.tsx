// @vitest-environment jsdom
/**
 * Status is the same control as the selects beside it.
 *
 * The bug: the cell panel's Status row was a native `<select>` between two
 * designed ones — the browser's own chevron and line box, `h-7` clipping
 * "Live — in use today" along the bottom, `w-fit` re-sizing the row every
 * time the value changed. `RoleSelect` was a second copy of the same
 * element with the same clipping.
 *
 * jsdom performs no layout, so "nothing is clipped" and "the width does not
 * move" are not measurable here. What IS observable, and what the geometry
 * follows from, is asserted: the two selects are one control (they render
 * one trigger, identically classed), that trigger names its value without the
 * list ever being opened, the list carries every status as a name over its
 * meaning, choosing hands back the value, and the trigger is in the tab
 * order.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RoleSelect } from '@/components/blueprint/RoleSelect'
import { StatusSelect } from '@/components/blueprint/StatusSelect'
import {
  ENTITY_STATUS,
  ENTITY_STATUS_MEANING,
  ENTITY_STATUS_SHORT,
} from '@/lib/entityStatus'
import { TOUCHPOINT_ROLE_OPTIONS } from '@/lib/touchpointRole'

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
  it('names its value before the list is ever opened', () => {
    render(<StatusSelect value="live" onChange={() => {}} />)
    expect(trigger().textContent).toContain(ENTITY_STATUS_SHORT.live)
    expect(options()).toEqual([])
  })

  /*
   * An option used to be one string — "Live — in use today" — authored in a
   * label record beside the meaning record the badge's hover reads, so the
   * same state was explained twice in two different sentences. It is now the
   * name and the meaning as two nodes, and the meaning node is the meaning
   * record's own line.
   *
   * This asserts on the RENDERED option, not on whatever builds it: a check
   * over the option list as data stays green while the control draws only the
   * name, or draws the two glued back together.
   */
  it('shows every status as its name over its meaning, in two nodes', async () => {
    render(<StatusSelect value="live" onChange={() => {}} />)
    open(trigger())
    await waitFor(() => expect(options()).toHaveLength(ENTITY_STATUS.length))
    for (const [index, status] of ENTITY_STATUS.entries()) {
      const option = options()[index]!
      const lines = [...option.querySelectorAll('span')].map((node) =>
        node.textContent?.trim(),
      )
      expect(lines, status).toContain(ENTITY_STATUS_SHORT[status])
      expect(lines, status).toContain(ENTITY_STATUS_MEANING[status])
    }
  })

  it('never glues the meaning onto the name with a dash', async () => {
    render(<StatusSelect value="live" onChange={() => {}} />)
    open(trigger())
    await waitFor(() => expect(options()).toHaveLength(ENTITY_STATUS.length))
    for (const option of options()) {
      expect(option.textContent, option.textContent ?? '').not.toContain(' — ')
    }
  })

  it('hands back the status chosen', async () => {
    const onChange = vi.fn()
    render(<StatusSelect value="live" onChange={onChange} />)
    open(trigger())
    await waitFor(() => expect(options()).toHaveLength(ENTITY_STATUS.length))
    const deprecated = options()[ENTITY_STATUS.indexOf('deprecated')]!
    fireEvent.pointerDown(deprecated, { pointerType: 'mouse', button: 0 })
    fireEvent.click(deprecated)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('deprecated'))
  })

  it('is in the tab order', () => {
    render(<StatusSelect value="live" onChange={() => {}} />)
    expect(trigger().tabIndex).toBeGreaterThanOrEqual(0)
  })
})

describe('the role select', () => {
  it('names the unmarked state as a choice, and hands back null for it', async () => {
    const onChange = vi.fn()
    render(<RoleSelect value="core" onChange={onChange} />)
    open(trigger())
    await waitFor(() =>
      expect(options()).toHaveLength(TOUCHPOINT_ROLE_OPTIONS.length),
    )
    choose('Unmarked — nobody has judged this')
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null))
  })

  it('shows the unmarked label when nothing has been judged', () => {
    render(<RoleSelect value={null} onChange={() => {}} />)
    expect(trigger().textContent).toContain('Unmarked — nobody has judged this')
  })
})

describe('status and role together', () => {
  it('are one control: the same trigger, identically drawn', () => {
    render(
      <>
        <StatusSelect value="live" onChange={() => {}} />
        <RoleSelect value={null} onChange={() => {}} />
      </>,
    )
    const [status, role] = triggers()
    expect(status.tagName).toBe(role.tagName)
    expect(status.className).toBe(role.className)
  })
})
