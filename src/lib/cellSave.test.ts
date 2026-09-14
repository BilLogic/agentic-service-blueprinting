import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/*
  ONE SAVE, THREE PATHS, AND THE CALLER KNOWS ONLY THE FIRST.

  The writes are captured at the mutation seam — the same functions the
  panel and the agent tool called directly before this module existed — and
  each case hands the save a diff and reads back which path received which
  fields, in what order, with what inverse.
*/

const { upsertCell, updateCellContent, updateCellSpec, calls } = vi.hoisted(() => {
  const calls: string[] = []
  return {
    calls,
    upsertCell: vi.fn(async () => {
      calls.push('rpc')
      return { id: 'cell-new', inserted: true, previous: null }
    }),
    updateCellContent: vi.fn(async () => {
      calls.push('content')
    }),
    updateCellSpec: vi.fn(async () => {
      calls.push('spec')
    }),
  }
})
vi.mock('@/lib/authoringRpc', () => ({ upsertCell }))
vi.mock('@/lib/cellContentMutations', () => ({ updateCellContent }))
vi.mock('@/lib/cellSpecMutations', () => ({ updateCellSpec }))

import { cellEditsFromCell, type CellEdits } from '@/lib/cellFields'
import { saveCell } from '@/lib/cellSave'

const client = {} as unknown as SupabaseClient<Database>

const BASELINE: CellEdits = {
  content: 'Dispatcher confirms the address',
  summary: 'Books a crew',
  status: 'live',
  owner: 'Dispatch',
  perceived_owner: '',
  function: 'Confirm',
  form: '',
  value_props: [{ for: 'Customer', value: 'A booked slot' }],
}

beforeEach(() => {
  calls.length = 0
  upsertCell.mockClear()
  updateCellContent.mockClear()
  updateCellSpec.mockClear()
})

describe('saveCell', () => {
  it('routes a mixed diff: content fields to the content write, spec fields to the spec write, content first', async () => {
    const values: CellEdits = {
      ...BASELINE,
      summary: 'Books a crew and confirms by text',
      perceived_owner: 'The installer',
      form: 'A text message',
      value_props: [],
    }

    const result = await saveCell(client, { cellId: 'cell-1', values, baseline: BASELINE })

    expect(result).toEqual({ cellId: 'cell-1', created: false, routes: ['content', 'spec'] })
    expect(calls).toEqual(['content', 'spec'])
    expect(upsertCell).not.toHaveBeenCalled()
    // The content write takes the whole content route — the mutation writes
    // its five columns together — with the baseline as its inverse.
    expect(updateCellContent).toHaveBeenCalledWith(
      client,
      'cell-1',
      {
        content: 'Dispatcher confirms the address',
        summary: 'Books a crew and confirms by text',
        owner: 'Dispatch',
        perceivedOwner: 'The installer',
        status: 'live',
      },
      { content: 'Dispatcher confirms the address', summary: 'Books a crew', owner: 'Dispatch', perceivedOwner: '', status: 'live' },
      { record: true },
    )
    expect(updateCellSpec).toHaveBeenCalledWith(
      client,
      'cell-1',
      { function: 'Confirm', form: 'A text message', valueProps: [] },
      { function: 'Confirm', form: '', valueProps: [{ for: 'Customer', value: 'A booked slot' }] },
      { record: true },
    )
  })

  it('writes only the path a diff touches, and nothing for no diff', async () => {
    await saveCell(client, { cellId: 'cell-1', values: { ...BASELINE, status: 'planned' }, baseline: BASELINE })
    expect(calls).toEqual(['content'])

    calls.length = 0
    await saveCell(client, {
      cellId: 'cell-1',
      values: { ...BASELINE, value_props: [{ for: 'Customer', value: 'A booked slot' }, { for: 'Crew', value: 'A route' }] },
      baseline: BASELINE,
    })
    expect(calls).toEqual(['spec'])

    calls.length = 0
    // The same list, a different array: a value, not an identity.
    const same = await saveCell(client, {
      cellId: 'cell-1',
      values: { ...BASELINE, value_props: [{ for: 'Customer', value: 'A booked slot' }] },
      baseline: BASELINE,
    })
    expect(calls).toEqual([])
    expect(same.routes).toEqual([])
  })

  it('creates a cell through the RPC, then fills in only what the create did not write, unlogged', async () => {
    const empty = cellEditsFromCell(null)
    const slot = { pathId: 'path-1', laneId: 'lane-1', stepId: 'step-1' }

    // Text only: the RPC writes it, and no second write follows.
    const bare = await saveCell(client, {
      cellId: null,
      slot,
      values: { ...empty, content: '  Hand over the keys ' },
      baseline: empty,
    })
    expect(bare).toEqual({ cellId: 'cell-new', created: true, routes: ['rpc'] })
    expect(upsertCell).toHaveBeenCalledWith(client, { ...slot, content: 'Hand over the keys' })
    expect(updateCellContent).not.toHaveBeenCalled()

    // Text plus an owner and a function: the two fill-ins follow, and ride
    // the create's own ledger entry rather than logging themselves.
    calls.length = 0
    const filled = await saveCell(client, {
      cellId: null,
      slot,
      values: { ...empty, content: 'Hand over the keys', owner: 'Installer', function: 'Close out' },
      baseline: empty,
    })
    expect(filled.routes).toEqual(['rpc', 'content', 'spec'])
    expect(updateCellContent).toHaveBeenCalledWith(
      client,
      'cell-new',
      expect.objectContaining({ content: 'Hand over the keys', owner: 'Installer', status: 'live' }),
      undefined,
      { record: false },
    )
    expect(updateCellSpec).toHaveBeenCalledWith(
      client,
      'cell-new',
      { function: 'Close out', form: '', valueProps: [] },
      undefined,
      { record: false },
    )
  })

  it('tells the caller the new id as soon as the create lands, before a later write can fail', async () => {
    const empty = cellEditsFromCell(null)
    updateCellSpec.mockImplementationOnce(async () => {
      throw new Error('permission denied for table cells')
    })
    const created: string[] = []
    await expect(
      saveCell(client, {
        cellId: null,
        slot: { pathId: 'path-1', laneId: 'lane-1', stepId: 'step-1' },
        values: { ...empty, content: 'Hand over the keys', function: 'Close out' },
        baseline: empty,
        onCreated: (id) => created.push(id),
      }),
    ).rejects.toThrow(/permission denied/)
    expect(created).toEqual(['cell-new'])
  })

  it('does not write a change of whitespace alone: the write would store the same value', async () => {
    await saveCell(client, {
      cellId: 'cell-1',
      values: { ...BASELINE, summary: '  Books a crew ', owner: 'Dispatch ' },
      baseline: BASELINE,
    })
    expect(calls).toEqual([])
  })

  it('lets a caller keep a write off the ledger: a retry after the create landed', async () => {
    const empty = cellEditsFromCell(null)
    await saveCell(client, {
      cellId: 'cell-new',
      values: { ...empty, content: 'Hand over the keys', summary: 'Last step' },
      baseline: empty,
      record: false,
    })
    expect(calls).toEqual(['content'])
    const [, , , previous, options] = updateCellContent.mock.calls[0] as unknown as unknown[]
    expect(previous).toBeUndefined()
    expect(options).toEqual({ record: false })
  })
})
