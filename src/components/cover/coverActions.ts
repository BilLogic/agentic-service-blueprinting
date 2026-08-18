import { useMemo } from 'react'
import type { CoverActions, CoverSliceState } from '@/components/cover/coverModel'
import { useEditor } from '@/contexts/EditorContext'
import { useViewState } from '@/contexts/viewStateStore'
import { useSlices, type SliceListEntry } from '@/hooks/useSlices'

/**
 * The app seam for the cover page's CTAs.
 *
 * Kept out of the components so the renderers stay provider-free and can be
 * tested with a fabricated `CoverActions` object. `CoverPage` calls this once
 * and hands the result down.
 */

/**
 * Collapse a slice query into the three states the page can render.
 *
 * A fetch error that still has a fallback list is *ready*: the cover page is
 * an orientation surface, not a place to report that Supabase is down. An
 * error with nothing behind it lands on `empty`, which shows a sentence
 * rather than a broken button.
 */
export function coverSliceState(
  result: ReturnType<typeof useSlices>,
): CoverSliceState {
  let slices: SliceListEntry[] | null
  switch (result.status) {
    case 'loading':
      return { status: 'loading' }
    case 'ready':
      slices = result.data
      break
    case 'error':
      slices = result.fallback
      break
  }

  const first = slices?.[0]
  return first ? { status: 'ready', sliceId: first.id } : { status: 'empty' }
}

export function useCoverActions(): CoverActions {
  const { enterCanvas } = useEditor()
  const { openTab } = useViewState()
  const slices = useSlices()
  // Depend on the two primitives rather than the freshly built object, which
  // would be a new identity on every render and defeat the memo.
  const { status, sliceId } = {
    sliceId: null as string | null,
    ...coverSliceState(slices),
  }

  return useMemo(
    () => ({
      openCanvas: enterCanvas,
      openSlice: (id: string) => openTab({ kind: 'slice', sliceId: id }),
      presentSlice: (id: string) => openTab({ kind: 'present', sliceId: id }),
      slice:
        status === 'ready' && sliceId !== null
          ? { status: 'ready' as const, sliceId }
          : { status: status === 'loading' ? ('loading' as const) : ('empty' as const) },
    }),
    [enterCanvas, openTab, status, sliceId],
  )
}
