import { EMPTY_CELL_METADATA } from '@/lib/cellMetadata'
import { getScenarioParallelNote } from '@/lib/scenarioParallelInfo'
import { techDescriptionLink, mergeUrlLinks } from '@/lib/blueprintTechDescriptions'
import { GOAL_SETTING_REGULAR_TUTOR_ONBOARDING_LINKS } from '@/data/goalSettingRegularTutorLinks'
import {
  buildParallelSessionPartnerLeadCells,
  buildParallelSessionPartnerLeadTriggers,
} from '@/data/parallelSessionPartnerLead'
import {
  GOAL_SETTING_PARALLEL_LEAD_STEP_PICTURES,
  GOAL_SETTING_PARALLEL_PARTNER_STEP_PICTURES,
  GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_01_PICTURE,
  GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_02_PICTURE,
  GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_03_PICTURE,
  GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_04_PICTURE,
  GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_05_PICTURE,
  GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_06_PICTURE,
  GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_07_PICTURE,
  GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_08_PICTURE,
  GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_02_PICTURE,
  GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_03_PICTURE,
  GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_05_PICTURE,
  GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_06_PICTURE,
  GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_08_PICTURE,
  GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_02_FIGMA_URL,
  GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEPS_3_5_FIGMA_URL,
  GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_06_FIGMA_URL,
  GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_08_FIGMA_URL,
} from '@/data/goalSettingParallelSessionPictures'
import {
  GOAL_SETTING_SCENARIO_ID,
  GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
} from '@/data/goalSettingHappyPathFallback'
import type {
  BlueprintCell,
  BlueprintCellTrigger,
  BlueprintData,
} from '@/types/blueprint'

export { GOAL_SETTING_SCENARIO_ID }

export const GOAL_SETTING_CHECK_GOALS_PATH_ID =
  'a0000000-0000-4000-8000-000000000814'

const STEP_VISUAL_LAYER_ID = 'a0000000-0000-4000-8000-0000000008b0'

const LAYERS = [
  { id: STEP_VISUAL_LAYER_ID, name: 'Visual', row_position: 0 },
  {
    id: 'a0000000-0000-4000-8000-0000000008b1',
    name: 'Partner Action: Teacher',
    row_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008b2',
    name: 'Lead Tutor',
    row_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008b3',
    name: 'Regular Tutor',
    row_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008b4',
    name: 'Front Stage Tech',
    row_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008b5',
    name: 'Front Stage Actions',
    row_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008b7',
    name: 'Back Stage Tech',
    row_position: 6,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008b6',
    name: 'Back Stage Actions',
    row_position: 7,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008b8',
    name: 'Support Actions',
    row_position: 8,
  },
] as const

const STEPS = [
  {
    id: 'a0000000-0000-4000-8000-000000009b01',
    name: 'Join breakout session',
    column_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009b02',
    name: "Click on 'Check Goals' CTA in the Action column",
    column_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009b03',
    name: 'Share screen',
    column_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009b04',
    name: 'Review goals that were set with student',
    column_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009b05',
    name: "Once goal review is done, clicks on 'Check Goals' button",
    column_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009b06',
    name: 'Finalize checking goal with the student.',
    column_position: 6,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009b07',
    name: 'Leave breakout room',
    column_position: 7,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009b08',
    name: 'Move on to the next student in sorted order set by researchers.',
    column_position: 8,
  },
] as const

const L = {
  visual: STEP_VISUAL_LAYER_ID,
  partner: 'a0000000-0000-4000-8000-0000000008b1',
  lead: 'a0000000-0000-4000-8000-0000000008b2',
  regular: 'a0000000-0000-4000-8000-0000000008b3',
  frontStageTech: 'a0000000-0000-4000-8000-0000000008b4',
  backStage: 'a0000000-0000-4000-8000-0000000008b6',
  support: 'a0000000-0000-4000-8000-0000000008b8',
} as const

const SUPPORT_DEV_DESIGN = 'Dev Team\nDesign Team'
const BACKSTAGE_RESEARCHER = 'Researchers set goal setting activities.'
const SUPPORT_STEP_8 =
  'Researchers set student order, Dev Team, Design Team.'

const GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_02_DESCRIPTION =
  'The tutor views the Student Dashboard screen in the PLUS app and clicks the Check Goals CTA in the Action column for the student they are working with.'

const GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_03_DESCRIPTION =
  'The tutor shares the check goals modal in the PLUS app with the student, which displays the student\'s current effort and progress goals and goal achievement strategy.'

const GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_05_DESCRIPTION =
  'After reviewing goals with the student, the tutor clicks the Check Goals button in the PLUS app.'

const GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_06_DESCRIPTION =
  'The tutor finalizes checking goals with the student in the PLUS app, which displays the goals checked summary with effort and progress goals and goal achievement strategy.'

const GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_08_DESCRIPTION =
  'The tutor navigates back to the Student Dashboard screen in the PLUS app to move on to the next student in the researcher sorted list.'

const GOAL_SETTING_CHECK_GOALS_ZOOM_PENCIL_STEP_01_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_CHECK_GOALS_ZOOM_PENCIL_STEP_03_DESCRIPTION =
  'The tutor shares screen via Zoom/Pencil screen share feature.'

const GOAL_SETTING_CHECK_GOALS_ZOOM_PENCIL_STEP_04_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_CHECK_GOALS_ZOOM_PENCIL_STEP_05_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_CHECK_GOALS_ZOOM_PENCIL_STEP_06_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_CHECK_GOALS_ZOOM_PENCIL_STEP_07_DESCRIPTION =
  "The tutor leaves the student's Zoom/Pencil breakout room."

function checkGoalsPlusAppLink(
  description: string,
  picture: string,
  figmaUrl: string,
): ReturnType<typeof techDescriptionLink> {
  return techDescriptionLink('PLUS App', description, picture, figmaUrl)
}

function cell(
  id: string,
  layerId: string,
  stepId: string,
  content: string,
  metadata: Partial<
    Pick<BlueprintCell, 'picture' | 'description' | 'links'>
  > = {},
): BlueprintCell {
  const links =
    layerId === L.regular
      ? mergeUrlLinks(
          metadata.links ?? [],
          GOAL_SETTING_REGULAR_TUTOR_ONBOARDING_LINKS,
        )
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

function gcCell(stepSlot: string, layerSuffix: string): string {
  return `a0000000-0000-4000-8000-000000a0${stepSlot}${layerSuffix}`
}

function gcTrigger(triggerSlot: string): string {
  return `a0000000-0000-4000-8000-00000009c${triggerSlot}`
}

function trigger(
  slot: string,
  fromStep: string,
  fromLayer: string,
  toStep: string,
  toLayer: string,
): BlueprintCellTrigger {
  return {
    id: gcTrigger(slot),
    source_cell_id: gcCell(fromStep, fromLayer),
    target_cell_id: gcCell(toStep, toLayer),
  }
}

function rowTriggers(
  layer: string,
  idStart: number,
  count: number,
): BlueprintCellTrigger[] {
  const triggers: BlueprintCellTrigger[] = []
  for (let i = 0; i < count; i++) {
    const from = String(i + 1).padStart(2, '0')
    const to = String(i + 2).padStart(2, '0')
    triggers.push(
      trigger(
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

function columnLaneTriggers(
  fromLayer: string,
  toLayer: string,
  idStart: number,
  stepCount: number,
): BlueprintCellTrigger[] {
  const triggers: BlueprintCellTrigger[] = []
  for (let i = 0; i < stepCount; i++) {
    const step = String(i + 1).padStart(2, '0')
    triggers.push(
      trigger(
        String(idStart + i).padStart(3, '0'),
        step,
        fromLayer,
        step,
        toLayer,
      ),
    )
  }
  return triggers
}

const partnerLeadOptions = {
  cellId: (stepSlot: string, layerSuffix: '01' | '02') =>
    gcCell(stepSlot, layerSuffix),
  triggerId: (slot: string) => gcTrigger(slot),
  partnerLayerId: L.partner,
  leadLayerId: L.lead,
  stepIdForColumn: (column: number) => STEPS[column - 1]!.id,
  leadStepPictures: GOAL_SETTING_PARALLEL_LEAD_STEP_PICTURES,
  partnerStepPictures: GOAL_SETTING_PARALLEL_PARTNER_STEP_PICTURES,
}

const GOAL_SETTING_CHECK_GOALS_TRIGGERS: BlueprintCellTrigger[] = [
  ...buildParallelSessionPartnerLeadTriggers(partnerLeadOptions),
  ...rowTriggers('03', 50, 7),
  ...columnLaneTriggers('03', '06', 70, 8),
  trigger('060', '08', '03', '01', '03'),
]

const GOAL_SETTING_CHECK_GOALS_CELLS: BlueprintCell[] = [
  ...STEPS.map((step, index) =>
    cell(
      gcCell(String(index + 1).padStart(2, '0'), '10'),
      L.visual,
      step.id,
      '',
    ),
  ),
  ...buildParallelSessionPartnerLeadCells(partnerLeadOptions),

  cell(
    gcCell('01', '03'),
    L.regular,
    STEPS[0].id,
    'Join breakout session.',
    { picture: GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_01_PICTURE },
  ),
  cell(
    gcCell('02', '03'),
    L.regular,
    STEPS[1].id,
    "Click on 'Check Goals' CTA in the Action column.",
    { picture: GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_02_PICTURE },
  ),
  cell(gcCell('03', '03'), L.regular, STEPS[2].id, 'Share screen.', {
    picture: GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_03_PICTURE,
  }),
  cell(
    gcCell('04', '03'),
    L.regular,
    STEPS[3].id,
    'Review goals that were set with student.',
    { picture: GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_04_PICTURE },
  ),
  cell(
    gcCell('05', '03'),
    L.regular,
    STEPS[4].id,
    "Once goal review is done, clicks on 'Check Goals' button.",
    { picture: GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_05_PICTURE },
  ),
  cell(
    gcCell('06', '03'),
    L.regular,
    STEPS[5].id,
    'Finalize checking goal with the student.',
    { picture: GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_06_PICTURE },
  ),
  cell(gcCell('07', '03'), L.regular, STEPS[6].id, 'Leave breakout room.', {
    picture: GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_07_PICTURE,
  }),
  cell(
    gcCell('08', '03'),
    L.regular,
    STEPS[7].id,
    'Move on to the next student in sorted order set by researchers.',
    { picture: GOAL_SETTING_CHECK_GOALS_REGULAR_TUTOR_STEP_08_PICTURE },
  ),

  cell(gcCell('01', '06'), L.frontStageTech, STEPS[0].id, 'Zoom/Pencil', {
    description: GOAL_SETTING_CHECK_GOALS_ZOOM_PENCIL_STEP_01_DESCRIPTION,
  }),
  cell(gcCell('02', '06'), L.frontStageTech, STEPS[1].id, 'PLUS App', {
    links: [
      checkGoalsPlusAppLink(
        GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_02_DESCRIPTION,
        GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_02_PICTURE,
        GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_02_FIGMA_URL,
      ),
    ],
  }),
  cell(
    gcCell('03', '06'),
    L.frontStageTech,
    STEPS[2].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_CHECK_GOALS_ZOOM_PENCIL_STEP_03_DESCRIPTION,
      links: [
        checkGoalsPlusAppLink(
          GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_03_DESCRIPTION,
          GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_03_PICTURE,
          GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEPS_3_5_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(gcCell('04', '06'), L.frontStageTech, STEPS[3].id, 'Zoom/Pencil', {
    description: GOAL_SETTING_CHECK_GOALS_ZOOM_PENCIL_STEP_04_DESCRIPTION,
  }),
  cell(
    gcCell('05', '06'),
    L.frontStageTech,
    STEPS[4].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_CHECK_GOALS_ZOOM_PENCIL_STEP_05_DESCRIPTION,
      links: [
        checkGoalsPlusAppLink(
          GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_05_DESCRIPTION,
          GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_05_PICTURE,
          GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEPS_3_5_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(
    gcCell('06', '06'),
    L.frontStageTech,
    STEPS[5].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_CHECK_GOALS_ZOOM_PENCIL_STEP_06_DESCRIPTION,
      links: [
        checkGoalsPlusAppLink(
          GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_06_DESCRIPTION,
          GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_06_PICTURE,
          GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_06_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(gcCell('07', '06'), L.frontStageTech, STEPS[6].id, 'Zoom/Pencil', {
    description: GOAL_SETTING_CHECK_GOALS_ZOOM_PENCIL_STEP_07_DESCRIPTION,
  }),
  cell(gcCell('08', '06'), L.frontStageTech, STEPS[7].id, 'PLUS App', {
    links: [
      checkGoalsPlusAppLink(
        GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_08_DESCRIPTION,
        GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_08_PICTURE,
        GOAL_SETTING_CHECK_GOALS_PLUS_APP_STEP_08_FIGMA_URL,
      ),
    ],
  }),

  cell(
    gcCell('04', '07'),
    L.backStage,
    STEPS[3].id,
    BACKSTAGE_RESEARCHER,
  ),
  cell(
    gcCell('05', '07'),
    L.backStage,
    STEPS[4].id,
    BACKSTAGE_RESEARCHER,
  ),
  cell(
    gcCell('06', '07'),
    L.backStage,
    STEPS[5].id,
    BACKSTAGE_RESEARCHER,
  ),
  cell(
    gcCell('08', '07'),
    L.backStage,
    STEPS[7].id,
    'Researchers set student order.',
  ),

  cell(gcCell('02', '09'), L.support, STEPS[1].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(gcCell('03', '09'), L.support, STEPS[2].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(gcCell('05', '09'), L.support, STEPS[4].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(gcCell('06', '09'), L.support, STEPS[5].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(
    gcCell('08', '09'),
    L.support,
    STEPS[7].id,
    SUPPORT_STEP_8,
    { description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION },
  ),
]

export const GOAL_SETTING_CHECK_GOALS_PATH_FALLBACK: BlueprintData = {
  path: {
    id: GOAL_SETTING_CHECK_GOALS_PATH_ID,
    name: 'Check Goals',
    description: 'Goals already set, but deadline not reached.',
    note: getScenarioParallelNote(GOAL_SETTING_SCENARIO_ID),
    path_type: 'alternative',
  },
  layers: [...LAYERS],
  steps: [...STEPS],
  cells: GOAL_SETTING_CHECK_GOALS_CELLS,
  triggers: GOAL_SETTING_CHECK_GOALS_TRIGGERS,
}
