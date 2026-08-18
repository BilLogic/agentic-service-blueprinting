import type { SupabaseClient } from '@supabase/supabase-js'
import type { CellLink } from '@/types/blueprint'
import type { Database, Json } from '@/types/database'
import { recordChange } from '@/lib/authoringSession'
import { toAuthoringError } from '@/lib/authoringErrors'
import { requireRowsWritten } from '@/lib/optimisticConcurrency'
import { validateResourceUrl } from '@/lib/resourceUrl'
import { URL_LINK_TYPE } from '@/lib/blueprintTechDescriptions'

type Client = SupabaseClient<Database>

export type CellContentUpdate = {
  /** The text in the cell on the grid. */
  content: string
  description: string
  owner: string
  perceivedOwner: string
}

/**
 * Write the cell's own text.
 *
 * These columns carry a column-level grant from the authoring migration, for
 * the same reason the spec columns do: the panel can edit what a cell *says*
 * without that opening the cell's position — path, layer, step — to the same
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
      description: update.description.trim() || null,
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

export type ResourceDraft = { label: string; url: string }

/**
 * Replace the cell's resource links.
 *
 * `links` carries more than resources — tech descriptions, pictures, Figma
 * embeds all live in the same array keyed by `type`. So this rewrites *only*
 * the `URL_LINK_TYPE` entries and leaves every other kind untouched. Writing
 * the whole array from what the resources editor knows about would silently
 * delete the tech pills.
 */
export async function updateCellResources(
  client: Client,
  cellId: string,
  existing: CellLink[],
  drafts: ResourceDraft[],
): Promise<void> {
  const rebuilt: CellLink[] = []

  for (const draft of drafts) {
    const checked = validateResourceUrl(draft.url)
    if (!checked.ok) throw new Error(checked.problem)
    rebuilt.push({
      type: URL_LINK_TYPE,
      label: draft.label.trim() || hostOf(checked.url),
      url: checked.url,
    })
  }

  const preserved = existing.filter((link) => link.type !== URL_LINK_TYPE)
  const { data, error } = await client
    .from('cells')
    .update({ links: [...preserved, ...rebuilt] as unknown as Json })
    .eq('id', cellId)
    .select('id')
  if (error) throw toAuthoringError(error)
  requireRowsWritten(data, 'cell')
  recordChange(
    'update_cell_resources',
    { cell_id: cellId },
    // Reverting means writing back the full pre-write array — URL entries as
    // they were, plus the non-URL entries this write preserved anyway.
    { fn: 'update_cell_resources', args: { cell_id: cellId, links: existing } },
  )
}

/** A link with no label still needs to say something — its host will do. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Link'
  }
}
