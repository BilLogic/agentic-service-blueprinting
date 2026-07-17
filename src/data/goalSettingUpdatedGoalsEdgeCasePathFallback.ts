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
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_01_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_02_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_03_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_04_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_05_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_06_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_07_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_08_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_09_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_10_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_11_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_12_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_02_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_03_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_04_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_05_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_06_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_07_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_08_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_09_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_10_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_12_PICTURE,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEPS_2_3_FIGMA_URL,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEPS_4_5_6_FIGMA_URL,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEPS_7_8_9_FIGMA_URL,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_10_FIGMA_URL,
  GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_12_FIGMA_URL,
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

export const GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_PATH_ID =
  'a0000000-0000-4000-8000-000000000817'

const STEP_VISUAL_LAYER_ID = 'a0000000-0000-4000-8000-0000000008f0'

const LAYERS = [
  { id: STEP_VISUAL_LAYER_ID, name: 'Visual', row_position: 0 },
  {
    id: 'a0000000-0000-4000-8000-0000000008f1',
    name: 'Partner Action: Teacher',
    row_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008f2',
    name: 'Lead Tutor',
    row_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008f3',
    name: 'Regular Tutor',
    row_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008f4',
    name: 'Front Stage Tech',
    row_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008f5',
    name: 'Front Stage Actions',
    row_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008f7',
    name: 'Back Stage Tech',
    row_position: 6,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008f6',
    name: 'Back Stage Actions',
    row_position: 7,
  },
  {
    id: 'a0000000-0000-4000-8000-0000000008f8',
    name: 'Support Actions',
    row_position: 8,
  },
] as const

const STEPS = [
  {
    id: 'a0000000-0000-4000-8000-000000009e01',
    name: 'Join breakout session',
    column_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009e02',
    name: "Sees action color in dashboard is warning and CTA copy is 'Update Goals' within a mid-cycle goal check-in session.",
    column_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009e03',
    name: "Click on 'Update Goals' CTA in the action column",
    column_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009e04',
    name: 'Share screen',
    column_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009e05',
    name: 'Review last goal cycle overview and system suggestion',
    column_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009e06',
    name: 'Once student understands, starts updating goal for the next goal cycle while sharing screen',
    column_position: 6,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009e07',
    name: 'Fills out goal settings and quantity with the student',
    column_position: 7,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009e08',
    name: 'If prompted, fill out goal achievement strategy with the student',
    column_position: 8,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009e09',
    name: 'Save goal',
    column_position: 9,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009e0a',
    name: 'Finalize updating goal with student',
    column_position: 10,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009e0b',
    name: 'Leave breakout room',
    column_position: 11,
  },
  {
    id: 'a0000000-0000-4000-8000-000000009e0c',
    name: 'Move on to the next student in sorted order set by researchers',
    column_position: 12,
  },
] as const

const L = {
  visual: STEP_VISUAL_LAYER_ID,
  partner: 'a0000000-0000-4000-8000-0000000008f1',
  lead: 'a0000000-0000-4000-8000-0000000008f2',
  regular: 'a0000000-0000-4000-8000-0000000008f3',
  frontStageTech: 'a0000000-0000-4000-8000-0000000008f4',
  backStage: 'a0000000-0000-4000-8000-0000000008f6',
  support: 'a0000000-0000-4000-8000-0000000008f8',
} as const

const SUPPORT_DEV_DESIGN = 'Dev Team\nDesign Team'
const BACKSTAGE_RESEARCHER = 'Researcher sets goal setting activities.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_02_DESCRIPTION =
  'The tutor views the Student Dashboard screen in the PLUS app during a mid-cycle goal check-in session and sees the warning action color with an Update Goals CTA for a student who needs to update their goals.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_03_DESCRIPTION =
  'The tutor clicks the Update Goals CTA in the Action column in the PLUS app for the student they are working with.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_04_DESCRIPTION =
  'The tutor shares the update goals modal in the PLUS app with the student while screen sharing, which displays the last goal cycle overview and system suggestions for effort and progress goals.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_05_DESCRIPTION =
  'The tutor reviews the last goal cycle overview and system suggestions for effort and progress goals with the student in the PLUS app.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_06_DESCRIPTION =
  'After reviewing the last goal cycle overview with the student, the tutor starts updating goals for the next goal cycle in the PLUS app while sharing their screen.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_07_DESCRIPTION =
  'The tutor fills out effort and progress goal settings and quantities with the student in the PLUS app.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_08_DESCRIPTION =
  'If prompted, the tutor fills out the goal achievement strategy with the student in the PLUS app.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_09_DESCRIPTION =
  'The tutor saves the updated goal with the student in the PLUS app.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_10_DESCRIPTION =
  'The tutor finalizes updating goals with the student in the PLUS app, which displays the goals updated summary with effort and progress goals and goal achievement strategy.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_12_DESCRIPTION =
  'The tutor navigates back to the Student Dashboard screen in the PLUS app to move on to the next student in the researcher sorted list.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_01_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_04_DESCRIPTION =
  'The tutor shares screen via Zoom/Pencil screen share feature.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_05_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_06_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_07_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_08_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_09_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_10_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'

const GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_11_DESCRIPTION =
  "The tutor leaves the student's Zoom/Pencil breakout room."

function updateGoalsEdgeCasePlusAppLink(
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

function ugCell(stepSlot: string, layerSuffix: string): string {
  return `a0000000-0000-4000-8000-000000d0${stepSlot}${layerSuffix}`
}

function ugTrigger(triggerSlot: string): string {
  return `a0000000-0000-4000-8000-00000009e${triggerSlot}`
}

function trigger(
  slot: string,
  fromStep: string,
  fromLayer: string,
  toStep: string,
  toLayer: string,
): BlueprintCellTrigger {
  return {
    id: ugTrigger(slot),
    source_cell_id: ugCell(fromStep, fromLayer),
    target_cell_id: ugCell(toStep, toLayer),
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
    ugCell(stepSlot, layerSuffix),
  triggerId: (slot: string) => ugTrigger(slot),
  partnerLayerId: L.partner,
  leadLayerId: L.lead,
  stepIdForColumn: (column: number) => STEPS[column - 1]!.id,
  leadStepPictures: GOAL_SETTING_PARALLEL_LEAD_STEP_PICTURES,
  partnerStepPictures: GOAL_SETTING_PARALLEL_PARTNER_STEP_PICTURES,
}

const GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_TRIGGERS: BlueprintCellTrigger[] = [
  ...buildParallelSessionPartnerLeadTriggers(partnerLeadOptions),
  ...rowTriggers('03', 50, 11),
  ...columnLaneTriggers('03', '06', 70, 12),
  trigger('062', '12', '03', '01', '03'),
]

const GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_CELLS: BlueprintCell[] = [
  ...STEPS.map((step, index) =>
    cell(
      ugCell(String(index + 1).padStart(2, '0'), '10'),
      L.visual,
      step.id,
      '',
    ),
  ),
  ...buildParallelSessionPartnerLeadCells(partnerLeadOptions),

  cell(ugCell('01', '03'), L.regular, STEPS[0].id, 'Join breakout session.', {
    picture: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_01_PICTURE,
  }),
  cell(
    ugCell('02', '03'),
    L.regular,
    STEPS[1].id,
    "Sees action color in dashboard is warning and CTA copy is 'Update Goals' within a mid-cycle goal check-in session.",
    { picture: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_02_PICTURE },
  ),
  cell(
    ugCell('03', '03'),
    L.regular,
    STEPS[2].id,
    "Click on 'Update Goals' CTA in the action column.",
    { picture: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_03_PICTURE },
  ),
  cell(ugCell('04', '03'), L.regular, STEPS[3].id, 'Share screen.', {
    picture: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_04_PICTURE,
  }),
  cell(
    ugCell('05', '03'),
    L.regular,
    STEPS[4].id,
    'Review last goal cycle overview and system suggestion.',
    { picture: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_05_PICTURE },
  ),
  cell(
    ugCell('06', '03'),
    L.regular,
    STEPS[5].id,
    'Once student understands, starts updating goal for the next goal cycle while sharing screen.',
    { picture: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_06_PICTURE },
  ),
  cell(
    ugCell('07', '03'),
    L.regular,
    STEPS[6].id,
    'Fills out goal settings and quantity with the student.',
    { picture: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_07_PICTURE },
  ),
  cell(
    ugCell('08', '03'),
    L.regular,
    STEPS[7].id,
    'If prompted, fill out goal achievement strategy with the student.',
    { picture: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_08_PICTURE },
  ),
  cell(ugCell('09', '03'), L.regular, STEPS[8].id, 'Save goal.', {
    picture: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_09_PICTURE,
  }),
  cell(
    ugCell('10', '03'),
    L.regular,
    STEPS[9].id,
    'Finalize updating goal with student.',
    { picture: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_10_PICTURE },
  ),
  cell(ugCell('11', '03'), L.regular, STEPS[10].id, 'Leave breakout room.', {
    picture: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_11_PICTURE,
  }),
  cell(
    ugCell('12', '03'),
    L.regular,
    STEPS[11].id,
    'Move on to the next student in sorted order set by researchers.',
    { picture: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_REGULAR_TUTOR_STEP_12_PICTURE },
  ),

  cell(ugCell('01', '06'), L.frontStageTech, STEPS[0].id, 'Zoom/Pencil', {
    description: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_01_DESCRIPTION,
  }),
  cell(ugCell('02', '06'), L.frontStageTech, STEPS[1].id, 'PLUS App', {
    links: [
      updateGoalsEdgeCasePlusAppLink(
        GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_02_DESCRIPTION,
        GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_02_PICTURE,
        GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEPS_2_3_FIGMA_URL,
      ),
    ],
  }),
  cell(ugCell('03', '06'), L.frontStageTech, STEPS[2].id, 'PLUS App', {
    links: [
      updateGoalsEdgeCasePlusAppLink(
        GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_03_DESCRIPTION,
        GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_03_PICTURE,
        GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEPS_2_3_FIGMA_URL,
      ),
    ],
  }),
  cell(
    ugCell('04', '06'),
    L.frontStageTech,
    STEPS[3].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_04_DESCRIPTION,
      links: [
        updateGoalsEdgeCasePlusAppLink(
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_04_DESCRIPTION,
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_04_PICTURE,
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEPS_4_5_6_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(
    ugCell('05', '06'),
    L.frontStageTech,
    STEPS[4].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_05_DESCRIPTION,
      links: [
        updateGoalsEdgeCasePlusAppLink(
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_05_DESCRIPTION,
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_05_PICTURE,
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEPS_4_5_6_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(
    ugCell('06', '06'),
    L.frontStageTech,
    STEPS[5].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_06_DESCRIPTION,
      links: [
        updateGoalsEdgeCasePlusAppLink(
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_06_DESCRIPTION,
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_06_PICTURE,
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEPS_4_5_6_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(
    ugCell('07', '06'),
    L.frontStageTech,
    STEPS[6].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_07_DESCRIPTION,
      links: [
        updateGoalsEdgeCasePlusAppLink(
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_07_DESCRIPTION,
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_07_PICTURE,
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEPS_7_8_9_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(
    ugCell('08', '06'),
    L.frontStageTech,
    STEPS[7].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_08_DESCRIPTION,
      links: [
        updateGoalsEdgeCasePlusAppLink(
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_08_DESCRIPTION,
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_08_PICTURE,
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEPS_7_8_9_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(
    ugCell('09', '06'),
    L.frontStageTech,
    STEPS[8].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_09_DESCRIPTION,
      links: [
        updateGoalsEdgeCasePlusAppLink(
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_09_DESCRIPTION,
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_09_PICTURE,
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEPS_7_8_9_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(
    ugCell('10', '06'),
    L.frontStageTech,
    STEPS[9].id,
    'Zoom/Pencil, PLUS App',
    {
      description: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_10_DESCRIPTION,
      links: [
        updateGoalsEdgeCasePlusAppLink(
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_10_DESCRIPTION,
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_10_PICTURE,
          GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_10_FIGMA_URL,
        ),
      ],
    },
  ),
  cell(ugCell('11', '06'), L.frontStageTech, STEPS[10].id, 'Zoom/Pencil', {
    description: GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_ZOOM_PENCIL_STEP_11_DESCRIPTION,
  }),
  cell(ugCell('12', '06'), L.frontStageTech, STEPS[11].id, 'PLUS App', {
    links: [
      updateGoalsEdgeCasePlusAppLink(
        GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_12_DESCRIPTION,
        GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_12_PICTURE,
        GOAL_SETTING_UPDATE_GOALS_EDGE_CASE_PLUS_APP_STEP_12_FIGMA_URL,
      ),
    ],
  }),

  cell(ugCell('05', '07'), L.backStage, STEPS[4].id, BACKSTAGE_RESEARCHER),
  cell(ugCell('06', '07'), L.backStage, STEPS[5].id, BACKSTAGE_RESEARCHER),
  cell(ugCell('07', '07'), L.backStage, STEPS[6].id, BACKSTAGE_RESEARCHER),
  cell(ugCell('08', '07'), L.backStage, STEPS[7].id, BACKSTAGE_RESEARCHER),
  cell(ugCell('09', '07'), L.backStage, STEPS[8].id, BACKSTAGE_RESEARCHER),
  cell(ugCell('10', '07'), L.backStage, STEPS[9].id, BACKSTAGE_RESEARCHER),
  cell(ugCell('12', '07'), L.backStage, STEPS[11].id, BACKSTAGE_RESEARCHER),

  cell(ugCell('02', '09'), L.support, STEPS[1].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(ugCell('03', '09'), L.support, STEPS[2].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(ugCell('04', '09'), L.support, STEPS[3].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(ugCell('05', '09'), L.support, STEPS[4].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(ugCell('06', '09'), L.support, STEPS[5].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(ugCell('07', '09'), L.support, STEPS[6].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(ugCell('08', '09'), L.support, STEPS[7].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(ugCell('09', '09'), L.support, STEPS[8].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(ugCell('10', '09'), L.support, STEPS[9].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell(ugCell('12', '09'), L.support, STEPS[11].id, SUPPORT_DEV_DESIGN, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
]

export const GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_PATH_FALLBACK: BlueprintData =
  {
    path: {
      id: GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_PATH_ID,
      name: 'Update Goals Edge Case',
      description:
        'Goal cycle began and deadline not reached, but student did not set goals last session and has prior goals.',
      note: getScenarioParallelNote(GOAL_SETTING_SCENARIO_ID),
      path_type: 'alternative',
    },
    layers: [...LAYERS],
    steps: [...STEPS],
    cells: GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_CELLS,
    triggers: GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_TRIGGERS,
  }
