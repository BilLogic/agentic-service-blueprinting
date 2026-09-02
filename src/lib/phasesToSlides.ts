import type { Phase, Scenario } from '@/types/database'
import { SLIDE_VIEW_TYPES, type NavItem, type SlideViewType } from '@/types/nav'

export type ScenarioRow = Pick<
  Scenario,
  'id' | 'name' | 'summary' | 'position' | 'phase_id' | 'layout'
>

export type PhaseRow = Pick<
  Phase,
  'id' | 'name' | 'summary' | 'position' | 'loops_to_phase_id'
> & {
  scenarios?: ScenarioRow[]
}

/** Map phases and nested scenarios to editor slides (scenarios = subsides under their phase). */
export function phasesToSlides(phases: PhaseRow[]): NavItem[] {
  const slides: NavItem[] = []
  const sortedPhases = [...phases].sort(
    (a, b) => a.position - b.position,
  )

  sortedPhases.forEach((phase, phaseIndex) => {
    slides.push({
      id: phase.id,
      index: phaseIndex + 1,
      label: phase.name,
      summary: phase.summary,
      loopToId: phase.loops_to_phase_id ?? undefined,
    })

    const scenarios = [...(phase.scenarios ?? [])].sort(
      (a, b) => a.position - b.position,
    )

    scenarios.forEach((scenario, scenarioIndex) => {
      slides.push({
        id: scenario.id,
        index: scenarioIndex + 1,
        label: scenario.name,
        summary: scenario.summary,
        parentId: phase.id,
        // No seam any more: 21000116000000 moved the rows, so the column
        // holds the client's own vocabulary. Unknown values still fall back
        // to 'stacked' rather than leaking a token nothing can render.
        layout: SLIDE_VIEW_TYPES.includes(scenario.layout as SlideViewType)
          ? (scenario.layout as SlideViewType)
          : 'stacked',
      })
    })
  })

  return slides
}
