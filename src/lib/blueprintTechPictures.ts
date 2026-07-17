import type { CellLink } from '@/types/blueprint'
import { TECH_DESCRIPTION_LINK_TYPE } from '@/lib/blueprintTechDescriptions'
import { isBlueprintStepVisualPlaceholder } from '@/lib/blueprintVisualPlaceholder'

export const ZOOM_TECH_LOGO =
  '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png'

export const PENCIL_TECH_LOGO =
  '/blueprint-images/goal-setting/shared/front-stage-tech/pencil-logo.png'

export const SLACK_TECH_LOGO =
  '/blueprint-images/shared/front-stage-tech/slack-logo.png'

export const EMAIL_TECH_LOGO =
  '/blueprint-images/shared/front-stage-tech/email-logo.png'

export const WORKDAY_TECH_LOGO =
  '/blueprint-images/shared/front-stage-tech/workday-logo.png'

export const GOOGLE_FORM_TECH_LOGO =
  '/blueprint-images/shared/front-stage-tech/google-form-logo.png'

export const NOTION_TECH_LOGO =
  '/blueprint-images/shared/back-stage-tech/notion-logo.png'

export const FIGMA_TECH_LOGO =
  '/blueprint-images/shared/back-stage-tech/figma-logo.png'

export const ZOOM_PENCIL_TECH_PICTURES = [
  ZOOM_TECH_LOGO,
  PENCIL_TECH_LOGO,
] as const

const TECH_ITEM_DETAIL_PICTURES: Record<string, readonly string[]> = {
  'Zoom/Pencil': ZOOM_PENCIL_TECH_PICTURES,
  Zoom: [ZOOM_TECH_LOGO],
  Slack: [SLACK_TECH_LOGO],
  Email: [EMAIL_TECH_LOGO],
  Workday: [WORKDAY_TECH_LOGO],
  'Google Form Application': [GOOGLE_FORM_TECH_LOGO],
  'Shift Swap Google Form': [GOOGLE_FORM_TECH_LOGO],
  'Google Quizzes': [GOOGLE_FORM_TECH_LOGO],
  Notion: [NOTION_TECH_LOGO],
  Figma: [FIGMA_TECH_LOGO],
}

function getTechPicturesFromLinks(
  links: CellLink[],
  techItem: string,
): string[] | null {
  for (const link of links) {
    if (
      link.type === TECH_DESCRIPTION_LINK_TYPE &&
      link.label === techItem
    ) {
      if (link.pictures?.length) {
        const pictures = link.pictures
          .map((entry) => entry.trim())
          .filter(Boolean)
        if (pictures.length > 0) return pictures
      }
      if (link.picture?.trim()) {
        return [link.picture.trim()]
      }
    }
  }
  return null
}

export function getTechItemDetailPictures(
  techItem: string,
): readonly string[] | null {
  return TECH_ITEM_DETAIL_PICTURES[techItem] ?? null
}

export function resolveCellDetailPictures(input: {
  techItem?: string | null
  cellContent?: string | null
  cellPicture?: string | null
  cellLinks?: CellLink[]
}): readonly string[] | null {
  const links = input.cellLinks ?? []

  if (input.techItem) {
    const fromLinks = getTechPicturesFromLinks(links, input.techItem)
    if (fromLinks) return fromLinks

    const techPictures = getTechItemDetailPictures(input.techItem)
    if (techPictures) return techPictures
  }

  const content = input.cellContent?.trim() ?? ''
  if (
    content === 'Zoom/Pencil' ||
    content.startsWith('Zoom/Pencil\n') ||
    content.startsWith('Zoom/Pencil,')
  ) {
    return getTechItemDetailPictures('Zoom/Pencil')
  }

  if (content === 'PLUS App') {
    const fromLinks = getTechPicturesFromLinks(links, 'PLUS App')
    if (fromLinks) return fromLinks
  }

  if (content === 'Slack') {
    return getTechItemDetailPictures('Slack')
  }

  if (content === 'Email') {
    return getTechItemDetailPictures('Email')
  }

  if (content === 'Workday' || content.startsWith('Workday (')) {
    return getTechItemDetailPictures('Workday')
  }

  if (content === 'Google Form Application') {
    return getTechItemDetailPictures('Google Form Application')
  }

  if (content === 'Notion') {
    const fromLinks = getTechPicturesFromLinks(links, 'Notion')
    if (fromLinks) return fromLinks
    return getTechItemDetailPictures('Notion')
  }

  if (content === 'Google Quiz embedded in Notion') {
    const fromLinks = getTechPicturesFromLinks(
      links,
      'Google Quiz embedded in Notion',
    )
    if (fromLinks) return fromLinks
  }

  if (content === 'Figma') {
    return getTechItemDetailPictures('Figma')
  }

  const picture = input.cellPicture?.trim()
  if (!picture || isBlueprintStepVisualPlaceholder(picture)) return null
  return [picture]
}
