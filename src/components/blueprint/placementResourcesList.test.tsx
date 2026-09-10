// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlacementResourcesList } from '@/components/blueprint/PlacementResourcesList'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { CellResource } from '@/types/blueprint'

const rpc = vi.fn()
vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({ client: { rpc }, canWrite: true }),
}))
vi.mock('@/hooks/useSupabaseQuery', () => ({ invalidateQueries: () => {} }))
const uploadAttachment = vi.fn()
vi.mock('@/lib/attachmentUpload', () => ({
  uploadAttachment: (...args: unknown[]) => uploadAttachment(...args),
}))
vi.mock('@/lib/authoringSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/authoringSession')>()),
  recordChange: () => {},
}))

const PLACEMENT = { id: 'placement-1', cellId: 'cell-1', name: 'Intake App' }

const row = (over: Partial<CellResource> & { id: string; url: string }): CellResource => ({
  name: 'Intake App',
  kind: 'link',
  placementId: 'placement-1',
  featured: false,
  ...over,
})

const RESOURCES: CellResource[] = [
  row({ id: 'r-shot', url: '/blueprint-images/a.png', kind: 'attachment', featured: true }),
  row({ id: 'r-figma', url: 'https://www.figma.com/design/W0', featured: true }),
  row({ id: 'r-doc', url: 'https://docs.google.com/document/d/1', name: 'Spec' }),
  row({ id: 'r-cell', url: 'https://tracker.dev/1', placementId: null }),
]

function mount(resources = RESOURCES) {
  return render(
    <TooltipProvider>
      <PlacementResourcesList placement={PLACEMENT} resources={resources} />
    </TooltipProvider>,
  )
}

beforeEach(() => {
  uploadAttachment.mockReset()
  rpc.mockReset()
  rpc.mockResolvedValue({ data: { previous: [{ id: 'r-shot', featured: true }] }, error: null })
})
afterEach(cleanup)

describe('one list for what a placement points at', () => {
  it('lists the placement’s rows only, with the featured ones on top', () => {
    const { container, getByLabelText } = mount()
    const all = container.querySelectorAll('[data-resource-row]')
    expect(all).toHaveLength(3)
    const top = getByLabelText('Featured')
    expect(top.textContent).toContain('Preview')
    expect(top.textContent).toContain('Open in Figma')
    expect(top.textContent).not.toContain('Spec')
  })

  it('“Unset” writes one flag and leaves the row in the list', async () => {
    const { container, getAllByLabelText } = mount()
    // Two featured rows share the touchpoint's name; the preview is first.
    fireEvent.click(getAllByLabelText('Unset Intake App')[0]!)
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    expect(rpc).toHaveBeenCalledWith('set_featured_resource', {
      p_resource_id: 'r-shot',
      p_featured: false,
    })
    expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(3)
  })

  it('a pasted link joins the list named by its host, and Save sends the whole list once', async () => {
    const { getByLabelText, getByText, container } = mount()
    fireEvent.change(getByLabelText('Paste a link'), { target: { value: 'youtu.be/walkthrough' } })
    fireEvent.click(getByText('Add'))
    expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(4)
    expect(container.textContent).toContain('youtu.be')

    rpc.mockResolvedValueOnce({ data: null, error: null })
    fireEvent.click(getByText('Save resources'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    const [name, args] = rpc.mock.calls[0]!
    expect(name).toBe('sync_placement_resources')
    expect(args.p_placement_id).toBe('placement-1')
    expect(args.p_rows.map((r: { url: string }) => r.url)).toEqual([
      '/blueprint-images/a.png',
      'https://www.figma.com/design/W0',
      'https://docs.google.com/document/d/1',
      'https://youtu.be/walkthrough',
    ])
  })

  it('reordering sends the new order and no featured value at all', async () => {
    const { getByLabelText, getByText } = mount()
    // The drag is pointer-only, so the keyboard half of the handle is the
    // reachable path — and the one a test can drive.
    fireEvent.keyDown(getByLabelText('Reorder Spec'), { key: 'ArrowUp' })
    rpc.mockResolvedValueOnce({ data: null, error: null })
    fireEvent.click(getByText('Save resources'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    const args = rpc.mock.calls[0]![1]
    expect(args.p_rows.map((r: { id: string }) => r.id)).toEqual(['r-shot', 'r-doc', 'r-figma'])
    expect(args.p_rows.every((r: object) => !('featured' in r))).toBe(true)
  })

  it('Save is idle until something changed', () => {
    const { getByText } = mount()
    expect((getByText('Save resources') as HTMLButtonElement).disabled).toBe(true)
  })

  it('a chosen file goes to the bucket first and joins the list as an attachment', async () => {
    uploadAttachment.mockResolvedValue({
      kind: 'attachment',
      name: 'Module opening',
      url: 'https://x.supabase.co/storage/v1/object/public/cell-attachments/cells/cell-1/o.png',
      objectKey: 'cells/cell-1/o.png',
    })
    const { container, getByLabelText, getByText } = mount()
    const file = new File(['png'], 'Module opening.png', { type: 'image/png' })
    fireEvent.change(getByLabelText('Upload a file'), { target: { files: [file] } })
    await waitFor(() =>
      expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(4),
    )
    expect(uploadAttachment).toHaveBeenCalledWith(expect.anything(), { cellId: 'cell-1', file })
    expect(container.textContent).toContain('Module opening')

    fireEvent.click(getByText('Save resources'))
    await waitFor(() => expect(rpc).toHaveBeenCalled())
    const [fn, args] = rpc.mock.calls[0]
    expect(fn).toBe('sync_placement_resources')
    expect(args.p_rows.at(-1)).toEqual({
      id: null,
      kind: 'attachment',
      name: 'Module opening',
      url: 'https://x.supabase.co/storage/v1/object/public/cell-attachments/cells/cell-1/o.png',
    })
  })

  it('“Replace…” on the preview swaps that row’s file and nothing else', async () => {
    uploadAttachment.mockResolvedValue({
      kind: 'attachment',
      name: 'b',
      url: 'https://x.supabase.co/storage/v1/object/public/cell-attachments/cells/cell-1/b.png',
      objectKey: 'cells/cell-1/b.png',
    })
    const { container, getByLabelText, getByText } = mount()
    fireEvent.click(getByText('Replace…'))
    const file = new File(['png'], 'b.png', { type: 'image/png' })
    fireEvent.change(getByLabelText('Upload a file'), { target: { files: [file] } })
    await waitFor(() =>
      expect((getByText('Save resources') as HTMLButtonElement).disabled).toBe(false),
    )
    expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(3)

    fireEvent.click(getByText('Save resources'))
    await waitFor(() => expect(rpc).toHaveBeenCalled())
    const [, args] = rpc.mock.calls[0]
    expect(args.p_rows[0]).toEqual({
      id: 'r-shot',
      kind: 'attachment',
      name: 'Intake App',
      url: 'https://x.supabase.co/storage/v1/object/public/cell-attachments/cells/cell-1/b.png',
    })
  })

  it('an unplaced touchpoint has no cell to upload into, so no file control', () => {
    const { queryByLabelText } = render(
      <TooltipProvider>
        <PlacementResourcesList
          placement={{ ...PLACEMENT, cellId: null }}
          resources={RESOURCES}
        />
      </TooltipProvider>,
    )
    expect(queryByLabelText('Upload a file')).toBeNull()
  })
})
