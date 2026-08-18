import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { Play } from 'lucide-react'
import { BlueprintCellDetailPanel } from '@/components/blueprint/BlueprintCellDetailPanel'
import { BlueprintSlideContent } from '@/components/blueprint/BlueprintSlideContent'
import { SliceHeaderBand } from '@/components/editor/SliceHeaderBand'
import { ZoomPanViewport } from '@/components/editor/ZoomPanViewport'
import { BlueprintCellDetailProvider } from '@/contexts/BlueprintCellDetailContext'
import { useEditor } from '@/contexts/EditorContext'
import { SliceMembershipContext } from '@/contexts/sliceMembershipContext'
import { useViewState } from '@/contexts/viewStateStore'
import { useScenarioBlueprint } from '@/hooks/useScenarioBlueprint'
import { useSliceBlueprint } from '@/hooks/useSliceBlueprint'
import { resolveSliceCells } from '@/lib/sliceCells'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { NavItem } from '@/types/nav'

/**
 * Chrome that must neither re-focus nor de-focus the slice when clicked:
 * the cell detail panel, the header band, canvas nav, zoom chrome, and any
 * open walkthrough modal.
 */
const FOCUS_CLICK_IGNORE =
  '[data-cell-detail-panel], [data-editor-navbar], [data-canvas-nav], [data-zoom-indicator], [data-visual-walkthrough-modal]'

const SLICE_PAN_IGNORE =
  "button, a, input, textarea, select, label, [role='button'], [data-slide-sticky-header], [data-compare-panel], [data-zoom-indicator], [data-canvas-nav], [data-path-description-trigger], [data-cell-detail-panel], [data-visual-walkthrough-modal], [data-blueprint-cell-interactive], [data-phase-scenario-overview]"

type SliceViewProps = {
  sliceId: string
  /**
   * Where "Present" goes. Desktop's default opens a presentation tab; the
   * mobile shell has no tab strip, so it presents full-bleed instead.
   */
  onPresent?: (sliceId: string) => void
}

/**
 * Slice focus view — the normal scenario blueprint canvas (same zoom/pan
 * viewport, same cell panel) opened on the slice's scenario, with slice
 * membership applied on top: non-member cells dim via the `data-slice-focus`
 * container attribute + CSS, member cells carry outlines and sequence badges
 * (BlueprintCellButton reads SliceMembershipContext). View-only in this
 * template — authoring slices belongs to the agent tiers.
 */
export function SliceView({ sliceId, onPresent }: SliceViewProps) {
  const { openTab } = useViewState()
  const { slides } = useEditor()
  const { result, detail, items, scenarioResult, scenarioId, blueprint } =
    useSliceBlueprint(sliceId)

  const resolution = useMemo(
    () => resolveSliceCells(blueprint, items),
    [blueprint, items],
  )
  const membership = useMemo(
    () => ({
      memberCellIds: resolution.memberCellIds,
      sequenceByCellId: resolution.sequenceByCellId,
    }),
    [resolution],
  )

  const [focused, setFocused] = useState(true)

  // Click vs drag discrimination: a drag-pan also fires a click on pointer
  // up, which must not toggle the focus dim. Track the pointer-down origin
  // (capture phase, before the viewport handles it) and treat anything that
  // moved more than a few pixels as a drag.
  const pointerOrigin = useRef<{ x: number; y: number } | null>(null)
  const handleFocusPointerDownCapture = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      pointerOrigin.current = { x: event.clientX, y: event.clientY }
    },
    [],
  )

  // Clicking a member cell (re-)focuses; clicking elsewhere on the canvas
  // lifts the dim. Capture phase, because interactive cells stop click
  // propagation before it would bubble here.
  const handleFocusClickCapture = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const origin = pointerOrigin.current
      pointerOrigin.current = null
      if (
        origin &&
        Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 5
      ) {
        // Drag-pan, not a click — leave the focus state alone.
        return
      }

      const target = event.target instanceof HTMLElement ? event.target : null
      if (!target) return
      if (target.closest('[data-slice-member]')) {
        setFocused(true)
        return
      }
      if (target.closest(FOCUS_CLICK_IGNORE)) return
      setFocused(false)
    },
    [],
  )

  if (result.status === 'loading') {
    return (
      <div
        className="relative h-full min-h-0"
        role="status"
        aria-label="Loading slice"
      >
        <Skeleton className="absolute inset-0 rounded-none opacity-40" />
        <div className="relative flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-medium text-foreground">Loading slice…</p>
        </div>
      </div>
    )
  }

  if (!detail) {
    // The slice may have been deleted (possibly by another session).
    return (
      <SliceViewMessage>
        {result.status === 'error'
          ? `This slice could not be loaded: ${result.message}`
          : 'This slice could not be loaded.'}
      </SliceViewMessage>
    )
  }

  if (!scenarioId && scenarioResult.status !== 'loading') {
    return (
      <SliceViewMessage>
        The cells in this slice could not be found in any blueprint.
      </SliceViewMessage>
    )
  }

  const header = (
    <SliceHeaderBand
      detail={detail}
      // Every cell reads as missing until the blueprint lands — the notice
      // stays out of the band rather than flashing a false count.
      missingCellCount={blueprint ? resolution.missingCellIds.length : 0}
      primaryAction={{
        label: 'Present',
        icon: Play,
        onClick: () =>
          onPresent ? onPresent(sliceId) : openTab({ kind: 'present', sliceId }),
      }}
    />
  )

  const scenarioSlide = scenarioId
    ? slides.find((slide) => slide.id === scenarioId)
    : undefined

  if (!scenarioId || !scenarioSlide) {
    // The owning scenario is still resolving (or not in the nav yet) — the
    // band paints immediately, the canvas area holds a quiet skeleton.
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-col">
        {header}
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <Skeleton className="absolute inset-0 rounded-none opacity-40" />
        </div>
      </div>
    )
  }

  return (
    <SliceMembershipContext.Provider value={membership}>
      <div
        className="relative flex h-full min-h-0 min-w-0 flex-col"
        data-slice-focus={focused ? 'focused' : 'idle'}
        onPointerDownCapture={handleFocusPointerDownCapture}
        onClickCapture={handleFocusClickCapture}
      >
        {header}
        <SliceScenarioCanvas
          scenario={scenarioSlide}
          slices={{ bestPathId: blueprint?.path.id ?? null }}
        />
        {!focused && <SliceRefocusPill onRefocus={() => setFocused(true)} />}
      </div>
    </SliceMembershipContext.Provider>
  )
}

/**
 * The scenario canvas, slice posture: the same ZoomPanViewport +
 * BlueprintSlideContent pipeline the scenario detail drives, minus the
 * docked sticky header (the slice band replaces it). The path selection is
 * pinned to the path carrying the most of the slice's cells, so the members
 * always have a face to ring.
 */
function SliceScenarioCanvas({
  scenario,
  slices,
}: {
  scenario: NavItem
  slices: { bestPathId: string | null }
}) {
  const { slides } = useEditor()
  const scenarioBlueprint = useScenarioBlueprint(scenario.id)
  const { paths, selectedPathIds, setSelectedPathIds } = scenarioBlueprint

  // Pin the selection to the slice's path once per mount — after the paths
  // load, so the id resolves against a real list.
  const appliedRef = useRef(false)
  const bestPathId = slices.bestPathId
  useEffect(() => {
    if (appliedRef.current) return
    if (!bestPathId || paths.length === 0) return
    if (!paths.some((path) => path.id === bestPathId)) return
    appliedRef.current = true
    if (selectedPathIds.length !== 1 || selectedPathIds[0] !== bestPathId) {
      setSelectedPathIds([bestPathId])
    }
  }, [bestPathId, paths, selectedPathIds, setSelectedPathIds])

  const viewportResetKey = `slice:${scenario.id}:${selectedPathIds.join(',')}:${scenarioBlueprint.blueprints.length}`

  return (
    <BlueprintCellDetailProvider
      resetKey={scenario.id}
      enabled
      blueprints={scenarioBlueprint.allBlueprints}
    >
      <div
        className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
        data-slide-canvas
      >
        <ZoomPanViewport
          resetKey={viewportResetKey}
          focusCellsKey={scenario.id}
          className="absolute inset-0"
          showSequenceNav={false}
          panIgnoreSelector={SLICE_PAN_IGNORE}
        >
          <div className="px-6 md:px-8">
            <BlueprintSlideContent
              slide={scenario}
              slides={slides}
              scenarioBlueprint={scenarioBlueprint}
              phaseBlueprintFilters={null}
              showHeader={false}
              showHeaderFilters={false}
            />
          </div>
        </ZoomPanViewport>
        <BlueprintCellDetailPanel />
      </div>
    </BlueprintCellDetailProvider>
  )
}

/**
 * Floating refocus affordance at the bottom-center of the canvas, visible
 * only while de-focused. Carries `data-canvas-nav` so the outside-click
 * capture treats it as chrome (clicking it must not re-run de-focus logic).
 */
function SliceRefocusPill({ onRefocus }: { onRefocus: () => void }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-16 z-30 flex justify-center"
      data-canvas-nav=""
    >
      <button
        type="button"
        onClick={onRefocus}
        className={cn(
          'pointer-events-auto flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5',
          'text-xs font-medium text-muted-foreground shadow-md transition-colors',
          'hover:bg-accent hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        )}
      >
        <span aria-hidden>○</span>
        Showing all
        <span aria-hidden className="text-muted-foreground/60">
          ·
        </span>
        <span aria-hidden>⤺</span>
        Back to slice
      </button>
    </div>
  )
}

function SliceViewMessage({ children }: { children: string }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  )
}
