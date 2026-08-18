import { Component, useEffect, useMemo, useState, type ReactNode } from 'react'
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
import {
  CELL_PANEL_FOOTER_ID,
  CellPanelEditor,
} from '@/components/blueprint/CellPanelEditor'
import { CellResourcesTab } from '@/components/blueprint/CellResourcesTab'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { TechPillFace } from '@/components/blueprint/TechPillFace'
import { VisualStepDetailStack } from '@/components/blueprint/VisualStepDetailStack'
import {
  CANVAS_REGION_SELECTOR,
  CELL_DETAIL_PANEL_BOTTOM_CLASS,
  CELL_DETAIL_PANEL_TOP_CLASS,
  CELL_DETAIL_PANEL_TOP_GAP_PX,
  CELL_DETAIL_PANEL_TOP_VAR,
} from '@/components/editor/menubarHeaderLayout'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/editor/SegmentedControl'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
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
  getSelectedCellLayerRowPosition,
  scrollBlueprintCellIntoView,
} from '@/lib/blueprintCellConnections'
import {
  buildTechPillSelectionForItem,
  getBlueprintStepTechItems,
  scrollBlueprintTechPillIntoView,
} from '@/lib/blueprintStepTech'
import { shouldUsePillCellContent, shouldUseVisualContent } from '@/lib/blueprintLayout'
import { BLUEPRINT_THEME } from '@/lib/blueprintTheme'
import { resolveCellDetailPictures } from '@/lib/blueprintTechPictures'
import {
  getBlueprintLayerStyle,
  getBlueprintLayerZone,
} from '@/lib/blueprintTheme'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'
import {
  resolveTechCellDetailLabel,
  resolveTechCellDetailText,
  resolveTechCellDetailUrl,
  URL_LINK_TYPE,
} from '@/lib/blueprintTechDescriptions'
import { resolveVisualStepPictureEntries } from '@/lib/visualWalkthrough'
import { cn } from '@/lib/utils'
import type { ExistingDependency } from '@/components/blueprint/CellDependencyEditor'
import type { DraftCellTarget } from '@/components/blueprint/CellPanelEditor'
import type { DependencyEndpoint } from '@/lib/dependencyValidation'
import type { BlueprintCell, CellLink } from '@/types/blueprint'
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
  layerName: string,
): string {
  const column = stepIndex >= 0 ? `${stepIndex + 1}. ` : ''
  return `${column}${stepName} · ${layerName}`
}

/** Fixed panel and illustration frame so every row/step uses the same size. */
const CELL_DETAIL_PICTURE_FRAME_CLASS =
  'relative aspect-[4/3] w-full max-w-full shrink-0 overflow-hidden rounded-lg bg-muted/20'
const CELL_DETAIL_PICTURE_CLASS =
  'absolute inset-0 h-full w-full object-contain object-center'
const CELL_DETAIL_LOGO_CLASS =
  'size-32 shrink-0 rounded-lg bg-muted/20 p-2 object-contain object-center'
const CELL_DETAIL_SMALL_LOGO_CLASS =
  'size-[6.5rem] shrink-0 rounded-lg bg-muted/20 p-2 object-contain object-center'

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

function isFigmaUrl(url: string): boolean {
  return /figma\.com/i.test(url)
}

function resolveFigmaUrl(
  techItem: string | undefined,
  cell: Pick<BlueprintCell, 'content' | 'links'> | null,
  links: CellLink[],
): string | null {
  if (cell) {
    const fromTech = resolveTechCellDetailUrl(techItem, cell)
    if (fromTech && isFigmaUrl(fromTech)) return fromTech
  }

  for (const link of links) {
    if (link.type !== URL_LINK_TYPE || !link.url?.trim()) continue
    if (isFigmaUrl(link.url) || /figma/i.test(link.label ?? '')) {
      return link.url.trim()
    }
  }

  return null
}

/**
 * Publishes the canvas region's top edge so the portalled drawer can sit
 * below whatever chrome that surface stacks above it — the base view's navbar
 * alone, or a slice tab's header band on top of it. Re-measured on resize and
 * whenever the panel opens; the surface's own transitions (sidebar wipe, tab
 * strip) do not move the canvas top, so no observer is needed.
 */
function useCanvasTopOffset(active: boolean) {
  useEffect(() => {
    if (!active) return

    const measure = () => {
      const canvas = document.querySelector(CANVAS_REGION_SELECTOR)
      const top = canvas?.getBoundingClientRect().top ?? 0
      document.documentElement.style.setProperty(
        CELL_DETAIL_PANEL_TOP_VAR,
        `${Math.max(0, top) + CELL_DETAIL_PANEL_TOP_GAP_PX}px`,
      )
    }

    measure()
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
      document.documentElement.style.removeProperty(CELL_DETAIL_PANEL_TOP_VAR)
    }
  }, [active])
}

/**
 * True while the panel's editor has a save in flight. Every dismiss path
 * (Escape, ✕-driven close requests) checks this: closing mid-save reads as
 * "cancelled", but the write lands anyway — for a draft that means a cell
 * materializing after the panel that explained it is gone.
 */
function panelEditorBusy(): boolean {
  return document.querySelector('[data-cell-panel-editor][data-busy]') !== null
}

/**
 * A render error in the drawer must cost the drawer, not the app.
 *
 * This panel is the one surface that renders arbitrary cell content —
 * pictures, links, tech pills, prose — outside the canvas's providers, which
 * makes it the most likely place for a render throw. Without a boundary that
 * throw unmounted the entire editor to a white page, which is how a broken
 * pill icon read as "loading is broken". React error boundaries are still
 * class-only.
 */
class CellDetailErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('[cell-detail] panel render failed:', error)
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="fixed right-4 bottom-16 z-40 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-md">
          This cell's details failed to display. The canvas is unaffected.
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * The one drawer shell every surface of the panel renders through. Each
 * render branch (details, draft, placeholder, differences) returns this at
 * the same tree position, so React reconciles them as the SAME drawer —
 * a surface switch is a content swap inside the open drawer, never a
 * close-reopen.
 */
function PanelDrawerShell({
  open,
  expanded,
  onCloseRequest,
  onClosed,
  children,
}: {
  open: boolean
  expanded: boolean
  onCloseRequest: () => void
  onClosed: () => void
  children: ReactNode
}) {
  // Same drawer, two postures: the desktop right-pinned card, or — below
  // md — a bottom sheet the width of the phone. One component, mirroring
  // the AgentDock docked/floating precedent; the reconciliation guarantee
  // above (same tree position) holds in both postures.
  const mobile = useMobileShell()
  return (
    <Drawer
      // Keyed on posture: a resize across the breakpoint while open would
      // otherwise reinterpret an in-flight swipe's x-offset against the
      // other posture's axis. A flip remounts the drawer clean instead.
      key={mobile ? 'mobile' : 'desktop'}
      open={open}
      onOpenChange={(next) => {
        // Only close *requests* (✕, Escape, swipe) arrive here, and with
        // `open` derived from panelState they can only fire while the panel
        // is open — the delayed-callback-wipes-new-selection class of bug
        // died with the second owner.
        if (!next && !panelEditorBusy()) onCloseRequest()
      }}
      onOpenChangeComplete={(next) => {
        if (!next) onClosed()
      }}
      modal={false}
      disablePointerDismissal
      swipeDirection={mobile ? 'down' : 'right'}
      // A bottom sheet says how to dismiss itself with a grab handle; the
      // desktop inspector has its own ✕ and does not read as draggable.
      showSwipeHandle={mobile}
    >
      <DrawerContent
        data-cell-detail-panel=""
        // The posture the MOTION keys off (animations.css): a sheet rises
        // from the bottom edge, an inspector lifts in beside the cell it
        // came from. Two vocabularies, one component.
        data-cell-detail-posture={mobile ? 'sheet' : 'inspector'}
        className={cn(
          mobile
            ? '!inset-x-0 !bottom-0 !top-auto !m-0 !h-auto max-h-[70svh] w-auto border-t border-border bg-popover shadow-sm after:hidden [--drawer-inset:0px]'
            : cn(
                CELL_DETAIL_PANEL_TOP_CLASS,
                CELL_DETAIL_PANEL_BOTTOM_CLASS,
                '!right-4 !left-auto !m-0 !h-auto !max-h-none rounded-2xl border border-border bg-popover shadow-sm after:hidden [--drawer-inset:1rem] md:!right-8 md:[--drawer-inset:2rem]',
                expanded
                  ? 'w-(--width-cell-panel-expanded)'
                  : 'w-(--width-cell-panel)',
              ),
        )}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </DrawerContent>
    </Drawer>
  )
}

/**
 * The Details │ Differences switch — TOP-LEVEL panel chrome (the two
 * surfaces are siblings of the whole panel), rendered from two call sites:
 * the details branch's own header row and the differences DrawerHeader. ONE
 * component, because two verbatim copies drifted apart once already.
 *
 * No count on the Differences tab: counts live in exactly two places
 * app-wide now — the menubar Diff pill and each ledger group's trailing
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
    <CellDetailErrorBoundary>
      <BlueprintCellDetailPanelBody />
    </CellDetailErrorBoundary>
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
        description: "Switch the open cell panel's tab. arg: dependencies | evidence | resources",
        run: (arg) => {
          const tab = arg === 'evidence' || arg === 'resources' ? arg : 'dependencies'
          setActiveTab(tab)
          return `Cell panel is on the ${tab} tab.`
        },
      }),
      registerAgentUiCommand({
        name: 'cell_panel_expand',
        description: 'Widen or shrink the open cell panel. arg: true (wide) | false (normal)',
        run: (arg) => {
          const wide = arg !== 'false'
          setExpanded(wide)
          return wide ? 'Cell panel expanded.' : 'Cell panel back to normal width.'
        },
      }),
      registerAgentUiCommand({
        name: 'cell_panel_close',
        description: 'Close the open cell detail panel.',
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

  const selectedCell = useMemo((): Pick<
    BlueprintCell,
    'content' | 'description' | 'links' | 'picture'
  > | null => {
    const pathId = pathEntry?.pathId
    if (!resolvedCellId || !pathId) {
      if (!pathEntry) return null
      return {
        content: pathEntry.content,
        description: pathEntry.description ?? null,
        picture: pathEntry.picture ?? null,
        links: pathEntry.links ?? [],
      }
    }

    const blueprint = getBlueprintForPath(blueprints, pathId)
    const cell =
      blueprint?.cells.find((entry) => entry.id === resolvedCellId) ?? null
    if (cell) return cell

    return {
      content: pathEntry?.content ?? '',
      description: pathEntry?.description ?? null,
      picture: pathEntry?.picture ?? null,
      links: pathEntry?.links ?? [],
    }
  }, [blueprints, pathEntry, resolvedCellId])

  const cellLinks = useMemo(
    (): CellLink[] => selectedCell?.links ?? pathEntry?.links ?? [],
    [pathEntry?.links, selectedCell?.links],
  )

  const linkedTechItems = useMemo(
    () => getLinkedTechFromConnections(connections),
    [connections],
  )

  const selectedLayer = useMemo((): { name: string; role?: string | null } | null => {
    const layerName = selection?.layerName
    if (!layerName) return null

    const pathId = pathEntry?.pathId
    const blueprint = pathId ? getBlueprintForPath(blueprints, pathId) : null
    return (
      blueprint?.layers.find((layer) => layer.name === layerName) ?? {
        name: layerName,
      }
    )
  }, [blueprints, pathEntry?.pathId, selection?.layerName])

  const laneChipStyle = useMemo(() => {
    const layerName = selection?.layerName
    if (!layerName) return null

    const pathId = pathEntry?.pathId
    const blueprint = pathId ? getBlueprintForPath(blueprints, pathId) : null
    const layerRecord =
      blueprint?.layers.find((layer) => layer.name === layerName) ?? null
    const zone =
      layerRecord && blueprint
        ? getBlueprintLayerZone(layerRecord, blueprint.layers)
        : 'frontstage'
    // Keyed by layer_role — the name argument is only the legacy fallback.
    return getBlueprintLayerStyle(layerName, zone, layerRecord?.role)
  }, [blueprints, pathEntry?.pathId, selection?.layerName])

  const otherTechEntries = useMemo(() => {
    const layerNameByCellId = new Map<string, string>()
    const stepIndexByCellId = new Map<string, number>()
    for (const entry of [...connections.incoming, ...connections.outgoing]) {
      layerNameByCellId.set(entry.cellId, entry.layerName)
      stepIndexByCellId.set(entry.cellId, entry.stepIndex)
    }

    const seen = new Set<string>()
    const entries: Array<{
      id: string
      cellId: string
      item: string
      layerName?: string
      stepIndex?: number
    }> = []

    const add = (entry: {
      id: string
      cellId: string
      item: string
      layerName?: string
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
        layerName: layerNameByCellId.get(entry.cellId),
        stepIndex: stepIndexByCellId.get(entry.cellId),
      })
    }
    for (const entry of stepTechItems) {
      add({
        id: entry.id,
        cellId: entry.cellId,
        item: entry.item,
        layerName: entry.layerName,
        stepIndex: entry.stepIndex,
      })
    }

    return entries
  }, [connections.incoming, connections.outgoing, linkedTechItems, stepTechItems])

  const figmaUrl = useMemo(() => {
    if (!selection) return null
    return resolveFigmaUrl(selection.techItem, selectedCell, cellLinks)
  }, [cellLinks, selectedCell, selection])

  // Lane row position of the selected cell — orients up/down direction
  // glyphs on same-step dependency rows.
  const selectedLayerRowPosition = useMemo(() => {
    const pathId = pathEntry?.pathId
    if (!resolvedCellId || !pathId) return -1
    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint) return -1
    return getSelectedCellLayerRowPosition(blueprint, resolvedCellId)
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

    const layerNames = new Map(
      blueprint.layers.map((layer) => [layer.id, layer.name]),
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
            layerNames.get(cell.layer_id) ?? 'Unknown lane',
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
        id: connection.triggerId,
        targetCellId: connection.cellId,
        targetLabel: cellPositionLabel(
          connection.stepIndex,
          connection.stepName,
          connection.layerName,
        ),
        kind: connection.linkKind,
        label: connection.linkLabel,
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
        selection.layerName,
      ),
    }
  }, [pathEntry?.pathId, resolvedCellId, selection])

  const visualStepEntries = useMemo(() => {
    const stepId = selection?.stepId
    const pathId = pathEntry?.pathId
    if (!stepId || !pathId) return []

    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint) return []

    return resolveVisualStepPictureEntries(blueprint, stepId)
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
    const layerRecord =
      blueprint?.layers.find((layer) => layer.name === draft.layerName) ?? null
    const zone =
      layerRecord && blueprint
        ? getBlueprintLayerZone(layerRecord, blueprint.layers)
        : 'frontstage'
    const draftLaneStyle = getBlueprintLayerStyle(
      draft.layerName,
      zone,
      layerRecord?.role,
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
            {draft.layerName}
          </span>
          <CellPanelEditor cellId={null} draft={draft} onDone={clearSelection} />
        </div>
        {/* The editor portals Create/Cancel here — panel-level footing. */}
        <div
          id={CELL_PANEL_FOOTER_ID}
          className="shrink-0 border-t border-muted px-4 py-3 empty:hidden"
        />
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

  const isVisualLayer = Boolean(
    selectedLayer && shouldUseVisualContent(selectedLayer),
  )
  const cellContent =
    selection.paths[0]?.content.trim() ||
    selection.techItem ||
    ''
  const detailBodyText = selectedCell
    ? resolveTechCellDetailText(selection.techItem, selectedCell)
    : cellContent
  const isTechLayer = Boolean(
    selectedLayer && shouldUsePillCellContent(selectedLayer),
  )
  const techDetailLabel =
    isTechLayer && selectedCell
      ? resolveTechCellDetailLabel(selection.techItem, selectedCell)
      : null
  const detailDescriptionText =
    techDetailLabel && detailBodyText.trim() === techDetailLabel
      ? ''
      : detailBodyText
  const detailPictures = resolveCellDetailPictures({
    techItem: selection.techItem,
    cellContent: selection.paths[0]?.content,
    cellPicture: selection.paths[0]?.picture,
    cellLinks,
  })
  const showPicture = Boolean(detailPictures?.length && !isVisualLayer)
  const showTechPill = Boolean(isTechLayer && techDetailLabel)
  const showTechPillAboveTitle =
    showTechPill &&
    (selection.layerName === 'Front Stage Tech' ||
      selection.layerName === 'Back Stage Tech')

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

    const nextSelection = buildTechPillSelectionForItem(
      blueprint,
      resolveBlueprintCellId(cellId),
      techItem,
      selection.scenarioName,
      selection.phaseName,
    )
    if (!nextSelection) return

    selectCell(nextSelection)
    requestAnimationFrame(() => {
      scrollBlueprintTechPillIntoView(cellId, techItem)
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
  // one role-colored chip (colored by layer_role, never by name).
  const cellTitleText =
    cellContent.split('\n')[0]?.trim() || selection.layerName
  const laneChip = laneChipStyle ? (
    <span
      className="w-fit max-w-full truncate rounded-full px-2 py-0.5 text-3xs font-medium leading-tight"
      style={{
        backgroundColor: laneChipStyle.lane,
        color: BLUEPRINT_THEME.cellText,
      }}
      title={selection.layerName}
    >
      {selection.layerName}
    </span>
  ) : null

  const titleRow = (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="min-w-0 text-sm font-bold leading-snug tracking-tight text-foreground">
        {cellTitleText}
      </p>
      {laneChip}
    </div>
  )

  const selectedTechPill = showTechPill ? (
    <TechPillFace
      item={techDetailLabel!}
      compact
      className="w-fit shrink-0 !px-2 !py-0.5 !text-3xs leading-none"
    />
  ) : null

  const pictureBlock = showPicture ? (
    <div className="flex w-full flex-col items-center gap-3">
      {(() => {
        const pictures = detailPictures!
        const useSmallerTechLogo = [
          'social media',
          'on-campus booth',
          'handshake',
          'handshake employer profile',
        ].includes(techDetailLabel?.trim().toLowerCase() ?? '')
        const isTechLogo = (src: string) =>
          useSmallerTechLogo ||
          src.includes('-logo.') ||
          src.includes('/logo/')
        const logos = pictures.filter(isTechLogo)
        const screenshots = pictures.filter((src) => !isTechLogo(src))

        return (
          <>
            {logos.length > 0 ? (
              <div className="flex w-full flex-wrap items-center justify-center gap-3">
                {logos.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className={cn(
                      useSmallerTechLogo
                        ? CELL_DETAIL_SMALL_LOGO_CLASS
                        : CELL_DETAIL_LOGO_CLASS,
                      src.includes('figma-logo.') && 'bg-transparent',
                    )}
                  />
                ))}
              </div>
            ) : null}
            {screenshots.map((src) =>
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

  // A pill that says exactly what the title says is the title twice — one of
  // them yields. The pill keeps the tech identity; the plain-text title only
  // renders when it adds words the pill does not have. Same rule for the
  // description paragraph: a cell with no authored description falls back to
  // its own content, and printing the title again as "description" is the
  // same word twice pretending to be two facts.
  const titleRepeatsPill =
    showTechPill && techDetailLabel?.trim() === cellTitleText.trim()
  const descriptionRepeatsTitle =
    detailDescriptionText.trim() === cellTitleText.trim() ||
    detailDescriptionText.trim() === cellContent.trim()
  const editingCell = canEdit && resolvedCellId !== null

  const overviewContent = (
    <>
      {pictureBlock}
      <div className="flex min-w-0 flex-col gap-2">
        {showTechPillAboveTitle ? selectedTechPill : null}
        {/* In edit mode the form's TEXT field *is* the title; repeating it
            above the field would be the same word twice on one screen. */}
        {editingCell ? (
          titleRepeatsPill ? null : laneChip
        ) : titleRepeatsPill ? (
          laneChip
        ) : (
          titleRow
        )}
        {showTechPill && !showTechPillAboveTitle ? selectedTechPill : null}
        {editingCell && titleRepeatsPill ? laneChip : null}
      </div>
      {/* The description paragraph is the reading view; the editor shows the
          same text inside its DESCRIPTION field instead. */}
      {!editingCell && detailDescriptionText.trim() && !descriptionRepeatsTitle ? (
        <p className="-mt-3 text-sm whitespace-pre-wrap text-foreground/75">
          {detailDescriptionText.trim()}
        </p>
      ) : null}
      {editingCell ? (
        <CellPanelEditor
          cellId={resolvedCellId}
          // Never seed the field with the title wearing a description's
          // clothes — only prose that actually says more than the cell text.
          fallbackDescription={
            descriptionRepeatsTitle ? '' : detailDescriptionText.trim()
          }
          onDone={clearSelection}
        />
      ) : (
        <>
          {/* Basic info (text, description, owners) first; the function/form/
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

        {isVisualLayer ? (
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
                        selectedLayerRowPosition={selectedLayerRowPosition}
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
                      links={cellLinks}
                      figmaUrl={figmaUrl}
                    />
                  ) : null}
                </div>
              </Tabs>
            </div>
            {/* The editor portals Save/Cancel here — below the tabs, shared
                footing for every property the panel holds. */}
            {editingCell ? (
              <div
                id={CELL_PANEL_FOOTER_ID}
                className="shrink-0 border-t border-muted px-4 py-3 empty:hidden"
              />
            ) : null}
            <CellInSlicesFooter cellId={pathEntry?.cellId ?? null} />
          </>
        )}
    </PanelDrawerShell>
  )
}
