import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Slice } from '@/types/database'

type Client = SupabaseClient<Database>

export type SliceType = 'journey' | 'step' | 'lane' | 'cell' | 'custom'

export type DraftFrame = {
  /** Cell ids in this frame, in order. */
  cells: string[]
  caption: string
  narrative: string
}

/**
 * Slice writes. A slice REFERENCES existing cells — never copies them —
 * and `slice_items` requires `cell_keys` with the same cardinality as
 * `cell_ids` (the recovery trail). Keys are resolved from the cells' own
 * `cell_key` where one was authored, falling back to the id itself: an id
 * is a better trail than an empty slot, and the constraint demands parity.
 */
async function cellKeysFor(
  client: Client,
  cellIds: readonly string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(cellIds)]
  if (unique.length === 0) return new Map()
  const { data, error } = await client
    .from('cells')
    .select('id, cell_key')
    .in('id', unique)
  if (error) throw new Error(error.message)
  const map = new Map<string, string>()
  for (const row of data ?? []) map.set(row.id, row.cell_key ?? row.id)
  const missing = unique.filter((id) => !map.has(id))
  if (missing.length > 0)
    throw new Error(
      `These cell ids do not exist: ${missing.join(', ')} — a slice can only reference existing cells.`,
    )
  return map
}

export type NewSlice = {
  lifecycleId: string
  title: string
  description: string
  sliceType: SliceType
  actor: string
  /** Ordered cell ids; one frame per cell. */
  cellIds: readonly string[]
}

/**
 * Create a slice and its frames. `origin` is `customized` — this slice was
 * authored here, so a regeneration pipeline never overwrites it. Frames
 * default to one cell each; `replaceSliceFrames` regroups them.
 *
 * The two inserts are not one transaction (PostgREST has no multi-statement
 * write). The slice row goes first: a failure between them leaves an empty
 * slice, which is visible and deletable — the reverse order would leave
 * orphan frames pointing at nothing.
 */
export async function createSlice(
  client: Client,
  input: NewSlice,
): Promise<Slice> {
  const { data, error } = await client
    .from('slices')
    .insert({
      service_lifecycle_id: input.lifecycleId,
      title: input.title.trim(),
      description: input.description.trim() || null,
      slice_type: input.sliceType,
      actor: input.actor.trim() || null,
      origin: 'customized',
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  await replaceSliceFrames(
    client,
    data.id,
    input.cellIds.map((cellId) => ({ cells: [cellId], caption: '', narrative: '' })),
  )
  return data
}

/**
 * Replace a slice's frames wholesale. Delete-then-insert rather than a
 * per-row diff: frame identity is position, and reordering by position
 * update trips the uniqueness constraint halfway through. A slice has tens
 * of frames, not thousands.
 */
export async function replaceSliceFrames(
  client: Client,
  sliceId: string,
  frames: readonly DraftFrame[],
): Promise<void> {
  const keys = await cellKeysFor(
    client,
    frames.flatMap((frame) => frame.cells),
  )

  const { error: deleteError } = await client
    .from('slice_items')
    .delete()
    .eq('slice_id', sliceId)
  if (deleteError) throw new Error(deleteError.message)

  if (frames.length > 0) {
    const rows = frames.map((frame, position) => ({
      slice_id: sliceId,
      position,
      cell_ids: [...frame.cells],
      cell_keys: frame.cells.map((cellId) => keys.get(cellId) ?? cellId),
      caption: frame.caption.trim() || null,
      narrative: frame.narrative.trim() || null,
    }))

    const { error } = await client.from('slice_items').insert(rows)
    if (error) throw new Error(error.message)
  }
}

export type SliceMetaUpdate = {
  title: string
  description: string
  sliceType: SliceType
  actor: string
}

export type SliceMetaOutcome =
  | { status: 'ok'; row: Slice }
  | { status: 'conflict' }

/**
 * Update a slice's own fields under an optimistic-concurrency guard: the
 * update matches on the `updated_at` the caller read, and a zero-row result
 * means the slice moved (or died) since — report `conflict`, never claim a
 * write that did not land. An edit promotes `generated` to `customized` so
 * regeneration never overwrites human authorship.
 */
export async function updateSliceMeta(
  client: Client,
  sliceId: string,
  updatedAtToken: string,
  update: SliceMetaUpdate,
  currentOrigin: string,
): Promise<SliceMetaOutcome> {
  const { data, error } = await client
    .from('slices')
    .update({
      title: update.title.trim(),
      description: update.description.trim() || null,
      slice_type: update.sliceType,
      actor: update.actor.trim() || null,
      origin: currentOrigin === 'generated' ? 'customized' : currentOrigin,
      // updated_at is trigger-maintained — never set it here.
    })
    .eq('id', sliceId)
    .eq('updated_at', updatedAtToken)
    .select()
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return { status: 'conflict' }
  return { status: 'ok', row: data[0] }
}
