import type { SupabaseClient } from '@supabase/supabase-js'
import { toAuthoringError } from '@/lib/authoringErrors'
import type { ChangeEntry } from '@/lib/authoringSession'
import {
  updateCellContent,
  type CellContentUpdate,
} from '@/lib/cellContentMutations'
import { updateCellSpec, type CellSpecUpdate } from '@/lib/cellSpecMutations'
import { deleteEvidence, restoreEvidenceRow } from '@/lib/evidenceMutations'
import { requireRowsWritten } from '@/lib/optimisticConcurrency'
import type { CellLink } from '@/types/blueprint'
import type { Database, Json } from '@/types/database'

type Client = SupabaseClient<Database>
type EvidenceRowType = Database['public']['Tables']['evidence']['Row']
type SliceItemRow = Database['public']['Tables']['slice_items']['Row']
/** The subset of `slices` that `updateSliceMeta` writes, and so restores. */
type SliceMetaFields = Pick<
  Database['public']['Tables']['slices']['Row'],
  'title' | 'description' | 'slice_type' | 'actor' | 'origin'
>

function stringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value !== 'string' || !value) {
    throw new Error(`This change's revert is missing its “${key}” value.`)
  }
  return value
}

/**
 * Execute a change's captured inverse.
 *
 * The revert's own writes pass `record: false` (or go straight to the
 * database) so undoing "Added a lane" never appends "Deleted a lane" to the
 * very list the row was just removed from. That decision travels *with each
 * call* rather than through a module-level suspend flag — an ambient flag
 * around an `await` also swallowed any ordinary save that happened to
 * resolve while a revert was in flight.
 *
 * The caller removes the entry (`forgetChange`) and re-reads the grid —
 * every revert is structural or content-bearing, and pessimistic re-read is
 * the house rule for both.
 */
export async function executeRevert(
  client: Client,
  entry: ChangeEntry,
): Promise<void> {
  const revert = entry.revert
  if (!revert) {
    throw new Error('This change has nothing recorded to revert it with.')
  }

  switch (revert.fn) {
    case 'update_cell_content': {
      const cellId = stringArg(revert.args, 'cell_id')
      const update = revert.args.update as CellContentUpdate
      await updateCellContent(client, cellId, update, undefined, {
        record: false,
      })
      return
    }
    case 'update_cell_spec': {
      const cellId = stringArg(revert.args, 'cell_id')
      const update = revert.args.update as CellSpecUpdate
      await updateCellSpec(client, cellId, update, undefined, { record: false })
      return
    }
    case 'update_cell_resources': {
      // The captured value is the full pre-write links array — write it
      // back verbatim rather than rebuilding through the draft validator,
      // which could refuse to restore a link it considers malformed.
      const cellId = stringArg(revert.args, 'cell_id')
      const links = revert.args.links as CellLink[]
      const { data, error } = await client
        .from('cells')
        .update({ links: links as unknown as Json })
        .eq('id', cellId)
        .select('id')
      if (error) throw toAuthoringError(error)
      // Zero rows is a real answer: the cell was deleted after this edit.
      if (!data || data.length === 0) {
        throw new Error('That cell no longer exists — nothing to revert onto.')
      }
      return
    }
    case 'delete_evidence': {
      // Undo of "added a source": remove the row it created.
      const evidenceId = stringArg(revert.args, 'evidence_id')
      await deleteEvidence(client, evidenceId, undefined, { record: false })
      return
    }
    case 'restore_evidence_row': {
      // Undo of "deleted a source": reinsert the captured row verbatim,
      // original id included, so references to it come back intact. The
      // ledger is in-memory today, but the shape check costs nothing and
      // pins the contract if persistence ever lands.
      const row = revert.args.row as EvidenceRowType
      if (
        !row ||
        typeof row !== 'object' ||
        typeof row.id !== 'string' ||
        typeof row.title !== 'string'
      ) {
        throw new Error('This change’s captured evidence row is malformed.')
      }
      await restoreEvidenceRow(client, row)
      return
    }
    case 'restore_slice_frames': {
      // Undo of "rebuilt a slice's frames": clear whatever is there now and
      // put the captured rows back verbatim, original ids included, so a
      // frame's identity survives the round trip. Same shape check and same
      // reasoning as `restore_evidence_row` above.
      const sliceId = stringArg(revert.args, 'slice_id')
      const rows = revert.args.rows
      if (!Array.isArray(rows)) {
        throw new Error('This change’s captured frames are malformed.')
      }
      const cleared = await client
        .from('slice_items')
        .delete()
        .eq('slice_id', sliceId)
      if (cleared.error) throw toAuthoringError(cleared.error)
      // An empty capture is a real answer, not a failure: the slice genuinely
      // had no frames before the write, so putting none back IS the inverse.
      if (rows.length === 0) return
      const restored = await client
        .from('slice_items')
        .insert(rows as SliceItemRow[])
      if (restored.error) throw toAuthoringError(restored.error)
      return
    }
    case 'delete_slice_row': {
      // Undo of "added a slice" / "duplicated a slice": remove the row it
      // created. `slice_items` cascade, so the frames go with it — which is
      // why neither of those operations needs a frame capture of its own.
      //
      // A direct delete rather than `deleteSlice`: that wrapper records a
      // `delete_slice` entry, and undoing "Added a slice" must not append
      // "Deleted a slice" to the list the row was just removed from.
      const sliceId = stringArg(revert.args, 'slice_id')
      const { data, error } = await client
        .from('slices')
        .delete()
        .eq('id', sliceId)
        .select('id')
      if (error) throw toAuthoringError(error)
      requireRowsWritten(data, 'slice')
      return
    }
    case 'restore_slice_meta': {
      // Undo of a slice field edit. Writes `origin` back too: the forward
      // write promotes `generated` to `customized` as a side effect, and an
      // inverse that left the promotion standing would mark a slice as
      // hand-edited when the edit has been taken back.
      const sliceId = stringArg(revert.args, 'slice_id')
      const row = revert.args.row as SliceMetaFields | undefined
      if (!row || typeof row !== 'object' || typeof row.title !== 'string') {
        throw new Error('This change’s captured slice fields are malformed.')
      }
      const { data, error } = await client
        .from('slices')
        .update({
          title: row.title,
          description: row.description,
          slice_type: row.slice_type,
          actor: row.actor,
          origin: row.origin,
        })
        .eq('id', sliceId)
        .select('id')
      if (error) throw toAuthoringError(error)
      requireRowsWritten(data, 'slice')
      return
    }
    case 'rename_owner_tag_scoped': {
      // Tag rename, inverted with precision: only the cells the rename
      // actually touched get the old name back. A name-based inverse would
      // also rewrite cells that legitimately adopted the new name since.
      const from = stringArg(revert.args, 'from')
      const to = stringArg(revert.args, 'to')
      const ids = revert.args.cell_ids
      if (!Array.isArray(ids) || ids.length === 0) return
      const ownerUpdate = await client
        .from('cells')
        .update({ owner: to })
        .eq('owner', from)
        .in('id', ids as string[])
      if (ownerUpdate.error) throw toAuthoringError(ownerUpdate.error)
      const perceivedUpdate = await client
        .from('cells')
        .update({ perceived_owner: to })
        .eq('perceived_owner', from)
        .in('id', ids as string[])
      if (perceivedUpdate.error) throw toAuthoringError(perceivedUpdate.error)
      return
    }
    default: {
      // Authoring RPCs called directly never pass through `call()`, so
      // nothing here is recorded — same effect as record:false above.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same seam as authoringRpc.call()
      const { error } = await (client.rpc as any)(revert.fn, revert.args)
      if (error) throw toAuthoringError(error)
    }
  }
}
