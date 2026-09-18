import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { MobileScenarioTransition } from '@/components/mobile/MobileScenarioTransition'
import { CanvasModeProvider } from '@/components/editor/CanvasModeProvider'
import { ServiceOverviewView } from '@/components/editor/ServiceOverviewView'
import { StoryboardWalkthroughShell } from '@/components/blueprint/StoryboardWalkthroughShell'
import { Button } from '@/components/ui/button'
import { SlicePresentation } from '@/components/editor/SlicePresentation'
import { SliceView } from '@/components/editor/SliceView'
import { CoverPage } from '@/components/cover/CoverPage'
import { EditorErrorBoundary } from '@/components/EditorErrorBoundary'
import { useCoverContent } from '@/contexts/DeploymentConfigContext'
import { useEditor, useEditorNavCloser } from '@/contexts/EditorContext'
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
import {
  makeAgentCameraFlightWatcher,
  makeMobileAgentBridge,
} from '@/components/mobile/mobileAgentBridge'
import { focusAgentComposer } from '@/lib/agent/composerFocus'
import { waitForCanvasNavigationOutcome } from '@/lib/canvasNavigationOutcome'
import { getMainSlides, getSlideDisplayLabel, getSubslides } from '@/types/nav'
import type { NavItem } from '@/types/nav'
import { useActiveServiceId } from '@/contexts/activeService'

/**
 * The phone's shell — the view-only visitor experience, for every tier.
 *
 * ONE surface: the same canvas the desktop shows, scoped to the selected
 * phase so a phone renders one stretch of the service rather than the whole
 * board (the whole board is what used to jam the main thread). There is no
 * mobile-specific reading view (removed 2026-08-17 by request): navigation
 * is a camera move on the shared canvas — tapping a phase frames it,
 * tapping a scenario focuses it. The drawer is the index and stays closed
 * on first load — the cover is the first screen, and its CTA opens the
 * first scenario. Nothing here can write: no design
 * mode, no editors, and the agent's tool roster is filtered to reading
 * (loop.ts).
 *
 * Paths are SINGLE-select on the phone: the top-bar control picks exactly one,
 * through the same PathSelection context the desktop's PATHS checkboxes
 * drive, defaulting to the last-viewed path per scenario.
 */

export function MobileShell() {
  const {
    view,
    slides,
    slidesLoading,
    selectPhase,
    openScenario,
    selectedPhaseId,
    selectedScenarioId,
    expandedPhaseIds,
    setPhaseExpanded,
  } = useEditor()
  const { canAgent } = useSupabase()
  // The SAME tab store the desktop shell uses: slice and presentation
  // surfaces are tabs here too, so both shells agree about what is showing,
  // `?slice=` resolution lives in the shared reducer, a network flap cannot
  // unmount a presentation mid-read (the tab is state, not a derived query
  // value), and a dead link surfaces the same missing-slice notice desktop
  // shows.
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
  const cover = useCoverContent()

  // The cover is the first screen. The drawer stays closed until the reader
  // opens it — a deep link is a destination of its own and must not race it.
  const [navOpen, setNavOpen] = useState(false)
  const [navSurface, setNavSurface] = useState<MobileNavSurface>('blueprints')
  const [agentOpen, setAgentOpen] = useState(false)
  /*
    What the agent sheet takes off the bottom of the canvas.

    This is the whole reason an agent-driven jump no longer closes the sheet:
    the occluded height goes to the canvas as a fit inset, so the destination
    lands in the strip left above the panel rather than behind it, and the
    reader watches the move happen without the conversation going anywhere.
    The height is measured rather than assumed — see the sheet's own note —
    and the sheet reports 0 the moment it unmounts, so a closed sheet costs
    the camera nothing.
  */
  const [agentSheetOccludedPx, setAgentSheetOccludedPx] = useState(0)
  const closeNavDrawer = useCallback(() => setNavOpen(false), [])
  useEditorNavCloser(closeNavDrawer)

  const slicesQuery = useSlices(useActiveServiceId())
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

  /*
    The one scenario the canvas draws. A phase selection with no scenario
    resolves to that phase's first, because the phone must never render a
    whole phase row — see the note beside `ServiceOverviewView` below.
  */
  const soloScenarioId = useMemo(() => {
    if (selectedScenarioId) return selectedScenarioId
    if (!selectedPhaseId) return null
    return scenariosByPhase.get(selectedPhaseId)?.[0]?.id ?? null
  }, [selectedScenarioId, selectedPhaseId, scenariosByPhase])

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
  // 2026-08-17): the control drives the same PathSelection context the desktop
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

  const activePathId = selectedScenarioId
    ? (getSelectedPathIds(selectedScenarioId)[0] ??
      resolveDefaultPathId(readLastViewedPath(selectedScenarioId), paths))
    : null
  const choosePath = (pathId: string) => {
    if (!selectedScenarioId) return
    setSelectedPathIds(selectedScenarioId, [pathId])
    writeLastViewedPath(selectedScenarioId, pathId)
  }

  /*
    Agent-driven navigation KEEPS the sheet and leaves any slice tab for the
    base canvas. A jump should be visible, and the sheet used to buy that by
    closing — which took the conversation away mid-run, in the one moment a
    reader most needs it: the session keeps going in the module whether or not
    a surface is showing it, so a turn that failed after the jump had nowhere
    to report the failure. Now the sheet stays and the camera is told what the
    sheet covers, so the destination lands in the strip the reader can see
    through the sheet's thin, unchanging scrim.

    What the flight is still watched for is the caret: the composer gives focus
    up for the move and takes it back once the camera has settled, so the
    keyboard does not fight the jump. The watcher reads the canvas's published
    verdict and nothing reads back. The canvas keeps its own clock — it reports
    where it got to and is never told when to be there, so the caret waits on
    the camera and the camera waits on nothing.
  */
  const agentOpenRef = useRef(agentOpen)
  useEffect(() => {
    agentOpenRef.current = agentOpen
  }, [agentOpen])
  const watchCameraFlight = useMemo(
    () =>
      makeAgentCameraFlightWatcher({
        awaitOutcome: waitForCanvasNavigationOutcome,
        // The caret goes back to where the reader left it. A jump they asked
        // for in words should not cost them a tap to carry on in words.
        onSettled: focusAgentComposer,
      }),
    [],
  )
  useEffect(
    () =>
      registerAgentUiBridge(
        makeMobileAgentBridge({
          selectPhase: (phaseId) => {
            activateTab(null)
            selectPhase(phaseId)
          },
          selectScenario: (scenarioId) => {
            openScenario(scenarioId, { closeNav: true })
          },
          openAgent: () => setAgentOpen(true),
          // Read through the ref, not the state: the bridge registers once
          // and the sheet opens and closes under it, so a captured value
          // would answer for whenever this effect last ran.
          isAgentOpen: () => agentOpenRef.current,
          watchCameraFlight: (targetId) => void watchCameraFlight(targetId),
        }),
      ),
    [selectPhase, openScenario, activateTab, watchCameraFlight],
  )

  // What the shell knows about the phone's screen, for get_ui_state.
  const shellContext = [
    'Mobile shell (view-only): the shared canvas, scoped to the selected phase',
    /*
      The phase, in the same words the desktop shell reports it — and it has to
      be here and not only there, because this is the line the navigation tools
      VERIFY a selection against. Without it every agent-driven phase jump on
      the phone answered "navigation started, but the selected phase was not
      verified" while the canvas sat on exactly the phase asked for: a tool
      cannot read a selection the shell never reports, and a model told its
      navigation failed apologises for a move that landed.
    */
    phase
      ? `Selected phase: "${getSlideDisplayLabel(phase, slides)}" (${phase.id})`
      : 'Selected phase: none',
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
  const handleSelectScenario = (scenarioId: string) => {
    openScenario(scenarioId, { closeNav: true })
  }
  const openSlice = (sliceId: string) => {
    openTab({ kind: 'slice', sliceId })
    setNavOpen(false)
  }

  const hasSelection = selectedScenarioId !== null || selectedPhaseId !== null
  const isLanding = view === 'landing'

  if (isLanding) {
    return (
      <CanvasModeProvider>
        <div className="flex h-full max-h-svh flex-col overflow-hidden bg-background">
          <CoverPage content={cover} />
        </div>
      </CanvasModeProvider>
    )
  }

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
            link silently doing nothing. */}
        {missingSliceId !== null ? (
          <div className="shrink-0 border-b border-border bg-sidebar px-2 py-2">
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
              <StoryboardWalkthroughShell>
                <MobileScenarioTransition scenarioId={soloScenarioId}>
                  {(displayedScenarioId, onIncomingFitReady) => (
                    <div className="contents">
                      {/* Scoped to ONE SCENARIO, not to a phase.

                          A phone has no phase lane and no canvas navigation —
                          the drawer is the only way to move — so a sibling
                          scenario on the board is a destination the shell
                          cannot take you to, drawn at a size the device pays
                          for. A phase row is several full boards; rendering
                          the set on a phone is what takes the renderer down.

                          `soloScenarioId` wins over `soloPhaseId` inside
                          ServiceOverviewView, so a phase-only selection
                          resolves to that phase's first scenario rather than
                          falling back to the whole row.

                          The sticky phase header is suppressed — the shell's
                          own top bar already names the selection, and two bars
                          saying the same thing read as clutter. */}
                      <ServiceOverviewView
                        key={displayedScenarioId ?? 'none'}
                        soloScenarioId={displayedScenarioId ?? undefined}
                        soloPhaseId={selectedPhaseId ?? undefined}
                        renderHeader={() => null}
                        occludedBottomPx={agentSheetOccludedPx}
                        onInitialFitReady={onIncomingFitReady}
                      />
                    </div>
                  )}
                </MobileScenarioTransition>
              </StoryboardWalkthroughShell>
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
        phasesLoading={slidesLoading}
        expandedPhaseIds={expandedPhaseIds}
        onPhaseExpandedChange={setPhaseExpanded}
        selectedPhaseId={selectedPhaseId}
        selectedScenarioId={selectedScenarioId}
        onSelectSlice={openSlice}
        onSelectScenario={handleSelectScenario}
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

      {canAgent ? (
        <MobileAgentSheet
          open={agentOpen}
          onOpenChange={setAgentOpen}
          onOccludedHeightChange={setAgentSheetOccludedPx}
        />
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
