// @vitest-environment jsdom
/**
 * The Status field explains itself the way Summary does.
 *
 * A hint that discloses on hover, not a bare label sitting mute beside a
 * neighbour that has one — and a plain field label rather than a badge
 * caption, because the badge is the VALUE. Asserted by rendering
 * `CellContentSection` and hovering the label, so the claim is about what a
 * reader gets rather than about a prop.
 *
 * The deployment this came from pairs it with a check that its own brand
 * appears in none of the panel files. That half stays there: the brand a
 * deployment keeps out of shared code is its own, and this tree's guard
 * against naming any deployment is `scripts/tests/standalone.test.mjs`,
 * which reads every file rather than a list.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({ client: {}, configured: true }),
}))
vi.mock('@/hooks/useBlueprintCell', () => ({
  useBlueprintCell: () => ({
    status: 'live',
    owner: null,
    perceived_owner: null,
  }),
}))

import { CellContentSection } from '@/components/blueprint/CellContentSection'

afterEach(cleanup)

/**
 * Hover, as Base UI actually learns it — pointerover carrying `pointerType`,
 * then mouseenter and mousemove. The same sequence `definitionCard.test.tsx`
 * uses, and for the same reason: jsdom has no `PointerEvent`.
 */
function hover(element: Element) {
  const trigger =
    element.closest('[tabindex], [role="button"], button') ?? element
  const pointerOver = new MouseEvent('pointerover', {
    bubbles: true,
    cancelable: true,
  })
  Object.defineProperty(pointerOver, 'pointerType', { value: 'mouse' })
  trigger.dispatchEvent(pointerOver)
  fireEvent.mouseEnter(trigger)
  fireEvent.mouseMove(trigger)
}

describe('the Status field carries a hint like Summary', () => {
  it('discloses what Status means on hover, and reads as a plain label', async () => {
    render(<CellContentSection cellId="cell-1" />)
    const label = screen.getByText('Status')
    // A plain field label, not a badge caption.
    expect(label.hasAttribute('data-panel-term-badge')).toBe(false)
    hover(label)
    expect(
      await screen.findByText('How far along the thing this cell describes is.'),
    ).not.toBeNull()
  })
})

