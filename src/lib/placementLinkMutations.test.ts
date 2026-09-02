import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearSession, sessionSnapshot } from '@/lib/authoringSession'
import { removePlacement, setPlacementTouchpoint } from '@/lib/placementLinkMutations'
import type { Database } from '@/types/database'

function fakeClient(answer: unknown, error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data: answer, error })
  return { client: { rpc } as unknown as SupabaseClient<Database>, rpc }
}

beforeEach(() => clearSession())

describe('setPlacementTouchpoint', () => {
  it('links a name-only placement and records the way back as the same function', async () => {
    const { client, rpc } = fakeClient({ touchpoint_id: null, name: 'Workday (Employee View)' })
    await setPlacementTouchpoint(
      client,
      { id: 'ct-1', cellId: 'cell-1', name: 'Workday (Employee View)' },
      { touchpointId: 'tp-workday', touchpointName: 'Workday' },
    )
    expect(rpc).toHaveBeenCalledWith('set_placement_touchpoint', {
      p_placement_id: 'ct-1',
      p_touchpoint_id: 'tp-workday',
      p_name: null,
    })
    const [entry] = sessionSnapshot()
    expect(entry!.fn).toBe('set_placement_touchpoint')
    expect(entry!.args).toEqual({
      placement_id: 'ct-1',
      cell_id: 'cell-1',
      name: 'Workday (Employee View)',
      touchpoint_id: 'tp-workday',
      touchpoint_name: 'Workday',
    })
    expect(entry!.revert).toEqual({
      fn: 'set_placement_touchpoint',
      args: { p_placement_id: 'ct-1', p_touchpoint_id: null, p_name: 'Workday (Employee View)' },
    })
  })

  it('surfaces a refusal and records nothing', async () => {
    const { client } = fakeClient(null, { message: 'that cell already shows that touchpoint' })
    await expect(
      setPlacementTouchpoint(client, { id: 'ct-1', name: 'x' }, { touchpointId: 'tp-1' }),
    ).rejects.toThrow()
    expect(sessionSnapshot()).toEqual([])
  })
})

describe('removePlacement', () => {
  it('records the row and its resources as the inverse', async () => {
    const row = { id: 'ct-9', cell_id: 'cell-1', name: 'Google Spreadsheet', touchpoint_id: null }
    const resources = [{ id: 'r-1', kind: 'link', url: 'https://x' }]
    const { client } = fakeClient({ row, resources })
    await removePlacement(client, { id: 'ct-9', cellId: 'cell-1', name: 'Google Spreadsheet' })
    const [entry] = sessionSnapshot()
    expect(entry!.fn).toBe('remove_placement')
    expect(entry!.revert).toEqual({
      fn: 'restore_placement',
      args: { p_row: row, p_resources: resources },
    })
  })

  it('refuses to call a removal done when nothing came back to restore it with', async () => {
    const { client } = fakeClient({})
    await expect(removePlacement(client, { id: 'ct-9', name: 'x' })).rejects.toThrow(/restore/)
    expect(sessionSnapshot()).toEqual([])
  })
})
