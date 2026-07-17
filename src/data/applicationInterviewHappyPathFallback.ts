import {
  INTERVIEW_EMAIL_STEP_02_DESCRIPTION,
  INTERVIEW_EMAIL_STEP_05_DESCRIPTION,
  INTERVIEW_GOOGLE_FORM_STEP_01_DESCRIPTION,
  INTERVIEW_REGULAR_TUTOR_STEP_1_PICTURE,
  INTERVIEW_REGULAR_TUTOR_STEP_2_PICTURE,
  INTERVIEW_REGULAR_TUTOR_STEP_3_PICTURE,
  INTERVIEW_REGULAR_TUTOR_STEP_4_PICTURE,
  INTERVIEW_REGULAR_TUTOR_STEP_5_PICTURE,
  INTERVIEW_NOTION_STEP_03_DESCRIPTION,
  INTERVIEW_NOTION_STEP_04_DESCRIPTION,
  INTERVIEW_ZOOM_RECORDING_STEP_03_DESCRIPTION,
  INTERVIEW_ZOOM_STEP_03_DESCRIPTION,
  INTERVIEW_ZOOM_STEP_04_DESCRIPTION,
} from '@/data/applicationInterviewPictures'
import { EMPTY_CELL_METADATA } from '@/lib/cellMetadata'
import { techDescriptionLink } from '@/lib/blueprintTechDescriptions'
import {
  EMAIL_TECH_LOGO,
  GOOGLE_FORM_TECH_LOGO,
  NOTION_TECH_LOGO,
  ZOOM_TECH_LOGO,
} from '@/lib/blueprintTechPictures'
import type {
  BlueprintCell,
  BlueprintCellTrigger,
  BlueprintData,
} from '@/types/blueprint'
export const APPLICATION_INTERVIEW_HAPPY_PATH_ID =
  'a0000000-0000-4000-8000-000000000702'

const STEP_VISUAL_LAYER_ID = 'a0000000-0000-4000-8000-000000000810'

const LAYERS = [
  { id: STEP_VISUAL_LAYER_ID, name: 'Visual', row_position: 0 },
  {
    id: 'a0000000-0000-4000-8000-000000000803',
    name: 'Regular Tutor',
    row_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000806',
    name: 'Front Stage Tech',
    row_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000804',
    name: 'Front Stage Actions',
    row_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000808',
    name: 'Back Stage Tech',
    row_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000807',
    name: 'Back Stage Actions',
    row_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000809',
    name: 'Support Actions',
    row_position: 6,
  },
] as const

const STEPS = [
  {
    id: 'a0000000-0000-4000-8000-000000000731',
    name: 'Applies',
    column_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000732',
    name: 'Receives email invitation for group interview',
    column_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000733',
    name: 'Group interviews',
    column_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000734',
    name: 'Waits for offer decision',
    column_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000735',
    name: 'Receives offer decision',
    column_position: 5,
  },
] as const

const L = {
  visual: STEP_VISUAL_LAYER_ID,
  regular: 'a0000000-0000-4000-8000-000000000803',
  frontStage: 'a0000000-0000-4000-8000-000000000804',
  frontStageTech: 'a0000000-0000-4000-8000-000000000806',
  backStage: 'a0000000-0000-4000-8000-000000000807',
  backStageTech: 'a0000000-0000-4000-8000-000000000808',
  support: 'a0000000-0000-4000-8000-000000000809',
} as const

function cell(
  id: string,
  layerId: string,
  stepId: string,
  content: string,
  metadata: Partial<
    Pick<BlueprintCell, 'picture' | 'description' | 'links'>
  > = {},
): BlueprintCell {
  return {
    id,
    layer_id: layerId,
    step_id: stepId,
    content,
    ...EMPTY_CELL_METADATA,
    ...metadata,
  }
}

function iCell(stepSlot: string, layerSuffix: string): string {
  return `a0000000-0000-4000-8000-00000009${stepSlot}${layerSuffix}`
}

function iTrigger(triggerSlot: string): string {
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
    id: iTrigger(slot),
    source_cell_id: iCell(fromStep, fromLayer),
    target_cell_id: iCell(toStep, toLayer),
  }
}

const INTERVIEW_TRIGGERS: BlueprintCellTrigger[] = [
  // Step 1 — application form setup
  trigger('001', '01', '07', '01', '06'),
  trigger('002', '01', '07', '02', '07'),
  trigger('005', '01', '03', '01', '06'),

  // Applies → review & invitation
  trigger('003', '02', '07', '02', '04'),
  trigger('004', '02', '04', '02', '06'),
  trigger('006', '02', '06', '02', '03'),

  // Regular Tutor forward chain
  trigger('011', '01', '03', '02', '03'),
  trigger('012', '02', '03', '03', '03'),
  trigger('013', '03', '03', '04', '03'),
  trigger('014', '04', '03', '05', '03'),

  // Group interview
  trigger('023', '03', '04', '03', '06'),
  trigger('024', '03', '03', '03', '06'),
  trigger('025', '03', '07', '03', '08'),

  // Decision processing → offer
  trigger('031', '03', '07', '04', '07'),
  trigger('032', '04', '07', '04', '08'),
  // Step 4 back stage → step 5 front stage
  trigger('041', '04', '07', '05', '04'),
  trigger('042', '05', '04', '05', '06'),
  trigger('043', '05', '06', '05', '03'),
]

const INTERVIEW_CELLS: BlueprintCell[] = [
  ...STEPS.map((step, stepIndex) =>
    cell(
      iCell(String(stepIndex + 1).padStart(2, '0'), '10'),
      L.visual,
      step.id,
      '',
    ),
  ),

  // Step 1 — Applies
  cell(iCell('01', '03'), L.regular, STEPS[0].id, 'Applies.', {
    picture: INTERVIEW_REGULAR_TUTOR_STEP_1_PICTURE,
  }),
  cell(
    iCell('01', '06'),
    L.frontStageTech,
    STEPS[0].id,
    'Google Form Application',
    {
      picture: GOOGLE_FORM_TECH_LOGO,
      links: [
        techDescriptionLink(
          'Google Form Application',
          INTERVIEW_GOOGLE_FORM_STEP_01_DESCRIPTION,
          GOOGLE_FORM_TECH_LOGO,
        ),
      ],
    },
  ),
  cell(
    iCell('01', '07'),
    L.backStage,
    STEPS[0].id,
    'Tutor supervisor team creates and manages application form.',
  ),

  // Step 2 — Review & invitation
  cell(
    iCell('02', '03'),
    L.regular,
    STEPS[1].id,
    'Receives email invitation for group interview.',
    {
      picture: INTERVIEW_REGULAR_TUTOR_STEP_2_PICTURE,
    },
  ),
  cell(
    iCell('02', '04'),
    L.frontStage,
    STEPS[1].id,
    'Tutor supervisor team invites applicant for group interview.',
  ),
  cell(iCell('02', '06'), L.frontStageTech, STEPS[1].id, 'Email', {
    picture: EMAIL_TECH_LOGO,
    links: [
      techDescriptionLink(
        'Email',
        INTERVIEW_EMAIL_STEP_02_DESCRIPTION,
        EMAIL_TECH_LOGO,
      ),
    ],
  }),
  cell(
    iCell('02', '07'),
    L.backStage,
    STEPS[1].id,
    'Tutor supervisor team receives and reviews application.',
  ),

  // Step 3 — Group interview
  cell(iCell('03', '03'), L.regular, STEPS[2].id, 'Group interviews.', {
    picture: INTERVIEW_REGULAR_TUTOR_STEP_3_PICTURE,
  }),
  cell(
    iCell('03', '04'),
    L.frontStage,
    STEPS[2].id,
    'Tutor supervisor team facilitates group interview.',
  ),
  cell(iCell('03', '06'), L.frontStageTech, STEPS[2].id, 'Zoom', {
    picture: ZOOM_TECH_LOGO,
    links: [
      techDescriptionLink(
        'Zoom',
        INTERVIEW_ZOOM_STEP_03_DESCRIPTION,
        ZOOM_TECH_LOGO,
      ),
    ],
  }),
  cell(
    iCell('03', '07'),
    L.backStage,
    STEPS[2].id,
    'Tutor supervisor team takes notes for group interview.',
  ),
  cell(iCell('03', '08'), L.backStageTech, STEPS[2].id, 'Notion', {
    picture: NOTION_TECH_LOGO,
    links: [
      techDescriptionLink(
        'Notion',
        INTERVIEW_NOTION_STEP_03_DESCRIPTION,
        NOTION_TECH_LOGO,
      ),
    ],
  }),
  cell(iCell('03', '09'), L.support, STEPS[2].id, 'Zoom Recording', {
    links: [
      techDescriptionLink(
        'Zoom Recording',
        INTERVIEW_ZOOM_RECORDING_STEP_03_DESCRIPTION,
      ),
    ],
  }),

  // Step 4 — Decision processing
  cell(
    iCell('04', '03'),
    L.regular,
    STEPS[3].id,
    'Waits for offer decision.',
    {
      picture: INTERVIEW_REGULAR_TUTOR_STEP_4_PICTURE,
    },
  ),
  cell(
    iCell('04', '07'),
    L.backStage,
    STEPS[3].id,
    'Tutor supervisor team reviews interview data.',
  ),
  cell(
    iCell('04', '08'),
    L.backStageTech,
    STEPS[3].id,
    'Zoom\nNotion',
    {
      links: [
        techDescriptionLink(
          'Zoom',
          INTERVIEW_ZOOM_STEP_04_DESCRIPTION,
          ZOOM_TECH_LOGO,
        ),
        techDescriptionLink(
          'Notion',
          INTERVIEW_NOTION_STEP_04_DESCRIPTION,
          NOTION_TECH_LOGO,
        ),
      ],
    },
  ),

  // Step 5 — Final decision
  cell(
    iCell('05', '03'),
    L.regular,
    STEPS[4].id,
    'Receives offer decision.',
    {
      picture: INTERVIEW_REGULAR_TUTOR_STEP_5_PICTURE,
    },
  ),
  cell(
    iCell('05', '04'),
    L.frontStage,
    STEPS[4].id,
    'Sends offer decision and next steps (if applicable).',
  ),
  cell(iCell('05', '06'), L.frontStageTech, STEPS[4].id, 'Email', {
    picture: EMAIL_TECH_LOGO,
    links: [
      techDescriptionLink(
        'Email',
        INTERVIEW_EMAIL_STEP_05_DESCRIPTION,
        EMAIL_TECH_LOGO,
      ),
    ],
  }),
]

export const APPLICATION_INTERVIEW_HAPPY_PATH_FALLBACK: BlueprintData = {
  path: {
    id: APPLICATION_INTERVIEW_HAPPY_PATH_ID,
    name: 'Happy Path',
    description:
      'Tutor applies, interviews with the team, and receives an offer decision.',
    note: null,
    path_type: 'happy',
  },
  layers: [...LAYERS],
  steps: [...STEPS],
  cells: INTERVIEW_CELLS,
  triggers: INTERVIEW_TRIGGERS,
}
