// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CellResourcesTab } from '@/components/blueprint/CellResourcesTab'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { CellResource } from '@/types/blueprint'

const rpc = vi.fn()
vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({ client: { rpc }, canWrite: true }),
}))
vi.mock('@/contexts/canvasModeContext', () => ({ useCanvasModeValue: () => 'design' }))
vi.mock('@/hooks/useSupabaseQuery', () => ({ invalidateQueries: () => {} }))
vi.mock('@/lib/authoringSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/authoringSession')>()),
  recordChange: () => {},
}))
const uploadAttachment = vi.fn()
vi.mock('@/lib/attachmentUpload', () => ({
  uploadAttachment: (...args: unknown[]) => uploadAttachment(...args),
}))

const RESOURCES: CellResource[] = [
  {
    id: 'r-cell',
    name: 'Tracker',
    kind: 'link',
    url: 'https://tracker.dev/1',
    placementId: null,
    featured: false,
  },
]

const SHOT = 'https://x.supabase.co/storage/v1/object/public/cell-attachments/cells/cell-1/r.pdf'

const row = (over: Partial<CellResource> & { id: string; url: string }): CellResource => ({
  name: 'Tracker',
  kind: 'link',
  placementId: null,
  featured: false,
  ...over,
})

/** The row menu is a Base UI trigger: it opens on the mouse, not on Enter. */
function openMenu(trigger: HTMLElement) {
  fireEvent.mouseDown(trigger, { button: 0 })
  fireEvent.mouseUp(trigger, { button: 0 })
  fireEvent.click(trigger)
}

function mount(resources: CellResource[]) {
  return render(
    <TooltipProvider>
      <CellResourcesTab cellId="cell-1" resources={resources} />
    </TooltipProvider>,
  )
}

beforeEach(() => {
  uploadAttachment.mockReset()
  rpc.mockReset()
  rpc.mockResolvedValue({ data: 1, error: null })
})
afterEach(cleanup)

describe('the cell’s own list wears the shape the placement’s already has', () => {
  it('the row menu names the verb by kind — a preview for a file, a button for a link', async () => {
    const { getByLabelText } = mount([
      row({ id: 'r-shot', url: SHOT, kind: 'attachment', name: 'Runbook' }),
      ...RESOURCES,
    ])

    openMenu(getByLabelText('More for Runbook'))
    await waitFor(() => expect(document.body.textContent).toContain('Set as preview'))
    expect(document.body.textContent).not.toContain('Set as button')

    fireEvent.keyDown(document.body, { key: 'Escape' })
    await waitFor(() => expect(document.body.textContent).not.toContain('Set as preview'))

    openMenu(getByLabelText('More for Tracker'))
    await waitFor(() => expect(document.body.textContent).toContain('Set as button'))
    expect(document.body.textContent).not.toContain('Set as preview')
  })

  it('featuring an attachment writes one flag, and the featured row reads “Preview · name”', async () => {
    rpc.mockResolvedValue({
      data: { previous: [{ id: 'r-shot', featured: false }] },
      error: null,
    })
    const shot = row({ id: 'r-shot', url: SHOT, kind: 'attachment', name: 'Runbook' })
    const { getByLabelText, getByText, rerender } = mount([shot, ...RESOURCES])

    openMenu(getByLabelText('More for Runbook'))
    await waitFor(() => expect(document.body.textContent).toContain('Set as preview'))
    fireEvent.click(getByText('Set as preview'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    expect(rpc).toHaveBeenCalledWith('set_featured_resource', {
      p_resource_id: 'r-shot',
      p_featured: true,
    })

    // The featured section reads the stored rows, so it arrives with the refetch.
    rerender(
      <TooltipProvider>
        <CellResourcesTab
          cellId="cell-1"
          resources={[{ ...shot, featured: true }, ...RESOURCES]}
        />
      </TooltipProvider>,
    )
    expect(getByLabelText('Featured').textContent).toContain('Preview · Runbook')
  })

  it('“Unset” writes one flag and keeps the row in the list', async () => {
    rpc.mockResolvedValue({
      data: { previous: [{ id: 'r-shot', featured: true }] },
      error: null,
    })
    const { container, getByLabelText } = mount([
      row({ id: 'r-shot', url: SHOT, kind: 'attachment', name: 'Runbook', featured: true }),
      ...RESOURCES,
    ])

    fireEvent.click(getByLabelText('Unset Runbook'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    expect(rpc).toHaveBeenCalledWith('set_featured_resource', {
      p_resource_id: 'r-shot',
      p_featured: false,
    })
    expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(2)
  })

  it('a pasted link is named by its host, and nothing on screen asks for a name', async () => {
    const { container, getByLabelText, getByText, queryByPlaceholderText } = mount(RESOURCES)
    expect(queryByPlaceholderText('Label')).toBeNull()
    expect(queryByPlaceholderText('Name')).toBeNull()
    expect(queryByPlaceholderText('https://…')).toBeNull()

    fireEvent.change(getByLabelText('Paste a link'), {
      target: { value: 'youtu.be/walkthrough' },
    })
    fireEvent.click(getByText('Add'))
    expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(2)
    expect(container.textContent).toContain('youtu.be')

    fireEvent.click(getByText('Save resources'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    const [fn, args] = rpc.mock.calls[0]!
    expect(fn).toBe('sync_cell_resources')
    expect(args.p_rows.at(-1)).toEqual({
      id: null,
      kind: 'link',
      name: 'youtu.be',
      url: 'https://youtu.be/walkthrough',
    })
  })

  it('reordering is reachable from the keyboard — the handle takes the arrows', async () => {
    // `Reorder.Item` is pointer-only, so the drag alone would put the order
    // out of reach; the handle answers Up and Down as well.
    const { getByLabelText, getByText } = mount([
      ...RESOURCES,
      row({ id: 'r-shot', url: SHOT, kind: 'attachment', name: 'Runbook' }),
    ])

    fireEvent.keyDown(getByLabelText('Reorder Runbook'), { key: 'ArrowUp' })
    fireEvent.click(getByText('Save resources'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    const [fn, args] = rpc.mock.calls[0]!
    expect(fn).toBe('sync_cell_resources')
    expect(args.p_rows.map((r: { id: string | null }) => r.id)).toEqual(['r-shot', 'r-cell'])
  })

  it('the featured block carries no drag handle — it has no order of its own', () => {
    const { queryByLabelText, getByLabelText } = mount([
      row({ id: 'r-shot', url: SHOT, kind: 'attachment', name: 'Runbook', featured: true }),
    ])
    expect(getByLabelText('Featured').querySelectorAll('button[aria-label^="Reorder"]')).toHaveLength(
      0,
    )
    // The same row is still in the main list below, where it does have one.
    expect(queryByLabelText('Reorder Runbook')).not.toBeNull()
  })

  it('“Rename…” edits the name in the row, and Enter commits it to the save', async () => {
    const { getByLabelText, getByText } = mount(RESOURCES)
    openMenu(getByLabelText('More for Tracker'))
    await waitFor(() => expect(document.body.textContent).toContain('Rename…'))
    fireEvent.click(getByText('Rename…'))

    const field = await waitFor(() => getByLabelText('Rename Tracker'))
    fireEvent.change(field, { target: { value: 'Delivery tracker' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    await waitFor(() => expect(getByLabelText('More for Delivery tracker')).toBeTruthy())

    fireEvent.click(getByText('Save resources'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    expect(rpc.mock.calls[0]![1].p_rows).toEqual([
      { id: 'r-cell', kind: 'link', name: 'Delivery tracker', url: 'https://tracker.dev/1' },
    ])
  })

  it('Escape leaves the rename behind and the row keeps its default', async () => {
    const { getByLabelText, getByText, container } = mount(RESOURCES)
    openMenu(getByLabelText('More for Tracker'))
    await waitFor(() => expect(document.body.textContent).toContain('Rename…'))
    fireEvent.click(getByText('Rename…'))

    const field = await waitFor(() => getByLabelText('Rename Tracker'))
    fireEvent.change(field, { target: { value: 'Something else' } })
    fireEvent.keyDown(field, { key: 'Escape' })

    await waitFor(() => expect(getByLabelText('More for Tracker')).toBeTruthy())
    expect(container.textContent).not.toContain('Something else')
    // Nothing was renamed, so nothing is dirty and there is nothing to save.
    expect((getByText('Save resources') as HTMLButtonElement).disabled).toBe(true)
  })

  it('a placement’s row is listed without a menu — the touchpoint owns it', () => {
    const { container, getByLabelText, queryByLabelText } = mount([
      ...RESOURCES,
      row({ id: 'r-tp', url: 'https://example.com/intake', name: 'Intake App', placementId: 'p-1' }),
    ])
    expect(getByLabelText('From this cell’s touchpoints'.replace('’', "'")).textContent).toContain(
      'Intake App',
    )
    expect(queryByLabelText('More for Intake App')).toBeNull()
    expect(queryByLabelText('Move Intake App up')).toBeNull()
    expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(1)
  })
})

describe('the Resources tab takes a file with no placement', () => {
  it('uploads to the cell, lists the attachment, and saves it as the cell’s own row', async () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/cell-attachments/cells/cell-1/o.pdf'
    uploadAttachment.mockResolvedValue({
      kind: 'attachment',
      name: 'Runbook',
      url,
      objectKey: 'cells/cell-1/o.pdf',
    })
    const { getByLabelText, getByText, container } = mount(RESOURCES)
    const file = new File(['pdf'], 'Runbook.pdf', { type: 'application/pdf' })
    fireEvent.change(getByLabelText('Upload a file'), { target: { files: [file] } })
    await waitFor(() =>
      expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(2),
    )
    expect(uploadAttachment).toHaveBeenCalledWith(expect.anything(), { cellId: 'cell-1', file })
    expect(container.textContent).toContain('Runbook')

    fireEvent.click(getByText('Save resources'))
    await waitFor(() => expect(rpc).toHaveBeenCalled())
    const [fn, args] = rpc.mock.calls[0]!
    expect(fn).toBe('sync_cell_resources')
    expect(args.p_cell_id).toBe('cell-1')
    expect(args.p_rows).toEqual([
      { id: 'r-cell', kind: 'link', name: 'Tracker', url: 'https://tracker.dev/1' },
      { id: null, kind: 'attachment', name: 'Runbook', url },
    ])
  })

  it('the upload is a row the whole way: dimmed with a progress bar, then landed', async () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/cell-attachments/cells/cell-1/p.pdf'
    let land: (value: unknown) => void = () => {}
    uploadAttachment.mockReturnValue(
      new Promise((resolve) => {
        land = resolve
      }),
    )
    const { getByLabelText, getByText, container } = mount(RESOURCES)
    fireEvent.change(getByLabelText('Upload a file'), {
      target: { files: [new File(['pdf'], 'Runbook.pdf', { type: 'application/pdf' })] },
    })

    await waitFor(() => expect(container.querySelector('[data-upload-row]')).not.toBeNull())
    const pendingRow = container.querySelector('[data-upload-row]')!
    expect(pendingRow.textContent).toContain('Runbook')
    expect(pendingRow.className).toContain('opacity-60')
    expect(getByLabelText('Uploading Runbook').getAttribute('role')).toBe('progressbar')
    expect(getByText('Uploading…')).toBeTruthy()
    // Nothing is in the list yet — the object's URL is what the row carries.
    expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(1)

    land({ kind: 'attachment', name: 'Runbook', url, objectKey: 'cells/cell-1/p.pdf' })
    await waitFor(() =>
      expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(2),
    )
    expect(container.querySelector('[data-upload-row]')).toBeNull()
  })

  it('a refused upload offers Retry, and the retry lands the same file', async () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/cell-attachments/cells/cell-1/r.pdf'
    uploadAttachment.mockRejectedValueOnce(new Error('The file could not be uploaded: gateway'))
    const { getByLabelText, getByText, container } = mount(RESOURCES)
    const file = new File(['pdf'], 'Runbook.pdf', { type: 'application/pdf' })
    fireEvent.change(getByLabelText('Upload a file'), { target: { files: [file] } })

    await waitFor(() =>
      expect(container.querySelector('[data-upload-row]')?.textContent).toContain(
        'The file did not upload.',
      ),
    )
    expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(1)

    uploadAttachment.mockResolvedValueOnce({
      kind: 'attachment',
      name: 'Runbook',
      url,
      objectKey: 'cells/cell-1/r.pdf',
    })
    fireEvent.click(getByText('Retry'))
    await waitFor(() =>
      expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(2),
    )
    expect(uploadAttachment).toHaveBeenNthCalledWith(2, expect.anything(), {
      cellId: 'cell-1',
      file,
    })
    expect(container.querySelector('[data-upload-row]')).toBeNull()
  })

  it('a refused upload is shown, and no row is invented', async () => {
    uploadAttachment.mockRejectedValue(new Error('The file could not be uploaded: too large'))
    const { getByLabelText, getByText, container } = mount(RESOURCES)
    fireEvent.change(getByLabelText('Upload a file'), {
      target: { files: [new File(['x'], 'big.mov')] },
    })
    await waitFor(() => expect(container.textContent).toContain('too large'))
    expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(1)
    expect((getByText('Save resources') as HTMLButtonElement).disabled).toBe(true)
  })
})
