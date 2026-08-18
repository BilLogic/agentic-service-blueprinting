/**
 * Last-write-wins protection for the rows two people can edit at once.
 *
 * Three sharp edges live here rather than in every call site, because each
 * one fails silently rather than loudly:
 *
 * 1. **PostgREST returns 200 with an empty array when zero rows match.** The
 *    conflict branch is therefore `data.length === 0`, never `error !== null`.
 *    Checking `error` alone reports every conflict as a success.
 * 2. **The token must be the verbatim string PostgREST returned.** One pass
 *    through `Date` truncates microseconds, so `.eq('updated_at', token)`
 *    matches nothing and every save becomes a phantom conflict. Hence the
 *    opaque string type — it is never parsed, formatted, or compared as a
 *    date.
 * 3. **`updated_at` is trigger-maintained.** Clients never set it; a client
 *    that writes its own value defeats the whole mechanism.
 */

/**
 * A row's `updated_at` exactly as the server sent it. Opaque on purpose:
 * parse it and the guard stops working.
 */
export type UpdatedAtToken = string & { readonly __brand: 'UpdatedAtToken' }

export function asUpdatedAtToken(value: string): UpdatedAtToken {
  return value as UpdatedAtToken
}

/**
 * What an empty result means. It is genuinely ambiguous — the row may have
 * been changed by someone else, deleted, or hidden from this session by RLS —
 * so the caller refetches to find out which.
 */
export type WriteOutcome<T> =
  | { status: 'ok'; row: T }
  | { status: 'conflict' }

export class ConflictError extends Error {
  constructor(message = 'Someone else changed this first.') {
    super(message)
    this.name = 'ConflictError'
  }
}

/**
 * Interprets a guarded update's response.
 *
 * Call with the result of an `.update(...).eq('updated_at', token).select()`
 * — the `.select()` matters: without it there are no rows to count and the
 * conflict is invisible.
 */
export function readWriteOutcome<T>(
  data: T[] | null,
  error: { message: string } | null,
): WriteOutcome<T> {
  if (error) throw new Error(error.message)
  const rows = data ?? []
  if (rows.length === 0) return { status: 'conflict' }
  return { status: 'ok', row: rows[0] }
}

/**
 * The same zero-rows rule for writes that have no conflict branch to take.
 *
 * `.update(...).eq('id', …)` on a row that is gone returns `error: null` and
 * an empty array — a success by every check the call site makes. That is how
 * a cell edit whose cell was since deleted (a path delete cascades its cells)
 * reported "saved", and how its revert reported "taken back" while writing
 * nothing and dropping the entry from the ledger. Zero rows is a real answer,
 * so it is raised rather than returned: there is no state in which the caller
 * should carry on as if the write landed.
 *
 * Requires `.select(...)` on the query — without it there are no rows to
 * count and this check is a no-op that reads like a guarantee. The PostgREST
 * error is left to the caller, which knows whether it wants `toAuthoringError`.
 */
export function requireRowsWritten(
  data: unknown[] | null,
  subject: string,
): void {
  if (!data || data.length === 0) {
    throw new Error(`That ${subject} no longer exists — nothing was written.`)
  }
}
