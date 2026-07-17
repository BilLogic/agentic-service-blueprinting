import { EMPTY_CELL_METADATA } from '@/lib/cellMetadata'
import { WRAP_UP_REGULAR_TUTOR_ONBOARDING_LINKS } from '@/data/onboardingModuleLinks'
import { mergeUrlLinks, techDescriptionLink } from '@/lib/blueprintTechDescriptions'
import { SUPPORT_ACTIONS_DESCRIPTION } from '@/data/supportActionsCopy'
import {
  WRAP_UP_PARTNER_STEP_01_PICTURE,
  WRAP_UP_PARTNER_STEP_02_PICTURE,
  WRAP_UP_PARTNER_STEP_03_PICTURE,
  WRAP_UP_PARTNER_STEP_04_PICTURE,
  WRAP_UP_LEAD_TUTOR_STEP_01_PICTURE,
  WRAP_UP_LEAD_TUTOR_STEP_02_PICTURE,
  WRAP_UP_LEAD_TUTOR_STEP_03_PICTURE,
  WRAP_UP_LEAD_TUTOR_STEP_04_PICTURE,
  WRAP_UP_REGULAR_TUTOR_STEP_01_PICTURE,
  WRAP_UP_REGULAR_TUTOR_STEP_02_PICTURE,
  WRAP_UP_REGULAR_TUTOR_STEP_03_PICTURE,
  WRAP_UP_REGULAR_TUTOR_STEP_04_PICTURE,
  WRAP_UP_PLUS_APP_STEP_04_DESCRIPTION,
  WRAP_UP_PLUS_APP_STEP_04_FIGMA_URL,
  WRAP_UP_PLUS_APP_STEP_04_PICTURE,
  WRAP_UP_ZOOM_PENCIL_STEP_01_DESCRIPTION,
  WRAP_UP_ZOOM_PENCIL_STEP_02_DESCRIPTION,
  WRAP_UP_ZOOM_PENCIL_STEP_03_DESCRIPTION,
} from '@/data/wrapUpPictures'
import { ZOOM_TECH_LOGO } from '@/lib/blueprintTechPictures'
import type {
  BlueprintCell,
  BlueprintCellTrigger,
  BlueprintData,
} from '@/types/blueprint'

export const WRAP_UP_SCENARIO_ID =
  'a0000000-0000-4000-8000-000000000206'

export const WRAP_UP_HAPPY_PATH_ID =
  'a0000000-0000-4000-8000-00000000080e'

const STEP_VISUAL_LAYER_ID = 'a0000000-0000-4000-8000-000000000870'

const LAYERS = [
  { id: STEP_VISUAL_LAYER_ID, name: 'Visual', row_position: 0 },
  {
    id: 'a0000000-0000-4000-8000-000000000871',
    name: 'Partner Action: Teacher',
    row_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000872',
    name: 'Lead Tutor',
    row_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000873',
    name: 'Regular Tutor',
    row_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000875',
    name: 'Front Stage Tech',
    row_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000874',
    name: 'Front Stage Actions',
    row_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000877',
    name: 'Back Stage Tech',
    row_position: 6,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000876',
    name: 'Back Stage Actions',
    row_position: 7,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000878',
    name: 'Support Actions',
    row_position: 8,
  },
] as const

const STEPS = [
  {
    id: 'a0000000-0000-4000-8000-000000000980',
    name: 'Close breakout sessions',
    column_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000981',
    name: 'Thank students',
    column_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000982',
    name: 'Debrief with tutors',
    column_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000983',
    name: 'Complete wrap-up',
    column_position: 4,
  },
] as const

const L = {
  visual: STEP_VISUAL_LAYER_ID,
  partner: 'a0000000-0000-4000-8000-000000000871',
  lead: 'a0000000-0000-4000-8000-000000000872',
  regular: 'a0000000-0000-4000-8000-000000000873',
  frontStage: 'a0000000-0000-4000-8000-000000000874',
  frontStageTech: 'a0000000-0000-4000-8000-000000000875',
  backStage: 'a0000000-0000-4000-8000-000000000876',
  backStageTech: 'a0000000-0000-4000-8000-000000000877',
  support: 'a0000000-0000-4000-8000-000000000878',
} as const

function cell(
  id: string,
  layerId: string,
  stepId: string,
  content: string,
  metadata: Partial<Pick<BlueprintCell, 'picture' | 'description' | 'links'>> = {},
): BlueprintCell {
  const links =
    layerId === L.regular
      ? mergeUrlLinks(metadata.links ?? [], WRAP_UP_REGULAR_TUTOR_ONBOARDING_LINKS)
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

function wuCell(stepSlot: string, layerSuffix: string): string {
  return `a0000000-0000-4000-8000-0000001c${stepSlot}${layerSuffix}`
}

function wuTrigger(triggerSlot: string): string {
  return `a0000000-0000-4000-8000-00000009a${triggerSlot}`
}

function trigger(
  slot: string,
  fromStep: string,
  fromLayer: string,
  toStep: string,
  toLayer: string,
): BlueprintCellTrigger {
  return {
    id: wuTrigger(slot),
    source_cell_id: wuCell(fromStep, fromLayer),
    target_cell_id: wuCell(toStep, toLayer),
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

const WRAP_UP_TRIGGERS: BlueprintCellTrigger[] = [
  ...rowTriggers('01', 1, 3),
  ...rowTriggers('02', 10, 3),
  ...rowTriggers('03', 20, 3),
  ...columnLaneTriggers('03', '06', 113, 4),
  trigger('033', '03', '02', '03', '03'),
  trigger('034', '03', '03', '03', '02'),
]

const WRAP_UP_CELLS: BlueprintCell[] = [
  ...STEPS.map((step, index) =>
    cell(wuCell(String(index + 1).padStart(2, '0'), '10'), L.visual, step.id, ''),
  ),

  cell(wuCell('01', '01'), L.partner, STEPS[0].id, 'Help students log out of Zoom.', {
    picture: WRAP_UP_PARTNER_STEP_01_PICTURE,
  }),
  cell(
    wuCell('02', '01'),
    L.partner,
    STEPS[1].id,
    'Remind students to save their work or note what they accomplished.',
    { picture: WRAP_UP_PARTNER_STEP_02_PICTURE },
  ),
  cell(
    wuCell('03', '01'),
    L.partner,
    STEPS[2].id,
    'Encourage them to reflect on what they learned or practiced.',
    { picture: WRAP_UP_PARTNER_STEP_03_PICTURE },
  ),
  cell(
    wuCell('04', '01'),
    L.partner,
    STEPS[3].id,
    'Share quick reminders to students about what to bring or prepare for next time.',
    { picture: WRAP_UP_PARTNER_STEP_04_PICTURE },
  ),

  cell(wuCell('01', '02'), L.lead, STEPS[0].id, 'Close breakout rooms.', {
    picture: WRAP_UP_LEAD_TUTOR_STEP_01_PICTURE,
  }),
  cell(wuCell('02', '02'), L.lead, STEPS[1].id, 'Thank students.', {
    picture: WRAP_UP_LEAD_TUTOR_STEP_02_PICTURE,
  }),
  cell(wuCell('03', '02'), L.lead, STEPS[2].id, 'Debrief with tutors.', {
    picture: WRAP_UP_LEAD_TUTOR_STEP_03_PICTURE,
  }),
  cell(
    wuCell('04', '02'),
    L.lead,
    STEPS[3].id,
    'Remind tutors to upload Zoom recording and complete reflection form.',
    { picture: WRAP_UP_LEAD_TUTOR_STEP_04_PICTURE },
  ),

  cell(wuCell('01', '03'), L.regular, STEPS[0].id, 'Return to main room.', {
    picture: WRAP_UP_REGULAR_TUTOR_STEP_01_PICTURE,
  }),
  cell(wuCell('02', '03'), L.regular, STEPS[1].id, 'Thank students.', {
    picture: WRAP_UP_REGULAR_TUTOR_STEP_02_PICTURE,
  }),
  cell(wuCell('03', '03'), L.regular, STEPS[2].id, 'Debrief with lead tutor.', {
    picture: WRAP_UP_REGULAR_TUTOR_STEP_03_PICTURE,
  }),
  cell(
    wuCell('04', '03'),
    L.regular,
    STEPS[3].id,
    'Fill out reflection form and upload Zoom recording.',
    { picture: WRAP_UP_REGULAR_TUTOR_STEP_04_PICTURE },
  ),

  cell(wuCell('01', '06'), L.frontStageTech, STEPS[0].id, 'Zoom/Pencil', {
    picture: ZOOM_TECH_LOGO,
    description: WRAP_UP_ZOOM_PENCIL_STEP_01_DESCRIPTION,
  }),
  cell(wuCell('02', '06'), L.frontStageTech, STEPS[1].id, 'Zoom/Pencil', {
    picture: ZOOM_TECH_LOGO,
    description: WRAP_UP_ZOOM_PENCIL_STEP_02_DESCRIPTION,
  }),
  cell(wuCell('03', '06'), L.frontStageTech, STEPS[2].id, 'Zoom/Pencil', {
    picture: ZOOM_TECH_LOGO,
    description: WRAP_UP_ZOOM_PENCIL_STEP_03_DESCRIPTION,
  }),
  cell(wuCell('04', '06'), L.frontStageTech, STEPS[3].id, 'PLUS App', {
    links: [
      techDescriptionLink(
        'PLUS App',
        WRAP_UP_PLUS_APP_STEP_04_DESCRIPTION,
        WRAP_UP_PLUS_APP_STEP_04_PICTURE,
        WRAP_UP_PLUS_APP_STEP_04_FIGMA_URL,
      ),
    ],
  }),

  cell(wuCell('04', '09'), L.support, STEPS[3].id, 'Dev Team\nDesign Team', {
    description: SUPPORT_ACTIONS_DESCRIPTION,
  }),
]

export const WRAP_UP_HAPPY_PATH_FALLBACK: BlueprintData = {
  path: {
    id: WRAP_UP_HAPPY_PATH_ID,
    name: 'Happy Path',
    description:
      'Teachers and tutors close breakout sessions, debrief, and complete wrap-up tasks.',
    note: null,
    path_type: 'happy',
  },
  layers: [...LAYERS],
  steps: [...STEPS],
  cells: WRAP_UP_CELLS,
  triggers: WRAP_UP_TRIGGERS,
}
