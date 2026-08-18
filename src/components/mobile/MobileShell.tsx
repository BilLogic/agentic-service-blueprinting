import { useEffect, useMemo, useRef, useState } from 'react'
import { BlueprintCellDetailPanel } from '@/components/blueprint/BlueprintCellDetailPanel'
import { BlueprintSlideContent } from '@/components/blueprint/BlueprintSlideContent'
import { VisualWalkthroughShell } from '@/components/blueprint/VisualWalkthroughShell'
import { ZoomPanViewport } from '@/components/editor/ZoomPanViewport'
import { ServiceOverviewView } from '@/components/editor/ServiceOverviewView'
import { MobileNavSheet } from '@/components/mobile/MobileNavSheet'
import { MobilePathSelector } from '@/components/mobile/MobilePathSelector'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'
import { BlueprintCellDetailProvider } from '@/contexts/BlueprintCellDetailContext'
import { useEditor } from '@/contexts/EditorContext'
import { useScenarioBlueprint } from '@/hooks/useScenarioBlueprint'
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
 * The same canvases the desktop shows: the service overview on home, and a
 * scenario's blueprint canvas when one is selected. Navigation lives in the
 * drawer — the drawer IS the index and opens on first load while the
 * overview is showing. Nothing here can write: no editing surfaces mount on
 * this shell.
 *
 * Paths are SINGLE-select on the phone (ported from uno-blueprint's
 * 2026-08-17 redesign): the top-bar pill picks exactly one path for the
 * showing scenario, defaulting to the last-viewed path per scenario. A
 * side effect worth naming: with one path selected the compare surfaces
 * (stacked ⇄ merged toggle, difference ledger) never engage on the phone —
 * the same behavior uno's mobile shell ships. Multi-path compare stays a
 * desktop surface; the overview canvas still renders each scenario in its
 * stored view type.
 */

const MOBILE_DETAIL_PAN_IGNORE =
  "button, a, input, textarea, select, label, [role='button'], [data-slide-sticky-header], [data-compare-panel], [data-zoom-indicator], [data-canvas-nav], [data-path-description-trigger], [data-cell-detail-panel], [data-visual-walkthrough-modal], [data-blueprint-cell-interactive], [data-phase-scenario-overview]"

export function MobileShell() {
  const { view, slides, openDetail, goHome, activeSlide } = useEditor()

  const scenario =
    view === 'detail' && isSubslide(activeSlide) ? activeSlide : null
  const isHome = scenario === null

  // First load: the drawer IS the index, so it opens over the overview.
  // Captured at mount — navigating back home later does not re-open it.
  const [navOpen, setNavOpen] = useState(() => view === 'home')

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

  const title = scenario
    ? getSlideDisplayLabel(scenario, slides)
    : 'Service blueprint'

  // ONE path at a time: the pill drives the same selection state the
  // scenario canvas reads, but always replaces the whole selection with one
  // path. Defaults to the last-viewed path per scenario (localStorage),
  // else the happy path.
  const scenarioBlueprint = useScenarioBlueprint(scenario?.id)
  const { paths, selectedPathIds, setSelectedPathIds } = scenarioBlueprint

  // Apply the default once per scenario visit — after the paths have
  // loaded, so the id resolves against a real list. Also what collapses a
  // desktop multi-select down to one when the viewport crosses into this
  // shell mid-session.
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

  // Navigation closes the drawer so the move is visible.
  const openScenario = (scenarioId: string) => {
    openDetail(scenarioId)
    setNavOpen(false)
  }
  const openOverview = () => {
    goHome()
    setNavOpen(false)
  }

  return (
    /* svh, not vh: caps below mobile browser chrome. (uno uses h-full +
       max-h-svh because its root carries a height; this template's #root
       does not, so the shell owns its own height like DesktopEditorShell.) */
    <div className="flex h-svh max-h-svh flex-col overflow-hidden bg-background">
      <MobileTopBar
        title={title}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((open) => !open)}
        rightSlot={
          scenario && paths.length > 0 ? (
            <MobilePathSelector
              paths={paths}
              activePathId={activePathId}
              onSelect={choosePath}
            />
          ) : null
        }
      />

      <main className="relative min-h-0 flex-1">
        <VisualWalkthroughShell>
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
        </VisualWalkthroughShell>
      </main>

      <MobileNavSheet
        open={navOpen}
        onOpenChange={setNavOpen}
        phases={phases}
        scenariosByPhase={scenariosByPhase}
        slides={slides}
        expandedPhaseIds={expandedPhaseIds}
        onPhaseExpandedChange={setPhaseExpanded}
        isHome={isHome}
        selectedScenarioId={scenario?.id ?? null}
        onSelectOverview={openOverview}
        onSelectScenario={openScenario}
      />
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
