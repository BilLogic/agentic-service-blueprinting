import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it } from 'vitest'

import { clearSession, sessionSnapshot } from '@/lib/authoringSession'
import {
  normalizeEntityExamples,
  updateServiceEntityExamples,
} from '@/lib/serviceSpecMutations'
import type { Database } from '@/types/database'

/**
 * What the entity-examples write promises, exercised rather than read.
 *
 * The claims that would have caught the defects this path is written against:
 * that an emptied input drops its key rather than storing a blank (the read
 * renders a blank as nothing and an absent key as nothing, but only the absent
 * key is what a fresh deployment has, so they must not diverge); that a write
 * matching no row is a FAILURE rather than PostgREST's silent 200-and-empty;
 * and that the undo entry carries the previous map so a revert restores exactly
 * what the column held.
 *
 * The fake answers the one query shape this module builds — an update on
 * `services` filtered by `id`, selecting to count. Any other shape should fail
 * the test rather than be quietly served.
 */
type Row = Record<string, unknown>

function fakeClient(rows: Row[]) {
  const updates: Array<{ table: string; patch: Row; filters: Row }> = []

  const client = {
    from(table: string) {
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
              const hit = rows.filter((row) =>
                Object.entries(filters).every(
                  (entry) => row[entry[0]] === entry[1],
                ),
              )
              for (const row of hit) Object.assign(row, patch)
              updates.push({ table, patch, filters })
              return Promise.resolve(
                { data: selected ? hit : null, error: null },
              ).then(onFulfilled)
            },
          }
          return api
        },
      }
    },
  } as unknown as SupabaseClient<Database>

  return { client, updates, rows }
}

const service = () => [{ id: 'svc-1', entity_examples: {} }]

beforeEach(() => clearSession())

describe('normalizeEntityExamples', () => {
  it('trims each value and drops the blanks', () => {
    expect(
      normalizeEntityExamples({
        service: '  The whole home retrofit  ',
        phase: '',
        scenario: '   ',
        path: 'The happy path',
      }),
    ).toEqual({
      service: 'The whole home retrofit',
      path: 'The happy path',
    })
  })

  it('keeps only the six known kinds, in canonical order', () => {
    const normalized = normalizeEntityExamples({
      lane: 'The installer lane',
      service: 'The whole retrofit',
      // A key no kind owns must not ride into the jsonb.
      touchpoint: 'not a core kind',
    } as never)
    expect(Object.keys(normalized)).toEqual(['service', 'lane'])
  })
})

describe('updateServiceEntityExamples', () => {
  it('writes the normalized map to the named service row', async () => {
    const { client, rows, updates } = fakeClient(service())
    await updateServiceEntityExamples(client, 'svc-1', {
      service: 'The whole retrofit',
      phase: '  ',
      lane: 'The installer lane',
    })

    expect(updates[0].table).toBe('services')
    expect(updates[0].filters).toEqual({ id: 'svc-1' })
    // The blank phase is gone, the two written kinds trimmed and kept.
    expect(rows[0].entity_examples).toEqual({
      service: 'The whole retrofit',
      lane: 'The installer lane',
    })
  })

  it('fails when the update matches no row', async () => {
    const { client } = fakeClient(service())
    await expect(
      updateServiceEntityExamples(client, 'no-such-service', {
        service: 'x',
      }),
    ).rejects.toThrow(/no longer exists/)
  })

  it('records an undo whose inverse is the previous map', async () => {
    const { client } = fakeClient(service())
    await updateServiceEntityExamples(
      client,
      'svc-1',
      { service: 'The new sentence' },
      { service: 'The old sentence', phase: 'The old phase' },
    )

    const [entry] = sessionSnapshot()
    expect(entry.fn).toBe('update_service_entity_examples')
    expect(entry.revert).toEqual({
      fn: 'update_service_entity_examples',
      args: {
        service_id: 'svc-1',
        update: { service: 'The old sentence', phase: 'The old phase' },
      },
    })
  })

  it('records nothing when told not to — the revert path', async () => {
    const { client } = fakeClient(service())
    await updateServiceEntityExamples(
      client,
      'svc-1',
      { service: 'restored' },
      undefined,
      { record: false },
    )
    expect(sessionSnapshot()).toHaveLength(0)
  })
})
