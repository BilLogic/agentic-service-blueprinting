// @vitest-environment jsdom
/**
 * Taking a slide's last cell out removes the slide. When the slide carries a
 * caption or an uploaded image, the session asks first — whichever way the
 * cell left: the strip's ✕, a drag, a click on the canvas, or clearing the
 * canvas. The canvas ways are exercised here through the pick context the
 * canvas itself uses.
 */
import { useContext } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SliceEditSession } from '@/components/editor/SliceEditSession'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CellPickContext } from '@/contexts/cellPickContext'
import type { SliceDetail } from '@/hooks/useSlice'

vi.mock('@/contexts/SupabaseProvider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/contexts/SupabaseProvider')>()),
  useSupabase: () => ({ client: null }),
}))
vi.mock('@/contexts/canvasModeContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/contexts/canvasModeContext')>()),
  useCanvasModeValue: () => 'design',
}))
vi.mock('@/components/editor/SlideImagesField', () => ({
  SlideImagesField: () => null,
}))

afterEach(cleanup)

/** The canvas, reduced to the two gestures that take cells out. */
function Canvas() {
  const pick = useContext(CellPickContext)
  return (
    <div>
      <button type="button" onClick={() => pick?.pick('cell-3')}>
        Click cell 3 on the canvas
      </button>
      <button type="button" onClick={() => pick?.clear()}>
        Clear the canvas
      </button>
    </div>
  )
}

/**
 * A saved slice of two slides; the second holds one cell.
 *
 * @param {{ caption: string, uploads: number }} second What the second slide carries.
 * @returns {SliceDetail} The detail the session opens on.
 */
function detail(second: { caption: string; uploads: number }): SliceDetail {
  return {
    slice: {
      id: 'slice-1',
      title: 'A slice',
      summary: '',
      kind: 'custom',
      actor: '',
    },
    items: [
      {
        id: 's1',
        position: 0,
        cell_ids: ['cell-1', 'cell-2'],
        title: 'Opening',
        caption: '',
        shows_all_images: true,
        slide_images: [],
      },
      {
        id: 's2',
        position: 1,
        cell_ids: ['cell-3'],
        title: 'Setup',
        caption: second.caption,
        shows_all_images: second.uploads === 0,
        slide_images: Array.from({ length: second.uploads }, (_, position) => ({
          position,
          cell_id: null,
          image_url: `https://example.test/upload-${position}.png`,
        })),
      },
    ],
  } as unknown as SliceDetail
}

/**
 * Open the session on a slice.
 *
 * @param {SliceDetail} opened The slice.
 * @returns {void}
 */
function open(opened: SliceDetail) {
  render(
    <TooltipProvider>
      <SliceEditSession detail={opened} onClose={() => {}}>
        <Canvas />
      </SliceEditSession>
    </TooltipProvider>,
  )
}

describe('removing a slide with content asks first', () => {
  it('asks when a canvas click takes the last cell of a captioned slide', () => {
    open(detail({ caption: 'What a reader meets', uploads: 0 }))
    fireEvent.click(screen.getByText('Click cell 3 on the canvas'))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Remove slide 2, “Setup”?')).toBeTruthy()
    expect(
      screen.getByText(
        'With no cells left, this slide will be removed along with its caption.',
      ),
    ).toBeTruthy()
    // Nothing has moved yet.
    expect(screen.getByLabelText('Slide 2 title')).toBeTruthy()
  })

  it('keeps the slide and its cell on Keep slide', () => {
    open(detail({ caption: 'What a reader meets', uploads: 0 }))
    fireEvent.click(screen.getByText('Click cell 3 on the canvas'))
    fireEvent.click(screen.getByRole('button', { name: 'Keep slide' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByLabelText('Slide 2 title')).toBeTruthy()
  })

  it('removes the slide on Remove slide', () => {
    open(detail({ caption: '', uploads: 2 }))
    fireEvent.click(screen.getByText('Click cell 3 on the canvas'))
    expect(
      screen.getByText(
        'With no cells left, this slide will be removed along with its 2 uploaded images.',
      ),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove slide' }))

    expect(screen.queryByLabelText('Slide 2 title')).toBeNull()
    expect(screen.getByLabelText('Slide 1 title')).toBeTruthy()
  })

  it('asks when clearing the canvas would take a slide with content', () => {
    open(detail({ caption: 'What a reader meets', uploads: 1 }))
    fireEvent.click(screen.getByText('Clear the canvas'))

    expect(screen.getByText('Remove slide 2, “Setup”?')).toBeTruthy()
    expect(
      screen.getByText(
        'With no cells left, this slide will be removed along with its caption and uploaded image.',
      ),
    ).toBeTruthy()
  })

  it('asks when the strip’s ✕ takes the last cell', () => {
    open(detail({ caption: 'What a reader meets', uploads: 0 }))
    // The third ✕ is the second slide's only cell.
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Remove cell from slice' })[2],
    )
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('removes a slide nobody wrote on without asking', () => {
    open(detail({ caption: '', uploads: 0 }))
    fireEvent.click(screen.getByText('Click cell 3 on the canvas'))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByLabelText('Slide 2 title')).toBeNull()
  })
})
