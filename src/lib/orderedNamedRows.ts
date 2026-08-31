type OrderedNamedRow = {
  position: number
  name?: string | null
}

/**
 * Normalize an embedded PostgREST relation whose authored order and name are
 * part of the domain contract.
 */
export function orderedNamedRows<T extends OrderedNamedRow, R>(
  rows: readonly T[] | null | undefined,
  project: (row: T, name: string) => R,
): R[] {
  if (!rows || rows.length === 0) return []

  return rows
    .filter((row) => (row.name ?? '').trim())
    .slice()
    // PostgREST does not promise an order for an embedded relation.
    .sort((a, b) => a.position - b.position)
    .map((row) => project(row, row.name!.trim()))
}
