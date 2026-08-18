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
} from '@/lib/mutations/authoringRpc'
import {
  checkCellContentLength,
  updateCellContent,
  updateCellSpec,
  type CellContentUpdate,
} from '@/lib/mutations/cellMutations'
import {
  createSlice,
  replaceSliceFrames,
  updateSliceMeta,
  type SliceType,
} from '@/lib/mutations/sliceMutations'
import {
  recordFinding,
  setFindingStatus,
  type FindingSeverity,
} from '@/lib/mutations/findingMutations'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import {
  agentFocusCell,
  agentOpenPhase,
  agentOpenScenario,
  collectAgentUiContext,
} from '@/lib/agent/uiBridge'
import {
  getBlueprint,
  getCell,
  getSlice,
  listFindings,
  listOwnerTags,
  listScenarios,
  listSlices,
  readReference,
} from '@/lib/agent/tools/read'

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
 * Execute one tool call. Returns the text the model sees. Every write
 * dispatches through the src/lib/mutations/ wrappers (the same seam a
 * future editor UI shares), and the query cache is invalidated afterwards
 * so the canvas repaints live.
 */
export async function dispatchTool(
  client: Client,
  _agentSessionId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case 'read_reference':
      return readReference(need(args, 'name'))
    case 'list_scenarios':
      return listScenarios(client)
    case 'get_blueprint':
      return getBlueprint(client, need(args, 'scenario_id'))
    case 'get_cell':
      return getCell(client, need(args, 'cell_id'))
    case 'list_slices':
      return listSlices(client)
    case 'get_slice':
      return getSlice(client, need(args, 'slice_id'))
    case 'list_owner_tags':
      return listOwnerTags(client)
    case 'list_findings':
      return listFindings(client, s(args, 'status') ?? 'open')
    case 'get_ui_state': {
      const context = collectAgentUiContext()
      return context || 'No UI state is being reported right now.'
    }
    // UI navigation: drives the interface, changes no data.
    case 'open_phase':
      return agentOpenPhase(need(args, 'phase_id'))
    case 'open_scenario':
      return agentOpenScenario(need(args, 'scenario_id'))
    case 'focus_cell':
      return agentFocusCell(need(args, 'cell_id'))
  }

  // Everything below writes; invalidate on the way out (success or not —
  // a failed multi-row write may still have landed rows).
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
        // slot would silently OVERWRITE the cell. Creation tool means
        // creation only; edits go through update_cell_content.
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
        const lengthProblem = checkCellContentLength(newContent)
        if (lengthProblem) throw new Error(lengthProblem)
        const id = await upsertCell(client, {
          pathId: need(args, 'path_id'),
          layerId,
          stepId,
          content: newContent,
        })
        return `Created cell (${id}).`
      }
      case 'update_cell_content': {
        const cellId = need(args, 'cell_id')
        const nextContent = s(args, 'content')
        if (nextContent !== undefined) {
          const lengthProblem = checkCellContentLength(nextContent)
          if (lengthProblem) throw new Error(lengthProblem)
        }
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
        await updateCellContent(client, cellId, {
          content: s(args, 'content') ?? previous.content,
          description: s(args, 'summary') ?? previous.description,
          owner: s(args, 'owner') ?? previous.owner,
          perceivedOwner: s(args, 'perceived_owner') ?? previous.perceivedOwner,
        })
        return 'Cell updated.'
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
        const nextProps = Array.isArray(args.value_props)
          ? (args.value_props as Array<{ for?: string; value?: string }>).map(
              (entry) => ({ for: entry.for ?? '', value: entry.value ?? '' }),
            )
          : prevProps
        await updateCellSpec(client, cellId, {
          function: s(args, 'function') ?? (data.function ?? ''),
          form: s(args, 'form') ?? (data.form ?? ''),
          valueProps: nextProps,
        })
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
        return `Duplicated the scenario (${id}). Re-read it for the copy's own path, lane, step and cell ids — none of them are the source's.`
      }
      case 'create_slice': {
        const cellIds = Array.isArray(args.cell_ids)
          ? args.cell_ids.filter(
              (value): value is string => typeof value === 'string',
            )
          : []
        if (cellIds.length === 0)
          throw new Error('cell_ids must be a non-empty array of existing cell ids.')
        const requestedType = s(args, 'slice_type') as SliceType | undefined
        const slice = await createSlice(client, {
          lifecycleId: await lifecycleId(client),
          title: need(args, 'title'),
          description: s(args, 'description') ?? '',
          sliceType: requestedType ?? 'custom',
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
        const outcome = await updateSliceMeta(
          client,
          sliceId,
          data.updated_at,
          {
            title: s(args, 'title') ?? data.title,
            description: s(args, 'description') ?? data.description ?? '',
            sliceType: (s(args, 'slice_type') ?? data.slice_type) as SliceType,
            actor: s(args, 'actor') ?? data.actor ?? '',
          },
          data.origin,
        )
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
          throw new Error('A zero-cell finding needs a scope (e.g. "scenario:Sample Service").')
        const runId = s(args, 'run_id') ?? crypto.randomUUID()
        const outcome = await recordFinding(client, {
          lifecycleId: await lifecycleId(client),
          source,
          checkName,
          severity: severityArg as FindingSeverity,
          note,
          cellIds,
          scope,
          runId,
        })
        switch (outcome) {
          case 'updated-open':
            return `An open finding already had this fingerprint — updated it in place (dedupe). run_id ${runId}; reuse it for the rest of this run.`
          case 'stayed-dismissed':
            return `A finding with this fingerprint was dismissed by a human — dismissed stays dismissed. Nothing recorded. run_id ${runId}; reuse it for the rest of this run.`
          case 'reopened':
            return `Recorded ${severityArg} finding for ${checkName} (a resolved twin existed — this reopens the issue). run_id ${runId}; reuse it for the rest of this run.`
          default:
            return `Recorded ${severityArg} finding for ${checkName}. run_id ${runId}; reuse it for the rest of this run.`
        }
      }
      case 'set_finding_status': {
        const status = s(args, 'status')
        if (status !== 'open' && status !== 'resolved' && status !== 'dismissed')
          throw new Error('status must be open, resolved, or dismissed.')
        await setFindingStatus(client, need(args, 'finding_id'), status)
        return `Finding is now ${status}.`
      }
      default:
        return `Tool "${name}" is not on the allow-list. Available tools are fixed; deletes do not exist here — removal is human-only.`
    }
  } finally {
    // The canvas reads through the shared query cache; empty prefix
    // matches every key, so the grids refetch and repaint after a write.
    invalidateQueries('')
  }
}
