import { useSyncExternalStore, useEffect, useRef, useState } from 'react'
import { Check, Crosshair, History, Undo2 } from 'lucide-react'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBlueprintCellDetailOptional } from '@/contexts/BlueprintCellDetailContext'
import { registerAgentUiCommand } from '@/lib/agent/uiCommands'
import { registerAgentUiContext } from '@/lib/agent/uiBridge'
import {
  clearSession,
  currentAgentSessionId,
  describeChange,
  forgetChange,
  groupChanges,
  sessionHasDestructive,
  sessionSnapshot,
  subscribeToSession,
  type ChangeEntry,
} from '@/lib/authoringSession'
import { scrollBlueprintCellIntoView } from '@/lib/blueprintCellConnections'
import { executeRevert } from '@/lib/revertChange'
import { invalidateQueries, invalidateStructure } from '@/hooks/useSupabaseQuery'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { cn } from '@/lib/utils'

/** Server snapshot for SSR — there is no session before hydration. */
const EMPTY: ChangeEntry[] = []

function useSessionChanges(): ChangeEntry[] {
  return useSyncExternalStore(subscribeToSession, sessionSnapshot, () => EMPTY)
}

/**
 * Entries with a revert currently executing. Module-level and shared by the
 * row button and ⌘Z on purpose: `forgetChange` only runs after the network
 * resolves, so without this a second trigger in that window re-reverts the
 * same entry — for a creation, that is `delete_cell` twice.
 */
const revertsInFlight = new Set<string>()

/**
 * A Revert all run is under way.
 *
 * Separate from the set above because that set is keyed per entry, and during
 * a revert-all exactly one id is ever in it — the one currently awaiting. So
 * it cannot answer "is anything reverting?", which is the question both other
 * entry points have to ask. ⌘Z asking `revertsInFlight.size > 0` was right by
 * accident (the run always has one in flight); the row button asked only its
 * own local `busy` and was admitted straight through the middle of a run.
 */
let revertAllRunning = false

/** True while any revert path is executing — the one gate all three share. */
function isRevertInFlight(): boolean {
  return revertAllRunning || revertsInFlight.size > 0
}

/**
 * What one call to `revertEntry` did. `'already-in-flight'` is not a success:
 * the entry was neither reverted nor removed, so a caller that read a
 * resolved promise as "done" would drop it from its own report and leave the
 * user believing a change was taken back that is still there.
 */
type RevertOutcome = 'reverted' | 'already-in-flight'

/**
 * One entry a Revert all run did not take back.
 *
 * The id, not the prose, is what is stored: the report is filtered against the
 * live list at render, so it can never name a row that is no longer there. And
 * the reason travels with it — "had no inverse" and "had one and it threw" are
 * different facts about what to do next (the first is permanent, the second
 * often succeeds once its blocker is gone), and they rendered identically when
 * only the label was kept and the error went to the console.
 */
type LeftBehind = {
  id: string
  label: string
  reason: string
  kind: 'no-inverse' | 'failed'
}

/** Revert one entry and clean up after it — shared by the row and ⌘Z. */
async function revertEntry(
  client: NonNullable<ReturnType<typeof useSupabase>['client']>,
  entry: ChangeEntry,
): Promise<RevertOutcome> {
  if (revertsInFlight.has(entry.id)) return 'already-in-flight'
  revertsInFlight.add(entry.id)
  try {
    await executeRevert(client, entry)
    // The change is gone from the database, so it leaves the list — and the
    // grid re-reads, because every revert is structural or content-bearing.
    forgetChange(entry.id)
    // The full structural set, the same one every other mutation site sends.
    // Two keys was this path's own subset, and it is why reverting a
    // duplicated path left the copy in the sidebar's PATHS list with an id
    // that 404s until a reload.
    invalidateStructure()
    const cellId =
      typeof entry.args.cell_id === 'string' ? entry.args.cell_id : null
    if (cellId) {
      invalidateQueries(`cell-content:${cellId}`)
      invalidateQueries(`cell-spec:${cellId}`)
      // Evidence caches under its own key with explicit-only revalidation;
      // without this, undoing "Added evidence" keeps rendering the deleted
      // row in an open Evidence tab for the rest of the session.
      invalidateQueries(`evidence:${cellId}`)
    }
    // Slices cache under their own keys, which `invalidateStructure` does not
    // touch. Without this, undoing a frame rewrite left the slice tab and the
    // open frame editor rendering the frames the database no longer had — the
    // same class of failure the `evidence:` line above was added for, and one
    // only reachable now that a slice write HAS a revert.
    const sliceId =
      typeof entry.args.slice_id === 'string' ? entry.args.slice_id : null
    if (sliceId) {
      invalidateQueries('slices')
      invalidateQueries(`slice:${sliceId}`)
    }
    return 'reverted'
  } finally {
    revertsInFlight.delete(entry.id)
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  )
}

/**
 * ⌘Z reverts the most recent change that captured an inverse.
 *
 * Scoped away from text fields — inside an input the browser's own undo is
 * the one people mean. Skips entries with no inverse (deletes) rather than
 * silently doing nothing forever: the newest revertible change is the
 * answer to "undo" even when a non-revertible one landed after it.
 */
function useUndoHotkey(changes: ChangeEntry[]) {
  const { client } = useSupabase()

  useEffect(() => {
    if (!client || changes.length === 0) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z')
        return
      if (event.shiftKey || event.altKey) return
      if (isEditableTarget(event.target)) return
      // One undo at a time. Key repeat fires long before the network
      // resolves; letting each press grab "the next entry" would rip
      // through the whole session on one held key — and a press landing
      // inside a Revert all run would race the run's own iteration.
      if (isRevertInFlight()) return
      const last = changes.findLast((entry) => entry.revert)
      if (!last) return
      event.preventDefault()
      void revertEntry(client, last).catch((error) => {
        console.error('[authoring] ⌘Z revert failed:', error)
      })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [changes, client])

  // Agent parity: the same undo the ⌘Z path runs, plus "keep changes".
  useEffect(() => {
    if (!client) return
    const unregister = [
      registerAgentUiCommand({
        name: 'undo_last_change',
        description:
          "Undo the newest revertible change of this session (same as ⌘Z). One at a time. Note this reverts whatever is newest — INCLUDING the human's own edit if theirs came last; say whose change you are undoing before firing it.",
        // Reverting a creation runs delete_cell / delete_scenario /
        // delete_path. That is data, not interface — so it counts as a
        // write everywhere writes are counted.
        mutates: true,
        run: async () => {
          if (isRevertInFlight())
            return 'An undo is already in flight — wait for it.'
          const last = changes.findLast((entry) => entry.revert)
          if (!last) return 'Nothing revertible in this session.'
          // Awaited, not fire-and-forget: a rejected revert used to reach
          // the console only, while the model was told it had succeeded
          // and reported that to the user.
          try {
            const outcome = await revertEntry(client, last)
            if (outcome === 'already-in-flight')
              return 'That change was already being taken back — nothing else happened.'
            return `Reverted: ${describeChange(last)}`
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            throw new Error(`Undo failed and nothing changed: ${message}`, {
              cause: error,
            })
          }
        },
      }),
      registerAgentUiCommand({
        name: 'keep_all_changes',
        description:
          "Accept the session's changes (clears the change sheet). This DISCARDS every captured revert — after it, nothing in the session can be taken back. Refused when the session holds destructive changes; those need the human's own confirm.",
        // It writes no rows, which is why this was unmarked — and why the
        // omission mattered. Clearing the ledger is the only thing standing
        // between the user and permanent loss of every revert in the session:
        // it is strictly less recoverable than the undo beside it, which IS
        // marked. Marked, it counts against the write batch, is refused for a
        // view-only session, and the live list tells the model it changes
        // data before it fires.
        mutates: true,
        run: () => {
          if (sessionHasDestructive(changes))
            return 'This session contains destructive changes — the human must confirm those in the Changes sheet themselves.'
          clearSession()
          return 'Changes kept; the change sheet is clear. Every revert in it is now gone — nothing from this session can be taken back.'
        },
      }),
      registerAgentUiCommand({
        name: 'revert_my_changes',
        description:
          "Take back the changes YOU made in this agent session, newest first, leaving the human's own edits and other sessions' edits alone. Reports what it took back and names anything it could not, with the reason. Prefer this over firing undo_last_change repeatedly — that walks the whole session including the human's edits, in no guaranteed order, and reports nothing.",
        mutates: true,
        run: () => revertAgentSession(client),
      }),
      registerAgentUiCommand({
        name: 'revert_all_changes',
        description:
          "WITHHELD, and listed here so you can see that it is: reverting the WHOLE session — the human's own edits included — is a human-only control (Revert all, in the Changes sheet). Firing this explains that and does nothing. Use revert_my_changes for your own edits.",
        run: () =>
          'Reverting the whole session is human-only: it would take back the human’s own edits as well as yours, and that decision is theirs to make in the Changes sheet (the Revert all button, which asks first). Nothing was changed. revert_my_changes takes back only what you did — tell the user that is what you can offer.',
      }),
    ]
    return () => unregister.forEach((fn) => fn())
  }, [changes, client])
}

/**
 * Take back this agent session's own entries, newest first.
 *
 * Deliberately NOT `revertAll` with a filter — it walks the same shape but
 * over a different set, and shares the parts that matter: `revertEntry` (so
 * the in-flight guard, `forgetChange` and every cache invalidation are the
 * proven ones), the module-level run flag (so a row button or ⌘Z landing
 * mid-run is refused rather than double-executing an inverse), and the
 * re-read-from-the-store loop (a captured array goes stale the moment a
 * concurrent revert or a human save touches the ledger).
 *
 * The scope comes from `currentAgentSessionId()` — the attribution the tool
 * dispatcher set — and not from an argument, so the model cannot name a
 * session that is not its own.
 */
async function revertAgentSession(
  client: NonNullable<ReturnType<typeof useSupabase>['client']>,
): Promise<string> {
  const sessionId = currentAgentSessionId()
  if (!sessionId)
    return 'This command is only available to the agent, and no agent session is attributed right now.'
  if (isRevertInFlight()) return 'A revert is already in flight — wait for it.'

  const mine = (entry: ChangeEntry) =>
    entry.author === 'agent' && entry.agentSessionId === sessionId
  if (!sessionSnapshot().some(mine))
    return 'You have not made any changes in this session, so there is nothing of yours to take back.'

  const reverted: string[] = []
  const leftBehind: string[] = []
  const seen = new Set<string>()
  revertAllRunning = true
  try {
    for (;;) {
      // Newest first, mine only, and only ones this run has not answered for
      // — the failures stay in the ledger, so they would otherwise be the
      // loop's own termination bug.
      const entry = sessionSnapshot().findLast(
        (item) => mine(item) && !seen.has(item.id),
      )
      if (!entry) break
      seen.add(entry.id)
      const label = describeChange(entry)
      if (!entry.revert) {
        leftBehind.push(`${label} — nothing was recorded that could undo it`)
        continue
      }
      try {
        const outcome = await revertEntry(client, entry)
        if (outcome === 'already-in-flight') {
          leftBehind.push(`${label} — it was already being taken back elsewhere`)
        } else {
          reverted.push(label)
        }
      } catch (error) {
        leftBehind.push(
          `${label} — ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  } finally {
    revertAllRunning = false
  }

  // Both halves, always. "Reverted 4 changes" with two silent failures is the
  // report that gets relayed to the user as if the slate were clean.
  const lines = [
    reverted.length > 0
      ? `Took back ${reverted.length} of your change${reverted.length === 1 ? '' : 's'}:\n${reverted.map((line) => `  ${line}`).join('\n')}`
      : 'Took back none of your changes.',
  ]
  if (leftBehind.length > 0) {
    lines.push(
      `Could NOT take back ${leftBehind.length}, still in the change list:\n${leftBehind.map((line) => `  ${line}`).join('\n')}`,
    )
  }
  lines.push("The human's own edits were not touched.")
  return lines.join('\n')
}

/**
 * What has changed since Edit was turned on, and the way to keep it.
 *
 * Appears only once something has changed — a permanent Save on a canvas that
 * has already saved everything is a control that lies at rest.
 *
 * It replaces undo and redo rather than joining them. Undo is positional; this
 * is addressable. Having added a step, a lane and a cell, wanting the lane back
 * should not mean undoing two things you meant to keep. (Per-row revert lands
 * with the inverse operations; the list itself is what carries the value now.)
 */
export function SessionChangesSheet() {
  const changes = useSessionChanges()
  const detail = useBlueprintCellDetailOptional()
  const { client } = useSupabase()
  /** `'save'` = the destructive-save gate; `'revert'` = the Revert all gate. */
  const [confirming, setConfirming] = useState<'save' | 'revert' | null>(null)
  const [reverting, setReverting] = useState(false)
  /** What Revert all could not take back — named, never silently dropped. */
  const [leftBehind, setLeftBehind] = useState<LeftBehind[]>([])
  useUndoHotkey(changes)

  /*
    Agent parity: `get_ui_state` gains a `changes` line.

    Without it the agent could LIST the session (get_change_history) but not
    see the state of the control that governs it — so it could not tell that a
    confirm was already armed, or that a revert run was under way, and
    "reverting…" plus a second revert request is the collision the module-level
    gate has to refuse. It reports even at zero, because "no unsaved changes"
    is a fact worth grounding an answer on.

    Ref-snapshotted, registered once: the contributor must stay stable across
    renders (re-registering every render would churn the map) while still
    reading current values. Same shape as EditorShell's `shell` contributor.
  */
  const changesContext = [
    `changes: ${changes.length} in this session`,
    `${changes.filter((entry) => entry.revert).length} revertible`,
    `${changes.filter((entry) => entry.author === 'agent').length} made by an agent`,
    confirming === null ? 'no confirm armed' : `confirm armed: ${confirming}`,
    reverting ? 'a revert run is IN FLIGHT' : 'no revert in flight',
  ].join(', ')
  const changesContextRef = useRef(changesContext)
  useEffect(() => {
    changesContextRef.current = changesContext
  })
  useEffect(
    () => registerAgentUiContext('changes', () => changesContextRef.current),
    [],
  )

  /*
    The sheet unmounts nothing when the ledger empties — the early return
    below is after every hook, so this component's state outlives the list it
    describes. Left alone, opening "Take back 3 changes?" and then emptying
    the ledger (Save, ⌘Z, or a successful Revert all) meant the next unrelated
    edit re-rendered the sheet *already armed*: a live red Revert all over a
    change the person had just made. Reset in render, the house pattern
    (BlueprintCellDetailPanel, DeleteStructureDialog, StructureRowMenu).
  */
  const empty = changes.length === 0
  const [lastChanges, setLastChanges] = useState(changes)
  if (lastChanges !== changes) {
    setLastChanges(changes)
    // Any session mutation retires the report: it named the state of one run,
    // and a list that has moved on since is not that state.
    if (leftBehind.length > 0) setLeftBehind([])
    if (empty) setConfirming(null)
  }

  if (empty) return null

  const destructive = sessionHasDestructive(changes)
  const groups = groupChanges(changes)
  const revertible = changes.filter((entry) => entry.revert)
  const unrevertible = changes.length - revertible.length
  // The report may only name rows that are still on screen above it. Its whole
  // job is to say which of the remaining rows are there because they could not
  // go — a line about a row that is gone says the opposite of the truth.
  const stillHere = leftBehind.filter((item) =>
    changes.some((entry) => entry.id === item.id),
  )

  // A path id is only nameable if the canvas has that blueprint loaded. When it
  // does not — the change was made somewhere since navigated away from — the
  // group says so rather than printing a uuid.
  const pathLabel = (pathId: string | null): string => {
    if (!pathId) return 'This service'
    const blueprint = detail?.blueprints.find((entry) => entry.path.id === pathId)
    return blueprint ? blueprint.path.name : 'Elsewhere in this service'
  }

  const save = () => {
    if (destructive && confirming !== 'save') {
      setConfirming('save')
      return
    }
    clearSession()
    setConfirming(null)
  }

  /**
   * Take back everything this session can take back.
   *
   * Newest first, one at a time, through the very same `revertEntry` the row
   * button and ⌘Z use — so the in-flight guard, the `forgetChange`, and every
   * cache invalidation are the ones already proven. Sequential rather than
   * `Promise.all` because these inverses are ordered: a cell added into a lane
   * added in the same session has to go before the lane does.
   *
   * Entries with no captured inverse (a `delete_slice` has no archive to
   * restore from) are not reverted and not dropped — they stay in the list and
   * get named underneath it. A revert that throws is treated the same way: the
   * run continues, and the failure is reported by name and by reason rather
   * than leaving the user to diff the list against their memory.
   *
   * The list is re-read from the store on every iteration rather than captured
   * once. A captured array goes stale the moment anything else touches the
   * ledger mid-run — a row revert admitted concurrently, or a background agent
   * write landing — and the loop would then run an inverse against an entry
   * that had already been taken back and forgotten. For two edits to one cell
   * that writes an intermediate value nobody chose, with an empty ledger and
   * no way back; for a creation it throws and reports a change as "not taken
   * back" when it was. Re-reading makes those entries simply absent.
   */
  const revertAll = async () => {
    if (!client || reverting || isRevertInFlight()) return
    setConfirming(null)
    setLeftBehind([])
    setReverting(true)
    revertAllRunning = true
    const failed: LeftBehind[] = []
    const seen = new Set<string>()
    try {
      for (;;) {
        // Newest first, and only entries this run has not already answered
        // for — the failures stay in the list, so they would otherwise be
        // the loop's own termination bug.
        const entry = sessionSnapshot().findLast((item) => !seen.has(item.id))
        if (!entry) break
        seen.add(entry.id)
        if (!entry.revert) {
          failed.push({
            id: entry.id,
            label: describeChange(entry),
            reason: 'nothing was recorded that could undo it',
            kind: 'no-inverse',
          })
          continue
        }
        try {
          const outcome = await revertEntry(client, entry)
          if (outcome === 'already-in-flight') {
            failed.push({
              id: entry.id,
              label: describeChange(entry),
              reason: 'it was already being taken back somewhere else',
              kind: 'failed',
            })
          }
        } catch (error) {
          console.error('[authoring] revert all failed on an entry:', error)
          failed.push({
            id: entry.id,
            label: describeChange(entry),
            reason: error instanceof Error ? error.message : String(error),
            kind: 'failed',
          })
        }
      }
    } finally {
      // In the finally, all of it: anything thrown outside the inner try used
      // to skip the report entirely and surface as an unhandled rejection —
      // the spinner stopped, nothing was said, and it read as success.
      revertAllRunning = false
      setReverting(false)
      setLeftBehind(failed)
    }
  }

  /*
    One control, not two. The flag counter and the Save button used to sit
    side by side — the same fact (unsaved changes exist) wearing two faces.
    Now Save changes *is* the trigger: clicking it opens the list above,
    where the changes are reviewed, individually reverted, and confirmed —
    the same pattern as slice creation's popup. Saving requires seeing what
    is being kept.
  */
  return (
    <>
      <DropdownMenu>
        {/*
          No tooltip. "Changes 2" beside a history icon already says what the
          button is, and the only thing a tooltip could add — "opens a list" —
          is what one click teaches for good.
        */}
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Review ${changes.length} changes`}
              className="pointer-events-auto h-7 shrink-0 gap-1.5 border border-primary/30 bg-primary/10 px-2.5 text-xs text-primary hover:bg-primary/15 hover:text-primary"
            >
              <History className="size-3.5" aria-hidden />
              Changes
              <span className="tabular-nums">{changes.length}</span>
            </Button>
          }
        />

        {/*
          Upward, like everything anchored to this bar: it sits on the bottom
          edge of the window, so a menu hanging down is clipped — and growing up
          over the canvas puts the list beside the cells it names.
        */}
        <DropdownMenuContent
          side="top"
          align="end"
          className="w-80 p-0 text-xs"
          data-session-sheet=""
        >
          <div className="border-b border-muted px-3 py-2">
            <p className="font-medium text-foreground">
              {changes.length} change{changes.length === 1 ? '' : 's'}
            </p>
            {/*
              The one thing the interface cannot teach by itself: these writes
              already landed, so Save is not a write — it is the moment the way
              back closes. Everything else the header used to say (that a list
              is a list, that reverting is possible) the rows demonstrate.
            */}
            <p className="mt-0.5 text-2xs text-muted-foreground">
              Already saved — Save just clears the list.
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {groups.map((group) => (
              <div key={group.pathId ?? 'service'} className="px-1 py-1">
                {/*
                  The group label separates; with one group there is nothing to
                  separate it from, and "THIS SERVICE" over the entire list is a
                  heading for the obvious.
                */}
                {groups.length > 1 ? (
                  <p className="px-2 py-1 text-3xs font-medium tracking-wide text-muted-foreground uppercase">
                    {pathLabel(group.pathId)}
                  </p>
                ) : null}
                {group.entries.map((entry) => (
                  <ChangeRow key={entry.id} entry={entry} reverting={reverting} />
                ))}
              </div>
            ))}
          </div>

          {/*
            Three footers, one row. Idle offers both exits; each confirm state
            replaces the whole row so there is never a live Save sitting beside
            a question about reverting.
          */}
          <div className="flex items-center gap-2 border-t border-muted px-3 py-2">
            {confirming === 'revert' ? (
              <>
                <p className="min-w-0 flex-1 text-2xs text-foreground">
                  Take back {revertible.length} change
                  {revertible.length === 1 ? '' : 's'}?
                  {unrevertible > 0
                    ? ` ${unrevertible} can’t be taken back.`
                    : ''}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-xs"
                  onClick={() => setConfirming(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-7 shrink-0 px-2.5 text-xs"
                  onClick={() =>
                    void revertAll().catch((error: unknown) => {
                      console.error('[authoring] revert all failed:', error)
                    })
                  }
                >
                  Revert all
                </Button>
              </>
            ) : confirming === 'save' ? (
              <>
                <p className="min-w-0 flex-1 text-2xs text-foreground">
                  Deletes become permanent.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-xs"
                  onClick={() => setConfirming(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 shrink-0 gap-1.5 px-2.5 text-xs"
                  onClick={save}
                >
                  <Check className="size-3.5" aria-hidden />
                  Keep changes
                </Button>
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1" />
                {revertible.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 gap-1.5 px-2 text-xs text-muted-foreground"
                    disabled={reverting}
                    onClick={() => setConfirming('revert')}
                  >
                    <Undo2
                      className={cn('size-3.5', reverting && 'animate-pulse')}
                      aria-hidden
                    />
                    {reverting ? 'Reverting…' : 'Revert all'}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  className="h-7 shrink-0 gap-1.5 px-2.5 text-xs"
                  disabled={reverting}
                  onClick={save}
                >
                  <Check className="size-3.5" aria-hidden />
                  Save
                </Button>
              </>
            )}
          </div>

          {/*
            Only ever rendered when something survived Revert all — the entries
            it names are still in the list above, so this says which of the
            remaining rows are there because they could not go, not because the
            run stopped early.
          */}
          {stillHere.length > 0 ? (
            <div className="flex flex-col gap-1 border-t border-muted px-3 py-2">
              {stillHere.map((item) => (
                <p key={item.id} className="text-2xs text-destructive">
                  {item.kind === 'no-inverse'
                    ? `Couldn’t be taken back — ${item.label}: ${item.reason}.`
                    : `Failed — ${item.label}: ${item.reason}`}
                </p>
              ))}
            </div>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

function ChangeRow({
  entry,
  /**
   * A Revert all run is under way. The row must refuse *visibly* — greyed out
   * rather than silently ignoring the click — because the run is walking this
   * same list and a row revert admitted alongside it is the double-execute
   * this component's whole in-flight guard exists to prevent.
   */
  reverting,
}: {
  entry: ChangeEntry
  reverting: boolean
}) {
  const { client } = useSupabase()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cellId =
    typeof entry.args.cell_id === 'string'
      ? entry.args.cell_id
      : typeof entry.args.source_cell_id === 'string'
        ? entry.args.source_cell_id
        : null

  const revert = async () => {
    // `isRevertInFlight()` and not just `busy`: `disabled` closes the pointer
    // path but not a programmatic one, and the module-level gate is the only
    // thing that knows about the other two entry points.
    if (!client || busy || reverting || isRevertInFlight()) return
    setBusy(true)
    setError(null)
    try {
      const outcome = await revertEntry(client, entry)
      if (outcome === 'already-in-flight') {
        setError('That change is already being taken back.')
        setBusy(false)
      }
    } catch (revertError) {
      setError(
        revertError instanceof Error ? revertError.message : String(revertError),
      )
      setBusy(false)
    }
  }

  return (
    <div
      className={cn(
        'group/change flex flex-col rounded-md px-2 py-1.5',
        'hover:bg-muted/60',
      )}
    >
      <div className="flex items-center gap-2">
        {/* ✦ marks a change the canvas agent made. Nothing else differs —
            same revert, same Save gate; the badge is the entire distinction. */}
        {entry.author === 'agent' ? (
          <span
            className="shrink-0 text-3xs text-primary"
            title="Made by the agent"
            aria-label="Made by the agent"
          >
            ✦
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate text-foreground/85">
          {describeChange(entry)}
        </span>
        {cellId ? (
          <IconTooltip label="Scroll the board to this cell">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Show me where"
              onClick={() => scrollBlueprintCellIntoView(cellId)}
              className="text-muted-foreground opacity-0 group-hover/change:opacity-100 focus-visible:opacity-100"
            >
              <Crosshair aria-hidden />
            </Button>
          </IconTooltip>
        ) : null}
        {entry.revert ? (
          <IconTooltip label="Revert this change">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Revert this change"
              disabled={busy || reverting}
              onClick={() => void revert()}
              className="text-muted-foreground opacity-0 group-hover/change:opacity-100 focus-visible:opacity-100"
            >
              <Undo2 className={cn(busy && 'animate-pulse')} aria-hidden />
            </Button>
          </IconTooltip>
        ) : null}
      </div>
      {error ? (
        <p className="mt-0.5 text-3xs text-destructive">{error}</p>
      ) : null}
    </div>
  )
}
