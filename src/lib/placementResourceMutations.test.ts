import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  setFeaturedResource,
  updatePlacementResources,
} from '@/lib/placementResourceMutations'
import type { CellResource } from '@/types/blueprint'

const recordChange = vi.fn()
vi.mock('@/lib/authoringSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/authoringSession')>()),
  recordChange: (...args: unknown[]) => recordChange(...args),
}))

function fakeClient(reply: unknown = null, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data: reply, error })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the seam is typed by name, see database.ts Functions
  return { client: { rpc } as any, rpc }
}

const row = (over: Partial<CellResource> & { id: string; url: string }): CellResource => ({
  name: 'Intake portal',
  kind: 'link',
  placementId: 'placement-1',
  featured: false,
  ...over,
})

beforeEach(() => recordChange.mockClear())

describe('updatePlacementResources', () => {
  it('sends the whole list, in order, in one call, and captures the placement’s rows as the inverse', async () => {
    const { client, rpc } = fakeClient()
    const existing = [
      row({ id: 'r-1', url: 'https://www.figma.com/design/W0', featured: true }),
      row({ id: 'r-2', url: '/blueprint-images/a.png', kind: 'attachment', featured: true }),
      row({ id: 'r-cell', url: 'https://tracker.dev/1', placementId: null }),
    ]
    await updatePlacementResources(
      client,
      { id: 'placement-1', cellId: 'cell-1' },
      existing,
      [
        { id: 'r-2', kind: 'attachment', name: 'Intake portal', url: '/blueprint-images/a.png' },
        { id: 'r-1', kind: 'link', name: '', url: 'https://www.figma.com/design/W0' },
        { id: null, kind: 'link', name: '', url: 'youtu.be/walkthrough' },
      ],
    )
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('sync_placement_resources', {
      p_placement_id: 'placement-1',
      p_rows: [
        { id: 'r-2', kind: 'attachment', name: 'Intake portal', url: '/blueprint-images/a.png' },
        // A pasted link nobody named is named by its host, like the cell's list.
        { id: 'r-1', kind: 'link', name: 'figma.com', url: 'https://www.figma.com/design/W0' },
        { id: null, kind: 'link', name: 'youtu.be', url: 'https://youtu.be/walkthrough' },
      ],
    })
    expect(recordChange).toHaveBeenCalledWith(
      'update_placement_resources',
      { placement_id: 'placement-1', cell_id: 'cell-1' },
      {
        fn: 'update_placement_resources',
        args: {
          placement_id: 'placement-1',
          // The cell's own row is not this list's to restore.
          resources: [
            { id: 'r-1', kind: 'link', name: 'Intake portal', url: 'https://www.figma.com/design/W0' },
            { id: 'r-2', kind: 'attachment', name: 'Intake portal', url: '/blueprint-images/a.png' },
          ],
        },
      },
    )
  })

  it('refuses a link that is not a link before anything is sent', async () => {
    const { client, rpc } = fakeClient()
    await expect(
      updatePlacementResources(client, { id: 'placement-1', cellId: null }, [], [
        { id: null, kind: 'link', name: '', url: 'javascript:alert(1)' },
      ]),
    ).rejects.toThrow()
    expect(rpc).not.toHaveBeenCalled()
    expect(recordChange).not.toHaveBeenCalled()
  })

  it('surfaces the database’s refusal of a placement that is gone', async () => {
    const { client } = fakeClient(null, { message: 'touchpoint placement x does not exist', code: 'P0001' })
    await expect(
      updatePlacementResources(client, { id: 'placement-x', cellId: null }, [], []),
    ).rejects.toThrow(/could not be saved|does not exist/)
    expect(recordChange).not.toHaveBeenCalled()
  })
})

describe('setFeaturedResource', () => {
  it('records the rows the function changed as the inverse — two when a preview replaces one', async () => {
    const { client, rpc } = fakeClient({
      previous: [
        { id: 'r-old', featured: true },
        { id: 'r-new', featured: false },
      ],
    })
    const previous = await setFeaturedResource(
      client,
      { id: 'r-new', placementId: 'placement-1', cellId: 'cell-1' },
      true,
    )
    expect(rpc).toHaveBeenCalledWith('set_featured_resource', {
      p_resource_id: 'r-new',
      p_featured: true,
    })
    expect(previous).toHaveLength(2)
    expect(recordChange).toHaveBeenCalledWith(
      'set_featured_resource',
      { resource_id: 'r-new', featured: true, placement_id: 'placement-1', cell_id: 'cell-1' },
      {
        fn: 'restore_featured_resources',
        args: {
          p_rows: [
            { id: 'r-old', featured: true },
            { id: 'r-new', featured: false },
          ],
        },
      },
    )
  })

  it('treats a write that changed nothing as an error, not a success', async () => {
    const { client } = fakeClient({ previous: [] })
    await expect(
      setFeaturedResource(client, { id: 'r-gone', placementId: null }, true),
    ).rejects.toThrow(/nothing was written/)
    expect(recordChange).not.toHaveBeenCalled()
  })
})
