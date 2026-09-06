import { parseCellContentItems } from '@/lib/parseCellContent'
import type { PathKind } from '@/types/database'
import type { CellResource, CellTouchpoint } from '@/types/blueprint'
import type { BlueprintCellSelection } from '@/types/blueprintCellDetail'

export type BlueprintCellSelectionContext = {
  scenarioName: string
  phaseName?: string
  laneName: string
  stepId: string
  stepName: string
  stepIndex: number
  cellId: string
  cellContent: string
  cellFrame?: string | null
  cellSummary?: string | null
  cellTouchpoints?: CellTouchpoint[]
  cellResources?: CellResource[]
  pathId: string
  pathName: string
  pathSummary?: string | null
  pathKind: PathKind
}

export function buildBlueprintCellSelection(
  context: BlueprintCellSelectionContext,
): BlueprintCellSelection {
  return {
    scenarioName: context.scenarioName,
    phaseName: context.phaseName,
    laneName: context.laneName,
    stepId: context.stepId,
    stepName: context.stepName,
    stepIndex: context.stepIndex,
    paths: [
      {
        cellId: context.cellId,
        pathId: context.pathId,
        pathName: context.pathName,
        pathSummary: context.pathSummary ?? null,
        pathKind: context.pathKind,
        content: context.cellContent,
        frame: context.cellFrame ?? null,
        summary: context.cellSummary ?? null,
        touchpoints: context.cellTouchpoints ?? [],
        resources: context.cellResources ?? [],
      },
    ],
  }
}

export function buildTouchpointSelection(
  context: BlueprintCellSelectionContext,
  techItem: string,
): BlueprintCellSelection {
  return {
    scenarioName: context.scenarioName,
    phaseName: context.phaseName,
    laneName: context.laneName,
    stepId: context.stepId,
    stepName: context.stepName,
    stepIndex: context.stepIndex,
    techItem,
    paths: [
      {
        cellId: context.cellId,
        pathId: context.pathId,
        pathName: context.pathName,
        pathSummary: context.pathSummary ?? null,
        pathKind: context.pathKind,
        content: techItem,
        frame: context.cellFrame ?? null,
        summary: context.cellSummary ?? null,
        touchpoints: context.cellTouchpoints ?? [],
        resources: context.cellResources ?? [],
      },
    ],
  }
}

/**
 * The touchpoint names a cell shows, in order.
 *
 * Reads placements when the cell has them and falls back to splitting the
 * text when it does not. The fallback is not dead code: compare slots and
 * the hand-written fixtures hand this function a cell that never went
 * through the normalizer, and splitting the text is what those sources
 * mean. Where placements exist they win, because they are what the board is
 * drawn from and what an author's edit writes.
 *
 * A name-only placement (#112) is what makes that preference load-bearing
 * rather than tidy: its name is in no text, so a reader that split the text
 * would drop it silently. Whether a name IS one is not answered here — that
 * is `isNameOnlyPlacement` in `cellTouchpoints.ts`, which reads the row as
 * well as the registry link, and so does not mistake a fallback placement,
 * which has neither, for one.
 */
export function getTouchpointNames(cell: {
  content?: string | null
  touchpoints?: readonly { name: string }[]
}): string[] {
  if (cell.touchpoints?.length) return cell.touchpoints.map((entry) => entry.name)
  return parseCellContentItems(cell.content ?? '')
}

export function isSameBlueprintCellSelection(
  current: BlueprintCellSelection | null,
  next: BlueprintCellSelection,
): boolean {
  if (!current) return false
  if (current.scenarioName !== next.scenarioName) return false
  if (current.laneName !== next.laneName) return false
  if (current.stepName !== next.stepName) return false
  if (current.stepIndex !== next.stepIndex) return false
  if ((current.techItem ?? null) !== (next.techItem ?? null)) return false
  if (current.paths.length !== next.paths.length) return false

  return current.paths.every(
    (entry, index) => entry.cellId === next.paths[index]?.cellId,
  )
}
