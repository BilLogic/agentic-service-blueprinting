import {
  FALLBACK_SLICES,
  FALLBACK_SLICE_ITEMS,
} from '@/data/sliceFallbacks'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import { findFirstServiceId } from '@/lib/service'
import type { Slice, Slide } from '@/types/database'

/** Slim frame projection carried on the list — powers client-side
 * membership checks (panel "In slices" footer) without per-cell queries. */
export type SliceListItem = Pick<Slide, 'id' | 'position' | 'cell_ids'>

export type SliceListEntry = Slice & { slides: SliceListItem[] }

/** The bundled demo slices, in the list projection. */
const slicesFallback = (): SliceListEntry[] =>
  FALLBACK_SLICES.map((slice) => ({
    ...slice,
    slides: (FALLBACK_SLICE_ITEMS[slice.id] ?? []).map((item) => ({
      id: item.id,
      position: item.position,
      cell_ids: item.cell_ids,
    })),
  }))

/**
 * All slices for one service service, ordered by position, each carrying
 * its frames' cell ids. With no explicit `serviceId`, the first service
 * by `created_at` is used — the same resolution as `useServicePhases`.
 */
export function useSlices(serviceId?: string): QueryResult<SliceListEntry[]> {
  return useSupabaseQuery<SliceListEntry[]>(
    `slices:${serviceId ?? 'first'}`,
    async (client) => {
      let resolvedServiceId = serviceId
      if (!resolvedServiceId) {
        resolvedServiceId = (await findFirstServiceId(client)) ?? undefined
        if (!resolvedServiceId) return []
      }

      const { data, error } = await client
        .from('slices')
        .select('*, slides (id, position, cell_ids)')
        .eq('service_id', resolvedServiceId)
        .order('position', { ascending: true })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    slicesFallback,
  )
}
