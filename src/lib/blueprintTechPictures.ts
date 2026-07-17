import type { CellLink } from '@/types/blueprint'
import { TECH_DESCRIPTION_LINK_TYPE } from '@/lib/blueprintTechDescriptions'
import { isBlueprintStepVisualPlaceholder } from '@/lib/blueprintVisualPlaceholder'

/**
 * Detail-panel pictures come from cell `links` (type `tech_description`,
 * `picture`/`pictures` fields) — no hardcoded logo registry. Falls back to
 * the cell's own picture.
 */
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
  }

  const content = input.cellContent?.trim() ?? ''
  if (content) {
    const fromLinks = getTechPicturesFromLinks(links, content)
    if (fromLinks) return fromLinks
  }

  const picture = input.cellPicture?.trim()
  if (!picture || isBlueprintStepVisualPlaceholder(picture)) return null
  return [picture]
}
