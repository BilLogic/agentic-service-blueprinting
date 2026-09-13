import type { SupabaseClient } from '@supabase/supabase-js'
import { upsertCell } from '@/lib/authoringRpc'
import { updateCellContent } from '@/lib/cellContentMutations'
import {
  changedCellFields,
  type CellEdits,
  type CellWriteRoute,
  type EditableCellField,
} from '@/lib/cellFields'
import { updateCellSpec } from '@/lib/cellSpecMutations'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

/**
 * The one save for a cell's fields.
 *
 * A cell is one thing to the person editing it and three to the database:
 * where it sits is structure and enters through an authoring RPC; what it
 * says and who owns it is written by the content mutation over its column
 * grant; what it is like is written by the spec mutation over its own. The
 * panel used to know all three — which fields went where, in what order,
 * which write logged itself. This takes a cell id and the edits, and routes
 * each changed field by the route its descriptor declares; the panel no
 * longer knows there are three paths. The agent's `update_cell` still
 * routes on its own, in the tool's file; it moves onto this save when its
 * arguments derive from the same list, which is the next ticket's work.
 *
 * The order is fixed and load-bearing: the create first, because the other
 * writes need its id; content before spec, because the content write syncs
 * the cell's touchpoint placements and a caller that writes a placement
 * afterwards asks whether it survived. A placement is not a cell field and
 * is not saved here.
 */

/** Where a cell that does not exist yet goes. */
export type CellSlot = { pathId: string; laneId: string; stepId: string }

/**
 * Which cell: one that exists, by id, or one that does not yet, by the slot
 * the create fills. A union rather than an id-or-null with an optional slot,
 * so a create with nowhere to go is a type error and not a thrown one.
 */
export type CellSaveTarget = { cellId: string; slot?: undefined } | { cellId: null; slot: CellSlot }

export type CellSaveInput = CellSaveTarget & {
  /** The edits as the person left them. */
  values: CellEdits
  /**
   * The edits as they stood when editing began — frozen by the caller, so a
   * revert of the same cell mid-edit cannot move what the diff is against.
   * For a cell that does not exist yet, the empty form.
   */
  baseline: CellEdits
  /**
   * Whether the writes log themselves in the session ledger, with the
   * baseline as their inverse. Default: when the cell already existed. A
   * draft's fill-in rides the create's own "Added a cell" entry, and so does
   * a retry after the create landed and a later write failed.
   */
  record?: boolean
  /**
   * Told the new cell's id the moment the create lands, before the writes
   * that follow it. A caller that only learns the id from the result learns
   * nothing when a later write throws, and its retry would create a second
   * cell — logging a second "Added a cell" whose revert deletes the same row.
   */
  onCreated?: (cellId: string) => void
}

export type CellSaveResult = {
  cellId: string
  /** Whether this save created the cell. */
  created: boolean
  /** The routes that received a write, in the order they ran. */
  routes: Exclude<CellWriteRoute, null>[]
}

const byRoute = (fields: readonly EditableCellField[], route: CellWriteRoute) =>
  fields.filter((descriptor) => descriptor.writeRoute === route)

export async function saveCell(client: Client, input: CellSaveInput): Promise<CellSaveResult> {
  const { values, baseline } = input
  const record = input.record ?? input.cellId !== null
  const routes: CellSaveResult['routes'] = []

  const created = input.cellId === null
  let cellId: string
  if (input.cellId === null) {
    // Structure enters here and only here: the slot is the RPC's argument,
    // and the text goes with it because a cell with no text is a blank box
    // the grid cannot tell from a gap. No editable field routes through the
    // RPC on its own — a change of lane or step is a move, not a save.
    cellId = (await upsertCell(client, { ...input.slot, content: values.content.trim() })).id
    routes.push('rpc')
    input.onCreated?.(cellId)
  } else {
    cellId = input.cellId
  }

  const changed = changedCellFields(values, baseline)
  const moved = byRoute(changed, 'rpc')
  if (moved.length > 0) {
    throw new Error(
      `${moved.map((descriptor) => descriptor.label).join(', ')} moves through an authoring RPC, not a save.`,
    )
  }

  // The create wrote the text; only the rest of the content route counts as
  // a change on a cell created in this call.
  const contentChanged = byRoute(changed, 'content').some(
    (descriptor) => !(created && descriptor.key === 'content'),
  )
  if (contentChanged) {
    await updateCellContent(
      client,
      cellId,
      {
        content: values.content,
        summary: values.summary,
        owner: values.owner,
        perceivedOwner: values.perceived_owner,
        status: values.status,
      },
      record
        ? {
            content: baseline.content,
            summary: baseline.summary,
            owner: baseline.owner,
            perceivedOwner: baseline.perceived_owner,
            // The status as it stood, so the inverse restores five fields
            // and not four; the mutation's `previous` requires it.
            status: baseline.status,
          }
        : undefined,
      { record },
    )
    routes.push('content')
  }

  if (byRoute(changed, 'spec').length > 0) {
    await updateCellSpec(
      client,
      cellId,
      { function: values.function, form: values.form, valueProps: values.value_props },
      record
        ? { function: baseline.function, form: baseline.form, valueProps: baseline.value_props }
        : undefined,
      { record },
    )
    routes.push('spec')
  }

  // Every editable field takes one of the routes above: the list types an
  // editable field's route as one of the three, so a descriptor that
  // declared none would not compile, and there is no fourth branch here.
  return { cellId, created, routes }
}
