import type { SupabaseClient } from '@supabase/supabase-js'
import { toAuthoringError } from '@/lib/authoringErrors'
import type { ChangeEntry } from '@/lib/authoringSession'
import {
  restoreCellTouchpoints,
  updateCellContent,
  writeCellResources,
  type CellContentUpdate,
  type RemovedPlacement,
  type ResourceRowInput,
} from '@/lib/cellContentMutations'
import {
  writePlacementResources,
  type PlacementResourceRowInput,
} from '@/lib/placementResourceMutations'
import { updateCellSpec, type CellSpecUpdate } from '@/lib/cellSpecMutations'
import { updateLaneSpec, type LaneSpecUpdate } from '@/lib/laneSpecMutations'
import { updatePhaseSpec, type PhaseSpecUpdate } from '@/lib/phaseSpecMutations'
import {
  updatePathSpec,
  updateScenarioSummary,
  type PathSpecUpdate,
} from '@/lib/scenarioSpecMutations'
import {
  updateBusinessModel,
  updateServiceEntityExamples,
  updateServiceSummary,
  type BusinessModelUpdate,
  type EntityExamplesUpdate,
} from '@/lib/serviceSpecMutations'
import { updateStepSummary } from '@/lib/stepSpecMutations'
import {
  deleteStakeholder,
  updateStakeholder,
  type StakeholderInput,
} from '@/lib/stakeholderMutations'
import { deleteEvidence, restoreEvidenceRow } from '@/lib/evidenceMutations'
import { requireRowsWritten } from '@/lib/optimisticConcurrency'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>
type EvidenceRowType = Database['public']['Tables']['evidence']['Row']
type SlideRow = Database['public']['Tables']['slides']['Row']
/** The subset of `slices` that `updateSliceMeta` writes, and so restores. */
type SliceMetaFields = Pick<
  Database['public']['Tables']['slices']['Row'],
  'title' | 'summary' | 'kind' | 'actor' | 'authorship'
>

function stringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value !== 'string' || !value) {
    throw new Error(`This change's revert is missing its “${key}” value.`)
  }
  return value
}

/**
 * A captured value that is allowed to be empty.
 *
 * `stringArg` refuses `''` because an identifier never legitimately is one.
 * A one-column prose revert is the opposite case: "it had no summary before"
 * is a real prior state and the commonest one — the FIRST edit of any field
 * captures `''` as its previous value — so an empty string is the value, not
 * a missing one. Every self-inverse summary case reads its arg through here;
 * reading it through `stringArg` would make the first undo of a first summary
 * throw instead of clearing the field.
 */
function optionalStringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value !== 'string') {
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
      // Restoring the text brings back the names of any placements the
      // original save removed, but not what was written about them at this
      // moment. This puts it back, and has to run after the content write,
      // which is what re-creates the rows (#112).
      const removed = revert.args.removed_placements
      if (Array.isArray(removed) && removed.length > 0) {
        await restoreCellTouchpoints(client, cellId, removed as RemovedPlacement[])
      }
      return
    }
    case 'update_cell_spec': {
      const cellId = stringArg(revert.args, 'cell_id')
      const update = revert.args.update as CellSpecUpdate
      await updateCellSpec(client, cellId, update, undefined, { record: false })
      return
    }
    case 'update_lane_spec': {
      // Self-inverse, like update_cell_spec: the captured payload IS an
      // update. The lane ids are captured too — the fan-out has to land on
      // exactly the rows the save touched, not on whatever carries that label
      // now.
      const laneIds = revert.args.lane_ids
      if (!Array.isArray(laneIds) || laneIds.length === 0) {
        throw new Error("This change's revert is missing its lane ids.")
      }
      const update = revert.args.update as LaneSpecUpdate
      await updateLaneSpec(client, laneIds as string[], update, undefined, {
        record: false,
      })
      return
    }
    case 'update_phase_spec': {
      // Self-inverse, like update_cell_spec.
      const phaseId = stringArg(revert.args, 'phase_id')
      const update = revert.args.update as PhaseSpecUpdate
      await updatePhaseSpec(client, phaseId, update, undefined, {
        record: false,
      })
      return
    }
    case 'update_scenario_spec': {
      const scenarioId = stringArg(revert.args, 'scenario_id')
      const summary = optionalStringArg(revert.args, 'summary')
      await updateScenarioSummary(client, scenarioId, summary, undefined, {
        record: false,
      })
      return
    }
    case 'update_path_spec': {
      const pathId = stringArg(revert.args, 'path_id')
      const update = revert.args.update as PathSpecUpdate
      await updatePathSpec(client, pathId, update, undefined, {
        record: false,
      })
      return
    }
    case 'update_step_spec': {
      const stepId = stringArg(revert.args, 'step_id')
      const summary = optionalStringArg(revert.args, 'summary')
      await updateStepSummary(client, stepId, summary, undefined, {
        record: false,
      })
      return
    }
    case 'update_service_summary': {
      // Self-inverse, like update_cell_spec. Both service writes are direct
      // table updates, not RPCs — without these two cases they fall to the
      // default branch below and call a Postgres function that has never
      // existed, so every service edit would record an undo that could only
      // 404. `revertCoverageContract` is the guard that says so.
      const serviceId = stringArg(revert.args, 'service_id')
      const summary = optionalStringArg(revert.args, 'summary')
      await updateServiceSummary(client, serviceId, summary, undefined, {
        record: false,
      })
      return
    }
    case 'update_business_model': {
      const serviceId = stringArg(revert.args, 'service_id')
      const update = revert.args.update as BusinessModelUpdate
      await updateBusinessModel(client, serviceId, update, undefined, {
        record: false,
      })
      return
    }
    case 'update_service_entity_examples': {
      // Self-inverse, exactly like update_service_summary above: a direct
      // `services` update, so the previous map is handed straight back rather
      // than dispatched to an RPC that does not exist.
      const serviceId = stringArg(revert.args, 'service_id')
      const update = revert.args.update as EntityExamplesUpdate
      await updateServiceEntityExamples(client, serviceId, update, undefined, {
        record: false,
      })
      return
    }
    case 'delete_stakeholder': {
      // Undo of "added someone to the cast".
      await deleteStakeholder(client, stringArg(revert.args, 'stakeholder_id'))
      return
    }
    case 'update_stakeholder': {
      const stakeholderId = stringArg(revert.args, 'stakeholder_id')
      const update = revert.args.update as StakeholderInput
      await updateStakeholder(client, stakeholderId, update, undefined, {
        record: false,
      })
      return
    }
    case 'update_cell_resources': {
      // The captured value is the pre-write list — written back through the
      // same RPC the editor uses, so the revert lands in one transaction for
      // the reason the edit does. Verbatim rather than rebuilt through the
      // draft validator, which could refuse to restore a url it dislikes.
      // By id (#110), so the rows themselves come back, not look-alikes;
      // the RPC raises when the cell is gone.
      const cellId = stringArg(revert.args, 'cell_id')
      const resources = revert.args.resources as ResourceRowInput[]
      await writeCellResources(client, cellId, resources ?? [])
      return
    }
    case 'update_placement_resources': {
      // The same shape as update_cell_resources, for the touchpoint's list at
      // one cell: the captured rows, by id, written back as they stood. The
      // RPC raises when the placement is gone.
      const placementId = stringArg(revert.args, 'placement_id')
      const resources = revert.args.resources as PlacementResourceRowInput[]
      await writePlacementResources(client, placementId, resources ?? [])
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
    case 'restore_slides': {
      // Undo of "rebuilt a slice's slides": clear whatever is there now and
      // put the captured rows back verbatim, original ids included, so a
      // slide's identity survives the round trip. Same shape check and same
      // reasoning as `restore_evidence_row` above.
      const sliceId = stringArg(revert.args, 'slice_id')
      const rows = revert.args.rows
      if (!Array.isArray(rows)) {
        throw new Error('This change’s captured slides are malformed.')
      }
      const cleared = await client
        .from('slides')
        .delete()
        .eq('slice_id', sliceId)
      if (cleared.error) throw toAuthoringError(cleared.error)
      // An empty capture is a real answer, not a failure: the slice genuinely
      // had no slides before the write, so putting none back IS the inverse.
      if (rows.length === 0) return
      const restored = await client
        .from('slides')
        .insert(rows as SlideRow[])
      if (restored.error) throw toAuthoringError(restored.error)
      return
    }
    case 'delete_slice_row': {
      // Undo of "added a slice" / "duplicated a slice": remove the row it
      // created. Its `slides` cascade with it, which is why neither of those
      // operations needs a slide capture of its own.
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
          summary: row.summary,
          kind: row.kind,
          actor: row.actor,
          authorship: row.authorship,
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
