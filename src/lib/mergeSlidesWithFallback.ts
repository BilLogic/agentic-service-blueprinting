import { hasBlueprintFallback } from '@/data/blueprintFallbacks'
import {
  FALLBACK_SLIDES,
  getMainSlides,
  getSubslides,
  type Slide,
} from '@/types/slides'

function mergeSlideFromFallback(slide: Slide, fallback: Slide | undefined): Slide {
  if (!fallback) return slide

  const description = fallback.description?.trim()
    ? fallback.description
    : slide.description?.trim()
      ? slide.description
      : fallback.description

  const viewType =
    hasBlueprintFallback(slide.id) && fallback.viewType
      ? fallback.viewType
      : slide.viewType

  const loopToId = slide.loopToId ?? fallback?.loopToId

  if (
    description === slide.description &&
    viewType === slide.viewType &&
    loopToId === slide.loopToId
  ) {
    return slide
  }

  return { ...slide, description, viewType, loopToId }
}

/**
 * When Supabase returns phases without locally-defined scenario subsides (e.g.
 * Application before seed/migration), keep blueprint-ready fallback scenarios.
 * Also fills missing phase/scenario descriptions from local fallbacks when the
 * database row predates a description migration.
 */
export function mergeSlidesWithFallback(
  dbSlides: Slide[],
  fallbackSlides: Slide[] = FALLBACK_SLIDES,
): Slide[] {
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

  const ordered: Slide[] = []
  for (const main of getMainSlides(merged)) {
    ordered.push(main)
    ordered.push(
      ...getSubslides(main.id, merged).sort((a, b) => a.index - b.index),
    )
  }

  return ordered
}
