import { EMPTY_CELL_METADATA } from '@/lib/cellMetadata'
import {
  TECH_SETUP_CHILD_PROTECTION_LAWS_DESCRIPTION,
  TECH_SETUP_CLEARANCE_GUIDE_STEP_02_DESCRIPTION,
  TECH_SETUP_EMAIL_STEP_01_DESCRIPTION,
  TECH_SETUP_EMAIL_STEP_03_DESCRIPTION,
  TECH_SETUP_EMAIL_STEP_07_DESCRIPTION,
  TECH_SETUP_EMAIL_STEP_08_DESCRIPTION,
  TECH_SETUP_EMPLOYMENT_LAWS_DESCRIPTION,
  TECH_SETUP_PLUS_APP_STEP_08_DESCRIPTION,
  TECH_SETUP_PLUS_APP_STEP_08_PICTURE,
  TECH_SETUP_REGULAR_TUTOR_STEP_01_PICTURE,
  TECH_SETUP_REGULAR_TUTOR_STEP_02_PICTURE,
  TECH_SETUP_REGULAR_TUTOR_STEP_03_PICTURE,
  TECH_SETUP_REGULAR_TUTOR_STEP_04_PICTURE,
  TECH_SETUP_REGULAR_TUTOR_STEP_05_PICTURE,
  TECH_SETUP_REGULAR_TUTOR_STEP_06_PICTURE,
  TECH_SETUP_REGULAR_TUTOR_STEP_07_PICTURE,
  TECH_SETUP_REGULAR_TUTOR_STEP_08_PICTURE,
  TECH_SETUP_SLACK_STEP_07_DESCRIPTION,
  TECH_SETUP_WORKDAY_EMPLOYEE_STEP_06_DESCRIPTION,
  TECH_SETUP_WORKDAY_EMPLOYER_STEP_06_DESCRIPTION,
  TECH_SETUP_WORKDAY_LOGO,
  TECH_SETUP_WORKDAY_STEP_04_DESCRIPTION,
} from '@/data/techSetupPictures'
import { techDescriptionLink } from '@/lib/blueprintTechDescriptions'
import {
  EMAIL_TECH_LOGO,
  SLACK_TECH_LOGO,
} from '@/lib/blueprintTechPictures'
import type {
  BlueprintCell,
  BlueprintCellTrigger,
  BlueprintData,
} from '@/types/blueprint'

/** Onboarding phase scenarios (UI fallback until DB seed). */
export const ONBOARDING_PHASE_ID = 'a0000000-0000-4000-8000-000000000102'
export const TECH_SETUP_SCENARIO_ID = 'a0000000-0000-4000-8000-000000000120'
export const ONBOARDING_MODULES_SCENARIO_ID =
  'a0000000-0000-4000-8000-000000000123'
export const LESSON_MODULES_SCENARIO_ID =
  'a0000000-0000-4000-8000-000000000124'
export const SESSION_SIGN_UP_SCENARIO_ID =
  'a0000000-0000-4000-8000-000000000125'
export const TECH_SETUP_HAPPY_PATH_ID = 'a0000000-0000-4000-8000-000000000800'

const STEP_VISUAL_LAYER_ID = 'a0000000-0000-4000-8000-000000000818'

const LAYERS = [
  { id: STEP_VISUAL_LAYER_ID, name: 'Visual', row_position: 0 },
  {
    id: 'a0000000-0000-4000-8000-000000000831',
    name: 'Regular Tutor',
    row_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000833',
    name: 'Front Stage Tech',
    row_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000832',
    name: 'Front Stage Actions',
    row_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000835',
    name: 'Back Stage Tech',
    row_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000834',
    name: 'Back Stage Actions',
    row_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000836',
    name: 'Support Actions',
    row_position: 6,
  },
] as const

const STEPS = [
  {
    id: 'a0000000-0000-4000-8000-000000000821',
    name: 'Clearance email',
    column_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000822',
    name: 'Obtain clearances',
    column_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000823',
    name: 'Send clearances',
    column_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000826',
    name: 'I-9 meeting',
    column_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000827',
    name: 'Attend I-9 meeting',
    column_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000824',
    name: 'Payroll setup',
    column_position: 6,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000825',
    name: 'Join Slack',
    column_position: 7,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000829',
    name: 'PLUS app login',
    column_position: 8,
  },
] as const

const L = {
  visual: STEP_VISUAL_LAYER_ID,
  regular: 'a0000000-0000-4000-8000-000000000831',
  frontStage: 'a0000000-0000-4000-8000-000000000832',
  frontStageTech: 'a0000000-0000-4000-8000-000000000833',
  backStage: 'a0000000-0000-4000-8000-000000000834',
  backStageTech: 'a0000000-0000-4000-8000-000000000835',
  support: 'a0000000-0000-4000-8000-000000000836',
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

function tsCell(stepSlot: string, layerSuffix: string): string {
  // Prefix 10 avoids Discovery sad-path rail detection (07/08 + …03).
  return `a0000000-0000-4000-8000-00000010${stepSlot}${layerSuffix}`
}

function tsTrigger(triggerSlot: string): string {
  return `a0000000-0000-4000-8000-000000088${triggerSlot}`
}

function trigger(
  slot: string,
  fromStep: string,
  fromLayer: string,
  toStep: string,
  toLayer: string,
): BlueprintCellTrigger {
  return {
    id: tsTrigger(slot),
    source_cell_id: tsCell(fromStep, fromLayer),
    target_cell_id: tsCell(toStep, toLayer),
  }
}

const TECH_SETUP_TRIGGERS: BlueprintCellTrigger[] = [
  // Step 1 — supervisor email → Email → tutor receives
  trigger('001', '01', '04', '01', '06'),
  trigger('002', '01', '06', '01', '03'),

  // Regular Tutor forward chain
  trigger('011', '01', '03', '02', '03'),
  trigger('012', '02', '03', '03', '03'),
  trigger('013', '03', '03', '04', '03'),
  trigger('014', '04', '03', '05', '03'),
  trigger('015', '05', '03', '06', '03'),
  trigger('016', '06', '03', '07', '03'),
  trigger('017', '07', '03', '08', '03'),

  // Step 2 — CMU HR → Clearance Obtainment guide → tutor
  trigger('022', '02', '04', '02', '06'),
  trigger('023', '02', '06', '02', '03'),

  // Step 3 — tutor sends clearances via Email → supervisor receives
  trigger('031', '03', '03', '03', '06'),
  trigger('032', '03', '06', '03', '04'),

  // Step 4 — tutor schedules I-9 meeting via Workday
  trigger('033', '04', '03', '04', '06'),

  // Step 5 — tutor attends I-9 meeting → CMU HR reviews forms
  trigger('041', '05', '03', '05', '04'),

  // Step 6 — tutor sets up payroll → Workday; supervisor paperwork chain
  trigger('042', '06', '03', '06', '06'),
  trigger('043', '06', '07', '06', '08'),
  trigger('044', '06', '08', '06', '06'),

  // Step 7 — supervisor invite via Email/Slack → tutor joins
  trigger('051', '07', '04', '07', '06'),
  trigger('052', '07', '06', '07', '03'),

  // Step 8 — supervisor provides credentials via Email/PLUS App → tutor obtains login
  trigger('061', '08', '04', '08', '06'),
  trigger('062', '08', '06', '08', '03'),
]

const TECH_SETUP_CELLS: BlueprintCell[] = [
  ...STEPS.map((step, stepIndex) =>
    cell(
      tsCell(String(stepIndex + 1).padStart(2, '0'), '10'),
      L.visual,
      step.id,
      '',
    ),
  ),

  // Step 1 — clearance email
  cell(
    tsCell('01', '03'),
    L.regular,
    STEPS[0].id,
    'Receives email with steps for tutor clearances.',
    { picture: TECH_SETUP_REGULAR_TUTOR_STEP_01_PICTURE },
  ),
  cell(
    tsCell('01', '04'),
    L.frontStage,
    STEPS[0].id,
    'Tutor supervisor team sends email for clearance checks.',
  ),
  cell(tsCell('01', '06'), L.frontStageTech, STEPS[0].id, 'Email', {
    links: [
      techDescriptionLink(
        'Email',
        TECH_SETUP_EMAIL_STEP_01_DESCRIPTION,
        EMAIL_TECH_LOGO,
      ),
    ],
  }),
  cell(tsCell('01', '09'), L.support, STEPS[0].id, 'Child protection laws', {
    description: TECH_SETUP_CHILD_PROTECTION_LAWS_DESCRIPTION,
  }),

  // Step 2 — obtain clearances
  cell(tsCell('02', '03'), L.regular, STEPS[1].id, 'Obtains clearances.', {
    picture: TECH_SETUP_REGULAR_TUTOR_STEP_02_PICTURE,
  }),
  cell(
    tsCell('02', '04'),
    L.frontStage,
    STEPS[1].id,
    'CMU HR Department sends over clearance materials.',
  ),
  cell(
    tsCell('02', '06'),
    L.frontStageTech,
    STEPS[1].id,
    'Clearance obtainment guide',
    {
      links: [
        techDescriptionLink(
          'Clearance obtainment guide',
          TECH_SETUP_CLEARANCE_GUIDE_STEP_02_DESCRIPTION,
        ),
      ],
    },
  ),
  cell(tsCell('02', '09'), L.support, STEPS[1].id, 'Child protection laws', {
    description: TECH_SETUP_CHILD_PROTECTION_LAWS_DESCRIPTION,
  }),

  // Step 3 — send clearances
  cell(
    tsCell('03', '03'),
    L.regular,
    STEPS[2].id,
    'Sends clearances to CMU.',
    { picture: TECH_SETUP_REGULAR_TUTOR_STEP_03_PICTURE },
  ),
  cell(
    tsCell('03', '04'),
    L.frontStage,
    STEPS[2].id,
    'Tutor supervisor team receives email with required clearances.',
  ),
  cell(tsCell('03', '06'), L.frontStageTech, STEPS[2].id, 'Email', {
    links: [
      techDescriptionLink(
        'Email',
        TECH_SETUP_EMAIL_STEP_03_DESCRIPTION,
        EMAIL_TECH_LOGO,
      ),
    ],
  }),
  cell(tsCell('03', '09'), L.support, STEPS[2].id, 'Child protection laws', {
    description: TECH_SETUP_CHILD_PROTECTION_LAWS_DESCRIPTION,
  }),

  // Step 4 — schedule I-9 meeting
  cell(
    tsCell('04', '03'),
    L.regular,
    STEPS[3].id,
    'Sets up I-9 meeting with CMU HR department.',
    { picture: TECH_SETUP_REGULAR_TUTOR_STEP_04_PICTURE },
  ),
  cell(tsCell('04', '06'), L.frontStageTech, STEPS[3].id, 'Workday', {
    links: [
      techDescriptionLink(
        'Workday',
        TECH_SETUP_WORKDAY_STEP_04_DESCRIPTION,
        TECH_SETUP_WORKDAY_LOGO,
      ),
    ],
  }),
  cell(tsCell('04', '09'), L.support, STEPS[3].id, 'Employment laws', {
    description: TECH_SETUP_EMPLOYMENT_LAWS_DESCRIPTION,
  }),

  // Step 5 — attend I-9 meeting
  cell(
    tsCell('05', '03'),
    L.regular,
    STEPS[4].id,
    'Meets with CMU HR department for I-9 meeting.',
    { picture: TECH_SETUP_REGULAR_TUTOR_STEP_05_PICTURE },
  ),
  cell(
    tsCell('05', '04'),
    L.frontStage,
    STEPS[4].id,
    'CMU HR department reviews employment forms at an I-9 meeting.',
  ),
  cell(tsCell('05', '09'), L.support, STEPS[4].id, 'Employment laws', {
    description: TECH_SETUP_EMPLOYMENT_LAWS_DESCRIPTION,
  }),

  // Step 6 — payroll setup
  cell(tsCell('06', '03'), L.regular, STEPS[5].id, 'Sets up payroll.', {
    picture: TECH_SETUP_REGULAR_TUTOR_STEP_06_PICTURE,
  }),
  cell(
    tsCell('06', '06'),
    L.frontStageTech,
    STEPS[5].id,
    'Workday (employee view)',
    {
      links: [
        techDescriptionLink(
          'Workday (employee view)',
          TECH_SETUP_WORKDAY_EMPLOYEE_STEP_06_DESCRIPTION,
          TECH_SETUP_WORKDAY_LOGO,
        ),
      ],
    },
  ),
  cell(
    tsCell('06', '07'),
    L.backStage,
    STEPS[5].id,
    'PLUS supervisor team fills out corresponding paperwork for student employment in payroll software.',
  ),
  cell(
    tsCell('06', '08'),
    L.backStageTech,
    STEPS[5].id,
    'Workday (employer view)',
    {
      links: [
        techDescriptionLink(
          'Workday (employer view)',
          TECH_SETUP_WORKDAY_EMPLOYER_STEP_06_DESCRIPTION,
          TECH_SETUP_WORKDAY_LOGO,
        ),
      ],
    },
  ),

  // Step 7 — join Slack
  cell(
    tsCell('07', '03'),
    L.regular,
    STEPS[6].id,
    'Join PLUS tutor Slack channel.',
    { picture: TECH_SETUP_REGULAR_TUTOR_STEP_07_PICTURE },
  ),
  cell(
    tsCell('07', '04'),
    L.frontStage,
    STEPS[6].id,
    'Tutor supervisor team sends invite to Slack workspace.',
  ),
  cell(tsCell('07', '06'), L.frontStageTech, STEPS[6].id, 'Email\nSlack', {
    links: [
      techDescriptionLink(
        'Email',
        TECH_SETUP_EMAIL_STEP_07_DESCRIPTION,
        EMAIL_TECH_LOGO,
      ),
      techDescriptionLink(
        'Slack',
        TECH_SETUP_SLACK_STEP_07_DESCRIPTION,
        SLACK_TECH_LOGO,
      ),
    ],
  }),

  // Step 8 — obtain PLUS app login
  cell(
    tsCell('08', '03'),
    L.regular,
    STEPS[7].id,
    'Obtains login credentials for PLUS app.',
    { picture: TECH_SETUP_REGULAR_TUTOR_STEP_08_PICTURE },
  ),
  cell(
    tsCell('08', '04'),
    L.frontStage,
    STEPS[7].id,
    'PLUS supervisor team provides login credentials to tutor.',
  ),
  cell(tsCell('08', '06'), L.frontStageTech, STEPS[7].id, 'Email\nPLUS App', {
    links: [
      techDescriptionLink(
        'Email',
        TECH_SETUP_EMAIL_STEP_08_DESCRIPTION,
        EMAIL_TECH_LOGO,
      ),
      techDescriptionLink(
        'PLUS App',
        TECH_SETUP_PLUS_APP_STEP_08_DESCRIPTION,
        TECH_SETUP_PLUS_APP_STEP_08_PICTURE,
        'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=115-5206&t=Fyqmb2RX2B0cj9sv-1',
      ),
    ],
  }),
]

export const TECH_SETUP_HAPPY_PATH_FALLBACK: BlueprintData = {
  path: {
    id: TECH_SETUP_HAPPY_PATH_ID,
    name: 'Happy Path',
    description:
      'Tutor sets up technology and obtains clearances.',
    note: null,
    path_type: 'happy',
  },
  layers: [...LAYERS],
  steps: [...STEPS],
  cells: TECH_SETUP_CELLS,
  triggers: TECH_SETUP_TRIGGERS,
}
