import { ExternalLink, FileText, Play } from 'lucide-react'
import { ZoomableImage } from '@/components/blueprint/ZoomableImage'
import { cn } from '@/lib/utils'
import { safeExternalHref } from '@/lib/sliceCells'
import type {
  FeaturedButton,
  FeaturedPreview,
  LinkGlyph,
} from '@/lib/resourcePresentation'

const GLYPH: Record<LinkGlyph, typeof ExternalLink> = {
  open: ExternalLink,
  watch: Play,
  document: FileText,
}

/**
 * What a placement leads with: its featured attachment as the preview, and
 * one button per featured link, named by host.
 *
 * Nothing here decides what is featured or what a host is called — both are
 * read off the resources in `resourcePresentation.ts`, which is the seam the
 * tests hold. This only draws: an image is an image, a video is a `<video>`
 * with its own controls and a play glyph over the poster, audio is an
 * `<audio>`, and a file the browser cannot show inline is a card that opens
 * it. Buttons are plain anchors — a new tab, `noopener` — so what they do is
 * what every link on the page does.
 */
export function FeaturedPreviewFrame({
  preview,
  frameClassName,
  mediaClassName,
}: {
  preview: FeaturedPreview
  frameClassName?: string
  mediaClassName?: string
}) {
  const href = safeExternalHref(preview.url) ?? preview.url
  if (preview.medium === 'video') {
    return (
      <div className={cn('group relative', frameClassName)} data-featured-preview="video">
        <video src={preview.url} controls preload="metadata" className={mediaClassName} />
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-70"
          aria-hidden
        >
          <Play className="size-8 text-white drop-shadow" />
        </span>
      </div>
    )
  }
  if (preview.medium === 'audio') {
    return (
      <div className={cn('flex w-full items-center', frameClassName)} data-featured-preview="audio">
        <audio src={preview.url} controls preload="metadata" className="w-full" />
      </div>
    )
  }
  if (preview.medium === 'document') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-foreground/90 hover:bg-accent',
          frameClassName,
        )}
        data-featured-preview="document"
      >
        <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 truncate">{preview.name}</span>
      </a>
    )
  }
  /*
    A featured image opens. A featured image is the one picture a placement
    chose to lead with, so a preview that could only ever be looked at at
    thumbnail size was a promise the panel did not keep.

    The trigger sits INSIDE the frame rather than replacing it: the frame is
    what fixes every preview to one 4:3 box, the media class positions
    against it, and `data-featured-preview` is the marker that says which
    medium was drawn. `relative` is stated here rather than assumed from
    `frameClassName`, which is optional.

    The name is the resource's own, and the inner image keeps `alt=""` — the
    button carries the name now, and announcing it twice is noise.
  */
  return (
    <div
      className={cn('relative', frameClassName)}
      data-featured-preview="image"
    >
      <ZoomableImage
        src={preview.url}
        alt={preview.name}
        triggerLabel={`Expand: ${preview.name}`}
        triggerClassName="absolute inset-0 block cursor-pointer"
      >
        <img src={preview.url} alt="" className={mediaClassName} />
      </ZoomableImage>
    </div>
  )
}

export function FeaturedButtons({
  buttons,
  className,
}: {
  buttons: readonly FeaturedButton[]
  className?: string
}) {
  const safe = buttons.filter((button) => safeExternalHref(button.url))
  if (safe.length === 0) return null
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)} data-featured-buttons="">
      {safe.map((button) => {
        const Glyph = GLYPH[button.glyph]
        return (
          <a
            key={button.url}
            href={safeExternalHref(button.url) ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            title={button.host}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground',
              'transition-colors hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none',
            )}
          >
            <Glyph className="size-3 shrink-0 text-muted-foreground" aria-hidden />
            {button.label}
          </a>
        )
      })}
    </div>
  )
}
