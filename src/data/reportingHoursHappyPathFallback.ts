import { REPORTING_HOURS_REGULAR_TUTOR_ONBOARDING_LINKS } from '@/data/onboardingModuleLinks'
import { EMPTY_CELL_METADATA } from '@/lib/cellMetadata'
import {
  REPORTING_HOURS_BANK_STEP_03_DESCRIPTION,
  REPORTING_HOURS_LEAD_TUTOR_STEP_01_PICTURE,
  REPORTING_HOURS_LEAD_TUTOR_STEP_03_PICTURE,
  REPORTING_HOURS_REGULAR_TUTOR_STEP_01_PICTURE,
  REPORTING_HOURS_REGULAR_TUTOR_STEP_03_PICTURE,
  REPORTING_HOURS_WORKDAY_LOGO,
  REPORTING_HOURS_WORKDAY_STEP_01_DESCRIPTION,
  REPORTING_HOURS_WORKDAY_STEP_02_DESCRIPTION,
} from '@/data/reportingHoursPictures'
import { techDescriptionLink, mergeUrlLinks } from '@/lib/blueprintTechDescriptions'
import type {
  BlueprintCell,
  BlueprintCellTrigger,
  BlueprintData,
} from '@/types/blueprint'

export const REPORTING_HOURS_SCENARIO_ID =
  'a0000000-0000-4000-8000-000000000208'

export const REPORTING_HOURS_HAPPY_PATH_ID =
  'a0000000-0000-4000-8000-000000000812'

const STEP_VISUAL_LAYER_ID = 'a0000000-0000-4000-8000-000000000920'

const LAYERS = [
  { id: STEP_VISUAL_LAYER_ID, name: 'Visual', row_position: 0 },
  {
    id: 'a0000000-0000-4000-8000-000000000927',
    name: 'Lead Tutor',
    row_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000921',
    name: 'Regular Tutor',
    row_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000923',
    name: 'Front Stage Tech',
    row_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000922',
    name: 'Front Stage Actions',
    row_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000925',
    name: 'Back Stage Tech',
    row_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000924',
    name: 'Back Stage Actions',
    row_position: 6,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000926',
    name: 'Support Actions',
    row_position: 7,
  },
] as const

const STEPS = [
  {
    id: 'a0000000-0000-4000-8000-000000000992',
    name: 'Report hours',
    column_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000994',
    name: 'Approve hours',
    column_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000995',
    name: 'Receive paycheck',
    column_position: 3,
  },
] as const

const L = {
  visual: STEP_VISUAL_LAYER_ID,
  lead: 'a0000000-0000-4000-8000-000000000927',
  regular: 'a0000000-0000-4000-8000-000000000921',
  frontStage: 'a0000000-0000-4000-8000-000000000922',
  frontStageTech: 'a0000000-0000-4000-8000-000000000923',
  backStage: 'a0000000-0000-4000-8000-000000000924',
  backStageTech: 'a0000000-0000-4000-8000-000000000925',
  support: 'a0000000-0000-4000-8000-000000000926',
} as const

function cell(
  id: string,
  layerId: string,
  stepId: string,
  content: string,
  metadata: Partial<Pick<BlueprintCell, 'picture' | 'description' | 'links'>> = {},
): BlueprintCell {
  const links =
    layerId === L.regular || layerId === L.lead
      ? mergeUrlLinks(metadata.links ?? [], REPORTING_HOURS_REGULAR_TUTOR_ONBOARDING_LINKS)
      : (metadata.links ?? EMPTY_CELL_METADATA.links)

  return {
    id,
    layer_id: layerId,
    step_id: stepId,
    content,
    ...EMPTY_CELL_METADATA,
    ...metadata,
    links,
  }
}

function hoursCell(stepSlot: string, layerSuffix: string): string {
  return `a0000000-0000-4000-8000-0000001e${stepSlot}${layerSuffix}`
}

function hoursTrigger(triggerSlot: string): string {
  return `a0000000-0000-4000-8000-000000098${triggerSlot}`
}

function trigger(
  slot: string,
  fromStep: string,
  fromLayer: string,
  toStep: string,
  toLayer: string,
): BlueprintCellTrigger {
  return {
    id: hoursTrigger(slot),
    source_cell_id: hoursCell(fromStep, fromLayer),
    target_cell_id: hoursCell(toStep, toLayer),
  }
}

const REPORT_HOURS_STEP_ID = STEPS[0].id
const APPROVE_HOURS_STEP_ID = STEPS[1].id
const RECEIVE_PAYCHECK_STEP_ID = STEPS[2].id

/** Report hours → approve hours → receive paycheck. */
const REPORTING_HOURS_TRIGGERS: BlueprintCellTrigger[] = [
  trigger('090', '01', '03', '01', '06'),
  trigger('091', '01', '02', '01', '06'),
  trigger('094', '01', '06', '03', '07'),
  trigger('085', '03', '07', '03', '08'),
  trigger('086', '03', '08', '02', '06'),
  trigger('092', '02', '06', '02', '02'),
  trigger('093', '02', '06', '02', '03'),
]

const REPORTING_HOURS_CELLS: BlueprintCell[] = [
  cell(hoursCell('01', '10'), L.visual, REPORT_HOURS_STEP_ID, ''),
  cell(
    hoursCell('01', '02'),
    L.lead,
    REPORT_HOURS_STEP_ID,
    'Report hours by week deadline.',
    { picture: REPORTING_HOURS_LEAD_TUTOR_STEP_01_PICTURE },
  ),
  cell(
    hoursCell('01', '03'),
    L.regular,
    REPORT_HOURS_STEP_ID,
    'Report hours by week deadline.',
    { picture: REPORTING_HOURS_REGULAR_TUTOR_STEP_01_PICTURE },
  ),
  cell(
    hoursCell('01', '06'),
    L.frontStageTech,
    REPORT_HOURS_STEP_ID,
    'Workday',
    {
      links: [
        techDescriptionLink(
          'Workday',
          REPORTING_HOURS_WORKDAY_STEP_01_DESCRIPTION,
          REPORTING_HOURS_WORKDAY_LOGO,
        ),
      ],
    },
  ),

  cell(hoursCell('02', '10'), L.visual, RECEIVE_PAYCHECK_STEP_ID, ''),
  cell(
    hoursCell('02', '02'),
    L.lead,
    RECEIVE_PAYCHECK_STEP_ID,
    'Receives biweekly paycheck.',
    { picture: REPORTING_HOURS_LEAD_TUTOR_STEP_03_PICTURE },
  ),
  cell(
    hoursCell('02', '03'),
    L.regular,
    RECEIVE_PAYCHECK_STEP_ID,
    'Receives biweekly paycheck.',
    { picture: REPORTING_HOURS_REGULAR_TUTOR_STEP_03_PICTURE },
  ),
  cell(
    hoursCell('02', '06'),
    L.frontStageTech,
    RECEIVE_PAYCHECK_STEP_ID,
    'Bank',
    {
      links: [
        techDescriptionLink('Bank', REPORTING_HOURS_BANK_STEP_03_DESCRIPTION),
      ],
    },
  ),

  cell(hoursCell('03', '10'), L.visual, APPROVE_HOURS_STEP_ID, ''),
  cell(
    hoursCell('03', '07'),
    L.backStage,
    APPROVE_HOURS_STEP_ID,
    'PLUS supervisor team reviews and approves hours.',
  ),
  cell(
    hoursCell('03', '08'),
    L.backStageTech,
    APPROVE_HOURS_STEP_ID,
    'Workday',
    {
      links: [
        techDescriptionLink(
          'Workday',
          REPORTING_HOURS_WORKDAY_STEP_02_DESCRIPTION,
          REPORTING_HOURS_WORKDAY_LOGO,
        ),
      ],
    },
  ),
]

export const REPORTING_HOURS_HAPPY_PATH_FALLBACK: BlueprintData = {
  path: {
    id: REPORTING_HOURS_HAPPY_PATH_ID,
    name: 'Happy Path',
    description: 'Tutor reports hours after tutoring session.',
    note: null,
    path_type: 'happy',
  },
  layers: [...LAYERS],
  steps: [...STEPS],
  cells: REPORTING_HOURS_CELLS,
  triggers: REPORTING_HOURS_TRIGGERS,
}
