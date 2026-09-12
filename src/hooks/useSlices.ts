import {
  FALLBACK_SLICES,
  FALLBACK_SLICE_ITEMS,
} from '@/data/sliceFallbacks'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import { isBundledSampleActive } from '@/lib/bundledSample'
import { awaitOrAbort, findActiveServiceId } from '@/lib/service'
import type { Slice, Slide } from '@/types/database'

/** Slim frame projection carried on the list — powers client-side
 * membership checks (panel "In slices" footer) without per-cell queries. */
export type SliceListItem = Pick<Slide, 'id' | 'position' | 'cell_ids'>

export type SliceListEntry = Slice & { slides: SliceListItem[] }

/**
 * The bundled demo slices, in the list projection — and nothing at all once a
 * database exists.
 *
 * Same rule as `lib/resolveBlueprint.ts` and the editor's navigation, under
 * the same ruling: a connected database is the whole truth, and the template's
 * sample is reachable only on the fresh clone it exists for. Slices reached
 * past that rule because this fallback is handed to `useSupabaseQuery`, which
 * calls it on TWO paths — the no-database one, where it is the point, and the
 * ERROR one, where it is not. A deployment whose slices read fails or times
 * out had four surfaces render `fallback ?? []`, so the template's demo slices
 * arrived in its sidebar, its tab strip, its cell footer and its mobile shell,
 * presented as the deployment's own with nothing on screen saying otherwise.
 *
 * NULL and not an empty array, on that second path. `[]` is the sentence
 * "this workspace has no slices", which a failed read is not entitled to say;
 * `null` is "nothing to offer here", which is the truth and which every
 * consumer already spells `?? []` at its own edge.
 */
const slicesFallback = (): SliceListEntry[] | null =>
  isBundledSampleActive()
    ? FALLBACK_SLICES.map((slice) => ({
        ...slice,
        slides: (FALLBACK_SLICE_ITEMS[slice.id] ?? []).map((item) => ({
          id: item.id,
          position: item.position,
          cell_ids: item.cell_ids,
        })),
      }))
    : null

/**
 * All slices for one service, ordered by position, each carrying
 * its frames' cell ids. With no explicit `serviceId`, the ACTIVE service is
 * used — the same resolution as `useServicePhases`.
 */
export function useSlices(serviceId?: string): QueryResult<SliceListEntry[]> {
  return useSupabaseQuery<SliceListEntry[]>(
    `slices:${serviceId ?? 'first'}`,
    async (client, signal) => {
      let resolvedServiceId = serviceId
      if (!resolvedServiceId) {
        resolvedServiceId =
          (await awaitOrAbort(findActiveServiceId(client), signal)) ?? undefined
        if (!resolvedServiceId) return []
      }

      const { data, error } = await client
        .from('slices')
        .select('*, slides (id, position, cell_ids)')
        .eq('service_id', resolvedServiceId)
        .order('position', { ascending: true })
        .abortSignal(signal)
      if (error) throw new Error(error.message)
      return data ?? []
    },
    slicesFallback,
  )
}
