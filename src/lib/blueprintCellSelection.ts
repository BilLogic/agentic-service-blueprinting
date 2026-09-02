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

export function buildTechPillSelection(
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

export function getTechPillItems(content: string | undefined): string[] {
  return parseCellContentItems(content ?? '')
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
