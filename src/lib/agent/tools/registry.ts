import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  addLane,
  addStep,
  createPath,
  createPhase,
  createScenario,
  duplicatePath,
  duplicateScenario,
  renamePath,
  setCellDependency,
  upsertCell,
} from '@/lib/authoringRpc'
import {
  createSlice,
  replaceSliceFrames,
  updateSliceMeta,
} from '@/lib/sliceMutations'
import type { SliceType } from '@/lib/sliceValidation'
import { asUpdatedAtToken } from '@/lib/optimisticConcurrency'
import { setSharedCanvasMode } from '@/contexts/canvasModeContext'
import {
  agentUiCommandMutates,
  listAgentUiCommands,
  runAgentUiCommand,
} from '@/lib/agent/uiCommands'
import {
  describeChange,
  sessionSnapshot,
  setAgentAttribution,
} from '@/lib/authoringSession'
import {
  updateCellContent,
  type CellContentUpdate,
} from '@/lib/cellContentMutations'
import { updateCellSpec } from '@/lib/cellSpecMutations'
import { getCellContentLengthGuidance } from '@/lib/cellContentLimits'
import { findingFingerprint } from '@/lib/findingFingerprint'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import {
  agentAnnotateCells,
  agentFocusCell,
  agentOpenCellPanel,
  agentOpenPhase,
  agentOpenScenario,
  agentSetSidebar,
  collectAgentUiContext,
} from '@/lib/agent/uiBridge'
import type { DeletableKind } from '@/lib/deletionSafety'
import {
  getBlueprint,
  getCell,
  getCompareDiff,
  getDeletionImpact,
  listOwnerTags,
  listScenarios,
  listSlices,
  readReference,
} from '@/lib/agent/tools/read'
import {
  sampleGetBlueprint,
  sampleGetCell,
  sampleGetCompareDiff,
  sampleGetSlice,
  sampleListOwnerTags,
  sampleListScenarios,
  sampleListSlices,
} from '@/lib/agent/tools/sampleRead'
import { SAMPLE_TRIAL_TOOL_NAMES } from '@/lib/agent/tools/specs'

type Client = SupabaseClient<Database>

// Tool specs and rosters live in `specs.ts` (imported directly by their
// consumers — one canonical path); this module owns only dispatch.

// One lifecycle per deployment today; cached after the first ask.
let cachedLifecycleId: string | null = null
async function lifecycleId(client: Client): Promise<string> {
  if (cachedLifecycleId) return cachedLifecycleId
  const { data, error } = await client
    .from('service_lifecycles')
    .select('id')
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('No service lifecycle exists yet.')
  cachedLifecycleId = data.id
  return data.id
}

function s(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function need(args: Record<string, unknown>, key: string): string {
  const value = s(args, key)
  if (!value) throw new Error(`Missing required argument "${key}".`)
  return value
}

/**
 * Execute one tool call. Returns the text the model sees. Writes are
 * attributed to the agent session for the ledger's ✦ badge, and the query
 * cache is invalidated so the canvas repaints live.
 */
export async function dispatchTool(
  client: Client | null,
  agentSessionId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  // No-database trial: the read tools answer from the bundled sample, and
  // the roster the panel registered contains nothing else. A call from
  // outside it can only be a model inventing a name — say so plainly.
  if (client === null) return dispatchSampleTool(name, args)
  switch (name) {
    case 'read_reference':
      return readReference(need(args, 'name'))
    case 'list_scenarios':
      return listScenarios(client)
    case 'get_blueprint':
      return getBlueprint(client, need(args, 'scenario_id'))
    case 'get_compare_diff': {
      const pathIds = Array.isArray(args.path_ids)
        ? args.path_ids.filter(
            (value): value is string => typeof value === 'string',
          )
        : undefined
      return getCompareDiff(client, need(args, 'scenario_id'), pathIds)
    }
    case 'get_cell':
      return getCell(client, need(args, 'cell_id'))
    case 'get_deletion_impact': {
      const kind = s(args, 'kind')
      // Validated against the UI's vocabulary, not the RPC's: `lane` and
      // `step` are answerable server-side but their counts do not match what
      // their delete removes, so quoting them would put a wrong number in
      // front of a human about to delete. See `deletionSafety.ts`.
      if (kind !== 'scenario' && kind !== 'path' && kind !== 'slice') {
        throw new Error(
          'kind must be scenario, path, or slice — lane and step impacts do not match their deletes and are not offered.',
        )
      }
      return getDeletionImpact(client, kind as DeletableKind, need(args, 'target_id'))
    }
    case 'list_slices':
      return listSlices(client)
    case 'list_owner_tags':
      return listOwnerTags(client)
    case 'get_ui_state': {
      const context = collectAgentUiContext()
      return context || 'No UI state is being reported right now.'
    }
    case 'get_change_history': {
      const limit =
        typeof args.limit === 'number' && args.limit > 0 ? args.limit : 30
      const entries = [...sessionSnapshot()].reverse().slice(0, limit)
      if (entries.length === 0)
        return 'No changes recorded in this browser session yet.'
      return entries
        .map((entry) => {
          const who =
            entry.author === 'agent'
              ? `agent${entry.agentSessionId === agentSessionId ? ' (this session)' : ''}`
              : 'user'
          const when = new Date(entry.at).toISOString().slice(11, 19)
          return `[${when} UTC] ${who}: ${describeChange(entry)}${entry.revert ? '' : ' (not revertible)'}`
        })
        .join('\n')
    }
    case 'get_slice': {
      const sliceId = need(args, 'slice_id')
      const { data, error } = await client
        .from('slices')
        .select('id, title, description, slice_type, actor, origin, slice_items(id, position, caption, narrative, cell_ids)')
        .eq('id', sliceId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) throw new Error(`No slice with id ${sliceId}.`)
      const frames = [...(data.slice_items ?? [])]
        .sort((a, b) => a.position - b.position)
        .map(
          (frame, index) =>
            `frame ${index + 1}: cells [${(frame.cell_ids ?? []).join(', ')}]${frame.caption ? ` caption "${frame.caption}"` : ''}${frame.narrative ? ` narrative "${frame.narrative}"` : ''}`,
        )
      return `slice "${data.title}" (${data.id}) type=${data.slice_type}${data.actor ? ` actor=${data.actor}` : ''}\n${frames.join('\n') || '(no frames)'}`
    }
    case 'list_findings': {
      const filter = s(args, 'status') ?? 'open'
      let query = client
        .from('findings')
        .select('id, source, check_name, severity, note, status, cell_ids, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      if (filter !== 'all')
        query = query.eq('status', filter)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      if (!data || data.length === 0)
        return filter === 'all'
          ? 'No findings recorded yet.'
          : `No ${filter} findings.`
      return data
        .map(
          (row) =>
            `${row.id} [${row.severity}] ${row.check_name} (${row.source}, ${row.status}, ${row.created_at.slice(0, 10)}) cells:${(row.cell_ids ?? []).length}${row.note ? ` — ${row.note}` : ''}`,
        )
        .join('\n')
    }
    // UI control + navigation: drives the interface, changes no data — no
    // attribution, no ledger entry. Same gestures the human has.
    case 'open_phase':
      return agentOpenPhase(need(args, 'phase_id'))
    case 'open_scenario':
      return agentOpenScenario(need(args, 'scenario_id'))
    case 'focus_cell':
      return agentFocusCell(need(args, 'cell_id'))
    case 'list_ui_commands':
      return listAgentUiCommands()
    case 'ui_command': {
      const command = need(args, 'command')
      // A command the registry marks `[changes data]` runs under the same
      // attribution as a write tool. Two reasons, both discovered by the
      // scoped revert: it is how `revert_my_changes` knows which entries are
      // its own, and a mutating command that repainted nothing left the canvas
      // showing state the database no longer had. The non-mutating majority
      // stays outside, where an interface command belongs.
      if (!agentUiCommandMutates(command)) {
        return await runAgentUiCommand(command, s(args, 'arg'))
      }
      setAgentAttribution(agentSessionId)
      try {
        return await runAgentUiCommand(command, s(args, 'arg'))
      } finally {
        setAgentAttribution(null)
        invalidateQueries('')
      }
    }
    case 'open_cell_panel':
      return agentOpenCellPanel(need(args, 'cell_id'))
    case 'set_canvas_mode': {
      const mode = args.mode === 'design' ? 'design' : 'view'
      setSharedCanvasMode(mode)
      return `Canvas mode is now ${mode}.`
    }
    case 'set_sidebar':
      return agentSetSidebar(args.collapsed === true)
    case 'annotate_cells': {
      const ids = Array.isArray(args.cell_ids)
        ? args.cell_ids.filter((value): value is string => typeof value === 'string')
        : []
      if (ids.length === 0) throw new Error('cell_ids must be a non-empty array.')
      return agentAnnotateCells(ids, s(args, 'note'))
    }
  }

  // Everything below writes.
  setAgentAttribution(agentSessionId)
  try {
    switch (name) {
      case 'add_step': {
        const at = typeof args.at_position === 'number' ? args.at_position : undefined
        const id = await addStep(client, {
          pathId: need(args, 'path_id'),
          name: need(args, 'name'),
          atPosition: at,
        })
        return `Added step (${id}).`
      }
      case 'add_lane': {
        await addLane(client, {
          scenarioId: need(args, 'scenario_id'),
          name: need(args, 'name'),
          layerRole: s(args, 'layer_role') ?? null,
          atRow: typeof args.at_row === 'number' ? args.at_row : undefined,
        })
        return 'Added lane to every path of the scenario. Re-read the blueprint for the new lane ids.'
      }
      case 'upsert_cell': {
        const layerId = need(args, 'layer_id')
        const stepId = need(args, 'step_id')
        // Occupancy guard: the RPC upserts, so a second call on the same
        // slot would silently OVERWRITE the cell — and the recorded revert
        // for a "create" is a delete, so a human undoing the agent's edit
        // would destroy a pre-existing cell. Creation tool means creation
        // only; edits go through update_cell_content.
        const { data: occupied, error: occupiedError } = await client
          .from('cells')
          .select('id')
          .eq('layer_id', layerId)
          .eq('step_id', stepId)
          .or('slot_position.is.null,slot_position.eq.0')
          .limit(1)
        if (occupiedError) throw new Error(occupiedError.message)
        if (occupied && occupied.length > 0)
          throw new Error(
            `A cell already exists at that slot (${occupied[0].id}) — upsert_cell only creates. Use update_cell_content to edit the existing cell.`,
          )
        const newContent = need(args, 'content')
        const lengthGuidance = getCellContentLengthGuidance(newContent)
        const id = await upsertCell(client, {
          pathId: need(args, 'path_id'),
          layerId,
          stepId,
          content: newContent,
        })
        return `Created cell (${id}).${lengthGuidance.message ? ` ${lengthGuidance.message}` : ''}`
      }
      case 'update_cell_content': {
        const cellId = need(args, 'cell_id')
        const nextContent = s(args, 'content')
        const lengthGuidance =
          nextContent === undefined
            ? null
            : getCellContentLengthGuidance(nextContent)
        const { data, error } = await client
          .from('cells')
          .select('content, description, owner, perceived_owner')
          .eq('id', cellId)
          .maybeSingle()
        if (error) throw new Error(error.message)
        if (!data) throw new Error(`No cell with id ${cellId}.`)
        const previous: CellContentUpdate = {
          content: data.content ?? '',
          description: data.description ?? '',
          owner: data.owner ?? '',
          perceivedOwner: data.perceived_owner ?? '',
        }
        await updateCellContent(
          client,
          cellId,
          {
            content: s(args, 'content') ?? previous.content,
            description: s(args, 'summary') ?? previous.description,
            owner: s(args, 'owner') ?? previous.owner,
            perceivedOwner: s(args, 'perceived_owner') ?? previous.perceivedOwner,
          },
          previous,
        )
        return `Cell updated.${lengthGuidance?.message ? ` ${lengthGuidance.message}` : ''}`
      }
      case 'update_cell_spec': {
        const cellId = need(args, 'cell_id')
        const { data, error } = await client
          .from('cells')
          .select('function, form, value_props')
          .eq('id', cellId)
          .maybeSingle()
        if (error) throw new Error(error.message)
        if (!data) throw new Error(`No cell with id ${cellId}.`)
        const prevProps = Array.isArray(data.value_props)
          ? (data.value_props as Array<{ for?: string; value?: string }>).map(
              (entry) => ({ for: entry.for ?? '', value: entry.value ?? '' }),
            )
          : []
        const previous = {
          function: data.function ?? '',
          form: data.form ?? '',
          valueProps: prevProps,
        }
        const nextProps = Array.isArray(args.value_props)
          ? (args.value_props as Array<{ for?: string; value?: string }>).map(
              (entry) => ({ for: entry.for ?? '', value: entry.value ?? '' }),
            )
          : previous.valueProps
        await updateCellSpec(
          client,
          cellId,
          {
            function: s(args, 'function') ?? previous.function,
            form: s(args, 'form') ?? previous.form,
            valueProps: nextProps,
          },
          previous,
        )
        return 'Cell spec updated.'
      }
      case 'set_cell_dependency': {
        const kind = args.kind === 'needs' ? 'needs' : 'trigger'
        const id = await setCellDependency(client, {
          sourceCellId: need(args, 'source_cell_id'),
          targetCellId: need(args, 'target_cell_id'),
          kind,
          label: s(args, 'label') ?? null,
        })
        return `Dependency set (${id}).`
      }
      case 'rename_path': {
        await renamePath(client, {
          pathId: need(args, 'path_id'),
          name: need(args, 'name'),
        })
        return 'Path renamed.'
      }
      case 'create_phase': {
        const id = await createPhase(client, {
          lifecycleId: await lifecycleId(client),
          name: need(args, 'name'),
          description: s(args, 'description') ?? null,
        })
        return `Created phase (${id}).`
      }
      case 'create_scenario': {
        const created = await createScenario(client, {
          phaseId: need(args, 'phase_id'),
          name: need(args, 'name'),
          pathName: s(args, 'path_name'),
          stepCount:
            typeof args.step_count === 'number' ? args.step_count : undefined,
          laneSourcePathId: s(args, 'lane_source_path_id') ?? null,
        })
        return `Created scenario. ${JSON.stringify(created)} — re-read the blueprint for its steps and lanes.`
      }
      case 'create_path': {
        const id = await createPath(client, {
          scenarioId: need(args, 'scenario_id'),
          name: need(args, 'name'),
          pathType: s(args, 'path_type'),
          laneSourcePathId: s(args, 'lane_source_path_id') ?? null,
        })
        return `Created path (${id}).`
      }
      case 'duplicate_path': {
        const id = await duplicatePath(client, {
          sourcePathId: need(args, 'source_path_id'),
          name: need(args, 'name'),
          pathType: s(args, 'path_type'),
          copyCells: args.copy_cells !== false,
        })
        return `Duplicated path (${id}).`
      }
      case 'duplicate_scenario': {
        const id = await duplicateScenario(client, {
          sourceScenarioId: need(args, 'source_scenario_id'),
          name: need(args, 'name'),
        })
        return `Duplicated the blueprint (${id}). Re-read it for the copy's own path, lane, step and cell ids — none of them are the source's, and the copied cells have no cell_key.`
      }
      case 'create_slice': {
        const cellIds = Array.isArray(args.cell_ids)
          ? args.cell_ids.filter(
              (value): value is string => typeof value === 'string',
            )
          : []
        if (cellIds.length === 0)
          throw new Error('cell_ids must be a non-empty array of existing cell ids.')
        const slice = await createSlice(client, {
          lifecycleId: await lifecycleId(client),
          title: need(args, 'title'),
          description: s(args, 'description') ?? '',
          sliceType: need(args, 'slice_type') as SliceType,
          actor: s(args, 'actor') ?? '',
          cellIds,
        })
        return `Created slice "${slice.title}" (${slice.id}) with one frame per cell — replace_slice_frames regroups them.`
      }
      case 'update_slice': {
        const sliceId = need(args, 'slice_id')
        const { data, error } = await client
          .from('slices')
          .select('title, description, slice_type, actor, origin, updated_at')
          .eq('id', sliceId)
          .maybeSingle()
        if (error) throw new Error(error.message)
        if (!data) throw new Error(`No slice with id ${sliceId}.`)
        const outcome = await updateSliceMeta(client, sliceId, asUpdatedAtToken(data.updated_at), {
          title: s(args, 'title') ?? data.title,
          description: s(args, 'description') ?? data.description ?? '',
          sliceType: (s(args, 'slice_type') ?? data.slice_type) as SliceType,
          actor: s(args, 'actor') ?? data.actor ?? '',
          origin: data.origin,
        })
        if (outcome.status === 'conflict')
          throw new Error('The slice changed since you read it — re-read and retry.')
        return 'Slice updated.'
      }
      case 'replace_slice_frames': {
        const sliceId = need(args, 'slice_id')
        const rawFrames = Array.isArray(args.frames) ? args.frames : []
        if (rawFrames.length === 0)
          throw new Error('frames must be a non-empty array.')
        const frames = (rawFrames as Array<Record<string, unknown>>).map(
          (frame) => ({
            cells: Array.isArray(frame.cells)
              ? frame.cells.filter(
                  (value): value is string => typeof value === 'string',
                )
              : [],
            caption: typeof frame.caption === 'string' ? frame.caption : '',
            narrative:
              typeof frame.narrative === 'string' ? frame.narrative : '',
          }),
        )
        await replaceSliceFrames(client, sliceId, frames)
        return `Replaced the slice's frames (${frames.length}).`
      }
      case 'record_finding': {
        const source = args.source === 'whatif' ? 'whatif' : 'audit'
        const checkName = need(args, 'check_name')
        const severityArg = s(args, 'severity')
        if (severityArg !== 'info' && severityArg !== 'warn' && severityArg !== 'critical')
          throw new Error('severity must be info, warn, or critical.')
        const note = need(args, 'note')
        const cellIds = Array.isArray(args.cell_ids)
          ? args.cell_ids.filter(
              (value): value is string => typeof value === 'string',
            )
          : []
        const scope = s(args, 'scope')
        if (cellIds.length === 0 && !scope)
          throw new Error('A zero-cell finding needs a scope (e.g. "scenario:Intake Call").')
        const runId = s(args, 'run_id') ?? crypto.randomUUID()
        const fingerprint = await findingFingerprint(checkName, cellIds, scope)
        const lifecycle = await lifecycleId(client)
        const { data: existing, error: readError } = await client
          .from('findings')
          .select('id, status')
          .eq('service_lifecycle_id', lifecycle)
          .eq('fingerprint', fingerprint)
          .order('updated_at', { ascending: false })
        if (readError) throw new Error(readError.message)
        const open = existing?.find((row) => row.status === 'open')
        const dismissed = existing?.find((row) => row.status === 'dismissed')
        if (open) {
          const { error } = await client
            .from('findings')
            .update({ severity: severityArg, note, run_id: runId, cell_ids: cellIds, cell_keys: cellIds, source })
            .eq('id', open.id)
          if (error) throw new Error(error.message)
          return `An open finding already had this fingerprint — updated it in place (dedupe). run_id ${runId}; reuse it for the rest of this run.`
        }
        if (dismissed)
          return `A finding with this fingerprint was dismissed by a human — dismissed stays dismissed. Nothing recorded. run_id ${runId}; reuse it for the rest of this run.`
        const { error: insertError } = await client.from('findings').insert({
          service_lifecycle_id: lifecycle,
          run_id: runId,
          source,
          check_name: checkName,
          severity: severityArg,
          note,
          cell_ids: cellIds,
          cell_keys: cellIds,
          fingerprint,
        })
        if (insertError) throw new Error(insertError.message)
        const reopened = existing && existing.length > 0
        return `Recorded ${severityArg} finding for ${checkName}${reopened ? ' (a resolved twin existed — this reopens the issue)' : ''}. run_id ${runId}; reuse it for the rest of this run.`
      }
      case 'set_finding_status': {
        const status = s(args, 'status')
        if (status !== 'open' && status !== 'resolved' && status !== 'dismissed')
          throw new Error('status must be open, resolved, or dismissed.')
        const findingId = need(args, 'finding_id')
        const { data, error } = await client
          .from('findings')
          .update({ status })
          .eq('id', findingId)
          .select('id')
        if (error) throw new Error(error.message)
        if (!data || data.length === 0)
          throw new Error(`No finding with id ${findingId}.`)
        return `Finding is now ${status}.`
      }
      default:
        return `Tool "${name}" is not on the allow-list. Available tools are fixed; deletes do not exist here — removal is human-only.`
    }
  } finally {
    setAgentAttribution(null)
    // The canvas reads through the shared query cache; empty prefix
    // matches every key, so the grids refetch and repaint after a write.
    invalidateQueries('')
  }
}

/**
 * Trial dispatch — sample data in, compact text out, no client anywhere.
 *
 * Shares the UI/navigation cases with the database path (they drive the
 * canvas, which is rendering the same sample content) and routes every
 * data read to `sampleRead.ts`. Writes are unreachable by construction:
 * `SAMPLE_TRIAL_TOOL_NAMES` is what the loop registers, and anything else
 * lands on the closing refusal rather than on a mutation.
 */
async function dispatchSampleTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case 'read_reference':
      return readReference(need(args, 'name'))
    case 'list_scenarios':
      return sampleListScenarios()
    case 'get_blueprint':
      return sampleGetBlueprint(need(args, 'scenario_id'))
    case 'get_compare_diff': {
      const pathIds = Array.isArray(args.path_ids)
        ? args.path_ids.filter(
            (value): value is string => typeof value === 'string',
          )
        : undefined
      return sampleGetCompareDiff(need(args, 'scenario_id'), pathIds)
    }
    case 'get_cell':
      return sampleGetCell(need(args, 'cell_id'))
    case 'list_slices':
      return sampleListSlices()
    case 'get_slice':
      return sampleGetSlice(need(args, 'slice_id'))
    case 'list_owner_tags':
      return sampleListOwnerTags()
    case 'get_ui_state': {
      const context = collectAgentUiContext()
      return context || 'No UI state is being reported right now.'
    }
    case 'open_phase':
      return agentOpenPhase(need(args, 'phase_id'))
    case 'open_scenario':
      return agentOpenScenario(need(args, 'scenario_id'))
    case 'focus_cell':
      return agentFocusCell(need(args, 'cell_id'))
    case 'open_cell_panel':
      return agentOpenCellPanel(need(args, 'cell_id'))
    default:
      return `This session is running on the bundled SAMPLE blueprint with no database connected, so "${name}" does not exist here. Available: ${[...SAMPLE_TRIAL_TOOL_NAMES].join(', ')}. Connect a database to author.`
  }
}
