import { useEffect, useState } from 'react'
import { Eye, Plus, Minus, Trash2 } from 'lucide-react'
import { useCellPick } from '@/contexts/cellPickContext'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateStructure } from '@/hooks/useSupabaseQuery'
import { deleteCell } from '@/lib/authoringRpc'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'
import { reportWriteFailure } from '@/lib/writeFailures'
import { cn } from '@/lib/utils'

type Menu = { x: number; y: number; cellId: string; el: HTMLElement }

/** Roughly the menu's size, used only to keep it inside the window. */
const MENU = { width: 176, height: 108 }

/**
 * Right-click on a cell.
 *
 * One listener on the canvas rather than a menu component per cell: the grid
 * renders five hundred of them, and a wrapper each would be five hundred
 * subscriptions to pay for a menu that is open zero or one at a time.
 *
 * It exists for the same reason double-click does — while gathering cells, a
 * click picks, so reading one without joining it needs its own gesture. Two of
 * them, because a right-click is the gesture people try first and a
 * double-click is the one that costs nothing to discover by accident.
 */
export function CanvasCellContextMenu() {
  const mode = useCanvasModeValue()
  const pick = useCellPick()
  const { client, canWrite } = useSupabase()
  const [menu, setMenu] = useState<Menu | null>(null)
  // Two-step delete: the first click arms it, the second executes. A menu
  // item that deletes on one click is a misclick away from data loss; a
  // full dialog is more ceremony than one cell warrants.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (mode !== 'design') return

    const onContextMenu = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const cell = target.closest('[data-blueprint-cell][data-blueprint-cell-interactive]')
      // Anywhere that is not a cell keeps the browser's own menu — taking it
      // away from the whole canvas would cost more than this gives.
      if (!cell) return
      const cellId = cell.getAttribute('data-blueprint-cell')
      if (!cellId || !(cell instanceof HTMLElement)) return
      event.preventDefault()
      // A fresh menu is never pre-armed. Without this, opening the menu on
      // a different cell via keyboard (Menu key / Shift+F10, no pointerdown
      // to dismiss the old one) would carry the armed delete across cells.
      setConfirmingDelete(false)
      setMenu({
        x: Math.min(event.clientX, window.innerWidth - MENU.width - 8),
        y: Math.min(event.clientY, window.innerHeight - MENU.height - 8),
        cellId,
        // The element itself, not just its id: a touchpoints cell shares its id
        // with a wrapper div and with every sibling touchpoint, and re-querying by
        // id later finds the wrong one first.
        el: cell,
      })
    }

    const dismiss = (event: PointerEvent) => {
      // Not for pointerdowns inside the menu: dismissing there unmounts the
      // item before its own click can fire, and the click then retargets to
      // whatever cell sits under the pointer — which, in Edit mode, picks it.
      if (
        event.target instanceof Element &&
        event.target.closest('[data-canvas-cell-menu]')
      ) {
        return
      }
      setMenu(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null)
    }

    const dismissAll = () => setMenu(null)
    window.addEventListener('contextmenu', onContextMenu)
    // Capture phase: the pan/zoom viewport stops pointerdown propagation for
    // its own drag handling, so a bubble-phase listener never hears clicks
    // on the canvas — exactly where "click anywhere to dismiss" matters most.
    window.addEventListener('pointerdown', dismiss, true)
    window.addEventListener('blur', dismissAll)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('pointerdown', dismiss, true)
      window.removeEventListener('blur', dismissAll)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mode])

  // Re-arm on close or when the menu moves to another cell (guarded reset).
  if (!menu && confirmingDelete) setConfirmingDelete(false)

  if (!menu || mode !== 'design') return null

  const pickId = resolveBlueprintCellId(menu.cellId) ?? menu.cellId
  const picked = Boolean(pick?.isPicked(pickId))

  const destroy = async () => {
    if (!client || deleting) return
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setDeleting(true)
    try {
      await deleteCell(client, pickId)
      invalidateStructure()
      setMenu(null)
      setConfirmingDelete(false)
    } catch (error) {
      // The menu stays open on a failure — but it closes on success, so it
      // cannot be where this is said. Confirming a delete and being left
      // looking at the cell with nothing said is the case this exists for.
      reportWriteFailure('The cell was not deleted', error)
    } finally {
      setDeleting(false)
    }
  }

  /**
   * Open the cell by asking the element that was right-clicked.
   *
   * Held from the contextmenu event rather than re-queried by id — a touchpoints
   * cell shares its id with its wrapper and its sibling touchpoints, and
   * `querySelector` returns whichever comes first, which is how "View cell
   * detail" opened nothing (the wrapper has no handler) or the wrong touchpoint.
   * Dispatched as a ⌘-click, which is the grammar's open-detail gesture —
   * the one click the button is guaranteed to read as "open, touch nothing".
   */
  const viewDetail = () => {
    const element = menu.el
    setMenu(null)
    // A remount between right-click and this click leaves a detached node;
    // a click dispatched into it bubbles nowhere near React's root.
    if (!element.isConnected) return
    element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }),
    )
  }

  return (
    <div
      role="menu"
      data-canvas-cell-menu=""
      style={{ left: menu.x, top: menu.y, width: MENU.width }}
      // Positioned in viewport coordinates, so it does not scale or drift with
      // the camera the way anything inside the canvas would.
      className="fixed z-50 overflow-hidden rounded-md border border-border bg-popover p-1 text-xs shadow-md"
      onContextMenu={(event) => event.preventDefault()}
    >
      <button
        type="button"
        role="menuitem"
        onClick={viewDetail}
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-muted"
      >
        <Eye className="size-3.5 text-muted-foreground" aria-hidden />
        View cell detail
      </button>
      {pick ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            pick.pick(pickId, 'toggle')
            setMenu(null)
          }}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-muted"
        >
          {picked ? (
            <Minus className="size-3.5 text-muted-foreground" aria-hidden />
          ) : (
            <Plus className="size-3.5 text-muted-foreground" aria-hidden />
          )}
          {picked ? 'Remove from selection' : 'Add to selection'}
        </button>
      ) : null}
      {canWrite && client ? (
        <button
          type="button"
          role="menuitem"
          disabled={deleting}
          onClick={() => void destroy()}
          className={cn(
            'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left',
            confirmingDelete
              ? 'bg-destructive/10 text-destructive hover:bg-destructive/15'
              : 'text-destructive/90 hover:bg-muted',
          )}
        >
          <Trash2 className="size-3.5" aria-hidden />
          {deleting
            ? 'Deleting…'
            : confirmingDelete
              ? 'Click again to delete'
              : 'Delete cell'}
        </button>
      ) : null}
    </div>
  )
}
