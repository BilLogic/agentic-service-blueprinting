import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * An in-memory database behind the PostgREST calls the mutation modules make.
 *
 * One fake for the tests that drive a write end to end — a revert, a slice —
 * rather than one per file: the chain it answers is the same everywhere
 * (`update … eq … select`, `select … eq … maybeSingle`, an `rpc`), and two
 * copies of it had already grown the same comment in two places. It records
 * what it was asked so a test can assert the write, and it holds rows so a
 * test can read them back.
 *
 * What it cannot see, on purpose: a grant or a policy. It answers every
 * write as an author the database would let write; `check:seed-load` asks
 * the real database that question for every column the panels write.
 */

export type Row = Record<string, unknown>

export type InMemoryDatabase = {
  client: SupabaseClient<Database>
  /** The tables, live: a write lands here and a read-back reads from here. */
  tables: Record<string, Row[]>
  /** Every update issued, in order. */
  updates: Array<{ table: string; patch: Row; filters: Row }>
  /** Every RPC issued, in order. */
  rpcs: Array<{ fn: string; args: Row }>
}

export type InMemoryDatabaseOptions = {
  /**
   * Columns a write silently fails to land — the shape of a real defect (a
   * column the grant forgot), so a slice can prove its read-back goes red.
   */
  dropOnWrite?: readonly string[]
  /** What each RPC answers; default is the placement sync's "removed nothing". */
  rpc?: (fn: string, args: Row) => unknown
}

export function inMemoryDatabase(
  seed: Record<string, Row[]>,
  options: InMemoryDatabaseOptions = {},
): InMemoryDatabase {
  const tables = structuredClone(seed)
  const updates: InMemoryDatabase['updates'] = []
  const rpcs: InMemoryDatabase['rpcs'] = []
  const dropped = new Set(options.dropOnWrite ?? [])

  const from = (table: string) => {
    const rows = tables[table] ?? []
    const filters: Row = {}
    let patch: Row | null = null
    let selected = false
    const matching = () =>
      rows.filter((row) => Object.entries(filters).every(([column, value]) => row[column] === value))
    const settle = () => {
      const hit = matching()
      if (patch) {
        const landed = Object.fromEntries(Object.entries(patch).filter(([column]) => !dropped.has(column)))
        for (const row of hit) Object.assign(row, landed)
        updates.push({ table, patch, filters })
        return { data: selected ? hit.map((row) => ({ id: row.id })) : null, error: null }
      }
      return { data: hit, error: null }
    }
    const api = {
      update(next: Row) {
        patch = next
        return api
      },
      select() {
        selected = true
        return api
      },
      eq(column: string, value: unknown) {
        filters[column] = value
        return api
      },
      // Read-side modifiers the hooks add; the fake answers the whole table
      // for them, which is what the tests that reach them expect.
      or() {
        return api
      },
      abortSignal() {
        return api
      },
      maybeSingle() {
        return Promise.resolve({ data: matching()[0] ?? null, error: null })
      },
      // A thenable, so `await client.from(…).update(…).eq(…).select(…)` works
      // the way it does on the real builder.
      then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
        return Promise.resolve(settle()).then(resolve, reject)
      },
    }
    return api
  }

  const client = {
    from,
    rpc(fn: string, args: Row) {
      rpcs.push({ fn, args })
      return Promise.resolve({ data: options.rpc ? options.rpc(fn, args) : { removed: [] }, error: null })
    },
  } as unknown as SupabaseClient<Database>

  return { client, tables, updates, rpcs }
}
