import { EMPTY_CELL_METADATA } from '@/lib/cellMetadata'
import {
  STANDARD_SCHEDULING_GOOGLE_SPREADSHEET_STEP_01_DESCRIPTION,
  STANDARD_SCHEDULING_GOOGLE_SPREADSHEET_STEP_01_PICTURE,
  STANDARD_SCHEDULING_PLUS_APP_STEP_02_DESCRIPTION,
  STANDARD_SCHEDULING_REGULAR_TUTOR_STEP_02_PICTURE,
  STANDARD_SCHEDULING_SUPPORT_STEP_01_DESCRIPTION,
  STANDARD_SCHEDULING_SUPPORT_STEP_02_DESCRIPTION,
} from '@/data/standardSchedulingPictures'
import { techDescriptionLink } from '@/lib/blueprintTechDescriptions'
import type {
  BlueprintCell,
  BlueprintCellTrigger,
  BlueprintData,
} from '@/types/blueprint'

export const STANDARD_SCHEDULING_SCENARIO_ID =
  'a0000000-0000-4000-8000-000000000126'

export const STANDARD_SCHEDULING_HAPPY_PATH_ID =
  'a0000000-0000-4000-8000-000000000806'

const STEP_VISUAL_LAYER_ID = 'a0000000-0000-4000-8000-000000000885'

const LAYERS = [
  { id: STEP_VISUAL_LAYER_ID, name: 'Visual', row_position: 0 },
  {
    id: 'a0000000-0000-4000-8000-000000000886',
    name: 'Regular Tutor',
    row_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000888',
    name: 'Front Stage Tech',
    row_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000887',
    name: 'Front Stage Actions',
    row_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000890',
    name: 'Back Stage Tech',
    row_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000889',
    name: 'Back Stage Actions',
    row_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000895',
    name: 'Support Actions',
    row_position: 6,
  },
] as const

const STEPS = [
  {
    id: 'a0000000-0000-4000-8000-000000000894',
    name: 'Review schedules',
    column_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000896',
    name: 'Receive schedule',
    column_position: 2,
  },
] as const

const L = {
  visual: STEP_VISUAL_LAYER_ID,
  regular: 'a0000000-0000-4000-8000-000000000886',
  frontStage: 'a0000000-0000-4000-8000-000000000887',
  frontStageTech: 'a0000000-0000-4000-8000-000000000888',
  backStage: 'a0000000-0000-4000-8000-000000000889',
  backStageTech: 'a0000000-0000-4000-8000-000000000890',
  support: 'a0000000-0000-4000-8000-000000000895',
} as const

function cell(
  id: string,
  layerId: string,
  stepId: string,
  content: string,
  extras?: Partial<Pick<BlueprintCell, 'description' | 'links' | 'picture'>>,
): BlueprintCell {
  return {
    id,
    layer_id: layerId,
    step_id: stepId,
    content,
    ...EMPTY_CELL_METADATA,
    ...extras,
  }
}

function schedCell(stepSlot: string, layerSuffix: string): string {
  return `a0000000-0000-4000-8000-00000014${stepSlot}${layerSuffix}`
}

function schedTrigger(triggerSlot: string): string {
  return `a0000000-0000-4000-8000-000000093${triggerSlot}`
}

function trigger(
  slot: string,
  fromStep: string,
  fromLayer: string,
  toStep: string,
  toLayer: string,
): BlueprintCellTrigger {
  return {
    id: schedTrigger(slot),
    source_cell_id: schedCell(fromStep, fromLayer),
    target_cell_id: schedCell(toStep, toLayer),
  }
}

const STANDARD_SCHEDULING_TRIGGERS: BlueprintCellTrigger[] = [
  // Google Spreadsheet → Tutor supervisor review
  trigger('003', '01', '08', '01', '07'),
  // Supervisor review → send schedule to tutors
  trigger('001', '01', '07', '02', '04'),
  // Supervisor sends schedule → PLUS App
  trigger('002', '02', '04', '02', '06'),
  // PLUS App → tutor receives schedule
  trigger('004', '02', '06', '02', '03'),
]

const STANDARD_SCHEDULING_CELLS: BlueprintCell[] = [
  cell(schedCell('01', '10'), L.visual, STEPS[0].id, ''),

  cell(
    schedCell('01', '07'),
    L.backStage,
    STEPS[0].id,
    'Tutor supervisor team receives and reviews tutor schedules from the Dev Team.',
  ),
  cell(schedCell('01', '08'), L.backStageTech, STEPS[0].id, 'Google Spreadsheet', {
    description: STANDARD_SCHEDULING_GOOGLE_SPREADSHEET_STEP_01_DESCRIPTION,
    links: [
      techDescriptionLink(
        'Google Spreadsheet',
        STANDARD_SCHEDULING_GOOGLE_SPREADSHEET_STEP_01_DESCRIPTION,
        STANDARD_SCHEDULING_GOOGLE_SPREADSHEET_STEP_01_PICTURE,
      ),
    ],
  }),
  cell(schedCell('01', '09'), L.support, STEPS[0].id, 'Dev Team', {
    description: STANDARD_SCHEDULING_SUPPORT_STEP_01_DESCRIPTION,
  }),

  cell(schedCell('02', '10'), L.visual, STEPS[1].id, ''),
  cell(
    schedCell('02', '03'),
    L.regular,
    STEPS[1].id,
    'Receive schedule for the semester.',
    { picture: STANDARD_SCHEDULING_REGULAR_TUTOR_STEP_02_PICTURE },
  ),
  cell(
    schedCell('02', '04'),
    L.frontStage,
    STEPS[1].id,
    'Tutor supervisor team sends schedule.',
  ),
  cell(schedCell('02', '06'), L.frontStageTech, STEPS[1].id, 'PLUS App', {
    description: STANDARD_SCHEDULING_PLUS_APP_STEP_02_DESCRIPTION,
    links: [
      techDescriptionLink(
        'PLUS App',
        STANDARD_SCHEDULING_PLUS_APP_STEP_02_DESCRIPTION,
      ),
    ],
  }),
  cell(schedCell('02', '09'), L.support, STEPS[1].id, 'Dev Team\nDesign Team', {
    description: STANDARD_SCHEDULING_SUPPORT_STEP_02_DESCRIPTION,
  }),
]

export const STANDARD_SCHEDULING_HAPPY_PATH_FALLBACK: BlueprintData = {
  path: {
    id: STANDARD_SCHEDULING_HAPPY_PATH_ID,
    name: 'Happy Path',
    description: 'Tutors receive semester schedule.',
    note: null,
    path_type: 'happy',
  },
  layers: [...LAYERS],
  steps: [...STEPS],
  cells: STANDARD_SCHEDULING_CELLS,
  triggers: STANDARD_SCHEDULING_TRIGGERS,
}
