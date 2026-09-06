import { useEffect, useMemo, useState } from 'react'
import { registerAgentUiCommand } from '@/lib/agent/uiCommands'
import {
  ExternalLink,
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
import { CompareDifferencesSurface } from '@/components/blueprint/CompareDifferencesSurface'
import { CellDependencySections } from '@/components/blueprint/CellDependencySections'
import { CellEvidenceTab } from '@/components/blueprint/CellEvidenceTab'
import { CellInSlicesFooter } from '@/components/blueprint/CellInSlicesFooter'
import { CellOverviewSpec } from '@/components/blueprint/CellOverviewSpec'
import { CellContentSection } from '@/components/blueprint/CellContentSection'
import { CellPanelEditor } from '@/components/blueprint/CellPanelEditor'
import {
  CELL_PANEL_FOOTER_ID,
  DetailPanelErrorBoundary,
  PanelDrawerShell,
  PanelFooterHost,
} from '@/components/blueprint/panelShell'
import { CellResourcesTab } from '@/components/blueprint/CellResourcesTab'
import {
  FeaturedButtons,
  FeaturedPreviewFrame,
} from '@/components/blueprint/FeaturedResources'
import { featuredPresentation } from '@/lib/resourcePresentation'
import {
  TOUCHPOINT_ROLE_DEFINITION,
  TOUCHPOINT_ROLE_LABEL,
} from '@/lib/touchpointRole'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { TouchpointCellFace } from '@/components/blueprint/TouchpointCellFace'
import { VisualStepDetailStack } from '@/components/blueprint/VisualStepDetailStack'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/editor/SegmentedControl'
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
  getBlueprintCellConnections,
  getBlueprintForPath,
  getLinkedTechFromConnections,
  getSelectedCellLaneRowPosition,
  scrollBlueprintCellIntoView,
} from '@/lib/blueprintCellConnections'
import {
  buildTouchpointSelectionForItem,
  getBlueprintStepTechItems,
  scrollBlueprintTouchpointCellIntoView,
} from '@/lib/blueprintStepTech'
import { shouldUseTouchpointCellContent, shouldUseStoryboardContent } from '@/lib/blueprintLayout'
import { BLUEPRINT_THEME } from '@/lib/blueprintTheme'
import { resolveCellDetailImages } from '@/lib/blueprintTechPictures'
import {
  getBlueprintLaneStyle,
  getBlueprintLaneZone,
} from '@/lib/blueprintTheme'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'
import {
  resolveTechCellDetailLabel,
  resolveTechCellDetailText,
  resolveTechCellDetailUrl,
} from '@/lib/blueprintTechDescriptions'
import { cellResources } from '@/lib/cellResources'
import { cellTouchpoints } from '@/lib/cellTouchpoints'
import { resolveStoryboardStripEntries } from '@/lib/visualWalkthrough'
import { panelEditorBusy } from '@/lib/panelEditorBusy'
import { cn } from '@/lib/utils'
import type { ExistingDependency } from '@/components/blueprint/CellDependencyEditor'
import type { DraftCellTarget } from '@/components/blueprint/CellPanelEditor'
import type { DependencyEndpoint } from '@/lib/dependencyValidation'
import type {
  BlueprintCell,
  CellResource,
  CellTouchpoint,
} from '@/types/blueprint'
import type { BlueprintCellSelection } from '@/types/blueprintCellDetail'

/**
 * Where a cell sits, said so that two cells never say the same thing.
 *
 * Step names are not unique — a blueprint may run several columns all called
 * "Discovers the service" — so the column number leads. Without it the picker
 * offers three identical rows and choosing between them is a coin flip.
 */
function cellPositionLabel(
  stepIndex: number,
  stepName: string,
  laneName: string,
): string {
  const column = stepIndex >= 0 ? `${stepIndex + 1}. ` : ''
  return `${column}${stepName} · ${laneName}`
}

/** Fixed panel and illustration frame so every row/step uses the same size. */
const CELL_DETAIL_PICTURE_FRAME_CLASS =
  'relative aspect-[4/3] w-full max-w-full shrink-0 overflow-hidden rounded-lg bg-muted/20'
const CELL_DETAIL_PICTURE_CLASS =
  'absolute inset-0 h-full w-full object-contain object-center'
const CELL_DETAIL_LOGO_CLASS =
  'size-32 shrink-0 rounded-lg bg-muted/20 p-2 object-contain object-center'

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
 * The cell as this panel needs it, from either source.
 *
 * `touchpoints` and `resources` are resolved once at the top rather than
 * threaded as the raw link array they used to be: the database has two
 * relations where it had one column, and only `cellTouchpoints.ts` /
 * `cellResources.ts` know which source a board came from.
 */
type PanelCell = Pick<BlueprintCell, 'content' | 'summary' | 'frame'> & {
  touchpoints: CellTouchpoint[]
  resources: CellResource[]
}

function isFigmaUrl(url: string): boolean {
  return /figma\.com/i.test(url)
}

function resolveFigmaUrl(
  techItem: string | undefined,
  cell: PanelCell | null,
  resources: readonly CellResource[],
): string | null {
  if (cell) {
    const fromTouchpoint = resolveTechCellDetailUrl(techItem, cell)
    if (fromTouchpoint && isFigmaUrl(fromTouchpoint)) return fromTouchpoint
  }

  for (const resource of resources) {
    const url = resource.url?.trim()
    if (!url) continue
    if (isFigmaUrl(url) || /figma/i.test(resource.name)) return url
  }

  return null
}

/**
 * The Details │ Differences switch — TOP-LEVEL panel chrome (the two
 * surfaces are siblings of the whole panel), rendered from two call sites:
 * the details branch's own header row and the differences DrawerHeader. ONE
 * component, because two verbatim copies drifted apart once already.
 *
 * No count on the Differences tab: counts live in exactly two places
 * app-wide now — the menubar Diff count and each ledger group's trailing
 * number.
 */
function PanelSurfaceSwitcher({
  value,
  onValueChange,
}: {
  value: BlueprintPanelSurface
  onValueChange: (surface: BlueprintPanelSurface) => void
}) {
  return (
    <SegmentedControl
      aria-label="Panel surface"
      value={value}
      onValueChange={onValueChange}
    >
      <SegmentedControlItem value="details" className="px-2">
        Details
      </SegmentedControlItem>
      <SegmentedControlItem value="differences" className="px-2">
        Differences
      </SegmentedControlItem>
    </SegmentedControl>
  )
}

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
   * One-shot "← Back to Differences" chip: set when the ledger's ⇱ opens a
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

  // One-shot hygiene for the return chip (guarded render-phase set).
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

  const pathEntry = selection?.paths[0]
  const resolvedCellId = pathEntry?.cellId
    ? resolveBlueprintCellId(pathEntry.cellId)
    : null

  const connections = useMemo(() => {
    const cellId = pathEntry?.cellId
    const pathId = pathEntry?.pathId
    if (!cellId || !pathId) {
      return { incoming: [], outgoing: [] }
    }

    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint) {
      return { incoming: [], outgoing: [] }
    }

    return getBlueprintCellConnections(blueprint, cellId)
  }, [blueprints, pathEntry?.cellId, pathEntry?.pathId])

  const stepTechItems = useMemo(() => {
    const pathId = pathEntry?.pathId
    const cellId = pathEntry?.cellId
    const techItem = selection?.techItem
    const stepId = selection?.stepId
    if (!pathId || !cellId || !techItem || !stepId) {
      return []
    }

    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint) return []

    return getBlueprintStepTechItems(blueprint, stepId, {
      cellId: resolvedCellId ?? cellId,
      item: techItem,
    })
  }, [
    blueprints,
    pathEntry?.cellId,
    pathEntry?.pathId,
    resolvedCellId,
    selection?.stepId,
    selection?.techItem,
  ])

  const selectedCell = useMemo((): PanelCell | null => {
    const fromEntry = (): PanelCell | null => {
      if (!pathEntry) return null
      return {
        content: pathEntry.content,
        summary: pathEntry.summary ?? null,
        frame: pathEntry.frame ?? null,
        touchpoints: pathEntry.touchpoints ?? [],
        resources: pathEntry.resources ?? [],
      }
    }

    const pathId = pathEntry?.pathId
    if (!resolvedCellId || !pathId) return fromEntry()

    const blueprint = getBlueprintForPath(blueprints, pathId)
    const cell =
      blueprint?.cells.find((entry) => entry.id === resolvedCellId) ?? null
    if (cell) {
      return {
        content: cell.content,
        summary: cell.summary,
        frame: cell.frame,
        touchpoints: cellTouchpoints(cell),
        resources: cellResources(cell),
      }
    }

    return (
      fromEntry() ?? {
        content: '',
        summary: null,
        frame: null,
        touchpoints: [],
        resources: [],
      }
    )
  }, [blueprints, pathEntry, resolvedCellId])

  const cellTouchpointList = useMemo(
    (): CellTouchpoint[] => selectedCell?.touchpoints ?? [],
    [selectedCell?.touchpoints],
  )

  const cellResourceList = useMemo(
    (): CellResource[] => selectedCell?.resources ?? [],
    [selectedCell?.resources],
  )

  const linkedTechItems = useMemo(
    () => getLinkedTechFromConnections(connections),
    [connections],
  )

  const selectedLane = useMemo((): { name: string; role?: string | null } | null => {
    const laneName = selection?.laneName
    if (!laneName) return null

    const pathId = pathEntry?.pathId
    const blueprint = pathId ? getBlueprintForPath(blueprints, pathId) : null
    return (
      blueprint?.lanes.find((lane) => lane.name === laneName) ?? {
        name: laneName,
      }
    )
  }, [blueprints, pathEntry?.pathId, selection?.laneName])

  const laneBadgeStyle = useMemo(() => {
    const laneName = selection?.laneName
    if (!laneName) return null

    const pathId = pathEntry?.pathId
    const blueprint = pathId ? getBlueprintForPath(blueprints, pathId) : null
    const laneRecord =
      blueprint?.lanes.find((lane) => lane.name === laneName) ?? null
    const zone =
      laneRecord && blueprint
        ? getBlueprintLaneZone(laneRecord, blueprint.lanes)
        : 'frontstage'
    // Keyed by lane_role — the name argument is only the legacy fallback.
    return getBlueprintLaneStyle(laneName, zone, laneRecord?.role)
  }, [blueprints, pathEntry?.pathId, selection?.laneName])

  const otherTechEntries = useMemo(() => {
    const laneNameByCellId = new Map<string, string>()
    const stepIndexByCellId = new Map<string, number>()
    for (const entry of [...connections.incoming, ...connections.outgoing]) {
      laneNameByCellId.set(entry.cellId, entry.laneName)
      stepIndexByCellId.set(entry.cellId, entry.stepIndex)
    }

    const seen = new Set<string>()
    const entries: Array<{
      id: string
      cellId: string
      item: string
      laneName?: string
      stepIndex?: number
    }> = []

    const add = (entry: {
      id: string
      cellId: string
      item: string
      laneName?: string
      stepIndex?: number
    }) => {
      if (seen.has(entry.id)) return
      seen.add(entry.id)
      entries.push(entry)
    }

    for (const entry of linkedTechItems) {
      add({
        id: entry.id,
        cellId: entry.cellId,
        item: entry.item,
        laneName: laneNameByCellId.get(entry.cellId),
        stepIndex: stepIndexByCellId.get(entry.cellId),
      })
    }
    for (const entry of stepTechItems) {
      add({
        id: entry.id,
        cellId: entry.cellId,
        item: entry.item,
        laneName: entry.laneName,
        stepIndex: entry.stepIndex,
      })
    }

    return entries
  }, [connections.incoming, connections.outgoing, linkedTechItems, stepTechItems])

  const figmaUrl = useMemo(() => {
    if (!selection) return null
    return resolveFigmaUrl(selection.techItem, selectedCell, cellResourceList)
  }, [cellResourceList, selectedCell, selection])

  /*
    What the cell leads with (#110): the selected placement's featured
    attachment is the preview, every featured link — the placement's, then
    the cell's own — is a button named by its host. A placement is the row
    whose name the selected touchpoint shows.
  */
  const selectedPlacementId = useMemo(() => {
    const techItem = selection?.techItem?.trim().toLowerCase()
    if (!techItem) return null
    return (
      cellTouchpointList.find(
        (touchpoint) => touchpoint.name.trim().toLowerCase() === techItem,
      )?.id ?? null
    )
  }, [cellTouchpointList, selection?.techItem])
  const featured = useMemo(
    () =>
      selection
        ? featuredPresentation({
            placementId: selectedPlacementId,
            resources: cellResourceList,
          })
        : { preview: null, buttons: [] },
    [cellResourceList, selection, selectedPlacementId],
  )

  // Lane row position of the selected cell — orients up/down direction
  // glyphs on same-step dependency rows.
  const selectedLaneRowPosition = useMemo(() => {
    const pathId = pathEntry?.pathId
    if (!resolvedCellId || !pathId) return -1
    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint) return -1
    return getSelectedCellLaneRowPosition(blueprint, resolvedCellId)
  }, [blueprints, pathEntry?.pathId, resolvedCellId])

  /**
   * Every other cell in this version, as somewhere an arrow could point.
   *
   * Scoped to the version on purpose — the RPC refuses a cross-version
   * dependency, and offering one here would only be a way to reach that
   * refusal. Versions are alternatives, not stages.
   *
   * Labels lead with the column number because step *names* repeat: Discovery
   * holds several columns all named the same thing, so name-and-lane alone
   * names three different cells and the picker becomes a guess. The column
   * number is the only part of a cell's position that is always unique, and
   * ordering by it puts the list in the reading order of the grid.
   */
  const dependencyCandidates = useMemo<DependencyEndpoint[]>(() => {
    const pathId = pathEntry?.pathId
    if (!resolvedCellId || !pathId) return []
    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint) return []

    const laneNames = new Map(
      blueprint.lanes.map((lane) => [lane.id, lane.name]),
    )
    const stepOrder = new Map(
      blueprint.steps.map((step, index) => [step.id, { index, name: step.name }]),
    )

    return blueprint.cells
      .filter((cell) => cell.id !== resolvedCellId)
      .map((cell) => {
        const step = stepOrder.get(cell.step_id)
        return {
          cellId: cell.id,
          pathId,
          stepIndex: step?.index ?? Number.MAX_SAFE_INTEGER,
          label: cellPositionLabel(
            step?.index ?? -1,
            step?.name ?? 'Unknown step',
            laneNames.get(cell.lane_id) ?? 'Unknown lane',
          ),
        }
      })
      .sort(
        (a, b) =>
          a.stepIndex - b.stepIndex || a.label.localeCompare(b.label),
      )
      .map(({ cellId, pathId: path, label }) => ({
        cellId,
        pathId: path,
        label,
      }))
  }, [blueprints, pathEntry?.pathId, resolvedCellId])

  // Only outgoing arrows: this cell owns the ones it is the source of, and
  // those are the ones it may remove. An incoming arrow belongs to the cell at
  // the other end, and is edited from there.
  const existingDependencies = useMemo<ExistingDependency[]>(
    () =>
      connections.outgoing.map((connection) => ({
        id: connection.dependencyId,
        targetCellId: connection.cellId,
        targetLabel: cellPositionLabel(
          connection.stepIndex,
          connection.stepName,
          connection.laneName,
        ),
        kind: connection.linkKind,
        name: connection.linkName,
      })),
    [connections.outgoing],
  )

  const dependencySource = useMemo<DependencyEndpoint | null>(() => {
    const pathId = pathEntry?.pathId
    if (!resolvedCellId || !pathId || !selection) return null
    return {
      cellId: resolvedCellId,
      pathId,
      label: cellPositionLabel(
        selection.stepIndex,
        selection.stepName,
        selection.laneName,
      ),
    }
  }, [pathEntry?.pathId, resolvedCellId, selection])

  const visualStepEntries = useMemo(() => {
    const stepId = selection?.stepId
    const pathId = pathEntry?.pathId
    if (!stepId || !pathId) return []

    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint) return []

    return resolveStoryboardStripEntries(blueprint, stepId)
  }, [blueprints, pathEntry?.pathId, selection?.stepId])

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
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b border-muted px-4 py-2 text-left">
          <DrawerTitle className="sr-only">Path differences</DrawerTitle>
          <DrawerDescription className="sr-only">
            Every difference between the compared paths, grouped by step
          </DrawerDescription>
          {comparing ? (
            <PanelSurfaceSwitcher
              value="differences"
              onValueChange={setPanelSurface}
            />
          ) : (
            <span className="text-sm font-bold tracking-tight">
              Differences
            </span>
          )}
          <div className="flex shrink-0 items-center gap-0.5">
            {expandToggle}
            <IconTooltip label="Close the difference ledger" side="left">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Close differences"
                onClick={clearSelection}
              >
                <X />
              </Button>
            </IconTooltip>
          </div>
        </DrawerHeader>
        {compareRegistration ? (
          <div className="flex min-h-0 flex-1 flex-col pt-3">
            <CompareDifferencesSurface
              registration={compareRegistration}
              onOpenCell={handleOpenCellFromDifferences}
            />
          </div>
        ) : (
          // Reachable only during the exit animation after a comparison
          // ended — the provider is already routing panelState away.
          <div className="flex min-h-0 flex-1 items-center justify-center px-6 pb-8">
            <p className="text-center text-xs text-muted-foreground">
              No comparison is active.
            </p>
          </div>
        )}
      </PanelDrawerShell>
    )
  }

  /*
    Draft creation: the panel opens on an empty slot's target and nothing is
    written until Save. Closing the drawer (✕, Escape, Cancel) discards the
    draft entirely — a cancelled cell never existed.
  */
  if (!selection && draft) {
    const blueprint = getBlueprintForPath(blueprints, draft.pathId)
    const laneRecord =
      blueprint?.lanes.find((lane) => lane.name === draft.laneName) ?? null
    const zone =
      laneRecord && blueprint
        ? getBlueprintLaneZone(laneRecord, blueprint.lanes)
        : 'frontstage'
    const draftLaneStyle = getBlueprintLaneStyle(
      draft.laneName,
      zone,
      laneRecord?.role,
    )

    return (
      <PanelDrawerShell
        open={drawerOpen}
        expanded={expanded}
        onCloseRequest={clearSelection}
        onClosed={handleClosed}
      >
        {surfaceSwitcher}
        <DrawerHeader className="flex-row items-center justify-between gap-2 pb-3 text-left">
          <div className="min-w-0 flex-1">
            <DrawerTitle className="text-sm font-bold tracking-tight">
              New cell
            </DrawerTitle>
            <DrawerDescription className="text-2xs text-muted-foreground">
              {[
                draft.phaseName,
                draft.scenarioName,
                `${draft.stepIndex + 1}. ${draft.stepName}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </DrawerDescription>
          </div>
          <IconTooltip label="Discard this new cell" side="left">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Discard new cell"
              onClick={clearSelection}
            >
              <X />
            </Button>
          </IconTooltip>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 blueprint-scroll">
          <span
            className="w-fit max-w-full truncate rounded-full px-2 py-0.5 text-3xs font-medium leading-tight"
            style={{
              backgroundColor: draftLaneStyle.lane,
              color: 'var(--foreground-blueprint-cell)',
            }}
          >
            {draft.laneName}
          </span>
          <CellPanelEditor cellId={null} draft={draft} onDone={clearSelection} />
        </div>
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
        {surfaceSwitcher}
        <DrawerHeader className="flex-row items-center justify-between gap-2 pb-3 text-left">
          <div className="min-w-0 flex-1">
            <DrawerTitle className="text-sm font-bold tracking-tight">
              Cell details
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              No cell selected
            </DrawerDescription>
          </div>
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
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 pb-8">
          <p className="text-center text-xs text-muted-foreground">
            No cell selected — click a cell on the board.
          </p>
        </div>
      </PanelDrawerShell>
    )
  }

  const isStoryboardLane = Boolean(
    selectedLane && shouldUseStoryboardContent(selectedLane),
  )
  const cellContent =
    selection.paths[0]?.content.trim() ||
    selection.techItem ||
    ''
  const detailBodyText = selectedCell
    ? resolveTechCellDetailText(selection.techItem, selectedCell)
    : cellContent
  const isTechLane = Boolean(
    selectedLane && shouldUseTouchpointCellContent(selectedLane),
  )
  const techDetailLabel =
    isTechLane && selectedCell
      ? resolveTechCellDetailLabel(selection.techItem, selectedCell)
      : null
  const detailSummaryText =
    techDetailLabel && detailBodyText.trim() === techDetailLabel
      ? ''
      : detailBodyText
  const detailImages = resolveCellDetailImages({
    techItem: selection.techItem,
    cellContent: selection.paths[0]?.content,
    cellFrame: selection.paths[0]?.frame,
    cellTouchpoints: cellTouchpointList,
    cellResources: cellResourceList,
  })
  // A featured attachment is the owner's picture (#110); the frame and the
  // placement's screenshots are the fallback until #111 moves them here.
  // The stock logo for the touchpoint this panel is about — a string on the
  // registry row now (#326), not a tool name matched against a table in code.
  const techLogoUrl =
    cellTouchpointList.find(
      (placement) => placement.name === (selection.techItem ?? techDetailLabel),
    )?.iconUrl?.trim() || null
  const showImages = Boolean(
    (featured.preview || detailImages?.length) && !isStoryboardLane,
  )
  const showTouchpoint = Boolean(isTechLane && techDetailLabel)
  // The touchpoint sits above the title on a touchpoint lane — decided by
  // the lane's role (isTechLane), not by a hardcoded lane name (#326).
  const showTouchpointAboveTitle = showTouchpoint

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
      <BreadcrumbList className="flex-nowrap gap-0.5 text-2xs leading-tight text-muted-foreground">
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

  // Panel v2 header: title is the cell content snippet; the lane appears as
  // one role-colored badge (colored by lane_role, never by name).
  const cellTitleText =
    cellContent.split('\n')[0]?.trim() || selection.laneName
  const laneBadge = laneBadgeStyle ? (
    <span
      className="w-fit max-w-full truncate rounded-full px-2 py-0.5 text-3xs font-medium leading-tight"
      style={{
        backgroundColor: laneBadgeStyle.lane,
        color: BLUEPRINT_THEME.cellText,
      }}
      title={selection.laneName}
    >
      {selection.laneName}
    </span>
  ) : null

  const titleRow = (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="min-w-0 text-sm font-bold leading-snug tracking-tight text-foreground">
        {cellTitleText}
      </p>
      {laneBadge}
    </div>
  )

  /*
    The placement's role, beside its touchpoint (#111). Only when someone judged
    it — null is the unmarked majority and renders nothing, because a badge
    for "nobody decided" puts a decision on screen that nobody made.
  */
  const selectedPlacementRole = (() => {
    const techItem = techDetailLabel?.trim().toLowerCase()
    if (!techItem) return null
    return (
      cellTouchpointList.find(
        (touchpoint) => touchpoint.name.trim().toLowerCase() === techItem,
      )?.role ?? null
    )
  })()
  const selectedTouchpoint = showTouchpoint ? (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      <TouchpointCellFace
        item={techDetailLabel!}
        compact
        inline
        className="w-fit shrink-0 !px-2 !py-0.5 !text-3xs leading-none"
      />
      {selectedPlacementRole ? (
        <span
          className="inline-flex h-5 shrink-0 items-center rounded-full border border-border px-2 text-3xs font-medium text-muted-foreground"
          title={TOUCHPOINT_ROLE_DEFINITION[selectedPlacementRole]}
          data-touchpoint-role={selectedPlacementRole}
        >
          {TOUCHPOINT_ROLE_LABEL[selectedPlacementRole]}
        </span>
      ) : null}
    </span>
  ) : null

  const imageBlock = showImages ? (
    <div className="flex w-full flex-col items-center gap-3">
      {(() => {
        const frames = detailImages ?? []
        // A picture is a logo when it IS the touchpoint's registry icon (#326);
        // the filename convention stays a fallback for a logo carried as a
        // placement attachment.
        const isTechLogo = (src: string) =>
          (techLogoUrl != null && src === techLogoUrl) ||
          src.includes('-logo.') ||
          src.includes('/logo/')
        const logos = frames.filter(isTechLogo)
        const screenshots = frames.filter((src) => !isTechLogo(src))

        return (
          <>
            {logos.length > 0 ? (
              <div className="flex w-full flex-wrap items-center justify-center gap-3">
                {logos.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className={CELL_DETAIL_LOGO_CLASS}
                  />
                ))}
              </div>
            ) : null}
            {featured.preview ? (
              <FeaturedPreviewFrame
                preview={featured.preview}
                frameClassName={CELL_DETAIL_PICTURE_FRAME_CLASS}
                mediaClassName={CELL_DETAIL_PICTURE_CLASS}
              />
            ) : null}
            {screenshots
              .filter((src) => src !== featured.preview?.url)
              .map((src) =>
              figmaUrl ? (
                <a
                  key={src}
                  href={figmaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    CELL_DETAIL_PICTURE_FRAME_CLASS,
                    'group block cursor-pointer',
                  )}
                  aria-label="View in Figma"
                >
                  <img
                    src={src}
                    alt=""
                    className={cn(
                      CELL_DETAIL_PICTURE_CLASS,
                      'transition-[filter,opacity] duration-(--motion-fade)',
                      'group-hover:opacity-80 group-hover:grayscale-[15%]',
                    )}
                  />
                  <span
                    className={cn(
                      'absolute inset-0 z-10 flex items-center justify-center',
                      'bg-black/55 opacity-0 transition-opacity duration-(--motion-fade)',
                      'group-hover:opacity-100',
                    )}
                    aria-hidden
                  >
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 text-2xs font-semibold text-white',
                        'transition-opacity duration-(--motion-fade)',
                      )}
                    >
                      View in Figma
                      <ExternalLink className="size-2.5 text-white" />
                    </span>
                  </span>
                </a>
              ) : (
                <div key={src} className={CELL_DETAIL_PICTURE_FRAME_CLASS}>
                  <img
                    src={src}
                    alt=""
                    className={CELL_DETAIL_PICTURE_CLASS}
                  />
                </div>
              ),
            )}
          </>
        )
      })()}
    </div>
  ) : null

  // A touchpoint that says exactly what the title says is the title twice —
  // one of them yields. The touchpoint keeps its own identity; the plain-text
  // title only renders when it adds words the touchpoint does not have. Same
  // rule for the summary paragraph: a cell with no authored summary falls back
  // to its own content, and printing the title again as "summary" is the
  // same word twice pretending to be two facts.
  const titleRepeatsTouchpoint =
    showTouchpoint && techDetailLabel?.trim() === cellTitleText.trim()
  const summaryRepeatsTitle =
    detailSummaryText.trim() === cellTitleText.trim() ||
    detailSummaryText.trim() === cellContent.trim()
  const editingCell = canEdit && resolvedCellId !== null

  const overviewContent = (
    <>
      {imageBlock}
      {!editingCell && featured.buttons.length > 0 ? (
        <FeaturedButtons buttons={featured.buttons} className="px-1" />
      ) : null}
      <div className="flex min-w-0 flex-col gap-2">
        {showTouchpointAboveTitle ? selectedTouchpoint : null}
        {/* In edit mode the form's TEXT field *is* the title; repeating it
            above the field would be the same word twice on one screen. */}
        {editingCell ? (
          titleRepeatsTouchpoint ? null : laneBadge
        ) : titleRepeatsTouchpoint ? (
          laneBadge
        ) : (
          titleRow
        )}
        {showTouchpoint && !showTouchpointAboveTitle ? selectedTouchpoint : null}
        {editingCell && titleRepeatsTouchpoint ? laneBadge : null}
      </div>
      {/* The summary paragraph is the reading view; the editor shows the
          same text inside its SUMMARY field instead. */}
      {!editingCell && detailSummaryText.trim() && !summaryRepeatsTitle ? (
        <p className="-mt-3 text-sm whitespace-pre-wrap text-foreground/75">
          {detailSummaryText.trim()}
        </p>
      ) : null}
      {editingCell ? (
        <CellPanelEditor
          cellId={resolvedCellId}
          // Never seed the field with the title wearing a summary's
          // clothes — only prose that actually says more than the cell text.
          fallbackSummary={
            summaryRepeatsTitle ? '' : detailSummaryText.trim()
          }
          onDone={clearSelection}
        />
      ) : (
        <>
          {/* Basic info (text, summary, owners) first; the function/form/
              value spec is a deeper layer of the same cell and reads below it. */}
          <CellContentSection cellId={resolvedCellId} />
          <CellOverviewSpec cellId={resolvedCellId} />
        </>
      )}
    </>
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
              className="inline-flex items-center gap-1 rounded-md text-2xs text-muted-foreground transition-colors duration-(--motion-micro) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
            {titleRow}
            <VisualStepDetailStack entries={visualStepEntries} />
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
                {overviewContent}
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
                      className="h-auto flex-none gap-1.5 rounded-none px-0 pb-2 pt-0 text-2xs font-normal text-muted-foreground/60 hover:text-muted-foreground data-active:text-foreground/90 after:bottom-[-1px] after:bg-foreground/70"
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
                        connections={connections}
                        otherTech={otherTechEntries}
                        selectedLaneRowPosition={selectedLaneRowPosition}
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
                            className="h-7 self-start px-2 text-xs text-muted-foreground hover:text-foreground"
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
                      figmaUrl={figmaUrl}
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
