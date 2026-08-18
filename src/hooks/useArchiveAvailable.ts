import { useCallback } from 'react'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'

/**
 * Whether the recovery archive exists in this database.
 *
 * The plan's ordering rule is that no delete affordance ships before its
 * archive does, and this is what makes that rule true at runtime rather than
 * only in the tests. The app is deployed against more than one database — a
 * schema that has not had the authoring migration applied has no
 * `deleted_structure`, and a delete there would destroy imported blueprint
 * content with nothing behind it.
 *
 * The probe is a read, not a catalog lookup: PostgREST answers for the schema
 * it is actually serving, which is the thing that matters. An empty result
 * means the table is there and holds nothing, which is availability; only an
 * error means it is absent. Row-level security can hide the rows but not the
 * relation, so a policy that returns nothing still reads as available — which
 * is right, because the RPCs write through `security definer` regardless.
 *
 * No-DB mode answers `false` through the fallback. There is nothing to delete
 * from and nowhere to put it back.
 */
export function useArchiveAvailable(): boolean {
  const fallback = useCallback(() => false, [])
  const result = useSupabaseQuery<boolean>(
    'archive-available',
    async (client) => {
      // Cast for the same reason `authoringRpc` casts `rpc`: the generated
      // `Database` type is regenerated from whichever schema was linked last,
      // and this hook exists precisely to answer the case where the table is
      // not in that schema. Typing the probe against the types would make the
      // question unaskable.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
      const { error } = await (client.from as any)('deleted_structure')
        .select('id')
        .limit(1)
      return !error
    },
    fallback,
  )
  return result.status === 'ready' ? result.data : false
}
