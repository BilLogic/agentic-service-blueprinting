import { createContext, useContext } from 'react'

export type SliceMembership = {
  /** Cell ids belonging to the open slice (raw + resolved forms). */
  memberCellIds: ReadonlySet<string>
  /**
   * Raw + resolved member id → 1-based sequence number (tombstones skipped).
   * BlueprintCellButton renders the number as a badge on the cell corner, so
   * it moves and scales with the cell under zoom.
   */
  sequenceByCellId: ReadonlyMap<string, number>
}

/**
 * Membership of the open slice. Provided by SliceView around the normal
 * blueprint view; BlueprintCellButton reads it to set `data-slice-member`
 * and render the sequence badge without restructuring the grid tree.
 */
export const SliceMembershipContext = createContext<SliceMembership | null>(
  null,
)

export function useSliceMembership(): SliceMembership | null {
  return useContext(SliceMembershipContext)
}
