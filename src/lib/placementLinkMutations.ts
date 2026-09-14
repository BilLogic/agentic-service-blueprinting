import type { SupabaseClient } from '@supabase/supabase-js'
import { recordChange } from '@/lib/authoringSession'
import { toAuthoringError } from '@/lib/authoringErrors'
import type { Database, Json } from '@/types/database'
import { invalidateCellBoard, invalidateQueries } from '@/lib/queryClient'
import { queryKeys } from '@/lib/queryKeys'

type Client = SupabaseClient<Database>

/** A placement's link changed: the cell's registry reads, and the grid that draws the badge. */
function placementLinkWritten(cellId: string | null | undefined): void {
  invalidateCellBoard(cellId)
  if (cellId) {
    invalidateQueries(queryKeys.nameOnlyPlacements.of(cellId))
    invalidateQueries(queryKeys.registryTouchpoints.of(cellId))
  } else {
    invalidateQueries(queryKeys.nameOnlyPlacements.prefix)
    invalidateQueries(queryKeys.registryTouchpoints.prefix)
  }
}

/**
 * A placement's identity, and its removal.
 *
 * A placement names its touchpoint one of two ways: a registry id, or a
 * name the registry lacks. "Link to registry" is the first replacing the
 * second, and its inverse is the second replacing the first — the same
 * function both ways, which is why the inverse is the function itself with
 * the pair it returned. Removing a name-only row nobody wants hands back the
 * row and its resources, and `restore_placement` puts both back under the
 * same id.
 *
 * Nothing here matches a name to the registry entry it resembles; the
 * choice is the author's, made in the panel, and this module only records
 * it.
 */

export type PlacementIdentity =
  | { touchpointId: string; name?: undefined }
  | { touchpointId?: undefined; name: string }

type Previous = { touchpoint_id: string | null; name: string | null }

function readPrevious(data: unknown): Previous {
  const answer = (data ?? {}) as Record<string, unknown>
  return {
    touchpoint_id: typeof answer.touchpoint_id === 'string' ? answer.touchpoint_id : null,
    name: typeof answer.name === 'string' ? answer.name : null,
  }
}

/** Name a placement's touchpoint — into the registry, or by name alone. */
export async function setPlacementTouchpoint(
  client: Client,
  placement: { id: string; cellId?: string | null; name: string },
  to: PlacementIdentity & { touchpointName?: string },
): Promise<void> {
  // Both optional arguments default to null in the function, so leaving one
  // out is the same call as sending null; the generated types spell an
  // optional argument as absent.
  const { data, error } = await client.rpc('set_placement_touchpoint', {
    p_placement_id: placement.id,
    p_touchpoint_id: to.touchpointId ?? undefined,
    p_name: to.name ?? undefined,
  })
  if (error) throw toAuthoringError(error)
  const previous = readPrevious(data)

  placementLinkWritten(placement.cellId)
  recordChange(
    'set_placement_touchpoint',
    {
      placement_id: placement.id,
      ...(placement.cellId ? { cell_id: placement.cellId } : {}),
      name: placement.name,
      ...(to.touchpointId
        ? { touchpoint_id: to.touchpointId, touchpoint_name: to.touchpointName ?? '' }
        : {}),
    },
    {
      fn: 'set_placement_touchpoint',
      args: {
        p_placement_id: placement.id,
        p_touchpoint_id: previous.touchpoint_id,
        p_name: previous.name,
      },
    },
  )
}

/** Delete one placement; the ledger keeps the row and its resources. */
export async function removePlacement(
  client: Client,
  placement: { id: string; cellId?: string | null; name: string },
): Promise<void> {
  const { data, error } = await client.rpc('remove_placement', {
    p_placement_id: placement.id,
  })
  if (error) throw toAuthoringError(error)
  const answer = (data ?? {}) as { row?: Json; resources?: Json }
  if (!answer.row || typeof answer.row !== 'object') {
    throw new Error('The placement was removed but nothing came back to restore it with.')
  }

  placementLinkWritten(placement.cellId)
  recordChange(
    'remove_placement',
    {
      placement_id: placement.id,
      ...(placement.cellId ? { cell_id: placement.cellId } : {}),
      name: placement.name,
    },
    {
      fn: 'restore_placement',
      args: { p_row: answer.row, p_resources: answer.resources ?? [] },
    },
  )
}
