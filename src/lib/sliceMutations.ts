import type { SupabaseClient } from '@supabase/supabase-js'
import { recordChange } from '@/lib/authoringSession'
import {
  asUpdatedAtToken,
  readWriteOutcome,
  type UpdatedAtToken,
} from '@/lib/optimisticConcurrency'
import { authorshipAfterEdit, type DraftSlide, type SliceKind } from '@/lib/sliceValidation'
import type { Database, Slice } from '@/types/database'

type Client = SupabaseClient<Database>

/**
 * A `slides` row exactly as the server stores it — what a slide revert
 * puts back. Captured verbatim rather than rebuilt from the draft shape: a
 * slide carries `illustration` and `cell_keys` that `DraftSlide` has no field
 * for, and a "restore" that silently dropped them would not be one.
 */
type SlideRow = Database['public']['Tables']['slides']['Row']

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
  slide_count: number
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
    .from('slides')
    .select('cell_ids')
    .eq('slice_id', sliceId)
  if (itemsError) throw new Error(itemsError.message)

  const cells = new Set<string>()
  for (const item of items ?? []) {
    for (const cellId of item.cell_ids ?? []) cells.add(cellId)
  }

  return {
    label: slice.title,
    slide_count: (items ?? []).length,
    referenced_cell_count: cells.size,
  }
}

/**
 * Delete a slice; slides cascade in the database.
 *
 * Recorded in the session ledger with **no** revert, and named in `DESTRUCTIVE`
 * so Save asks twice. There is deliberately no captured inverse: unlike a
 * scenario or path delete there is no `deleted_structure` archive for slices,
 * so nothing exists to put back. An entry with a revert control that could not
 * actually restore the slides would be worse than one without.
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
  summary: string
  sliceKind: SliceKind
  actor: string
  /** Ordered cell ids; one slide per cell unless `slides` is given. */
  cellIds: readonly string[]
  slides?: readonly DraftSlide[]
}

/**
 * Create a slice and its slides.
 *
 * `origin` is `human` — this slice was authored here, so the slice skill will
 * never regenerate over it. Slides default to one cell each: that is the
 * honest reading of a selection made by clicking cells one at a time, and
 * merging them afterwards is one click in the editor.
 *
 * The two inserts are not one transaction (PostgREST has no multi-statement
 * write). The slice row is therefore inserted first and the slides second: a
 * failure between them leaves an empty slice, which is visible and
 * deletable — the reverse order would leave orphan slides pointing at
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
      summary: input.summary.trim() || null,
      kind: input.sliceKind,
      actor: input.actor.trim() || null,
      authorship: 'human',
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  const slides: DraftSlide[] =
    input.slides?.map((slide) => ({ ...slide })) ??
    input.cellIds.map((cellId) => ({ cells: [cellId], title: '', narrative: '' }))

  // `record: false` — the create is ONE change in the ledger, not a create
  // followed by a slide replacement of nothing. Its inverse deletes the slice,
  // which takes the slides with it.
  await replaceSlides(client, data.id, slides, { record: false })
  recordChange(
    'create_slice',
    { slice_id: data.id, title: data.title },
    { fn: 'delete_slice_row', args: { slice_id: data.id } },
  )
  return data
}

/**
 * Replace a slice's slides wholesale.
 *
 * Delete-then-insert rather than a per-row diff: slide identity is position,
 * and reordering by position update trips the uniqueness constraint halfway
 * through unless every move is staged. Replacing sidesteps the whole class of
 * problem, and a slice has tens of slides, not thousands.
 *
 * `cell_keys` is written as the cell ids themselves. Human-authored slices
 * have no IR key path to record — the slice skill fills real key paths when
 * it generates one. The column is a recovery trail, and an id is a better
 * trail than an empty array.
 *
 * **The prior rows are read before the delete and carried as the inverse.**
 * This is the most destructive write in the file — it removes every slide of
 * a slice — and it is reachable both from the editor's Save and from the
 * agent's `replace_slides` tool. Without the capture there was no ledger
 * row, no revert control, and nothing counted against the destructive-save
 * gate: an agent told to "reorder the slides" could empty a slice and the
 * change sheet would show that nothing had happened.
 *
 * `record: false` is for callers that own a coarser entry — `createSlice`,
 * whose own inverse already takes the slides with it, and the revert path,
 * which must not log its own undo.
 */
export async function replaceSlides(
  client: Client,
  sliceId: string,
  slides: readonly DraftSlide[],
  options?: { record?: boolean },
): Promise<void> {
  const record = options?.record !== false

  // Before the delete, or there is nothing left to capture. Ordered so the
  // restored rows go back in the order they were read, which is the order
  // `position` already encodes.
  let previous: SlideRow[] = []
  if (record) {
    const { data, error } = await client
      .from('slides')
      .select()
      .eq('slice_id', sliceId)
      .order('position', { ascending: true })
    if (error) throw new Error(error.message)
    previous = data ?? []
  }

  const { error: deleteError } = await client
    .from('slides')
    .delete()
    .eq('slice_id', sliceId)
  if (deleteError) throw new Error(deleteError.message)

  if (slides.length > 0) {
    const rows = slides.map((slide, position) => ({
      slice_id: sliceId,
      position,
      cell_ids: [...slide.cells],
      cell_keys: [...slide.cells],
      title: slide.title.trim() || null,
      narrative: slide.narrative.trim() || null,
    }))

    const { error } = await client.from('slides').insert(rows)
    if (error) throw new Error(error.message)
  }

  // After the write, like every other entry: the ledger records what landed.
  if (record) {
    recordChange(
      'replace_slides',
      { slice_id: sliceId, slide_count: slides.length },
      { fn: 'restore_slides', args: { slice_id: sliceId, rows: previous } },
    )
  }
}

/**
 * Copy a slice — row and slides — as "<title> copy".
 *
 * The copy is `authorship: 'human'` regardless of the source's authorship: the act
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
    .from('slides')
    .select()
    .eq('slice_id', sliceId)
    .order('position', { ascending: true })
  if (itemsError) throw new Error(itemsError.message)

  const { data: copy, error: insertError } = await client
    .from('slices')
    .insert({
      service_id: source.service_id,
      title: `${source.title} copy`,
      summary: source.summary,
      kind: source.kind,
      actor: source.actor,
      authorship: 'human',
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
      title: item.title,
      narrative: item.narrative,
      illustration: item.illustration,
    }))
    const { error } = await client.from('slides').insert(rows)
    if (error) throw new Error(error.message)
  }

  // One entry for the whole copy, inverted by deleting the copy — the slides
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
  summary: string
  sliceKind: SliceKind
  actor: string
  /** Current origin; an edit promotes `generated` to `customized`. */
  authorship: string
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
    .select('title, summary, kind, actor, authorship')
    .eq('id', sliceId)
    .maybeSingle()
  if (beforeError) throw new Error(beforeError.message)

  const { data, error } = await client
    .from('slices')
    .update({
      title: update.title.trim(),
      summary: update.summary.trim() || null,
      kind: update.sliceKind,
      actor: update.actor.trim() || null,
      authorship: authorshipAfterEdit(update.authorship),
      // updated_at is trigger-maintained — never set it here.
    })
    .eq('id', sliceId)
    .eq('updated_at', token)
    .select()
  const outcome = readWriteOutcome<Slice>(data, error)

  // Recorded only when a field actually moved. The slide editor calls this on
  // every Save with the slice's current values, purely to exercise the
  // concurrency guard before it rewrites the slides — logging that would put
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
  'title' | 'summary' | 'kind' | 'actor' | 'authorship'
>

/**
 * Did the update change anything?
 *
 * Compared field by field against the row the update RETURNED, not against the
 * caller's intent: `origin` is rewritten by `authorshipAfterEdit` rather than
 * passed through, and the trimming happens in the update itself, so comparing
 * `before` to the arguments would call a no-op save a change (and vice versa).
 */
function metaMoved(before: SliceMetaFields, after: SliceMetaFields): boolean {
  return (
    before.title !== after.title ||
    before.summary !== after.summary ||
    before.kind !== after.kind ||
    before.actor !== after.actor ||
    before.authorship !== after.authorship
  )
}

/** The token a guarded update needs, taken verbatim from a loaded row. */
export function sliceToken(slice: Pick<Slice, 'updated_at'>): UpdatedAtToken {
  return asUpdatedAtToken(slice.updated_at)
}
