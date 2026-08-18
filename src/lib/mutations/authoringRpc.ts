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

type Functions = Database['public']['Functions']

/**
 * One place where a PostgREST failure becomes an Error. `fn` and `args` are
 * checked against the generated Functions types. Optional RPC args all
 * default to NULL server-side, so callers omit them (`?? undefined`) rather
 * than passing explicit nulls the generated Args types do not admit — same
 * semantics, checked signature. Wrappers whose RPC declares a Json return
 * (create_scenario) narrow it themselves.
 */
async function invoke<Fn extends keyof Functions & string>(
  client: Client,
  fn: Fn,
  args: Functions[Fn]['Args'],
): Promise<Functions[Fn]['Returns']> {
  const { data, error } = await client.rpc(fn, args)
  if (error) {
    throw new Error(error.message ?? String(error))
  }
  return data as Functions[Fn]['Returns']
}

export function createPhase(
  client: Client,
  input: { lifecycleId: string; name: string; description?: string | null },
): Promise<string> {
  return invoke(client, 'create_phase', {
    lifecycle_id: input.lifecycleId,
    name: input.name,
    description: input.description ?? undefined,
  })
}

export async function createScenario(
  client: Client,
  input: {
    phaseId: string
    name: string
    laneSourcePathId?: string | null
    stepCount?: number
    pathName?: string
  },
): Promise<CreatedScenario> {
  const data = await invoke(client, 'create_scenario', {
    phase_id: input.phaseId,
    name: input.name,
    view_type: 'single',
    lane_source_path_id: input.laneSourcePathId ?? undefined,
    lane_set: [],
    step_count: input.stepCount ?? 5,
    path_name: input.pathName ?? 'Happy Path',
  })
  // Declared Json; the RPC body always returns this exact object shape.
  return data as CreatedScenario
}

export function duplicateScenario(
  client: Client,
  input: { sourceScenarioId: string; name: string },
): Promise<string> {
  return invoke(client, 'duplicate_scenario', {
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
  return invoke(client, 'create_path', {
    scenario_id: input.scenarioId,
    name: input.name,
    path_type: input.pathType ?? 'alternative',
    lane_source_path_id: input.laneSourcePathId ?? undefined,
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
  return invoke(client, 'duplicate_path', {
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
  return invoke(client, 'rename_path', {
    path_id: input.pathId,
    new_name: input.name,
  })
}

/** Add a column to a path. `atPosition` inserts; omitted appends. */
export function addStep(
  client: Client,
  input: { pathId: string; name: string; atPosition?: number },
): Promise<string> {
  return invoke(client, 'add_step', {
    path_id: input.pathId,
    name: input.name,
    at_position: input.atPosition ?? undefined,
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
  const created = await invoke(client, 'add_lane', {
    scenario_id: input.scenarioId,
    name: input.name,
    layer_role: input.layerRole ?? undefined,
    at_row: input.atRow ?? undefined,
  })
  return created ?? []
}

export function upsertCell(
  client: Client,
  input: { pathId: string; layerId: string; stepId: string; content: string },
): Promise<string> {
  return invoke(client, 'upsert_cell', {
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
  return invoke(client, 'set_cell_dependency', {
    source_cell_id: input.sourceCellId,
    target_cell_id: input.targetCellId,
    kind: input.kind ?? 'trigger',
    label: input.label ?? undefined,
  })
}
