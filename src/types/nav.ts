import { hasBlueprintFallback } from '@/data/blueprintFallbacks'
import { ORG_NAME } from '@/config'

/**
 * landing = orientation homepage;
 * home = birds-eye service overview canvas;
 * detail = focused phase/scenario on the canvas.
 */
export type EditorView = 'landing' | 'home' | 'detail'

/**
 * How blueprint paths are laid out on a scenario slide — CLIENT vocabulary.
 * The DB keeps `side-by-side`/`integrated`; the two meet only in
 * `src/lib/viewTypeVocabulary.ts`. `'merged'` is session-only, never persisted.
 */
export type SlideViewType = 'single' | 'stacked' | 'merged'

export const SLIDE_VIEW_TYPES: SlideViewType[] = ['single', 'stacked', 'merged']

/** Options shown in the scenario view type control (merged is session-only). */
export const SCENARIO_VIEW_TYPE_OPTIONS: SlideViewType[] = ['stacked']

export const SLIDE_VIEW_TYPE_LABELS: Record<SlideViewType, string> = {
  single: 'Single',
  stacked: 'Stacked',
  merged: 'Merged',
}

export type NavItem = {
  id: string
  index: number
  label: string
  /** When set, this slide is a subslide branching from the parent (not in the main vertical stack). */
  parentId?: string
  /** Main-phase loop target (e.g. post-session → pre-session). Stored in DB; not drawn on canvas. */
  loopToId?: string
  /** Scenario blueprint layout; defaults to single-path view. */
  layout?: SlideViewType
  /** Short scenario summary shown under the slide title. */
  summary?: string | null
}

/**
 * The service overview draws a flow arrow between consecutive main phases.
 * Purely positional — no phase-ID or display-label heuristics, so it works
 * for any org's ids and any language. A missing `toPhase` is the last phase
 * in the service, which has nothing to point at.
 */
export function shouldShowOverviewPhaseFlowArrow(
  _fromPhase: NavItem,
  toPhase: NavItem | undefined,
): boolean {
  return Boolean(toPhase)
}

/**
 * Horizontal anchor for overview flow arrows: the FIRST main phase, whose
 * centre every arrow in the column aligns to. Positional rather than named,
 * so an org's own first phase anchors its own canvas.
 */
export function isOverviewFlowArrowAnchorPhase(
  phase: NavItem,
  slides: NavItem[] = FALLBACK_NAV,
): boolean {
  return getMainSlides(slides)[0]?.id === phase.id
}

/** Service loop arrow between main phases on the overview canvas. */
export function shouldShowOverviewPostToPreLoopArrow(
  phases: NavItem[],
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
// Replaced wholesale on registration (from the IR service); do not hand-edit.
// Default content is the template's meta-blueprint service: three phases
// (Discover → Setup → Maintain, Maintain looping back to Setup) wrapping six
// sample scenarios, matching supabase/seed.sql when Supabase is not
// configured.
import { SAMPLE_PHASES, SAMPLE_SCENARIOS } from '@/data/sampleBlueprint'

export const FALLBACK_NAV: NavItem[] = [
  ...SAMPLE_PHASES.map(
    (phase): NavItem => ({
      id: phase.id,
      index: phase.position,
      label: phase.name,
      summary: phase.summary,
      ...(phase.loops_to_phase_id ? { loopToId: phase.loops_to_phase_id } : {}),
    }),
  ),
  ...SAMPLE_SCENARIOS.map(
    (scenario): NavItem => ({
      id: scenario.id,
      index: scenario.position,
      label: scenario.name,
      parentId: scenario.phase_id,
      layout: scenario.layout,
      summary: scenario.summary,
    }),
  ),
]
// GENERATED-NAV:END

/**
 * The time-marker register's label: `01 · Application`. Phases and steps ARE
 * ordered sequences, so the zero-padded ordinal is information. One helper,
 * because five surfaces (phase badges, reader eyebrows, nav sheets) claim to
 * "name time the same way" — this is what makes that claim structural.
 */
export function ordinalLabel(ordinal: number, name: string): string {
  return `${String(ordinal).padStart(2, '0')} · ${name}`
}

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
  // `slide.layout` is already client vocabulary: the raw DB value is mapped
  // at the read seam (`phasesToSlides` via `viewTypeVocabulary`), where a
  // persisted 'stacked' keeps coercing to the plain stacked view.
  if (slide.layout) return slide.layout
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

export function isIntegratedBlueprintSlide(_slide: NavItem): boolean {
  // The integrated (single-grid, all-paths) layout is disabled app-wide: a
  // scenario's paths render stacked. Kept as a named predicate because the
  // DB vocabulary still carries 'stacked' and the read seam coerces it.
  return false
}

export function isSideBySideBlueprintSlide(slide: NavItem): boolean {
  return isSubslide(slide) && getSlideViewType(slide) === 'stacked'
}

export function getMainSlides(slides: NavItem[] = FALLBACK_NAV): NavItem[] {
  return slides
    .filter((s) => !s.parentId)
    .slice()
    .sort((a, b) => a.index - b.index || a.label.localeCompare(b.label))
}

export function getSubslides(parentId: string, slides: NavItem[] = FALLBACK_NAV): NavItem[] {
  return slides
    .filter((s) => s.parentId === parentId)
    .slice()
    .sort((a, b) => a.index - b.index || a.label.localeCompare(b.label))
}

/** Sidebar / filmstrip order: each main slide followed by its subslides. */
export function getSlidesInNavOrder(slides: NavItem[] = FALLBACK_NAV): NavItem[] {
  const ordered: NavItem[] = []
  for (const main of getMainSlides(slides)) {
    ordered.push(main)
    ordered.push(...getSubslides(main.id, slides))
  }
  return ordered
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

export const WORKSPACE_BREADCRUMB_ID = '__workspace__'
export const WORKSPACE_BREADCRUMB_LABEL = ORG_NAME

export type SlideBreadcrumb = {
  id: string
  label: string
}

/** Breadcrumb trail from workspace root through parent phases to the active slide. */
export function getSlideBreadcrumbs(
  slide: NavItem,
  slides: NavItem[] = FALLBACK_NAV,
): SlideBreadcrumb[] {
  const crumbs: SlideBreadcrumb[] = [
    { id: WORKSPACE_BREADCRUMB_ID, label: WORKSPACE_BREADCRUMB_LABEL },
  ]

  const ancestors: NavItem[] = []
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
