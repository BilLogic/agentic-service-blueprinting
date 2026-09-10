import { useRef, useState } from 'react'
import { Check, ImagePlus, Loader2, X } from 'lucide-react'
import { ZoomableImage, type ZoomableImageSibling } from '@/components/blueprint/ZoomableImage'
import { Button } from '@/components/ui/button'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import {
  ALLOWED_ILLUSTRATION_TYPES,
  ILLUSTRATION_BUCKET,
  checkIllustrationFile,
  illustrationPath,
} from '@/lib/illustrationUpload'
import { useSliceBlueprint } from '@/hooks/useSliceBlueprint'
import type { SlideWithStrip } from '@/hooks/useSlice'

import { setSlideImages } from '@/lib/sliceMutations'
import { cn, errorMessage } from '@/lib/utils'

/**
 * The image for one saved slide.
 *
 * Only offered on a slide that has been saved, because the image is stored at
 * a path derived from the slide's row id — an unsaved slide has no id, and
 * inventing one would leave a file nothing ever points at. That is not a
 * limitation worth working around: the slide is one Save away, and an
 * image for a slide that may still be split or merged is guesswork.
 *
 * The file is checked before it is sent. Storage enforces the real limits and
 * would reject the same file, but only after the whole thing has crossed the
 * wire and with a status code rather than a sentence — for a 5 MB image that
 * is a long wait to be told nothing actionable.
 *
 * Upload is an upsert onto the derived path, so replacing an image overwrites
 * it. The `updated_at` stamp written alongside is what busts the CDN cache;
 * without it a replaced image would keep showing the old one for as
 * long as the edge held it.
 *
 * ── Why the field shows the strip it is replacing ────────────────────────
 *
 * An image here does not JOIN the slide's strip, it REPLACES it: set the
 * column and `SlicePresentation` drops the frames of the cited cells
 * entirely. That is the behaviour authors want — one drawn illustration instead of
 * three fragments — but it used to happen in silence. The empty state was a
 * bare button that never mentioned the frames the slide was already showing,
 * and the set state never mentioned the frames it had stopped showing, so a
 * slide could differ from its own cells with nothing reporting it.
 *
 * The glossary is the reason this matters rather than being a nicety: it says
 * what a slide shows IS the strip of the cells it cites, "so a slide and the
 * board cannot disagree". They could. Now the disagreement is named where it
 * is made — the mode is a segmented pair rather than an implication, and the
 * displaced frames stay on screen underneath as the receipt.
 */
/**
 * The tick that puts one image in the slide's strip.
 *
 * Its own control rather than a click on the thumbnail, because the thumbnail
 * already has a job: opening the image, the way every other image in this app
 * opens. Two meanings on one target would make both of them guesses.
 */
function StripTick({
  on,
  busy,
  label,
  onToggle,
}: {
  on: boolean
  busy: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <IconTooltip label={label}>
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        aria-label={label}
        disabled={busy}
        onClick={onToggle}
        className={cn(
          'absolute top-0.5 left-0.5 grid size-4 place-items-center rounded-sm border',
          on
            ? 'border-ring bg-background text-foreground'
            : 'border-border bg-background/80 text-transparent hover:text-muted-foreground',
        )}
      >
        <Check className="size-2.5" aria-hidden />
      </button>
    </IconTooltip>
  )
}

export function SlideIllustrationField({
  sliceId,
  itemId,
  saved,
}: {
  sliceId: string
  /** `slides.id`. Absent means the slide has never been saved. */
  itemId: string | undefined
  /** The SAVED row, or null for a slide that has never been written. */
  saved: SlideWithStrip | null
}) {
  const { client, canWrite } = useSupabase()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  // Same hook the presentation resolves through, and every card on the slice
  // shares its fetches: `useSlice` is keyed on the slice, so N cards are one
  // request. The strip is what this slide shows when no illustration stands
  // in. Above the reader branch, because a hook below an early return runs in
  // one render and not the next.
  const { blueprint, items } = useSliceBlueprint(sliceId)

  if (!client || !canWrite) return null

  const slide = items.find((item) => item.id === itemId) ?? saved
  const uploads = slide?.images ?? []

  // The cells this slide cites that actually carry a frame, in citation
  // order. A cell without one has nothing to offer the strip and would be an
  // empty box a reader could tick.
  const frameCells = (slide?.cell_ids ?? []).filter((cellId) =>
    blueprint?.cells.some(
      (cell) => cell.id === cellId && (cell.frame?.trim().length ?? 0) > 0,
    ),
  )
  const frameSrcById = new Map(
    (blueprint?.cells ?? [])
      .filter((cell) => (cell.frame?.trim().length ?? 0) > 0)
      .map((cell) => [cell.id, cell.frame!.trim()]),
  )

  // What is ticked, in the order somebody put it in. An EMPTY strip is the
  // default rather than a missing value: the slide shows the frames of the
  // cells it cites, which is what most slides do.
  const chosen = [...(slide?.slide_strip ?? [])].sort(
    (a, b) => a.position - b.position,
  )
  const chosenCells = new Set(
    chosen.map((member) => member.cell_id).filter((id): id is string => id !== null),
  )
  const chosenImages = new Set(
    chosen
      .map((member) => member.image_url)
      .filter((url): url is string => url !== null),
  )
  const showingCitedCells = chosen.length === 0

  // One ordered group for the viewer to swipe: the cited frames, then the
  // slide's own images, which is the order the row draws them in. `siblings`
  // is the same array for every tile — the index is which one was opened.
  const siblings: ZoomableImageSibling[] = [
    ...frameCells.map((cellId, index) => ({
      src: frameSrcById.get(cellId) ?? '',
      alt: `Frame from cited cell ${index + 1}`,
    })),
    ...uploads.map((src, index) => ({
      src,
      alt: `Uploaded image ${index + 1}`,
    })),
  ]

  /** The strip as the mutation wants it, with one member toggled. */
  const stripWith = (
    member: { cellId: string } | { imageUrl: string },
    on: boolean,
  ) => {
    const current = chosen.map((entry) =>
      entry.cell_id ? { cellId: entry.cell_id } : { imageUrl: entry.image_url! },
    )
    const same = (entry: { cellId?: string; imageUrl?: string }) =>
      'cellId' in member
        ? entry.cellId === member.cellId
        : entry.imageUrl === member.imageUrl
    // Ticking APPENDS rather than inserting in citation order: the order is
    // the author's, and a tick that reshuffled what they already arranged
    // would be undoing their work to be tidy.
    return on ? [...current, member] : current.filter((entry) => !same(entry))
  }

  const refresh = () => {
    invalidateQueries(`slice:${sliceId}`)
    invalidateQueries('slices')
  }

  const handleFile = async (file: File) => {
    const check = checkIllustrationFile(file)
    if (!check.ok) {
      setProblem(check.problem)
      return
    }
    if (!itemId) return

    setBusy(true)
    setProblem(null)
    // Which half failed. Two failures reach the same catch and they need
    // different words: storage answers with its own raw text, which a person
    // cannot act on, while the row write answers with a sentence that has
    // already been phrased for one — including "that slide no longer exists",
    // which is the whole point of routing the write through the mutation.
    // Replacing that with the generic apology would throw away the only
    // message here that says what to do next.
    let stage: 'upload' | 'row' = 'upload'
    try {
      const path = illustrationPath(sliceId, itemId, file.type)
      const upload = await client.storage
        .from(ILLUSTRATION_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upload.error) throw new Error(upload.error.message)

      const {
        data: { publicUrl },
      } = client.storage.from(ILLUSTRATION_BUCKET).getPublicUrl(path)

      stage = 'row'
      // An upload JOINS the pool and becomes what the slide shows, because
      // that is what somebody who just picked a file meant. It does not
      // displace an earlier upload: the pool is why this column is an array.
      // The upload joins the pool AND what the slide shows, because that is
      // what somebody who just picked a file meant. It displaces nothing: a
      // strip already holding members keeps them and gains one.
      await setSlideImages(client, itemId, {
        images: [...uploads, publicUrl],
        strip: [...stripWith({ imageUrl: publicUrl }, true)],
      })

      refresh()
    } catch (uploadError) {
      const message = errorMessage(uploadError)
      console.error(`[illustration] ${stage} failed:`, message)
      if (stage === 'row') {
        setProblem(message)
      } else {
        // The bucket still allows PNG only until the authoring migration
        // widens it, so a JPEG that passes the local check can still be
        // refused here. Saying so is more use than the storage error text.
        setProblem(
          /mime|content type/i.test(message)
            ? 'Storage refused that format. Until the authoring migration runs, only PNG is accepted.'
            : 'That image could not be saved. The details are in the console.',
        )
      }
    } finally {
      setBusy(false)
    }
  }

  /** Every write from the strip, so the failure sentence is phrased once. */
  const write = async (next: {
    images?: string[]
    strip?: Array<{ cellId: string } | { imageUrl: string }>
  }) => {
    if (!itemId) return
    setBusy(true)
    setProblem(null)
    try {
      await setSlideImages(client, itemId, {
        images: next.images ?? uploads,
        strip:
          next.strip ??
          chosen.map((entry) =>
            entry.cell_id
              ? { cellId: entry.cell_id }
              : { imageUrl: entry.image_url! },
          ),
      })
      refresh()
    } catch (writeError) {
      // The mutation has already phrased this for a person — a slide that was
      // merged away says so by name, and anything from the database has been
      // through `toAuthoringError`. Showing that sentence beats replacing it
      // with a generic one that sends the reader to the console for the only
      // part that would have told them what to do.
      console.error('[illustration] write failed:', errorMessage(writeError))
      setProblem(errorMessage(writeError))
    } finally {
      setBusy(false)
    }
  }

  const removeImage = (src: string) => {
    // The file is left in the bucket. A merge can copy one slide's images
    // onto another, and a delete here would break a slide nobody asked to
    // change.
    //
    // Its strip member goes in the SAME write: a member may only name an
    // image the slide has, so dropping one and leaving the other would land
    // on a state the database refuses.
    return write({
      images: uploads.filter((candidate) => candidate !== src),
      strip: stripWith({ imageUrl: src }, false),
    })
  }

  // Unsaved slide: no control and no explanatory title. The affordance
  // appears once the slide is saved; a permanent sentence about it on every
  // draft card was noise repeated per slide.
  if (!itemId) return null

  return (
    <div className="flex flex-col gap-1" onClick={(event) => event.stopPropagation()}>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_ILLUSTRATION_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Cleared so choosing the same file twice still fires a change —
          // the second pick is usually a retry after a failed upload.
          event.target.value = ''
          if (file) void handleFile(file)
        }}
      />

      {/*
        The label. Without one the row is thumbnails and a guess. STRIP is
        what the model calls the images a slide shows — the same word a step's
        row of frames carries, because it is the same thing at a different
        grain.
      */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-3xs font-medium tracking-wide text-muted-foreground uppercase">
          Strip
        </span>
        <span className="text-3xs text-muted-foreground">
          {showingCitedCells
            ? frameCells.length > 0
              ? 'the cited cells'
              : 'no frames'
            : `${chosen.length} of ${frameCells.length + uploads.length}`}
        </span>
      </div>

      {/*
        FIXED tiles, not `flex-1`. Sized by the tile and never by the count,
        so one image and six images draw the same box — a lone `+` that
        stretched to the card's whole width said "this is a big empty thing"
        about a slide that simply has no frames yet. The row scrolls instead.

        Three targets per tile, which is why the tile cannot also be small:
        the IMAGE opens the viewer (the same `ZoomableImage` every other
        image in the app opens through, siblings and all), the TICK includes
        it in the strip, and `×` removes an upload from the pool entirely.
      */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {frameCells.map((cellId, index) => {
          const src = frameSrcById.get(cellId)
          if (!src) return null
          const on = chosenCells.has(cellId)
          return (
            <div key={cellId} className="relative w-16 shrink-0">
              <ZoomableImage
                src={src}
                alt={`Frame from cited cell ${index + 1}`}
                triggerLabel={`Open the frame from cited cell ${index + 1}`}
                triggerClassName={cn(
                  'block w-full overflow-hidden rounded-sm border',
                  on || showingCitedCells
                    ? 'border-ring'
                    : 'border-border opacity-45',
                )}
                siblings={siblings}
                siblingIndex={index}
              >
                <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
              </ZoomableImage>
              <StripTick
                on={on}
                busy={busy}
                label={
                  on
                    ? 'Stop showing this frame'
                    : 'Show this frame on the slide'
                }
                onToggle={() => void write({ strip: stripWith({ cellId }, !on) })}
              />
            </div>
          )
        })}

        {uploads.map((src, index) => {
          const on = chosenImages.has(src)
          return (
            <div key={src} className="relative w-16 shrink-0">
              <ZoomableImage
                src={src}
                alt={`Uploaded image ${index + 1}`}
                triggerLabel={`Open uploaded image ${index + 1}`}
                triggerClassName={cn(
                  'block w-full overflow-hidden rounded-sm border',
                  on ? 'border-ring' : 'border-border opacity-45',
                )}
                siblings={siblings}
                siblingIndex={frameCells.length + index}
              >
                <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
              </ZoomableImage>
              <StripTick
                on={on}
                busy={busy}
                label={on ? 'Stop showing this image' : 'Show this image on the slide'}
                onToggle={() => void write({ strip: stripWith({ imageUrl: src }, !on) })}
              />
              <IconTooltip label="Remove this image from the slide">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={busy}
                  aria-label="Remove this image"
                  className="absolute top-0.5 right-0.5 size-4 bg-background/80 text-muted-foreground hover:text-destructive"
                  onClick={() => void removeImage(src)}
                >
                  <X className="size-2.5" aria-hidden />
                </Button>
              </IconTooltip>
            </div>
          )
        })}

        <IconTooltip label="Upload an image for this slide">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={busy}
            aria-label="Upload an image"
            className="aspect-[4/3] h-auto w-16 shrink-0 rounded-sm border border-border border-dashed text-muted-foreground"
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="size-3" aria-hidden />
            )}
          </Button>
        </IconTooltip>
      </div>

      <p className="text-3xs text-muted-foreground">
        {showingCitedCells
          ? frameCells.length > 0
            ? 'The slide shows the frames of the cells it cites. Tick any to choose instead.'
            : 'These cells carry no frames. The slide shows its title alone.'
          : 'The slide shows what is ticked, in the order it was ticked.'}
      </p>

      {problem ? (
        <p className="text-3xs text-destructive">{problem}</p>
      ) : null}
    </div>
  )
}
