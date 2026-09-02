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

/**
 * A row as the editor holds it. `id` is the row it came from; absent on a
 * row typed since the last save. `kind` is `attachment` for a file and
 * `link` otherwise; the sync leaves a kept row's kind alone either way.
 */
export type ResourceDraft = {
  id?: string | null
  kind?: 'link' | 'attachment'
  name: string
  url: string
}

/** The rows `sync_cell_resources` takes, and the shape a revert carries. */
export type ResourceRowInput = {
  /** Null for a row to insert; the row's own id for one to update in place (#110). */
  id: string | null
  kind: string
  name: string
  url: string | null
}

/**
 * Replace the cell's resources, in one transaction.
 *
 * An RPC rather than a table write, and the reason is the position column:
 * the editor rewrites a whole list, PostgREST gives every statement its own
 * transaction, and a deferred rule only forgives a collision until COMMIT.
 * `sync_cell_resources` reconciles the list inside one — a row that arrives
 * with its id is updated in place, so a reorder keeps every id (#110).
 *
 * It writes the cell's OWN rows. A placement's resources sit in the same
 * list to be read but are the touchpoint's to write, and the sync refuses
 * their ids.
 */
export async function updateCellResources(
  client: Client,
  cellId: string,
  /** The rows being replaced — captured so the change can be reverted. */
  existing: readonly CellResource[],
  drafts: ResourceDraft[],
): Promise<void> {
  const rows: ResourceRowInput[] = []
  for (const draft of drafts) {
    const checked =
      draft.kind === 'attachment'
        ? { ok: true as const, url: draft.url.trim() }
        : validateResourceUrl(draft.url)
    if (!checked.ok) throw new Error(checked.problem)
    rows.push({
      id: draft.id ?? null,
      kind: draft.kind ?? 'link',
      // The one place a nameless resource gets a name. The database refuses
      // a row without one rather than inventing a second answer.
      name: draft.name.trim() || hostOf(checked.url),
      url: checked.url,
    })
  }

  await writeCellResources(client, cellId, rows)
  recordChange(
    'update_cell_resources',
    { cell_id: cellId },
    // The captured list, written back as it stood — by id, so the revert
    // restores the rows themselves, not look-alikes. The cell's own rows
    // only: the sync refuses a placement's ids, so the inverse names none.
    {
      fn: 'update_cell_resources',
      args: {
        cell_id: cellId,
        resources: existing
          .filter((resource) => !resource.placementId)
          .map((resource) => ({
            id: resource.id,
            kind: resource.kind,
            name: resource.name,
            url: resource.url,
          })),
      },
    },
  )
}

/** The write itself, shared by the save and by its revert. */
export async function writeCellResources(
  client: Client,
  cellId: string,
  rows: readonly ResourceRowInput[],
): Promise<void> {
  const { error } = await client.rpc('sync_cell_resources', {
    p_cell_id: cellId,
    p_rows: rows as unknown as Json,
  })
  if (error) throw toAuthoringError(error)
}
