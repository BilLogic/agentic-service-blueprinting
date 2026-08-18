import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

/**
 * The app's structural write surface — thin wrappers over the Phase-1
 * SECURITY DEFINER RPCs (supabase/migrations/20260818001000_authoring_
 * operations.sql). There is no table-level INSERT or DELETE grant behind
 * any of them — a caller holds *operations*, not tables, which is what
 * lets an anonymous reader coexist with an authoring session in the same
 * schema. Every RPC asserts `is_service_account()` in its own body, so the
 * server refuses a non-service session regardless of what the UI shows.
 *
 * This module is the ledger/invalidation contract's home: the template has
 * no authoring UI yet, but the agent tool registry dispatches through these
 * wrappers (never raw `client.rpc` at the call site), and a future editor
 * UI shares them — one write path, so the two cannot drift. Callers treat
 * every one of these as **pessimistic**: re-read after a structural write
 * rather than patch client state, and invalidate through the Unit-2 helpers
 * (`invalidateStructure` / `invalidateQueries`) so the canvas repaints.
 */

/** What `create_scenario` hands back. */
export type CreatedScenario = { scenario_id: string; path_id: string }

export type DependencyKind = 'trigger' | 'needs'

/** One place where a PostgREST failure becomes an Error. */
async function invoke<T>(
  client: Client,
  fn: string,
  args: Record<string, unknown>,
): Promise<T> {
  // The RPCs post-date the generated Database types; the wrapper
  // signatures are the contract until types are regenerated against the
  // applied migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client.rpc as any)(fn, args)
  if (error) {
    throw new Error(error.message ?? String(error))
  }
  return data as T
}

export function createPhase(
  client: Client,
  input: { lifecycleId: string; name: string; description?: string | null },
): Promise<string> {
  return invoke<string>(client, 'create_phase', {
    lifecycle_id: input.lifecycleId,
    name: input.name,
    description: input.description ?? null,
  })
}

export function createScenario(
  client: Client,
  input: {
    phaseId: string
    name: string
    laneSourcePathId?: string | null
    stepCount?: number
    pathName?: string
  },
): Promise<CreatedScenario> {
  return invoke<CreatedScenario>(client, 'create_scenario', {
    phase_id: input.phaseId,
    name: input.name,
    view_type: 'single',
    lane_source_path_id: input.laneSourcePathId ?? null,
    lane_set: [],
    step_count: input.stepCount ?? 5,
    path_name: input.pathName ?? 'Happy Path',
  })
}

export function duplicateScenario(
  client: Client,
  input: { sourceScenarioId: string; name: string },
): Promise<string> {
  return invoke<string>(client, 'duplicate_scenario', {
    source_scenario_id: input.sourceScenarioId,
    name: input.name,
  })
}

export function createPath(
  client: Client,
  input: {
    scenarioId: string
    name: string
    pathType?: string
    laneSourcePathId?: string | null
  },
): Promise<string> {
  return invoke<string>(client, 'create_path', {
    scenario_id: input.scenarioId,
    name: input.name,
    path_type: input.pathType ?? 'alternative',
    lane_source_path_id: input.laneSourcePathId ?? null,
  })
}

export function duplicatePath(
  client: Client,
  input: {
    sourcePathId: string
    name: string
    pathType?: string
    copyCells?: boolean
  },
): Promise<string> {
  return invoke<string>(client, 'duplicate_path', {
    source_path_id: input.sourcePathId,
    name: input.name,
    path_type: input.pathType ?? 'alternative',
    copy_cells: input.copyCells ?? true,
    copy_dependencies: true,
  })
}

export function renamePath(
  client: Client,
  input: { pathId: string; name: string },
): Promise<void> {
  return invoke<void>(client, 'rename_path', {
    path_id: input.pathId,
    new_name: input.name,
  })
}

/** Add a column to a path. `atPosition` inserts; omitted appends. */
export function addStep(
  client: Client,
  input: { pathId: string; name: string; atPosition?: number },
): Promise<string> {
  return invoke<string>(client, 'add_step', {
    path_id: input.pathId,
    name: input.name,
    at_position: input.atPosition ?? null,
  })
}

/**
 * Add a lane to EVERY path of a scenario (one `layers` row per path, so the
 * side-by-side rows stay aligned). Returns every created lane id.
 */
export async function addLane(
  client: Client,
  input: {
    scenarioId: string
    name: string
    layerRole?: string | null
    atRow?: number
  },
): Promise<string[]> {
  const created = await invoke<string[] | null>(client, 'add_lane', {
    scenario_id: input.scenarioId,
    name: input.name,
    layer_role: input.layerRole ?? null,
    at_row: input.atRow ?? null,
  })
  return created ?? []
}

export function upsertCell(
  client: Client,
  input: { pathId: string; layerId: string; stepId: string; content: string },
): Promise<string> {
  return invoke<string>(client, 'upsert_cell', {
    path_id: input.pathId,
    layer_id: input.layerId,
    step_id: input.stepId,
    content: input.content,
  })
}

export function setCellDependency(
  client: Client,
  input: {
    sourceCellId: string
    targetCellId: string
    kind?: DependencyKind
    label?: string | null
  },
): Promise<string> {
  return invoke<string>(client, 'set_cell_dependency', {
    source_cell_id: input.sourceCellId,
    target_cell_id: input.targetCellId,
    kind: input.kind ?? 'trigger',
    label: input.label ?? null,
    note: null,
  })
}
