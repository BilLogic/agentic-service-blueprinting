import { useEffect, useMemo, useRef, useState } from 'react'
import { Info, Menu, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'
import {
  MobileNavSheet,
  type MobileNavSurface,
} from '@/components/mobile/MobileNavSheet'
import { MobileAgentSheet } from '@/components/mobile/MobileAgentSheet'
import { MobileAgentFab } from '@/components/mobile/MobileAgentFab'
import { MobilePathSelector } from '@/components/mobile/MobilePathSelector'
import { CanvasModeProvider } from '@/components/editor/CanvasModeProvider'
import { ServiceOverviewView } from '@/components/editor/ServiceOverviewView'
import { VisualWalkthroughShell } from '@/components/blueprint/VisualWalkthroughShell'
import { Button } from '@/components/ui/button'
import { SlicePresentation } from '@/components/editor/SlicePresentation'
import { SliceView } from '@/components/editor/SliceView'
import { EditorErrorBoundary } from '@/components/EditorErrorBoundary'
import { useEditor } from '@/contexts/EditorContext'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { tabKey, useViewState } from '@/contexts/viewStateStore'
import { useCanvasBlueprints } from '@/hooks/useCanvasBlueprints'
import { useCellDeepLink } from '@/hooks/useCellDeepLink'
import { usePathSelectionContext } from '@/hooks/usePathSelection'
import { useSlices } from '@/hooks/useSlices'
import {
  registerAgentUiBridge,
  registerAgentUiContext,
} from '@/lib/agent/uiBridge'
import {
  readLastViewedPath,
  resolveDefaultPathId,
  writeLastViewedPath,
} from '@/lib/mobilePathMemory'
import { makeMobileAgentBridge } from '@/components/mobile/mobileAgentBridge'
import { getMainSlides, getSlideDisplayLabel, getSubslides } from '@/types/nav'
import type { NavItem } from '@/types/nav'

/**
 * The phone's shell — the view-only visitor experience, for every tier.
 *
 * ONE surface: the same canvas the desktop shows, scoped to the selected
 * phase so a phone renders one stretch of the service rather than the whole
 * board (the whole board is what used to jam the main thread). There is no
 * mobile-specific reading view (removed 2026-08-17 by request): navigation
 * is a camera move on the shared canvas — tapping a phase frames it,
 * tapping a scenario focuses it. The drawer is the index and opens on
 * first load when nothing is selected. Nothing here can write: no design
 * mode, no editors, and the agent's tool roster is filtered to reading
 * (loop.ts).
 *
 * Paths are SINGLE-select on the phone: the top-bar pill picks exactly one,
 * through the same PathSelection context the desktop's PATHS checkboxes
 * drive, defaulting to the last-viewed path per scenario.
 */

export function MobileShell() {
  const {
    view,
    slides,
    selectPhase,
    selectScenario,
    selectedPhaseId,
    selectedScenarioId,
    expandedPhaseIds,
    setPhaseExpanded,
  } = useEditor()
  const { canAgent } = useSupabase()
  // The SAME tab store the desktop shell uses (todo 025 solution B): slice
  // and presentation surfaces are tabs here too, so both shells agree about
  // what is showing, `?slice=` resolution lives in the shared reducer, a
  // network flap cannot unmount a presentation mid-read (the tab is state,
  // not a derived query value), and a dead link surfaces the same
  // missing-slice notice desktop shows.
  const {
    pendingUrlState,
    resolvePending,
    activeTab,
    openTab,
    closeTab,
    activateTab,
    missingSliceId,
    dismissMissingSlice,
  } = useViewState()
  useCellDeepLink()

  // First load with nothing selected: the drawer IS the index, so it opens.
  // Captured at mount — a deep link (cell or slice) is a destination of its
  // own, so it keeps the drawer closed rather than racing it.
  const [navOpen, setNavOpen] = useState(
    () =>
      selectedScenarioId === null &&
      selectedPhaseId === null &&
      pendingUrlState === null,
  )
  const [navSurface, setNavSurface] = useState<MobileNavSurface>('blueprints')
  const [agentOpen, setAgentOpen] = useState(false)

  const slicesQuery = useSlices()
  const slices =
    slicesQuery.status === 'ready'
      ? slicesQuery.data
      : slicesQuery.status === 'error'
        ? (slicesQuery.fallback ?? [])
        : []

  // Resolve the boot deep link once the slice list has loaded — the same
  // handshake TabStrip performs on desktop; the reducer opens the tab (or
  // records missingSliceId) exactly once.
  useEffect(() => {
    if (pendingUrlState === null) return
    if (slicesQuery.status === 'loading') return
    resolvePending(slices.map((slice) => slice.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `slices` is derived from the query each render; keying on the status avoids re-running on referentially fresh arrays
  }, [pendingUrlState, resolvePending, slicesQuery.status])

  const phases = useMemo(() => getMainSlides(slides), [slides])
  const scenariosByPhase = useMemo(
    () =>
      new Map<string, NavItem[]>(
        phases.map((phase) => [phase.id, getSubslides(phase.id, slides)]),
      ),
    [phases, slides],
  )

  const scenario = slides.find((slide) => slide.id === selectedScenarioId)
  const phase = slides.find((slide) => slide.id === selectedPhaseId)
  // Slice surfaces come from the shared tab store: a `slice` tab is the
  // scoped canvas view, a `present` tab is the full-bleed presentation.
  const viewingSliceId = activeTab?.kind === 'slice' ? activeTab.sliceId : null
  const presentingSliceId =
    activeTab?.kind === 'present' ? activeTab.sliceId : null
  const viewingSlice = viewingSliceId
    ? slices.find((slice) => slice.id === viewingSliceId)
    : undefined
  const title = viewingSlice
    ? viewingSlice.title
    : scenario
      ? getSlideDisplayLabel(scenario, slides)
      : phase
        ? getSlideDisplayLabel(phase, slides)
        : 'Service blueprint'

  // ONE path at a time (decided 2026-08-16, single-select confirmed
  // 2026-08-17): the pill drives the same PathSelection context the desktop
  // PATHS checkboxes use — the canvas needs no mobile-specific plumbing —
  // but always replaces the whole selection with one path. Defaults to the
  // last-viewed path per scenario (localStorage), else the happy path.
  const { pathsByScenario } = useCanvasBlueprints(
    useMemo(
      () => (selectedScenarioId ? [selectedScenarioId] : []),
      [selectedScenarioId],
    ),
  )
  const { catalog, getSelectedPathIds, setSelectedPathIds } =
    usePathSelectionContext()
  // Prefer the context catalog (what the canvas has synced — the list
  // setSelectedPathIds resolves ids against); the direct query fills the
  // first frames before that sync lands.
  const paths = useMemo(() => {
    if (!selectedScenarioId) return []
    const synced = catalog[selectedScenarioId]
    if (synced && synced.length > 0) return synced
    return pathsByScenario.get(selectedScenarioId) ?? []
  }, [selectedScenarioId, catalog, pathsByScenario])

  // Apply the default once per scenario visit — but only after the canvas
  // has synced this scenario into the context catalog: setSelectedPathIds
  // resolves ids against the catalog, so applying earlier maps to an empty
  // key set and blanks the canvas ("No paths selected"). Also what
  // collapses a desktop multi-select down to one on this shell.
  const appliedForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!selectedScenarioId) return
    const catalogPaths = catalog[selectedScenarioId] ?? []
    if (catalogPaths.length === 0) return
    if (appliedForRef.current === selectedScenarioId) return
    appliedForRef.current = selectedScenarioId
    const resolved = resolveDefaultPathId(
      readLastViewedPath(selectedScenarioId),
      catalogPaths,
    )
    if (resolved) setSelectedPathIds(selectedScenarioId, [resolved])
  }, [selectedScenarioId, catalog, setSelectedPathIds])

  const activePathId = selectedScenarioId
    ? (getSelectedPathIds(selectedScenarioId)[0] ??
      resolveDefaultPathId(readLastViewedPath(selectedScenarioId), paths))
    : null
  const choosePath = (pathId: string) => {
    if (!selectedScenarioId) return
    setSelectedPathIds(selectedScenarioId, [pathId])
    writeLastViewedPath(selectedScenarioId, pathId)
  }

  // Agent-driven navigation closes the sheet first and leaves any slice tab
  // for the base canvas — a jump should be VISIBLE, not land behind an
  // opaque surface (plan 2026-08-16-002 Phase 4).
  useEffect(
    () =>
      registerAgentUiBridge(
        makeMobileAgentBridge({
          selectPhase: (phaseId) => {
            setAgentOpen(false)
            activateTab(null)
            selectPhase(phaseId)
          },
          selectScenario: (scenarioId) => {
            setAgentOpen(false)
            activateTab(null)
            selectScenario(scenarioId)
          },
          openAgent: () => setAgentOpen(true),
        }),
      ),
    [selectPhase, selectScenario, activateTab],
  )

  // What the shell knows about the phone's screen, for get_ui_state.
  const shellContext = [
    'Mobile shell (view-only): the shared canvas, scoped to the selected phase',
    scenario
      ? `Selected scenario: "${getSlideDisplayLabel(scenario, slides)}" (${scenario.id})`
      : `Selected scenario: none${view === 'home' ? ' (overview)' : ''}`,
    paths.length > 0 && activePathId
      ? `Reading path: ${paths.find((path) => path.id === activePathId)?.name ?? activePathId}`
      : null,
    `Agent sheet: ${agentOpen ? 'open' : 'closed'}`,
  ]
    .filter(Boolean)
    .join('\n')
  const shellContextRef = useRef(shellContext)
  useEffect(() => {
    shellContextRef.current = shellContext
  })
  useEffect(
    () => registerAgentUiContext('shell', () => shellContextRef.current),
    [],
  )

  // Navigation is a camera move on the one canvas; the drawer closes so the
  // move is visible. Phases are accordion headers in the drawer, not
  // destinations — only scenarios (and slices) navigate.
  const openScenario = (scenarioId: string) => {
    selectScenario(scenarioId)
    // Back to the base canvas; the tab stays open in the store (desktop
    // keeps closed-over tabs too) but stops covering the view.
    activateTab(null)
    setNavOpen(false)
  }
  const openSlice = (sliceId: string) => {
    openTab({ kind: 'slice', sliceId })
    setNavOpen(false)
  }

  const hasSelection = selectedScenarioId !== null || selectedPhaseId !== null

  return (
    <CanvasModeProvider>
      {/* min() of the two: h-full tracks embedded panes' real viewport,
          svh caps below mobile browser chrome. */}
      <div className="flex h-full max-h-svh flex-col overflow-hidden bg-background">
        <MobileTopBar
          title={title}
          navOpen={navOpen}
          onToggleNav={() => setNavOpen((open) => !open)}
          rightSlot={
            !viewingSliceId && selectedScenarioId && paths.length > 0 ? (
              <MobilePathSelector
                paths={paths}
                activePathId={activePathId}
                onSelect={choosePath}
              />
            ) : null
          }
        />

        {/* A dead ?slice= link: same notice desktop shows, instead of the
            link silently doing nothing (todo 025 acceptance). */}
        {missingSliceId !== null ? (
          <div className="shrink-0 border-b border-border bg-sidebar px-2 py-1.5">
            <Alert variant="info" className="items-center">
              <Info className="size-3.5" aria-hidden />
              <AlertDescription className="text-xs">
                That link points to a slice that no longer exists — it may
                have been deleted.
              </AlertDescription>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute top-1.5 right-1.5"
                aria-label="Dismiss"
                onClick={dismissMissingSlice}
              >
                <X className="size-3" />
              </Button>
            </Alert>
          </div>
        ) : null}

        {/* The error boundary sits HERE, inside the chrome, so a throw in
            the canvas leaves the menu and the agent reachable; its resetKey
            means navigating somewhere else clears it. The canvas subtree is
            never keyed on the selection: selecting is a camera move, not a
            remount — the remount is what used to jam the main thread. */}
        <main className="relative min-h-0 flex-1">
          <EditorErrorBoundary
            resetKey={
              (activeTab ? tabKey(activeTab) : null) ??
              selectedScenarioId ??
              selectedPhaseId ??
              'none'
            }
          >
            {viewingSliceId ? (
              <div className="absolute inset-0 flex min-h-0 flex-col">
                <SliceView
                  key={viewingSliceId}
                  sliceId={viewingSliceId}
                  onPresent={(sliceId) =>
                    openTab({ kind: 'present', sliceId })
                  }
                />
              </div>
            ) : hasSelection ? (
              <VisualWalkthroughShell>
                <div
                  className="absolute inset-0 flex min-h-0 flex-col"
                  data-editor-view
                >
                  {/* Scoped to the selected phase: a phone renders one
                      stretch of the service, never the whole board. The
                      sticky phase header is suppressed — the shell's own
                      top bar already names the selection, and two bars
                      saying the same thing read as clutter. */}
                  <ServiceOverviewView
                    soloPhaseId={selectedPhaseId ?? undefined}
                    renderHeader={() => null}
                  />
                </div>
              </VisualWalkthroughShell>
            ) : (
              <MobileEmptyState onOpenNav={() => setNavOpen(true)} />
            )}
          </EditorErrorBoundary>
        </main>
      </div>

      <MobileAgentFab canAgent={canAgent} onOpen={() => setAgentOpen(true)} />

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
        selectedPhaseId={selectedPhaseId}
        selectedScenarioId={selectedScenarioId}
        onSelectSlice={openSlice}
        onSelectScenario={openScenario}
      />

      {/* Presenting a slice: full-bleed over everything; Return closes the
          present tab, and the store activates the slice tab beneath it (or
          the base view for a boot ?slice=&mode=present link). The tab is
          STATE — a network flap cannot unmount this mid-read (todo 025). */}
      {presentingSliceId ? (
        <div className="fixed inset-0 z-40 bg-background">
          <SlicePresentation
            key={presentingSliceId}
            sliceId={presentingSliceId}
            onReturn={() => closeTab(`present:${presentingSliceId}`)}
          />
        </div>
      ) : null}

      {canAgent ? (
        <MobileAgentSheet open={agentOpen} onOpenChange={setAgentOpen} />
      ) : null}
    </CanvasModeProvider>
  )
}

/** The drawer closed on an empty shell — the one state with nothing to
 * show. Point back at the menu rather than guessing a destination. */
function MobileEmptyState({ onOpenNav }: { onOpenNav: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
      <p className="text-center text-sm text-muted-foreground">
        Pick a phase to frame its stretch of the service, or a scenario to
        zoom in on it.
      </p>
      <Button variant="outline" size="sm" onClick={onOpenNav}>
        <Menu /> Open the menu
      </Button>
    </div>
  )
}
