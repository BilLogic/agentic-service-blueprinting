import { useState } from 'react'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { ZoomableImage } from '@/components/blueprint/ZoomableImage'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { useSliceBlueprint } from '@/hooks/useSliceBlueprint'
import {
  replaceSlideImageSet,
  type SlideImageMemberInput,
} from '@/lib/sliceMutations'
import { frameForCitedCell } from '@/lib/slideImages'
import { cn, errorMessage } from '@/lib/utils'
import type { Slide } from '@/types/database'

/**
 * One cited cell that can appear in the slide's image set.
 */
type CitedFrame = {
  cellId: string
  src: string
}

/**
 * Reindex members to a dense 0..n-1 sequence.
 *
 * @param {Array<{ cell_id: string | null; image_url: string | null }>} members
 * @returns {SlideImageMemberInput[]} Members with sequential positions.
 */
function withPositions(
  members: Array<{ cell_id: string | null; image_url: string | null }>,
): SlideImageMemberInput[] {
  return members.map((member, position) => ({
    position,
    cell_id: member.cell_id,
    image_url: member.image_url,
  }))
}

/**
 * The image set for one saved slide.
 *
 * Tiles are the cited cells' frames plus any `image_url` members already on
 * the row. The first tick or untick writes an explicit set
 * (`shows_all_images` false). Cell frames cannot be removed from the slide
 * here — only unticked. This list is the slide's images, not a step's frames
 * across lanes.
 *
 * Only offered on a saved slide, because members are keyed by `slides.id`.
 */
export function SlideImagesField({
  sliceId,
  itemId,
  saved,
}: {
  sliceId: string
  /** `slides.id`. Absent means the slide has never been saved. */
  itemId: string | undefined
  /** The SAVED row, or null for a slide that has never been written. */
  saved: Slide | null
}) {
  const { client, canWrite } = useSupabase()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const { blueprint, items } = useSliceBlueprint(sliceId)

  if (!client || !canWrite) return null
  if (!itemId) return null

  const slide = items.find((item) => item.id === itemId) ?? saved
  const citedFrames: CitedFrame[] = (slide?.cell_ids ?? [])
    .map((cellId) => {
      const src = frameForCitedCell(blueprint, cellId)
      return src ? { cellId, src } : null
    })
    .filter((entry): entry is CitedFrame => entry !== null)

  const urlMembers = [...(slide?.slide_images ?? [])]
    .filter((row) => row.image_url)
    .sort((left, right) => left.position - right.position)

  const showingAll = slide?.shows_all_images ?? true
  const selectedCellIds = showingAll
    ? new Set(citedFrames.map((frame) => frame.cellId))
    : new Set(
        (slide?.slide_images ?? [])
          .map((row) => row.cell_id)
          .filter((cellId): cellId is string => Boolean(cellId)),
      )
  const selectedUrls = showingAll
    ? new Set<string>()
    : new Set(
        (slide?.slide_images ?? [])
          .map((row) => row.image_url)
          .filter((url): url is string => Boolean(url)),
      )

  const siblings = [
    ...citedFrames.map((frame) => ({ src: frame.src, alt: '' })),
    ...urlMembers.map((row) => ({ src: row.image_url ?? '', alt: '' })),
  ].filter((sibling) => sibling.src.length > 0)

  const refresh = () => {
    invalidateQueries(`slice:${sliceId}`)
    invalidateQueries('slices')
  }

  /**
   * Persist an explicit image set. Every editor gesture leaves the slide
   * authored rather than returning it to the untouched default.
   */
  const writeExplicit = async (
    ordered: Array<{ cell_id: string | null; image_url: string | null }>,
  ) => {
    setBusy(true)
    setProblem(null)
    try {
      await replaceSlideImageSet(client, itemId, {
        showsAllImages: false,
        members: withPositions(ordered),
      })
      refresh()
    } catch (writeError) {
      console.error('[slide-images] write failed:', errorMessage(writeError))
      setProblem(errorMessage(writeError))
    } finally {
      setBusy(false)
    }
  }

  /**
   * Current explicit members in display order, used as the base when toggling.
   */
  const explicitOrder = (): Array<{ cell_id: string | null; image_url: string | null }> => {
    if (!showingAll) {
      return [...(slide?.slide_images ?? [])]
        .sort((left, right) => left.position - right.position)
        .map((row) => ({ cell_id: row.cell_id, image_url: row.image_url }))
    }
    return citedFrames.map((frame) => ({
      cell_id: frame.cellId,
      image_url: null,
    }))
  }

  const toggleCell = (cellId: string) => {
    const current = explicitOrder()
    const on = selectedCellIds.has(cellId)
    const next = on
      ? current.filter((member) => member.cell_id !== cellId)
      : [...current, { cell_id: cellId, image_url: null }]
    void writeExplicit(next)
  }

  const toggleUrl = (url: string) => {
    const current = explicitOrder()
    const on = selectedUrls.has(url)
    const next = on
      ? current.filter((member) => member.image_url !== url)
      : [...current, { cell_id: null, image_url: url }]
    void writeExplicit(next)
  }

  return (
    <div className="flex flex-col gap-1" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-3xs font-medium tracking-wide text-muted-foreground uppercase">
          Images
        </span>
        <span className="text-3xs text-muted-foreground">
          {showingAll
            ? citedFrames.length > 0
              ? 'showing all cited frames'
              : 'no frames'
            : `showing ${selectedCellIds.size + selectedUrls.size}`}
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {citedFrames.map((frame, index) => {
          const on = selectedCellIds.has(frame.cellId)
          return (
            <div key={frame.cellId} className="relative w-16 shrink-0">
              <ZoomableImage
                src={frame.src}
                alt=""
                triggerLabel="Enlarge frame"
                siblings={siblings}
                siblingIndex={index}
                triggerClassName={cn(
                  'w-16 shrink-0 overflow-hidden rounded-sm border',
                  on ? 'border-ring' : 'border-border opacity-45',
                )}
              >
                <img src={frame.src} alt="" className="aspect-[4/3] w-full object-cover" />
              </ZoomableImage>
              <IconTooltip
                label={on ? 'Included in this slide’s images' : 'Add this frame to the slide'}
              >
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={on}
                  aria-label={on ? 'Untick this frame' : 'Tick this frame'}
                  onClick={() => toggleCell(frame.cellId)}
                  className={cn(
                    'absolute right-0.5 bottom-0.5 size-4 rounded-sm border bg-background/90 text-[10px] leading-none',
                    on ? 'border-ring' : 'border-border',
                  )}
                >
                  {on ? '✓' : ''}
                </button>
              </IconTooltip>
            </div>
          )
        })}

        {urlMembers.map((row, index) => {
          const src = row.image_url ?? ''
          if (!src) return null
          const on = selectedUrls.has(src)
          return (
            <div key={src} className="relative w-16 shrink-0">
              <ZoomableImage
                src={src}
                alt=""
                triggerLabel="Enlarge image"
                siblings={siblings}
                siblingIndex={citedFrames.length + index}
                triggerClassName={cn(
                  'w-16 shrink-0 overflow-hidden rounded-sm border',
                  on ? 'border-ring' : 'border-border opacity-45',
                )}
              >
                <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
              </ZoomableImage>
              <IconTooltip
                label={on ? 'Included in this slide’s images' : 'Add this image to the slide'}
              >
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={on}
                  aria-label={on ? 'Untick this image' : 'Tick this image'}
                  onClick={() => toggleUrl(src)}
                  className={cn(
                    'absolute right-0.5 bottom-0.5 size-4 rounded-sm border bg-background/90 text-[10px] leading-none',
                    on ? 'border-ring' : 'border-border',
                  )}
                >
                  {on ? '✓' : ''}
                </button>
              </IconTooltip>
            </div>
          )
        })}
      </div>

      <p className="text-3xs text-muted-foreground">
        {showingAll
          ? citedFrames.length > 0
            ? 'The slide shows every cited cell’s frame, and will pick up newly cited cells.'
            : 'These cells carry no frames. The slide shows its title alone.'
          : selectedCellIds.size + selectedUrls.size === 0
            ? 'This slide shows no images.'
            : 'This slide shows exactly the images ticked here.'}
      </p>

      {problem ? <p className="text-3xs text-destructive">{problem}</p> : null}
    </div>
  )
}
