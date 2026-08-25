import { toClientViewType } from '@/lib/viewTypeVocabulary'
import type { Phase, Scenario } from '@/types/database'
import type { NavItem } from '@/types/nav'

export type ScenarioRow = Pick<
  Scenario,
  'id' | 'name' | 'summary' | 'position' | 'phase_id' | 'view_type'
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
        // Read seam: DB tokens become client vocabulary here (and only here);
        // unknown values fall back to 'single' instead of leaking through.
        viewType: toClientViewType(scenario.view_type),
      })
    })
  })

  return slides
}
