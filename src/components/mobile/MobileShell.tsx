import { useEffect, useMemo, useRef, useState } from 'react'
import { BlueprintCellDetailPanel } from '@/components/blueprint/BlueprintCellDetailPanel'
import { BlueprintSlideContent } from '@/components/blueprint/BlueprintSlideContent'
import { ZoomPanViewport } from '@/components/editor/ZoomPanViewport'
import { ServiceOverviewView } from '@/components/editor/ServiceOverviewView'
import {
  MissingSliceNotice,
  SliceUrlBootResolver,
} from '@/components/editor/EditorShell'
import { SlicePresentation } from '@/components/editor/SlicePresentation'
import { SliceView } from '@/components/editor/SliceView'
import {
  MobileNavSheet,
  type MobileNavSurface,
} from '@/components/mobile/MobileNavSheet'
import { MobilePathSelector } from '@/components/mobile/MobilePathSelector'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'
import { BlueprintCellDetailProvider } from '@/contexts/BlueprintCellDetailContext'
import { useEditor } from '@/contexts/EditorContext'
import { useViewState } from '@/contexts/viewStateStore'
import { useScenarioBlueprint } from '@/hooks/useScenarioBlueprint'
import { useSlices } from '@/hooks/useSlices'
import {
  readLastViewedPath,
  resolveDefaultPathId,
  writeLastViewedPath,
} from '@/lib/mobilePathMemory'
import {
  getMainSlides,
  getSlideDisplayLabel,
  getSubslides,
  isSubslide,
  type NavItem,
} from '@/types/nav'

/**
 * The phone's shell — the view-only visitor experience, for every tier.
 *
 * The same canvases the desktop shows: the service overview on home, a
 * scenario's blueprint canvas when one is selected, and — from this unit —
 * the slice surfaces: the drawer's Slices radio opens a slice focus view,
 * and Present covers everything full-bleed. Slice state lives in the SAME
 * tab store the desktop shell uses, so `?slice=` deep links resolve through
 * one reducer on both form factors. Nothing here can write.
 *
 * Paths are SINGLE-select on the phone: the top-bar pill picks exactly one
 * path for the showing scenario, defaulting to the last-viewed path per
 * scenario.
 */

const MOBILE_DETAIL_PAN_IGNORE =
  "button, a, input, textarea, select, label, [role='button'], [data-slide-sticky-header], [data-compare-panel], [data-zoom-indicator], [data-canvas-nav], [data-path-description-trigger], [data-cell-detail-panel], [data-visual-walkthrough-modal], [data-blueprint-cell-interactive], [data-phase-scenario-overview]"

export function MobileShell() {
  const { view, slides, openDetail, goHome, activeSlide } = useEditor()
  const { activeTab, openTab, closeTab, activateTab } = useViewState()

  const scenario =
    view === 'detail' && isSubslide(activeSlide) ? activeSlide : null
  const isHome = scenario === null

  // Slice surfaces come from the shared tab store: a `slice` tab is the
  // visible view, a `present` tab covers everything.
  const viewingSliceId = activeTab?.kind === 'slice' ? activeTab.sliceId : null
  const presentingSliceId =
    activeTab?.kind === 'present' ? activeTab.sliceId : null

  const slicesQuery = useSlices()
  const slices =
    slicesQuery.status === 'ready'
      ? slicesQuery.data
      : slicesQuery.status === 'error'
        ? (slicesQuery.fallback ?? [])
        : []
  const viewingSlice = viewingSliceId
    ? slices.find((slice) => slice.id === viewingSliceId)
    : null

  // First load: the drawer IS the index, so it opens over the overview.
  // Captured at mount — a deep link (slice) is a destination of its own, so
  // the drawer stays closed there.
  const [navOpen, setNavOpen] = useState(
    () => view === 'home' && window.location.search === '',
  )
  const [navSurface, setNavSurface] = useState<MobileNavSurface>('blueprints')

  const phases = useMemo(() => getMainSlides(slides), [slides])
  const scenariosByPhase = useMemo(
    () =>
      new Map<string, NavItem[]>(
        phases.map((phase) => [phase.id, getSubslides(phase.id, slides)]),
      ),
    [phases, slides],
  )

  // Track COLLAPSED phases (default: none) so phases that stream in from
  // the database arrive expanded — the drawer boots as a full index.
  const [collapsedPhaseIds, setCollapsedPhaseIds] = useState<
    ReadonlySet<string>
  >(() => new Set())
  const expandedPhaseIds = useMemo(
    () =>
      new Set(
        phases
          .filter((phase) => !collapsedPhaseIds.has(phase.id))
          .map((phase) => phase.id),
      ),
    [phases, collapsedPhaseIds],
  )
  const setPhaseExpanded = (phaseId: string, open: boolean) =>
    setCollapsedPhaseIds((prev) => {
      const next = new Set(prev)
      if (open) next.delete(phaseId)
      else next.add(phaseId)
      return next
    })

  const title = viewingSlice
    ? viewingSlice.title
    : scenario
      ? getSlideDisplayLabel(scenario, slides)
      : 'Service blueprint'

  // ONE path at a time: the pill drives the same selection state the
  // scenario canvas reads, but always replaces the whole selection with one
  // path. Defaults to the last-viewed path per scenario (localStorage),
  // else the happy path.
  const scenarioBlueprint = useScenarioBlueprint(scenario?.id)
  const { paths, selectedPathIds, setSelectedPathIds } = scenarioBlueprint

  const appliedForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!scenario) return
    if (paths.length === 0) return
    if (appliedForRef.current === scenario.id) return
    appliedForRef.current = scenario.id
    const resolved = resolveDefaultPathId(
      readLastViewedPath(scenario.id),
      paths,
    )
    if (resolved) setSelectedPathIds([resolved])
  }, [scenario, paths, setSelectedPathIds])

  const activePathId = scenario
    ? (selectedPathIds[0] ??
      resolveDefaultPathId(readLastViewedPath(scenario.id), paths))
    : null
  const choosePath = (pathId: string) => {
    if (!scenario) return
    setSelectedPathIds([pathId])
    writeLastViewedPath(scenario.id, pathId)
  }

  // Navigation closes the drawer so the move is visible. Selecting a
  // scenario also deactivates any slice tab (it stops covering the view).
  const openScenario = (scenarioId: string) => {
    openDetail(scenarioId)
    activateTab(null)
    setNavOpen(false)
  }
  const openOverview = () => {
    goHome()
    activateTab(null)
    setNavOpen(false)
  }
  const openSlice = (sliceId: string) => {
    openTab({ kind: 'slice', sliceId })
    setNavOpen(false)
  }

  return (
    /* svh, not vh: caps below mobile browser chrome. (uno uses h-full +
       max-h-svh because its root carries a height; this template's #root
       does not, so the shell owns its own height like DesktopEditorShell.) */
    <div className="flex h-svh max-h-svh flex-col overflow-hidden bg-background">
      <SliceUrlBootResolver />
      <MobileTopBar
        title={title}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((open) => !open)}
        rightSlot={
          !viewingSliceId && scenario && paths.length > 0 ? (
            <MobilePathSelector
              paths={paths}
              activePathId={activePathId}
              onSelect={choosePath}
            />
          ) : null
        }
      />

      {/* A dead ?slice= link: same notice desktop shows, instead of the
          link silently doing nothing. */}
      <MissingSliceNotice />

      <main className="relative min-h-0 flex-1">
        {viewingSliceId ? (
          <div className="absolute inset-0 flex min-h-0 flex-col">
            <SliceView
              key={viewingSliceId}
              sliceId={viewingSliceId}
              onPresent={(sliceId) => openTab({ kind: 'present', sliceId })}
            />
          </div>
        ) : (
          <div
            className="absolute inset-0 flex min-h-0 flex-col"
            data-editor-view
          >
            {scenario ? (
              <MobileScenarioCanvas
                key={scenario.id}
                scenario={scenario}
                slides={slides}
                scenarioBlueprint={scenarioBlueprint}
              />
            ) : (
              /* The shell's own top bar already names the view, so the
                 docked filter header is suppressed — two bars saying the
                 same thing read as clutter. */
              <ServiceOverviewView renderHeader={() => null} />
            )}
          </div>
        )}
      </main>

      <MobileNavSheet
        open={navOpen}
        onOpenChange={setNavOpen}
        surface={navSurface}
        onSurfaceChange={setNavSurface}
        slices={slices}
        slicesLoading={slicesQuery.status === 'loading'}
        phases={phases}
        scenariosByPhase={scenariosByPhase}
        slides={slides}
        expandedPhaseIds={expandedPhaseIds}
        onPhaseExpandedChange={setPhaseExpanded}
        isHome={isHome && !viewingSliceId}
        selectedScenarioId={viewingSliceId ? null : (scenario?.id ?? null)}
        onSelectOverview={openOverview}
        onSelectScenario={openScenario}
        onSelectSlice={openSlice}
      />

      {/* Presenting a slice: full-bleed over everything; Return closes the
          present tab, and the store activates the slice tab beneath it (or
          the base view for a boot ?slice=&mode=present link). The tab is
          STATE — a network flap cannot unmount this mid-read. */}
      {presentingSliceId ? (
        <div className="fixed inset-0 z-40 bg-background">
          <SlicePresentation
            key={presentingSliceId}
            sliceId={presentingSliceId}
            onReturn={() => closeTab(`present:${presentingSliceId}`)}
          />
        </div>
      ) : null}
    </div>
  )
}

/**
 * The scenario canvas, phone posture: the same ZoomPanViewport +
 * BlueprintSlideContent pipeline SlideModeMain drives on desktop, minus the
 * docked sticky header (the shell's top bar and path pill replace it).
 * Selection state lives in the shell so the pill can drive it.
 */
function MobileScenarioCanvas({
  scenario,
  slides,
  scenarioBlueprint,
}: {
  scenario: NavItem
  slides: NavItem[]
  scenarioBlueprint: ReturnType<typeof useScenarioBlueprint>
}) {
  const viewportResetKey = `${scenario.id}:${scenarioBlueprint.selectedPathIds.join(',')}:${scenarioBlueprint.blueprints.length}`
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
          panIgnoreSelector={MOBILE_DETAIL_PAN_IGNORE}
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
