import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import type { PathKind } from '@/types/database'
import {
  asEntityStatus,
  DEFAULT_ENTITY_STATUS,
  type EntityStatus,
} from '@/lib/entityStatus'

export type ScenarioPathSpec = {
  id: string
  name: string
  pathKind: PathKind
  /** When this route applies — the condition that puts someone on it. */
  summary: string
  /** The author's aside: open questions, provenance, working state. */
  note: string
  /** How far along this route is. `live` on all but six today. */
  status: EntityStatus
}

export type ScenarioSpec = {
  id: string
  name: string
  summary: string
  phaseName: string
  paths: ScenarioPathSpec[]
}

/**
 * One scenario, its phase, and its paths.
 *
 * The paths come with it rather than on demand: they are the panel's primary
 * content — a path has no shape on the canvas to hang an affordance on, so
 * this panel is the only place `paths.summary` and `paths.note` can be read or
 * written at all.
 */
export function useScenarioSpec(
  scenarioId: string | null,
): QueryResult<ScenarioSpec | null> {
  const fallback = useCallback(() => null, [])

  return useSupabaseQuery<ScenarioSpec | null>(
    `scenario-spec:${scenarioId ?? 'none'}`,
    async (client, signal) => {
      if (!scenarioId) return null

      const { data: scenario, error } = await client
        .from('scenarios')
        .select(
          'id, name, summary, phases!inner(name), paths(id, name, kind, status, summary, note, created_at)',
        )
        .eq('id', scenarioId)
        .abortSignal(signal)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!scenario) return null

      const paths = ((scenario.paths ?? []) as Array<{
        id: string
        name: string
        kind: PathKind
        status: EntityStatus | null
        summary: string | null
        note: string | null
        created_at: string
      }>)
        // Import order, which is the order the canvas draws them in — no
        // position column on paths to sort by.
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((path) => ({
          id: path.id,
          name: path.name,
          pathKind: path.kind,
          summary: path.summary ?? '',
          note: path.note ?? '',
          status: asEntityStatus(path.status) ?? DEFAULT_ENTITY_STATUS,
        }))

      const phase = scenario.phases as unknown as { name: string }

      return {
        id: scenario.id,
        name: scenario.name,
        summary: scenario.summary ?? '',
        phaseName: phase.name,
        paths,
      }
    },
    fallback,
  )
}
