import {
  WARM_UP_REGULAR_TUTOR_STEP_01_PICTURE,
  WARM_UP_REGULAR_TUTOR_STEP_02_PICTURE,
  WARM_UP_REGULAR_TUTOR_STEP_03_PICTURE,
  WARM_UP_REGULAR_TUTOR_STEP_04_PICTURE,
  WARM_UP_REGULAR_TUTOR_STEP_05_PICTURE,
  WARM_UP_REGULAR_TUTOR_STEP_06_PICTURE,
  WARM_UP_REGULAR_TUTOR_STEP_07_PICTURE,
  WARM_UP_REGULAR_TUTOR_STEP_08_PICTURE,
  WARM_UP_REGULAR_TUTOR_STEP_09_PICTURE,
  WARM_UP_PLUS_APP_STEP_05_PICTURE,
  WARM_UP_PLUS_APP_STEP_05_DESCRIPTION,
  WARM_UP_PLUS_APP_STEP_05_FIGMA_URL,
  WARM_UP_PLUS_APP_STEPS_6_7_9_PICTURE,
  WARM_UP_PLUS_APP_STEP_06_DESCRIPTION,
  WARM_UP_PLUS_APP_STEP_07_DESCRIPTION,
  WARM_UP_PLUS_APP_STEP_09_DESCRIPTION,
  WARM_UP_PLUS_APP_STEPS_6_7_9_FIGMA_URL,
} from '@/data/warmUpPictures'
import { WARM_UP_REGULAR_TUTOR_ONBOARDING_LINKS } from '@/data/warmUpRegularTutorLinks'
import { applyBlueprintDisplayFilters } from '@/lib/applyBlueprintDisplayFilters'
import { mergeUrlLinks, techDescriptionLink } from '@/lib/blueprintTechDescriptions'
import { getScenarioParallelNote } from '@/lib/scenarioParallelInfo'
import { WARM_UP_SCENARIO_ID } from '@/data/parallelSessionScenarioIds'
import { ZOOM_TECH_LOGO } from '@/lib/blueprintTechPictures'
import {
  APPLICATION_HAPPY_PATH_FALLBACK,
  APPLICATION_HAPPY_PATH_ID,
  APPLICATION_SAD_PATH_FALLBACK,
  APPLICATION_SAD_PATH_ID,
  DISCOVERY_SCENARIO_ID,
  INTERVIEW_SCENARIO_ID,
} from '@/data/applicationHappyPathFallback'
import {
  APPLICATION_INTERVIEW_HAPPY_PATH_FALLBACK,
  APPLICATION_INTERVIEW_HAPPY_PATH_ID,
} from '@/data/applicationInterviewHappyPathFallback'
import {
  BEFORE_STUDENTS_JOIN_HAPPY_PATH_FALLBACK,
  BEFORE_STUDENTS_JOIN_HAPPY_PATH_ID,
  BEFORE_STUDENTS_JOIN_SCENARIO_ID,
} from '@/data/beforeStudentsJoinHappyPathFallback'
import {
  GOAL_SETTING_HAPPY_PATH_FALLBACK,
  GOAL_SETTING_HAPPY_PATH_ID,
  GOAL_SETTING_SCENARIO_ID,
  GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
} from '@/data/goalSettingHappyPathFallback'
import {
  GOAL_SETTING_DETAILED_PATH_FALLBACK,
  GOAL_SETTING_DETAILED_PATH_ID,
} from '@/data/goalSettingDetailedPathFallback'
import {
  GOAL_SETTING_CHECK_GOALS_PATH_FALLBACK,
  GOAL_SETTING_CHECK_GOALS_PATH_ID,
} from '@/data/goalSettingCheckGoalsPathFallback'
import {
  GOAL_SETTING_UPDATE_GOALS_PATH_FALLBACK,
  GOAL_SETTING_UPDATE_GOALS_PATH_ID,
} from '@/data/goalSettingUpdateGoalsPathFallback'
import {
  GOAL_SETTING_SET_GOALS_EDGE_CASE_PATH_FALLBACK,
  GOAL_SETTING_SET_GOALS_EDGE_CASE_PATH_ID,
} from '@/data/goalSettingSetGoalsEdgeCasePathFallback'
import {
  GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_PATH_FALLBACK,
  GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_PATH_ID,
} from '@/data/goalSettingUpdatedGoalsEdgeCasePathFallback'
import {
  HELP_REQUEST_HAPPY_PATH_FALLBACK,
  HELP_REQUEST_HAPPY_PATH_ID,
  HELP_REQUEST_SCENARIO_ID,
} from '@/data/helpRequestHappyPathFallback'
import {
  WRAP_UP_HAPPY_PATH_FALLBACK,
  WRAP_UP_HAPPY_PATH_ID,
  WRAP_UP_SCENARIO_ID,
} from '@/data/wrapUpHappyPathFallback'
import {
  REPORTING_AN_ISSUE_HAPPY_PATH_FALLBACK,
  REPORTING_AN_ISSUE_HAPPY_PATH_ID,
  REPORTING_AN_ISSUE_SCENARIO_ID,
  REPORTING_HOURS_HAPPY_PATH_FALLBACK,
  REPORTING_HOURS_HAPPY_PATH_ID,
  REPORTING_HOURS_SCENARIO_ID,
} from '@/data/postSessionHappyPathFallbacks'
import {
  STUDENTS_JUST_JOINED_HAPPY_PATH_FALLBACK,
  STUDENTS_JUST_JOINED_HAPPY_PATH_ID,
  STUDENTS_JUST_JOINED_SCENARIO_ID,
} from '@/data/studentsJustJoinedHappyPathFallback'
import {
  CALL_OFF_REQUEST_HAPPY_PATH_FALLBACK,
  CALL_OFF_REQUEST_HAPPY_PATH_ID,
  CALL_OFF_REQUEST_SCENARIO_ID,
} from '@/data/callOffRequestHappyPathFallback'
import {
  FILL_IN_REQUEST_HAPPY_PATH_FALLBACK,
  FILL_IN_REQUEST_HAPPY_PATH_ID,
  FILL_IN_REQUEST_SCENARIO_ID,
} from '@/data/fillInRequestHappyPathFallback'
import {
  LESSON_MODULES_HAPPY_PATH_FALLBACK,
  LESSON_MODULES_HAPPY_PATH_ID,
} from '@/data/lessonModulesHappyPathFallback'
import {
  ONBOARDING_MODULES_HAPPY_PATH_FALLBACK,
  ONBOARDING_MODULES_HAPPY_PATH_ID,
} from '@/data/onboardingModulesHappyPathFallback'
import {
  SESSION_SIGN_UP_HAPPY_PATH_FALLBACK,
  SESSION_SIGN_UP_HAPPY_PATH_ID,
} from '@/data/sessionSignUpHappyPathFallback'
import {
  STANDARD_SCHEDULING_HAPPY_PATH_FALLBACK,
  STANDARD_SCHEDULING_HAPPY_PATH_ID,
  STANDARD_SCHEDULING_SCENARIO_ID,
} from '@/data/standardSchedulingHappyPathFallback'
import {
  LESSON_MODULES_SCENARIO_ID,
  ONBOARDING_MODULES_SCENARIO_ID,
  SESSION_SIGN_UP_SCENARIO_ID,
  TECH_SETUP_HAPPY_PATH_FALLBACK,
  TECH_SETUP_HAPPY_PATH_ID,
  TECH_SETUP_SCENARIO_ID,
} from '@/data/techSetupHappyPathFallback'
// Scale-test fixture (Phase 0-G) — generated stress-test scenario; the
// template scrub can strip this import plus the SCALE_TEST_* registry entries
// below and src/data/scaleFixture.ts, or keep them deliberately.
import {
  SCALE_TEST_ALTERNATIVE_PATH_FALLBACK,
  SCALE_TEST_ALTERNATIVE_PATH_ID,
  SCALE_TEST_EXCEPTION_PATH_FALLBACK,
  SCALE_TEST_EXCEPTION_PATH_ID,
  SCALE_TEST_HAPPY_PATH_FALLBACK,
  SCALE_TEST_HAPPY_PATH_ID,
  SCALE_TEST_PATH_FALLBACKS,
  SCALE_TEST_SCENARIO_ID,
} from '@/data/scaleFixture'
import { EMPTY_CELL_METADATA } from '@/lib/cellMetadata'
import {
  assignWarmUpAlternateCellLayerId,
  repairWarmUpAlternatePathBlueprint,
} from '@/lib/repairWarmUpAlternatePathBlueprint'
import {
  buildParallelSessionPartnerLeadCells,
  buildParallelSessionPartnerLeadTriggers,
} from '@/data/parallelSessionPartnerLead'
import {
  GOAL_SETTING_PARALLEL_LEAD_STEP_PICTURES,
  GOAL_SETTING_PARALLEL_PARTNER_STEP_PICTURES,
} from '@/data/goalSettingParallelSessionPictures'
import type {
  BlueprintCell,
  BlueprintCellTrigger,
  BlueprintData,
} from '@/types/blueprint'

/** Warm-Up scenario from supabase/seed.sql */
export { WARM_UP_SCENARIO_ID }

export const WARM_UP_HAPPY_PATH_ID = 'a0000000-0000-4000-8000-000000000300'
export const WARM_UP_ALTERNATE_PATH_ID = 'a0000000-0000-4000-8000-000000000350'
/** Retained so any legacy DB row stays hidden from the Warm-Up UI. */
const WARM_UP_SAD_PATH_ID = 'a0000000-0000-4000-8000-000000000360'

const WARM_UP_STEP_3_ID = 'a0000000-0000-4000-8000-000000000313'

const PATH_ID = WARM_UP_HAPPY_PATH_ID

export const STEP_VISUAL_LAYER_ID =
  'a0000000-0000-4000-8000-000000000310'
const ALTERNATE_STEP_VISUAL_LAYER_ID =
  'a0000000-0000-4000-8000-000000000410'

const LAYERS = [
  { id: STEP_VISUAL_LAYER_ID, name: 'Visual', row_position: 0 },
  { id: 'a0000000-0000-4000-8000-000000000301', name: 'Partner Action: Teacher', row_position: 1 },
  { id: 'a0000000-0000-4000-8000-000000000302', name: 'Lead Tutor', row_position: 2 },
  { id: 'a0000000-0000-4000-8000-000000000303', name: 'Regular Tutor', row_position: 3 },
  { id: 'a0000000-0000-4000-8000-000000000306', name: 'Front Stage Tech', row_position: 4 },
  { id: 'a0000000-0000-4000-8000-000000000304', name: 'Front Stage Actions', row_position: 5 },
  { id: 'a0000000-0000-4000-8000-000000000308', name: 'Back Stage Tech', row_position: 6 },
  { id: 'a0000000-0000-4000-8000-000000000307', name: 'Back Stage Actions', row_position: 7 },
  { id: 'a0000000-0000-4000-8000-000000000309', name: 'Support Actions', row_position: 8 },
] as const

const STEPS = [
  { id: 'a0000000-0000-4000-8000-000000000311', name: 'Enter Breakout Room', column_position: 1 },
  { id: 'a0000000-0000-4000-8000-000000000312', name: 'Greet Student', column_position: 2 },
  { id: 'a0000000-0000-4000-8000-000000000313', name: 'Ask Student to Share Screen', column_position: 3 },
  { id: 'a0000000-0000-4000-8000-000000000314', name: 'Remind Student They Can Ask for Help', column_position: 4 },
  { id: 'a0000000-0000-4000-8000-000000000315', name: 'Mark Student Present', column_position: 5 },
  { id: 'a0000000-0000-4000-8000-000000000316', name: 'Select Engagement level', column_position: 6 },
  { id: 'a0000000-0000-4000-8000-000000000317', name: 'Mark Student Helped', column_position: 7 },
  { id: 'a0000000-0000-4000-8000-000000000319', name: 'Leave Breakout Room', column_position: 8 },
  { id: 'a0000000-0000-4000-8000-000000000318', name: 'Move to Next Student', column_position: 9 },
] as const

const L = {
  stepVisual: STEP_VISUAL_LAYER_ID,
  partner: 'a0000000-0000-4000-8000-000000000301',
  lead: 'a0000000-0000-4000-8000-000000000302',
  regular: 'a0000000-0000-4000-8000-000000000303',
  frontTech: 'a0000000-0000-4000-8000-000000000306',
  support: 'a0000000-0000-4000-8000-000000000309',
} as const

function stepVisualCellId(stepIndex: number): string {
  const slot = String(stepIndex + 1).padStart(2, '0')
  return `a0000000-0000-4000-8000-00000004${slot}10`
}

const WARM_UP_HAPPY_TO_ALTERNATE_LAYER_ID: Record<string, string> = {
  [STEP_VISUAL_LAYER_ID]: ALTERNATE_STEP_VISUAL_LAYER_ID,
  [L.partner]: 'a0000000-0000-4000-8000-000000000401',
  [L.lead]: 'a0000000-0000-4000-8000-000000000402',
  [L.regular]: 'a0000000-0000-4000-8000-000000000403',
  'a0000000-0000-4000-8000-000000000304':
    'a0000000-0000-4000-8000-000000000404',
  [L.frontTech]: 'a0000000-0000-4000-8000-000000000406',
  'a0000000-0000-4000-8000-000000000307':
    'a0000000-0000-4000-8000-000000000407',
  'a0000000-0000-4000-8000-000000000308':
    'a0000000-0000-4000-8000-000000000408',
  [L.support]: 'a0000000-0000-4000-8000-000000000409',
}

function mapAlternatePathLayerId(layerId: string): string {
  return WARM_UP_HAPPY_TO_ALTERNATE_LAYER_ID[layerId] ?? layerId
}

const FRONT_STAGE_TECH_ZOOM_ONLY = 'Zoom/Pencil'
const FRONT_STAGE_TECH_STEP = 'Zoom/Pencil\nPLUS App'
const FRONT_STAGE_TECH_PLUS_APP_ONLY = 'PLUS App'
const SUPPORT_STEP = 'Dev Team\nDesign Team'
const WARM_UP_ZOOM_PENCIL_DESCRIPTION =
  'The tutor connects with student via Zoom/Pencil in individual breakout room.'
const WARM_UP_ZOOM_PENCIL_SHARE_SCREEN_DESCRIPTION =
  'The student shares screen via Zoom/Pencil screen share feature.'
const WARM_UP_ZOOM_PENCIL_LEAVE_BREAKOUT_DESCRIPTION =
  "The tutor leaves the student's Zoom/Pencil breakout room."

const warmUpPartnerLeadOptions = {
  cellId: (stepSlot: string, layerSuffix: '01' | '02') =>
    `a0000000-0000-4000-8000-00000004${stepSlot}${layerSuffix}`,
  triggerId: (slot: string) =>
    `a0000000-0000-4000-8000-00000005${slot}`,
  partnerLayerId: L.partner,
  leadLayerId: L.lead,
  stepIdForColumn: (column: number) => STEPS[column - 1]!.id,
  leadStepPictures: GOAL_SETTING_PARALLEL_LEAD_STEP_PICTURES,
  partnerStepPictures: GOAL_SETTING_PARALLEL_PARTNER_STEP_PICTURES,
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
          WARM_UP_REGULAR_TUTOR_ONBOARDING_LINKS,
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

function warmUpFrontStageTechCell(
  id: string,
  stepId: string,
  content: string,
  metadata: Partial<
    Pick<BlueprintCell, 'description' | 'links'>
  > = {},
): BlueprintCell {
  return cell(
    id,
    L.frontTech,
    stepId,
    content,
    {
      ...(content.includes('Zoom/Pencil') ? { picture: ZOOM_TECH_LOGO } : {}),
      ...metadata,
    },
  )
}

const WARM_UP_RT_TO_FRONT_TECH_STEP_SLOTS = [
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
] as const

const WARM_UP_ALTERNATE_RT_TO_FRONT_TECH_STEP_SLOTS = [
  '01',
  '02',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
] as const

function buildRegularTutorToFrontStageTechTriggers(
  cellPrefix: '04' | '06',
  triggerPrefix: '05' | '07',
  idStart: number,
  stepSlots: readonly string[],
): BlueprintCellTrigger[] {
  return stepSlots.map((step, index) => {
    const triggerSlot = String(idStart + index).padStart(4, '0')
    return {
      id: `a0000000-0000-4000-8000-000000${triggerPrefix}${triggerSlot}`,
      source_cell_id: `a0000000-0000-4000-8000-000000${cellPrefix}${step}03`,
      target_cell_id: `a0000000-0000-4000-8000-000000${cellPrefix}${step}06`,
    }
  })
}

const WARM_UP_RT_TO_FRONT_TECH_TRIGGERS =
  buildRegularTutorToFrontStageTechTriggers(
    '04',
    '05',
    113,
    WARM_UP_RT_TO_FRONT_TECH_STEP_SLOTS,
  )

const WARM_UP_ALTERNATE_RT_TO_FRONT_TECH_TRIGGERS =
  buildRegularTutorToFrontStageTechTriggers(
    '06',
    '07',
    113,
    WARM_UP_ALTERNATE_RT_TO_FRONT_TECH_STEP_SLOTS,
  )

const WARM_UP_CELLS: BlueprintCell[] = [
  ...STEPS.map((step, stepIndex) =>
    cell(stepVisualCellId(stepIndex), L.stepVisual, step.id, ''),
  ),
  ...buildParallelSessionPartnerLeadCells(warmUpPartnerLeadOptions),
  cell('a0000000-0000-4000-8000-000000040103', L.regular, STEPS[0].id, 'Enter breakout room.', {
    picture: WARM_UP_REGULAR_TUTOR_STEP_01_PICTURE,
  }),
  warmUpFrontStageTechCell(
    'a0000000-0000-4000-8000-000000040106',
    STEPS[0].id,
    FRONT_STAGE_TECH_ZOOM_ONLY,
    { description: WARM_UP_ZOOM_PENCIL_DESCRIPTION },
  ),
  cell('a0000000-0000-4000-8000-000000040203', L.regular, STEPS[1].id, 'Greet student.', {
    picture: WARM_UP_REGULAR_TUTOR_STEP_02_PICTURE,
  }),
  warmUpFrontStageTechCell(
    'a0000000-0000-4000-8000-000000040206',
    STEPS[1].id,
    FRONT_STAGE_TECH_ZOOM_ONLY,
    { description: WARM_UP_ZOOM_PENCIL_DESCRIPTION },
  ),
  cell('a0000000-0000-4000-8000-000000040303', L.regular, STEPS[2].id, 'Ask them to share screen.', {
    picture: WARM_UP_REGULAR_TUTOR_STEP_03_PICTURE,
  }),
  warmUpFrontStageTechCell(
    'a0000000-0000-4000-8000-000000040306',
    STEPS[2].id,
    FRONT_STAGE_TECH_ZOOM_ONLY,
    { description: WARM_UP_ZOOM_PENCIL_SHARE_SCREEN_DESCRIPTION },
  ),
  cell(
    'a0000000-0000-4000-8000-000000040403',
    L.regular,
    STEPS[3].id,
    'Remind them that they can ask for help on content and support.',
    { picture: WARM_UP_REGULAR_TUTOR_STEP_04_PICTURE },
  ),
  warmUpFrontStageTechCell(
    'a0000000-0000-4000-8000-000000040406',
    STEPS[3].id,
    FRONT_STAGE_TECH_ZOOM_ONLY,
    { description: WARM_UP_ZOOM_PENCIL_DESCRIPTION },
  ),
  cell('a0000000-0000-4000-8000-000000040503', L.regular, STEPS[4].id, 'Mark them as present.', {
    picture: WARM_UP_REGULAR_TUTOR_STEP_05_PICTURE,
  }),
  warmUpFrontStageTechCell(
    'a0000000-0000-4000-8000-000000040506',
    STEPS[4].id,
    FRONT_STAGE_TECH_STEP,
    {
      description: WARM_UP_ZOOM_PENCIL_DESCRIPTION,
      links: [
        techDescriptionLink(
          'PLUS App',
          WARM_UP_PLUS_APP_STEP_05_DESCRIPTION,
          WARM_UP_PLUS_APP_STEP_05_PICTURE,
          WARM_UP_PLUS_APP_STEP_05_FIGMA_URL,
        ),
      ],
    },
  ),
  cell('a0000000-0000-4000-8000-000000040509', L.support, STEPS[4].id, SUPPORT_STEP, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell('a0000000-0000-4000-8000-000000040603', L.regular, STEPS[5].id, 'Select engagement level.', {
    picture: WARM_UP_REGULAR_TUTOR_STEP_06_PICTURE,
  }),
  warmUpFrontStageTechCell(
    'a0000000-0000-4000-8000-000000040606',
    STEPS[5].id,
    FRONT_STAGE_TECH_STEP,
    {
      description: WARM_UP_ZOOM_PENCIL_DESCRIPTION,
      links: [
        techDescriptionLink(
          'PLUS App',
          WARM_UP_PLUS_APP_STEP_06_DESCRIPTION,
          WARM_UP_PLUS_APP_STEPS_6_7_9_PICTURE,
          WARM_UP_PLUS_APP_STEPS_6_7_9_FIGMA_URL,
        ),
      ],
    },
  ),
  cell('a0000000-0000-4000-8000-000000040609', L.support, STEPS[5].id, SUPPORT_STEP, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell('a0000000-0000-4000-8000-000000040703', L.regular, STEPS[6].id, 'Mark them as helped.', {
    picture: WARM_UP_REGULAR_TUTOR_STEP_07_PICTURE,
  }),
  warmUpFrontStageTechCell(
    'a0000000-0000-4000-8000-000000040706',
    STEPS[6].id,
    FRONT_STAGE_TECH_STEP,
    {
      description: WARM_UP_ZOOM_PENCIL_DESCRIPTION,
      links: [
        techDescriptionLink(
          'PLUS App',
          WARM_UP_PLUS_APP_STEP_07_DESCRIPTION,
          WARM_UP_PLUS_APP_STEPS_6_7_9_PICTURE,
          WARM_UP_PLUS_APP_STEPS_6_7_9_FIGMA_URL,
        ),
      ],
    },
  ),
  cell('a0000000-0000-4000-8000-000000040709', L.support, STEPS[6].id, SUPPORT_STEP, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
  cell('a0000000-0000-4000-8000-000000040803', L.regular, STEPS[7].id, 'Leave breakout room.', {
    picture: WARM_UP_REGULAR_TUTOR_STEP_08_PICTURE,
  }),
  warmUpFrontStageTechCell(
    'a0000000-0000-4000-8000-000000040806',
    STEPS[7].id,
    FRONT_STAGE_TECH_ZOOM_ONLY,
    { description: WARM_UP_ZOOM_PENCIL_LEAVE_BREAKOUT_DESCRIPTION },
  ),
  cell(
    'a0000000-0000-4000-8000-000000040903',
    L.regular,
    STEPS[8].id,
    'Move on to the next student in sorted order set by researchers.',
    { picture: WARM_UP_REGULAR_TUTOR_STEP_09_PICTURE },
  ),
  cell(
    'a0000000-0000-4000-8000-000000040906',
    L.frontTech,
    STEPS[8].id,
    FRONT_STAGE_TECH_PLUS_APP_ONLY,
    {
      links: [
        techDescriptionLink(
          'PLUS App',
          WARM_UP_PLUS_APP_STEP_09_DESCRIPTION,
          WARM_UP_PLUS_APP_STEPS_6_7_9_PICTURE,
          WARM_UP_PLUS_APP_STEPS_6_7_9_FIGMA_URL,
        ),
      ],
    },
  ),
  cell('a0000000-0000-4000-8000-000000040909', L.support, STEPS[8].id, SUPPORT_STEP, {
    description: GOAL_SETTING_SUPPORT_ACTIONS_DESCRIPTION,
  }),
]

const WARM_UP_TRIGGERS: BlueprintCellTrigger[] = [
  ...buildParallelSessionPartnerLeadTriggers(warmUpPartnerLeadOptions),
  {
    id: 'a0000000-0000-4000-8000-000000050101',
    source_cell_id: 'a0000000-0000-4000-8000-000000040103',
    target_cell_id: 'a0000000-0000-4000-8000-000000040203',
  },
  {
    id: 'a0000000-0000-4000-8000-000000050102',
    source_cell_id: 'a0000000-0000-4000-8000-000000040203',
    target_cell_id: 'a0000000-0000-4000-8000-000000040303',
  },
  {
    id: 'a0000000-0000-4000-8000-000000050103',
    source_cell_id: 'a0000000-0000-4000-8000-000000040303',
    target_cell_id: 'a0000000-0000-4000-8000-000000040403',
  },
  {
    id: 'a0000000-0000-4000-8000-000000050104',
    source_cell_id: 'a0000000-0000-4000-8000-000000040403',
    target_cell_id: 'a0000000-0000-4000-8000-000000040503',
  },
  {
    id: 'a0000000-0000-4000-8000-000000050105',
    source_cell_id: 'a0000000-0000-4000-8000-000000040503',
    target_cell_id: 'a0000000-0000-4000-8000-000000040603',
  },
  {
    id: 'a0000000-0000-4000-8000-000000050106',
    source_cell_id: 'a0000000-0000-4000-8000-000000040603',
    target_cell_id: 'a0000000-0000-4000-8000-000000040703',
  },
  {
    id: 'a0000000-0000-4000-8000-000000050107',
    source_cell_id: 'a0000000-0000-4000-8000-000000040703',
    target_cell_id: 'a0000000-0000-4000-8000-000000040803',
  },
  {
    id: 'a0000000-0000-4000-8000-000000050108',
    source_cell_id: 'a0000000-0000-4000-8000-000000040803',
    target_cell_id: 'a0000000-0000-4000-8000-000000040903',
  },
  {
    id: 'a0000000-0000-4000-8000-000000050112',
    source_cell_id: 'a0000000-0000-4000-8000-000000040903',
    target_cell_id: 'a0000000-0000-4000-8000-000000040103',
  },
  ...WARM_UP_RT_TO_FRONT_TECH_TRIGGERS,
]

export const WARM_UP_HAPPY_PATH_FALLBACK: BlueprintData = {
  path: {
    id: PATH_ID,
    name: 'Happy Path',
    description:
      'Engaged or partially engaged student warm-up.',
    note: getScenarioParallelNote(WARM_UP_SCENARIO_ID),
    path_type: 'happy',
  },
  layers: [...LAYERS],
  steps: [...STEPS],
  cells: WARM_UP_CELLS,
  triggers: WARM_UP_TRIGGERS,
}

function mapHappyCellId(id: string): string {
  return id.replace('00000004', '00000006')
}

function mapHappyTriggerId(id: string): string {
  return id.replace('00000005', '00000007')
}

function isWarmUpPartnerOrLeadCell(cell: BlueprintCell): boolean {
  const suffix = cell.id.slice(-2)
  return suffix === '01' || suffix === '02'
}

const WARM_UP_ALTERNATE_STEPS = STEPS.filter(
  (step) => step.id !== WARM_UP_STEP_3_ID,
).map((step, index) => ({
  ...step,
  column_position: index + 1,
}))

const warmUpAlternatePartnerLeadOptions = {
  cellId: (stepSlot: string, layerSuffix: '01' | '02') =>
    `a0000000-0000-4000-8000-00000006${stepSlot}${layerSuffix}`,
  triggerId: (slot: string) => `a0000000-0000-4000-8000-00000007${slot}`,
  partnerLayerId: mapAlternatePathLayerId(L.partner),
  leadLayerId: mapAlternatePathLayerId(L.lead),
  stepIdForColumn: (column: number) => WARM_UP_ALTERNATE_STEPS[column - 1]!.id,
  leadStepPictures: GOAL_SETTING_PARALLEL_LEAD_STEP_PICTURES,
  partnerStepPictures: GOAL_SETTING_PARALLEL_PARTNER_STEP_PICTURES,
}

function buildWarmUpAlternatePathCells(): BlueprintCell[] {
  const nonPartnerLeadCells = WARM_UP_CELLS.filter(
    (cell) =>
      !isWarmUpPartnerOrLeadCell(cell) &&
      cell.step_id !== WARM_UP_STEP_3_ID,
  ).map((cell) => ({
    ...cell,
    id: mapHappyCellId(cell.id),
    layer_id: mapAlternatePathLayerId(cell.layer_id),
  }))

  return [
    ...nonPartnerLeadCells.map(assignWarmUpAlternateCellLayerId),
    ...buildParallelSessionPartnerLeadCells(
      warmUpAlternatePartnerLeadOptions,
    ).map(assignWarmUpAlternateCellLayerId),
  ]
}

const WARM_UP_ALTERNATE_REGULAR_TUTOR_TRIGGER_IDS = new Set([
  'a0000000-0000-4000-8000-000000050101',
  'a0000000-0000-4000-8000-000000050102',
  'a0000000-0000-4000-8000-000000050103',
  'a0000000-0000-4000-8000-000000050104',
  'a0000000-0000-4000-8000-000000050105',
  'a0000000-0000-4000-8000-000000050106',
  'a0000000-0000-4000-8000-000000050107',
  'a0000000-0000-4000-8000-000000050108',
  'a0000000-0000-4000-8000-000000050112',
])

function buildWarmUpAlternatePathTriggers(): BlueprintCellTrigger[] {
  const regularTutorTriggers = WARM_UP_TRIGGERS.filter(
    (trigger) =>
      WARM_UP_ALTERNATE_REGULAR_TUTOR_TRIGGER_IDS.has(trigger.id) &&
      trigger.id !== 'a0000000-0000-4000-8000-000000050102' &&
      trigger.id !== 'a0000000-0000-4000-8000-000000050103',
  ).map((trigger) => ({
    id: mapHappyTriggerId(trigger.id),
    source_cell_id: mapHappyCellId(trigger.source_cell_id),
    target_cell_id: mapHappyCellId(trigger.target_cell_id),
  }))

  return [
    ...buildParallelSessionPartnerLeadTriggers(warmUpAlternatePartnerLeadOptions),
    ...regularTutorTriggers,
    {
      id: 'a0000000-0000-4000-8000-000000070102',
      source_cell_id: 'a0000000-0000-4000-8000-000000060203',
      target_cell_id: 'a0000000-0000-4000-8000-000000060403',
    },
    ...WARM_UP_ALTERNATE_RT_TO_FRONT_TECH_TRIGGERS,
  ]
}

const WARM_UP_ALTERNATE_TRIGGERS: BlueprintCellTrigger[] =
  buildWarmUpAlternatePathTriggers()

export const WARM_UP_ALTERNATE_PATH_FALLBACK: BlueprintData = {
  path: {
    id: WARM_UP_ALTERNATE_PATH_ID,
    name: 'Alternate Path',
    description: 'Not engaged student warm-up.',
    note: getScenarioParallelNote(WARM_UP_SCENARIO_ID),
    path_type: 'alternative',
  },
  layers: LAYERS.map((layer) => ({
    ...layer,
    id: mapAlternatePathLayerId(layer.id),
  })),
  steps: WARM_UP_ALTERNATE_STEPS,
  cells: buildWarmUpAlternatePathCells(),
  triggers: WARM_UP_ALTERNATE_TRIGGERS,
}

const FALLBACK_BY_PATH: Record<string, BlueprintData> = {
  [WARM_UP_HAPPY_PATH_ID]: WARM_UP_HAPPY_PATH_FALLBACK,
  [WARM_UP_ALTERNATE_PATH_ID]: WARM_UP_ALTERNATE_PATH_FALLBACK,
  [APPLICATION_HAPPY_PATH_ID]: APPLICATION_HAPPY_PATH_FALLBACK,
  [APPLICATION_SAD_PATH_ID]: APPLICATION_SAD_PATH_FALLBACK,
  [APPLICATION_INTERVIEW_HAPPY_PATH_ID]: APPLICATION_INTERVIEW_HAPPY_PATH_FALLBACK,
  [TECH_SETUP_HAPPY_PATH_ID]: TECH_SETUP_HAPPY_PATH_FALLBACK,
  [ONBOARDING_MODULES_HAPPY_PATH_ID]: ONBOARDING_MODULES_HAPPY_PATH_FALLBACK,
  [LESSON_MODULES_HAPPY_PATH_ID]: LESSON_MODULES_HAPPY_PATH_FALLBACK,
  [SESSION_SIGN_UP_HAPPY_PATH_ID]: SESSION_SIGN_UP_HAPPY_PATH_FALLBACK,
  [STANDARD_SCHEDULING_HAPPY_PATH_ID]: STANDARD_SCHEDULING_HAPPY_PATH_FALLBACK,
  [FILL_IN_REQUEST_HAPPY_PATH_ID]: FILL_IN_REQUEST_HAPPY_PATH_FALLBACK,
  [CALL_OFF_REQUEST_HAPPY_PATH_ID]: CALL_OFF_REQUEST_HAPPY_PATH_FALLBACK,
  [BEFORE_STUDENTS_JOIN_HAPPY_PATH_ID]: BEFORE_STUDENTS_JOIN_HAPPY_PATH_FALLBACK,
  [STUDENTS_JUST_JOINED_HAPPY_PATH_ID]: STUDENTS_JUST_JOINED_HAPPY_PATH_FALLBACK,
  [GOAL_SETTING_HAPPY_PATH_ID]: GOAL_SETTING_HAPPY_PATH_FALLBACK,
  [GOAL_SETTING_DETAILED_PATH_ID]: GOAL_SETTING_DETAILED_PATH_FALLBACK,
  [GOAL_SETTING_CHECK_GOALS_PATH_ID]: GOAL_SETTING_CHECK_GOALS_PATH_FALLBACK,
  [GOAL_SETTING_UPDATE_GOALS_PATH_ID]: GOAL_SETTING_UPDATE_GOALS_PATH_FALLBACK,
  [GOAL_SETTING_SET_GOALS_EDGE_CASE_PATH_ID]:
    GOAL_SETTING_SET_GOALS_EDGE_CASE_PATH_FALLBACK,
  [GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_PATH_ID]:
    GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_PATH_FALLBACK,
  [HELP_REQUEST_HAPPY_PATH_ID]: HELP_REQUEST_HAPPY_PATH_FALLBACK,
  [WRAP_UP_HAPPY_PATH_ID]: WRAP_UP_HAPPY_PATH_FALLBACK,
  [REPORTING_AN_ISSUE_HAPPY_PATH_ID]: REPORTING_AN_ISSUE_HAPPY_PATH_FALLBACK,
  [REPORTING_HOURS_HAPPY_PATH_ID]: REPORTING_HOURS_HAPPY_PATH_FALLBACK,
  // Scale-test fixture (Phase 0-G) — template scrub may strip.
  [SCALE_TEST_HAPPY_PATH_ID]: SCALE_TEST_HAPPY_PATH_FALLBACK,
  [SCALE_TEST_ALTERNATIVE_PATH_ID]: SCALE_TEST_ALTERNATIVE_PATH_FALLBACK,
  [SCALE_TEST_EXCEPTION_PATH_ID]: SCALE_TEST_EXCEPTION_PATH_FALLBACK,
}

const FALLBACK_PATHS_BY_SCENARIO: Record<
  string,
  Array<{
    id: string
    name: string
    description: string | null
    note: string | null
    path_type: BlueprintData['path']['path_type']
  }>
> = {
  [WARM_UP_SCENARIO_ID]: [
    {
      id: WARM_UP_HAPPY_PATH_FALLBACK.path.id,
      name: WARM_UP_HAPPY_PATH_FALLBACK.path.name,
      description: WARM_UP_HAPPY_PATH_FALLBACK.path.description,
      note: WARM_UP_HAPPY_PATH_FALLBACK.path.note,
      path_type: WARM_UP_HAPPY_PATH_FALLBACK.path.path_type,
    },
    {
      id: WARM_UP_ALTERNATE_PATH_FALLBACK.path.id,
      name: WARM_UP_ALTERNATE_PATH_FALLBACK.path.name,
      description: WARM_UP_ALTERNATE_PATH_FALLBACK.path.description,
      note: WARM_UP_ALTERNATE_PATH_FALLBACK.path.note,
      path_type: WARM_UP_ALTERNATE_PATH_FALLBACK.path.path_type,
    },
  ],
  [DISCOVERY_SCENARIO_ID]: [
    {
      id: APPLICATION_HAPPY_PATH_FALLBACK.path.id,
      name: APPLICATION_HAPPY_PATH_FALLBACK.path.name,
      description: APPLICATION_HAPPY_PATH_FALLBACK.path.description,
      note: APPLICATION_HAPPY_PATH_FALLBACK.path.note,
      path_type: APPLICATION_HAPPY_PATH_FALLBACK.path.path_type,
    },
  ],
  [INTERVIEW_SCENARIO_ID]: [
    {
      id: APPLICATION_INTERVIEW_HAPPY_PATH_FALLBACK.path.id,
      name: APPLICATION_INTERVIEW_HAPPY_PATH_FALLBACK.path.name,
      description: APPLICATION_INTERVIEW_HAPPY_PATH_FALLBACK.path.description,
      note: APPLICATION_INTERVIEW_HAPPY_PATH_FALLBACK.path.note,
      path_type: APPLICATION_INTERVIEW_HAPPY_PATH_FALLBACK.path.path_type,
    },
  ],
  [TECH_SETUP_SCENARIO_ID]: [
    {
      id: TECH_SETUP_HAPPY_PATH_FALLBACK.path.id,
      name: TECH_SETUP_HAPPY_PATH_FALLBACK.path.name,
      description: TECH_SETUP_HAPPY_PATH_FALLBACK.path.description,
      note: TECH_SETUP_HAPPY_PATH_FALLBACK.path.note,
      path_type: TECH_SETUP_HAPPY_PATH_FALLBACK.path.path_type,
    },
  ],
  [ONBOARDING_MODULES_SCENARIO_ID]: [
    {
      id: ONBOARDING_MODULES_HAPPY_PATH_FALLBACK.path.id,
      name: ONBOARDING_MODULES_HAPPY_PATH_FALLBACK.path.name,
      description: ONBOARDING_MODULES_HAPPY_PATH_FALLBACK.path.description,
      note: ONBOARDING_MODULES_HAPPY_PATH_FALLBACK.path.note,
      path_type: ONBOARDING_MODULES_HAPPY_PATH_FALLBACK.path.path_type,
    },
  ],
  [LESSON_MODULES_SCENARIO_ID]: [
    {
      id: LESSON_MODULES_HAPPY_PATH_FALLBACK.path.id,
      name: LESSON_MODULES_HAPPY_PATH_FALLBACK.path.name,
      description: LESSON_MODULES_HAPPY_PATH_FALLBACK.path.description,
      note: LESSON_MODULES_HAPPY_PATH_FALLBACK.path.note,
      path_type: LESSON_MODULES_HAPPY_PATH_FALLBACK.path.path_type,
    },
  ],
  [SESSION_SIGN_UP_SCENARIO_ID]: [
    {
      id: SESSION_SIGN_UP_HAPPY_PATH_FALLBACK.path.id,
      name: SESSION_SIGN_UP_HAPPY_PATH_FALLBACK.path.name,
      description: SESSION_SIGN_UP_HAPPY_PATH_FALLBACK.path.description,
      note: SESSION_SIGN_UP_HAPPY_PATH_FALLBACK.path.note,
      path_type: SESSION_SIGN_UP_HAPPY_PATH_FALLBACK.path.path_type,
    },
  ],
  [STANDARD_SCHEDULING_SCENARIO_ID]: [
    {
      id: STANDARD_SCHEDULING_HAPPY_PATH_FALLBACK.path.id,
      name: STANDARD_SCHEDULING_HAPPY_PATH_FALLBACK.path.name,
      description: STANDARD_SCHEDULING_HAPPY_PATH_FALLBACK.path.description,
      note: STANDARD_SCHEDULING_HAPPY_PATH_FALLBACK.path.note,
      path_type: STANDARD_SCHEDULING_HAPPY_PATH_FALLBACK.path.path_type,
    },
  ],
  [FILL_IN_REQUEST_SCENARIO_ID]: [
    {
      id: FILL_IN_REQUEST_HAPPY_PATH_FALLBACK.path.id,
      name: FILL_IN_REQUEST_HAPPY_PATH_FALLBACK.path.name,
      description: FILL_IN_REQUEST_HAPPY_PATH_FALLBACK.path.description,
      note: FILL_IN_REQUEST_HAPPY_PATH_FALLBACK.path.note,
      path_type: FILL_IN_REQUEST_HAPPY_PATH_FALLBACK.path.path_type,
    },
  ],
  [CALL_OFF_REQUEST_SCENARIO_ID]: [
    {
      id: CALL_OFF_REQUEST_HAPPY_PATH_FALLBACK.path.id,
      name: CALL_OFF_REQUEST_HAPPY_PATH_FALLBACK.path.name,
      description: CALL_OFF_REQUEST_HAPPY_PATH_FALLBACK.path.description,
      note: CALL_OFF_REQUEST_HAPPY_PATH_FALLBACK.path.note,
      path_type: CALL_OFF_REQUEST_HAPPY_PATH_FALLBACK.path.path_type,
    },
  ],
  [BEFORE_STUDENTS_JOIN_SCENARIO_ID]: [
    {
      id: BEFORE_STUDENTS_JOIN_HAPPY_PATH_FALLBACK.path.id,
      name: BEFORE_STUDENTS_JOIN_HAPPY_PATH_FALLBACK.path.name,
      description: BEFORE_STUDENTS_JOIN_HAPPY_PATH_FALLBACK.path.description,
      note: BEFORE_STUDENTS_JOIN_HAPPY_PATH_FALLBACK.path.note,
      path_type: BEFORE_STUDENTS_JOIN_HAPPY_PATH_FALLBACK.path.path_type,
    },
  ],
  [STUDENTS_JUST_JOINED_SCENARIO_ID]: [
    {
      id: STUDENTS_JUST_JOINED_HAPPY_PATH_FALLBACK.path.id,
      name: STUDENTS_JUST_JOINED_HAPPY_PATH_FALLBACK.path.name,
      description: STUDENTS_JUST_JOINED_HAPPY_PATH_FALLBACK.path.description,
      note: STUDENTS_JUST_JOINED_HAPPY_PATH_FALLBACK.path.note,
      path_type: STUDENTS_JUST_JOINED_HAPPY_PATH_FALLBACK.path.path_type,
    },
  ],
  [GOAL_SETTING_SCENARIO_ID]: [
    {
      id: GOAL_SETTING_HAPPY_PATH_FALLBACK.path.id,
      name: GOAL_SETTING_HAPPY_PATH_FALLBACK.path.name,
      description: GOAL_SETTING_HAPPY_PATH_FALLBACK.path.description,
      note: GOAL_SETTING_HAPPY_PATH_FALLBACK.path.note,
      path_type: GOAL_SETTING_HAPPY_PATH_FALLBACK.path.path_type,
    },
    {
      id: GOAL_SETTING_DETAILED_PATH_FALLBACK.path.id,
      name: GOAL_SETTING_DETAILED_PATH_FALLBACK.path.name,
      description: GOAL_SETTING_DETAILED_PATH_FALLBACK.path.description,
      note: GOAL_SETTING_DETAILED_PATH_FALLBACK.path.note,
      path_type: GOAL_SETTING_DETAILED_PATH_FALLBACK.path.path_type,
    },
    {
      id: GOAL_SETTING_CHECK_GOALS_PATH_FALLBACK.path.id,
      name: GOAL_SETTING_CHECK_GOALS_PATH_FALLBACK.path.name,
      description: GOAL_SETTING_CHECK_GOALS_PATH_FALLBACK.path.description,
      note: GOAL_SETTING_CHECK_GOALS_PATH_FALLBACK.path.note,
      path_type: GOAL_SETTING_CHECK_GOALS_PATH_FALLBACK.path.path_type,
    },
    {
      id: GOAL_SETTING_UPDATE_GOALS_PATH_FALLBACK.path.id,
      name: GOAL_SETTING_UPDATE_GOALS_PATH_FALLBACK.path.name,
      description: GOAL_SETTING_UPDATE_GOALS_PATH_FALLBACK.path.description,
      note: GOAL_SETTING_UPDATE_GOALS_PATH_FALLBACK.path.note,
      path_type: GOAL_SETTING_UPDATE_GOALS_PATH_FALLBACK.path.path_type,
    },
    {
      id: GOAL_SETTING_SET_GOALS_EDGE_CASE_PATH_FALLBACK.path.id,
      name: GOAL_SETTING_SET_GOALS_EDGE_CASE_PATH_FALLBACK.path.name,
      description:
        GOAL_SETTING_SET_GOALS_EDGE_CASE_PATH_FALLBACK.path.description,
      note: GOAL_SETTING_SET_GOALS_EDGE_CASE_PATH_FALLBACK.path.note,
      path_type: GOAL_SETTING_SET_GOALS_EDGE_CASE_PATH_FALLBACK.path.path_type,
    },
    {
      id: GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_PATH_FALLBACK.path.id,
      name: GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_PATH_FALLBACK.path.name,
      description:
        GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_PATH_FALLBACK.path.description,
      note: GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_PATH_FALLBACK.path.note,
      path_type:
        GOAL_SETTING_UPDATED_GOALS_EDGE_CASE_PATH_FALLBACK.path.path_type,
    },
  ],
  [HELP_REQUEST_SCENARIO_ID]: [
    {
      id: HELP_REQUEST_HAPPY_PATH_FALLBACK.path.id,
      name: HELP_REQUEST_HAPPY_PATH_FALLBACK.path.name,
      description: HELP_REQUEST_HAPPY_PATH_FALLBACK.path.description,
      note: HELP_REQUEST_HAPPY_PATH_FALLBACK.path.note,
      path_type: HELP_REQUEST_HAPPY_PATH_FALLBACK.path.path_type,
    },
  ],
  [WRAP_UP_SCENARIO_ID]: [
    {
      id: WRAP_UP_HAPPY_PATH_FALLBACK.path.id,
      name: WRAP_UP_HAPPY_PATH_FALLBACK.path.name,
      description: WRAP_UP_HAPPY_PATH_FALLBACK.path.description,
      note: WRAP_UP_HAPPY_PATH_FALLBACK.path.note,
      path_type: WRAP_UP_HAPPY_PATH_FALLBACK.path.path_type,
    },
  ],
  [REPORTING_AN_ISSUE_SCENARIO_ID]: [
    {
      id: REPORTING_AN_ISSUE_HAPPY_PATH_FALLBACK.path.id,
      name: REPORTING_AN_ISSUE_HAPPY_PATH_FALLBACK.path.name,
      description: REPORTING_AN_ISSUE_HAPPY_PATH_FALLBACK.path.description,
      note: REPORTING_AN_ISSUE_HAPPY_PATH_FALLBACK.path.note,
      path_type: REPORTING_AN_ISSUE_HAPPY_PATH_FALLBACK.path.path_type,
    },
  ],
  [REPORTING_HOURS_SCENARIO_ID]: [
    {
      id: REPORTING_HOURS_HAPPY_PATH_FALLBACK.path.id,
      name: REPORTING_HOURS_HAPPY_PATH_FALLBACK.path.name,
      description: REPORTING_HOURS_HAPPY_PATH_FALLBACK.path.description,
      note: REPORTING_HOURS_HAPPY_PATH_FALLBACK.path.note,
      path_type: REPORTING_HOURS_HAPPY_PATH_FALLBACK.path.path_type,
    },
  ],
  // Scale-test fixture (Phase 0-G) — template scrub may strip.
  [SCALE_TEST_SCENARIO_ID]: SCALE_TEST_PATH_FALLBACKS.map((fallback) => ({
    id: fallback.path.id,
    name: fallback.path.name,
    description: fallback.path.description,
    note: fallback.path.note,
    path_type: fallback.path.path_type,
  })),
}

const FALLBACK_BY_SCENARIO: Record<string, BlueprintData> = {
  [WARM_UP_SCENARIO_ID]: WARM_UP_HAPPY_PATH_FALLBACK,
  [DISCOVERY_SCENARIO_ID]: APPLICATION_HAPPY_PATH_FALLBACK,
  [INTERVIEW_SCENARIO_ID]: APPLICATION_INTERVIEW_HAPPY_PATH_FALLBACK,
  [TECH_SETUP_SCENARIO_ID]: TECH_SETUP_HAPPY_PATH_FALLBACK,
  [ONBOARDING_MODULES_SCENARIO_ID]: ONBOARDING_MODULES_HAPPY_PATH_FALLBACK,
  [LESSON_MODULES_SCENARIO_ID]: LESSON_MODULES_HAPPY_PATH_FALLBACK,
  [SESSION_SIGN_UP_SCENARIO_ID]: SESSION_SIGN_UP_HAPPY_PATH_FALLBACK,
  // Scale-test fixture (Phase 0-G) — template scrub may strip.
  [SCALE_TEST_SCENARIO_ID]: SCALE_TEST_HAPPY_PATH_FALLBACK,
}

const EMPTY_FALLBACK_PATHS: Array<{
  id: string
  name: string
  description: string | null
  note: string | null
  path_type: BlueprintData['path']['path_type']
}> = []

export function hasBlueprintFallback(scenarioId: string | undefined): boolean {
  if (!scenarioId) return false
  return (
    scenarioId in FALLBACK_BY_SCENARIO ||
    scenarioId in FALLBACK_PATHS_BY_SCENARIO
  )
}

/** Paths hidden from pickers/grids until the scenario is ready in the UI. */
const UI_HIDDEN_PATH_IDS_BY_SCENARIO: Record<string, readonly string[]> = {
  [DISCOVERY_SCENARIO_ID]: [APPLICATION_SAD_PATH_ID],
  [WARM_UP_SCENARIO_ID]: [WARM_UP_SAD_PATH_ID],
}

export function filterPathsForScenarioUi<T extends { id: string }>(
  scenarioId: string | undefined,
  paths: readonly T[],
): T[] {
  if (!scenarioId) return [...paths]
  const hidden = UI_HIDDEN_PATH_IDS_BY_SCENARIO[scenarioId]
  if (!hidden?.length) return [...paths]
  const hiddenIds = new Set(hidden)
  return paths.filter((path) => !hiddenIds.has(path.id))
}

/** Union DB paths with registered fallback paths missing from the database. */
export function mergePathsWithFallback<
  T extends {
    id: string
    name: string
    description: string | null
    note: string | null
    path_type: BlueprintData['path']['path_type']
  },
>(scenarioId: string | undefined, paths: readonly T[]): T[] {
  const fallbackPaths = getFallbackPathsForScenario(scenarioId)
  if (!scenarioId || fallbackPaths.length === 0) {
    return filterPathsForScenarioUi(scenarioId, paths)
  }

  const merged = new Map(
    filterPathsForScenarioUi(scenarioId, paths).map((path) => [path.id, path]),
  )
  for (const fallbackPath of fallbackPaths) {
    const existing = merged.get(fallbackPath.id)
    if (existing) {
      merged.set(fallbackPath.id, {
        ...existing,
        name: fallbackPath.name,
        description: fallbackPath.description,
        note: fallbackPath.note ?? existing.note,
      })
    } else {
      const hasPathOfType = [...merged.values()].some(
        (path) => path.path_type === fallbackPath.path_type,
      )
      if (!hasPathOfType) {
        merged.set(fallbackPath.id, fallbackPath as T)
      }
    }
  }

  const order = fallbackPaths.map((path) => path.id)
  return [...merged.values()].sort((a, b) => {
    const aIndex = order.indexOf(a.id)
    const bIndex = order.indexOf(b.id)
    if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })
}

export function getFallbackPathsForScenario(
  scenarioId: string | undefined,
): Array<{
  id: string
  name: string
  description: string | null
  note: string | null
  path_type: BlueprintData['path']['path_type']
}> {
  if (!scenarioId) return EMPTY_FALLBACK_PATHS
  return filterPathsForScenarioUi(
    scenarioId,
    FALLBACK_PATHS_BY_SCENARIO[scenarioId] ?? EMPTY_FALLBACK_PATHS,
  )
}

function withPathIdentity(
  data: BlueprintData,
  path: {
    id: string
    name: string
    description?: string | null
    note?: string | null
    path_type: BlueprintData['path']['path_type']
  },
): BlueprintData {
  return {
    ...data,
    path: {
      ...data.path,
      id: path.id,
      name: path.name,
      description: path.description ?? data.path.description,
      note: path.note ?? data.path.note,
      path_type: path.path_type,
    },
  }
}

export function hasRegisteredPathFallback(
  pathId: string | undefined | null,
): boolean {
  return Boolean(pathId && pathId in FALLBACK_BY_PATH)
}

export function getRawBlueprintFallback(
  scenarioId: string | undefined,
  pathId?: string | null,
  pathType?: BlueprintData['path']['path_type'],
): BlueprintData | null {
  let data: BlueprintData | null = null
  if (pathId && FALLBACK_BY_PATH[pathId]) {
    data = FALLBACK_BY_PATH[pathId]
  } else if (scenarioId && pathType) {
    const match = (FALLBACK_PATHS_BY_SCENARIO[scenarioId] ?? []).find(
      (path) => path.path_type === pathType,
    )
    if (match) {
      data = FALLBACK_BY_PATH[match.id] ?? null
    }
  }

  if (!data && scenarioId) {
    data = FALLBACK_BY_SCENARIO[scenarioId] ?? null
  }

  if (!data) return null

  const identity =
    pathId && pathType
      ? { id: pathId, name: data.path.name, path_type: pathType }
      : null

  return identity ? withPathIdentity(data, identity) : data
}

export function getBlueprintFallback(
  scenarioId: string | undefined,
  pathId?: string | null,
  pathType?: BlueprintData['path']['path_type'],
): BlueprintData | null {
  const data = getRawBlueprintFallback(scenarioId, pathId, pathType)
  if (!data) return null

  const resolvedPathId = pathId ?? data.path.id
  const repaired =
    resolvedPathId === WARM_UP_ALTERNATE_PATH_ID
      ? repairWarmUpAlternatePathBlueprint(data)
      : data

  return applyBlueprintDisplayFilters(
    repaired,
    scenarioId,
    resolvedPathId,
  )
}

export function getFallbackBlueprintsForScenarios(
  scenarioIds: string[],
): Map<string, BlueprintData> {
  const map = new Map<string, BlueprintData>()
  for (const id of scenarioIds) {
    const data = getBlueprintFallback(id)
    if (data) map.set(id, data)
  }
  return map
}
