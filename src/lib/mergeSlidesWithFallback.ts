import { hasBlueprintFallback } from '@/data/blueprintFallbacks'
import {
  FALLBACK_NAV,
  getMainSlides,
  getSubslides,
  type NavItem,
} from '@/types/nav'

function mergeSlideFromFallback(slide: NavItem, fallback: NavItem | undefined): NavItem {
  if (!fallback) return slide

  const summary = fallback.summary?.trim()
    ? fallback.summary
    : slide.summary?.trim()
      ? slide.summary
      : fallback.summary

  const layout =
    hasBlueprintFallback(slide.id) && fallback.layout
      ? fallback.layout
      : slide.layout

  const loopToId = slide.loopToId ?? fallback?.loopToId

  if (
    summary === slide.summary &&
    layout === slide.layout &&
    loopToId === slide.loopToId
  ) {
    return slide
  }

  return { ...slide, summary, layout, loopToId }
}

/**
 * When Supabase returns phases without locally-defined scenario subsides (e.g.
 * Application before seed/migration), keep blueprint-ready fallback scenarios.
 * Also fills missing phase/scenario summaries from local fallbacks when the
 * database row predates a summary migration.
 */
export function mergeSlidesWithFallback(
  dbSlides: NavItem[],
  fallbackSlides: NavItem[] = FALLBACK_NAV,
): NavItem[] {
  if (dbSlides.length === 0) return fallbackSlides

  const fallbackById = new Map(fallbackSlides.map((slide) => [slide.id, slide]))
  const dbIds = new Set(dbSlides.map((slide) => slide.id))
  const merged = dbSlides.map((slide) =>
    mergeSlideFromFallback(slide, fallbackById.get(slide.id)),
  )

  for (const fallback of fallbackSlides) {
    if (!fallback.parentId) continue
    if (dbIds.has(fallback.id)) continue
    if (!hasBlueprintFallback(fallback.id)) continue
    if (!dbIds.has(fallback.parentId)) continue

    merged.push(fallback)
    dbIds.add(fallback.id)
  }

  const ordered: NavItem[] = []
  for (const main of getMainSlides(merged)) {
    ordered.push(main)
    ordered.push(
      ...getSubslides(main.id, merged).sort((a, b) => a.index - b.index),
    )
  }

  return ordered
}
