import { ONBOARDING_MODULES_SCENARIO_ID } from '@/data/techSetupHappyPathFallback'
import {
  ONBOARDING_MODULES_DEV_DESIGN_SUPPORT_DESCRIPTION,
  ONBOARDING_MODULES_GOOGLE_DOCS_SLIDES_STEP_04_DESCRIPTION,
  ONBOARDING_MODULES_GOOGLE_DOCS_SLIDES_STEP_04_PICTURE,
  ONBOARDING_MODULES_GOOGLE_QUIZ_STEP_05_DESCRIPTION,
  ONBOARDING_MODULES_GOOGLE_QUIZ_STEP_05_PICTURE,
  ONBOARDING_MODULES_NOTION_LOGO,
  ONBOARDING_MODULES_NOTION_STEP_02_DESCRIPTION,
  ONBOARDING_MODULES_NOTION_STEP_02_PICTURE,
  ONBOARDING_MODULES_NOTION_STEP_03_DESCRIPTION,
  ONBOARDING_MODULES_NOTION_STEP_03_PICTURE,
  ONBOARDING_MODULES_NOTION_STEP_04_DESCRIPTION,
  ONBOARDING_MODULES_NOTION_STEP_06_DESCRIPTION,
  ONBOARDING_MODULES_PLUS_APP_STEP_01_DESCRIPTION,
  ONBOARDING_MODULES_PLUS_APP_STEP_01_FIGMA_URL,
  ONBOARDING_MODULES_PLUS_APP_STEP_01_PICTURE,
  ONBOARDING_MODULES_PLUS_APP_STEP_02_DESCRIPTION,
  ONBOARDING_MODULES_PLUS_APP_STEP_02_FIGMA_URL,
  ONBOARDING_MODULES_PLUS_APP_STEP_02_PICTURE,
  ONBOARDING_MODULES_PLUS_APP_STEP_06_DESCRIPTION,
  ONBOARDING_MODULES_PLUS_APP_STEP_06_FIGMA_URL,
  ONBOARDING_MODULES_PLUS_APP_STEP_06_PICTURE,
  ONBOARDING_MODULES_PLUS_APP_STEP_07_DESCRIPTION,
  ONBOARDING_MODULES_PLUS_APP_STEP_07_FIGMA_URL,
  ONBOARDING_MODULES_PLUS_APP_STEP_07_PICTURE,
  ONBOARDING_MODULES_REGULAR_TUTOR_STEP_01_PICTURE,
  ONBOARDING_MODULES_REGULAR_TUTOR_STEP_02_PICTURE,
  ONBOARDING_MODULES_REGULAR_TUTOR_STEP_03_PICTURE,
  ONBOARDING_MODULES_REGULAR_TUTOR_STEP_04_PICTURE,
  ONBOARDING_MODULES_REGULAR_TUTOR_STEP_05_PICTURE,
  ONBOARDING_MODULES_REGULAR_TUTOR_STEP_06_PICTURE,
  ONBOARDING_MODULES_REGULAR_TUTOR_STEP_07_PICTURE,
  ONBOARDING_MODULES_RESEARCHERS_SUPPORT_DESCRIPTION,
  ONBOARDING_MODULES_STEP_06_SUPPORT_DESCRIPTION,
} from '@/data/onboardingModulesPictures'
import { techDescriptionLink } from '@/lib/blueprintTechDescriptions'
import { EMPTY_CELL_METADATA } from '@/lib/cellMetadata'
import type {
  BlueprintCell,
  BlueprintCellTrigger,
  BlueprintData,
} from '@/types/blueprint'

export { ONBOARDING_MODULES_SCENARIO_ID }

export const ONBOARDING_MODULES_HAPPY_PATH_ID =
  'a0000000-0000-4000-8000-000000007201'

const STEP_VISUAL_LAYER_ID = 'a0000000-0000-4000-8000-000000000828'

const LAYERS = [
  { id: STEP_VISUAL_LAYER_ID, name: 'Visual', row_position: 0 },
  {
    id: 'a0000000-0000-4000-8000-000000000841',
    name: 'Regular Tutor',
    row_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000843',
    name: 'Front Stage Tech',
    row_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000842',
    name: 'Front Stage Actions',
    row_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000845',
    name: 'Back Stage Tech',
    row_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000844',
    name: 'Back Stage Actions',
    row_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000846',
    name: 'Support Actions',
    row_position: 6,
  },
] as const

const STEPS = [
  {
    id: 'a0000000-0000-4000-8000-000000000851',
    name: 'Module opening',
    column_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000852',
    name: 'Accessing content',
    column_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000853',
    name: 'Reading lesson',
    column_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000854',
    name: 'Supplementary materials',
    column_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000855',
    name: 'Quiz completion',
    column_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000856',
    name: 'Reflection',
    column_position: 6,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000857',
    name: 'Module completion',
    column_position: 7,
  },
] as const

const L = {
  visual: STEP_VISUAL_LAYER_ID,
  regular: 'a0000000-0000-4000-8000-000000000841',
  frontStage: 'a0000000-0000-4000-8000-000000000842',
  frontStageTech: 'a0000000-0000-4000-8000-000000000843',
  backStage: 'a0000000-0000-4000-8000-000000000844',
  backStageTech: 'a0000000-0000-4000-8000-000000000845',
  support: 'a0000000-0000-4000-8000-000000000846',
} as const

function cell(
  id: string,
  layerId: string,
  stepId: string,
  content: string,
  metadata: Partial<Pick<BlueprintCell, 'picture' | 'description' | 'links'>> = {},
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

function omCell(stepSlot: string, layerSuffix: string): string {
  return `a0000000-0000-4000-8000-00000011${stepSlot}${layerSuffix}`
}

function omTrigger(triggerSlot: string): string {
  return `a0000000-0000-4000-8000-000000089${triggerSlot}`
}

function trigger(
  slot: string,
  fromStep: string,
  fromLayer: string,
  toStep: string,
  toLayer: string,
): BlueprintCellTrigger {
  return {
    id: omTrigger(slot),
    source_cell_id: omCell(fromStep, fromLayer),
    target_cell_id: omCell(toStep, toLayer),
  }
}

const ONBOARDING_MODULES_TRIGGERS: BlueprintCellTrigger[] = [
  // Step 1 — tutor opens module → PLUS App
  trigger('001', '01', '03', '01', '06'),

  // Step 2 — tutor follows Notion link → PLUS App / Notion
  trigger('002', '02', '03', '02', '06'),

  // Step 3 — tutor reads lesson → Notion
  trigger('003', '03', '03', '03', '06'),

  // Step 4 — tutor reads supplementary materials → Notion / Google Docs
  trigger('004', '04', '03', '04', '06'),

  // Step 5 — tutor completes quiz → Google Quiz
  trigger('005', '05', '03', '05', '06'),

  // Step 6 — tutor fills reflection → PLUS App
  trigger('006', '06', '03', '06', '06'),

  // Step 7 — tutor submits reflection / completes module → PLUS App
  trigger('007', '07', '03', '07', '06'),

  // Regular Tutor forward chain
  trigger('011', '01', '03', '02', '03'),
  trigger('012', '02', '03', '03', '03'),
  trigger('013', '03', '03', '04', '03'),
  trigger('014', '04', '03', '05', '03'),
  trigger('015', '05', '03', '06', '03'),
  trigger('017', '06', '03', '07', '03'),
  // Loop to next module
  trigger('016', '07', '03', '01', '03'),

  // Step 3 — instructional design → Notion
  trigger('031', '03', '07', '03', '06'),

  // Step 4 — instructional design → Google Docs/ Slides (nearest pill)
  trigger('041', '04', '07', '04', '06'),
  trigger('051', '05', '06', '05', '07'),
  trigger('052', '05', '07', '05', '06'),
  // Step 6 — instructional design → Notion → PLUS App
  trigger('063', '06', '07', '06', '08'),
  trigger('064', '06', '08', '06', '06'),
]

const ONBOARDING_MODULES_CELLS: BlueprintCell[] = [
  ...STEPS.map((step, stepIndex) =>
    cell(
      omCell(String(stepIndex + 1).padStart(2, '0'), '10'),
      L.visual,
      step.id,
      '',
    ),
  ),

  // Step 1 — module opening
  cell(
    omCell('01', '03'),
    L.regular,
    STEPS[0].id,
    'Opens next uncompleted onboarding module.',
    { picture: ONBOARDING_MODULES_REGULAR_TUTOR_STEP_01_PICTURE },
  ),
  cell(omCell('01', '06'), L.frontStageTech, STEPS[0].id, 'PLUS App', {
    links: [
      techDescriptionLink(
        'PLUS App',
        ONBOARDING_MODULES_PLUS_APP_STEP_01_DESCRIPTION,
        ONBOARDING_MODULES_PLUS_APP_STEP_01_PICTURE,
        ONBOARDING_MODULES_PLUS_APP_STEP_01_FIGMA_URL,
      ),
    ],
  }),
  cell(omCell('01', '09'), L.support, STEPS[0].id, 'Dev Team\nDesign Team', {
    description: ONBOARDING_MODULES_DEV_DESIGN_SUPPORT_DESCRIPTION,
  }),

  // Step 2 — accessing content
  cell(
    omCell('02', '03'),
    L.regular,
    STEPS[1].id,
    'Follows Notion link in individual module page.',
    { picture: ONBOARDING_MODULES_REGULAR_TUTOR_STEP_02_PICTURE },
  ),
  cell(omCell('02', '06'), L.frontStageTech, STEPS[1].id, 'PLUS App\nNotion', {
    links: [
      techDescriptionLink(
        'PLUS App',
        ONBOARDING_MODULES_PLUS_APP_STEP_02_DESCRIPTION,
        ONBOARDING_MODULES_PLUS_APP_STEP_02_PICTURE,
        ONBOARDING_MODULES_PLUS_APP_STEP_02_FIGMA_URL,
      ),
      techDescriptionLink(
        'Notion',
        ONBOARDING_MODULES_NOTION_STEP_02_DESCRIPTION,
        [
          ONBOARDING_MODULES_NOTION_LOGO,
          ONBOARDING_MODULES_NOTION_STEP_02_PICTURE,
        ],
      ),
    ],
  }),
  cell(omCell('02', '09'), L.support, STEPS[1].id, 'Dev Team\nDesign Team', {
    description: ONBOARDING_MODULES_DEV_DESIGN_SUPPORT_DESCRIPTION,
  }),

  // Step 3 — reading lesson
  cell(
    omCell('03', '03'),
    L.regular,
    STEPS[2].id,
    'Reads through the onboarding module lesson.',
    { picture: ONBOARDING_MODULES_REGULAR_TUTOR_STEP_03_PICTURE },
  ),
  cell(omCell('03', '06'), L.frontStageTech, STEPS[2].id, 'Notion', {
    links: [
      techDescriptionLink(
        'Notion',
        ONBOARDING_MODULES_NOTION_STEP_03_DESCRIPTION,
        ONBOARDING_MODULES_NOTION_STEP_03_PICTURE,
      ),
    ],
  }),
  cell(
    omCell('03', '07'),
    L.backStage,
    STEPS[2].id,
    'The instructional design team creates and maintains the lesson modules.',
  ),
  cell(
    omCell('03', '09'),
    L.support,
    STEPS[2].id,
    'Researchers help guide instructional implementation.',
    { description: ONBOARDING_MODULES_RESEARCHERS_SUPPORT_DESCRIPTION },
  ),

  // Step 4 — supplementary materials
  cell(
    omCell('04', '03'),
    L.regular,
    STEPS[3].id,
    'Reads through any supplementary materials in the lesson.',
    { picture: ONBOARDING_MODULES_REGULAR_TUTOR_STEP_04_PICTURE },
  ),
  cell(
    omCell('04', '06'),
    L.frontStageTech,
    STEPS[3].id,
    'Notion\nGoogle Docs/ Slides',
    {
      links: [
        techDescriptionLink(
          'Notion',
          ONBOARDING_MODULES_NOTION_STEP_04_DESCRIPTION,
          ONBOARDING_MODULES_NOTION_LOGO,
        ),
        techDescriptionLink(
          'Google Docs/ Slides',
          ONBOARDING_MODULES_GOOGLE_DOCS_SLIDES_STEP_04_DESCRIPTION,
          ONBOARDING_MODULES_GOOGLE_DOCS_SLIDES_STEP_04_PICTURE,
        ),
      ],
    },
  ),
  cell(
    omCell('04', '07'),
    L.backStage,
    STEPS[3].id,
    'The instructional design team maintains the supplementary materials.',
  ),
  cell(
    omCell('04', '09'),
    L.support,
    STEPS[3].id,
    'Researchers help guide instructional implementation.',
    { description: ONBOARDING_MODULES_RESEARCHERS_SUPPORT_DESCRIPTION },
  ),

  // Step 5 — quiz completion
  cell(omCell('05', '03'), L.regular, STEPS[4].id, 'Completes Google quiz.', {
    picture: ONBOARDING_MODULES_REGULAR_TUTOR_STEP_05_PICTURE,
  }),
  cell(
    omCell('05', '06'),
    L.frontStageTech,
    STEPS[4].id,
    'Google Quiz embedded in Notion',
    {
      links: [
        techDescriptionLink(
          'Google Quiz embedded in Notion',
          ONBOARDING_MODULES_GOOGLE_QUIZ_STEP_05_DESCRIPTION,
          ONBOARDING_MODULES_GOOGLE_QUIZ_STEP_05_PICTURE,
        ),
      ],
    },
  ),
  cell(
    omCell('05', '07'),
    L.backStage,
    STEPS[4].id,
    'The instructional design team creates and maintains the Google quiz.',
  ),
  cell(
    omCell('05', '09'),
    L.support,
    STEPS[4].id,
    'Researchers help guide instructional implementation.',
    { description: ONBOARDING_MODULES_RESEARCHERS_SUPPORT_DESCRIPTION },
  ),

  // Step 6 — reflection
  cell(
    omCell('06', '03'),
    L.regular,
    STEPS[5].id,
    'Fills out reflection for module.',
    { picture: ONBOARDING_MODULES_REGULAR_TUTOR_STEP_06_PICTURE },
  ),
  cell(omCell('06', '06'), L.frontStageTech, STEPS[5].id, 'PLUS App', {
    links: [
      techDescriptionLink(
        'PLUS App',
        ONBOARDING_MODULES_PLUS_APP_STEP_06_DESCRIPTION,
        ONBOARDING_MODULES_PLUS_APP_STEP_06_PICTURE,
        ONBOARDING_MODULES_PLUS_APP_STEP_06_FIGMA_URL,
      ),
    ],
  }),
  cell(
    omCell('06', '07'),
    L.backStage,
    STEPS[5].id,
    'Instructional design team designs and maintains reflection questions.',
  ),
  cell(omCell('06', '08'), L.backStageTech, STEPS[5].id, 'Notion', {
    links: [
      techDescriptionLink(
        'Notion',
        ONBOARDING_MODULES_NOTION_STEP_06_DESCRIPTION,
        ONBOARDING_MODULES_NOTION_LOGO,
      ),
    ],
  }),
  cell(
    omCell('06', '09'),
    L.support,
    STEPS[5].id,
    'Researchers help guide instructional implementation.\nDev Team\nDesign Team',
    { description: ONBOARDING_MODULES_STEP_06_SUPPORT_DESCRIPTION },
  ),

  // Step 7 — module completion
  cell(
    omCell('07', '03'),
    L.regular,
    STEPS[6].id,
    'Submits reflection questions and completes module.',
    { picture: ONBOARDING_MODULES_REGULAR_TUTOR_STEP_07_PICTURE },
  ),
  cell(omCell('07', '06'), L.frontStageTech, STEPS[6].id, 'PLUS App', {
    links: [
      techDescriptionLink(
        'PLUS App',
        ONBOARDING_MODULES_PLUS_APP_STEP_07_DESCRIPTION,
        ONBOARDING_MODULES_PLUS_APP_STEP_07_PICTURE,
        ONBOARDING_MODULES_PLUS_APP_STEP_07_FIGMA_URL,
      ),
    ],
  }),
  cell(omCell('07', '09'), L.support, STEPS[6].id, 'Dev Team\nDesign Team', {
    description: ONBOARDING_MODULES_DEV_DESIGN_SUPPORT_DESCRIPTION,
  }),
]

export const ONBOARDING_MODULES_HAPPY_PATH_FALLBACK: BlueprintData = {
  path: {
    id: ONBOARDING_MODULES_HAPPY_PATH_ID,
    name: 'Happy Path',
    description:
      'Tutor completes onboarding modules.',
    note: null,
    path_type: 'happy',
  },
  layers: [...LAYERS],
  steps: [...STEPS],
  cells: ONBOARDING_MODULES_CELLS,
  triggers: ONBOARDING_MODULES_TRIGGERS,
}
