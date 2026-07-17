import { mergeUrlLinks } from '@/lib/blueprintTechDescriptions'
import { STUDENTS_JUST_JOINED_REGULAR_TUTOR_ONBOARDING_LINKS } from '@/data/onboardingModuleLinks'
import { EMPTY_CELL_METADATA } from '@/lib/cellMetadata'
import {
  STUDENTS_JUST_JOINED_PARTNER_STEP_01_PICTURE,
  STUDENTS_JUST_JOINED_PARTNER_STEP_02_PICTURE,
  STUDENTS_JUST_JOINED_PARTNER_STEP_03_PICTURE,
  STUDENTS_JUST_JOINED_LEAD_TUTOR_STEP_01_PICTURE,
  STUDENTS_JUST_JOINED_LEAD_TUTOR_STEP_02_PICTURE,
  STUDENTS_JUST_JOINED_LEAD_TUTOR_STEP_03_PICTURE,
  STUDENTS_JUST_JOINED_REGULAR_TUTOR_STEP_03_PICTURE,
  STUDENTS_JUST_JOINED_ZOOM_PENCIL_STEP_01_DESCRIPTION,
  STUDENTS_JUST_JOINED_ZOOM_PENCIL_STEP_02_DESCRIPTION,
  STUDENTS_JUST_JOINED_ZOOM_PENCIL_STEP_03_DESCRIPTION,
} from '@/data/studentsJustJoinedPictures'
import { ZOOM_TECH_LOGO } from '@/lib/blueprintTechPictures'
import type {
  BlueprintCell,
  BlueprintCellTrigger,
  BlueprintData,
} from '@/types/blueprint'

export const STUDENTS_JUST_JOINED_SCENARIO_ID =
  'a0000000-0000-4000-8000-000000000202'

export const STUDENTS_JUST_JOINED_HAPPY_PATH_ID =
  'a0000000-0000-4000-8000-00000000080b'

const STEP_VISUAL_LAYER_ID = 'a0000000-0000-4000-8000-000000002020'

const LAYERS = [
  { id: STEP_VISUAL_LAYER_ID, name: 'Visual', row_position: 0 },
  {
    id: 'a0000000-0000-4000-8000-000000002021',
    name: 'Partner Action: Teacher',
    row_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000002022',
    name: 'Lead Tutor',
    row_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000002023',
    name: 'Regular Tutor',
    row_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000002025',
    name: 'Front Stage Tech',
    row_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000002024',
    name: 'Front Stage Actions',
    row_position: 5,
  },
  {
    id: 'a0000000-0000-4000-8000-000000002027',
    name: 'Back Stage Tech',
    row_position: 6,
  },
  {
    id: 'a0000000-0000-4000-8000-000000002026',
    name: 'Back Stage Actions',
    row_position: 7,
  },
  {
    id: 'a0000000-0000-4000-8000-000000002028',
    name: 'Support Actions',
    row_position: 8,
  },
] as const

const STEPS = [
  {
    id: 'a0000000-0000-4000-8000-000000000960',
    name: 'Students join',
    column_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000961',
    name: 'Share screen and log in',
    column_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000962',
    name: 'Raise hand for help',
    column_position: 3,
  },
] as const

const L = {
  visual: STEP_VISUAL_LAYER_ID,
  partner: 'a0000000-0000-4000-8000-000000002021',
  lead: 'a0000000-0000-4000-8000-000000002022',
  regular: 'a0000000-0000-4000-8000-000000002023',
  frontStage: 'a0000000-0000-4000-8000-000000002024',
  frontStageTech: 'a0000000-0000-4000-8000-000000002025',
  backStage: 'a0000000-0000-4000-8000-000000002026',
  backStageTech: 'a0000000-0000-4000-8000-000000002027',
  support: 'a0000000-0000-4000-8000-000000002028',
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
      ? mergeUrlLinks(metadata.links ?? [], STUDENTS_JUST_JOINED_REGULAR_TUTOR_ONBOARDING_LINKS)
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

function sjjCell(stepSlot: string, layerSuffix: string): string {
  return `a0000000-0000-4000-8000-00000019${stepSlot}${layerSuffix}`
}

function sjjTrigger(triggerSlot: string): string {
  return `a0000000-0000-4000-8000-000000097${triggerSlot}`
}

function trigger(
  slot: string,
  fromStep: string,
  fromLayer: string,
  toStep: string,
  toLayer: string,
): BlueprintCellTrigger {
  return {
    id: sjjTrigger(slot),
    source_cell_id: sjjCell(fromStep, fromLayer),
    target_cell_id: sjjCell(toStep, toLayer),
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

const STUDENTS_JUST_JOINED_TRIGGERS: BlueprintCellTrigger[] = [
  ...rowTriggers('01', 1, 2),
  ...rowTriggers('02', 10, 2),
  trigger('020', '03', '02', '03', '03'),
  trigger('031', '01', '02', '01', '06'),
  trigger('032', '02', '02', '02', '06'),
  trigger('030', '03', '03', '03', '06'),
]

const STUDENTS_JUST_JOINED_CELLS: BlueprintCell[] = [
  ...STEPS.map((step, index) =>
    cell(sjjCell(String(index + 1).padStart(2, '0'), '10'), L.visual, step.id, ''),
  ),

  cell(
    sjjCell('01', '01'),
    L.partner,
    STEPS[0].id,
    'Remind students that tutors support multiple students and wait time is normal.',
    { picture: STUDENTS_JUST_JOINED_PARTNER_STEP_01_PICTURE },
  ),
  cell(
    sjjCell('02', '01'),
    L.partner,
    STEPS[1].id,
    'Ask students to share screen and log into math software.',
    { picture: STUDENTS_JUST_JOINED_PARTNER_STEP_02_PICTURE },
  ),
  cell(
    sjjCell('03', '01'),
    L.partner,
    STEPS[2].id,
    "Show students how to use the 'raise hand' emoji to let tutors know when they need help.",
    { picture: STUDENTS_JUST_JOINED_PARTNER_STEP_03_PICTURE },
  ),

  cell(sjjCell('01', '02'), L.lead, STEPS[0].id, 'Greet students as they join.', {
    picture: STUDENTS_JUST_JOINED_LEAD_TUTOR_STEP_01_PICTURE,
  }),
  cell(sjjCell('02', '02'), L.lead, STEPS[1].id, 'Mute students if necessary.', {
    picture: STUDENTS_JUST_JOINED_LEAD_TUTOR_STEP_02_PICTURE,
  }),
  cell(
    sjjCell('03', '02'),
    L.lead,
    STEPS[2].id,
    'Ping tutor if they missed moving student to breakout room for late joiners.',
    { picture: STUDENTS_JUST_JOINED_LEAD_TUTOR_STEP_03_PICTURE },
  ),

  cell(
    sjjCell('03', '03'),
    L.regular,
    STEPS[2].id,
    'Move student to breakout room.',
    { picture: STUDENTS_JUST_JOINED_REGULAR_TUTOR_STEP_03_PICTURE },
  ),

  cell(sjjCell('01', '06'), L.frontStageTech, STEPS[0].id, 'Zoom/Pencil', {
    picture: ZOOM_TECH_LOGO,
    description: STUDENTS_JUST_JOINED_ZOOM_PENCIL_STEP_01_DESCRIPTION,
  }),
  cell(sjjCell('02', '06'), L.frontStageTech, STEPS[1].id, 'Zoom/Pencil', {
    picture: ZOOM_TECH_LOGO,
    description: STUDENTS_JUST_JOINED_ZOOM_PENCIL_STEP_02_DESCRIPTION,
  }),
  cell(sjjCell('03', '06'), L.frontStageTech, STEPS[2].id, 'Zoom/Pencil', {
    picture: ZOOM_TECH_LOGO,
    description: STUDENTS_JUST_JOINED_ZOOM_PENCIL_STEP_03_DESCRIPTION,
  }),
]

export const STUDENTS_JUST_JOINED_HAPPY_PATH_FALLBACK: BlueprintData = {
  path: {
    id: STUDENTS_JUST_JOINED_HAPPY_PATH_ID,
    name: 'Happy Path',
    description:
      'Teachers and tutors welcome students as they join the session.',
    note: null,
    path_type: 'happy',
  },
  layers: [...LAYERS],
  steps: [...STEPS],
  cells: STUDENTS_JUST_JOINED_CELLS,
  triggers: STUDENTS_JUST_JOINED_TRIGGERS,
}
