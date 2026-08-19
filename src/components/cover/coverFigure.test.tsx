// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CoverFigure } from '@/components/cover/CoverFigure'

// Pins the lightbox contract: no separate close button (everything that
// isn't the diagram closes it on click), a plain pointer cursor on the
// thumbnail (the corner hint is the only "this expands" signal, not a
// second one from the cursor), and the two-step zoom on the opened image
// (fit -> full size -> fit again), each step swapping its own cursor and
// aria-label.

afterEach(cleanup)

const figure = {
  src: '/cover/example.svg',
  alt: 'An example diagram',
  width: 880,
  height: 400,
}

describe('CoverFigure', () => {
  it('opens on a plain pointer, not a zoom cursor — the corner hint is the only expand signal', () => {
    render(<CoverFigure figure={figure} />)
    const trigger = screen.getByRole('button', { name: 'Expand: An example diagram' })
    expect(trigger.className).toContain('cursor-pointer')
    expect(trigger.className).not.toContain('cursor-zoom-in')
  })

  it('opens the popup with no visible, focusable close button', () => {
    render(<CoverFigure figure={figure} />)
    fireEvent.click(screen.getByRole('button', { name: 'Expand: An example diagram' }))
    expect(screen.getByRole('dialog')).toBeDefined()
    /*
      The invisible full-bleed close catcher is still a `button` by role —
      that is how any click outside the diagram closes the popup — but it
      is `tabIndex={-1}` and carries no visible chrome, unlike the removed
      corner X. What is actually gone is a FOCUSABLE, visible close control;
      this asserts that, not the absence of the catcher itself.
    */
    const closeButtons = screen.getAllByRole('button', { name: 'Close' })
    expect(closeButtons).toHaveLength(1)
    expect(closeButtons[0]?.getAttribute('tabIndex')).toBe('-1')
  })

  it('the open image starts fit-to-viewport, zoom-in cursor, and expands on click', () => {
    render(<CoverFigure figure={figure} />)
    fireEvent.click(screen.getByRole('button', { name: 'Expand: An example diagram' }))

    const opened = screen.getByRole('img', { name: 'View at full size' })
    expect(opened.className).toContain('cursor-zoom-in')

    fireEvent.click(opened)
    const expanded = screen.getByRole('img', { name: 'Shrink to fit' })
    expect(expanded.className).toContain('cursor-zoom-out')
  })

  it('clicking the expanded image shrinks it back rather than closing the popup', () => {
    render(<CoverFigure figure={figure} />)
    fireEvent.click(screen.getByRole('button', { name: 'Expand: An example diagram' }))
    fireEvent.click(screen.getByRole('img', { name: 'View at full size' }))
    fireEvent.click(screen.getByRole('img', { name: 'Shrink to fit' }))

    // Still open, and back to the fit state — a click on the image toggles
    // its own zoom step and must not fall through to the close catcher
    // sitting behind it.
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByRole('img', { name: 'View at full size' })).toBeDefined()
  })

  it('every reopen starts fit, not wherever the last visit left off', () => {
    render(<CoverFigure figure={figure} />)
    fireEvent.click(screen.getByRole('button', { name: 'Expand: An example diagram' }))
    fireEvent.click(screen.getByRole('img', { name: 'View at full size' })) // expand
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Expand: An example diagram' }))
    expect(screen.getByRole('img', { name: 'View at full size' })).toBeDefined()
  })
})
