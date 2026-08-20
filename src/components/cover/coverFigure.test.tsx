// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CoverFigure } from '@/components/cover/CoverFigure'

// Pins the lightbox contract: no separate close button, a plain pointer
// cursor on the thumbnail (the corner hint is the only "this expands"
// signal, not a second one from the cursor), and ONE state in the popup —
// fit to viewport, every click closes, the diagram included. The opened
// image used to carry a second zoom step; these tests are what stop it
// coming back by accident.

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

  it('the open image is fit-to-viewport with no second zoom step', () => {
    render(<CoverFigure figure={figure} />)
    fireEvent.click(screen.getByRole('button', { name: 'Expand: An example diagram' }))

    const opened = screen.getByRole('img', { name: 'An example diagram' })
    expect(opened.className).toContain('max-h-full')
    expect(opened.className).not.toContain('cursor-zoom-in')
    expect(opened.className).not.toContain('cursor-zoom-out')
    // Nothing to click into: the fit/full-size pair is gone, labels and all.
    expect(screen.queryByRole('img', { name: 'View at full size' })).toBeNull()
    expect(screen.queryByRole('img', { name: 'Shrink to fit' })).toBeNull()
  })

  it('closes on a click on the diagram itself', () => {
    render(<CoverFigure figure={figure} />)
    fireEvent.click(screen.getByRole('button', { name: 'Expand: An example diagram' }))

    // The diagram is hit-testable and closes through its own handler. It is
    // deliberately NOT `pointer-events-none` — inert would mean it could not
    // be right-clicked, and these are reference diagrams worth saving.
    const opened = screen.getByRole('img', { name: 'An example diagram' })
    expect(opened.className).not.toContain('pointer-events-none')

    fireEvent.click(opened)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes on a click that misses the diagram', () => {
    render(<CoverFigure figure={figure} />)
    fireEvent.click(screen.getByRole('button', { name: 'Expand: An example diagram' }))

    const catcher = screen.getByRole('button', { name: 'Close' })
    // The other half of "every click closes": the catcher has to actually
    // cover the popup. jsdom does not hit-test, so its geometry can only be
    // pinned by the class that produces it.
    expect(catcher.className).toContain('inset-0')

    fireEvent.click(catcher)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes on Escape, which is the only keyboard exit', () => {
    render(<CoverFigure figure={figure} />)
    fireEvent.click(screen.getByRole('button', { name: 'Expand: An example diagram' }))

    // Nothing in the popup is tabbable by design — the close catcher is
    // `tabIndex={-1}` so it never draws a focus ring around the whole
    // surface. That makes Escape load-bearing rather than incidental.
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('reopens cleanly after being closed', () => {
    render(<CoverFigure figure={figure} />)
    fireEvent.click(screen.getByRole('button', { name: 'Expand: An example diagram' }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Expand: An example diagram' }))
    expect(screen.getByRole('img', { name: 'An example diagram' })).toBeDefined()
  })
})
