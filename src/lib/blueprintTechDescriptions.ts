import type { BlueprintCell, CellLink } from '@/types/blueprint'
import { parseCellContentItems } from '@/lib/parseCellContent'

export const TECH_DESCRIPTION_LINK_TYPE = 'tech_description'
export const URL_LINK_TYPE = 'url'

export function techDescriptionLink(
  techLabel: string,
  description?: string,
  picture?: string | readonly string[],
  url?: string,
): CellLink {
  const pictures = Array.isArray(picture)
    ? picture.map((entry) => entry.trim()).filter(Boolean)
    : undefined
  const singlePicture =
    typeof picture === 'string' && picture.trim() ? picture.trim() : undefined

  return {
    type: TECH_DESCRIPTION_LINK_TYPE,
    label: techLabel,
    ...(description ? { description } : {}),
    ...(pictures && pictures.length > 0
      ? { pictures, picture: pictures[0] }
      : singlePicture
        ? { picture: singlePicture }
        : {}),
    ...(url ? { url } : {}),
  }
}

function getTechUrlFromLinks(
  links: CellLink[],
  techItem: string,
): string | null {
  for (const link of links) {
    if (
      link.type === TECH_DESCRIPTION_LINK_TYPE &&
      link.label === techItem &&
      link.url?.trim()
    ) {
      return link.url.trim()
    }
  }
  return null
}

function getTechDescriptionFromLinks(
  links: CellLink[],
  techItem: string,
): string | null {
  for (const link of links) {
    if (
      link.type === TECH_DESCRIPTION_LINK_TYPE &&
      link.label === techItem &&
      link.description?.trim()
    ) {
      return link.description.trim()
    }
  }
  return null
}

function getLinkedDescriptionsForContentItems(
  links: CellLink[],
  items: string[],
): string | null {
  const parts: string[] = []
  for (const item of items) {
    const description = getTechDescriptionFromLinks(links, item)
    if (description) parts.push(description)
  }
  return parts.length > 0 ? parts.join('\n\n') : null
}

/** Tech pill label for the detail panel heading (Front Stage Tech, Back Stage Tech). */
export function resolveTechCellDetailLabel(
  techItem: string | undefined,
  cell: Pick<BlueprintCell, 'content'>,
): string | null {
  if (techItem?.trim()) return techItem.trim()

  const items = parseCellContentItems(cell.content)
  return items.length === 1 ? items[0]! : null
}

/** Detail panel body copy for a tech pill or single-tech cell. */
export function resolveTechCellDetailText(
  techItem: string | undefined,
  cell: Pick<BlueprintCell, 'content' | 'description' | 'links'>,
): string {
  const content = cell.content.trim()

  if (techItem) {
    const fromLinks = getTechDescriptionFromLinks(cell.links, techItem)
    if (fromLinks) return fromLinks

    if (techItem === 'Zoom/Pencil' && cell.description?.trim()) {
      return cell.description.trim()
    }

    if (cell.description?.trim()) {
      const items = parseCellContentItems(cell.content)
      if (items.includes(techItem)) {
        return cell.description.trim()
      }
    }

    return techItem
  }

  const contentItems = parseCellContentItems(content)
  if (contentItems.length === 1) {
    const fromLinks = getTechDescriptionFromLinks(cell.links, contentItems[0]!)
    if (fromLinks) return fromLinks
  }

  if (contentItems.length > 1) {
    const fromLinks = getLinkedDescriptionsForContentItems(cell.links, contentItems)
    if (fromLinks) return fromLinks
  }

  if (content === 'Zoom/Pencil' && cell.description?.trim()) {
    return cell.description.trim()
  }

  if (content === 'PLUS App') {
    const fromLinks = getTechDescriptionFromLinks(cell.links, 'PLUS App')
    if (fromLinks) return fromLinks
  }

  if (cell.description?.trim()) {
    return cell.description.trim()
  }

  return content
}

/** External design reference (e.g. Figma) for a tech pill detail panel. */
export function resolveTechCellDetailUrl(
  techItem: string | undefined,
  cell: Pick<BlueprintCell, 'content' | 'links'>,
): string | null {
  const content = cell.content.trim()

  if (techItem) {
    return getTechUrlFromLinks(cell.links, techItem)
  }

  if (content === 'PLUS App') {
    return getTechUrlFromLinks(cell.links, 'PLUS App')
  }

  return null
}

export function mergeUrlLinks(
  links: CellLink[],
  fallbackLinks: CellLink[],
): CellLink[] {
  const merged = links.map((link) => ({ ...link }))

  for (const fallbackLink of fallbackLinks) {
    if (fallbackLink.type !== URL_LINK_TYPE || !fallbackLink.url?.trim()) continue

    const existingIndex = merged.findIndex(
      (entry) => entry.type === URL_LINK_TYPE && entry.label === fallbackLink.label,
    )

    if (existingIndex >= 0) {
      const existing = merged[existingIndex]
      merged[existingIndex] = {
        ...existing,
        url: existing.url?.trim() || fallbackLink.url,
      }
      continue
    }

    merged.push(fallbackLink)
  }

  return merged
}

export function mergeTechDescriptionLinks(
  links: CellLink[],
  fallbackLinks: CellLink[],
): CellLink[] {
  const fallbackUrlLabels = new Set(
    fallbackLinks
      .filter(
        (link) => link.type === URL_LINK_TYPE && link.label && link.url?.trim(),
      )
      .map((link) => link.label!),
  )

  // When fallback defines URL resource links, drop existing URL links that are
  // not in that set (removes obsolete onboarding / resource links).
  const baseLinks =
    fallbackUrlLabels.size > 0
      ? links.filter(
          (link) =>
            link.type !== URL_LINK_TYPE ||
            (link.label != null && fallbackUrlLabels.has(link.label)),
        )
      : links

  const merged = mergeUrlLinks(
    baseLinks.map((link) => ({ ...link })),
    fallbackLinks,
  )

  for (const fallbackLink of fallbackLinks) {
    if (fallbackLink.type !== TECH_DESCRIPTION_LINK_TYPE) continue

    const existingIndex = merged.findIndex(
      (entry) =>
        entry.type === TECH_DESCRIPTION_LINK_TYPE &&
        entry.label === fallbackLink.label,
    )

    if (existingIndex >= 0) {
      const existing = merged[existingIndex]
      merged[existingIndex] = {
        ...existing,
        description:
          existing.description?.trim() || fallbackLink.description || undefined,
        picture: existing.picture?.trim() || fallbackLink.picture || undefined,
        pictures:
          existing.pictures?.length
            ? existing.pictures
            : fallbackLink.pictures?.length
              ? fallbackLink.pictures
              : undefined,
        url: existing.url?.trim() || fallbackLink.url || undefined,
      }
      continue
    }

    merged.push(fallbackLink)
  }

  return merged
}
