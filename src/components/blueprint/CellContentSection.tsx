import { Field } from '@/components/blueprint/panelShell'
import { StatusBadge } from '@/components/blueprint/StatusBadge'
import { useBlueprintCell } from '@/hooks/useBlueprintCell'
import { EDITABLE_CELL_FIELDS, type EditableCellField } from '@/lib/cellFields'
import type { EntityStatus } from '@/lib/entityStatus'

/**
 * The cell's status and its owner pair, read-only.
 *
 * Owner and perceived owner are shown together and only when at least one is
 * set — side by side, because the interesting case is when they differ. That
 * gap is a finding: the person on the other side thinks they are dealing with
 * someone other than whoever is accountable.
 *
 * The rows are the cell field list's: the content-group fields the panel
 * shows as a badge or a tag, with the descriptor's label and hint, so the
 * word a reader sees here is the word the editor shows and the map binds.
 * The pair comes off the board already in memory — the columns ride the board
 * query rather than a request of their own, so this renders in the same commit
 * as the panel around it.
 *
 * Editing does not live here anymore: in Edit mode the panel swaps this
 * section for `CellPanelEditor`, one form with one Save for the whole cell.
 */

/** The fields this section shows: status first, then the owner pair. */
const ROWS: readonly EditableCellField[] = EDITABLE_CELL_FIELDS.filter(
  (field) =>
    field.group === 'content' &&
    (field.editor.control === 'status' || field.editor.control === 'ownerTag'),
)

export function CellContentSection({ cellId }: { cellId: string | null }) {
  const cell = useBlueprintCell(cellId)

  if (!cellId || !cell) return null

  const shown = ROWS.filter((field) => {
    const value = cell[field.key]
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
  })
  if (shown.length === 0) return null

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1">
      {/*
        The value is read by control, not by key, so the casts below are the
        one place the checker cannot follow the descriptor's correlation
        (status control ⇒ status value, owner tag ⇒ text); the list types
        each pairing where it is written.
      */}
      {shown.map((field) =>
        field.editor.control === 'status' ? (
          // First, because it changes how everything under it should be
          // read: a spec for something unbuilt is a proposal, not a
          // description. Labelled like Summary, hint and all, rather than
          // carrying a bare label while its neighbour explains itself; a
          // badge, not text, because a governed six-value set is scanned
          // for rather than read.
          <Field key={field.key} label={field.label} hint={field.hint}>
            <StatusBadge status={cell[field.key] as EntityStatus} />
          </Field>
        ) : (
          <OwnerCell key={field.key} label={field.label} value={(cell[field.key] as string).trim()} />
        ),
      )}
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
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-normal text-foreground">{value}</span>
    </div>
  )
}
