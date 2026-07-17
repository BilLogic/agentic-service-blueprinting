import type { Phase, ServiceScenario } from '@/types/database'
import type { Slide, SlideViewType } from '@/types/slides'

export type ScenarioRow = Pick<
  ServiceScenario,
  'id' | 'name' | 'description' | 'order_position' | 'phase_id' | 'view_type'
>

export type PhaseRow = Pick<
  Phase,
  'id' | 'name' | 'description' | 'order_position' | 'loops_to_phase_id'
> & {
  service_scenarios?: ScenarioRow[]
}

/** Map phases and nested scenarios to editor slides (scenarios = subsides under their phase). */
export function phasesToSlides(phases: PhaseRow[]): Slide[] {
  const slides: Slide[] = []
  const sortedPhases = [...phases].sort(
    (a, b) => a.order_position - b.order_position,
  )

  sortedPhases.forEach((phase, phaseIndex) => {
    slides.push({
      id: phase.id,
      index: phaseIndex + 1,
      label: phase.name,
      description: phase.description,
      loopToId: phase.loops_to_phase_id ?? undefined,
    })

    const scenarios = [...(phase.service_scenarios ?? [])].sort(
      (a, b) => a.order_position - b.order_position,
    )

    scenarios.forEach((scenario, scenarioIndex) => {
      slides.push({
        id: scenario.id,
        index: scenarioIndex + 1,
        label: scenario.name,
        description: scenario.description,
        parentId: phase.id,
        viewType: scenario.view_type as SlideViewType,
      })
    })
  })

  return slides
}
