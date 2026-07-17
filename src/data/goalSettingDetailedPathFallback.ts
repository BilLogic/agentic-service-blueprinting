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
  GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_01_PICTURE,
  GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_02_PICTURE,
  GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_03_PICTURE,
  GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_04_PICTURE,
  GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_05_PICTURE,
  GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_06_PICTURE,
  GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_07_PICTURE,
  GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_08_PICTURE,
  GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_09_PICTURE,
  GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_10_PICTURE,
  GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_11_PICTURE,
  GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_02_PICTURE,
  GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_03_PICTURE,
  GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_05_PICTURE,
  GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_06_PICTURE,
  GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_07_PICTURE,
  GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_08_PICTURE,
  GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_09_PICTURE,
  GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_11_PICTURE,
  GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_02_FIGMA_URL,
  GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_03_FIGMA_URL,
  GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_05_FIGMA_URL,
  GOAL_SETTING_SET_GOALS_PLUS_APP_STEPS_6_7_8_FIGMA_URL,
  GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_09_FIGMA_URL,
  GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_11_FIGMA_URL,
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

export const GOAL_SETTING_DETAILED_PATH_ID =
  'a0000000-0000-4000-8000-000000000811'

const STEP_VISUAL_LAYER_ID = 'a0000000-0000-4000-8000-0000000008a0'

const LAYERS = [
  { id: STEP_VISUAL_LAYER_ID, name: 'Visual', row_position: 0 },
  {
    id: 'a0000000-0000-4000-8000-0000000008a1',
    name: 'Partner Action: Teacher',
    row_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008a2',
    name: 'Lead Tutor',
    row_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008a3',
    name: 'Regular Tutor',
    row_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008a4',
    name: 'Front Stage Tech',
    row_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008a5',
    name: 'Front Stage Actions',
    row_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008a7',
    name: 'Back Stage Tech',
    row_position: 6,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008a6',
    name: 'Back Stage Actions',
    row_position: 7,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008a8',
    name: 'Support Actions',
    row_position: 8,
  },
] as const

const STEPS = [
  {
    id: 'a0000000-0000-4000-8000-000000009a01',
    name: 'Join breakout session',
    column_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009a02',
    name: 'Click on Set Goals CTA in the Action column',
    column_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009a03',
    name: 'Share screen',
    column_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009a04',
    name: 'Explain to student what goal setting is',
    column_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009a05',
    name: 'Once student understands, starts setting first goal while sharing screen',
    column_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009a06',
    name: 'Fill out goal settings and quantity with the student',
    column_position: 6,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009a07',
    name: 'If prompted, fill out goal achievement strategy with the student',
    column_position: 7,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009a08',
    name: 'Save goal',
    column_position: 8,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009a09',
    name: 'Finalize goal setting with student',
    column_position: 9,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009a0a',
    name: 'Leave breakout room',
    column_position: 10,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000974',
    name: 'Next student',
    column_position: 11,
  },
] as const

const L = {
  visual: STEP_VISUAL_LAYER_ID,
  partner: 'a0000000-0000-4000-8000-0000000008a1',
  lead: 'a0000000-0000-4000-8000-0000000008a2',
  regular: 'a0000000-0000-4000-8000-0000000008a3',
  frontStageTech: 'a0000000-0000-4000-8000-0000000008a4',
  backStage: 'a0000000-0000-4000-8000-0000000008a6',
  support: 'a0000000-0000-4000-8000-0000000008a8',
} as const

const SUPPORT_DEV_DESIGN = 'Dev Team\nDesign Team'
const BACKSTAGE_GRAD_RESEARCHER =
  'Researchers set goal setting activities.'

const GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_02_DESCRIPTION =
  'The tutor views the Student Dashboard screen in the PLUS app and clicks the Set Goals CTA in the Action column for the student they are working with.'

const GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_03_DESCRIPTION =
  'The tutor shares the set goals modal in the PLUS app with the student, which displays the student\'s goal cycle information and indicates no goals have been set yet.'

const GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_05_DESCRIPTION =
  'The tutor starts setting the student\'s first goals in the PLUS app while sharing their screen, filling out effort goal settings, progress goal settings, and goal achievement strategy.'

const GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_06_DESCRIPTION =
  'The tutor fills out effort and progress goal settings and quantities with the student in the PLUS app.'

const GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_07_DESCRIPTION =
  'If prompted, the tutor fills out the goal achievement strategy with the student in the PLUS app.'

const GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_08_DESCRIPTION =
  'The tutor saves the goal with the student in the PLUS app.'

const GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_09_DESCRIPTION =
  'The tutor finalizes goal setting with the student in the PLUS app, reviewing the saved effort and progress goals and goal achievement strategy summary.'

const GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_11_DESCRIPTION =
  'The tutor navigates back to the Student Dashboard screen in the PLUS app to move on to the next student in the researcher sorted list.'

const GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_01_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_03_DESCRIPTION =
  'The tutor shares screen via Zoom/Pencil screen share feature.'

const GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_04_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_05_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_06_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_07_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_08_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_09_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_10_DESCRIPTION =
  "The tutor leaves the student's Zoom/Pencil breakout room."

function setGoalsPlusAppLink(
  description: string,
  picture: string,
  figmaUrl: string,
): ReturnType<typeof techDescriptionLink> {
  return techDescriptionLink(
    'PLUS App',
    description,
    picture,
    figmaUrl,
  )
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

function gdCell(stepSlot: string, layerSuffix: string): string {
  return `a0000000-0000-4000-8000-0000001f${stepSlot}${layerSuffix}`
}

function gdTrigger(triggerSlot: string): string {
  return `a0000000-0000-4000-8000-00000009b${triggerSlot}`
}

function trigger(
  slot: string,
  fromStep: string,
  fromLayer: string,
  toStep: string,
  toLayer: string,
): BlueprintCellTrigger {
  return {
    id: gdTrigger(slot),
    source_cell_id: gdCell(fromStep, fromLayer),
    target_cell_id: gdCell(toStep, toLayer),
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
    gdCell(stepSlot, layerSuffix),
  triggerId: (slot: string) => gdTrigger(slot),
  partnerLayerId: L.partner,
  leadLayerId: L.lead,
  stepIdForColumn: (column: number) => STEPS[column - 1]!.id,
  leadStepPictures: GOAL_SETTING_PARALLEL_LEAD_STEP_PICTURES,
  partnerStepPictures: GOAL_SETTING_PARALLEL_PARTNER_STEP_PICTURES,
}

const GOAL_SETTING_DETAILED_TRIGGERS: BlueprintCellTrigger[] = [
  ...buildParallelSessionPartnerLeadTriggers(partnerLeadOptions),
  ...rowTriggers('03', 50, 10),
  ...columnLaneTriggers('03', '06', 70, 11),
  trigger('060', '11', '03', '01', '03'),
]

const GOAL_SETTING_DETAILED_CELLS: BlueprintCell[] = [
  ...STEPS.map((step, index) =>
    cell(
      gdCell(String(index + 1).padStart(2, '0'), '10'),
      L.visual,
      step.id,
      '',
    ),
  ),
  ...buildParallelSessionPartnerLeadCells(partnerLeadOptions),

  cell(gdCell('01', '03'), L.regular, STEPS[0].id, 'Join breakout session.', {
    picture: GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_01_PICTURE,
  }),
  cell(
    gdCell('02', '03'),
    L.regular,
    STEPS[1].id,
    'Click on Set Goals CTA in the Action column.',
    { picture: GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_02_PICTURE },
  ),
  cell(gdCell('03', '03'), L.regular, STEPS[2].id, 'Share screen.', {
    picture: GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_03_PICTURE,
  }),
  cell(
    gdCell('04', '03'),
    L.regular,
    STEPS[3].id,
    'Explain to student what goal setting is.',
    { picture: GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_04_PICTURE },
  ),
  cell(
    gdCell('05', '03'),
    L.regular,
    STEPS[4].id,
    'Once student understands, starts setting first goal while sharing screen.',
    { picture: GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_05_PICTURE },
  ),
  cell(
    gdCell('06', '03'),
    L.regular,
    STEPS[5].id,
    'Fill out goal settings and quantity with the student.',
    { picture: GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_06_PICTURE },
  ),
  cell(
    gdCell('07', '03'),
    L.regular,
    STEPS[6].id,
    'If prompted, fill out goal achievement strategy with the student.',
    { picture: GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_07_PICTURE },
  ),
  cell(gdCell('08', '03'), L.regular, STEPS[7].id, 'Save goal.', {
    picture: GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_08_PICTURE,
  }),
  cell(
    gdCell('09', '03'),
    L.regular,
    STEPS[8].id,
    'Finalize goal setting with student.',
    { picture: GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_09_PICTURE },
  ),
  cell(gdCell('10', '03'), L.regular, STEPS[9].id, 'Leave breakout room.', {
    picture: GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_10_PICTURE,
  }),
  cell(
    gdCell('11', '03'),
    L.regular,
    STEPS[10].id,
    'Move on to the next student in sorted order set by researchers.',
    { picture: GOAL_SETTING_SET_GOALS_REGULAR_TUTOR_STEP_11_PICTURE },
  ),

  cell(gdCell('01', '06'), L.frontStageTech, STEPS[0].id, 'Zoom/Pencil', {
    description: GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_01_DESCRIPTION,
  }),
  cell(gdCell('02', '06'), L.frontStageTech, STEPS[1].id, 'PLUS App', {
    links: [
      setGoalsPlusAppLink(
        GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_02_DESCRIPTION,
        GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_02_PICTURE,
        GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_02_FIGMA_URL,
      ),
    ],
  }),
  cell(
    gdCell('03', '06'),
    L.frontStageTech,
    STEPS[2].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_03_DESCRIPTION,
      links: [
        setGoalsPlusAppLink(
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_03_DESCRIPTION,
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_03_PICTURE,
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_03_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(gdCell('04', '06'), L.frontStageTech, STEPS[3].id, 'Zoom/Pencil', {
    description: GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_04_DESCRIPTION,
  }),
  cell(
    gdCell('05', '06'),
    L.frontStageTech,
    STEPS[4].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_05_DESCRIPTION,
      links: [
        setGoalsPlusAppLink(
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_05_DESCRIPTION,
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_05_PICTURE,
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_05_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(
    gdCell('06', '06'),
    L.frontStageTech,
    STEPS[5].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_06_DESCRIPTION,
      links: [
        setGoalsPlusAppLink(
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_06_DESCRIPTION,
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_06_PICTURE,
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEPS_6_7_8_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(
    gdCell('07', '06'),
    L.frontStageTech,
    STEPS[6].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_07_DESCRIPTION,
      links: [
        setGoalsPlusAppLink(
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_07_DESCRIPTION,
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_07_PICTURE,
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEPS_6_7_8_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(
    gdCell('08', '06'),
    L.frontStageTech,
    STEPS[7].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_08_DESCRIPTION,
      links: [
        setGoalsPlusAppLink(
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_08_DESCRIPTION,
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_08_PICTURE,
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEPS_6_7_8_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(
    gdCell('09', '06'),
    L.frontStageTech,
    STEPS[8].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_09_DESCRIPTION,
      links: [
        setGoalsPlusAppLink(
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_09_DESCRIPTION,
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_09_PICTURE,
          GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_09_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(gdCell('10', '06'), L.frontStageTech, STEPS[9].id, 'Zoom/Pencil', {
    description: GOAL_SETTING_SET_GOALS_ZOOM_PENCIL_STEP_10_DESCRIPTION,
  }),
  cell(gdCell('11', '06'), L.frontStageTech, STEPS[10].id, 'PLUS App', {
    links: [
      setGoalsPlusAppLink(
        GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_11_DESCRIPTION,
        GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_11_PICTURE,
        GOAL_SETTING_SET_GOALS_PLUS_APP_STEP_11_FIGMA_URL,
      ),
    ],
  }),

  cell(gdCell('04', '07'), L.backStage, STEPS[3].id, BACKSTAGE_GRAD_RESEARCHER),
  cell(gdCell('05', '07'), L.backStage, STEPS[4].id, BACKSTAGE_GRAD_RESEARCHER),
  cell(gdCell('06', '07'), L.backStage, STEPS[5].id, BACKSTAGE_GRAD_RESEARCHER),
  cell(gdCell('07', '07'), L.backStage, STEPS[6].id, BACKSTAGE_GRAD_RESEARCHER),
  cell(gdCell('08', '07'), L.backStage, STEPS[7].id, BACKSTAGE_GRAD_RESEARCHER),
  cell(gdCell('09', '07'), L.backStage, STEPS[8].id, BACKSTAGE_GRAD_RESEARCHER),
  cell(
    gdCell('11', '07'),
    L.backStage,
    STEPS[10].id,
    'Researchers set student order.',
  ),

  cell(gdCell('02', '09'), L.support, STEPS[1].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(gdCell('03', '09'), L.support, STEPS[2].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(gdCell('05', '09'), L.support, STEPS[4].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(gdCell('06', '09'), L.support, STEPS[5].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(gdCell('07', '09'), L.support, STEPS[6].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(gdCell('08', '09'), L.support, STEPS[7].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(gdCell('09', '09'), L.support, STEPS[8].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(gdCell('11', '09'), L.support, STEPS[10].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
]

export const GOAL_SETTING_DETAILED_PATH_FALLBACK: BlueprintData = {
  path: {
    id: GOAL_SETTING_DETAILED_PATH_ID,
    name: 'Set Goals',
    description:
      'No prior personalized goals set and start of a new goal cycle.',
    note: getScenarioParallelNote(GOAL_SETTING_SCENARIO_ID),
    path_type: 'alternative',
  },
  layers: [...LAYERS],
  steps: [...STEPS],
  cells: GOAL_SETTING_DETAILED_CELLS,
  triggers: GOAL_SETTING_DETAILED_TRIGGERS,
}
