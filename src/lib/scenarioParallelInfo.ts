import {
  GOAL_SETTING_SCENARIO_ID,
  HELP_REQUEST_SCENARIO_ID,
  WARM_UP_SCENARIO_ID,
} from '@/data/parallelSessionScenarioIds'
import type { Slide } from '@/types/slides'

export { GOAL_SETTING_SCENARIO_ID }

export const SCENARIO_PARALLEL_NOTE_BY_ID: Record<string, string> = {
  [WARM_UP_SCENARIO_ID]:
    'This scenario can run in parallel with the Goal Setting and Help Request scenarios.',
  [GOAL_SETTING_SCENARIO_ID]:
    'This scenario can run in parallel with the Warm-Up and Help Request scenarios.',
  [HELP_REQUEST_SCENARIO_ID]:
    'This scenario can run in parallel with the Warm-Up and Goal Setting scenarios.',
}

const PARALLEL_TOOLTIPS_BY_LABEL: Record<string, string> = {
  'warm-up': SCENARIO_PARALLEL_NOTE_BY_ID[WARM_UP_SCENARIO_ID]!,
  'goal setting': SCENARIO_PARALLEL_NOTE_BY_ID[GOAL_SETTING_SCENARIO_ID]!,
  'help request': SCENARIO_PARALLEL_NOTE_BY_ID[HELP_REQUEST_SCENARIO_ID]!,
}

export function getScenarioParallelNote(
  scenarioId: string | undefined,
): string | null {
  if (!scenarioId) return null
  return SCENARIO_PARALLEL_NOTE_BY_ID[scenarioId] ?? null
}

export function getScenarioParallelTooltip(
  slide: Pick<Slide, 'id' | 'label'>,
): string | null {
  return (
    SCENARIO_PARALLEL_NOTE_BY_ID[slide.id] ??
    PARALLEL_TOOLTIPS_BY_LABEL[slide.label.trim().toLowerCase()] ??
    null
  )
}
