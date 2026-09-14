import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession } from '@/lib/authoringSession'
import { updateCellSpec } from '@/lib/cellSpecMutations'
import { inMemoryDatabase, type Row } from '@/test/inMemoryDatabase'

const ROW: Row = {
  id: 'cell-1',
  function: 'Confirm the job',
  form: 'A phone call',
  value_props: [{ for: 'Customer', value: 'A booked slot' }],
}

beforeEach(() => {
  clearSession()
})

describe('updateCellSpec', () => {
  it('writes the empty list, not null, when every value proposition is cleared', async () => {
    // `cells.value_props` is NOT NULL with `[]` as its default. Clearing the
    // list used to write null, which the column refuses — a write that
    // failed only on the day somebody removed the last proposition.
    const db = inMemoryDatabase({ cells: [ROW] })
    await updateCellSpec(
      db.client as never,
      'cell-1',
      { function: 'Confirm the job', form: 'A phone call', valueProps: [] },
      { function: 'Confirm the job', form: 'A phone call', valueProps: [{ for: 'Customer', value: 'A booked slot' }] },
    )
    expect(db.updates).toHaveLength(1)
    expect(db.updates[0]!.patch).toMatchObject({ value_props: [] })
    expect(db.tables.cells[0]!.value_props).toEqual([])
  })

  it('trims each proposition and drops the blank ones', async () => {
    const db = inMemoryDatabase({ cells: [ROW] })
    await updateCellSpec(db.client as never, 'cell-1', {
      function: ' Confirm ',
      form: '',
      valueProps: [
        { for: ' Customer ', value: ' A slot ' },
        { for: '  ', value: '' },
      ],
    })
    expect(db.updates[0]!.patch).toEqual({
      function: 'Confirm',
      form: null,
      value_props: [{ for: 'Customer', value: 'A slot' }],
    })
  })
})
