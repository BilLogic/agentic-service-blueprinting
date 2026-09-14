import { useEffect, useState } from 'react'
import { registerAgentUiCommand } from '@/lib/agent/uiCommands'
import {
  FileSearch,
  Link2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Workflow,
  X,
} from 'lucide-react'
import { ArrowLeft } from 'lucide-react'
import { CellDependencyEditor } from '@/components/blueprint/CellDependencyEditor'
import { CellDependencySections } from '@/components/blueprint/CellDependencySections'
import { CellEvidenceTab } from '@/components/blueprint/CellEvidenceTab'
import { CellInSlicesFooter } from '@/components/blueprint/CellInSlicesFooter'
import { CellDetailDifferencesSurface } from '@/components/blueprint/CellDetailDifferencesSurface'
import { CellDetailDraftSurface } from '@/components/blueprint/CellDetailDraftSurface'
import { CellDetailEmptySurface } from '@/components/blueprint/CellDetailEmptySurface'
import { CellDetailOverview } from '@/components/blueprint/CellDetailOverview'
import { PanelSurfaceSwitcher } from '@/components/blueprint/PanelSurfaceSwitcher'
import { useCellDetailFacts } from '@/components/blueprint/cellDetailFacts'
import {
  CELL_PANEL_FOOTER_ID,
  DetailPanelErrorBoundary,
  PanelDrawerShell,
  PanelFooterHost,
  PanelIdentity,
  PanelKindBadge,
} from '@/components/blueprint/panelShell'
import { CellResourcesTab } from '@/components/blueprint/CellResourcesTab'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { StoryboardStepDetailStack } from '@/components/blueprint/StoryboardStepDetailStack'
import { Button } from '@/components/ui/button'
import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useBlueprintCellDetail,
  type BlueprintPanelSurface,
} from '@/contexts/BlueprintCellDetailContext'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { useCanvasTopOffset } from '@/hooks/useCanvasTopOffset'
import { useMobileShell } from '@/hooks/useMobileShell'
import { useSupabase } from '@/contexts/SupabaseProvider'
import {
  setCompareLedgerOpen,
  useCompareReviewState,
} from '@/lib/compareReviewStore'
import {
  buildBlueprintCellSelectionForId,
  getBlueprintForPath,
  scrollBlueprintCellIntoView,
} from '@/lib/blueprintCellConnections'
import {
  buildTouchpointSelectionForItem,
  scrollBlueprintTouchpointCellIntoView,
} from '@/lib/blueprintStepTech'
import { shouldUseStoryboardContent } from '@/lib/blueprintLayout'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'
import { panelEditorBusy } from '@/lib/panelEditorBusy'
import type { DraftCellTarget } from '@/components/blueprint/CellPanelEditor'
import type { BlueprintCellSelection } from '@/types/blueprintCellDetail'

type PanelTab = 'dependencies' | 'evidence' | 'resources'

const PANEL_TABS: Array<{
  value: PanelTab
  label: string
  icon: typeof Workflow
}> = [
  { value: 'dependencies', label: 'Dependencies', icon: Workflow },
  { value: 'evidence', label: 'Evidence', icon: FileSearch },
  { value: 'resources', label: 'Resources', icon: Link2 },
]


/**
 * Side panel for the selected cell — its content, evidence, dependencies and
 * the slices it belongs to. Anchors below the sticky slide header via a
 * measured CSS variable so it never covers it.
 */
export function BlueprintCellDetailPanel() {
  return (
    <DetailPanelErrorBoundary
      logPrefix="cell-detail"
      message="This cell's details failed to display. The canvas is unaffected."
    >
      <BlueprintCellDetailPanelBody />
    </DetailPanelErrorBoundary>
  )
}

/**
 * The one snapshot of what the drawer was showing, kept only so the exit
 * animation glides out with content — a ledger-only close animates the
 * ledger, a cell close animates the cell. Cleared when the exit animation
 * completes; while the panel is open it mirrors the live state exactly, so
 * a mid-close reopen can never strand a stale flag.
 */
type PanelClosingSnapshot = {
  selection: BlueprintCellSelection | null
  draft: DraftCellTarget | null
  surface: BlueprintPanelSurface
}

function BlueprintCellDetailPanelBody() {
  const {
    selection: currentSelection,
    clearSelection,
    isOpen,
    blueprints,
    selectCell,
    draftCell,
    panelState,
    setPanelSurface,
  } =
    useBlueprintCellDetail()
  const [closing, setClosing] = useState<PanelClosingSnapshot | null>(
    panelState
      ? {
          selection: currentSelection,
          draft: draftCell,
          surface: panelState.surface,
        }
      : null,
  )
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<PanelTab>('dependencies')
  /*
    Widen/narrow is a DESKTOP control: it trades canvas width for panel
    width, and the phone's posture is a bottom sheet the full width of the
    screen with nothing to trade. The agent command stays registered in
    both postures (it just does nothing visible on a phone) — parity is
    about what the agent can reach, not about which chrome is on screen.
  */
  const mobile = useMobileShell()
  /**
   * One-shot "← Back to Differences" button: set when the ledger's ⇱ opens a
   * cell in Details, cleared when used — and whenever the panel leaves
   * Details, so it can never go stale.
   */
  const [returnToDifferences, setReturnToDifferences] = useState(false)
  const compareRegistration = useCompareReviewState().registration
  const comparing = compareRegistration !== null

  // Agent parity: the panel's own controls, registered while it is open.
  useEffect(() => {
    const unregister = [
      registerAgentUiCommand({
        name: 'cell_panel_tab',
        summary: "Switch the open cell panel's tab. arg: dependencies | evidence | resources",
        run: (arg) => {
          const tab = arg === 'evidence' || arg === 'resources' ? arg : 'dependencies'
          setActiveTab(tab)
          return `Cell panel is on the ${tab} tab.`
        },
      }),
      registerAgentUiCommand({
        name: 'cell_panel_expand',
        summary: 'Widen or shrink the open cell panel. arg: true (wide) | false (normal)',
        run: (arg) => {
          const wide = arg !== 'false'
          setExpanded(wide)
          return wide ? 'Cell panel expanded.' : 'Cell panel back to normal width.'
        },
      }),
      registerAgentUiCommand({
        name: 'cell_panel_close',
        summary: 'Close the open cell detail panel.',
        run: () => {
          clearSelection()
          return 'Cell panel closed.'
        },
      }),
    ]
    return () => unregister.forEach((fn) => fn())
  }, [clearSelection])
  const [addingDependency, setAddingDependency] = useState(false)
  const { canWrite } = useSupabase()
  // View mode presents everything read-only; every edit affordance in this
  // panel — pencils, Add dependency, resource editing — is Edit-mode only.
  const canEdit = useCanvasModeValue() === 'design' && canWrite
  const selection = currentSelection ?? closing?.selection ?? null
  const draft = draftCell ?? closing?.draft ?? null
  const activeSurface: BlueprintPanelSurface | null =
    panelState?.surface ?? closing?.surface ?? null
  /*
    `closing !== null` too, not just open: the drawer's `top` comes from the
    measured `--cell-detail-panel-top` variable, and this hook's cleanup
    REMOVES that variable. Keyed on `panelState` alone, the cleanup ran the
    instant a close began — while the exit animation still had ~150ms to
    play — so `top` fell back to the un-measured default (~53px vs the ~94px
    measured under the navbar) and the panel visibly teleported UP, then slid
    out. The variable must outlive the panel by exactly as long as the exit
    does, which is what `closing` measures.
  */
  useCanvasTopOffset(panelState !== null || closing !== null)

  /*
    The drawer's `open` is derived from `panelState`, full stop.

    It used to be its own state, synced from the selection by an effect,
    through a requestAnimationFrame, and back again through base-ui's async
    close callbacks — two owners of one fact, reconciled asynchronously,
    which is a machine for manufacturing disagreements. The reproducible
    one: close the panel, reselect a cell during the ~1s exit animation,
    and the two halves wedge — selection set, canvas dimmed, drawer
    convinced it is already open, and no edge left that could ever reopen
    it. Minutes later a delayed close callback would wipe a selection it
    had never met.

    `closing` survives only to keep the *content* rendered during the exit
    animation, and is cleared when that animation completes. panelState is
    the SINGLE owner — never OR a second boolean into this.
  */
  const drawerOpen = panelState !== null

  /*
    While the panel is open the snapshot mirrors the live state exactly —
    ONE snapshot for everything the drawer renders (selection, draft,
    surface), so a stale half from a still-animating close can never win
    over freshly opened content. Guarded render-phase set, the codebase's
    derive-during-render idiom.
  */
  if (
    panelState &&
    (closing?.selection !== currentSelection ||
      closing.draft !== draftCell ||
      closing.surface !== panelState.surface)
  ) {
    setClosing({
      selection: currentSelection,
      draft: draftCell,
      surface: panelState.surface,
    })
  }

  // One-shot hygiene for the return button (guarded render-phase set).
  if (
    returnToDifferences &&
    (activeSurface !== 'details' || !comparing)
  ) {
    setReturnToDifferences(false)
  }

  // A new cell always opens on Dependencies (state reset during render).
  // The arrow editor closes with it — a half-typed arrow carried onto a
  // different cell would be pointing away from somewhere nobody is looking.
  const currentCellId = currentSelection?.paths[0]?.cellId
  const [lastCellId, setLastCellId] = useState(currentCellId)
  if (lastCellId !== currentCellId) {
    setLastCellId(currentCellId)
    setActiveTab('dependencies')
    setAddingDependency(false)
  }

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !panelEditorBusy()) {
        clearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clearSelection, isOpen])

  // Mirror "the ledger is showing" into the compare store so surfaces with
  // no React path to this panel (get_ui_state, the strip) can read it.
  const ledgerShowing = panelState?.surface === 'differences'
  useEffect(() => {
    setCompareLedgerOpen(ledgerShowing)
    return () => setCompareLedgerOpen(false)
  }, [ledgerShowing])

  const facts = useCellDetailFacts({ blueprints, selection, draft })
  const {
    pathEntry,
    resolvedCellId,
    connections,
    selectedCell,
    cellTouchpointList,
    cellResourceList,
    laneResolution,
    otherTechEntries,
    selectedLaneRowPosition,
    dependencyCandidates,
    existingDependencies,
    dependencySource,
    storyboardStepEntries,
  } = facts

  const selectedLane = selection ? (laneResolution?.lane ?? null) : null

  /*
    The lane badge, tinted with that lane's own cell colour. Defined here
    rather than in the details branch because the DRAFT branch renders it
    too — the row a new cell is being written into is the first thing that
    branch says, and it used to say it through a hand-rolled span whose
    `backgroundColor: style.lane` was a role key ("actor"), not a colour.
    The browser dropped the declaration and the badge rendered untinted,
    which is the fault `PanelKindBadge` exists to have fixed once.
  */
  const laneBadge = laneResolution ? (
    <PanelKindBadge
      label={laneResolution.laneName}
      laneRole={laneResolution.style.lane}
      title={laneResolution.laneName}
      description={laneResolution.description}
    />
  ) : null

  // Fully closed and the exit animation has completed — nothing to render.
  if (activeSurface === null) return null

  const handleClosed = () => setClosing(null)

  const expandToggle = mobile ? null : (
    <IconTooltip
      label={expanded ? 'Narrow the panel' : 'Widen the panel'}
      side="left"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
        aria-pressed={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? <PanelRightClose /> : <PanelRightOpen />}
      </Button>
    </IconTooltip>
  )

  /*
    The Details │ Differences switcher — the two surfaces are true siblings
    of the whole panel, so their switch is TOP-LEVEL chrome, above every
    branch's own header. Rendered only while a comparison is live; outside
    compare the panel is exactly what it was before v3.
  */
  const surfaceSwitcher = comparing ? (
    <div className="flex shrink-0 items-center border-b border-muted px-4 py-2">
      <PanelSurfaceSwitcher
        value={activeSurface}
        onValueChange={setPanelSurface}
      />
    </div>
  ) : null

  const handleOpenCellFromDifferences = (
    nextSelection: BlueprintCellSelection,
  ) => {
    setReturnToDifferences(true)
    selectCell(nextSelection)
  }

  /*
    The Differences surface — the compare ledger, a true sibling of the
    cell-detail view inside the same drawer. Needs no selection.
  */
  if (activeSurface === 'differences') {
    return (
      <PanelDrawerShell
        open={drawerOpen}
        expanded={expanded}
        onCloseRequest={clearSelection}
        onClosed={handleClosed}
      >
        <CellDetailDifferencesSurface
          comparing={comparing}
          registration={compareRegistration}
          expandToggle={expandToggle}
          onSurfaceChange={setPanelSurface}
          onClose={clearSelection}
          onOpenCell={handleOpenCellFromDifferences}
        />
      </PanelDrawerShell>
    )
  }

  /*
    Draft creation: the panel opens on an empty slot's target and nothing is
    written until Save. Closing the drawer (✕, Escape, Cancel) discards the
    draft entirely — a cancelled cell never existed.
  */
  if (!selection && draft) {
    return (
      <PanelDrawerShell
        open={drawerOpen}
        expanded={expanded}
        onCloseRequest={clearSelection}
        onClosed={handleClosed}
      >
        <CellDetailDraftSurface
          draft={draft}
          laneBadge={laneBadge}
          surfaceSwitcher={surfaceSwitcher}
          onClose={clearSelection}
        />
        {/* The editor portals Create/Cancel here — panel-level footing. */}
        <PanelFooterHost id={CELL_PANEL_FOOTER_ID} />
      </PanelDrawerShell>
    )
  }

  /*
    Details surface with nothing selected — a ledger-era state: the drawer
    can sit open on Details after a surface switch with no cell picked.
    A quiet placeholder rather than a vanished drawer.
  */
  if (!selection) {
    return (
      <PanelDrawerShell
        open={drawerOpen}
        expanded={expanded}
        onCloseRequest={clearSelection}
        onClosed={handleClosed}
      >
        <CellDetailEmptySurface
          surfaceSwitcher={surfaceSwitcher}
          onClose={clearSelection}
        />
      </PanelDrawerShell>
    )
  }

  // View mode presents everything read-only, so the form — and the one Save
  // it portals into the footer below — exists only where an author may write.
  const editingCell = canEdit && resolvedCellId !== null
  const isStoryboardLane = Boolean(
    selectedLane && shouldUseStoryboardContent(selectedLane),
  )
  const handleConnectionSelect = (cellId: string) => {
    const pathId = pathEntry?.pathId
    if (!pathId) return

    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint) return

    const nextSelection = buildBlueprintCellSelectionForId(
      blueprint,
      resolveBlueprintCellId(cellId),
      selection.scenarioName,
      selection.phaseName,
    )
    if (!nextSelection) return

    selectCell(nextSelection)
    requestAnimationFrame(() => {
      scrollBlueprintCellIntoView(cellId)
    })
  }

  /*
    Edit mode's half of the Dependencies list. Null in view mode, and null is
    what makes the list read-only — the same component either way. The panel
    supplies what the rows cannot work out for themselves (who the source is,
    where an arrow may point, what already exists) plus the one navigation only
    the panel can perform.
  */
  const dependencyEditing =
    canEdit && dependencySource
      ? {
          source: dependencySource,
          candidates: dependencyCandidates,
          existing: existingDependencies,
          // The pencil NAVIGATES: the panel swaps to the cell that owns the
          // arrow, exactly as clicking any other row here does. Not a second
          // panel, and not an inline editor for another cell's row.
          onEditFromOwner: (cellId: string) => {
            setActiveTab('dependencies')
            handleConnectionSelect(cellId)
          },
        }
      : null

  const handleTechSelect = (cellId: string, techItem: string) => {
    const pathId = pathEntry?.pathId
    if (!pathId) return

    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint) return

    const nextSelection = buildTouchpointSelectionForItem(
      blueprint,
      resolveBlueprintCellId(cellId),
      techItem,
      selection.scenarioName,
      selection.phaseName,
    )
    if (!nextSelection) return

    selectCell(nextSelection)
    requestAnimationFrame(() => {
      scrollBlueprintTouchpointCellIntoView(cellId, techItem)
    })
  }

  const pathName = pathEntry?.pathName.trim() ?? ''
  const scenarioName = selection.scenarioName.trim()
  const phaseName = selection.phaseName?.trim() ?? ''
  const hasPath = Boolean(pathName && pathEntry)
  const hasScenario = Boolean(scenarioName)
  const stepCrumbLabel = `Step ${selection.stepIndex + 1}`

  const cellBreadcrumb = (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap gap-0.5 text-xs text-muted-foreground">
        {phaseName ? (
          <>
            <BreadcrumbItem className="min-w-0">
              <span className="block max-w-[5.5rem] truncate font-normal">
                {phaseName}
              </span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="[&>svg]:size-3" />
          </>
        ) : null}
        {hasScenario ? (
          <>
            <BreadcrumbItem className="shrink-0">
              <span title={scenarioName} className="cursor-default">
                <BreadcrumbEllipsis className="size-4 text-muted-foreground [&>svg]:size-3.5" />
                <span className="sr-only">{scenarioName}</span>
              </span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="shrink-0 [&>svg]:size-3" />
          </>
        ) : null}
        {hasPath ? (
          <>
            <BreadcrumbItem className="min-w-0">
              <span className="block max-w-[5.5rem] truncate font-normal">
                {pathName}
              </span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="shrink-0 [&>svg]:size-3" />
          </>
        ) : null}
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate font-medium tracking-tight text-foreground">
            {stepCrumbLabel}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )


  return (
    <PanelDrawerShell
      open={drawerOpen}
      expanded={expanded}
      onCloseRequest={clearSelection}
      onClosed={handleClosed}
    >
        {surfaceSwitcher}
        {returnToDifferences && comparing ? (
          <div className="shrink-0 px-4 pt-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md text-xs text-muted-foreground transition-colors duration-(--motion-micro) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              onClick={() => {
                setReturnToDifferences(false)
                setPanelSurface('differences')
              }}
            >
              <ArrowLeft className="size-3" aria-hidden />
              Back to Differences
            </button>
          </div>
        ) : null}
        <DrawerHeader className="flex-row items-center justify-between gap-2 pb-3 text-left">
          <div className="min-w-0 flex-1">
            <DrawerTitle className="sr-only">Cell details</DrawerTitle>
            <DrawerDescription className="sr-only">
              Details for the selected blueprint cell
            </DrawerDescription>
            {cellBreadcrumb}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {expandToggle}
            <IconTooltip label="Close cell details" side="left">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Close cell details"
                onClick={clearSelection}
              >
                <X />
              </Button>
            </IconTooltip>
          </div>
        </DrawerHeader>

        {isStoryboardLane ? (
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4 blueprint-scroll">
            {/*
              A storyboard cell titles itself with the STEP, not the lane: the
              frames below belong to the moment, not to the row they were
              drawn on.
            */}
            <PanelIdentity badge={laneBadge} title={selection.stepName} meta="" />
            <StoryboardStepDetailStack entries={storyboardStepEntries} />
          </div>
        ) : (
          <>
            {/*
              Overview content is not a tab — it always renders inline at the
              top; the tab row (Dependencies default) sits below it and both
              share one scroll area.
            */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto blueprint-scroll">
              <div className="flex flex-col gap-5 px-4 pb-5">
                <CellDetailOverview
                  facts={facts}
                  selection={selection}
                  selectedLane={selectedLane}
                  laneBadge={laneBadge}
                  editingCell={editingCell}
                  isStoryboardLane={isStoryboardLane}
                  onDone={clearSelection}
                />
              </div>
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as PanelTab)}
                className="gap-0"
              >
                <TabsList
                  variant="line"
                  className="h-auto w-full justify-start gap-4 rounded-none border-b border-muted px-4 pb-0"
                >
                  {PANEL_TABS.map(({ value, label, icon: TabIcon }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="h-auto flex-none gap-1.5 rounded-none px-0 pb-2 pt-0 text-xs font-normal text-tertiary-foreground hover:text-muted-foreground data-active:text-foreground after:bottom-[-1px] after:bg-foreground/70"
                    >
                      <TabIcon className="size-3" aria-hidden />
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {/*
                  Reserved height: the three tabs have very different
                  content lengths, and without a floor the panel jumped a
                  couple of hundred pixels on every switch. Cheaper and
                  steadier than easing the height.
                */}
                <div className="flex min-h-56 flex-col gap-5 px-4 pt-4 pb-4">
                  {activeTab === 'dependencies' ? (
                    <>
                      <CellDependencySections
                        // Keyed on the cell, so the row whose note field is
                        // open does not carry over to the next cell.
                        key={resolvedCellId ?? 'no-cell'}
                        connections={connections}
                        otherTech={otherTechEntries}
                        selectedLaneRowPosition={selectedLaneRowPosition}
                        editing={dependencyEditing}
                        onCellSelect={handleConnectionSelect}
                        onTechSelect={handleTechSelect}
                      />
                      {canEdit && dependencySource ? (
                        addingDependency ? (
                          <CellDependencyEditor
                            source={dependencySource}
                            candidates={dependencyCandidates}
                            existing={existingDependencies}
                            onDone={() => setAddingDependency(false)}
                          />
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="self-start px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => setAddingDependency(true)}
                          >
                            <Plus className="size-3" aria-hidden />
                            Add dependency
                          </Button>
                        )
                      ) : null}
                    </>
                  ) : null}
                  {activeTab === 'evidence' ? (
                    <CellEvidenceTab cellId={resolvedCellId} />
                  ) : null}
                  {activeTab === 'resources' ? (
                    <CellResourcesTab
                      cellId={resolvedCellId}
                      resources={cellResourceList}
                      touchpoints={cellTouchpointList}
                      frame={selectedCell?.frame ?? null}
                    />
                  ) : null}
                </div>
              </Tabs>
            </div>
            {/* The editor portals Save/Cancel here — below the tabs, shared
                footing for every property the panel holds. */}
            {editingCell ? (
              <PanelFooterHost id={CELL_PANEL_FOOTER_ID} />
            ) : null}
            <CellInSlicesFooter cellId={pathEntry?.cellId ?? null} />
          </>
        )}
    </PanelDrawerShell>
  )
}
