import { hasBlueprintFallback } from '@/data/blueprintFallbacks'
import { ORG_NAME } from '@/config'

/**
 * landing = orientation homepage;
 * home = birds-eye service overview canvas;
 * detail = focused phase/scenario on the canvas.
 */
export type EditorView = 'landing' | 'home' | 'detail'

/**
 * How a scenario's paths are drawn — the value `scenarios.layout` holds, no
 * translation between. `stacked` is one full band per path on a shared step
 * axis; `merged` is the paths combined into ONE blueprint. The header toggle
 * writes it, so a scenario left merged opens merged.
 */
export type SlideViewType = 'stacked' | 'merged'

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
  /**
   * `scenarios.note` — the aside beside what the scenario IS, carried on the
   * title's definition popover. Most often what else may be running at the
   * same time. It is blueprint data rather than app configuration, which is
   * the whole reason it is a column: the alternative is a `Record` keyed on
   * hardcoded scenario ids, which only the deployment that wrote those ids
   * can read.
   */
  note?: string | null
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
  slides: NavItem[],
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
  _slides: NavItem[],
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

/**
 * A raw `scenarios.layout` as a SlideViewType.
 *
 * Not a translation — the stored tokens ARE these tokens. It is a guard: a row
 * outside the CHECK constraint falls back to the stacked view rather than
 * crashing a render, which is the behaviour the old vocabulary map provided and
 * the only part of it worth keeping. `single`, which the column held until
 * the migration that narrowed the layout column to `stacked` and `merged`,
 * lands here too: a one-path scenario is stacked with one band.
 */
export function asSlideViewType(raw: string): SlideViewType {
  return raw === 'merged' ? 'merged' : 'stacked'
}

export function getSlideViewType(slide: NavItem): SlideViewType {
  // Already the stored token — see asSlideViewType.
  return slide.layout ?? 'stacked'
}

export function showsBlueprintFilters(
  slide: NavItem,
  slides: NavItem[],
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

export function getMainSlides(slides: NavItem[]): NavItem[] {
  return slides
    .filter((s) => !s.parentId)
    .slice()
    .sort((a, b) => a.index - b.index || a.label.localeCompare(b.label))
}

export function getSubslides(parentId: string, slides: NavItem[]): NavItem[] {
  return slides
    .filter((s) => s.parentId === parentId)
    .slice()
    .sort((a, b) => a.index - b.index || a.label.localeCompare(b.label))
}

/** Sidebar / filmstrip order: each main slide followed by its subslides. */
export function getSlidesInNavOrder(slides: NavItem[]): NavItem[] {
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
  slides: NavItem[],
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

export function getSlideById(id: string, slides: NavItem[]): NavItem | undefined {
  return slides.find((s) => s.id === id)
}

export function getParentSlide(
  slide: NavItem,
  slides: NavItem[],
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
  slides: NavItem[],
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
