import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import { shouldUseStoryboardContent } from '@/lib/blueprintLayout'

export type StepSpec = {
  id: string
  name: string
  /** What this moment is, across every lane — the storyboard's caption. */
  summary: string
  scenarioId: string
  scenarioName: string
  phaseName: string
  /** Path names that include this step, with its position on each. */
  positions: { pathName: string; position: number }[]
  /**
   * The storyboard frames for this moment, with the lane each came from.
   *
   * The panel that opens from a storyboard cell has to SHOW the storyboard —
   * it is the face the reader clicked. The lane name rides along as quiet
   * provenance, not as the frame's meaning: the meaning is the summary below
   * it, which is what the caption on the canvas says too.
   */
  frames: { laneName: string; src: string }[]
}

/**
 * One step: its summary, and where it sits.
 *
 * A step's position is NOT a column on `steps` — it lives on `path_steps`, per
 * path, and the same step legitimately sits at different positions on
 * different paths (11 of them do). So the panel reports the positions rather
 * than a position.
 */
export function useStepSpec(stepId: string | null): QueryResult<StepSpec | null> {
  const fallback = useCallback(() => null, [])

  return useSupabaseQuery<StepSpec | null>(
    `step-spec:${stepId ?? 'none'}`,
    async (client, signal) => {
      if (!stepId) return null

      const { data: step, error } = await client
        .from('steps')
        .select(
          'id, name, summary, scenario_id, scenarios!inner(name, phases!inner(name))',
        )
        .eq('id', stepId)
        .abortSignal(signal)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!step) return null

      const { data: memberships, error: membershipError } = await client
        .from('path_steps')
        .select('position, paths!inner(name, created_at)')
        .eq('step_id', stepId)
        .abortSignal(signal)
      if (membershipError) throw new Error(membershipError.message)

      const positions = ((memberships ?? []) as unknown as Array<{
        position: number
        paths: { name: string; created_at: string }
      }>)
        .sort((a, b) => a.paths.created_at.localeCompare(b.paths.created_at))
        .map((row) => ({ pathName: row.paths.name, position: row.position }))

      const { data: framed, error: frameError } = await client
        .from('cells')
        /*
          THE HINT IS NOT OPTIONAL. Two foreign keys reach `lanes` from
          `cells` — `cells_lane_id_fkey` on `(lane_id)`, and the composite
          `cells_path_matches_lane_fkey` on `(lane_id, path_id)` that enforces
          a cell's lane belonging to its path. PostgREST answers an ambiguous
          embed with `PGRST201` and a 300 listing the candidates, which threw
          here and took the whole panel down with it.
        */
        .select('frame, lanes!cells_lane_id_fkey!inner(name, position, lane_role)')
        .eq('step_id', stepId)
        .not('frame', 'is', null)
        .abortSignal(signal)
      if (frameError) throw new Error(frameError.message)

      /*
        STORYBOARD lanes only, deduplicated.

        Every framed cell used to qualify, so a tech cell's product logo
        turned up in the panel as if it were a frame of the story — a Zoom
        mark stacked under two drawings of people. A frame is what the
        storyboard row draws; a logo is a touchpoint's decoration.

        The dedupe is because the same step is drawn once per path and the
        paths share their imagery.
      */
      const seen = new Set<string>()
      const frames: { laneName: string; src: string }[] = []
      for (const row of (framed ?? []) as unknown as Array<{
        frame: string | null
        lanes: { name: string; position: number; lane_role: string | null }
      }>) {
        const frame = row.frame?.trim()
        if (!frame || seen.has(frame)) continue
        // The canvas's own rule, called rather than restated. Spelled out here
        // it was a second copy that would go on answering the old question the
        // day the rule changed — the panel and the board would then disagree
        // about what a storyboard row is.
        if (
          !shouldUseStoryboardContent({
            name: row.lanes.name,
            role: row.lanes.lane_role,
          })
        ) {
          continue
        }
        seen.add(frame)
        frames.push({ laneName: row.lanes.name, src: frame })
      }

      const scenario = step.scenarios as unknown as {
        name: string
        phases: { name: string }
      }

      return {
        id: step.id,
        name: step.name,
        summary: step.summary ?? '',
        scenarioId: step.scenario_id,
        scenarioName: scenario.name,
        phaseName: scenario.phases.name,
        positions,
        frames,
      }
    },
    fallback,
  )
}
