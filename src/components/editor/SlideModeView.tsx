import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { SlideNavLoadingSkeleton } from '@/components/editor/EditorLoadingSkeletons'
import {
  DeferredSkeleton,
  EDITOR_BOOT_HOLD_KEY,
} from '@/components/ui/deferred-skeleton'
import { useEditor } from '@/contexts/EditorContext'
import { NavRowAction, NavSection } from '@/components/editor/SidebarNav'
import { CreatePhaseDialog } from '@/components/editor/CreatePhaseDialog'
import { CreateBlueprintDialog } from '@/components/editor/CreateBlueprintDialog'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { findFirstServiceId } from '@/lib/service'
import { SlicesSidebarSection } from '@/components/editor/SlicesSidebarSection'
import { SlideNav } from '@/components/editor/SlideNav'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SidebarContent } from '@/components/ui/sidebar'
import { useViewState } from '@/contexts/viewStateStore'
import type { SidebarPanel } from '@/components/editor/EditorRail'

/** Sidebar body for slide mode: the blueprint and slice trees. */
export function SlideModeSidebarNav({
  panel,
}: {
  /** Which panel surface the rail selected — this component renders both. */
  panel: SidebarPanel
}) {
  const {
    slides,
    selectPhase,
    selectScenario,
    selectedPhaseId,
    selectedScenarioId,
    focusNonce,
    view,
    slidesLoading,
    slidesError,
    expandedPhaseIds,
    setPhaseExpanded,
  } = useEditor()
  const { activeKey, activateTab } = useViewState()
  const { client, canWrite } = useSupabase()
  const canvasMode = useCanvasModeValue()
  // Creating is authoring, so the sidebar's `+`s belong to Edit mode — in
  // View the sidebar navigates and nothing more.
  const authoring = canWrite && canvasMode === 'design'
  const [phasesOpen, setPhasesOpen] = useState(true)
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false)
  const [scenarioPhaseId, setScenarioPhaseId] = useState<string | null>(null)

  // The service a new phase would belong to. Resolved once and cached at
  // module level by `findFirstServiceId`, so this is a state read rather
  // than a query in the common case.
  const [serviceId, setServiceId] = useState<string | null>(null)
  useEffect(() => {
    if (!client || !canWrite) return
    let cancelled = false
    void findFirstServiceId(client)
      .then((id) => {
        if (!cancelled) setServiceId(id)
      })
      .catch(() => {
        // A missing service simply means no `+` on the section header;
        // the rest of the sidebar is unaffected.
      })
    return () => {
      cancelled = true
    }
  }, [canWrite, client])

  // The phase/scenario nav always drives the app-level (base blueprint
  // view) editor state. When a tab is active that would be invisible, so
  // selecting a phase/scenario also returns to the base view.
  const handleSelectPhase = useCallback(
    (phaseId: string) => {
      if (activeKey !== null) activateTab(null)
      selectPhase(phaseId)
    },
    [activateTab, activeKey, selectPhase],
  )
  const handleSelectScenario = useCallback(
    (scenarioId: string) => {
      if (activeKey !== null) activateTab(null)
      selectScenario(scenarioId)
    },
    [activateTab, activeKey, selectScenario],
  )
  return (
    <SidebarContent className="px-2 pt-1 pb-1">
      {panel === 'blueprints' ? (
        <>
          <NavSection
            title="Phases"
            open={phasesOpen}
            onOpenChange={setPhasesOpen}
            trailing={
              authoring && serviceId ? (
                <NavRowAction
                  label="New phase"
                  onClick={() => {
                    setPhasesOpen(true)
                    setPhaseDialogOpen(true)
                  }}
                >
                  <Plus className="size-3.5" aria-hidden />
                </NavRowAction>
              ) : undefined
            }
          >
            {slidesError && (
              <Alert variant="destructive" className="mb-2">
                <AlertTitle className="text-xs">Phases</AlertTitle>
                <AlertDescription className="text-xs">
                  {slidesError}
                </AlertDescription>
              </Alert>
            )}
            {/*
              Same loading contract as every other surface, rather than a
              bare ternary: the 250 ms hold means a warm query shows no
              skeleton at all, and a cold one fades its rows in instead of
              popping them.

              This covers a SLOW QUERY only. The boot case — entering the
              workspace from the cover, where this used to slide in already
              full of rows while the canvas was still behind its loading
              bar — belongs to the sidebar's boot lane in EditorShell,
              which covers this whole panel and lifts with the canvas.
            */}
            <DeferredSkeleton
              loading={slidesLoading}
              holdKey={EDITOR_BOOT_HOLD_KEY}
              skeleton={<SlideNavLoadingSkeleton />}
            >
              <SlideNav
                slides={slides}
                selectedPhaseId={selectedPhaseId}
                selectedScenarioId={selectedScenarioId}
                focusNonce={focusNonce}
                onSelectPhase={handleSelectPhase}
                onSelectScenario={handleSelectScenario}
                isHome={view !== 'detail'}
                expandedPhaseIds={expandedPhaseIds}
                onSetExpanded={setPhaseExpanded}
                onAddScenario={authoring ? setScenarioPhaseId : undefined}
              />
            </DeferredSkeleton>
          </NavSection>

          {/* The PATHS section moved to the canvas top bar as the compact
              multi-select (PathSelectorMenu, plan 2026-08-17-002 U2) — one
              owner for "which paths am I reading". */}

          <CreatePhaseDialog
            serviceId={serviceId}
            open={phaseDialogOpen}
            onOpenChange={setPhaseDialogOpen}
            onCreated={selectPhase}
          />

          {/*
            The phase is already chosen — it is the row the `+` was on — so the
            dialog opens with it fixed rather than asking again.
          */}
          <CreateBlueprintDialog
            open={scenarioPhaseId !== null}
            fixedPhaseId={scenarioPhaseId}
            onOpenChange={(open) => {
              if (!open) setScenarioPhaseId(null)
            }}
          />
        </>
      ) : (
        <SlicesSidebarSection />
      )}
    </SidebarContent>
  )
}
