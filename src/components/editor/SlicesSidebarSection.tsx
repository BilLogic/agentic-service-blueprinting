import { useState } from 'react'
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react'
import { DeleteSliceDialog } from '@/components/editor/TabStrip'
import { NavRow, NavSection } from '@/components/editor/SidebarNav'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
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
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { duplicateSlice, sliceToken, updateSliceMeta } from '@/lib/sliceMutations'
import { isSliceType } from '@/lib/sliceValidation'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useViewState } from '@/contexts/viewStateStore'
import { useSlices, type SliceListEntry } from '@/hooks/useSlices'

/** Sidebar group order — unknown types fall into CUSTOM. */
const SLICE_TYPE_GROUPS = ['journey', 'step', 'lane', 'cell', 'custom'] as const

type SliceTypeGroup = (typeof SLICE_TYPE_GROUPS)[number]

function sliceTypeGroup(sliceType: string): SliceTypeGroup {
  const type = sliceType.toLowerCase()
  return SLICE_TYPE_GROUPS.find((group) => group === type) ?? 'custom'
}

function SliceRow({
  slice,
  isActive,
  isOpenInactive,
  onOpen,
  onPresent,
  onDelete,
  onRename,
  onDuplicate,
  canWrite,
}: {
  slice: SliceListEntry
  /** This slice's tab is the active one. */
  isActive: boolean
  /** This slice has an open tab that is not the active one. */
  isOpenInactive: boolean
  onOpen: () => void
  onPresent: () => void
  onDelete: () => void
  onRename: () => void
  onDuplicate: () => void
  canWrite: boolean
}) {
  // Same row component, states and indent as the Phases tree: the active tab
  // gets the selected fill + rail, an open-but-inactive tab gets the marker
  // dot, everything else is plain.
  const row = (
    <NavRow
      label={slice.title}
      icon="◇"
      size="sm"
      onSelect={onOpen}
      selected={isActive}
      ancestor={isOpenInactive}
    />
  )

  return (
    <ContextMenu>
      {/* A plain wrapper takes the trigger's props: NavRow renders two
          sibling buttons, so there is no single element to merge them onto. */}
      <ContextMenuTrigger className="block w-full">{row}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onOpen}>
          <ExternalLink className="size-3.5" />
          Open in new tab
        </ContextMenuItem>
        <ContextMenuItem onClick={onPresent}>
          <Play className="size-3.5" />
          Present
        </ContextMenuItem>
        {canWrite ? (
          <>
            <ContextMenuItem onClick={onRename}>
              <Pencil className="size-3.5" />
              Rename…
            </ContextMenuItem>
            <ContextMenuItem onClick={onDuplicate}>
              <Copy className="size-3.5" />
              Duplicate
            </ContextMenuItem>
            <ContextMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="size-3.5" />
              Delete slice…
            </ContextMenuItem>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  )
}

/**
 * Slices sidebar mode — the lifecycle's slices grouped by `slice_type` into
 * accordion sections (JOURNEY / STEP / LANE / CELL / CUSTOM; only non-empty
 * groups render, all open by default). Click (or the context menu) opens the
 * slice tab; writers can delete from the context menu.
 */
export function SlicesSidebarSection() {
  const slices = useSlices()
  const { openTab, tabs, activeKey } = useViewState()
  const { client, canWrite } = useSupabase()
  // Edit mode only, like every other authoring affordance in this sidebar.
  const mode = useCanvasModeValue()
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    title: string
  } | null>(null)
  const [renameTarget, setRenameTarget] = useState<SliceListEntry | null>(null)
  // Tracked as the *collapsed* set rather than the open one: a group the
  // user never touched stays open even when it first appears (slices load
  // late, new types get created), while an explicit collapse survives the
  // list changing under it. The old `key={groups.join('|')}` remount reset
  // every group whenever a slice was created or deleted.
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  )

  const rows: SliceListEntry[] =
    slices.status === 'ready'
      ? slices.data
      : slices.status === 'error'
        ? (slices.fallback ?? [])
        : []

  const groups = SLICE_TYPE_GROUPS.map((type) => ({
    type,
    slices: rows.filter((slice) => sliceTypeGroup(slice.slice_type) === type),
  })).filter((group) => group.slices.length > 0)

  if (groups.length === 0) {
    return (
      // Teaching tone, matching the agent panel's empty states: say what a
      // slice is and the two real routes to one (the Edit-mode Make slice
      // flow in CanvasDesignTools, or the agent's /sb:slice skill).
      <p className="px-3 py-1.5 text-xs leading-relaxed text-sidebar-foreground/50">
        No slices yet — a slice is a stakeholder view cut from the blueprint.
        In Edit mode, pick cells and press Make slice, or ask the agent with
        /sb:slice.
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <NavSection
          key={group.type}
          title={group.type}
          open={!collapsedGroups.has(group.type)}
          onOpenChange={(open) =>
            setCollapsedGroups((collapsed) => {
              const next = new Set(collapsed)
              if (open) next.delete(group.type)
              else next.add(group.type)
              return next
            })
          }
        >
          <ul className="flex flex-col gap-0.5">
            {group.slices.map((slice) => (
              <li key={slice.id}>
                <SliceRow
                  slice={slice}
                  isActive={
                    activeKey === `slice:${slice.id}` ||
                    activeKey === `present:${slice.id}`
                  }
                  isOpenInactive={
                    activeKey !== `slice:${slice.id}` &&
                    activeKey !== `present:${slice.id}` &&
                    tabs.some((tab) => tab.sliceId === slice.id)
                  }
                  canWrite={canWrite && mode === 'design'}
                  onOpen={() => openTab({ kind: 'slice', sliceId: slice.id })}
                  onPresent={() =>
                    openTab({ kind: 'present', sliceId: slice.id })
                  }
                  onDelete={() =>
                    setDeleteTarget({ id: slice.id, title: slice.title })
                  }
                  onRename={() => setRenameTarget(slice)}
                  onDuplicate={() => {
                    if (!client) return
                    void duplicateSlice(client, slice.id)
                      .then((copy) => {
                        invalidateQueries('slices')
                        openTab({ kind: 'slice', sliceId: copy.id })
                      })
                      .catch((duplicateError) => {
                        console.error(
                          '[slices] duplicate failed:',
                          duplicateError,
                        )
                      })
                  }}
                />
              </li>
            ))}
          </ul>
        </NavSection>
      ))}
      <DeleteSliceDialog
        slice={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      />
      <RenameSliceDialog
        slice={renameTarget}
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null)
        }}
      />
    </div>
  )
}

/**
 * Rename a slice — title and subtitle, the two fields creating one asks for.
 *
 * `updateSliceMeta` is a guarded update: it carries the `updated_at` the row
 * was loaded with and matches on it, so a rename typed over a slice someone
 * else has since changed fails rather than silently overwriting them. That is
 * also why the whole meta goes back — type, actor and origin are re-sent
 * unchanged rather than dropped.
 */
function RenameSliceDialog({
  slice,
  open,
  onOpenChange,
}: {
  slice: SliceListEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { client } = useSupabase()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-seed on every open, cleared on close — keying on slice.id kept a
  // cancelled edit's junk alive for the same slice, one Enter from saving.
  const [seeded, setSeeded] = useState(false)
  if (open && slice && !seeded) {
    setSeeded(true)
    setTitle(slice.title)
    setDescription(slice.description ?? '')
    setError(null)
  }
  if (!open && seeded) setSeeded(false)

  const save = async () => {
    if (!client || !slice || busy || !title.trim()) return
    setBusy(true)
    setError(null)
    let outcome
    try {
      outcome = await updateSliceMeta(client, slice.id, sliceToken(slice), {
        title,
        description,
        sliceType: isSliceType(slice.slice_type) ? slice.slice_type : 'custom',
        actor: slice.actor ?? '',
        origin: slice.origin ?? 'human',
      })
    } catch (renameError) {
      setBusy(false)
      setError(
        renameError instanceof Error ? renameError.message : String(renameError),
      )
      return
    }
    setBusy(false)
    if (outcome.status === 'ok') {
      invalidateQueries('slices')
      onOpenChange(false)
      return
    }
    // `readWriteOutcome` throws on a real error, so the only other outcome
    // is a lost race on `updated_at`.
    setError('This slice changed somewhere else. Reopen it and try again.')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename slice</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2.5 px-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Title</span>
            <Input
              value={title}
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void save()
              }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Subtitle{' '}
              <span className="font-normal text-muted-foreground/70">
                · optional
              </span>
            </span>
            <Input
              value={description}
              placeholder="What this slice shows, and who it is for"
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
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
            disabled={busy || !title.trim()}
            onClick={save}
          >
            {busy ? 'Renaming…' : 'Rename'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
