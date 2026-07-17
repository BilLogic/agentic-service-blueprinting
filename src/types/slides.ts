import { hasBlueprintFallback, SAMPLE_SCENARIO_ID } from '@/data/blueprintFallbacks'
import { ORG_NAME } from '@/config'

/** Home = birds-eye service overview; detail = single slide/scenario editor. */
export type EditorView = 'home' | 'detail'

/** How blueprint paths are laid out on a scenario slide. */
export type SlideViewType = 'single' | 'side-by-side' | 'integrated'

export const SLIDE_VIEW_TYPES: SlideViewType[] = ['single', 'side-by-side', 'integrated']

/** Options shown in the scenario view type control. */
export const SCENARIO_VIEW_TYPE_OPTIONS: SlideViewType[] = SLIDE_VIEW_TYPES

export const SLIDE_VIEW_TYPE_LABELS: Record<SlideViewType, string> = {
  single: 'Single',
  'side-by-side': 'Side by side',
  integrated: 'Integrated',
}

export type Slide = {
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
  _fromPhase: Slide,
  toPhase: Slide | undefined,
): boolean {
  return Boolean(toPhase)
}

/** Lifecycle loop arrow between main phases on the overview canvas. */
export function shouldShowOverviewPostToPreLoopArrow(
  phases: Slide[],
): boolean {
  return getOverviewPostToPreLoopTransition(phases) !== null
}

/**
 * Loop transition detected from the data alone: the first phase carrying a
 * `loopToId` (DB `phases.loops_to_phase_id`) whose target phase exists. No
 * phase-ID or display-label heuristics — works for any org's IDs and any
 * language.
 */
export function getOverviewPostToPreLoopTransition(
  phases: Slide[],
): { fromPhaseId: string; toPhaseId: string } | null {
  for (const phase of phases) {
    if (!phase.loopToId) continue

    const target = getSlideById(phase.loopToId, phases)
    if (!target) continue

    return { fromPhaseId: phase.id, toPhaseId: target.id }
  }

  return null
}

const DISCOVER_PHASE_ID = 'f0000000-0000-4000-8000-000000000100'
const DELIVER_PHASE_ID = 'f0000000-0000-4000-8000-000000000200'

/**
 * Offline fallback matching supabase/seed.sql when Supabase is not configured:
 * a minimal sample lifecycle wrapping the generated sample scenario
 * (src/data/scaleFixture.ts). Replace with your own content via the import
 * pipeline or by editing the seed + this list together.
 */
export const FALLBACK_SLIDES: Slide[] = [
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
    viewType: 'side-by-side',
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

export function getSlideDisplayLabel(
  slide: Slide,
  _slides: Slide[] = FALLBACK_SLIDES,
): string {
  return slide.label
}

export function isSubslide(slide: Slide): boolean {
  return Boolean(slide.parentId)
}

/** Scenario id for blueprint loading — subsides use their id; single-scenario phases use phase id. */
export function getBlueprintScenarioId(slide: Slide): string | undefined {
  if (isSubslide(slide)) return slide.id
  if (hasBlueprintFallback(slide.id)) return slide.id
  return undefined
}

export function getSlideViewType(slide: Slide): SlideViewType {
  if (slide.viewType) return slide.viewType
  if (isSubslide(slide)) return 'side-by-side'
  if (hasBlueprintFallback(slide.id)) return 'side-by-side'
  return 'single'
}

export function showsBlueprintFilters(
  slide: Slide,
  slides: Slide[] = FALLBACK_SLIDES,
): boolean {
  if (getBlueprintScenarioId(slide) !== undefined) return true

  if (!isSubslide(slide)) {
    return getSubslides(slide.id, slides).some(
      (scenario) => getBlueprintScenarioId(scenario) !== undefined,
    )
  }

  return false
}

export function isIntegratedBlueprintSlide(slide: Slide): boolean {
  return isSubslide(slide) && getSlideViewType(slide) === 'integrated'
}

export function isSideBySideBlueprintSlide(slide: Slide): boolean {
  return isSubslide(slide) && getSlideViewType(slide) === 'side-by-side'
}

export function getMainSlides(slides: Slide[] = FALLBACK_SLIDES): Slide[] {
  return slides.filter((s) => !s.parentId)
}

export function getSubslides(parentId: string, slides: Slide[] = FALLBACK_SLIDES): Slide[] {
  return slides.filter((s) => s.parentId === parentId)
}

/** Sidebar / filmstrip order: each main slide followed by its subslides. */
export function getSlidesInNavOrder(slides: Slide[] = FALLBACK_SLIDES): Slide[] {
  const ordered: Slide[] = []
  for (const main of getMainSlides(slides)) {
    ordered.push(main)
    ordered.push(...getSubslides(main.id, slides))
  }
  return ordered
}

export type SlideSequenceNav = {
  prev: Slide | null
  next: Slide | null
  index: number
  total: number
}

function getAdjacentMainPhase(
  currentMain: Slide,
  mains: Slide[],
  slides: Slide[],
  direction: 'prev' | 'next',
): Slide | null {
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
  slides: Slide[] = FALLBACK_SLIDES,
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

  let next: Slide | null
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

export function getSlideById(id: string, slides: Slide[] = FALLBACK_SLIDES): Slide | undefined {
  return slides.find((s) => s.id === id)
}

export function getParentSlide(
  slide: Slide,
  slides: Slide[] = FALLBACK_SLIDES,
): Slide | undefined {
  if (!slide.parentId) return undefined
  return getSlideById(slide.parentId, slides)
}

export const WORKSPACE_BREADCRUMB_ID = '__workspace__'
export const WORKSPACE_BREADCRUMB_LABEL = ORG_NAME

/** Sidebar id for the service overview (home) nav item. */
export const SERVICE_OVERVIEW_NAV_ID = '__service_overview__'

export type SlideBreadcrumb = {
  id: string
  label: string
}

/** Breadcrumb trail from workspace root through parent phases to the active slide. */
export function getSlideBreadcrumbs(
  slide: Slide,
  slides: Slide[] = FALLBACK_SLIDES,
): SlideBreadcrumb[] {
  const crumbs: SlideBreadcrumb[] = [
    { id: WORKSPACE_BREADCRUMB_ID, label: WORKSPACE_BREADCRUMB_LABEL },
  ]

  const ancestors: Slide[] = []
  let parentId = slide.parentId
  while (parentId) {
    const parent = getSlideById(parentId, slides)
    if (!parent) break
    ancestors.unshift(parent)
    parentId = parent.parentId
  }

  for (const ancestor of ancestors) {
    crumbs.push({
      id: ancestor.id,
      label: getSlideDisplayLabel(ancestor, slides),
    })
  }

  crumbs.push({
    id: slide.id,
    label: getSlideDisplayLabel(slide, slides),
  })

  return crumbs
}

/** Default navigation target when the workspace breadcrumb is selected: first main phase. */
export function getWorkspaceBreadcrumbTarget(
  slides: Slide[] = FALLBACK_SLIDES,
): string | undefined {
  return getMainSlides(slides)[0]?.id
}
