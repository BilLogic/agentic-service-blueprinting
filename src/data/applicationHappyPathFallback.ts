import { EMPTY_CELL_METADATA } from '@/lib/cellMetadata'
import {
  DISCOVERY_BRANDING_GUIDELINES_STEP_2_DESCRIPTION,
  DISCOVERY_BRANDING_GUIDELINES_STEP_3_DESCRIPTION,
  DISCOVERY_DESIGN_SYSTEM_STEP_3_DESCRIPTION,
  DISCOVERY_DEV_TOOLS_STEP_3_DESCRIPTION,
  DISCOVERY_FIGMA_STEP_2_DESCRIPTION,
  DISCOVERY_FIGMA_STEP_3_DESCRIPTION,
  DISCOVERY_HANDSHAKE_EMPLOYER_PROFILE_STEP_5_DESCRIPTION,
  DISCOVERY_HANDSHAKE_STEP_5_DESCRIPTION,
  DISCOVERY_MARKETING_WEBSITE_DESCRIPTION,
  DISCOVERY_ON_CAMPUS_BOOTH_STEP_4_DESCRIPTION,
  DISCOVERY_POSTERS_STEP_4_DESCRIPTION,
  DISCOVERY_REGULAR_TUTOR_STEP_1_CONTENT,
  DISCOVERY_REGULAR_TUTOR_STEP_2_CONTENT,
  DISCOVERY_REGULAR_TUTOR_STEP_3_CONTENT,
  DISCOVERY_REGULAR_TUTOR_STEP_4_CONTENT,
  DISCOVERY_REGULAR_TUTOR_STEP_5_CONTENT,
  DISCOVERY_SOCIAL_MEDIA_STEP_2_DESCRIPTION,
} from '@/data/applicationDiscoveryDescriptions'
import {
  APPLICATION_DISCOVERY_REGULAR_TUTOR_PLACEHOLDER,
  DISCOVERY_REGULAR_TUTOR_STEP_1_PICTURE,
  DISCOVERY_REGULAR_TUTOR_STEP_2_PICTURE,
  DISCOVERY_REGULAR_TUTOR_STEP_3_PICTURE,
  DISCOVERY_REGULAR_TUTOR_STEP_4_PICTURE,
  DISCOVERY_REGULAR_TUTOR_STEP_5_PICTURE,
  DISCOVERY_REGULAR_TUTOR_STEP_6_PICTURE,
  DISCOVERY_HANDSHAKE_EMPLOYER_PROFILE_STEP_5_PICTURE,
  DISCOVERY_HANDSHAKE_STEP_5_PICTURE,
  DISCOVERY_MARKETING_WEBSITE_PICTURE,
  DISCOVERY_MARKETING_WEBSITE_URL,
  DISCOVERY_ON_CAMPUS_BOOTH_STEP_4_PICTURE,
  DISCOVERY_SOCIAL_MEDIA_STEP_2_PICTURE,
} from '@/data/applicationDiscoveryPictures'
import { techDescriptionLink, URL_LINK_TYPE } from '@/lib/blueprintTechDescriptions'
import { FIGMA_TECH_LOGO } from '@/lib/blueprintTechPictures'
import type {
  BlueprintCell,
  BlueprintCellTrigger,
  BlueprintData,
} from '@/types/blueprint'
import type { PathType } from '@/types/database'

/** Application phase → Discovery scenario (UI fallback until DB seed). */
export const APPLICATION_PHASE_ID = 'a0000000-0000-4000-8000-000000000101'
export const DISCOVERY_SCENARIO_ID = 'a0000000-0000-4000-8000-000000000121'
export const INTERVIEW_SCENARIO_ID = 'a0000000-0000-4000-8000-000000000122'
export const APPLICATION_HAPPY_PATH_ID = 'a0000000-0000-4000-8000-000000000700'
export const APPLICATION_SAD_PATH_ID = 'a0000000-0000-4000-8000-000000000701'

const DISCOVERY_SHARED_STEPS = [
  {
    id: 'a0000000-0000-4000-8000-000000000711',
    name: 'Discovers PLUS',
    column_position: 1,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000712',
    name: 'Discovers PLUS',
    column_position: 2,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000713',
    name: 'Discovers PLUS',
    column_position: 3,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000714',
    name: 'Discovers PLUS',
    column_position: 4,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000715',
    name: 'Discovers PLUS',
    column_position: 5,
  },
] as const

export const DISCOVERY_HAPPY_FINAL_STEP_ID =
  'a0000000-0000-4000-8000-000000000716'
export const DISCOVERY_SAD_FINAL_STEP_ID =
  'a0000000-0000-4000-8000-000000000717'

const DISCOVERY_HAPPY_FINAL_STEP = {
  id: DISCOVERY_HAPPY_FINAL_STEP_ID,
  name: 'Interested in joining PLUS',
  column_position: 6,
} as const

const DISCOVERY_SAD_FINAL_STEP = {
  id: DISCOVERY_SAD_FINAL_STEP_ID,
  name: 'Not interested in joining PLUS',
  column_position: 6,
} as const

function getDiscoveryPathSteps(config: ApplicationDiscoveryPathConfig) {
  const finalStep =
    config.pathType === 'happy'
      ? DISCOVERY_HAPPY_FINAL_STEP
      : DISCOVERY_SAD_FINAL_STEP
  return [...DISCOVERY_SHARED_STEPS, finalStep]
}

type ApplicationDiscoveryPathConfig = {
  pathId: string
  pathName: string
  pathDescription: string
  pathType: PathType
  cellSlotPrefix: '07' | '72'
  triggerSlotPrefix: '078' | '728'
  finalRegularTutorContent: string
  layerIds: {
    visual: string
    regular: string
    frontStage: string
    frontStageTech: string
    backStage: string
    backStageTech: string
    support: string
  }
}

const HAPPY_PATH_CONFIG: ApplicationDiscoveryPathConfig = {
  pathId: APPLICATION_HAPPY_PATH_ID,
  pathName: 'Happy Path',
  pathDescription: 'Potential tutors discover and want to join PLUS.',
  pathType: 'happy',
  cellSlotPrefix: '07',
  triggerSlotPrefix: '078',
  finalRegularTutorContent: 'Interested in joining PLUS.',
  layerIds: {
    visual: 'a0000000-0000-4000-8000-000000000710',
    regular: 'a0000000-0000-4000-8000-000000000703',
    frontStage: 'a0000000-0000-4000-8000-000000000704',
    frontStageTech: 'a0000000-0000-4000-8000-000000000706',
    backStage: 'a0000000-0000-4000-8000-000000000707',
    backStageTech: 'a0000000-0000-4000-8000-000000000708',
    support: 'a0000000-0000-4000-8000-000000000709',
  },
}

const SAD_PATH_CONFIG: ApplicationDiscoveryPathConfig = {
  pathId: APPLICATION_SAD_PATH_ID,
  pathName: 'Sad Path',
  pathDescription:
    'Potential tutors discover and are not interested in joining PLUS.',
  pathType: 'unhappy',
  cellSlotPrefix: '72',
  triggerSlotPrefix: '728',
  finalRegularTutorContent: 'Not interested in joining PLUS.',
  layerIds: {
    visual: 'a0000000-0000-4000-8000-000000000791',
    regular: 'a0000000-0000-4000-8000-000000000792',
    frontStage: 'a0000000-0000-4000-8000-000000000793',
    frontStageTech: 'a0000000-0000-4000-8000-000000000794',
    backStage: 'a0000000-0000-4000-8000-000000000795',
    backStageTech: 'a0000000-0000-4000-8000-000000000796',
    support: 'a0000000-0000-4000-8000-000000000797',
  },
}

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

const REGULAR_TUTOR_PLACEHOLDER = {
  picture: APPLICATION_DISCOVERY_REGULAR_TUTOR_PLACEHOLDER,
} as const

function appCell(
  config: ApplicationDiscoveryPathConfig,
  stepSlot: string,
  layerSuffix: string,
): string {
  return `a0000000-0000-4000-8000-000000${config.cellSlotPrefix}${stepSlot}${layerSuffix}`
}

function appTrigger(
  config: ApplicationDiscoveryPathConfig,
  triggerSlot: string,
): string {
  return `a0000000-0000-4000-8000-000000${config.triggerSlotPrefix}${triggerSlot}`
}

function buildApplicationDiscoveryFallback(
  config: ApplicationDiscoveryPathConfig,
): BlueprintData {
  const L = config.layerIds
  const steps = getDiscoveryPathSteps(config)
  const finalStep = steps[steps.length - 1]!

  const layers = [
    { id: L.visual, name: 'Visual', row_position: 0 },
    { id: L.regular, name: 'Regular Tutor', row_position: 1 },
    { id: L.frontStageTech, name: 'Front Stage Tech', row_position: 2 },
    { id: L.frontStage, name: 'Front Stage Actions', row_position: 3 },
    { id: L.backStageTech, name: 'Back Stage Tech', row_position: 4 },
    { id: L.backStage, name: 'Back Stage Actions', row_position: 5 },
    { id: L.support, name: 'Support Actions', row_position: 6 },
  ] as const

  const triggers: BlueprintCellTrigger[] = [
    {
      id: appTrigger(config, '001'),
      source_cell_id: appCell(config, '01', '04'),
      target_cell_id: appCell(config, '01', '03'),
    },
    {
      id: appTrigger(config, '002'),
      source_cell_id: appCell(config, '02', '07'),
      target_cell_id: appCell(config, '02', '08'),
    },
    {
      id: appTrigger(config, '016'),
      source_cell_id: appCell(config, '02', '08'),
      target_cell_id: appCell(config, '02', '06'),
    },
    {
      id: appTrigger(config, '004'),
      source_cell_id: appCell(config, '02', '06'),
      target_cell_id: appCell(config, '02', '03'),
    },
    {
      id: appTrigger(config, '003'),
      source_cell_id: appCell(config, '03', '07'),
      target_cell_id: appCell(config, '03', '08'),
    },
    {
      id: appTrigger(config, '017'),
      source_cell_id: appCell(config, '03', '08'),
      target_cell_id: appCell(config, '03', '06'),
    },
    {
      id: appTrigger(config, '005'),
      source_cell_id: appCell(config, '03', '06'),
      target_cell_id: appCell(config, '03', '03'),
    },
    {
      id: appTrigger(config, '006'),
      source_cell_id: appCell(config, '04', '04'),
      target_cell_id: appCell(config, '04', '03'),
    },
    {
      id: appTrigger(config, '007'),
      source_cell_id: appCell(config, '04', '04'),
      target_cell_id: appCell(config, '04', '06'),
    },
    {
      id: appTrigger(config, '018'),
      source_cell_id: appCell(config, '04', '06'),
      target_cell_id: appCell(config, '04', '03'),
    },
    {
      id: appTrigger(config, '008'),
      source_cell_id: appCell(config, '05', '06'),
      target_cell_id: appCell(config, '05', '03'),
    },
    {
      id: appTrigger(config, '009'),
      source_cell_id: appCell(config, '05', '07'),
      target_cell_id: appCell(config, '05', '08'),
    },
    {
      id: appTrigger(config, '010'),
      source_cell_id: appCell(config, '05', '08'),
      target_cell_id: appCell(config, '05', '06'),
    },
    {
      id: appTrigger(config, '011'),
      source_cell_id: appCell(config, '01', '03'),
      target_cell_id: appCell(config, '06', '03'),
    },
    {
      id: appTrigger(config, '012'),
      source_cell_id: appCell(config, '02', '03'),
      target_cell_id: appCell(config, '06', '03'),
    },
    {
      id: appTrigger(config, '013'),
      source_cell_id: appCell(config, '03', '03'),
      target_cell_id: appCell(config, '06', '03'),
    },
    {
      id: appTrigger(config, '014'),
      source_cell_id: appCell(config, '04', '03'),
      target_cell_id: appCell(config, '06', '03'),
    },
    {
      id: appTrigger(config, '015'),
      source_cell_id: appCell(config, '05', '03'),
      target_cell_id: appCell(config, '06', '03'),
    },
  ]

  const cells: BlueprintCell[] = [
    ...steps.map((step, stepIndex) =>
      cell(
        appCell(config, String(stepIndex + 1).padStart(2, '0'), '10'),
        L.visual,
        step.id,
        '',
      ),
    ),

    cell(
      appCell(config, '01', '03'),
      L.regular,
      steps[0]!.id,
      DISCOVERY_REGULAR_TUTOR_STEP_1_CONTENT,
      config.cellSlotPrefix === '07'
        ? { picture: DISCOVERY_REGULAR_TUTOR_STEP_1_PICTURE }
        : REGULAR_TUTOR_PLACEHOLDER,
    ),
    cell(
      appCell(config, '01', '04'),
      L.frontStage,
      steps[0]!.id,
      'Previous or current PLUS tutor might have informed about PLUS.',
    ),

    cell(
      appCell(config, '02', '03'),
      L.regular,
      steps[1]!.id,
      DISCOVERY_REGULAR_TUTOR_STEP_2_CONTENT,
      config.cellSlotPrefix === '07'
        ? { picture: DISCOVERY_REGULAR_TUTOR_STEP_2_PICTURE }
        : REGULAR_TUTOR_PLACEHOLDER,
    ),
    cell(appCell(config, '02', '06'), L.frontStageTech, steps[1]!.id, 'Social Media', {
      links: [
        techDescriptionLink(
          'Social Media',
          DISCOVERY_SOCIAL_MEDIA_STEP_2_DESCRIPTION,
          DISCOVERY_SOCIAL_MEDIA_STEP_2_PICTURE,
        ),
      ],
    }),
    cell(
      appCell(config, '02', '07'),
      L.backStage,
      steps[1]!.id,
      'Marketing team creates social media posts and manages social platforms.',
    ),
    cell(appCell(config, '02', '08'), L.backStageTech, steps[1]!.id, 'Figma', {
      links: [
        techDescriptionLink(
          'Figma',
          DISCOVERY_FIGMA_STEP_2_DESCRIPTION,
          FIGMA_TECH_LOGO,
        ),
      ],
    }),
    cell(appCell(config, '02', '09'), L.support, steps[1]!.id, 'Branding Guidelines', {
      links: [
        techDescriptionLink(
          'Branding Guidelines',
          DISCOVERY_BRANDING_GUIDELINES_STEP_2_DESCRIPTION,
        ),
      ],
    }),

    cell(
      appCell(config, '03', '03'),
      L.regular,
      steps[2]!.id,
      DISCOVERY_REGULAR_TUTOR_STEP_3_CONTENT,
      config.cellSlotPrefix === '07'
        ? { picture: DISCOVERY_REGULAR_TUTOR_STEP_3_PICTURE }
        : REGULAR_TUTOR_PLACEHOLDER,
    ),
    cell(
      appCell(config, '03', '06'),
      L.frontStageTech,
      steps[2]!.id,
      'Marketing Website',
      {
        links: [
          techDescriptionLink(
            'Marketing Website',
            DISCOVERY_MARKETING_WEBSITE_DESCRIPTION,
            DISCOVERY_MARKETING_WEBSITE_PICTURE,
          ),
          {
            type: URL_LINK_TYPE,
            label: 'Visit marketing website',
            url: DISCOVERY_MARKETING_WEBSITE_URL,
          },
        ],
      },
    ),
    cell(
      appCell(config, '03', '07'),
      L.backStage,
      steps[2]!.id,
      'Design team manages content and messaging on the website. Dev team implements website into code.',
    ),
    cell(
      appCell(config, '03', '08'),
      L.backStageTech,
      steps[2]!.id,
      'Figma\nDev Tools',
      {
        links: [
          techDescriptionLink(
            'Figma',
            DISCOVERY_FIGMA_STEP_3_DESCRIPTION,
            FIGMA_TECH_LOGO,
          ),
          techDescriptionLink(
            'Dev Tools',
            DISCOVERY_DEV_TOOLS_STEP_3_DESCRIPTION,
          ),
        ],
      },
    ),
    cell(
      appCell(config, '03', '09'),
      L.support,
      steps[2]!.id,
      'Branding Guidelines, Design System',
      {
        links: [
          techDescriptionLink(
            'Branding Guidelines',
            DISCOVERY_BRANDING_GUIDELINES_STEP_3_DESCRIPTION,
          ),
          techDescriptionLink(
            'Design System',
            DISCOVERY_DESIGN_SYSTEM_STEP_3_DESCRIPTION,
          ),
        ],
      },
    ),

    cell(
      appCell(config, '04', '03'),
      L.regular,
      steps[3]!.id,
      DISCOVERY_REGULAR_TUTOR_STEP_4_CONTENT,
      config.cellSlotPrefix === '07'
        ? { picture: DISCOVERY_REGULAR_TUTOR_STEP_4_PICTURE }
        : REGULAR_TUTOR_PLACEHOLDER,
    ),
    cell(
      appCell(config, '04', '04'),
      L.frontStage,
      steps[3]!.id,
      'Tutor supervisor team meets prospective tutors at on-campus job fair.',
    ),
    cell(
      appCell(config, '04', '06'),
      L.frontStageTech,
      steps[3]!.id,
      'Posters\nOn-campus booth',
      {
        links: [
          techDescriptionLink('Posters', DISCOVERY_POSTERS_STEP_4_DESCRIPTION),
          techDescriptionLink(
            'On-campus booth',
            DISCOVERY_ON_CAMPUS_BOOTH_STEP_4_DESCRIPTION,
            DISCOVERY_ON_CAMPUS_BOOTH_STEP_4_PICTURE,
          ),
        ],
      },
    ),

    cell(
      appCell(config, '05', '03'),
      L.regular,
      steps[4]!.id,
      DISCOVERY_REGULAR_TUTOR_STEP_5_CONTENT,
      config.cellSlotPrefix === '07'
        ? { picture: DISCOVERY_REGULAR_TUTOR_STEP_5_PICTURE }
        : REGULAR_TUTOR_PLACEHOLDER,
    ),
    cell(appCell(config, '05', '06'), L.frontStageTech, steps[4]!.id, 'Handshake', {
      links: [
        techDescriptionLink(
          'Handshake',
          DISCOVERY_HANDSHAKE_STEP_5_DESCRIPTION,
          DISCOVERY_HANDSHAKE_STEP_5_PICTURE,
        ),
      ],
    }),
    cell(
      appCell(config, '05', '07'),
      L.backStage,
      steps[4]!.id,
      'Tutor supervisor team posts job openings on Handshake.',
    ),
    cell(
      appCell(config, '05', '08'),
      L.backStageTech,
      steps[4]!.id,
      'Handshake Employer Profile',
      {
        links: [
          techDescriptionLink(
            'Handshake Employer Profile',
            DISCOVERY_HANDSHAKE_EMPLOYER_PROFILE_STEP_5_DESCRIPTION,
            DISCOVERY_HANDSHAKE_EMPLOYER_PROFILE_STEP_5_PICTURE,
          ),
        ],
      },
    ),

    cell(
      appCell(config, '06', '03'),
      L.regular,
      finalStep.id,
      config.finalRegularTutorContent,
      config.cellSlotPrefix === '07'
        ? { picture: DISCOVERY_REGULAR_TUTOR_STEP_6_PICTURE }
        : REGULAR_TUTOR_PLACEHOLDER,
    ),
  ]

  return {
    path: {
      id: config.pathId,
      name: config.pathName,
      description: config.pathDescription,
      note: null,
      path_type: config.pathType,
    },
    layers: [...layers],
    steps: [...steps],
    cells,
    triggers,
  }
}

export const APPLICATION_HAPPY_PATH_FALLBACK =
  buildApplicationDiscoveryFallback(HAPPY_PATH_CONFIG)

export const APPLICATION_SAD_PATH_FALLBACK =
  buildApplicationDiscoveryFallback(SAD_PATH_CONFIG)
