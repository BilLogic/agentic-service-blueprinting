import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { toAuthoringError } from '@/lib/authoringErrors'
import {
  recordChange,
  type RevertSpec,
  type WriteFn,
} from '@/lib/authoringSession'

type Client = SupabaseClient<Database>

/**
 * The app's entire structural write surface.
 *
 * Every function here is a `security definer` RPC from
 * `20260731001000_blueprint_authoring_operations.sql`. There is no table-level
 * INSERT or DELETE grant behind any of them — the app holds *operations*, not
 * tables, which is what lets an anonymous reader coexist with an authoring
 * session in the same schema.
 *
 * The map skill calls these same functions with the service key. That is the
 * point: one write path, so the app and the skill cannot drift into producing
 * differently-shaped blueprints.
 *
 * Callers should treat every one of these as **pessimistic** — the grid must
 * re-read after a structural write rather than patch itself, because these
 * cascade across tables in ways the client cannot mirror. Cell text edits are
 * the exception and stay optimistic; they live in `cellSpecMutations.ts`.
 */

// ---------------------------------------------------------------------------
// Shapes returned by the RPCs that return more than an id.
// ---------------------------------------------------------------------------

/** What `create_scenario` hands back: the blueprint and its first version. */
export type CreatedScenario = { scenario_id: string; path_id: string }

/**
 * One slice that would lose frames to a delete.
 *
 * A `null` entry in `cell_keys` is a cell whose authored key was never
 * written — it can be deleted but **not** restored by the undo path, which
 * matches on keys. Surface those separately rather than counting them as
 * recoverable.
 */
export type AffectedSlice = {
  slice_id: string
  title: string
  cell_keys: Array<string | null>
}

/**
 * What a delete would destroy, read *before* the confirm dialog opens.
 *
 * `affected_slices` is the one that matters: a slice quietly losing cells
 * stays renderable and simply says less than it did, which is worse than an
 * error — nothing surfaces, and the story is silently wrong.
 */
export type DeletionImpact = {
  label: string
  cell_count: number
  dependency_count: number
  affected_slices: AffectedSlice[]
}

export type LaneSetEntry = {
  name: string
  layer_role: string | null
  row_position: number
}

export type DependencyKind = 'trigger' | 'needs'

export type ViewType = 'single' | 'side-by-side' | 'integrated'

// ---------------------------------------------------------------------------
// The call seam.
// ---------------------------------------------------------------------------

/**
 * One place where a PostgREST failure becomes an `AuthoringError`.
 *
 * `rpc` is untyped against our generated `Database` because these functions
 * post-date the last type generation; the parameter and return types above are
 * the contract until `generate_typescript_types` is re-run against the applied
 * migration.
 *
 * Shared by both seams below. It records nothing on its own — recording is the
 * one thing that distinguishes a write from a read, so it is the one thing
 * that must be chosen explicitly at every call site.
 */
async function invoke<T>(
  client: Client,
  fn: string,
  args: Record<string, unknown>,
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see doc above
  const { data, error } = await (client.rpc as any)(fn, args)
  if (error) {
    const authoring = toAuthoringError(error)
    console.error(`[authoring] ${fn} failed:`, authoring.raw)
    throw authoring
  }
  return data as T
}

/**
 * A **write**: run it, then log it to the session ledger.
 *
 * Logged here and only here, *after* the call succeeded. That placement is
 * what makes the session list trustworthy: it records writes that actually
 * landed, so it can never claim a change the database does not have.
 */
async function call<T>(
  client: Client,
  fn: WriteFn,
  args: Record<string, unknown>,
  revert?: RevertSpec,
): Promise<T> {
  const data = await invoke<T>(client, fn, args)
  recordChange(fn, args, revert ?? deriveRevert(fn, args, data))
  return data
}

/**
 * A **read**: run it and log nothing.
 *
 * Not an optimisation — a correctness rule. A read has no inverse by
 * definition, so routing one through `call()` puts a row in the unsaved-changes
 * list that can never carry a revert control. That is exactly what happened to
 * `deletion_impact`: merely opening a delete dialog logged a change named
 * "deletion impact", the counter climbed without anything having changed, and
 * because the row had no inverse the sheet showed no revert on it — which read
 * as "per-change revert is gone" rather than "this row was never a change".
 *
 * Anything added below that only asks the database a question belongs here.
 *
 * This seam is the whole boundary now. The ledger used to carry a second,
 * name-based deny-list of read RPCs and silently drop anything matching it —
 * which could only ever *lose* a write, the moment a future operation reused
 * one of those names. It is gone: `call()` and `recordChange()` take a
 * `WriteFn`, so handing either a read's name does not compile, which is the
 * same guarantee made earlier and louder.
 */
function read<T>(
  client: Client,
  fn: string,
  args: Record<string, unknown>,
): Promise<T> {
  return invoke<T>(client, fn, args)
}

/**
 * The inverse of a change, derived at the only moment it is cheap: right
 * after the call, while the returned id is in hand.
 *
 * Only *creations* derive an inverse here — the created thing's id came back
 * from the call, and deleting it restores the world exactly. Renames and
 * reorders need before-state their wrappers must pass explicitly; deletes
 * have no inverse RPC and stay non-revertible per row.
 */
function deriveRevert(
  fn: WriteFn,
  args: Record<string, unknown>,
  data: unknown,
): RevertSpec | undefined {
  switch (fn) {
    case 'add_step':
      return typeof data === 'string'
        ? { fn: 'remove_step', args: { path_id: args.path_id, step_id: data } }
        : undefined
    case 'add_lane':
      // By identity, like every other inverse here. The name-keyed
      // `remove_lane(scenario_id, lane_name)` this replaces held only under
      // clean LIFO: rename the lane and it matched nothing; rename a
      // *different* lane into that name and it deleted that one instead —
      // across every path of the scenario, cells included.
      //
      // The fallback is the old inverse, and it is load-bearing until
      // `20260807130000_add_lane_returns_ids.sql` is applied: before that
      // migration `add_lane` returns void, so there are no ids to key on and
      // a name-keyed undo is better than none.
      return Array.isArray(data) && data.length > 0
        ? { fn: 'remove_lanes', args: { lane_ids: data } }
        : {
            fn: 'remove_lane',
            args: { scenario_id: args.scenario_id, lane_name: args.name },
          }
    case 'upsert_cell':
      // The app only calls upsert_cell on empty slots, so the upsert was a
      // create and deleting it is a true inverse. If an update path ever
      // appears, it must pass its own revert.
      return typeof data === 'string'
        ? { fn: 'delete_cell', args: { cell_id: data } }
        : undefined
    case 'create_scenario': {
      const scenario = data as CreatedScenario | null
      return scenario?.scenario_id
        ? {
            fn: 'delete_scenario',
            args: { scenario_id: scenario.scenario_id },
          }
        : undefined
    }
    case 'duplicate_scenario':
      return typeof data === 'string'
        ? { fn: 'delete_scenario', args: { scenario_id: data } }
        : undefined
    case 'create_path':
    case 'duplicate_path':
      return typeof data === 'string'
        ? { fn: 'delete_path', args: { path_id: data } }
        : undefined
    case 'set_cell_dependency':
      return typeof data === 'string'
        ? { fn: 'clear_cell_dependency', args: { dependency_id: data } }
        : undefined
    default:
      return undefined
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Create a blueprint with one version, a lane set, and empty columns.
 *
 * Prefer `laneSourcePathId` over `laneSet`: lane vocabulary drifting between
 * blueprints is the single most common defect in a service blueprint set, and
 * copying an existing version's lanes is the cheapest way to not cause it.
 */
/**
 * Add a phase at the end of a service.
 *
 * Appends rather than taking a position: a phase is a column of the whole
 * canvas, so inserting one mid-sequence re-lays-out every scenario to its
 * right. That is a reorder, and reordering is a different operation.
 */
export function createPhase(
  client: Client,
  input: { lifecycleId: string; name: string; description?: string | null },
): Promise<string> {
  return call<string>(client, 'create_phase', {
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
    viewType?: ViewType
    laneSourcePathId?: string | null
    laneSet?: LaneSetEntry[]
    stepCount?: number
    pathName?: string
  },
): Promise<CreatedScenario> {
  return call<CreatedScenario>(client, 'create_scenario', {
    phase_id: input.phaseId,
    name: input.name,
    view_type: input.viewType ?? 'single',
    lane_source_path_id: input.laneSourcePathId ?? null,
    lane_set: input.laneSet ?? [],
    step_count: input.stepCount ?? 5,
    path_name: input.pathName ?? 'Happy Path',
  })
}

/**
 * Copy a whole blueprint into its own phase — columns, every path, every
 * lane, every cell, and every arrow whose both ends are inside it.
 *
 * There is no client-side composition that produces this: `duplicatePath` is
 * scoped to its source's scenario and `createScenario` mints empty columns.
 * See `20260807120000_duplicate_scenario.sql` for exactly what is and is not
 * copied — notably `cell_key`, which is authored and so is left null on the
 * copies, the same as every other app-created cell.
 */
export function duplicateScenario(
  client: Client,
  input: { sourceScenarioId: string; name: string },
): Promise<string> {
  return call<string>(client, 'duplicate_scenario', {
    source_scenario_id: input.sourceScenarioId,
    name: input.name,
  })
}

/**
 * Renames. One operation per entity rather than a generic update: an RPC that
 * can only change a name cannot be talked into changing anything else.
 */
export function renamePhase(
  client: Client,
  input: { phaseId: string; name: string; previousName?: string },
): Promise<void> {
  return call<void>(
    client,
    'rename_phase',
    { phase_id: input.phaseId, new_name: input.name },
    input.previousName
      ? {
          fn: 'rename_phase',
          args: { phase_id: input.phaseId, new_name: input.previousName },
        }
      : undefined,
  )
}

export function renameScenario(
  client: Client,
  input: { scenarioId: string; name: string; previousName?: string },
): Promise<void> {
  return call<void>(
    client,
    'rename_scenario',
    { scenario_id: input.scenarioId, new_name: input.name },
    input.previousName
      ? {
          fn: 'rename_scenario',
          args: { scenario_id: input.scenarioId, new_name: input.previousName },
        }
      : undefined,
  )
}

export function renamePath(
  client: Client,
  input: { pathId: string; name: string; previousName?: string },
): Promise<void> {
  return call<void>(
    client,
    'rename_path',
    { path_id: input.pathId, new_name: input.name },
    input.previousName
      ? {
          fn: 'rename_path',
          args: { path_id: input.pathId, new_name: input.previousName },
        }
      : undefined,
  )
}

/** Add a column to a version. `atPosition` inserts; omitted appends. */
export function addStep(
  client: Client,
  input: { pathId: string; name: string; atPosition?: number },
): Promise<string> {
  return call<string>(client, 'add_step', {
    path_id: input.pathId,
    name: input.name,
    at_position: input.atPosition ?? null,
  })
}

/**
 * Add a lane to **every version** of a blueprint. `atRow` inserts; omitted
 * appends.
 *
 * Scenario-scoped, not version-scoped: the call creates one `layers` row per
 * version, and adding a lane to one version alone would misalign the rows in
 * the side-by-side view. Re-read the grid afterwards.
 *
 * Returns every id it created — an array and not a scalar for that same
 * reason. The ids are what the captured inverse keys on; see `deriveRevert`.
 * Empty against a database without `20260807130000`, where this still
 * returns void.
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
  const created = await call<string[] | null>(client, 'add_lane', {
    scenario_id: input.scenarioId,
    name: input.name,
    layer_role: input.layerRole ?? null,
    at_row: input.atRow ?? null,
  })
  return created ?? []
}

/**
 * Create or update the cell at (lane, column).
 *
 * The link between column and version is ensured inside the function, so a
 * caller may drop a cell into a column the version does not carry yet and get
 * the column linked rather than a trigger exception.
 */
export function upsertCell(
  client: Client,
  input: { pathId: string; layerId: string; stepId: string; content: string },
): Promise<string> {
  return call<string>(client, 'upsert_cell', {
    path_id: input.pathId,
    layer_id: input.layerId,
    step_id: input.stepId,
    content: input.content,
  })
}

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

/**
 * Renumber a version's columns to exactly this order.
 *
 * Safe as one statement because `path_steps_path_column_unique` was made
 * `deferrable initially deferred` in the foundation migration — before that, a
 * multi-row shift collided with itself midway through.
 */
export function reorderSteps(
  client: Client,
  pathId: string,
  stepIds: string[],
): Promise<void> {
  return call<void>(client, 'reorder_steps', {
    path_id: pathId,
    step_ids: stepIds,
  })
}

/** Set which columns a version carries, and in what order. */
export function setPathSteps(
  client: Client,
  pathId: string,
  stepIds: string[],
): Promise<void> {
  return call<void>(client, 'set_path_steps', {
    path_id: pathId,
    step_ids: stepIds,
  })
}

/**
 * Reorder lanes across a whole blueprint, by name.
 *
 * By name, not by id, because every version of a blueprint has its own copy of
 * each lane and they must stay row-aligned — reordering one version's lane ids
 * would misalign it against its siblings in the side-by-side view.
 */
export function reorderLanes(
  client: Client,
  scenarioId: string,
  laneNames: string[],
): Promise<void> {
  return call<void>(client, 'reorder_lanes', {
    scenario_id: scenarioId,
    lane_names: laneNames,
  })
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

/**
 * Add or update one dependency between two cells in the same version.
 *
 * `trigger` draws an arrow; `needs` records a dependency that deliberately
 * does not — a blueprint where every relationship is an arrow is unreadable,
 * and most "this depends on that" facts are not handoffs.
 */
export function setCellDependency(
  client: Client,
  input: {
    sourceCellId: string
    targetCellId: string
    kind?: DependencyKind
    label?: string | null
    note?: string | null
  },
): Promise<string> {
  return call<string>(client, 'set_cell_dependency', {
    source_cell_id: input.sourceCellId,
    target_cell_id: input.targetCellId,
    kind: input.kind ?? 'trigger',
    label: input.label ?? null,
    note: input.note ?? null,
  })
}

export function clearCellDependency(
  client: Client,
  dependencyId: string,
): Promise<void> {
  return call<void>(client, 'clear_cell_dependency', {
    dependency_id: dependencyId,
  })
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

/** Create an empty version of a blueprint, optionally copying a lane set. */
export function createPath(
  client: Client,
  input: {
    scenarioId: string
    name: string
    pathType?: string
    laneSourcePathId?: string | null
  },
): Promise<string> {
  return call<string>(client, 'create_path', {
    scenario_id: input.scenarioId,
    name: input.name,
    path_type: input.pathType ?? 'alternative',
    lane_source_path_id: input.laneSourcePathId ?? null,
  })
}

/**
 * Copy a version.
 *
 * `withDependencies` remaps every arrow onto the copies — an arrow left
 * pointing at the original's cells would render as a line leaving the version
 * it belongs to, which is the failure mode this flag exists to prevent.
 */
export function duplicatePath(
  client: Client,
  input: {
    sourcePathId: string
    name: string
    pathType?: string
    copyCells?: boolean
    copyDependencies?: boolean
  },
): Promise<string> {
  return call<string>(client, 'duplicate_path', {
    source_path_id: input.sourcePathId,
    name: input.name,
    path_type: input.pathType ?? 'alternative',
    copy_cells: input.copyCells ?? true,
    copy_dependencies: input.copyDependencies ?? true,
  })
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export type DeletionKind = 'scenario' | 'path' | 'step' | 'lane'

/**
 * What a delete would destroy. Read this before opening a confirm dialog —
 * the numbers shown must be the numbers that die, including the arrows that
 * cascade with the cells and the slices that lose frames.
 */
export function deletionImpact(
  client: Client,
  kind: DeletionKind,
  targetId: string,
): Promise<DeletionImpact> {
  return read<DeletionImpact>(client, 'deletion_impact', {
    kind,
    target_id: targetId,
  })
}

/**
 * Each of these archives everything it destroys into `deleted_structure` in
 * the same transaction as the cascade, and returns the archive row's id — pass
 * it to the undo toast.
 */
export function deleteScenario(client: Client, scenarioId: string): Promise<string> {
  return call<string>(client, 'delete_scenario', { scenario_id: scenarioId })
}

export function deletePath(client: Client, pathId: string): Promise<string> {
  return call<string>(client, 'delete_path', { path_id: pathId })
}

export function removeStep(
  client: Client,
  pathId: string,
  stepId: string,
): Promise<string> {
  return call<string>(client, 'remove_step', { path_id: pathId, step_id: stepId })
}

export function removeLane(
  client: Client,
  scenarioId: string,
  laneName: string,
): Promise<string> {
  return call<string>(client, 'remove_lane', {
    scenario_id: scenarioId,
    lane_name: laneName,
  })
}

export function deleteCell(client: Client, cellId: string): Promise<string> {
  return call<string>(client, 'delete_cell', { cell_id: cellId })
}

/*
 * There are no client wrappers for `cell_natural_key` or
 * `slices_referencing`. Both existed here with zero callers and never had any:
 * the app only ever needs them THROUGH `deletion_impact`, which calls
 * `slices_referencing` itself and returns the keys inside `affected_slices` —
 * so a wrapper here was a second way to ask a question already answered, with
 * no caller to keep it honest. The SQL functions stay; they are the ones doing
 * the work, and `authoringSession.test.ts` still names both as reads that must
 * never become members of `WriteFn`.
 */
