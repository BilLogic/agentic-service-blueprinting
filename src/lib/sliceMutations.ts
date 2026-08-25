import type { SupabaseClient } from '@supabase/supabase-js'
import { recordChange } from '@/lib/authoringSession'
import {
  asUpdatedAtToken,
  readWriteOutcome,
  type UpdatedAtToken,
} from '@/lib/optimisticConcurrency'
import { originAfterEdit, type DraftFrame, type SliceType } from '@/lib/sliceValidation'
import type { Database, Slice } from '@/types/database'

type Client = SupabaseClient<Database>

/**
 * A `slice_items` row exactly as the server stores it — what a frame revert
 * puts back. Captured verbatim rather than rebuilt from the draft shape: a
 * frame carries `illustration` and `cell_keys` that `DraftFrame` has no field
 * for, and a "restore" that silently dropped them would not be one.
 */
type SliceItemRow = Database['public']['Tables']['slice_items']['Row']

/**
 * What deleting a slice would destroy.
 *
 * A separate read from `deletion_impact`, which does not and should not know
 * about slices: that function answers "how much of the BLUEPRINT dies", and a
 * slice delete destroys none of it. Trying to squeeze a slice into its shape
 * would put a cell count in front of someone about to delete a slice, which is
 * the exact wrong number — the reassuring fact here is that the cells survive.
 *
 * A plain read: it must never reach the session ledger.
 */
export type SliceDeletionImpact = {
  label: string
  frame_count: number
  /** Distinct blueprint cells this slice points at. They are not deleted. */
  referenced_cell_count: number
}

export async function sliceDeletionImpact(
  client: Client,
  sliceId: string,
): Promise<SliceDeletionImpact> {
  const { data: slice, error: sliceError } = await client
    .from('slices')
    .select('title')
    .eq('id', sliceId)
    .single()
  if (sliceError) throw new Error(sliceError.message)

  const { data: items, error: itemsError } = await client
    .from('slice_items')
    .select('cell_ids')
    .eq('slice_id', sliceId)
  if (itemsError) throw new Error(itemsError.message)

  const cells = new Set<string>()
  for (const item of items ?? []) {
    for (const cellId of item.cell_ids ?? []) cells.add(cellId)
  }

  return {
    label: slice.title,
    frame_count: (items ?? []).length,
    referenced_cell_count: cells.size,
  }
}

/**
 * Delete a slice; slice_items cascade in the database.
 *
 * Recorded in the session ledger with **no** revert, and named in `DESTRUCTIVE`
 * so Save asks twice. There is deliberately no captured inverse: unlike a
 * scenario or path delete there is no `deleted_structure` archive for slices,
 * so nothing exists to put back. An entry with a revert control that could not
 * actually restore the frames would be worse than one without.
 *
 * `title` is passed only so the change list can name what went — it is not
 * part of the delete.
 */
export async function deleteSlice(
  client: Client,
  sliceId: string,
  title?: string,
): Promise<void> {
  const { error } = await client.from('slices').delete().eq('id', sliceId)
  if (error) throw new Error(error.message)
  recordChange('delete_slice', { slice_id: sliceId, title: title ?? null })
}

export type NewSlice = {
  serviceId: string
  title: string
  description: string
  sliceType: SliceType
  actor: string
  /** Ordered cell ids; one frame per cell unless `frames` is given. */
  cellIds: readonly string[]
  frames?: readonly DraftFrame[]
}

/**
 * Create a slice and its frames.
 *
 * `origin` is `human` — this slice was authored here, so the slice skill will
 * never regenerate over it. Frames default to one cell each: that is the
 * honest reading of a selection made by clicking cells one at a time, and
 * merging them afterwards is one click in the editor.
 *
 * The two inserts are not one transaction (PostgREST has no multi-statement
 * write). The slice row is therefore inserted first and the frames second: a
 * failure between them leaves an empty slice, which is visible and
 * deletable — the reverse order would leave orphan frames pointing at
 * nothing.
 */
export async function createSlice(
  client: Client,
  input: NewSlice,
): Promise<Slice> {
  const { data, error } = await client
    .from('slices')
    .insert({
      service_id: input.serviceId,
      title: input.title.trim(),
      description: input.description.trim() || null,
      slice_type: input.sliceType,
      actor: input.actor.trim() || null,
      origin: 'human',
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  const frames: DraftFrame[] =
    input.frames?.map((frame) => ({ ...frame })) ??
    input.cellIds.map((cellId) => ({ cells: [cellId], caption: '', narrative: '' }))

  // `record: false` — the create is ONE change in the ledger, not a create
  // followed by a frame replacement of nothing. Its inverse deletes the slice,
  // which takes the frames with it.
  await replaceSliceFrames(client, data.id, frames, { record: false })
  recordChange(
    'create_slice',
    { slice_id: data.id, title: data.title },
    { fn: 'delete_slice_row', args: { slice_id: data.id } },
  )
  return data
}

/**
 * Replace a slice's frames wholesale.
 *
 * Delete-then-insert rather than a per-row diff: frame identity is position,
 * and reordering by position update trips the uniqueness constraint halfway
 * through unless every move is staged. Replacing sidesteps the whole class of
 * problem, and a slice has tens of frames, not thousands.
 *
 * `cell_keys` is written as the cell ids themselves. Human-authored slices
 * have no IR key path to record — the slice skill fills real key paths when
 * it generates one. The column is a recovery trail, and an id is a better
 * trail than an empty array.
 *
 * **The prior rows are read before the delete and carried as the inverse.**
 * This is the most destructive write in the file — it removes every frame of
 * a slice — and it is reachable both from the editor's Save and from the
 * agent's `replace_slice_frames` tool. Without the capture there was no ledger
 * row, no revert control, and nothing counted against the destructive-save
 * gate: an agent told to "reorder the frames" could empty a slice and the
 * change sheet would show that nothing had happened.
 *
 * `record: false` is for callers that own a coarser entry — `createSlice`,
 * whose own inverse already takes the frames with it, and the revert path,
 * which must not log its own undo.
 */
export async function replaceSliceFrames(
  client: Client,
  sliceId: string,
  frames: readonly DraftFrame[],
  options?: { record?: boolean },
): Promise<void> {
  const record = options?.record !== false

  // Before the delete, or there is nothing left to capture. Ordered so the
  // restored rows go back in the order they were read, which is the order
  // `position` already encodes.
  let previous: SliceItemRow[] = []
  if (record) {
    const { data, error } = await client
      .from('slice_items')
      .select()
      .eq('slice_id', sliceId)
      .order('position', { ascending: true })
    if (error) throw new Error(error.message)
    previous = data ?? []
  }

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
      cell_keys: [...frame.cells],
      caption: frame.caption.trim() || null,
      narrative: frame.narrative.trim() || null,
    }))

    const { error } = await client.from('slice_items').insert(rows)
    if (error) throw new Error(error.message)
  }

  // After the write, like every other entry: the ledger records what landed.
  if (record) {
    recordChange(
      'replace_slice_frames',
      { slice_id: sliceId, frame_count: frames.length },
      { fn: 'restore_slice_frames', args: { slice_id: sliceId, rows: previous } },
    )
  }
}

/**
 * Copy a slice — row and frames — as "<title> copy".
 *
 * The copy is `origin: 'human'` regardless of the source's origin: the act
 * of duplicating is authorship, and a copy the slice skill could regenerate
 * over would not be the safe scratchpad duplication exists to provide.
 */
export async function duplicateSlice(
  client: Client,
  sliceId: string,
): Promise<Slice> {
  const { data: source, error: sourceError } = await client
    .from('slices')
    .select()
    .eq('id', sliceId)
    .single()
  if (sourceError) throw new Error(sourceError.message)

  const { data: items, error: itemsError } = await client
    .from('slice_items')
    .select()
    .eq('slice_id', sliceId)
    .order('position', { ascending: true })
  if (itemsError) throw new Error(itemsError.message)

  const { data: copy, error: insertError } = await client
    .from('slices')
    .insert({
      service_id: source.service_id,
      title: `${source.title} copy`,
      description: source.description,
      slice_type: source.slice_type,
      actor: source.actor,
      origin: 'human',
    })
    .select()
    .single()
  if (insertError) throw new Error(insertError.message)

  if ((items ?? []).length > 0) {
    const rows = (items ?? []).map((item) => ({
      slice_id: copy.id,
      position: item.position,
      cell_ids: item.cell_ids,
      cell_keys: item.cell_keys,
      caption: item.caption,
      narrative: item.narrative,
      illustration: item.illustration,
    }))
    const { error } = await client.from('slice_items').insert(rows)
    if (error) throw new Error(error.message)
  }

  // One entry for the whole copy, inverted by deleting the copy — the frames
  // cascade with it, so nothing of the original is at risk in the undo.
  recordChange(
    'duplicate_slice',
    { slice_id: copy.id, source_slice_id: sliceId, title: copy.title },
    { fn: 'delete_slice_row', args: { slice_id: copy.id } },
  )

  return copy
}

export type SliceMetaUpdate = {
  title: string
  description: string
  sliceType: SliceType
  actor: string
  /** Current origin; an edit promotes `generated` to `customized`. */
  origin: string
}

/**
 * Update a slice's own fields under an optimistic-concurrency guard.
 *
 * Returns `conflict` when the row moved under us — the caller refetches to
 * find out whether it was edited elsewhere or deleted outright.
 *
 * The before-state is read here rather than taken from the caller. Every call
 * site already holds the row (it had to, for the token), but a captured
 * inverse that depends on each caller remembering to pass one is an inverse
 * that will be missing somewhere — and the one field a caller would most
 * likely forget is `origin`, which this write *changes* as a side effect
 * (`generated` → `customized`) without being asked to.
 *
 * Recorded only on `ok`. A conflict wrote nothing, and the ledger's whole
 * claim is that it lists writes that landed.
 */
export async function updateSliceMeta(
  client: Client,
  sliceId: string,
  token: UpdatedAtToken,
  update: SliceMetaUpdate,
) {
  const { data: before, error: beforeError } = await client
    .from('slices')
    .select('title, description, slice_type, actor, origin')
    .eq('id', sliceId)
    .maybeSingle()
  if (beforeError) throw new Error(beforeError.message)

  const { data, error } = await client
    .from('slices')
    .update({
      title: update.title.trim(),
      description: update.description.trim() || null,
      slice_type: update.sliceType,
      actor: update.actor.trim() || null,
      origin: originAfterEdit(update.origin),
      // updated_at is trigger-maintained — never set it here.
    })
    .eq('id', sliceId)
    .eq('updated_at', token)
    .select()
  const outcome = readWriteOutcome<Slice>(data, error)

  // Recorded only when a field actually moved. The frame editor calls this on
  // every Save with the slice's current values, purely to exercise the
  // concurrency guard before it rewrites the frames — logging that would put
  // an "Edited slice" row in the list on saves where nobody edited the slice,
  // which is the ledger claiming a change that did not happen.
  //
  // `before === null` cannot coexist with `ok` (the guarded update matched a
  // row), but it is recorded rather than skipped if it ever does: an entry
  // without a revert is recoverable from, a missing entry is not.
  if (outcome.status === 'ok' && (!before || metaMoved(before, outcome.row))) {
    recordChange(
      'update_slice_meta',
      { slice_id: sliceId, title: outcome.row.title },
      before
        ? { fn: 'restore_slice_meta', args: { slice_id: sliceId, row: before } }
        : undefined,
    )
  }

  return outcome
}

/** The subset of `slices` a meta update writes — what is compared and restored. */
type SliceMetaFields = Pick<
  Slice,
  'title' | 'description' | 'slice_type' | 'actor' | 'origin'
>

/**
 * Did the update change anything?
 *
 * Compared field by field against the row the update RETURNED, not against the
 * caller's intent: `origin` is rewritten by `originAfterEdit` rather than
 * passed through, and the trimming happens in the update itself, so comparing
 * `before` to the arguments would call a no-op save a change (and vice versa).
 */
function metaMoved(before: SliceMetaFields, after: SliceMetaFields): boolean {
  return (
    before.title !== after.title ||
    before.description !== after.description ||
    before.slice_type !== after.slice_type ||
    before.actor !== after.actor ||
    before.origin !== after.origin
  )
}

/** The token a guarded update needs, taken verbatim from a loaded row. */
export function sliceToken(slice: Pick<Slice, 'updated_at'>): UpdatedAtToken {
  return asUpdatedAtToken(slice.updated_at)
}
