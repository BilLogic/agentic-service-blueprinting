import { resolveFocusCells, type FocusCellsResult } from '@/lib/canvasFocusCells'
import {
  compareStepFocusCellIds,
  type CompareStepGroup,
} from '@/lib/compareLedger'
import { setCompareActiveStep } from '@/lib/compareReviewStore'

/**
 * THE compare focus gesture — every caller that flies to compare cells
 * (ledger rows, zone jumps, agent commands) goes through here. (The fold
 * auto-expand step retired with fold, 2026-08-17 — targets are never
 * hidden inside pleats anymore, so this is a straight fly.)
 */
export async function focusCompareCells(
  cellIds: string[],
  slideId: string,
): Promise<FocusCellsResult | null> {
  const focusCells = resolveFocusCells(slideId)
  if (!focusCells) return null
  return focusCells(cellIds)
}

/**
 * The one step-activation gesture, shared by the ledger accordion, the
 * divergence strip's segments/stepper and the `jump_divergence` agent
 * command: mark the step active in the store (the ledger's open group and
 * the strip's highlighted segment both derive from it) and fly the camera to
 * that step's differing cells. Returns the camera outcome, or null when no
 * viewport serves the scenario.
 */
export function jumpToCompareStep(
  group: CompareStepGroup,
  slideId: string,
): Promise<FocusCellsResult | null> {
  setCompareActiveStep(group.columnKey)
  return focusCompareCells(compareStepFocusCellIds(group), slideId)
}
