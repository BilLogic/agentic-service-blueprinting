// @vitest-environment jsdom
/**
 * The zoom indicator's four controls are named and wired: −, +, fit, and
 * Reset View each invoke the stub they were given.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorZoomIndicator } from '@/components/editor/EditorZoomIndicator'

afterEach(cleanup)

describe('EditorZoomIndicator', () => {
  it('names zoom out, zoom in, fit, and reset, and forwards each click', () => {
    const zoomOut = vi.fn()
    const zoomIn = vi.fn()
    const fitToView = vi.fn()
    const onResetView = vi.fn()

    render(
      <EditorZoomIndicator
        onResetView={onResetView}
        zoomOut={zoomOut}
        zoomIn={zoomIn}
        fitToView={fitToView}
      />,
    )

    const zoomOutButton = screen.getByRole('button', { name: 'Zoom out' })
    const zoomInButton = screen.getByRole('button', { name: 'Zoom in' })
    const fitButton = screen.getByRole('button', { name: 'Fit to view' })
    const resetButton = screen.getByRole('button', { name: 'Reset view' })

    expect(zoomOutButton).toBeTruthy()
    expect(zoomInButton).toBeTruthy()
    expect(fitButton).toBeTruthy()
    expect(resetButton).toBeTruthy()

    fireEvent.click(zoomOutButton)
    fireEvent.click(zoomInButton)
    fireEvent.click(fitButton)
    fireEvent.click(resetButton)

    expect(zoomOut).toHaveBeenCalledOnce()
    expect(zoomIn).toHaveBeenCalledOnce()
    expect(fitToView).toHaveBeenCalledWith({ animate: true })
    expect(onResetView).toHaveBeenCalledOnce()
  })
})
