import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'

export type LaneSpec = {
  id: string
  name: string
  role: string | null
  ownerTeam: string
  kpis: string[]
  tools: string[]
  /** Which member of the cast this lane is; null on a structural row. */
  stakeholderId: string | null
  scenarioId: string
  scenarioName: string
  phaseName: string
  /**
   * Every lane in this scenario carrying the same label — the rows a save
   * writes to. A lane belongs to ONE path, so a scenario with four paths has
   * four "Regular Tutor" lanes and editing the one you clicked would leave the
   * other three saying something else.
   */
  siblingLaneIds: string[]
  cellCount: number
}

/** jsonb arrays of loose shape — kept as the strings a human typed. */
function toStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => (typeof entry === 'string' ? entry : String(entry ?? '')))
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/**
 * One lane's spec, plus the scale of what a save touches.
 *
 * Three round-trips rather than one: the sibling lanes cannot be found until
 * the lane's own scenario is known, and the cell count cannot be counted until
 * the siblings are. They are cheap (an id lookup, an indexed filter, a count
 * with `head`) and they run once when the panel opens.
 */
export function useLaneSpec(laneId: string | null): QueryResult<LaneSpec | null> {
  const fallback = useCallback(() => null, [])

  return useSupabaseQuery<LaneSpec | null>(
    `lane-spec:${laneId ?? 'none'}`,
    async (client) => {
      if (!laneId) return null

      const { data: lane, error } = await client
        .from('lanes')
        .select(
          'id, name, lane_role, owner_team, kpis, tools, stakeholder_id, paths!inner(scenario_id, scenarios!inner(name, phases!inner(name)))',
        )
        .eq('id', laneId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!lane) return null

      const path = lane.paths as unknown as {
        scenario_id: string
        scenarios: { name: string; phases: { name: string } }
      }
      const scenarioId = path.scenario_id

      const { data: siblings, error: siblingError } = await client
        .from('lanes')
        .select('id, paths!inner(scenario_id)')
        .eq('name', lane.name)
        .eq('paths.scenario_id', scenarioId)
      if (siblingError) throw new Error(siblingError.message)

      const siblingLaneIds = (siblings ?? []).map((row) => row.id)

      const { count, error: countError } = await client
        .from('cells')
        .select('id', { count: 'exact', head: true })
        .in('lane_id', siblingLaneIds.length > 0 ? siblingLaneIds : [laneId])
      if (countError) throw new Error(countError.message)

      return {
        id: lane.id,
        name: lane.name,
        role: lane.lane_role ?? null,
        ownerTeam: lane.owner_team ?? '',
        kpis: toStrings(lane.kpis),
        tools: toStrings(lane.tools),
        stakeholderId: lane.stakeholder_id ?? null,
        scenarioId,
        scenarioName: path.scenarios.name,
        phaseName: path.scenarios.phases.name,
        siblingLaneIds,
        cellCount: count ?? 0,
      }
    },
    fallback,
  )
}
