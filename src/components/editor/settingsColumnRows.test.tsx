// @vitest-environment jsdom
/**
 * The ⚙ settings column is one column, and these are the two things that
 * hold true of every row in it — whichever component contributed the row.
 *
 * FACE. Monospace is for code and identifiers (`typography.md`). A model id
 * and an API key are identifiers and belong in it. A provider's label
 * (`Anthropic Claude`) and the developer rows are ordinary English, and
 * belong in the body face beside the labels and prose around them.
 *
 * ALIGNMENT. One label width down the whole column, so the control edge does
 * not jog partway down the popover. Which width is a design decision; that
 * there is only one of them is the rule.
 *
 * Both are written against the rule and not the class list. The table below
 * says what kind of thing each row's VALUE is and the face follows from
 * that; the width test never names a width. A row added to the column
 * without an entry fails the roster — so a new row cannot quietly pick a
 * face nobody chose.
 *
 * `font-mono` is the one class name this file knows, and it knows it in one
 * place: jsdom loads no stylesheet, so the class is the only evidence of the
 * face there is.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentSettingsFields } from '@/components/editor/AgentSettingsFields'
import { DEFAULT_MODELS } from '@/lib/agent/settings'

// Unconfigured: the agent rows and the developer section, and no sign-in
// form — which is the whole of the column that carries labelled rows.
const mockSupabase = {
  client: null as unknown,
  session: null,
  canAgent: false,
  configured: false,
  devSimulation: { on: false, tier: 'regular' },
}
vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => mockSupabase,
}))

/** What a row's value IS. The face is derived from this, never asserted raw. */
const ROW_VALUE: Record<string, 'identifier' | 'prose'> = {
  // `AGENT_PROVIDERS` labels — "Google Gemini", "Anthropic Claude".
  Provider: 'prose',
  // A model id — "claude-opus-5".
  Model: 'identifier',
  'API key': 'identifier',
  // A switch: no value text at all, so nothing that could be an identifier.
  Simulate: 'prose',
  // "Admin" / "Regular".
  'User type': 'prose',
}

const wearsMono = (element: Element) =>
  element.matches('.font-mono') || element.querySelector('.font-mono') !== null

/**
 * A labelled row: a `<span>` label leading a row that also holds a control.
 * Found by shape rather than by name, so a row this file has never heard of
 * still turns up.
 */
function labelledRows(root: HTMLElement) {
  return Array.from(root.querySelectorAll('span')).flatMap((label) => {
    const row = label.parentElement
    if (!row || row.firstElementChild !== label) return []
    if (row.childElementCount < 2) return []
    return [{ name: (label.textContent ?? '').trim(), row }]
  })
}

const openMenu = () =>
  document.querySelector('[data-slot="dropdown-menu-content"]')
const closeMenu = () =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })

beforeEach(() => {
  window.localStorage.clear()
})
afterEach(cleanup)

describe('the settings column, read as one column', () => {
  it('gives every labelled row the face its value calls for', () => {
    const { container } = render(<AgentSettingsFields />)
    const rows = labelledRows(container)

    // A row with no entry above is a row whose face nobody decided.
    expect(rows.map((row) => row.name).sort()).toEqual(
      Object.keys(ROW_VALUE).sort(),
    )
    for (const { name, row } of rows) {
      expect(wearsMono(row), `the ${name} row`).toBe(
        ROW_VALUE[name] === 'identifier',
      )
    }
  })

  it('lines the controls up on one label width, whichever it is', () => {
    const { container } = render(<AgentSettingsFields />)
    const widths = new Set(
      labelledRows(container).map(({ row }) =>
        Array.from(row.firstElementChild?.classList ?? []).find((name) =>
          name.startsWith('w-'),
        ),
      ),
    )
    expect(widths.size).toBe(1)
    // Not `w-14` on purpose: a column that agreed on nothing would also be
    // a set of one.
    expect([...widths][0]).toBeDefined()
  })

  it('carries the same faces into the open menus', () => {
    render(<AgentSettingsFields />)

    // Provider: English labels on the trigger, English labels in the list.
    fireEvent.click(screen.getByRole('button', { name: 'Google Gemini' }))
    expect(openMenu()).not.toBeNull()
    expect(screen.getByText('Anthropic Claude')).toBeDefined()
    expect(wearsMono(openMenu() as Element)).toBe(false)
    closeMenu()
    expect(openMenu()).toBeNull()

    // Model: a list of ids, and they keep the identifier face.
    // Named through DEFAULT_MODELS, not spelled out: refreshing the no-key
    // list should not break a test about typography.
    fireEvent.click(screen.getByRole('button', { name: DEFAULT_MODELS.google }))
    expect(wearsMono(openMenu() as Element)).toBe(true)
    closeMenu()
    expect(openMenu()).toBeNull()
  })
})
