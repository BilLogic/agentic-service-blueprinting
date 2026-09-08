import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import type { TouchpointRegistryEntry } from '@/lib/touchpointColors'

const NO_ENTRIES: readonly TouchpointRegistryEntry[] = []

/**
 * Every touchpoint's stored colour and its other spellings.
 *
 * Separate from `useRegistryTouchpoints`, which the placement picker uses,
 * because the two ask different questions of the same table. The picker wants
 * the names one panel can choose between and keys its query by the cell it is
 * open on; this wants what the WHOLE BOARD draws with, so its key is a
 * constant and every consumer shares one cached response — the difference
 * between one round trip per session and one per cell anybody opens.
 *
 * The catalog is the deployment's, not the service's — the decision that a
 * service owns its journey and shares the catalog — so the read is unscoped:
 * a colour chosen for a tool is that tool's colour on every board.
 *
 * With no database the answer is NO ENTRIES rather than a fixture, and that is
 * a position rather than an omission. An empty registry is exactly the state
 * `TOUCHPOINT_COLORS` exists for — the generic seed answers, and a name it
 * does not carry hashes — so a board with no rows draws deliberately without
 * this template having to guess at anybody's tools. A deployment that wants
 * its own colours offline supplies them the same way it supplies its fixture
 * boards, by handing `setTouchpointRegistry` its own entries.
 */
export function useTouchpointRegistryTones(): QueryResult<
  readonly TouchpointRegistryEntry[]
> {
  const fallback = useCallback(() => NO_ENTRIES, [])

  return useSupabaseQuery<readonly TouchpointRegistryEntry[]>(
    'touchpoint-registry-tones',
    async (client, signal) => {
      const { data, error } = await client
        .from('touchpoints')
        .select('name, tone, aliases')
        .order('name')
        .abortSignal(signal)
      if (error) throw new Error(error.message)
      return (data ?? []).map((row) => ({
        name: row.name,
        tone: row.tone,
        aliases: row.aliases,
      }))
    },
    fallback,
  )
}
