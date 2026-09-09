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
 * Every function here is a `security definer` RPC from the migration that
 * defined the blueprint authoring operations. There is no table-level INSERT
 * or DELETE grant behind any of them — the app holds *operations*, not
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
  lane_role: string | null
  position: number
}

export type DependencyKind = 'leads_to' | 'enables'

/** One dependency row as it stood before a write. */
export type CellDependencyRow = {
  id: string
  source_cell_id: string
  target_cell_id: string
  kind: DependencyKind
  name: string | null
  note: string | null
}

/**
 * What `set_cell_dependency` hands back — an upsert saying which half it took.
 *
 * `id` is the row it wrote, either half. `inserted` is the write's own account
 * of whether that row is new, read from its `xmax` inside the same statement;
 * nothing outside the function can establish it after the fact, which is the
 * whole reason it travels. `previous` is the row AS IT STOOD, captured before
 * the write and keyed on its own id, so the undo restores THIS row rather than
 * whatever joins the same two cells by the time it runs.
 *
 * `previous` is null on an insert, and it can be null on an update too — a
 * concurrent insert between the capture and the upsert leaves the call
 * updating a row it never saw. `deriveRevert` treats that as "no inverse",
 * which is the honest answer and the one the ledger already gives for a
 * delete.
 */
export type CellDependencyWrite = {
  id: string
  inserted: boolean
  previous: CellDependencyRow | null
}

/**
 * What the column accepts, which is now what the client says.
 *
 * `side-by-side` and `integrated` were the historical tokens, translated at a
 * read seam and a write seam because the rows had not moved. The migration
 * that gave each thing one spelling moved them, so both seams and the module
 * holding them are gone: one vocabulary, and the CHECK constraint is the thing
 * that enforces it.
 *
 * `merged` joined in a later migration, when `single` left: a scenario is
 * stored as what it opens as, and the header toggle writes it.
 */
export type Layout = 'stacked' | 'merged'

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
      // The fallback is the old inverse, and it is load-bearing until the
      // migration that made `add_lane` return the ids it created is applied:
      // before that migration `add_lane` returns void, so there are no ids to
      // key on and a name-keyed undo is better than none.
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
    case 'set_cell_dependency': {
      // The one case here that reads the write's REPORT rather than its name.
      // `set_cell_dependency` upserts, and the two halves have opposite
      // inverses: an insert is undone by deleting the row, an update by
      // putting the row's words back. Deriving a delete from the name got the
      // update half exactly backwards — the edge existed before the write, and
      // the undo destroyed it. Reachable only from the agent tool, which is
      // the caller that upserts onto edges a person has already read.
      const outcome = data as CellDependencyWrite | null
      if (!outcome?.id) return undefined
      if (outcome.inserted)
        return { fn: 'clear_cell_dependency', args: { dependency_id: outcome.id } }
      // An update whose before-state did not come back cannot be restored, and
      // a row with no `revert` is how the ledger says so — the same silence it
      // shows on a delete, rather than an approximation that reads like an
      // undo and is not one.
      const previous = outcome.previous
      if (!previous) return undefined
      return {
        fn: 'restore_cell_dependency',
        args: {
          dependency_id: previous.id,
          name: previous.name,
          note: previous.note,
        },
      }
    }
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
  input: { serviceId: string; name: string; summary?: string | null },
): Promise<string> {
  return call<string>(client, 'create_phase', {
    service_id: input.serviceId,
    name: input.name,
    summary: input.summary ?? null,
  })
}

export function createScenario(
  client: Client,
  input: {
    phaseId: string
    name: string
    layout?: Layout
    laneSourcePathId?: string | null
    laneSet?: LaneSetEntry[]
    stepCount?: number
    pathName?: string
  },
): Promise<CreatedScenario> {
  return call<CreatedScenario>(client, 'create_scenario', {
    phase_id: input.phaseId,
    name: input.name,
    layout: input.layout ?? 'stacked',
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
 * See the migration that defines `duplicate_scenario` for exactly what is and
 * is not copied — notably `cell_key`, which is authored and so is left null on
 * the copies, the same as every other app-created cell.
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

/**
 * The header toggle's write: how this scenario's board opens. Recorded with
 * the value it replaces so the session sheet can take it back.
 */
export function updateScenarioLayout(
  client: Client,
  input: {
    scenarioId: string
    layout: Layout
    previousLayout?: Layout
  },
): Promise<void> {
  return call<void>(
    client,
    'update_scenario_layout',
    { scenario_id: input.scenarioId, layout: input.layout },
    input.previousLayout
      ? {
          fn: 'update_scenario_layout',
          args: { scenario_id: input.scenarioId, layout: input.previousLayout },
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
 * Add a lane to **every version** of a blueprint. `atPosition` inserts; omitted
 * appends.
 *
 * Scenario-scoped, not version-scoped: the call creates one `lanes` row per
 * version, and adding a lane to one version alone would misalign the rows in
 * the side-by-side view. Re-read the grid afterwards.
 *
 * Returns every id it created — an array and not a scalar for that same
 * reason. The ids are what the captured inverse keys on; see `deriveRevert`.
 * Empty against a database from before the migration that made this return
 * its ids, where it still returns void.
 */
export async function addLane(
  client: Client,
  input: {
    scenarioId: string
    name: string
    laneRole?: string | null
    atPosition?: number
  },
): Promise<string[]> {
  const created = await call<string[] | null>(client, 'add_lane', {
    scenario_id: input.scenarioId,
    name: input.name,
    lane_role: input.laneRole ?? null,
    at_position: input.atPosition ?? null,
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
  input: { pathId: string; laneId: string; stepId: string; content: string },
): Promise<string> {
  return call<string>(client, 'upsert_cell', {
    path_id: input.pathId,
    lane_id: input.laneId,
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
 * `leads_to` draws an arrow; `enables` records a dependency that deliberately
 * does not — a blueprint where every relationship is an arrow is unreadable,
 * and most "this depends on that" facts are not handoffs.
 *
 * Returns what the write DID, not just where it landed: which half of the
 * upsert it took and the row as it stood. That is what lets the ledger record
 * an inverse this operation's name cannot supply — see `CellDependencyWrite`
 * and the `set_cell_dependency` case in `deriveRevert`.
 */
export function setCellDependency(
  client: Client,
  input: {
    sourceCellId: string
    targetCellId: string
    kind?: DependencyKind
    /**
     * The badge on the arrow, held in `cell_dependencies.name`. The parameter
     * exists because the function takes it; nothing in the app passes it any
     * more — the editor and the agent tool both write the note.
     */
    name?: string | null
    /** Why the edge exists, held in `cell_dependencies.note`. */
    note?: string | null
  },
): Promise<CellDependencyWrite> {
  return call<CellDependencyWrite>(client, 'set_cell_dependency', {
    source_cell_id: input.sourceCellId,
    target_cell_id: input.targetCellId,
    kind: input.kind ?? 'leads_to',
    name: input.name ?? null,
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
    pathKind?: string
    laneSourcePathId?: string | null
  },
): Promise<string> {
  return call<string>(client, 'create_path', {
    scenario_id: input.scenarioId,
    name: input.name,
    kind: input.pathKind ?? 'variant',
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
    pathKind?: string
    copyCells?: boolean
    copyDependencies?: boolean
  },
): Promise<string> {
  return call<string>(client, 'duplicate_path', {
    source_path_id: input.sourcePathId,
    name: input.name,
    kind: input.pathKind ?? 'variant',
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
  /**
   * The other half of the delete's identity, for the kind whose delete is not
   * addressed by a single id: `step` needs the path_id, because `remove_step`
   * is path-scoped. `lane` derives its scenario from the lane itself, so it
   * takes none. Passing it for scenario/path is harmless and ignored.
   */
  scopeId?: string,
): Promise<DeletionImpact> {
  return read<DeletionImpact>(client, 'deletion_impact', {
    kind,
    target_id: targetId,
    scope_id: scopeId ?? null,
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
