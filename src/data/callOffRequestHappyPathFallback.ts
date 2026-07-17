import { CALL_OFF_REQUEST_REGULAR_TUTOR_ONBOARDING_LINKS } from '@/data/onboardingModuleLinks'
import { EMPTY_CELL_METADATA } from '@/lib/cellMetadata'
import {
  CALL_OFF_REQUEST_EMAIL_STEP_03_DESCRIPTION,
  CALL_OFF_REQUEST_EMAIL_STEP_06_DESCRIPTION,
  CALL_OFF_REQUEST_GOOGLE_SPREADSHEET_STEP_05_DESCRIPTION,
  CALL_OFF_REQUEST_GOOGLE_SPREADSHEET_STEP_05_PICTURE,
  CALL_OFF_REQUEST_REGULAR_TUTOR_STEP_01_PICTURE,
  CALL_OFF_REQUEST_REGULAR_TUTOR_STEP_02_PICTURE,
  CALL_OFF_REQUEST_REGULAR_TUTOR_STEP_03_PICTURE,
  CALL_OFF_REQUEST_REGULAR_TUTOR_STEP_04_PICTURE,
  CALL_OFF_REQUEST_REGULAR_TUTOR_STEP_06_PICTURE,
  CALL_OFF_REQUEST_SHIFT_SWAP_FORM_STEP_02_DESCRIPTION,
  CALL_OFF_REQUEST_SLACK_STEP_04_DESCRIPTION,
  CALL_OFF_REQUEST_SUPPORT_STEP_05_DESCRIPTION,
} from '@/data/callOffRequestPictures'
import { techDescriptionLink, mergeUrlLinks } from '@/lib/blueprintTechDescriptions'
import {
  EMAIL_TECH_LOGO,
  GOOGLE_FORM_TECH_LOGO,
  SLACK_TECH_LOGO,
} from '@/lib/blueprintTechPictures'
import type {
  BlueprintCell,
  BlueprintCellTrigger,
  BlueprintData,
} from '@/types/blueprint'

export const CALL_OFF_REQUEST_SCENARIO_ID =
  'a0000000-0000-4000-8000-000000000128'

export const CALL_OFF_REQUEST_HAPPY_PATH_ID =
  'a0000000-0000-4000-8000-000000000808'

const STEP_VISUAL_LAYER_ID = 'a0000000-0000-4000-8000-000000000971'

const LAYERS = [
  { id: STEP_VISUAL_LAYER_ID, name: 'Visual', row_position: 0 },
  {
    id: 'a0000000-0000-4000-8000-000000000972',
    name: 'Regular Tutor',
    row_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000974',
    name: 'Front Stage Tech',
    row_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000973',
    name: 'Front Stage Actions',
    row_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000976',
    name: 'Back Stage Tech',
    row_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000975',
    name: 'Back Stage Actions',
    row_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000977',
    name: 'Support Actions',
    row_position: 6,
  },
] as const

const STEPS = [
  {
    id: 'a0000000-0000-4000-8000-000000000940',
    name: 'Initial need',
    column_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000941',
    name: 'Early call-off',
    column_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000942',
    name: 'Late call-off',
    column_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000943',
    name: 'Peer support',
    column_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000944',
    name: 'Internal decision',
    column_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000945',
    name: 'Final notification',
    column_position: 6,
  },
] as const

const L = {
  visual: STEP_VISUAL_LAYER_ID,
  regular: 'a0000000-0000-4000-8000-000000000972',
  frontStage: 'a0000000-0000-4000-8000-000000000973',
  frontStageTech: 'a0000000-0000-4000-8000-000000000974',
  backStage: 'a0000000-0000-4000-8000-000000000975',
  backStageTech: 'a0000000-0000-4000-8000-000000000976',
  support: 'a0000000-0000-4000-8000-000000000977',
} as const

function cell(
  id: string,
  layerId: string,
  stepId: string,
  content: string,
  extras: Partial<Pick<BlueprintCell, 'picture' | 'description' | 'links'>> = {},
): BlueprintCell {
  const links =
    layerId === L.regular
      ? mergeUrlLinks(extras.links ?? [], CALL_OFF_REQUEST_REGULAR_TUTOR_ONBOARDING_LINKS)
      : (extras.links ?? EMPTY_CELL_METADATA.links)

  return {
    id,
    layer_id: layerId,
    step_id: stepId,
    content,
    ...EMPTY_CELL_METADATA,
    ...extras,
    links,
  }
}

function callOffCell(stepSlot: string, layerSuffix: string): string {
  return `a0000000-0000-4000-8000-00000017${stepSlot}${layerSuffix}`
}

function callOffTrigger(triggerSlot: string): string {
  return `a0000000-0000-4000-8000-000000095${triggerSlot}`
}

function trigger(
  slot: string,
  fromStep: string,
  fromLayer: string,
  toStep: string,
  toLayer: string,
): BlueprintCellTrigger {
  return {
    id: callOffTrigger(slot),
    source_cell_id: callOffCell(fromStep, fromLayer),
    target_cell_id: callOffCell(toStep, toLayer),
  }
}

const CALL_OFF_REQUEST_TRIGGERS: BlueprintCellTrigger[] = [
  trigger('001', '01', '03', '02', '03'),
  trigger('003', '01', '03', '03', '03'),
  trigger('002', '02', '03', '02', '06'),
  trigger('004', '02', '06', '02', '07'),
  trigger('011', '02', '07', '05', '07'),
  trigger('005', '03', '03', '03', '06'),
  trigger('010', '03', '06', '03', '04'),
  trigger('012', '03', '04', '05', '07'),
  trigger('006', '03', '03', '04', '03'),
  trigger('007', '04', '03', '04', '06'),
  trigger('013', '04', '04', '04', '06'),
  trigger('014', '05', '07', '05', '08'),
  trigger('008', '05', '07', '06', '04'),
  trigger('015', '06', '04', '06', '06'),
  trigger('016', '06', '03', '06', '06'),
]

const CALL_OFF_REQUEST_CELLS: BlueprintCell[] = [
  cell(callOffCell('01', '10'), L.visual, STEPS[0].id, ''),
  cell(callOffCell('01', '03'), L.regular, STEPS[0].id, 'Tutor needs to call off.', {
    picture: CALL_OFF_REQUEST_REGULAR_TUTOR_STEP_01_PICTURE,
  }),

  cell(callOffCell('02', '10'), L.visual, STEPS[1].id, ''),
  cell(
    callOffCell('02', '03'),
    L.regular,
    STEPS[1].id,
    "If it's 12 or more hours before session, tutor complete shift swap form.",
    { picture: CALL_OFF_REQUEST_REGULAR_TUTOR_STEP_02_PICTURE },
  ),
  cell(callOffCell('02', '06'), L.frontStageTech, STEPS[1].id, 'Shift Swap Google Form', {
    links: [
      techDescriptionLink(
        'Shift Swap Google Form',
        CALL_OFF_REQUEST_SHIFT_SWAP_FORM_STEP_02_DESCRIPTION,
        GOOGLE_FORM_TECH_LOGO,
      ),
    ],
  }),
  cell(
    callOffCell('02', '07'),
    L.backStage,
    STEPS[1].id,
    'Tutor supervisor team reviews Google Form request for shift swap.',
  ),

  cell(callOffCell('03', '10'), L.visual, STEPS[2].id, ''),
  cell(
    callOffCell('03', '03'),
    L.regular,
    STEPS[2].id,
    'If it is less than 12 hours before session, tutor emails supervisor.',
    { picture: CALL_OFF_REQUEST_REGULAR_TUTOR_STEP_03_PICTURE },
  ),
  cell(
    callOffCell('03', '04'),
    L.frontStage,
    STEPS[2].id,
    'Tutor supervisor receives email request for shift swap.',
  ),
  cell(callOffCell('03', '06'), L.frontStageTech, STEPS[2].id, 'Email', {
    links: [
      techDescriptionLink(
        'Email',
        CALL_OFF_REQUEST_EMAIL_STEP_03_DESCRIPTION,
        EMAIL_TECH_LOGO,
      ),
    ],
  }),

  cell(callOffCell('04', '10'), L.visual, STEPS[3].id, ''),
  cell(
    callOffCell('04', '03'),
    L.regular,
    STEPS[3].id,
    'Tutor send message in #shift-swap to see if anyone can cover.',
    { picture: CALL_OFF_REQUEST_REGULAR_TUTOR_STEP_04_PICTURE },
  ),
  cell(
    callOffCell('04', '04'),
    L.frontStage,
    STEPS[3].id,
    'Other tutors in #shift-swap channel may or may not respond.',
  ),
  cell(callOffCell('04', '06'), L.frontStageTech, STEPS[3].id, 'Slack', {
    links: [
      techDescriptionLink(
        'Slack',
        CALL_OFF_REQUEST_SLACK_STEP_04_DESCRIPTION,
        SLACK_TECH_LOGO,
      ),
    ],
  }),

  cell(callOffCell('05', '10'), L.visual, STEPS[4].id, ''),
  cell(
    callOffCell('05', '07'),
    L.backStage,
    STEPS[4].id,
    'Tutor supervisor team may or may not find replacement for tutor and determines if this counts as excused or unexcused decision.',
  ),
  cell(
    callOffCell('05', '08'),
    L.backStageTech,
    STEPS[4].id,
    'Google Spreadsheet',
    {
      links: [
        techDescriptionLink(
          'Google Spreadsheet',
          CALL_OFF_REQUEST_GOOGLE_SPREADSHEET_STEP_05_DESCRIPTION,
          CALL_OFF_REQUEST_GOOGLE_SPREADSHEET_STEP_05_PICTURE,
        ),
      ],
    },
  ),
  cell(callOffCell('05', '09'), L.support, STEPS[4].id, 'Dev Team', {
    description: CALL_OFF_REQUEST_SUPPORT_STEP_05_DESCRIPTION,
  }),

  cell(callOffCell('06', '10'), L.visual, STEPS[5].id, ''),
  cell(
    callOffCell('06', '03'),
    L.regular,
    STEPS[5].id,
    'Tutor receives excused or unexcused decision.',
    { picture: CALL_OFF_REQUEST_REGULAR_TUTOR_STEP_06_PICTURE },
  ),
  cell(
    callOffCell('06', '04'),
    L.frontStage,
    STEPS[5].id,
    'Tutor supervisor team sends excuse decision.',
  ),
  cell(callOffCell('06', '06'), L.frontStageTech, STEPS[5].id, 'Email', {
    links: [
      techDescriptionLink(
        'Email',
        CALL_OFF_REQUEST_EMAIL_STEP_06_DESCRIPTION,
        EMAIL_TECH_LOGO,
      ),
    ],
  }),
]

export const CALL_OFF_REQUEST_HAPPY_PATH_FALLBACK: BlueprintData = {
  path: {
    id: CALL_OFF_REQUEST_HAPPY_PATH_ID,
    name: 'Happy Path',
    description: 'Tutor calls off shift for upcoming session.',
    note: null,
    path_type: 'happy',
  },
  layers: [...LAYERS],
  steps: [...STEPS],
  cells: CALL_OFF_REQUEST_CELLS,
  triggers: CALL_OFF_REQUEST_TRIGGERS,
}
