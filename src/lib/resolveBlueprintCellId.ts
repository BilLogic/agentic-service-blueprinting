const INTEGRATED_CELL_ID_PATTERN =
  /^integrated-cell-[0-9a-f-]{36}-([0-9a-f-]{36})$/i

/** Map integrated overlay cell ids back to canonical blueprint cell ids. */
export function resolveBlueprintCellId(cellId: string): string {
  const match = INTEGRATED_CELL_ID_PATTERN.exec(cellId)
  return match ? match[1]! : cellId
}
