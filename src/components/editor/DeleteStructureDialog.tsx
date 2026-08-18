import { useEffect, useId, useState } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateStructure } from '@/hooks/useSupabaseQuery'
import { deletePath, deleteScenario } from '@/lib/authoringRpc'
import { deleteSlice } from '@/lib/sliceMutations'
import {
  DELETION_NOUNS,
  confirmationMatches,
  readDeletionImpact,
  type DeletableKind,
  type ImpactSummary,
} from '@/lib/deletionSafety'

export type DeletionTarget = {
  /**
   * `DeletableKind` is narrower than the set `deletion_impact` answers for, on
   * purpose — `lane` and `step` count something other than what their delete
   * removes. See `deletionSafety.ts`.
   */
  kind: DeletableKind
  /** The row to delete. */
  id: string
  /** Typed to confirm, and shown throughout. */
  label: string
}

/**
 * Confirm a destructive change by naming everything it destroys.
 *
 * The impact is read before the dialog can be confirmed, never estimated in
 * the client: a step delete cascades to every cell in that step across
 * every path, and then to the arrows on both ends of each. A dialog that
 * counted what it could see would undercount by design.
 *
 * Typing the name is the gate. It is the one interaction that cannot be done
 * by reflex, which is the point — everything here is unrecoverable except
 * through the archive, and some of it is unrecoverable full stop.
 *
 * **This is the only confirmation UI for deleting anything structural**,
 * slices included. A second, lighter dialog for one kind is how a product
 * teaches that some deletes are casual, and none of these are.
 */
export function DeleteStructureDialog({
  target,
  open,
  onOpenChange,
  onDeleted,
}: {
  target: DeletionTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `archiveId` is null for kinds with no archive behind them (slices). */
  onDeleted?: (archiveId: string | null) => void
}) {
  const { client } = useSupabase()
  const inputId = useId()
  const [impact, setImpact] = useState<ImpactSummary | null>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  /** The impact read failed — the gate cannot open, but Try again can. */
  const [readError, setReadError] = useState<string | null>(null)
  /** The delete itself failed. Distinct: the gate stays open, retry is Delete. */
  const [writeError, setWriteError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  // Reset during render rather than in the effect. Opening the dialog on a
  // second target must not paint one frame carrying the first target's counts
  // — a confirm dialog showing the wrong numbers is the whole failure this
  // component exists to prevent.
  const session = open && target ? `${target.kind}:${target.id}` : null
  const [lastSession, setLastSession] = useState(session)
  if (lastSession !== session) {
    setLastSession(session)
    setImpact(null)
    setReadError(null)
    setWriteError(null)
    setTyped('')
    setAttempt(0)
  }

  const targetKind = target?.kind
  const targetId = target?.id
  useEffect(() => {
    if (!open || !client || targetKind === undefined || targetId === undefined) {
      return
    }
    let cancelled = false
    // Depends on the target's *fields*, not its object identity: callers build
    // this object inline, and re-reading on every parent render would cancel
    // each read before it resolved and leave the gate permanently shut.
    readDeletionImpact(client, targetKind, targetId)
      .then((result) => {
        if (!cancelled) setImpact(result)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setReadError(error instanceof Error ? error.message : String(error))
      })
    return () => {
      cancelled = true
    }
  }, [client, open, targetKind, targetId, attempt])

  if (!target) return null

  const noun = DELETION_NOUNS[target.kind]
  const confirmed = confirmationMatches(typed, target.label)
  // Nothing may be confirmed before the impact has been read: the numbers are
  // the whole reason to ask.
  const ready = impact !== null && confirmed && !busy

  const handleDelete = async () => {
    if (!client || !ready) return
    setBusy(true)
    setWriteError(null)
    try {
      let archiveId: string | null = null
      switch (target.kind) {
        case 'scenario':
          archiveId = await deleteScenario(client, target.id)
          break
        case 'path':
          archiveId = await deletePath(client, target.id)
          break
        case 'slice':
          // Frames cascade in the database; there is no archive row to return.
          await deleteSlice(client, target.id, target.label)
          break
      }
      invalidateStructure()
      onOpenChange(false)
      onDeleted?.(archiveId)
    } catch (deleteError) {
      setWriteError(
        deleteError instanceof Error ? deleteError.message : String(deleteError),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Delete {noun} “{target.label}”?
          </DialogTitle>
          <DialogDescription>
            {target.kind === 'slice'
              ? 'Slices have no archive — this one goes for good.'
              : 'Not revertible from the change list.'}
          </DialogDescription>
        </DialogHeader>

        {/* One scale for the whole body: px-6 to match the header and footer,
            py-4 to match their rhythm, gap-4 between the two blocks that make
            up the decision — what it costs, and the gate. */}
        <div
          className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto px-6 py-4"
          data-delete-impact=""
        >
          {impact === null && readError === null ? (
            <p className="text-xs text-muted-foreground">
              Counting what this would remove…
            </p>
          ) : null}

          {readError !== null ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" aria-hidden />
              <AlertDescription>
                Could not read what this would remove, so there is nothing to
                confirm against. {readError}
              </AlertDescription>
            </Alert>
          ) : null}

          {impact ? (
            <div className="flex flex-col gap-2.5">
              {/* The counts, set apart from prose. These are the consequence;
                  in a sentence they read as decoration. */}
              <div className="flex gap-2">
                {impact.facts.map((fact) => (
                  <div
                    key={fact.noun}
                    className="min-w-28 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2"
                  >
                    <div className="text-xl leading-none font-semibold tabular-nums text-destructive">
                      {fact.count}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {fact.noun}
                      {fact.count === 1 ? '' : 's'} deleted
                    </div>
                  </div>
                ))}
              </div>

              {impact.warnings.length > 0 ? (
                <ul className="flex flex-col gap-1 text-xs text-foreground/80">
                  {impact.warnings.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}

              {impact.reassurances.map((line) => (
                <p key={line} className="text-xs text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>
          ) : null}

          {impact ? (
            /* The gate gets its own surface. It is the one thing in this
               dialog that has to be done deliberately, and a bare label above
               a full-bleed input did not look like a step. */
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 px-3 py-3">
              <label
                htmlFor={inputId}
                className="text-xs font-medium text-foreground"
              >
                Type{' '}
                <span className="rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-foreground">
                  {target.label}
                </span>{' '}
                to confirm
              </label>
              <Input
                id={inputId}
                value={typed}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className="bg-background font-mono"
                onChange={(event) => setTyped(event.target.value)}
              />
            </div>
          ) : null}

          {writeError !== null ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" aria-hidden />
              <AlertDescription>{writeError}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {readError !== null ? (
            // A disabled Delete here would be a dead end with no explanation
            // of what to do next. The failure was the READ, so the action on
            // offer is the read again.
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setReadError(null)
                setAttempt((n) => n + 1)
              }}
            >
              <RotateCw aria-hidden />
              Try again
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!ready}
              onClick={() => {
                void handleDelete()
              }}
            >
              {busy ? 'Deleting…' : `Delete ${noun}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
