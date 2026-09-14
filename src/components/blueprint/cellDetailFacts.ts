import { useMemo } from 'react'
import { describeLaneRole, getLaneRole } from '@/lib/laneRoles'
import { featuredPresentation } from '@/lib/resourcePresentation'
import {
  getBlueprintCellConnections,
  getBlueprintForPath,
  getLinkedTechFromConnections,
  getSelectedCellLaneRowPosition,
} from '@/lib/blueprintCellConnections'
import { getBlueprintStepTechItems } from '@/lib/blueprintStepTech'
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
import type { ExistingDependency } from '@/components/blueprint/CellDependencyEditor'
import type { DraftCellTarget } from '@/components/blueprint/CellPanelEditor'
import type { DependencyEndpoint } from '@/lib/dependencyValidation'
import type {
  BlueprintCell,
  BlueprintData,
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

/**
 * Everything the cell panel derives from the board about one selected cell.
 *
 * The panel used to work all of this out inline, between its own state and
 * its own markup, which is why a reader looking for what a cell IS had to
 * read past what the drawer DOES. One hook, one question: given a selection
 * (or a draft) and the boards in memory, what is there to show?
 *
 * Every entry is derived — nothing here is state, and nothing here writes.
 */
export function useCellDetailFacts({
  blueprints,
  selection,
  draft,
}: {
  blueprints: BlueprintData[]
  selection: BlueprintCellSelection | null
  draft: DraftCellTarget | null
}) {
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
    The cell's buttons: every featured link — the selected placement's, then
    the cell's own — named by its host.
  */
  const featured = useMemo(
    () =>
      selection
        ? featuredPresentation({
            placementId: selectedPlacement?.id ?? null,
            resources: cellResourceList,
          })
        : { buttons: [] },
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
  // those are the ones it may change or remove. An incoming arrow belongs to
  // the cell at the other end, and is edited from there.
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
        note: connection.linkNote,
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


  return {
    pathEntry,
    resolvedCellId,
    connections,
    selectedCell,
    cellTouchpointList,
    cellResourceList,
    laneResolution,
    otherTechEntries,
    selectedPlacement,
    touchpointDetail,
    featured,
    selectedLaneRowPosition,
    dependencyCandidates,
    existingDependencies,
    dependencySource,
    storyboardStepEntries,
  }
}
