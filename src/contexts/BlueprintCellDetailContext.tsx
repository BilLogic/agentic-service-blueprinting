import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type {
  BlueprintCellSelection,
  BlueprintPanelSurface,
} from '@/types/blueprintCellDetail'
import type { BlueprintData } from '@/types/blueprint'
import {
  getCompareReviewState,
  subscribeCompareReview,
} from '@/lib/compareReviewStore'
import {
  getBlueprintCellConnections,
  getBlueprintForPath,
} from '@/lib/blueprintCellConnections'
import {
  shouldUsePillCellContent,
  shouldUseVisualContent,
} from '@/lib/blueprintLayout'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'

export type BlueprintCellPreviewHover = {
  cellId: string
  techItem?: string | null
}

export type { BlueprintPanelSurface }

export type BlueprintPanelState = { surface: BlueprintPanelSurface }

type BlueprintCellDetailContextValue = {
  enabled: boolean
  blueprints: BlueprintData[]
  selection: BlueprintCellSelection | null
  selectCell: (selection: BlueprintCellSelection) => void
  clearSelection: () => void
  /**
   * THE single owner of "is the panel open, and on which surface".
   * `null` = closed. Everything else derives: `isOpen`, the drawer's
   * `open`, the surface switcher. Never OR a second boolean into it.
   */
  panelState: BlueprintPanelState | null
  /** Open the Differences (compare ledger) surface — no selection required. */
  openDifferences: () => void
  /** Swap surfaces inside the open drawer — content swap, never close-reopen. */
  setPanelSurface: (surface: BlueprintPanelSurface) => void
  /** Close the panel: clears panelState + selection atomically. */
  closePanel: () => void
  isOpen: boolean
  selectedCellIds: ReadonlySet<string>
  directlyConnectedCellIds: ReadonlySet<string>
  previewHover: BlueprintCellPreviewHover | null
  setPreviewHover: (preview: BlueprintCellPreviewHover | null) => void
}

const BlueprintCellDetailContext =
  createContext<BlueprintCellDetailContextValue | null>(null)

type BlueprintCellDetailProviderProps = {
  children: ReactNode
  /** Clears the open panel when the active scenario or slide changes. */
  resetKey?: string
  enabled?: boolean
  blueprints?: BlueprintData[]
}

export function BlueprintCellDetailProvider({
  children,
  resetKey,
  enabled = false,
  blueprints = [],
}: BlueprintCellDetailProviderProps) {
  const [selection, setSelection] = useState<BlueprintCellSelection | null>(null)
  const [panelState, setPanelState] = useState<BlueprintPanelState | null>(null)
  const [previewHover, setPreviewHover] =
    useState<BlueprintCellPreviewHover | null>(null)

  useEffect(() => {
    setSelection(null)
    setPanelState(null)
    setPreviewHover(null)
  }, [resetKey])

  // The Differences surface only means something while a comparison is live
  // (≥2 selected paths in the focused scenario view). When that stops being
  // true — a path deselected, the scenario left compare — the surface falls
  // back: details if a cell is selected, closed otherwise. Render-phase
  // guarded set (derive-during-render idiom).
  const compareActive =
    useSyncExternalStore(
      subscribeCompareReview,
      () => getCompareReviewState().registration,
    ) !== null
  if (panelState?.surface === 'differences' && !compareActive) {
    setPanelState(selection ? { surface: 'details' } : null)
  }

  const selectCell = useCallback((next: BlueprintCellSelection) => {
    setSelection(next)
    setPanelState({ surface: 'details' })
    setPreviewHover(null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelection(null)
    setPanelState(null)
    setPreviewHover(null)
  }, [])

  const openDifferences = useCallback(() => {
    setPanelState({ surface: 'differences' })
  }, [])

  const setPanelSurface = useCallback((surface: BlueprintPanelSurface) => {
    setPanelState({ surface })
  }, [])

  const closePanel = useCallback(() => {
    setSelection(null)
    setPanelState(null)
    setPreviewHover(null)
  }, [])

  const cellEmphasis = useMemo(() => {
    const selectedCellIds = new Set<string>()
    const directlyConnectedCellIds = new Set<string>()

    if (!selection) {
      return { selectedCellIds, directlyConnectedCellIds }
    }

    const skipHighlightZone = shouldUseVisualContent({
      name: selection.layerName,
    })

    for (const path of selection.paths) {
      const resolvedCellId = resolveBlueprintCellId(path.cellId)
      selectedCellIds.add(path.cellId)
      selectedCellIds.add(resolvedCellId)

      if (skipHighlightZone) continue

      const blueprint = getBlueprintForPath(blueprints, path.pathId)
      if (!blueprint) continue

      const connections = getBlueprintCellConnections(
        blueprint,
        resolvedCellId,
      )
      for (const connection of [
        ...connections.incoming,
        ...connections.outgoing,
      ]) {
        directlyConnectedCellIds.add(connection.cellId)
        directlyConnectedCellIds.add(
          resolveBlueprintCellId(connection.cellId),
        )
      }

      // The dependency table also includes technology in the selected step,
      // even when no explicit trigger connects it to the active cell.
      const techLayerIds = new Set(
        blueprint.layers
          .filter((layer) => shouldUsePillCellContent(layer))
          .map((layer) => layer.id),
      )
      for (const cell of blueprint.cells) {
        if (
          cell.step_id !== selection.stepId ||
          !techLayerIds.has(cell.layer_id)
        ) {
          continue
        }
        directlyConnectedCellIds.add(cell.id)
        directlyConnectedCellIds.add(resolveBlueprintCellId(cell.id))
      }
    }

    return { selectedCellIds, directlyConnectedCellIds }
  }, [blueprints, selection])

  const value = useMemo(
    () => ({
      enabled,
      blueprints,
      selection,
      selectCell,
      clearSelection,
      panelState,
      openDifferences,
      setPanelSurface,
      closePanel,
      isOpen: enabled && panelState !== null,
      selectedCellIds: cellEmphasis.selectedCellIds,
      directlyConnectedCellIds: cellEmphasis.directlyConnectedCellIds,
      previewHover,
      setPreviewHover,
    }),
    [
      enabled,
      blueprints,
      selection,
      selectCell,
      clearSelection,
      panelState,
      openDifferences,
      setPanelSurface,
      closePanel,
      cellEmphasis,
      previewHover,
    ],
  )

  return (
    <BlueprintCellDetailContext.Provider value={value}>
      {children}
    </BlueprintCellDetailContext.Provider>
  )
}

export function useBlueprintCellDetail() {
  const context = useContext(BlueprintCellDetailContext)
  if (!context) {
    throw new Error(
      'useBlueprintCellDetail must be used within BlueprintCellDetailProvider',
    )
  }
  return context
}

export function useBlueprintCellDetailOptional() {
  return useContext(BlueprintCellDetailContext)
}
