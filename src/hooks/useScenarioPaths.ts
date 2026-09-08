import { useCallback } from 'react'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import type { ExistingVersion } from '@/components/editor/CreateVersionDialog'

export type ScenarioPaths = {
  scenarioName: string
  versions: ExistingVersion[]
}

/**
 * The paths of one scenario, and its name.
 *
 * Read from the database rather than taken from the canvas: the canvas holds
 * only the paths currently *selected for display*, so a uniqueness check
 * against it would pass on a name already taken by a path nobody is looking
 * at — and the name is the whole point of the check.
 */
export function useScenarioPaths(scenarioId: string | null) {
  const fallback = useCallback((): ScenarioPaths | null => null, [])
  return useSupabaseQuery<ScenarioPaths>(
    scenarioId ? `scenario-paths:${scenarioId}` : null,
    async (client, signal) => {
      const { data, error } = await client
        .from('paths')
        .select('id,name,scenarios(name)')
        .eq('scenario_id', scenarioId ?? '')
        .order('name')
        .abortSignal(signal)
      if (error) throw new Error(error.message)
      const rows = data ?? []
      const scenario = rows[0]?.scenarios as { name?: string } | null
      return {
        scenarioName: scenario?.name ?? 'this scenario',
        versions: rows.map((row) => ({
          pathId: row.id as string,
          name: row.name as string,
        })),
      }
    },
    fallback,
  )
}
