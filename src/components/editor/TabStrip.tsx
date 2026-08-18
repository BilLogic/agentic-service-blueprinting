import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Info, Trash2, X } from 'lucide-react'
import { ORG_NAME } from '@/config'
import { Button } from '@/components/ui/button'
import { HomeNavButton, WorkspaceBadges } from '@/components/editor/EditorChrome'
import { IconTooltip } from '@/components/editor/IconTooltip'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DeleteStructureDialog } from '@/components/editor/DeleteStructureDialog'
import { useEditor } from '@/contexts/EditorContext'
import { useSupabase } from '@/contexts/SupabaseProvider'
import {
  tabKey,
  useViewState,
  type TabDescriptor,
} from '@/contexts/viewStateStore'
import { useSliceBlueprint } from '@/hooks/useSliceBlueprint'
import { useSlices } from '@/hooks/useSlices'
import { suppressCanvasResizeRefit } from '@/lib/canvasChromeResize'
import { cn } from '@/lib/utils'
import type { Slice } from '@/types/database'

function availableSlices(result: ReturnType<typeof useSlices>): Slice[] {
  switch (result.status) {
    case 'loading':
      return []
    case 'ready':
      return result.data
    case 'error':
      return result.fallback ?? []
  }
}

/**
 * Deleting a slice, from the tab strip or the sidebar.
 *
 * A thin adapter over `DeleteStructureDialog`, not a dialog of its own. This
 * used to be a second, lighter confirmation — one sentence and a Delete button,
 * no typed name and no count of what was about to go — which meant the app
 * taught two different lessons about how serious a delete is depending on which
 * thing you were deleting. There is now one gate, and it is the strict one.
 *
 * The only thing that stays here is the consequence a slice delete has and the
 * others do not: its open tabs have to close behind it.
 */
export function DeleteSliceDialog({
  slice,
  open,
  onOpenChange,
}: {
  slice: { id: string; title: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { closeTabsForSlice } = useViewState()

  return (
    <DeleteStructureDialog
      target={
        slice ? { kind: 'slice', id: slice.id, label: slice.title } : null
      }
      open={open}
      onOpenChange={onOpenChange}
      onDeleted={() => closeTabsForSlice(slice?.id ?? '')}
    />
  )
}

/**
 * Seeds the base blueprint view from a `?slice=` deep link (nav plan D5).
 * The slice's scenario is only known after the slice, its cells, and their
 * owning scenario resolve, so this waits for `useSliceBlueprint` rather than
 * seeding from the URL. Nothing here touches the open tab's camera: the tab
 * covers the base view, so this only decides where closing it lands.
 */
function DeepLinkBaseSeed({ sliceId }: { sliceId: string }) {
  const { scenarioId } = useSliceBlueprint(sliceId)
  const { seedBaseSelection } = useEditor()

  useEffect(() => {
    if (scenarioId === undefined) return
    seedBaseSelection(scenarioId)
  }, [scenarioId, seedBaseSelection])

  return null
}

/** A deep link that named a slice which no longer exists. */
function MissingSliceNotice({ onDismiss }: { onDismiss: () => void }) {
  // The notice occupies layout above the canvas; that height change is
  // chrome moving, not the user navigating.
  useEffect(() => {
    suppressCanvasResizeRefit()
    return () => suppressCanvasResizeRefit()
  }, [])

  return (
    <div className="shrink-0 border-b border-border bg-sidebar px-2 py-1.5">
      {/* Nothing failed and nothing is at risk — the link is just stale. That
          is information, and reserving warning for actual cautions is what
          keeps a warning worth reading. */}
      <Alert variant="info" className="items-center">
        <Info className="size-3.5" aria-hidden />
        <AlertDescription className="text-xs">
          That link points to a slice that no longer exists — it may have been
          deleted.
        </AlertDescription>
        <IconTooltip label="Dismiss this notice" side="left">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute top-1.5 right-1.5"
            aria-label="Dismiss"
            onClick={onDismiss}
          >
            <X className="size-3" />
          </Button>
        </IconTooltip>
      </Alert>
    </div>
  )
}

/**
 * Edge fades for the tab row, keyed on scroll position. A mask on the
 * scroll container itself: masks resolve against the element's box, not the
 * scrolled content, so the fade stays pinned to whichever edge has more
 * tabs behind it. A gradient mask is the whole affordance — a scroll-area
 * component would add a scrollbar this strip deliberately does not show.
 */
const TABLIST_FADE_BOTH =
  '[mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%-1.5rem),transparent)]'
const TABLIST_FADE_LEFT =
  '[mask-image:linear-gradient(to_right,transparent,black_1.5rem)]'
const TABLIST_FADE_RIGHT =
  '[mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)]'

/**
 * Tab strip above the shell main area. Holds Home plus the slice / present
 * tabs (the base blueprint view is not a tab), and always renders: Home lives
 * here rather than in the sidebar so it never competes with the disclosure
 * chevrons, and so the way back to the overview stays in the same place
 * whether the sidebar is open, collapsed or presenting.
 *
 * It also resolves URL deep links once the slice list settles (pending intent
 * — never applied before the data exists), seeds the base view from one, and
 * reports a link whose slice is gone. Slice tabs carry a context menu with
 * "Delete slice…" for writers.
 */
export function TabStrip({
  isOverview,
  onHome,
  onBase,
}: {
  /** The overview canvas is the current view, with no tab covering it. */
  isOverview: boolean
  onHome: () => void
  /** Activate the base blueprint view (deactivate any tab). */
  onBase: () => void
}) {
  const {
    tabs,
    activeKey,
    activateTab,
    closeTab,
    pendingUrlState,
    resolvePending,
    missingSliceId,
    dismissMissingSlice,
  } = useViewState()
  const { canWrite } = useSupabase()
  const slices = useSlices()
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    title: string
  } | null>(null)

  // Overflow affordance: which edges of the tab row currently hide tabs.
  // Scroll position is DOM state, so it is read from the DOM (onScroll +
  // ResizeObserver) rather than derived — there is nothing to derive from.
  const tablistRef = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState({ left: false, right: false })
  const updateFade = useCallback(() => {
    const el = tablistRef.current
    if (!el) return
    const left = el.scrollLeft > 1
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    setFade((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right },
    )
  }, [])
  useEffect(() => {
    updateFade()
    const el = tablistRef.current
    if (!el) return
    // Both the strip resizing and tabs opening/closing change scrollWidth.
    const observer = new ResizeObserver(updateFade)
    observer.observe(el)
    for (const child of el.children) observer.observe(child)
    return () => observer.disconnect()
  }, [updateFade, tabs.length])

  /**
   * WAI-ARIA tabs keyboard pattern with automatic activation: arrows move
   * focus AND activate, matching the click handlers (a click activates
   * immediately — switching views here is a cheap state change). Roving
   * tabindex lives on `aria-selected`, which automatic activation keeps in
   * lockstep with focus. Order in the DOM is [base, ...tabs], same as the
   * key list built here.
   */
  const handleTablistKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const { key } = event
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') {
      return
    }
    const tabButtons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    )
    if (tabButtons.length === 0) return
    const focused = tabButtons.indexOf(
      document.activeElement as HTMLButtonElement,
    )
    const selected = tabButtons.findIndex(
      (button) => button.getAttribute('aria-selected') === 'true',
    )
    const from = focused >= 0 ? focused : Math.max(selected, 0)
    const last = tabButtons.length - 1
    const next =
      key === 'Home'
        ? 0
        : key === 'End'
          ? last
          : // Arrows wrap, per the pattern.
            (from + (key === 'ArrowRight' ? 1 : -1) + tabButtons.length) %
            tabButtons.length
    event.preventDefault()
    tabButtons[next].focus()
    const keys: Array<ReturnType<typeof tabKey> | null> = [
      null,
      ...tabs.map(tabKey),
    ]
    const nextKey = keys[next]
    if (nextKey === null) onBase()
    else activateTab(nextKey)
  }

  // The boot deep link's slice, captured before `resolvePending` clears it.
  const [bootSliceId] = useState(() =>
    pendingUrlState !== null && pendingUrlState.kind !== 'blueprint'
      ? pendingUrlState.sliceId
      : null,
  )

  useEffect(() => {
    if (pendingUrlState === null) return
    if (slices.status === 'loading') return
    resolvePending(availableSlices(slices).map((slice) => slice.id))
  }, [pendingUrlState, resolvePending, slices])

  const notice =
    missingSliceId !== null ? (
      <MissingSliceNotice onDismiss={dismissMissingSlice} />
    ) : null
  const seed =
    bootSliceId !== null && missingSliceId === null ? (
      <DeepLinkBaseSeed sliceId={bootSliceId} />
    ) : null

  const titleById = new Map(
    availableSlices(slices).map((slice) => [slice.id, slice.title]),
  )

  const labelFor = (tab: TabDescriptor): string => {
    switch (tab.kind) {
      case 'slice':
        return `◇ ${titleById.get(tab.sliceId) ?? 'Slice'}`
      case 'present':
        return `▶ ${titleById.get(tab.sliceId) ?? 'Slice'}`
    }
  }

  return (
    <>
      {notice}
      {seed}
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-sidebar pr-2 py-1.5">
        {/* Home occupies the same 48px column as the rail below, centered,
            so the icon stack reads as one continuous left edge. The tabs then
            start exactly where the sidebar panel starts. */}
        <div className="flex w-12 shrink-0 items-center justify-center">
          <HomeNavButton
            isActive={isOverview}
            onClick={onHome}
            size="icon-sm"
          />
        </div>
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="Open views"
          onKeyDown={handleTablistKeyDown}
          onScroll={updateFade}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1 overflow-x-auto',
            fade.left && fade.right
              ? TABLIST_FADE_BOTH
              : fade.left
                ? TABLIST_FADE_LEFT
                : fade.right
                  ? TABLIST_FADE_RIGHT
                  : null,
          )}
        >
          {/* The workspace is a PERMANENT tab, not a title: same chrome as
              slice tabs, active whenever no tab covers the base view, and —
              deliberately — no close button. It replaces the old clickable
              heading, which read as a bug. */}
          <div
            className={cn(
              'flex shrink-0 items-center rounded-md border text-xs',
              activeKey === null
                ? 'border-border bg-background shadow-sm'
                : 'border-transparent hover:bg-accent',
            )}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeKey === null}
              tabIndex={activeKey === null ? 0 : -1}
              onClick={onBase}
              className={cn(
                'max-w-56 truncate px-2.5 py-1 font-medium',
                activeKey === null ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {ORG_NAME}
            </button>
          </div>
      {tabs.map((tab) => {
        const key = tabKey(tab)
        const active = key === activeKey
        const label = labelFor(tab)
        const tabElement = (
          <div
            key={key}
            className={cn(
              'flex shrink-0 items-center rounded-md border text-xs',
              active
                ? 'border-border bg-background shadow-sm'
                : 'border-transparent hover:bg-accent',
            )}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => activateTab(key)}
              className={cn(
                'max-w-56 truncate px-2.5 py-1 font-medium',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </button>
            <IconTooltip label={`Close ${label}`} side="bottom">
              <button
                type="button"
                aria-label={`Close ${label}`}
                onClick={() => closeTab(key)}
                // Out of the tab order: the tablist is one roving stop per the
                // ARIA tabs pattern, and close stays reachable via the row's
                // context menu (and pointer).
                tabIndex={-1}
                className="mr-1 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </IconTooltip>
          </div>
        )

        if (!canWrite) return tabElement

        return (
          <ContextMenu key={key}>
            <ContextMenuTrigger render={tabElement} />
            <ContextMenuContent>
              <ContextMenuItem
                variant="destructive"
                onClick={() =>
                  setDeleteTarget({
                    id: tab.sliceId,
                    title: titleById.get(tab.sliceId) ?? 'Slice',
                  })
                }
              >
                <Trash2 className="size-3.5" />
                Delete slice…
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        )
      })}
        </div>
        {/* Environment badges (authoring / edit preview) keep their home in
            the top nav, at the quiet end of the strip. */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <WorkspaceBadges />
        </div>
        <DeleteSliceDialog
          slice={deleteTarget}
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
        />
      </div>
    </>
  )
}
