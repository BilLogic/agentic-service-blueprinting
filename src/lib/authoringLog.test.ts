import { afterEach, expect, test } from 'vitest'
import {
  authoringLogRow,
  appendToAuthoringLog,
  setAuthoringLogWriter,
  ARCHIVED_BY_THE_DATABASE,
  type AuthoringLogRow,
} from '@/lib/authoringLog'
import {
  clearSession,
  recordChange,
  sessionSnapshot,
  setAgentAttribution,
  type ChangeEntry,
} from '@/lib/authoringSession'

/**
 * The durable half of the record.
 *
 * What is asserted here is the crossing, not the array — `authoring-session`
 * already covers the list. Every test below is a way the log could go on
 * looking correct while having lost the thing it exists to keep: the change
 * itself, the agent that made it, or the payload behind a delete.
 *
 * A green suite is not evidence on its own; a writer that was never installed
 * would also record nothing and also pass a test that only checked the array.
 * So the first test asserts the append HAPPENS, and the rest assert what it
 * carries.
 */

const entry = (over: Partial<ChangeEntry> = {}): ChangeEntry => ({
  id: 'c1',
  fn: 'add_step',
  args: { path_id: 'p1', name: 'Greet' },
  at: 0,
  ...over,
})

/** A writer that keeps what it was handed. */
function collector() {
  const rows: AuthoringLogRow[] = []
  setAuthoringLogWriter(async (row) => {
    rows.push(row)
  })
  return rows
}

afterEach(() => {
  setAuthoringLogWriter(null)
  setAgentAttribution(null)
  clearSession()
})

test('every recorded change reaches the durable log', () => {
  const rows = collector()
  clearSession()
  recordChange('add_step', { path_id: 'p1', name: 'Greet' })
  recordChange('rename_path', { path_id: 'p1', new_name: 'Sad path' })
  recordChange('update_cell_content', { cell_id: 'c9' })
  expect(rows.map((row) => row.fn)).toEqual([
    'add_step',
    'rename_path',
    'update_cell_content',
  ])
})

test('a row carries the operation, its arguments and its inverse', () => {
  const row = authoringLogRow(
    entry({
      fn: 'rename_phase',
      args: { phase_id: 'ph1', new_name: 'Enrollment' },
      revert: { fn: 'rename_phase', args: { phase_id: 'ph1', new_name: 'Intake' } },
    }),
  )
  expect(row).toEqual({
    fn: 'rename_phase',
    args: { phase_id: 'ph1', new_name: 'Enrollment' },
    revert: { fn: 'rename_phase', args: { phase_id: 'ph1', new_name: 'Intake' } },
    author: 'human',
    agent_session_id: null,
  })
})

test('a change with no captured inverse still records, with a null revert', () => {
  // Half the operations in the union capture no inverse. Dropping them would
  // make the log a record of revertible changes, which is a different and
  // much smaller claim than the one it makes.
  expect(authoringLogRow(entry({ fn: 'reorder_lanes' }))?.revert).toBeNull()
})

test('agent attribution survives into the durable record', () => {
  const rows = collector()
  clearSession()
  setAgentAttribution('session-7')
  recordChange('upsert_cell', { path_id: 'p1' })
  setAgentAttribution(null)
  recordChange('upsert_cell', { path_id: 'p1' })

  expect(rows[0].author).toBe('agent')
  expect(rows[0].agent_session_id).toBe('session-7')
  expect(rows[1].author).toBe('human')
  expect(rows[1].agent_session_id).toBeNull()
})

test('an agent attribution with no session is recorded as a human write', () => {
  // The column pair is a biconditional in SQL. A row claiming an agent with no
  // session is one the constraint refuses, and a refused row is a change with
  // NO record — which is strictly worse than one attributed conservatively.
  const row = authoringLogRow(entry({ author: 'agent' }))
  expect(row?.author).toBe('human')
  expect(row?.agent_session_id).toBeNull()
})

test('the deletes the database archives are not appended twice', () => {
  const rows = collector()
  clearSession()
  recordChange('delete_cell', { cell_id: 'c1' })
  recordChange('remove_lane', { scenario_id: 's1', lane_name: 'Tools' })
  recordChange('delete_slice', { slice_id: 'sl1' })

  // The first two are archived by the SQL function, payload and all, inside
  // the transaction that destroyed the rows. A second row here would be a
  // record of the same event carrying nothing that could restore it.
  expect(rows.map((row) => row.fn)).toEqual(['delete_slice'])
  // And the in-memory list is unchanged by the skip — undo behaves as it did.
  expect(sessionSnapshot().map((change) => change.fn)).toEqual([
    'delete_cell',
    'remove_lane',
    'delete_slice',
  ])
})

test('every archived operation is skipped, and nothing else is', () => {
  for (const fn of ARCHIVED_BY_THE_DATABASE) {
    expect(authoringLogRow(entry({ fn: fn as ChangeEntry['fn'] }))).toBeNull()
  }
  // `delete_slice` is the one delete with no archive anywhere — there is no
  // recovery for a slice, which `sliceMutations` says in its own words — so it
  // has to be the client's row or it is nobody's.
  expect(ARCHIVED_BY_THE_DATABASE.has('delete_slice')).toBe(false)
  expect(authoringLogRow(entry({ fn: 'delete_slice' }))).not.toBeNull()
})

test('a failing durable append does not disturb the change list', () => {
  // Audit-only. The write it describes has already landed, so reporting the
  // append's failure to the author would say "your edit did not save" about an
  // edit that did.
  setAuthoringLogWriter(() => Promise.reject(new Error('offline')))
  clearSession()
  expect(() => recordChange('add_lane', { scenario_id: 's1' })).not.toThrow()
  expect(sessionSnapshot()).toHaveLength(1)
})

test('a writer that throws synchronously is contained too', () => {
  setAuthoringLogWriter(() => {
    throw new Error('no client')
  })
  clearSession()
  expect(() => appendToAuthoringLog(entry())).not.toThrow()
  expect(() => recordChange('add_lane', { scenario_id: 's1' })).not.toThrow()
  expect(sessionSnapshot()).toHaveLength(1)
})

test('with no writer installed the session still records', () => {
  setAuthoringLogWriter(null)
  clearSession()
  recordChange('add_step', { path_id: 'p1' })
  expect(sessionSnapshot()).toHaveLength(1)
})
