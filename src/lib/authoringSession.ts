/**
 * What has been changed since Edit was turned on.
 *
 * Every structural write in the app goes through one `call()` in
 * `authoringRpc.ts`, so the log is an append there — which is what makes it
 * trustworthy: it records calls that were actually made, not intentions. It
 * cannot drift from the database, because it *is* the list of things sent to
 * the database.
 *
 * Deliberately not an undo stack. Undo is positional — it reverses whatever
 * happened last — while this is addressable: having added a step, a lane and a
 * cell, wanting the lane back should not mean undoing two things you meant to
 * keep. Entries that captured an inverse carry it in `revert`, and the sheet
 * offers a per-row revert; entries without one (deletes, changes recorded
 * before their before-state was captured) simply show no revert control.
 *
 * Module-level rather than React state because `call()` is a plain function
 * with no component around it. Subscribers read through `useSyncExternalStore`.
 */

/**
 * How to take one change back: the operation that undoes it, captured at
 * record time while the before-state was still known. `fn` is either an
 * authoring RPC name or one of the direct-table mutation names
 * (`update_cell_content`, `update_cell_spec`, `update_cell_resources`) —
 * `executeRevert` in `revertChange.ts` knows which is which.
 */
export type RevertSpec = {
  fn: string
  args: Record<string, unknown>
}

/**
 * Every operation that can land in the ledger — the authoring RPCs plus the
 * direct-table mutations that log themselves.
 *
 * A union rather than `string` so that adding an operation and forgetting to
 * teach `describeChange` about it is a **compile error** instead of a row in
 * the sheet reading "duplicate scenario" — the lowercased function name, which
 * is exactly what shipped when `duplicate_scenario` was added beside
 * `duplicate_path` and only one of the two got a case.
 */
export type WriteFn =
  | 'create_phase'
  | 'create_scenario'
  | 'create_path'
  | 'duplicate_path'
  | 'duplicate_scenario'
  | 'rename_phase'
  | 'rename_scenario'
  | 'rename_path'
  | 'rename_owner_tag'
  | 'add_step'
  | 'add_lane'
  | 'upsert_cell'
  | 'update_cell_content'
  | 'update_cell_resources'
  | 'update_cell_spec'
  | 'add_evidence'
  | 'delete_evidence'
  | 'set_cell_dependency'
  | 'clear_cell_dependency'
  | 'reorder_steps'
  | 'set_path_steps'
  | 'reorder_lanes'
  | 'delete_scenario'
  | 'delete_path'
  | 'remove_step'
  | 'remove_lane'
  | 'delete_cell'
  | 'delete_slice'
  | 'create_slice'
  | 'duplicate_slice'
  | 'update_slice_meta'
  | 'replace_slice_frames'

export type ChangeEntry = {
  id: string
  /** The RPC that ran, e.g. `add_step`. */
  fn: WriteFn
  /** Exactly what was sent. Ids, not names — names are resolved at render. */
  args: Record<string, unknown>
  at: number
  /** Present when this change can be individually taken back. */
  revert?: RevertSpec
  /** Set when the canvas agent made this change; absent = human. */
  author?: 'agent'
  /** The agent session the change belongs to (its ✦ row grouping). */
  agentSessionId?: string
}

/**
 * While set, recorded changes are attributed to the agent. Set around the
 * agent's tool dispatch only. A human save landing during an in-flight
 * agent batch would wear the wrong badge — a cosmetic misattribution, not
 * a data hazard (unlike the old recording-suspend flag this deliberately
 * does not gate), and one person racing their own agent is the corner.
 */
let agentAttribution: { sessionId: string } | null = null

export function setAgentAttribution(sessionId: string | null): void {
  agentAttribution = sessionId === null ? null : { sessionId }
}

/**
 * The agent session a write happening right now would be attributed to, or
 * null when the human is driving.
 *
 * Read by the scoped revert (`revert_my_changes`): it needs to know *whose*
 * entries to take back, and the attribution the dispatcher already set is the
 * one authority on that. The alternative — passing the session id in as a
 * command argument — would let the model name someone else's session.
 */
export function currentAgentSessionId(): string | null {
  return agentAttribution?.sessionId ?? null
}

/** Operations that cannot be taken back once the session is saved. */
const DESTRUCTIVE = new Set([
  'delete_scenario',
  'delete_path',
  'delete_cell',
  'delete_slice',
  'remove_step',
  'remove_lane',
])

let entries: ChangeEntry[] = []
let listeners: Array<() => void> = []
let counter = 0

function emit() {
  for (const listener of listeners) listener()
}

export function subscribeToSession(listener: () => void): () => void {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((entry) => entry !== listener)
  }
}

/** Stable snapshot — `useSyncExternalStore` compares by identity. */
export function sessionSnapshot(): ChangeEntry[] {
  return entries
}

export function recordChange(
  fn: WriteFn,
  args: Record<string, unknown>,
  revert?: RevertSpec,
): void {
  counter += 1
  entries = [
    ...entries,
    {
      id: `c${counter}`,
      fn,
      args,
      at: Date.now(),
      revert,
      ...(agentAttribution
        ? { author: 'agent' as const, agentSessionId: agentAttribution.sessionId }
        : {}),
    },
  ]
  emit()
}

/** Save: the changes are wanted, so stop tracking them. Writes nothing. */
export function clearSession(): void {
  if (entries.length === 0) return
  entries = []
  emit()
}

export function forgetChange(id: string): void {
  const next = entries.filter((entry) => entry.id !== id)
  if (next.length === entries.length) return
  entries = next
  emit()
}

/** True when saving would put anything permanently out of reach. */
export function sessionHasDestructive(list: readonly ChangeEntry[]): boolean {
  return list.some((entry) => DESTRUCTIVE.has(entry.fn))
}

/*
 * There is deliberately no by-operation "irreversible" predicate. There used
 * to be an empty `Set` of operation names and an `isIrreversible(entry)` over
 * it, whose doc described behaviour the code could not exhibit — the set being
 * empty, it answered false for everything, including the deletes it named.
 *
 * Revertibility is not a property of the operation, it is a property of the
 * ENTRY: the same `upsert_cell` is revertible when its id came back and not
 * when it did not, and `update_cell_content` is revertible only if the caller
 * captured a before-state. So `!entry.revert` — what `revertAll` and the row
 * button already ask — is the whole predicate, and a second, coarser one
 * beside it could only ever disagree with it.
 */

/**
 * One human sentence per change.
 *
 * Named by what was done, never by table — "Added a step" and not
 * `INSERT path_steps`. Where a name was supplied to the RPC it is quoted,
 * because that is the word the person typed and the one they will recognise.
 */
/** Rename args carry `new_name`, not `name` — quote what it became. */
function renameTo(entry: ChangeEntry): string {
  const name =
    typeof entry.args.new_name === 'string' ? entry.args.new_name.trim() : ''
  return name ? ` to “${name}”` : ''
}

/** A quoted `name` argument, or nothing when the call carried none. */
function named(entry: ChangeEntry): string {
  const name = typeof entry.args.name === 'string' ? entry.args.name.trim() : ''
  return name ? ` “${name}”` : ''
}

function titled(entry: ChangeEntry): string {
  return typeof entry.args.title === 'string' ? entry.args.title.trim() : ''
}

/**
 * One sentence per operation, keyed by operation.
 *
 * A `Record<WriteFn, …>` and not a `switch`: the switch's `default` turned a
 * forgotten case into a plausible-looking row ("duplicate scenario") that no
 * reviewer would read as a bug. Here, adding a member to `WriteFn` without
 * adding its sentence does not compile.
 */
const DESCRIBERS: Record<WriteFn, (entry: ChangeEntry) => string> = {
  create_phase: (entry) => `Added phase${named(entry)}`,
  create_scenario: (entry) => `Added scenario${named(entry)}`,
  create_path: (entry) => `Added path${named(entry)}`,
  duplicate_path: (entry) =>
    `Duplicated a path as${named(entry) || ' a copy'}`,
  duplicate_scenario: (entry) =>
    `Duplicated a blueprint as${named(entry) || ' a copy'}`,
  rename_phase: (entry) => `Renamed a phase${renameTo(entry)}`,
  rename_scenario: (entry) => `Renamed a scenario${renameTo(entry)}`,
  rename_path: (entry) => `Renamed a path${renameTo(entry)}`,
  rename_owner_tag: (entry) => {
    const from = typeof entry.args.from === 'string' ? entry.args.from : ''
    const to = typeof entry.args.to === 'string' ? entry.args.to : ''
    return from && to
      ? `Renamed owner tag “${from}” to “${to}”`
      : 'Renamed an owner tag'
  },
  add_step: (entry) => (named(entry) ? `Added step${named(entry)}` : 'Added a step'),
  add_lane: (entry) => `Added lane${named(entry)}`,
  upsert_cell: () => 'Added a cell',
  update_cell_content: () => 'Edited a cell’s text',
  update_cell_resources: () => 'Edited a cell’s resources',
  update_cell_spec: () => 'Specified function & form',
  add_evidence: (entry) =>
    titled(entry) ? `Added evidence “${titled(entry)}”` : 'Added an evidence source',
  delete_evidence: (entry) =>
    titled(entry)
      ? `Removed evidence “${titled(entry)}”`
      : 'Removed an evidence source',
  set_cell_dependency: () => 'Connected two cells',
  clear_cell_dependency: () => 'Removed a connection',
  reorder_steps: () => 'Reordered the steps',
  set_path_steps: () => 'Reordered the steps',
  reorder_lanes: () => 'Reordered the lanes',
  delete_scenario: () => 'Deleted a scenario',
  delete_path: () => 'Deleted a path',
  remove_step: () => 'Deleted a step',
  remove_lane: () => 'Deleted a lane',
  delete_cell: () => 'Deleted a cell',
  delete_slice: (entry) =>
    titled(entry) ? `Deleted slice “${titled(entry)}”` : 'Deleted a slice',
  create_slice: (entry) =>
    titled(entry) ? `Added slice “${titled(entry)}”` : 'Added a slice',
  duplicate_slice: (entry) =>
    titled(entry)
      ? `Duplicated a slice as “${titled(entry)}”`
      : 'Duplicated a slice',
  update_slice_meta: (entry) =>
    titled(entry) ? `Edited slice “${titled(entry)}”` : 'Edited a slice',
  // Named by the count, because "replaced the frames" is the one description
  // here that hides its own size: this write deletes every frame the slice
  // had, and going from twelve to one is the case the row exists to surface.
  replace_slice_frames: (entry) => {
    const count =
      typeof entry.args.frame_count === 'number' ? entry.args.frame_count : null
    return count === null
      ? 'Rebuilt a slice’s frames'
      : `Rebuilt a slice’s frames (${count} now)`
  },
}

export function describeChange(entry: ChangeEntry): string {
  const describe: ((entry: ChangeEntry) => string) | undefined =
    DESCRIBERS[entry.fn]
  // Unreachable through the type, kept for the untyped edges (a persisted
  // ledger, a hand-built entry in a test). Silence would be worse: an
  // untracked change is the one case the sheet exists to prevent.
  return describe ? describe(entry) : String(entry.fn).replace(/_/g, ' ')
}

/**
 * Group changes by the path they touched, falling back to a bucket for the
 * ones that name no path.
 *
 * A session can span blueprints, so a flat list puts two "Added a cell" rows
 * next to each other with nothing to tell them apart — the same defect as an
 * arrow picker offering three identical rows.
 */
export function groupChanges(
  list: readonly ChangeEntry[],
): Array<{ pathId: string | null; entries: ChangeEntry[] }> {
  const groups: Array<{ pathId: string | null; entries: ChangeEntry[] }> = []
  for (const entry of list) {
    // The order is narrowest-first: a call that names a path belongs with that
    // path, and only a call that names none falls back to its scenario.
    // `source_scenario_id` is `duplicate_scenario`'s — without it the row
    // landed in the no-path bucket, away from the blueprint it copied.
    const raw =
      entry.args.path_id ??
      entry.args.source_path_id ??
      entry.args.scenario_id ??
      entry.args.source_scenario_id
    const pathId = typeof raw === 'string' ? raw : null
    const existing = groups.find((group) => group.pathId === pathId)
    if (existing) existing.entries.push(entry)
    else groups.push({ pathId, entries: [entry] })
  }
  return groups
}
