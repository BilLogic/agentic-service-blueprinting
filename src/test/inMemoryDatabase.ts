import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * An in-memory database behind the PostgREST calls the mutation modules make.
 *
 * One fake for the tests that drive a write end to end — a revert, a slice —
 * rather than one per file: the chain it answers is the same everywhere
 * (`update … eq|in … select`, `upsert`, `delete … eq`, `select … eq … maybeSingle`,
 * `select … order`, an `rpc`), and two copies of it had already grown the same
 * comment in two places. It records what it was asked so a test can assert the
 * write, and it holds rows so a test can read them back.
 *
 * What it cannot see, on purpose: a grant or a policy. It answers every
 * write as an author the database would let write; `check:seed-load` asks
 * the real database that question for every column the panels write.
 *
 * It also holds only the tables the seed names. A write to any other table
 * vanishes and reads back empty — so a typo'd table name stays a visible
 * failure instead of quietly becoming a table of its own. A test that drives
 * a flow which writes through to another table seeds that table empty.
 */

export type Row = Record<string, unknown>

export type InMemoryDatabase = {
  client: SupabaseClient<Database>
  /** The tables, live: a write lands here and a read-back reads from here. */
  tables: Record<string, Row[]>
  /**
   * Every update issued, in order. `select` is the columns the chain asked
   * for: PostgREST 400s on a column the table does not have, and the count
   * `requireRowsWritten` reads exists only because the chain selected at all,
   * so a test that asserts the write asserts what it selected too.
   */
  updates: Array<{ table: string; patch: Row; filters: Row; select?: string }>
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

/**
 * Two values in one column, ordered the way the database orders that column:
 * numbers as numbers, everything else as text. A numeric `order` matters —
 * the agent transcript's `agent_messages.seq` is a number, and a string
 * compare would sort 10 before 9.
 */
function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a ?? '').localeCompare(String(b ?? ''))
}

export function inMemoryDatabase(
  seed: Record<string, Row[]>,
  options: InMemoryDatabaseOptions = {},
): InMemoryDatabase {
  const tables = structuredClone(seed)
  const updates: InMemoryDatabase['updates'] = []
  const rpcs: InMemoryDatabase['rpcs'] = []
  const dropped = new Set(options.dropOnWrite ?? [])
  /** What a write lands: the patch minus the columns this fake drops. */
  const landing = (row: Row): Row =>
    Object.fromEntries(Object.entries(row).filter(([column]) => !dropped.has(column)))

  const from = (table: string) => {
    // Only the seeded tables exist. A write to another one lands in this
    // throwaway array and is gone, which is how a typo'd table name fails
    // loudly rather than inventing a table.
    const rows = tables[table] ?? []
    const filters: Row = {}
    /** `.in(column, values)` — one column, a set of values, as PostgREST reads it. */
    const memberships: Array<{ column: string; values: readonly unknown[] }> = []
    let patch: Row | null = null
    let upserted: Row | null = null
    let onConflict: readonly string[] = ['id']
    let deleting = false
    let ordering: { column: string; ascending: boolean } | null = null
    let selected = false
    let selectedColumns: string | undefined
    const matching = () =>
      rows.filter(
        (row) =>
          Object.entries(filters).every(([column, value]) => row[column] === value) &&
          memberships.every((one) => one.values.includes(row[one.column])),
      )
    const settle = () => {
      const hit = matching()
      if (deleting) {
        const removed = new Set(hit)
        const kept = rows.filter((row) => !removed.has(row))
        rows.length = 0
        rows.push(...kept)
        return { data: null, error: null }
      }
      if (upserted) {
        const landed = landing(upserted)
        // The conflict target decides identity — `id` unless the caller named
        // another set, which is how `agent_messages` addresses a row.
        const existing = rows.find((row) => onConflict.every((column) => row[column] === upserted![column]))
        if (existing) Object.assign(existing, landed)
        else rows.push({ ...landed })
        return { data: selected ? [{ id: (existing ?? landed).id }] : null, error: null }
      }
      if (patch) {
        const landed = landing(patch)
        for (const row of hit) Object.assign(row, landed)
        updates.push({
          table,
          patch,
          ...(selectedColumns === undefined ? {} : { select: selectedColumns }),
          filters: memberships.reduce<Row>(
            (all, one) => ({ ...all, [one.column]: [...one.values] }),
            { ...filters },
          ),
        })
        return { data: selected ? hit.map((row) => ({ id: row.id })) : null, error: null }
      }
      if (!ordering) return { data: hit, error: null }
      const { column, ascending } = ordering
      const sorted = [...hit].sort(
        (a, b) => compare(a[column], b[column]) * (ascending ? 1 : -1),
      )
      return { data: sorted, error: null }
    }
    const api = {
      update(next: Row) {
        patch = next
        return api
      },
      upsert(next: Row, settings?: { onConflict?: string }) {
        upserted = next
        if (settings?.onConflict) onConflict = settings.onConflict.split(',').map((column) => column.trim())
        return api
      },
      delete() {
        deleting = true
        return api
      },
      select(columns?: string) {
        selected = true
        selectedColumns = columns
        return api
      },
      eq(column: string, value: unknown) {
        filters[column] = value
        return api
      },
      // The fan-out's filter: a lane's spec lands on every row carrying the
      // label, so the write names the ids rather than one id.
      in(column: string, values: readonly unknown[]) {
        memberships.push({ column, values })
        return api
      },
      // Read-side modifiers the hooks add; the fake answers the whole table
      // for them, which is what the tests that reach them expect.
      or() {
        return api
      },
      order(column: string, settings?: { ascending?: boolean }) {
        ordering = { column, ascending: settings?.ascending !== false }
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
