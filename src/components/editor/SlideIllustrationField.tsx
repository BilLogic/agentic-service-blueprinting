import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
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
import type { Slide } from '@/types/database'
import { resolveSlideStrip } from '@/lib/sliceCells'
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
export function SlideIllustrationField({
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
  const frames = slide ? resolveSlideStrip(blueprint, slide) : []
  const uploads = slide?.illustrations ?? []
  const activeIllustration = slide?.active_illustration ?? null
  const activeFrameCellId = slide?.active_frame_cell_id ?? null
  const showingWholeStrip =
    activeIllustration === null && activeFrameCellId === null

  // The cells whose frames the strip is made of, in the same order, so a
  // thumbnail can name the cell it would pin the slide to.
  const frameCellIds = (slide?.cell_ids ?? []).filter((cellId) =>
    blueprint?.cells.some(
      (cell) => cell.id === cellId && (cell.frame?.trim().length ?? 0) > 0,
    ),
  )

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
      await setSlideImages(client, itemId, {
        illustrations: [...uploads, publicUrl],
        activeFrameCellId: null,
        activeIllustration: publicUrl,
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

  /** Every write from the gallery, so the failure sentence is phrased once. */
  const write = async (next: {
    illustrations: string[]
    activeFrameCellId: string | null
    activeIllustration: string | null
  }) => {
    if (!itemId) return
    setBusy(true)
    setProblem(null)
    try {
      await setSlideImages(client, itemId, next)
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

  const showStrip = () =>
    write({
      illustrations: uploads,
      activeFrameCellId: null,
      activeIllustration: null,
    })

  const showFrame = (cellId: string) =>
    write({
      illustrations: uploads,
      activeFrameCellId: cellId,
      activeIllustration: null,
    })

  const showIllustration = (src: string) =>
    write({
      illustrations: uploads,
      activeFrameCellId: null,
      activeIllustration: src,
    })

  const removeIllustration = (src: string) => {
    // The file is left in the bucket. A merge can copy one slide's pool onto
    // another, and a delete here would break a slide nobody asked to change.
    //
    // Dropping what is being SHOWN falls back to the strip in the same write:
    // the choice must be a member of the pool, so leaving it behind would
    // land on a state the check constraint refuses.
    const remaining = uploads.filter((candidate) => candidate !== src)
    return write({
      illustrations: remaining,
      activeFrameCellId: null,
      activeIllustration: activeIllustration === src ? null : activeIllustration,
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
        The label. Without one the row is three thumbnails and a guess: the
        schema's word for what a slide shows is STRIP, and the reader who
        sees it here is the same one who reads it in the glossary.
      */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-3xs font-medium tracking-wide text-muted-foreground uppercase">
          Strip
        </span>
        <span className="text-3xs text-muted-foreground">
          {showingWholeStrip
            ? frames.length > 0
              ? 'showing all'
              : 'no frames'
            : `showing 1 of ${frames.length + uploads.length}`}
        </span>
      </div>

      <div className="flex gap-1">
        {frameCellIds.map((cellId, index) => {
          const src = frames[index]
          if (!src) return null
          const on = showingWholeStrip || activeFrameCellId === cellId
          return (
            <IconTooltip
              key={cellId}
              label={
                activeFrameCellId === cellId
                  ? 'Showing this frame alone — press to go back to the whole strip'
                  : 'Show this frame alone'
              }
            >
              <button
                type="button"
                disabled={busy}
                aria-pressed={on}
                onClick={() =>
                  activeFrameCellId === cellId ? void showStrip() : void showFrame(cellId)
                }
                className={cn(
                  'min-w-0 flex-1 overflow-hidden rounded-sm border',
                  on ? 'border-ring' : 'border-border opacity-45',
                )}
              >
                <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
              </button>
            </IconTooltip>
          )
        })}

        {uploads.map((src) => {
          const on = activeIllustration === src
          return (
            /*
              Removal used to be a right-click. That is not an affordance: it
              is invisible, it does not exist on a touch screen, and a
              keyboard never reaches it. The button is always drawn on an
              upload — never on a frame, which belongs to a cell and cannot
              be removed from here.
            */
            <div key={src} className="relative min-w-0 flex-1">
              <IconTooltip
                label={on ? 'Showing this illustration' : 'Show this illustration'}
              >
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={on}
                  onClick={() => (on ? void showStrip() : void showIllustration(src))}
                  className={cn(
                    'w-full overflow-hidden rounded-sm border',
                    on ? 'border-ring' : 'border-border opacity-45',
                  )}
                >
                  <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
                </button>
              </IconTooltip>
              <IconTooltip label="Remove this illustration from the slide">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={busy}
                  aria-label="Remove this illustration"
                  className="absolute top-0.5 right-0.5 size-4 bg-background/80 text-muted-foreground hover:text-destructive"
                  onClick={() => void removeIllustration(src)}
                >
                  <X className="size-2.5" aria-hidden />
                </Button>
              </IconTooltip>
            </div>
          )
        })}

        <IconTooltip label="Upload an illustration for this slide">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={busy}
            aria-label="Upload an illustration"
            className="aspect-[4/3] h-auto min-w-0 flex-1 rounded-sm border border-border border-dashed text-muted-foreground"
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

      {/*
        The caption says what the choice DOES, in the schema's words. Counted
        from the cells on every render rather than remembered, so it follows a
        slide whose citations change under it.
      */}
      <p className="text-3xs text-muted-foreground">
        {showingWholeStrip
          ? frames.length > 0
            ? 'The slide shows the frames of the cells it cites.'
            : 'These cells carry no frames. The slide shows its title alone.'
          : `Standing in for ${frames.length} frame${frames.length === 1 ? '' : 's'} from the cells this slide cites.`}
      </p>

      {problem ? (
        <p className="text-3xs text-destructive">{problem}</p>
      ) : null}
    </div>
  )
}
