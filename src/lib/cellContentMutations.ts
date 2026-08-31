import type { SupabaseClient } from '@supabase/supabase-js'
import type { CellResource } from '@/types/blueprint'
import type { Database, Json } from '@/types/database'
import { recordChange } from '@/lib/authoringSession'
import { toAuthoringError } from '@/lib/authoringErrors'
import { requireRowsWritten } from '@/lib/optimisticConcurrency'
import { validateResourceUrl } from '@/lib/resourceUrl'
import { hostOf } from '@/lib/cellResources'

type Client = SupabaseClient<Database>

export type CellContentUpdate = {
  /** The text in the cell on the grid. */
  content: string
  summary: string
  owner: string
  perceivedOwner: string
}

/**
 * Write the cell's own text.
 *
 * These columns carry a column-level grant from the authoring migration, for
 * the same reason the spec columns do: the panel can edit what a cell *says*
 * without that opening the cell's position — path, lane, step — to the same
 * path. Where a cell sits is structure, and structure goes through the RPCs.
 *
 * `content` is the one field that is never nulled. A cell with no text is a
 * blank box on the grid that cannot be told apart from a gap in the blueprint,
 * so an empty label is refused here rather than stored.
 */
export async function updateCellContent(
  client: Client,
  cellId: string,
  update: CellContentUpdate,
  /** The values being replaced — captured so the change can be reverted. */
  previous?: CellContentUpdate,
  /**
   * Session-log participation, decided per call rather than by ambient
   * module state: a revert passes `record: false` so undoing "edited text"
   * never logs a new edit — while a concurrent ordinary save, in flight at
   * the same moment, still logs itself. A global suspend flag around an
   * `await` swallowed exactly those saves.
   */
  options: { record?: boolean } = {},
): Promise<void> {
  const content = update.content.trim()
  if (!content) {
    throw new Error('A cell needs text — an empty one reads as a gap in the grid.')
  }

  const { data, error } = await client
    .from('cells')
    .update({
      content,
      // Empty means "not specified", stored as null so the read path has one
      // kind of empty to check rather than two.
      summary: update.summary.trim() || null,
      owner: update.owner.trim() || null,
      perceived_owner: update.perceivedOwner.trim() || null,
    })
    .eq('id', cellId)
    .select('id')
  if (error) throw toAuthoringError(error)
  // `.select('id')` + this check, not `error === null`: a matched-nothing
  // update is a 200 with an empty array. Without it, editing a cell whose
  // path was since deleted "succeeds", and its revert reports "taken back"
  // having written nothing.
  requireRowsWritten(data, 'cell')
  // Direct table write, so `call()` never sees it — logged here for the same
  // reason and with the same after-success placement.
  if (options.record !== false) {
    recordChange(
      'update_cell_content',
      { cell_id: cellId },
      previous?.content.trim()
        ? {
            fn: 'update_cell_content',
            args: { cell_id: cellId, update: previous },
          }
        : undefined,
    )
  }
}

export type ResourceDraft = { name: string; url: string }

/**
 * Replace the cell's resources, in one transaction.
 *
 * An RPC rather than a table write, and the reason is the position column:
 * the editor rewrites a whole list, PostgREST gives every statement its own
 * transaction, and a deferred unique only forgives a collision until COMMIT.
 * `sync_cell_resources` deletes and reinserts inside one.
 *
 * It reaches only rows whose `cell_id` is this cell, so a resource attached to
 * one touchpoint placement is not this editor's to destroy.
 */
export async function updateCellResources(
  client: Client,
  cellId: string,
  /** The rows being replaced — captured so the change can be reverted. */
  existing: CellResource[],
  drafts: ResourceDraft[],
): Promise<void> {
  const rows = drafts.map((draft) => {
    const checked = validateResourceUrl(draft.url)
    if (!checked.ok) throw new Error(checked.problem)
    return {
      kind: 'link',
      // The one place a nameless resource gets a name. The database refuses
      // a row without one rather than inventing a second answer.
      name: draft.name.trim() || hostOf(checked.url),
      url: checked.url,
    }
  })

  const { error } = await client.rpc('sync_cell_resources', {
    p_cell_id: cellId,
    p_rows: rows as unknown as Json,
  })
  if (error) throw toAuthoringError(error)
  recordChange(
    'update_cell_resources',
    { cell_id: cellId },
    // Reverting means writing the pre-write list back as it was.
    {
      fn: 'update_cell_resources',
      args: {
        cell_id: cellId,
        rows: existing.map((resource) => ({
          name: resource.name,
          url: resource.url ?? '',
        })),
      },
    },
  )
}
