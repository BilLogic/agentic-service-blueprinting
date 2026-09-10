import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  clearSession,
  recordChange,
  sessionSnapshot,
  type ChangeEntry,
  type SessionEntry,
} from '@/lib/authoringSession'
import { executeRevert } from '@/lib/revertChange'
import type { Database } from '@/types/database'

/**
 * The first undo of a first summary.
 *
 * Every one-column prose field starts null, so the FIRST save of one captures
 * `''` as its previous value — which makes "restore the empty" the commonest
 * revert in the ledger, not an edge case. `stringArg` refuses `''` on purpose
 * (an id never legitimately is one), and `update_service_summary` read its
 * value through it while the scenario and step cases did not. Reverting the
 * first service summary anyone wrote therefore threw "This change's revert is
 * missing its “summary” value" and left the field as typed.
 *
 * All three now read through `optionalStringArg`, so this asserts the same
 * thing three times rather than once: the empty string is the value, and the
 * write that clears the column actually runs.
 */
type Row = Record<string, unknown>

function fakeClient(table: string, rows: Row[]) {
  const updates: Array<{ table: string; patch: Row; filters: Row }> = []

  const client = {
    from(from: string) {
      return {
        update(patch: Row) {
          const filters: Row = {}
          let selected = false
          const api = {
            eq(column: string, value: unknown) {
              filters[column] = value
              return api
            },
            select(_columns?: string) {
              selected = true
              return api
            },
            then(onFulfilled: (value: unknown) => unknown) {
              const hit =
                from === table
                  ? rows.filter((row) =>
                      Object.entries(filters).every(
                        (entry) => row[entry[0]] === entry[1],
                      ),
                    )
                  : []
              for (const row of hit) Object.assign(row, patch)
              updates.push({ table: from, patch, filters })
              return Promise.resolve({
                data: selected ? hit : null,
                error: null,
              }).then(onFulfilled)
            },
          }
          return api
        },
      }
    },
  } as unknown as SupabaseClient<Database>

  return { client, updates }
}

/**
 * Built through `recordChange` rather than as an object literal.
 *
 * `executeRevert` takes a `SessionEntry`, which only the session stack mints,
 * so an entry assembled here by hand would need a cast — and a test that cast
 * its way past the boundary would be exercising a path the app cannot reach.
 * Going through the stack costs one line and keeps the fixture honest.
 */
const entry = (fn: string, args: Record<string, unknown>): SessionEntry => {
  recordChange(fn as ChangeEntry['fn'], {}, { fn, args })
  return sessionSnapshot().at(-1)!
}

beforeEach(() => clearSession())

describe('executeRevert restores an empty summary', () => {
  it('clears a service summary back to nothing', async () => {
    const { client, updates } = fakeClient('services', [
      { id: 'svc-1', summary: 'A sentence nobody asked for' },
    ])

    await executeRevert(
      client,
      entry('update_service_summary', { service_id: 'svc-1', summary: '' }),
    )

    expect(updates).toHaveLength(1)
    expect(updates[0]).toMatchObject({
      table: 'services',
      patch: { summary: null },
      filters: { id: 'svc-1' },
    })
  })

  it('clears a scenario summary back to nothing', async () => {
    const { client, updates } = fakeClient('scenarios', [
      { id: 'scn-1', summary: 'Typed once, regretted immediately' },
    ])

    await executeRevert(
      client,
      entry('update_scenario_spec', { scenario_id: 'scn-1', summary: '' }),
    )

    expect(updates[0]?.patch).toEqual({ summary: null })
  })

  it('clears a step summary back to nothing', async () => {
    const { client, updates } = fakeClient('steps', [
      { id: 'step-1', summary: 'What this moment is' },
    ])

    await executeRevert(
      client,
      entry('update_step_spec', { step_id: 'step-1', summary: '' }),
    )

    expect(updates[0]?.patch).toEqual({ summary: null })
  })

  it('still refuses a summary that is missing rather than empty', async () => {
    const { client } = fakeClient('services', [{ id: 'svc-1', summary: 'x' }])

    await expect(
      executeRevert(client, entry('update_service_summary', { service_id: 'svc-1' })),
    ).rejects.toThrow(/missing its .summary. value/)
  })
})
