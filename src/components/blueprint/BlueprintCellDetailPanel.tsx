import { useEffect, useMemo, useState } from 'react'
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
import { describeLaneRole, getLaneRole } from '@/lib/laneRoles'
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
  Field,
  PanelDrawerShell,
  PanelFooterHost,
  PanelIdentity,
  PanelKindBadge,
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
import { StoryboardStepDetailStack } from '@/components/blueprint/StoryboardStepDetailStack'
import { ZoomableImage } from '@/components/blueprint/ZoomableImage'
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
import { resolveCellDetailImages } from '@/lib/blueprintTechPictures'
import {
  getBlueprintLaneStyle,
  getBlueprintLaneZone,
} from '@/lib/blueprintTheme'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'
import { cellResources } from '@/lib/cellResources'
import {
  cellTouchpoints,
  findCellPlacement,
  resolveTouchpointDetail,
} from '@/lib/cellTouchpoints'
import { resolveStoryboardStripEntries } from '@/lib/storyboardWalkthrough'
import { panelEditorBusy } from '@/lib/panelEditorBusy'
import { useTouchpointToneResolver } from '@/hooks/useTouchpointToneResolver'
import { PANEL_TERMS } from '@/lib/panelTerms'
import { PANEL_TEXT } from '@/lib/panelText'
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
  /*
    The touchpoint badge's colour, taken here rather than beside the badge:
    the label it is about is derived far below, past an early return, and a
    hook cannot go there. The resolver is a function for exactly that reason.
  */
  const resolveTouchpointTone = useTouchpointToneResolver()
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

  /*
    ONE lane resolution for the whole panel.

    The lane a cell sits in answers three questions — which row record it is
    (storyboard/touchpoint content rules), what colour the badge wears, and
    what the row MEANS on hover — and each used to walk `blueprint.lanes` for
    itself. Three lookups of one fact is three chances to disagree.

    Reads the DRAFT's lane when there is no selection: a cell being created
    sits in a real row, and the badge above the new-cell form is the same
    badge the panel shows once it is saved.
  */
  const laneResolution = useMemo(() => {
    const laneName = selection?.laneName ?? draft?.laneName
    if (!laneName) return null

    const pathId = pathEntry?.pathId ?? draft?.pathId
    const blueprint = pathId ? getBlueprintForPath(blueprints, pathId) : null
    const laneRecord =
      blueprint?.lanes.find((lane) => lane.name === laneName) ?? null
    const zone =
      laneRecord && blueprint
        ? getBlueprintLaneZone(laneRecord, blueprint.lanes)
        : 'frontstage'
    return {
      laneName,
      /**
       * The row record, or a name-only stand-in when the lane is unknown.
       *
       * The stand-in spells `role: null` rather than omitting the key, so
       * that both arms of the union answer the question "what role is this
       * lane?". A reader of `lane.role` gets the honest answer — none
       * recorded — where an absent key would be a type error at every call
       * site that asks.
       */
      lane: laneRecord ?? { name: laneName, role: null },
      // Keyed by lane_role — the name argument is only the legacy fallback.
      style: getBlueprintLaneStyle(laneName, zone, laneRecord?.role),
      /* What the badge MEANS, for its hover. Resolved the way the canvas
         resolves it: the explicit role if the row carries one, else the
         legacy name map. */
      description: describeLaneRole(
        getLaneRole({ name: laneName, role: laneRecord?.role ?? null }),
      ),
    }
  }, [blueprints, draft?.laneName, draft?.pathId, pathEntry?.pathId, selection?.laneName])

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

  /*
    The placement row this panel is about.

    One resolution, by `findCellPlacement`, where the panel used to run three
    name matches of its own — one for the featured preview, one for the role
    badge, one for the pictures — each with its own idea of trimming and
    case. The row is what the summary, the role, the icon and the featured
    attachment all belong to, so it is resolved once and read from.
  */
  const selectedPlacement = useMemo(
    () =>
      selectedCell
        ? findCellPlacement(
            { touchpoints: selectedCell.touchpoints },
            selection?.techItem,
          )
        : null,
    [selectedCell, selection?.techItem],
  )

  /*
    The READING of that row, which is a different thing from the row.

    `resolveTouchpointDetail` falls back to the cell's summary where the
    placement has none, which is right for a reader and wrong for a form:
    seeding an editor with the fallback is how a cell's sentence ends up
    written onto a placement that never said it. The editor takes the row.
  */
  const touchpointDetail = useMemo(
    () =>
      selectedCell
        ? resolveTouchpointDetail(
            {
              summary: selectedCell.summary,
              touchpoints: selectedCell.touchpoints,
            },
            selection?.techItem,
          )
        : null,
    [selectedCell, selection?.techItem],
  )

  /*
    What the cell leads with: the selected placement's featured
    attachment is the preview, every featured link — the placement's, then
    the cell's own — is a button named by its host.
  */
  const featured = useMemo(
    () =>
      selection
        ? featuredPresentation({
            placementId: selectedPlacement?.id ?? null,
            resources: cellResourceList,
          })
        : { preview: null, buttons: [] },
    [cellResourceList, selection, selectedPlacement],
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

  const storyboardStepEntries = useMemo(() => {
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
            <span className={PANEL_TEXT.title}>
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
            <DrawerTitle className={PANEL_TEXT.title}>
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
            <DrawerTitle className={PANEL_TEXT.title}>
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
  const detailBodyText = touchpointDetail?.text ?? cellContent
  const isTechLane = Boolean(
    selectedLane && shouldUseTouchpointCellContent(selectedLane),
  )
  /*
    The touchpoint's name, where there IS one to name.

    `isTechLane` alone was the test, and it is right for the general case: on
    an actor lane a cell's content is a sentence, and naming it "the
    touchpoint" would be the label join a placement row exists to unwind. But
    it is wrong for a cell that carries a real placement on a lane that does
    not draw touchpoints — a document or a recording attached to a support
    row — which had its summary rendered while the name it belongs to was
    suppressed.

    A row id is what tells the two apart: only a real `cell_touchpoints` row
    has one. So the field appears wherever the placement is real, which is
    also what gives the role badge below a reader on those cells — a control
    an author can set and nobody can see is the shape this panel exists to
    avoid, and it would have been reintroduced here.
  */
  const hasRealPlacement = Boolean(selectedPlacement?.id)
  const techDetailLabel =
    isTechLane || hasRealPlacement ? (touchpointDetail?.name ?? null) : null
  const detailSummaryText =
    techDetailLabel && detailBodyText.trim() === techDetailLabel
      ? ''
      : detailBodyText
  const detailImages = resolveCellDetailImages({
    techItem: touchpointDetail?.name ?? selection.techItem,
    cellContent: selection.paths[0]?.content,
    cellFrame: selection.paths[0]?.frame,
    cellTouchpoints: cellTouchpointList,
    cellResources: cellResourceList,
  })
  // A featured attachment is the owner's picture; the frame and the
  // placement's screenshots are the fallback until the work that moves what a
  // placement points at into the cell's resources brings them here.
  // The stock logo for the touchpoint this panel is about — a string on the
  // registry row now, not a tool name matched against a table in code.
  const techLogoUrl = selectedPlacement?.iconUrl?.trim() || null
  const showImages = Boolean(
    (featured.preview || detailImages?.length) && !isStoryboardLane,
  )
  // Widened from "is a touchpoint lane" to "names a touchpoint at all", so a
  // real placement on a lane that draws no touchpoints still shows its name
  // — see `hasRealPlacement`.
  const showTouchpoint = Boolean(techDetailLabel)

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

  const imageBlock = showImages ? (
    <div className="flex w-full flex-col items-center gap-3">
      {(() => {
        const frames = detailImages ?? []
        // A picture is a logo when it IS the touchpoint's registry icon;
        // the filename convention stays a fallback for a logo carried as a
        // placement attachment.
        const isTechLogo = (src: string) =>
          (techLogoUrl != null && src === techLogoUrl) ||
          src.includes('-logo.') ||
          src.includes('/logo/')
        const logos = frames.filter(isTechLogo)
        const screenshots = frames.filter((src) => !isTechLogo(src))
        /*
          The screenshots that actually get drawn, hoisted so that the group
          handed to the viewer IS the row on the page.

          A featured attachment renders in its own frame above and is dropped
          from this list, so building the group from `screenshots` would hand
          every trigger a group one longer than the row it belongs to, and
          `siblingIndex` would then point at the wrong picture from the first
          cell that features one of its own screenshots.

          The name is the cell's own content sentence. A frame has no caption
          anywhere in the schema and is not getting one for the sake of a
          label — what the picture shows is the moment the cell describes,
          and that sentence is already right here.
        */
        const openableScreenshots = screenshots.filter(
          (src) => src !== featured.preview?.url,
        )
        const screenshotSiblings = openableScreenshots.map((src) => ({
          src,
          alt: cellTitleText,
        }))

        return (
          <>
            {/*
              Logos stay inert, at every size. They are iconography, not
              content: there is nothing inside a brand mark to read closer,
              and making one open a fullscreen viewer teaches the reader that
              the openable affordance is decorative — which spends the signal
              the screenshots below it depend on.
            */}
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
            {/* Every screenshot in the same plain frame. Nothing elects one
                url as "the design" — a featured attachment is what a cell
                leads with, and `featuredPresentation` decides that without
                naming a vendor. */}
            {openableScreenshots.map((src, index) => (
              <div key={src} className={CELL_DETAIL_PICTURE_FRAME_CLASS}>
                <ZoomableImage
                  src={src}
                  alt={cellTitleText}
                  triggerLabel={`Expand: ${cellTitleText}`}
                  siblings={screenshotSiblings}
                  siblingIndex={index}
                  triggerClassName="absolute inset-0 block cursor-pointer"
                >
                  <img src={src} alt="" className={CELL_DETAIL_PICTURE_CLASS} />
                </ZoomableImage>
              </div>
            ))}
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

  /* The LANE badge leads, on a touchpoint cell as on every other kind. It is
     the row the reader clicked in, and the tool badge beside it is one of
     possibly several things that row holds — so the tool reading first made a
     touchpoint cell the only cell whose identity block started somewhere
     other than its lane. */
  const identityBadges = (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">{laneBadge}</div>
  )

  /*
    The touchpoint, as a LABELLED field rather than a second badge beside the
    lane.

    Two badges in a row read as two facts of the same kind — "this row, and
    also this row" — when they are a lane and the tool used in it. Naming the
    field says which is which, and it matches how Owner already presents a
    value: label above, value below. The definition rides the label's own
    hint popover, the affordance every other field label uses.
  */
  const touchpointField = showTouchpoint ? (
    <Field label="Touchpoint" hint={PANEL_TERMS.touchpoint}>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <PanelKindBadge
          label={techDetailLabel!}
          tone={resolveTouchpointTone(techDetailLabel!)}
          title={techDetailLabel!}
        />
        {/*
          ROLE, beside the name it qualifies, and ONLY when somebody set it.

          Nothing renders for the unmarked case — no badge, no dash, no
          "Unmarked". Most placements will never be marked, and a grey badge
          on all of them would put a judgement on screen that nobody made,
          which is the specific misreading the column has to avoid. Absence is
          the honest rendering of "not judged", and it is what tells the
          unmarked case apart from a placement someone deliberately called
          peripheral.

          Nor while EDITING: the form below carries the same fact as a
          control, and a badge beside a select for one value is two mechanisms
          for one fact.
        */}
        {!editingCell && touchpointDetail?.role ? (
          <PanelKindBadge
            label={TOUCHPOINT_ROLE_LABEL[touchpointDetail.role]}
            title={TOUCHPOINT_ROLE_LABEL[touchpointDetail.role]}
            description={TOUCHPOINT_ROLE_DEFINITION[touchpointDetail.role]}
          />
        ) : null}
      </div>
    </Field>
  ) : null

  const overviewContent = (
    <>
      {imageBlock}
      {!editingCell && featured.buttons.length > 0 ? (
        <FeaturedButtons buttons={featured.buttons} className="px-1" />
      ) : null}
      {/*
        Identity, then prose — one group, tight spacing.

        A touchpoint cell used to STACK a round tool badge above a differently
        sized lane badge, and the summary then floated away from both behind a
        `-mt-3` correction. Two badges naming two things about one cell belong
        side by side at one size, and the sentence about the cell belongs
        directly under the name of it.
      */}
      <div className="flex min-w-0 flex-col gap-1.5">
        {/* In edit mode the form's CONTENT field *is* the title; repeating it
            above the field would be the same word twice on one screen. */}
        {editingCell ? (
          identityBadges
        ) : (
          <PanelIdentity
            badge={identityBadges}
            // Empty when the touchpoint field below already carries it.
            title={titleRepeatsTouchpoint ? '' : cellTitleText}
            meta={
              selection.paths.length > 1
                ? `${selection.paths.length} paths`
                : ''
            }
          />
        )}
        {touchpointField}
        {/* LABELLED, like every other panel's summary. This was the one place
            in five panels where a field's read-only rendering skipped the
            label and printed bare prose, which is why "Summary" appeared on
            some things and not others. The editor shows the same text inside
            its own Summary field. */}
        {!editingCell && detailSummaryText.trim() && !summaryRepeatsTitle ? (
          <Field label="Summary" hint="What the detail fields add up to.">
            <p className={cn('whitespace-pre-wrap', PANEL_TEXT.value)}>
              {detailSummaryText.trim()}
            </p>
          </Field>
        ) : null}
      </div>
      {editingCell ? (
        <CellPanelEditor
          cellId={resolvedCellId}
          // The placement the reader clicked, so its detail fields join the
          // cell's form under one Save rather than arriving as a second
          // editor with a second Save button.
          placement={selectedPlacement}
          placementResources={cellResourceList}
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
