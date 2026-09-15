import {
  getMainSlides,
  getSubslides,
  type NavItem,
} from '@/types/nav'

/**
 * What the cover CTA does: desktop enters the overview canvas; a phone
 * opens the first scenario of the first phase through the scenario-navigation
 * seam, drawer closed.
 *
 * @param opts.mobile - True on the phone shell.
 * @param opts.slides - Current navigation tree.
 * @param opts.enterCanvas - Desktop cover destination.
 * @param opts.openScenario - Shared scenario-open seam.
 * @returns A click handler for the cover CTA.
 */
export function coverCanvasAction(opts: {
  mobile: boolean
  slides: NavItem[]
  enterCanvas: () => void
  openScenario: (
    scenarioId: string,
    options?: { closeNav?: boolean },
  ) => void
}): () => void {
  return () => {
    if (!opts.mobile) {
      opts.enterCanvas()
      return
    }
    const firstPhase = getMainSlides(opts.slides)[0]
    const firstScenario = firstPhase
      ? getSubslides(firstPhase.id, opts.slides)[0]
      : undefined
    if (firstScenario) {
      opts.openScenario(firstScenario.id, { closeNav: true })
      return
    }
    opts.enterCanvas()
  }
}
