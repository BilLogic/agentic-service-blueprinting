import { useMemo } from 'react'
import { useBlueprintCellDetailOptional } from '@/contexts/BlueprintCellDetailContext'
import type { BlueprintCell } from '@/types/blueprint'

/**
 * One cell, from the board that is already in memory.
 *
 * Replaces `useCellSpec` and `useCellContent`, which each fetched a handful of
 * columns for one cell on panel open — up to three round-trips per cell, for
 * fields the board can carry for 2% more payload.
 *
 * Synchronous by construction: there is nothing to wait for, which is why the
 * two skeletons those hooks needed are gone rather than reshaped.
 */
export function useBlueprintCell(cellId: string | null): BlueprintCell | null {
  const detail = useBlueprintCellDetailOptional()
  const blueprints = detail?.blueprints

  return useMemo(() => {
    if (!cellId || !blueprints) return null
    for (const blueprint of blueprints) {
      const found = blueprint.cells.find((cell) => cell.id === cellId)
      if (found) return found
    }
    return null
  }, [cellId, blueprints])
}
