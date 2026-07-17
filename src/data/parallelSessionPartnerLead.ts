import { EMPTY_CELL_METADATA } from '@/lib/cellMetadata'
import type { BlueprintCell, BlueprintCellTrigger } from '@/types/blueprint'

/** Shared Partner Action: Teacher steps for parallel in-session scenarios. */
export const PARALLEL_SESSION_PARTNER_CONTENT = [
  'Circulate and quietly observe the students.',
  'Remind students to keep working while waiting.',
  'Checks if all students are in the correct breakout room.',
  'Receives information that student is absent from session.',
  'Alerts lead tutor about unassigned or miss-assigned students using the "ask for help" alert.',
  'Handles student tech problems as they arise.',
  'Escalates unresolved issues to tutors@tutor.plus promptly.',
] as const

/** Shared Lead Tutor steps for parallel in-session scenarios. */
export const PARALLEL_SESSION_LEAD_CONTENT = [
  'Rename students to match roster name.',
  'Add any un-rostered students to attendance list.',
  'Manually assign unpaired students to available tutors.',
  'Inform classroom teacher about students that are absent.',
  'Respond to classroom teachers "ask for help" request.',
] as const

export const PARALLEL_SESSION_PARTNER_COLUMN_COUNT =
  PARALLEL_SESSION_PARTNER_CONTENT.length

export const PARALLEL_SESSION_LEAD_COLUMN_COUNT =
  PARALLEL_SESSION_LEAD_CONTENT.length

/** Partner Action cells in warm-up, goal setting, and help request scenarios. */
export const PARALLEL_SESSION_PARTNER_CELL_ID_PATTERN =
  /000000(?:04|06|1a|1b|1f|a0|b0|c0|d0)(\d{2})01$/

export function isParallelSessionPartnerWrapTrigger(
  sourceCellId: string,
  targetCellId: string,
): boolean {
  const sourceMatch = sourceCellId.match(
    PARALLEL_SESSION_PARTNER_CELL_ID_PATTERN,
  )
  const targetMatch = targetCellId.match(
    PARALLEL_SESSION_PARTNER_CELL_ID_PATTERN,
  )
  if (!sourceMatch || !targetMatch) return false

  const sourceStep = Number.parseInt(sourceMatch[1]!, 10)
  const targetStep = Number.parseInt(targetMatch[1]!, 10)
  return targetStep < sourceStep
}

/** Lead Tutor cells in warm-up, goal setting, and help request scenarios. */
export const PARALLEL_SESSION_LEAD_CELL_ID_PATTERN =
  /000000(?:04|06|1a|1b|1f|a0|b0|c0|d0)(\d{2})02$/

export function isParallelSessionLeadWrapTrigger(
  sourceCellId: string,
  targetCellId: string,
): boolean {
  const sourceMatch = sourceCellId.match(PARALLEL_SESSION_LEAD_CELL_ID_PATTERN)
  const targetMatch = targetCellId.match(PARALLEL_SESSION_LEAD_CELL_ID_PATTERN)
  if (!sourceMatch || !targetMatch) return false

  const sourceStep = Number.parseInt(sourceMatch[1]!, 10)
  const targetStep = Number.parseInt(targetMatch[1]!, 10)
  return targetStep < sourceStep
}

export function isParallelSessionOverheadWrapTrigger(
  sourceCellId: string,
  targetCellId: string,
): boolean {
  return isParallelSessionPartnerWrapTrigger(sourceCellId, targetCellId)
}

export function isParallelSessionLeadBottomWrapTrigger(
  sourceCellId: string,
  targetCellId: string,
): boolean {
  return isParallelSessionLeadWrapTrigger(sourceCellId, targetCellId)
}

type PartnerLeadLayerSuffix = '01' | '02'

type BuildPartnerLeadOptions = {
  cellId: (stepSlot: string, layerSuffix: PartnerLeadLayerSuffix) => string
  triggerId: (slot: string) => string
  partnerLayerId: string
  leadLayerId: string
  stepIdForColumn: (column: number) => string
  partnerStepPictures?: readonly (string | undefined)[]
  leadStepPictures?: readonly (string | undefined)[]
}

function cell(
  id: string,
  layerId: string,
  stepId: string,
  content: string,
  picture?: string,
): BlueprintCell {
  return {
    id,
    layer_id: layerId,
    step_id: stepId,
    content,
    ...EMPTY_CELL_METADATA,
    ...(picture ? { picture } : {}),
  }
}

export function buildParallelSessionPartnerLeadCells(
  options: BuildPartnerLeadOptions,
): BlueprintCell[] {
  const cells: BlueprintCell[] = []

  for (let column = 1; column <= PARALLEL_SESSION_PARTNER_COLUMN_COUNT; column++) {
    const stepSlot = String(column).padStart(2, '0')
    const stepId = options.stepIdForColumn(column)
    cells.push(
      cell(
        options.cellId(stepSlot, '01'),
        options.partnerLayerId,
        stepId,
        PARALLEL_SESSION_PARTNER_CONTENT[column - 1]!,
        options.partnerStepPictures?.[column - 1],
      ),
    )
  }

  for (let column = 1; column <= PARALLEL_SESSION_LEAD_COLUMN_COUNT; column++) {
    const stepSlot = String(column).padStart(2, '0')
    const stepId = options.stepIdForColumn(column)
    cells.push(
      cell(
        options.cellId(stepSlot, '02'),
        options.leadLayerId,
        stepId,
        PARALLEL_SESSION_LEAD_CONTENT[column - 1]!,
        options.leadStepPictures?.[column - 1],
      ),
    )
  }

  return cells
}

function trigger(
  options: BuildPartnerLeadOptions,
  slot: string,
  fromStep: string,
  fromLayer: PartnerLeadLayerSuffix,
  toStep: string,
  toLayer: PartnerLeadLayerSuffix,
): BlueprintCellTrigger {
  return {
    id: options.triggerId(slot),
    source_cell_id: options.cellId(fromStep, fromLayer),
    target_cell_id: options.cellId(toStep, toLayer),
  }
}

function rowTriggers(
  options: BuildPartnerLeadOptions,
  layer: PartnerLeadLayerSuffix,
  idStart: number,
  count: number,
): BlueprintCellTrigger[] {
  const triggers: BlueprintCellTrigger[] = []
  for (let i = 0; i < count; i++) {
    const from = String(i + 1).padStart(2, '0')
    const to = String(i + 2).padStart(2, '0')
    triggers.push(
      trigger(
        options,
        String(idStart + i).padStart(3, '0'),
        from,
        layer,
        to,
        layer,
      ),
    )
  }
  return triggers
}

export function buildParallelSessionPartnerLeadTriggers(
  options: BuildPartnerLeadOptions,
): BlueprintCellTrigger[] {
  return [
    ...rowTriggers(options, '01', 1, PARALLEL_SESSION_PARTNER_COLUMN_COUNT - 1),
    ...rowTriggers(options, '02', 20, PARALLEL_SESSION_LEAD_COLUMN_COUNT - 1),
    trigger(options, '033', '04', '02', '04', '01'),
    trigger(options, '034', '04', '01', '04', '02'),
    trigger(options, '035', '05', '02', '05', '01'),
    trigger(options, '036', '05', '01', '05', '02'),
    trigger(
      options,
      '041',
      String(PARALLEL_SESSION_PARTNER_COLUMN_COUNT).padStart(2, '0'),
      '01',
      '01',
      '01',
    ),
    trigger(
      options,
      '042',
      String(PARALLEL_SESSION_LEAD_COLUMN_COUNT).padStart(2, '0'),
      '02',
      '01',
      '02',
    ),
  ]
}
