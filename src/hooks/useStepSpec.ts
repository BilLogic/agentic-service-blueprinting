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
   * The storyboard frames for this moment, IN LANE ORDER, with the lane each
   * came from.
   *
   * The order is a guarantee, not the order the rows happened to arrive in:
   * `storyboardFramesFromCells` imposes it, and says why below. A step is
   * drawn once per lane precisely so the same moment can be compared across
   * actors, and which actor is a position on the board.
   *
   * The panel that opens from a storyboard cell has to SHOW the storyboard —
   * it is the face the reader clicked. The lane name rides along as quiet
   * provenance, not as the frame's meaning: the meaning is the summary below
   * it, which is what the caption on the canvas says too.
   */
  frames: StepFrame[]
}

/** One storyboard frame, and the lane whose row drew it. */
export type StepFrame = { laneName: string; src: string }

/** A framed cell as the query returns it, with the lane it was drawn in. */
export type FramedCellRow = {
  frame: string | null
  lanes: { name: string; position: number; lane_role: string | null }
}

/** Code-unit order, so the comparison does not vary with a locale or an ICU build. */
function byText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

/**
 * The frames of one moment, ordered by the lane each was drawn in.
 *
 * ORDERING IS THE POINT OF THIS FUNCTION, and it is not the query's job.
 * These rows come from an embedded `lanes(...)` select, and an embedded
 * resource comes back in whatever order the plan produced — today's order is
 * incidental, and a new index, a changed plan or a different server can
 * reorder it with nothing failing. Lane `position` is what the canvas sorts
 * its rows by, so it is what the panel's row follows too; otherwise the same
 * moment reads in one order on the board and another in the drawer, and the
 * comparison across actors that the row exists for is not a comparison.
 *
 * The sort key is TOTAL, so the result is a function of the rows and not of
 * their arrival: position, then lane name, then the frame itself. The ties
 * are real — a lane belongs to ONE path, so a scenario with four paths has
 * four lanes at position 3 — and a key that stopped at position would leave
 * those resolving back to whatever order came off the wire.
 *
 * THE SORT RUNS BEFORE THE DEDUPE, for the same reason. The same step is
 * drawn once per path and the paths share their imagery, so a frame arrives
 * more than once; whichever row survives decides which lane the frame is
 * captioned with, and that has to be the first lane in the order rather than
 * the first row off the wire.
 *
 * STORYBOARD lanes only. Every framed cell used to qualify, so a tech cell's
 * product logo turned up in the panel as if it were a frame of the story — a
 * Zoom mark stacked under two drawings of people. A frame is what the
 * storyboard row draws; a logo is a touchpoint's decoration. The canvas's own
 * rule is CALLED rather than restated: spelled out here it would be a second
 * copy that goes on answering the old question the day the rule changes, and
 * the panel and the board would then disagree about what a storyboard row is.
 */
export function storyboardFramesFromCells(rows: FramedCellRow[]): StepFrame[] {
  const drawn = rows
    .map((row) => ({ lane: row.lanes, src: row.frame?.trim() ?? '' }))
    .filter(
      (row) =>
        row.src !== '' &&
        shouldUseStoryboardContent({
          name: row.lane.name,
          role: row.lane.lane_role,
        }),
    )
    .sort(
      (a, b) =>
        a.lane.position - b.lane.position ||
        byText(a.lane.name, b.lane.name) ||
        byText(a.src, b.src),
    )

  const seen = new Set<string>()
  const frames: StepFrame[] = []
  for (const row of drawn) {
    if (seen.has(row.src)) continue
    seen.add(row.src)
    frames.push({ laneName: row.lane.name, src: row.src })
  }
  return frames
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

      // Storyboard lanes only, in lane order, deduplicated — all three
      // decisions, and the reasons for them, live in the function.
      const frames = storyboardFramesFromCells(
        (framed ?? []) as unknown as FramedCellRow[],
      )

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
