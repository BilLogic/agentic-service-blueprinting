import { Field } from '@/components/blueprint/panelShell'
import { StatusBadge } from '@/components/blueprint/StatusBadge'
import { useBlueprintCell } from '@/hooks/useBlueprintCell'

/**
 * The cell's status and its owner pair, read-only.
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
  const status = cell.status
  if (!owner && !perceived && !status) return null

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1">
      {/* First, because it changes how everything under it should be read: a
          spec for something unbuilt is a proposal, not a description. Without
          it a reader has to open the editor to find out, and the editor is
          where you go to CHANGE a thing, not to learn what it is. */}
      {status ? (
        // Labelled like Summary, hint and all, rather than carrying a bare
        // label while its neighbour explains itself. "Status", not "State" —
        // one name for one property, the same word the paths picker and the
        // column use.
        <Field
          label="Status"
          hint="How far along the thing this cell describes is."
        >
          {/* A badge, not text: a governed six-value set the reader scans
              for rather than reads. */}
          <StatusBadge status={status} />
        </Field>
      ) : null}
      {owner ? <OwnerCell label="Owner" value={owner} /> : null}
      {perceived ? <OwnerCell label="Perceived owner" value={perceived} /> : null}
    </div>
  )
}

/**
 * A free-text owner, labelled. If an owner ever needs explaining, the
 * explanation belongs on the label like every other one, through `Field`'s
 * hint — not on the value.
 */
function OwnerCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-normal text-foreground/80">{value}</span>
    </div>
  )
}
