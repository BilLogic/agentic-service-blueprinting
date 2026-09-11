import { describe, expect, it } from 'vitest'
import { classListOf } from '@/lib/classList'
import { PANEL_TEXT } from '@/lib/panelText'

/**
 * Title / label / value / meta at 12–13px, distinguished by weight and
 * colour alone. ADR 0012: one pixel is not a signal, so the hierarchy
 * size used to carry moves onto those two axes. Colour takes over the
 * value-vs-meta split.
 */

const WEIGHT = /^font-(normal|medium|semibold)$/
const COLOUR = /^text-(foreground|muted-foreground)/

/**
 * The weight and colour utilities a panel role writes.
 *
 * Missing weight is 400 — the working weight need not be spelled. The
 * test still records it so two roles that share a colour cannot hide
 * behind an omitted class.
 *
 * @param classes - a PANEL_TEXT role
 */
function weightAndColour(classes: string): { weight: string; colour: string } {
  const list = classListOf(classes)
  const weight = list.find((token) => WEIGHT.test(token))
  const colour = list.find((token) => COLOUR.test(token))
  expect(weight, `a weight utility on ${classes}`).toBeDefined()
  expect(colour, `a colour utility on ${classes}`).toBeDefined()
  return { weight: weight!, colour: colour! }
}

describe('PANEL_TEXT', () => {
  it('distinguishes title, label, value and meta by weight and colour', () => {
    const title = weightAndColour(PANEL_TEXT.title)
    const label = weightAndColour(PANEL_TEXT.sectionLabel)
    const value = weightAndColour(PANEL_TEXT.value)
    const meta = weightAndColour(PANEL_TEXT.meta)

    expect(title).toEqual({ weight: 'font-semibold', colour: 'text-foreground' })
    expect(label).toEqual({
      weight: 'font-medium',
      colour: 'text-muted-foreground',
    })
    expect(value.weight).toBe('font-normal')
    expect(meta.weight).toBe('font-normal')
    expect(value.colour).not.toBe(meta.colour)
    expect(meta.colour).toBe('text-muted-foreground')

    const signatures = [title, label, value, meta].map(
      (role) => `${role.weight} ${role.colour}`,
    )
    expect(new Set(signatures).size).toBe(4)
  })
})
