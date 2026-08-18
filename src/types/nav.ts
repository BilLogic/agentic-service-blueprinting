import { hasBlueprintFallback } from '@/data/blueprintFallbacks'

/** Home = birds-eye service overview; detail = single slide/scenario editor. */
export type EditorView = 'home' | 'detail'

/**
 * How blueprint paths are laid out on a scenario slide — CLIENT vocabulary.
 * The DB keeps `side-by-side`/`integrated`; the two meet only in
 * `src/lib/viewTypeVocabulary.ts`. `'merged'` is session-only, never persisted.
 */
export type SlideViewType = 'single' | 'stacked' | 'merged'

export type NavItem = {
  id: string
  index: number
  label: string
  /** When set, this slide is a subslide branching from the parent (not in the main vertical stack). */
  parentId?: string
  /** Main-phase loop target (DB `phases.loops_to_phase_id`). Not drawn on canvas. */
  loopToId?: string
  /** Scenario blueprint layout; defaults to single-path view. */
  viewType?: SlideViewType
  /** Short scenario summary shown under the slide title. */
  description?: string | null
}

/**
 * The service overview draws a flow arrow between consecutive main phases.
 * Purely positional — no phase-ID or label heuristics.
 */
export function shouldShowOverviewPhaseFlowArrow(
  _fromPhase: NavItem,
  toPhase: NavItem | undefined,
): boolean {
  return Boolean(toPhase)
}

/**
 * Loop transition detected from the data alone: the first phase carrying a
 * `loopToId` (DB `phases.loops_to_phase_id`) whose target phase exists. No
 * phase-ID or display-label heuristics — works for any org's IDs and any
 * language.
 */
export function getOverviewPostToPreLoopTransition(
  phases: NavItem[],
): { fromPhaseId: string; toPhaseId: string } | null {
  for (const phase of phases) {
    if (!phase.loopToId) continue

    const target = getSlideById(phase.loopToId, phases)
    if (!target) continue

    return { fromPhaseId: phase.id, toPhaseId: target.id }
  }

  return null
}

// GENERATED-NAV:BEGIN — managed by scripts/generate_fallbacks.py --register.
// Replaced wholesale on registration (from the IR lifecycle); do not hand-edit.
// Default content is the template's sample lifecycle: two phases wrapping the
// sample scenario, matching supabase/seed.sql when Supabase is not configured.
import { SAMPLE_SCENARIO_ID } from '@/data/blueprintFallbacks'

const DISCOVER_PHASE_ID = 'f0000000-0000-4000-8000-000000000100'
const DELIVER_PHASE_ID = 'f0000000-0000-4000-8000-000000000200'

export const FALLBACK_NAV: NavItem[] = [
  {
    id: DISCOVER_PHASE_ID,
    index: 1,
    label: 'Discover',
    description:
      'Sample phase — a request is received, triaged, and resolved on site.',
  },
  {
    id: SAMPLE_SCENARIO_ID,
    index: 1,
    label: 'Sample Service',
    parentId: DISCOVER_PHASE_ID,
    viewType: 'stacked',
    description:
      'Generated sample scenario: 12 lanes (canonical + custom roles, CJK labels), 16 steps, 3 paths.',
  },
  {
    id: DELIVER_PHASE_ID,
    index: 2,
    label: 'Deliver',
    description:
      'Sample phase — demonstrates the lifecycle loop back to Discover.',
    loopToId: DISCOVER_PHASE_ID,
  },
]
// GENERATED-NAV:END

export function getSlideDisplayLabel(
  slide: NavItem,
  _slides: NavItem[] = FALLBACK_NAV,
): string {
  return slide.label
}

export function isSubslide(slide: NavItem): boolean {
  return Boolean(slide.parentId)
}

/** Scenario id for blueprint loading — subsides use their id; single-scenario phases use phase id. */
export function getBlueprintScenarioId(slide: NavItem): string | undefined {
  if (isSubslide(slide)) return slide.id
  if (hasBlueprintFallback(slide.id)) return slide.id
  return undefined
}

export function getSlideViewType(slide: NavItem): SlideViewType {
  // `slide.viewType` is already client vocabulary: the raw DB value is mapped
  // at the read seam (`phasesToSlides` via `viewTypeVocabulary`), where a
  // persisted 'integrated' keeps coercing to the plain stacked view.
  if (slide.viewType) return slide.viewType
  if (isSubslide(slide)) return 'stacked'
  if (hasBlueprintFallback(slide.id)) return 'stacked'
  return 'single'
}

export function showsBlueprintFilters(
  slide: NavItem,
  slides: NavItem[] = FALLBACK_NAV,
): boolean {
  if (getBlueprintScenarioId(slide) !== undefined) return true

  if (!isSubslide(slide)) {
    return getSubslides(slide.id, slides).some(
      (scenario) => getBlueprintScenarioId(scenario) !== undefined,
    )
  }

  return false
}

export function getMainSlides(slides: NavItem[] = FALLBACK_NAV): NavItem[] {
  return slides.filter((s) => !s.parentId)
}

export function getSubslides(parentId: string, slides: NavItem[] = FALLBACK_NAV): NavItem[] {
  return slides.filter((s) => s.parentId === parentId)
}

export type SlideSequenceNav = {
  prev: NavItem | null
  next: NavItem | null
  index: number
  total: number
}

function getAdjacentMainPhase(
  currentMain: NavItem,
  mains: NavItem[],
  slides: NavItem[],
  direction: 'prev' | 'next',
): NavItem | null {
  const phaseIndex = mains.findIndex((phase) => phase.id === currentMain.id)
  if (phaseIndex === -1) return null

  if (direction === 'prev') {
    return phaseIndex > 0 ? mains[phaseIndex - 1]! : null
  }

  if (phaseIndex < mains.length - 1) {
    return mains[phaseIndex + 1]!
  }

  if (currentMain.loopToId) {
    return getSlideById(currentMain.loopToId, slides) ?? null
  }

  return null
}

/** Previous / next target for phase- and scenario-level detail navigation. */
export function getSlideSequenceNav(
  activeSlideId: string,
  slides: NavItem[] = FALLBACK_NAV,
): SlideSequenceNav {
  const current = getSlideById(activeSlideId, slides)
  const mains = getMainSlides(slides)

  if (!current) {
    return { prev: null, next: null, index: -1, total: mains.length }
  }

  if (!isSubslide(current)) {
    const phaseIndex = mains.findIndex((phase) => phase.id === current.id)
    if (phaseIndex === -1) {
      return { prev: null, next: null, index: -1, total: mains.length }
    }

    return {
      prev: getAdjacentMainPhase(current, mains, slides, 'prev'),
      next: getAdjacentMainPhase(current, mains, slides, 'next'),
      index: phaseIndex,
      total: mains.length,
    }
  }

  const parent = getParentSlide(current, slides)
  if (!parent) {
    return { prev: null, next: null, index: -1, total: 0 }
  }

  const scenarios = getSubslides(parent.id, slides)
  const scenarioIndex = scenarios.findIndex((scenario) => scenario.id === current.id)
  if (scenarioIndex === -1) {
    return { prev: null, next: null, index: -1, total: scenarios.length }
  }

  const prev =
    scenarioIndex > 0
      ? scenarios[scenarioIndex - 1]!
      : getAdjacentMainPhase(parent, mains, slides, 'prev')

  let next: NavItem | null
  if (scenarioIndex < scenarios.length - 1) {
    next = scenarios[scenarioIndex + 1]!
  } else {
    next = getAdjacentMainPhase(parent, mains, slides, 'next')
  }

  return {
    prev,
    next,
    index: scenarioIndex,
    total: scenarios.length,
  }
}

export function getSlideById(id: string, slides: NavItem[] = FALLBACK_NAV): NavItem | undefined {
  return slides.find((s) => s.id === id)
}

export function getParentSlide(
  slide: NavItem,
  slides: NavItem[] = FALLBACK_NAV,
): NavItem | undefined {
  if (!slide.parentId) return undefined
  return getSlideById(slide.parentId, slides)
}
