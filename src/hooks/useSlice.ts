import { useCallback } from 'react'
import {
  FALLBACK_SLICES,
  FALLBACK_SLICE_ITEMS,
} from '@/data/sliceFallbacks'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import type { Database, Slice, Slide } from '@/types/database'

/** One member of a slide's strip, as the embed returns it. */
export type SlideStripMember =
  Database['public']['Tables']['slide_strip']['Row']

/**
 * A slide with the strip its author chose, which is EMPTY for most
 * slides: no members means the slide shows the frames of the cells it
 * cites, and that is the default rather than a missing value.
 */
export type SlideWithStrip = Slide & { slide_strip: SlideStripMember[] }

export type SliceDetail = {
  slice: Slice
  items: SlideWithStrip[]
}

/** Bundled demo-slice detail; null when the id is not a fixture slice. */
function sliceFallback(sliceId: string): SliceDetail | null {
  const slice = FALLBACK_SLICES.find((entry) => entry.id === sliceId)
  if (!slice) return null
  // The bundled slices choose nothing: an empty strip is the default, and a
  // sample that pinned one would be teaching an exception as the rule.
  const items = (FALLBACK_SLICE_ITEMS[slice.id] ?? []).map((item) => ({
    ...item,
    slide_strip: [],
  }))
  return { slice, items }
}

/**
 * One slice with its frames (`slides`), items ordered by position.
 * Cached across mounts; `invalidateQueries('slice:')` drops it.
 */
export function useSlice(sliceId: string): QueryResult<SliceDetail> {
  const fallback = useCallback(() => sliceFallback(sliceId), [sliceId])

  return useSupabaseQuery<SliceDetail>(
    `slice:${sliceId}`,
    async (client, signal) => {
      const { data: slice, error: sliceError } = await client
        .from('slices')
        .select('*')
        .eq('id', sliceId)
        .abortSignal(signal)
        .maybeSingle()
      if (sliceError) throw new Error(sliceError.message)
      if (!slice) throw new Error('Slice not found')

      // The strip comes with the slide rather than in a second round trip:
      // every card renders one, and a request per card is a request per card.
      const { data: items, error: itemsError } = await client
        .from('slides')
        .select('*, slide_strip(*)')
        .eq('slice_id', sliceId)
        .order('position', { ascending: true })
        .abortSignal(signal)
      if (itemsError) throw new Error(itemsError.message)

      return { slice, items: items ?? [] }
    },
    fallback,
  )
}
