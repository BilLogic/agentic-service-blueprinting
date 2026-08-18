import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import {
  ALLOWED_STORYBOARD_TYPES,
  STORYBOARD_BUCKET,
  checkStoryboardFile,
  storyboardPath,
} from '@/lib/storyboardUpload'
import {
  parseSliceIllustration,
  sliceIllustrationUrl,
} from '@/lib/sliceCells'
import type { Json } from '@/types/database'

/**
 * The storyboard image for one saved frame.
 *
 * Only offered on a frame that has been saved, because the image is stored at
 * a path derived from the frame's row id — an unsaved frame has no id, and
 * inventing one would leave a file nothing ever points at. That is not a
 * limitation worth working around: the frame is one Save away, and a
 * storyboard for a frame that may still be split or merged is guesswork.
 *
 * The file is checked before it is sent. Storage enforces the real limits and
 * would reject the same file, but only after the whole thing has crossed the
 * wire and with a status code rather than a sentence — for a 5 MB image that
 * is a long wait to be told nothing actionable.
 *
 * Upload is an upsert onto the derived path, so replacing an image overwrites
 * it. The `updated_at` stamp written alongside is what busts the CDN cache;
 * without it a replaced storyboard would keep showing the old picture for as
 * long as the edge held it.
 */
export function SliceStoryboardField({
  sliceId,
  itemId,
  illustration,
}: {
  sliceId: string
  /** `slice_items.id`. Absent means the frame has never been saved. */
  itemId: string | undefined
  illustration: Json | null
}) {
  const { client, canWrite } = useSupabase()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  if (!client || !canWrite) return null

  const current = parseSliceIllustration(illustration)

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
    try {
      const path = storyboardPath(sliceId, itemId, file.type)
      const upload = await client.storage
        .from(STORYBOARD_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upload.error) throw new Error(upload.error.message)

      const {
        data: { publicUrl },
      } = client.storage.from(STORYBOARD_BUCKET).getPublicUrl(path)

      const { error } = await client
        .from('slice_items')
        .update({
          illustration: {
            src: publicUrl,
            updated_at: new Date().toISOString(),
          } as unknown as Json,
        })
        .eq('id', itemId)
      if (error) throw new Error(error.message)

      refresh()
    } catch (uploadError) {
      // The bucket still allows PNG only until the authoring migration widens
      // it, so a JPEG that passes the local check can still be refused here.
      // Saying so is more use than the storage error text.
      const message =
        uploadError instanceof Error ? uploadError.message : String(uploadError)
      console.error('[storyboard] upload failed:', message)
      setProblem(
        /mime|content type/i.test(message)
          ? 'Storage refused that format. Until the authoring migration runs, only PNG is accepted.'
          : 'That image could not be saved. The details are in the console.',
      )
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    if (!itemId) return
    setBusy(true)
    setProblem(null)
    try {
      // The row is cleared but the file is left in place: another frame may
      // point at the same path after a merge, and a delete here would break a
      // picture nobody asked to remove. Storage is cheap; a blank slide is not.
      const { error } = await client
        .from('slice_items')
        .update({ illustration: null })
        .eq('id', itemId)
      if (error) throw new Error(error.message)
      refresh()
    } catch (removeError) {
      console.error(
        '[storyboard] remove failed:',
        removeError instanceof Error ? removeError.message : removeError,
      )
      setProblem('That image could not be removed. The details are in the console.')
    } finally {
      setBusy(false)
    }
  }

  // Unsaved frame: no control and no explanatory caption. The affordance
  // appears once the frame is saved; a permanent sentence about it on every
  // draft card was noise repeated per frame.
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

      {current ? (
        <div className="relative overflow-hidden rounded-md border border-border">
          <img
            src={sliceIllustrationUrl(current)}
            alt=""
            className="aspect-[4/3] w-full object-cover"
          />
          <IconTooltip label="Remove the storyboard image" side="left">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Remove storyboard image"
              disabled={busy}
              className="absolute top-1 right-1 bg-background/80 text-muted-foreground hover:text-destructive"
              onClick={handleRemove}
            >
              <X className="size-2.5" />
            </Button>
          </IconTooltip>
        </div>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={busy}
        className="h-6 justify-start px-1.5 text-3xs text-muted-foreground hover:text-foreground"
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 className="size-3 animate-spin" aria-hidden />
        ) : (
          <ImagePlus className="size-3" aria-hidden />
        )}
        {current ? 'Replace storyboard' : 'Add storyboard'}
      </Button>

      {problem ? (
        <p className="text-3xs text-destructive">{problem}</p>
      ) : null}
    </div>
  )
}
