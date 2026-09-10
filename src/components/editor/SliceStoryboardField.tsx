import { useRef, useState } from 'react'
import { ImagePlus, Images, Loader2 } from 'lucide-react'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import {
  ALLOWED_STORYBOARD_TYPES,
  STORYBOARD_BUCKET,
  checkStoryboardFile,
  storyboardPath,
} from '@/lib/storyboardUpload'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/editor/SegmentedControl'
import { useSliceBlueprint } from '@/hooks/useSliceBlueprint'
import {
  parseSliceIllustration,
  resolveSlideStrip,
  sliceIllustrationUrl,
} from '@/lib/sliceCells'
import { setSlideIllustration } from '@/lib/sliceMutations'
import { cn, errorMessage } from '@/lib/utils'
import type { Json } from '@/types/database'

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
export function SliceStoryboardField({
  sliceId,
  itemId,
  illustration,
}: {
  sliceId: string
  /** `slides.id`. Absent means the slide has never been saved. */
  itemId: string | undefined
  illustration: Json | null
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

  const current = parseSliceIllustration(illustration)
  const slide = items.find((item) => item.id === itemId)
  const frames = slide ? resolveSlideStrip(blueprint, slide) : []

  const refresh = () => {
    invalidateQueries(`slice:${sliceId}`)
    invalidateQueries('slices')
  }

  const handleFile = async (file: File) => {
    const check = checkStoryboardFile(file)
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
      const path = storyboardPath(sliceId, itemId, file.type)
      const upload = await client.storage
        .from(STORYBOARD_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upload.error) throw new Error(upload.error.message)

      const {
        data: { publicUrl },
      } = client.storage.from(STORYBOARD_BUCKET).getPublicUrl(path)

      stage = 'row'
      await setSlideIllustration(client, itemId, {
        src: publicUrl,
        updated_at: new Date().toISOString(),
      } as unknown as Json)

      refresh()
    } catch (uploadError) {
      const message = errorMessage(uploadError)
      console.error(`[storyboard] ${stage} failed:`, message)
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

  const handleRemove = async () => {
    if (!itemId) return
    setBusy(true)
    setProblem(null)
    try {
      // The row is cleared but the file is left in place: another slide may
      // point at the same path after a merge, and a delete here would break a
      // slide nobody asked to remove. Storage is cheap; a blank slide is not.
      await setSlideIllustration(client, itemId, null)
      refresh()
    } catch (removeError) {
      // The mutation has already phrased this for a person — a slide that was
      // merged away says so by name, and anything from the database has been
      // through `toAuthoringError`. Showing that sentence beats replacing it
      // with a generic one that sends the reader to the console for the only
      // part that would have told them what to do.
      console.error('[storyboard] remove failed:', errorMessage(removeError))
      setProblem(errorMessage(removeError))
    } finally {
      setBusy(false)
    }
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
        accept={ALLOWED_STORYBOARD_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Cleared so choosing the same file twice still fires a change —
          // the second pick is usually a retry after a failed upload.
          event.target.value = ''
          if (file) void handleFile(file)
        }}
      />

      <SegmentedControl
        aria-label="Slide illustration"
        value={current ? 'picture' : 'frames'}
        onValueChange={(value) => {
          // Selecting the mode you are already in is not a request to redo
          // it — re-picking "One illustration" with one set would reopen the
          // file dialog on every stray click.
          if (value === (current ? 'picture' : 'frames')) return
          if (value === 'frames') void handleRemove()
          else inputRef.current?.click()
        }}
      >
        <SegmentedControlItem value="frames" className="px-2" aria-label="Cells' frames">
          <Images className="size-3" aria-hidden />
          <span className="max-xl:hidden">Cells&rsquo; frames</span>
        </SegmentedControlItem>
        <SegmentedControlItem value="picture" className="px-2" aria-label="One illustration">
          {busy ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-3" aria-hidden />
          )}
          <span className="max-xl:hidden">One illustration</span>
        </SegmentedControlItem>
      </SegmentedControl>

      {current ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            aria-label="Replace the illustration"
            className="overflow-hidden rounded-md border border-border"
          >
            <img
              src={sliceIllustrationUrl(current)}
              alt=""
              className="aspect-[4/3] w-full object-cover"
            />
          </button>
          {/*
            The receipt. `frames.length` is what the illustration is standing in
            for, and it is counted from the cells rather than remembered, so
            it follows a slide whose citations change under it.
          */}
          <p className="text-3xs text-muted-foreground">
            {frames.length > 0
              ? `Standing in for ${frames.length} frame${frames.length === 1 ? '' : 's'} from the cells this slide cites`
              : 'These cells carry no frames, so this illustration stands in for nothing'}
          </p>
        </>
      ) : null}

      {frames.length > 0 ? (
        // Dimmed under an illustration, plain without one: the same row is the
        // default in one state and the receipt in the other.
        <div className={cn('flex gap-1', current && 'opacity-45')}>
          {frames.slice(0, 3).map((frame) => (
            <img
              key={frame}
              src={frame}
              alt=""
              className="aspect-[4/3] min-w-0 flex-1 rounded-sm border border-border object-cover"
            />
          ))}
        </div>
      ) : current ? null : (
        // Previously invisible: a slide whose cells have no frames showed a
        // blank stage and said nothing about why.
        <p className="text-3xs text-muted-foreground">
          These cells carry no frames.
        </p>
      )}

      {problem ? (
        <p className="text-3xs text-destructive">{problem}</p>
      ) : null}
    </div>
  )
}
