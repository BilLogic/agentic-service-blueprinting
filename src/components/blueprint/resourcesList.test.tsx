// @vitest-environment jsdom
/**
 * One list, two owners.
 *
 * `ResourcesList` is the whole list — rows, featured block, row menu, drag
 * handle, paste field, upload. A cell and a touchpoint placement each hand it
 * their own rows and their own pair of writes, and nothing else about them
 * differs. So the suite drives it through BOTH owners: through the Resources
 * tab, which is the cell's, and through `PlacementResourcesList`, which is the
 * placement's. A behaviour that only holds for one of them is the defect this
 * shape exists to prevent, and only two owners can catch it.
 *
 * The rest is what a class or a prop cannot pin. The order has to be reachable
 * without a pointer, because the drag is pointer-only. The featured block has
 * to have no handle, because it has no order. An upload has to be visible for
 * its whole life, because the bucket reports no progress. And a name has to be
 * optional on the way in and reachable afterwards through the row menu.
 */
import { cleanup, fireEvent, render, waitFor, type RenderResult } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CellResourcesTab } from '@/components/blueprint/CellResourcesTab'
import { PlacementResourcesList } from '@/components/blueprint/PlacementResourcesList'
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

const SHOT =
  'https://x.supabase.co/storage/v1/object/public/cell-attachments/cells/cell-1/r.pdf'

const row = (over: Partial<CellResource> & { id: string; url: string }): CellResource => ({
  name: 'Tracker',
  kind: 'link',
  placementId: null,
  featured: false,
  ...over,
})

const TRACKER = row({ id: 'r-cell', url: 'https://tracker.dev/1' })
const PLACED = () =>
  row({
    id: 'r-tp',
    url: 'https://plus.app/intake',
    name: 'Intake portal',
    placementId: 'p-1',
  })

/** The row menu is a Base UI trigger: it opens on the mouse, not on Enter. */
function openMenu(trigger: HTMLElement) {
  fireEvent.mouseDown(trigger, { button: 0 })
  fireEvent.mouseUp(trigger, { button: 0 })
  fireEvent.click(trigger)
}

/**
 * Open a row's rename the only way in: the item in that row's own menu.
 *
 * There is no second door — the name beside it is text, not a control — so
 * every test that needs the field open goes through the menu, and a menu item
 * that stopped opening it would take the whole rename down with it.
 */
async function openRename(view: RenderResult, name: string) {
  openMenu(view.getByLabelText(`More for ${name}`))
  await waitFor(() => expect(document.body.textContent).toContain('Rename…'))
  fireEvent.click(view.getByText('Rename…'))
  return await waitFor(() => view.getByLabelText(`Rename ${name}`) as HTMLInputElement)
}

/** The cell's owner: the Resources tab in Edit mode. */
function mountCell(resources: CellResource[]) {
  return render(
    <TooltipProvider>
      <CellResourcesTab cellId="cell-1" resources={resources} />
    </TooltipProvider>,
  )
}

/** The placement's owner: the list inside a touchpoint's group. */
function mountPlacement(resources: CellResource[]) {
  return render(
    <TooltipProvider>
      <PlacementResourcesList
        placement={{ id: 'p-1', cellId: 'cell-1', name: 'Intake' }}
        resources={resources}
      />
    </TooltipProvider>,
  )
}

beforeEach(() => {
  uploadAttachment.mockReset()
  rpc.mockReset()
  rpc.mockResolvedValue({ data: null, error: null })
})
afterEach(cleanup)

describe('the list is the same list whichever owner draws it', () => {
  it('the cell saves its own rows through the cell sync', async () => {
    const { getByLabelText, getByText } = mountCell([TRACKER])
    fireEvent.change(getByLabelText('Paste a link'), { target: { value: 'youtu.be/walk' } })
    fireEvent.click(getByText('Add'))
    fireEvent.click(getByText('Save resources'))

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    const [fn, args] = rpc.mock.calls[0]!
    expect(fn).toBe('sync_cell_resources')
    expect(args.p_cell_id).toBe('cell-1')
    expect(args.p_rows.at(-1)).toEqual({
      id: null,
      kind: 'link',
      // Named by its host. Nothing on screen asked for a name.
      name: 'youtu.be',
      url: 'https://youtu.be/walk',
    })
  })

  it('the placement saves its own rows through the placement sync', async () => {
    const { getByLabelText, getByText } = mountPlacement([PLACED()])
    fireEvent.change(getByLabelText('Paste a link'), { target: { value: 'youtu.be/walk' } })
    fireEvent.click(getByText('Add'))
    fireEvent.click(getByText('Save resources'))

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    const [fn, args] = rpc.mock.calls[0]!
    expect(fn).toBe('sync_placement_resources')
    expect(args.p_placement_id).toBe('p-1')
    expect(args.p_rows.at(-1)).toEqual({
      id: null,
      kind: 'link',
      name: 'youtu.be',
      url: 'https://youtu.be/walk',
    })
  })

  it('offers no name field on the way in, to either owner', () => {
    for (const mount of [mountCell, mountPlacement]) {
      const { queryByPlaceholderText } = mount([TRACKER, PLACED()])
      // A link is named by its host and a file by its filename. A box beside
      // the paste field would make naming a toll on the way in.
      expect(queryByPlaceholderText('Name')).toBeNull()
      expect(queryByPlaceholderText('Label')).toBeNull()
      cleanup()
    }
  })

  it('names the featuring verb by kind — a preview for a file, a button for a link', async () => {
    const { getByLabelText } = mountCell([
      row({ id: 'r-shot', url: SHOT, kind: 'attachment', name: 'Runbook' }),
      TRACKER,
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

  it('features one row at once, without waiting for the list Save', async () => {
    rpc.mockResolvedValue({ data: { previous: [{ id: 'r-shot', featured: false }] }, error: null })
    const { getByLabelText, getByText } = mountCell([
      row({ id: 'r-shot', url: SHOT, kind: 'attachment', name: 'Runbook' }),
    ])

    openMenu(getByLabelText('More for Runbook'))
    await waitFor(() => expect(document.body.textContent).toContain('Set as preview'))
    fireEvent.click(getByText('Set as preview'))

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    expect(rpc).toHaveBeenCalledWith('set_featured_resource', {
      p_resource_id: 'r-shot',
      p_featured: true,
    })
  })

  it('lists a placement’s row in the cell’s tab without giving the cell a menu for it', () => {
    const { container, getByLabelText, queryByLabelText } = mountCell([TRACKER, PLACED()])
    expect(getByLabelText("From this cell's touchpoints").textContent).toContain('Intake portal')
    expect(queryByLabelText('More for Intake portal')).toBeNull()
    expect(queryByLabelText('Reorder Intake portal')).toBeNull()
    // One editable row: the cell's own. The sync refuses a placement's ids.
    expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(1)
  })
})

describe('the order stays reachable without a pointer', () => {
  it('the drag handle answers Up and Down, and the save carries the new order', async () => {
    // `Reorder.Item` is pointer-only. Without this the order would be a
    // gesture a keyboard and a screen reader simply do not have.
    const { getByLabelText, getByText } = mountCell([
      TRACKER,
      row({ id: 'r-shot', url: SHOT, kind: 'attachment', name: 'Runbook' }),
    ])

    fireEvent.keyDown(getByLabelText('Reorder Runbook'), { key: 'ArrowUp' })
    fireEvent.click(getByText('Save resources'))

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    expect(rpc.mock.calls[0]![1].p_rows.map((r: { id: string | null }) => r.id)).toEqual([
      'r-shot',
      'r-cell',
    ])
  })

  it('will not walk a row off either end', async () => {
    const { getByLabelText, getByText } = mountCell([TRACKER])
    fireEvent.keyDown(getByLabelText('Reorder Tracker'), { key: 'ArrowUp' })
    fireEvent.keyDown(getByLabelText('Reorder Tracker'), { key: 'ArrowDown' })
    // Nothing moved, so nothing is dirty and there is nothing to save.
    expect((getByText('Save resources') as HTMLButtonElement).disabled).toBe(true)
  })

  it('gives the featured block no handle — it has no order of its own', () => {
    // At most one preview, and the buttons follow the main list's order. A
    // handle there would offer a move that changes nothing.
    const { getByLabelText, queryByLabelText } = mountCell([
      row({ id: 'r-shot', url: SHOT, kind: 'attachment', name: 'Runbook', featured: true }),
    ])
    expect(
      getByLabelText('Featured').querySelectorAll('button[aria-label^="Reorder"]'),
    ).toHaveLength(0)
    // The same row is in the main list below, where it does have one.
    expect(queryByLabelText('Reorder Runbook')).not.toBeNull()
  })
})

describe('naming a resource is a second, optional act', () => {
  it('opens the rename from the row menu, and Enter commits it to the save', async () => {
    const view = mountCell([TRACKER])
    const field = await openRename(view, 'Tracker')
    // The field arrives holding the standing name, not empty: a rename starts
    // from what the row is called, so touching one word costs one word.
    expect(field.value).toBe('Tracker')
    fireEvent.change(field, { target: { value: 'Delivery tracker' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    await waitFor(() => expect(view.getByLabelText('More for Delivery tracker')).toBeTruthy())
    fireEvent.click(view.getByText('Save resources'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    expect(rpc.mock.calls[0]![1].p_rows).toEqual([
      { id: 'r-cell', kind: 'link', name: 'Delivery tracker', url: 'https://tracker.dev/1' },
    ])
  })

  it('the placement’s owner reaches the rename through its row menu too', async () => {
    // The menu is the only door, so it has to be the same door for both
    // owners — a rename that only the cell could reach would be the very
    // defect this suite's two-owner shape exists to catch.
    const view = mountPlacement([PLACED()])
    const field = await openRename(view, 'Intake portal')
    expect(field.tagName).toBe('INPUT')
    expect(field.value).toBe('Intake portal')
  })

  it('Escape abandons the rename and leaves the standing name', async () => {
    const view = mountCell([TRACKER])
    const field = await openRename(view, 'Tracker')
    fireEvent.change(field, { target: { value: 'Something else' } })
    fireEvent.keyDown(field, { key: 'Escape' })

    await waitFor(() => expect(view.queryByLabelText('Rename Tracker')).toBeNull())
    expect(view.container.textContent).not.toContain('Something else')
    expect(view.container.textContent).toContain('Tracker')
    expect((view.getByText('Save resources') as HTMLButtonElement).disabled).toBe(true)
  })

  it('a rename typed down to nothing leaves the name it had', async () => {
    // The database refuses a nameless row, so an empty field is an abandoned
    // rename and not a request to erase the name.
    const view = mountCell([TRACKER])
    const field = await openRename(view, 'Tracker')
    fireEvent.change(field, { target: { value: '   ' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    await waitFor(() => expect(view.queryByLabelText('Rename Tracker')).toBeNull())
    expect(view.container.textContent).toContain('Tracker')
    expect((view.getByText('Save resources') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('an upload is on screen for its whole life', () => {
  const landed = (url: string, objectKey: string) => ({
    kind: 'attachment',
    name: 'Runbook',
    url,
    objectKey,
  })

  it('is a dimmed row with an indeterminate bar, then an ordinary row', async () => {
    const url = SHOT
    let land: (value: unknown) => void = () => {}
    uploadAttachment.mockReturnValue(new Promise((resolve) => (land = resolve)))
    const { container, getByLabelText, getByText } = mountCell([TRACKER])
    fireEvent.change(getByLabelText('Upload a file'), {
      target: { files: [new File(['pdf'], 'Runbook.pdf', { type: 'application/pdf' })] },
    })

    await waitFor(() => expect(container.querySelector('[data-upload-row]')).not.toBeNull())
    const pending = container.querySelector('[data-upload-row]')!
    expect(pending.textContent).toContain('Runbook')
    expect(pending.className).toContain('opacity-60')
    // Indeterminate, because the bucket's upload reports no progress at all —
    // a filling bar would be a number nobody has.
    expect(getByLabelText('Uploading Runbook').getAttribute('role')).toBe('progressbar')
    expect(getByText('Uploading…')).toBeTruthy()
    // And nothing is in the list yet: the row carries the object's URL, so
    // there is no row to draft until the upload has answered.
    expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(1)

    land(landed(url, 'cells/cell-1/r.pdf'))
    await waitFor(() => expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(2))
    expect(container.querySelector('[data-upload-row]')).toBeNull()
  })

  it('a refused upload says so, offers Retry, and the retry lands the same file', async () => {
    uploadAttachment.mockRejectedValueOnce(new Error('The file could not be uploaded: gateway'))
    const { container, getByLabelText, getByText } = mountCell([TRACKER])
    const file = new File(['pdf'], 'Runbook.pdf', { type: 'application/pdf' })
    fireEvent.change(getByLabelText('Upload a file'), { target: { files: [file] } })

    await waitFor(() =>
      expect(container.querySelector('[data-upload-row]')?.textContent).toContain(
        'The file did not upload.',
      ),
    )
    // No row was invented for a file the bucket never took.
    expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(1)

    uploadAttachment.mockResolvedValueOnce(landed(SHOT, 'cells/cell-1/r.pdf'))
    fireEvent.click(getByText('Retry'))
    await waitFor(() => expect(container.querySelectorAll('[data-resource-row]')).toHaveLength(2))
    expect(uploadAttachment).toHaveBeenNthCalledWith(2, expect.anything(), {
      cellId: 'cell-1',
      file,
    })
    expect(container.querySelector('[data-upload-row]')).toBeNull()
  })

  it('files a cell’s own upload under the cell, with no placement', async () => {
    uploadAttachment.mockResolvedValue(landed(SHOT, 'cells/cell-1/r.pdf'))
    const { getByLabelText, getByText } = mountCell([TRACKER])
    const file = new File(['pdf'], 'Runbook.pdf', { type: 'application/pdf' })
    fireEvent.change(getByLabelText('Upload a file'), { target: { files: [file] } })

    await waitFor(() => expect(uploadAttachment).toHaveBeenCalled())
    expect(uploadAttachment).toHaveBeenCalledWith(expect.anything(), { cellId: 'cell-1', file })

    fireEvent.click(getByText('Save resources'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    expect(rpc.mock.calls[0]![1].p_rows.at(-1)).toEqual({
      id: null,
      kind: 'attachment',
      name: 'Runbook',
      url: SHOT,
    })
  })
})
