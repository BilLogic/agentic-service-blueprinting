import { useEffect, useState } from 'react'
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  DeleteStructureDialog,
  type DeletionTarget,
} from '@/components/editor/DeleteStructureDialog'
import { CreateBlueprintDialog } from '@/components/editor/CreateBlueprintDialog'
import { CreatePhaseDialog } from '@/components/editor/CreatePhaseDialog'
import { CreateVersionDialog } from '@/components/editor/CreateVersionDialog'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useArchiveAvailable } from '@/hooks/useArchiveAvailable'
import { useScenarioPaths } from '@/hooks/useScenarioPaths'
import { invalidateStructure } from '@/hooks/useSupabaseQuery'
import {
  duplicatePath,
  duplicateScenario,
  renamePath,
  renamePhase,
  renameScenario,
} from '@/lib/authoringRpc'
import { deletionReadiness } from '@/lib/deletionSafety'
import { findFirstServiceId } from '@/lib/service'

export type StructureKind = 'phase' | 'scenario' | 'path'

/** Singular noun for each tier, for menu copy. */
const KIND_NOUN: Record<StructureKind, string> = {
  phase: 'phase',
  scenario: 'scenario',
  path: 'path',
}

/**
 * Right-click on a phase, scenario or path row — rename, duplicate, add a
 * sibling, delete.
 *
 * This replaced the hover-revealed `⋯` button: the row's own hover state is
 * signal enough, and a per-row button was one more piece of chrome saying
 * what right-click already says. There is therefore only ONE place these
 * entries can live, and no second affordance to keep in sync — the row's `+`
 * is a *different* action (it creates a CHILD; this menu's New creates a
 * SIBLING), which is why both exist and why they read differently.
 *
 * One component for all three kinds because the *shape* is identical and the
 * differences are facts, not code paths:
 *
 * - **Duplicate** exists where a deep-copy operation does: `duplicate_path`
 *   for a path, `duplicate_scenario` for a scenario. A phase has neither a
 *   duplicate nor a delete, and offering one without the other would make an
 *   accidental copy permanent, so a phase shows no Duplicate rather than an
 *   irreversible one.
 * - **New <kind>** is the same dialog the sidebar's own `+` opens, aimed one
 *   tier up: a scenario's New reopens `CreateBlueprintDialog` with the
 *   right-clicked row's *parent phase* fixed, so the sibling lands where the
 *   click implied and nothing asks the user to say it twice.
 * - **Delete** covers paths and scenarios; `delete_phase` does not exist yet.
 *
 * Renders children unwrapped — no menu at all — for sessions that cannot
 * write or surfaces in View mode.
 */
export function StructureRowContextMenu({
  kind,
  id,
  name,
  phaseId,
  scenarioId,
  children,
}: {
  kind: StructureKind
  /**
   * The row's real uuid. `null` means the caller cannot name one row — the
   * overview path list folds same-named paths from several scenarios into a
   * single entry — and the menu then does not open at all, rather than
   * offering a rename that would fail at the database.
   */
  id: string | null
  name: string
  /**
   * The phase a scenario row belongs to. Without it the row can still be
   * renamed, duplicated and deleted; only "New scenario" needs somewhere to
   * put the sibling, so it is the one entry that hides when this is absent.
   */
  phaseId?: string
  /** Required for path deletes, which are scoped by their scenario. */
  scenarioId?: string
  children: React.ReactNode
}) {
  const { client, canWrite } = useSupabase()
  const mode = useCanvasModeValue()
  const archiveAvailable = useArchiveAvailable()
  const [renaming, setRenaming] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<DeletionTarget | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Separate from `error`, which belongs to the rename dialog's own field. */
  const [duplicateError, setDuplicateError] = useState<string | null>(null)

  // Edit mode only. Renaming and deleting are authoring, and View mode's
  // whole premise is that nothing on screen changes anything.
  if (!canWrite || !client || mode !== 'design' || id === null)
    return <>{children}</>

  const canDelete =
    kind !== 'phase' && deletionReadiness(archiveAvailable).canDelete
  // A phase copy could not be undone — see the component doc.
  const canDuplicate = kind !== 'phase'
  const canCreateSibling =
    kind === 'phase' ||
    (kind === 'scenario' && phaseId !== undefined) ||
    (kind === 'path' && scenarioId !== undefined)

  const duplicate = async () => {
    if (!canDuplicate || busy) return
    setBusy(true)
    try {
      // "(copy)" rather than " copy": the parentheses survive a truncating
      // sidebar row as the last thing you read, and they are what every
      // other tool in this space writes.
      const copyName = `${name} (copy)`
      if (kind === 'path')
        await duplicatePath(client, { sourcePathId: id, name: copyName })
      else
        await duplicateScenario(client, {
          sourceScenarioId: id,
          name: copyName,
        })
      invalidateStructure()
    } catch (duplicateFailure) {
      // Never swallowed. The bare `catch {}` that used to sit here made a
      // refused duplicate — a tier guard, a name collision — indistinguishable
      // from a menu item that does not work: the click closed the menu and
      // nothing appeared, anywhere.
      setDuplicateError(
        duplicateFailure instanceof Error
          ? duplicateFailure.message
          : String(duplicateFailure),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger className="block w-full">
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="text-xs">
          <ContextMenuItem onClick={() => setRenaming(true)}>
            <Pencil className="size-3.5" aria-hidden />
            Rename
          </ContextMenuItem>
          {canDuplicate ? (
            <ContextMenuItem disabled={busy} onClick={duplicate}>
              <Copy className="size-3.5" aria-hidden />
              Duplicate
            </ContextMenuItem>
          ) : null}
          {canCreateSibling ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => setCreating(true)}>
                <Plus className="size-3.5" aria-hidden />
                New {KIND_NOUN[kind]}
              </ContextMenuItem>
            </>
          ) : null}
          {canDelete ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                onClick={() =>
                  setDeleting({
                    kind: kind === 'scenario' ? 'scenario' : 'path',
                    id,
                    label: name,
                  })
                }
              >
                <Trash2 className="size-3.5" aria-hidden />
                Delete {kind}
              </ContextMenuItem>
            </>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>

      <RenameDialog
        kind={kind}
        id={id}
        currentName={name}
        open={renaming}
        onOpenChange={(next) => {
          setRenaming(next)
          if (!next) setError(null)
        }}
        error={error}
        onError={setError}
      />

      {/*
        Mounted only while open. Each of these dialogs reads a catalog to
        populate itself (phases, lane sources, the scenario's versions), and a
        sidebar renders one of these menus per row — keeping them mounted
        would fire those reads once per row for a menu nobody opened.
      */}
      {creating ? (
        <SiblingCreateDialog
          kind={kind}
          phaseId={kind === 'phase' ? undefined : phaseId}
          scenarioId={scenarioId}
          onClose={() => setCreating(false)}
        />
      ) : null}

      <DeleteStructureDialog
        target={deleting}
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      />

      <Dialog
        open={duplicateError !== null}
        onOpenChange={(open) => {
          if (!open) setDuplicateError(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Couldn’t duplicate this {kind}</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="size-3.5" aria-hidden />
            <AlertDescription className="text-xs">
              {duplicateError}
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              type="button"
              size="sm"
              onClick={() => setDuplicateError(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * The "New <kind>" branch — the same three dialogs the sidebar's `+` buttons
 * open, so a sibling created from the menu is indistinguishable from one
 * created from the header. Nothing new is written here.
 */
function SiblingCreateDialog({
  kind,
  phaseId,
  scenarioId,
  onClose,
}: {
  kind: StructureKind
  phaseId?: string
  scenarioId?: string
  onClose: () => void
}) {
  if (kind === 'phase') return <NewSiblingPhaseDialog onClose={onClose} />
  if (kind === 'scenario')
    return (
      <CreateBlueprintDialog
        open
        fixedPhaseId={phaseId ?? null}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
      />
    )
  return <NewSiblingPathDialog scenarioId={scenarioId} onClose={onClose} />
}

/**
 * A phase belongs to a service, and there is exactly one in this workspace —
 * resolved the same way the sidebar header's `+` resolves it, through the
 * module-level cache in `findFirstServiceId`, so opening the menu on a
 * phase row costs at most one query per session.
 */
function NewSiblingPhaseDialog({ onClose }: { onClose: () => void }) {
  const { client } = useSupabase()
  const [serviceId, setServiceId] = useState<string | null>(null)

  useEffect(() => {
    if (!client) return
    let cancelled = false
    void findFirstServiceId(client)
      .then((id) => {
        if (!cancelled) setServiceId(id)
      })
      .catch(() => {
        // The dialog's own Create button stays disabled without a service,
        // which is the same state the header `+` shows.
      })
    return () => {
      cancelled = true
    }
  }, [client])

  return (
    <CreatePhaseDialog
      serviceId={serviceId}
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    />
  )
}

/**
 * A path belongs to exactly one scenario, so there is nothing to
 * disambiguate — but the dialog needs that scenario's existing versions to
 * check the new name against and to offer as a copy source.
 */
function NewSiblingPathDialog({
  scenarioId,
  onClose,
}: {
  scenarioId?: string
  onClose: () => void
}) {
  const paths = useScenarioPaths(scenarioId ?? null)
  const data = paths.status === 'ready' ? paths.data : null

  // The menu item is only offered when a scenarioId exists; this is the
  // in-flight moment before its catalog arrives.
  if (!data) return null

  return (
    <CreateVersionDialog
      scenarioId={scenarioId as string}
      scenarioName={data.scenarioName}
      versions={data.versions}
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    />
  )
}

function RenameDialog({
  kind,
  id,
  currentName,
  open,
  onOpenChange,
  error,
  onError,
}: {
  kind: StructureKind
  id: string
  currentName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  error: string | null
  onError: (message: string | null) => void
}) {
  const { client } = useSupabase()
  const [name, setName] = useState(currentName)
  const [busy, setBusy] = useState(false)

  // Re-seed on every open — the field starts at the name being changed, not
  // at whatever a cancelled edit left behind. Cleared on close rather than
  // keyed on id+name, which kept abandoned junk alive for the same row.
  const [seeded, setSeeded] = useState(false)
  if (open && !seeded) {
    setSeeded(true)
    setName(currentName)
  }
  if (!open && seeded) setSeeded(false)

  const save = async () => {
    // Busy is its own case: a second Enter mid-request must not dismiss the
    // dialog — the failure would then land in a closed dialog and resurface,
    // stale, on the next open.
    if (busy) return
    if (!client || !name.trim() || name.trim() === currentName) {
      onOpenChange(false)
      return
    }
    setBusy(true)
    onError(null)
    try {
      if (kind === 'phase')
        await renamePhase(client, {
          phaseId: id,
          name,
          previousName: currentName,
        })
      else if (kind === 'scenario')
        await renameScenario(client, {
          scenarioId: id,
          name,
          previousName: currentName,
        })
      else
        await renamePath(client, { pathId: id, name, previousName: currentName })
      invalidateStructure()
      onOpenChange(false)
    } catch (renameError) {
      onError(
        renameError instanceof Error ? renameError.message : String(renameError),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Rename {kind}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 px-6">
          <Input
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void save()
            }}
          />
          {error ? (
            <Alert variant="warning">
              <AlertTriangle className="size-3.5" aria-hidden />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy || !name.trim()}
            onClick={save}
          >
            {busy ? 'Renaming…' : 'Rename'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
