import { useBlueprintCell } from '@/hooks/useBlueprintCell'

/**
 * The owner pair, read-only.
 *
 * Owner and perceived owner are shown together and only when at least one is
 * set — side by side, because the interesting case is when they differ. That
 * gap is a finding: the person on the other side thinks they are dealing with
 * someone other than whoever is accountable.
 *
 * The pair comes off the board already in memory — the columns ride the board
 * query rather than a request of their own, so this renders in the same commit
 * as the panel around it.
 *
 * Editing does not live here anymore: in Edit mode the panel swaps this
 * section for `CellPanelEditor`, one form with one Save for the whole cell.
 */
export function CellContentSection({ cellId }: { cellId: string | null }) {
  const cell = useBlueprintCell(cellId)

  if (!cellId || !cell) return null

  const owner = cell.owner?.trim() ?? ''
  const perceived = cell.perceived_owner?.trim() ?? ''
  if (!owner && !perceived) return null

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1">
      {owner ? <OwnerCell label="Owner" value={owner} /> : null}
      {perceived ? <OwnerCell label="Perceived owner" value={perceived} /> : null}
    </div>
  )
}

function OwnerCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs font-medium text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground/80">{value}</span>
    </div>
  )
}
