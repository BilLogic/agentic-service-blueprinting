/**
 * How a resource is SHOWN, read from its url at render — never stored.
 *
 * Two pure maps. A link's host decides the verb on its button ("Open in
 * Figma", "Watch on YouTube") and the glyph beside it; an attachment's
 * extension decides whether the preview is an image, a video, audio or a
 * document card. Both have a default, because a map that refuses an unknown
 * host is a button that goes missing the day someone links a new tool.
 *
 * Stored nowhere on purpose. A `host` column would be a second copy
 * of the url's own host, wrong the moment the url is edited; and "what kind
 * of file is this" is a property of the bytes at the other end, which the
 * url already names. Every featured link gets a button, whatever it points
 * at. The one Figma special case the panel carried — `isFigmaUrl`, so that
 * only a Figma link could be "the design" — retires with this file: a
 * placement's link is a featured resource now, and electing one vendor's
 * url as the design was a deployment's policy written into a renderer.
 */
import { hostOf } from '@/lib/cellResources'
import type { CellResource, CellTouchpoint } from '@/types/blueprint'

/** The glyph a link's button wears. */
export type LinkGlyph = 'open' | 'watch' | 'document'

export type LinkPresentation = {
  /** The host, without `www.` — what the button names. */
  host: string
  /** The button's words. */
  label: string
  glyph: LinkGlyph
}

/** Hosts the panel knows a verb for. Anything else is "Open link". */
const KNOWN_HOSTS: ReadonlyArray<{
  matches: RegExp
  label: string
  glyph: LinkGlyph
}> = [
  { matches: /(^|\.)figma\.com$/i, label: 'Open in Figma', glyph: 'open' },
  { matches: /(^|\.)(youtube\.com|youtu\.be)$/i, label: 'Watch on YouTube', glyph: 'watch' },
  { matches: /(^|\.)vimeo\.com$/i, label: 'Watch on Vimeo', glyph: 'watch' },
  { matches: /(^|\.)loom\.com$/i, label: 'Watch on Loom', glyph: 'watch' },
  { matches: /(^|\.)notion\.(so|site)$/i, label: 'Open in Notion', glyph: 'document' },
  { matches: /^docs\.google\.com$/i, label: 'Open in Google Docs', glyph: 'document' },
  { matches: /^drive\.google\.com$/i, label: 'Open in Google Drive', glyph: 'document' },
  { matches: /(^|\.)github\.com$/i, label: 'Open on GitHub', glyph: 'open' },
  { matches: /(^|\.)slack\.com$/i, label: 'Open in Slack', glyph: 'open' },
]

export function linkPresentation(url: string): LinkPresentation {
  const host = hostOf(url)
  const known = KNOWN_HOSTS.find((entry) => entry.matches.test(host))
  if (known) return { host, label: known.label, glyph: known.glyph }
  return { host, label: 'Open link', glyph: 'open' }
}

/** What an attachment's preview is made of. */
export type AttachmentMedium = 'image' | 'video' | 'audio' | 'document'

const MEDIA_BY_EXTENSION: Record<string, AttachmentMedium> = {
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image',
  svg: 'image', avif: 'image',
  mp4: 'video', webm: 'video', mov: 'video', m4v: 'video',
  mp3: 'audio', wav: 'audio', m4a: 'audio', ogg: 'audio', aac: 'audio',
}

/**
 * The medium of an attachment, from its extension — or from a content type
 * when the caller has one (an upload knows its own). Unknown is a document:
 * the preview that says the least, and the one that is never wrong.
 */
export function attachmentMedium(
  url: string,
  contentType?: string | null,
): AttachmentMedium {
  const type = contentType?.trim().toLowerCase()
  if (type) {
    if (type.startsWith('image/')) return 'image'
    if (type.startsWith('video/')) return 'video'
    if (type.startsWith('audio/')) return 'audio'
    return 'document'
  }
  const path = url.split(/[?#]/, 1)[0] ?? ''
  const extension = path.split('.').pop()?.toLowerCase() ?? ''
  if (!extension || extension.includes('/')) return 'document'
  return MEDIA_BY_EXTENSION[extension] ?? 'document'
}

export type FeaturedPreview = { url: string; name: string; medium: AttachmentMedium }
export type FeaturedButton = { url: string; name: string } & LinkPresentation

export type FeaturedPresentation = {
  /** The one featured attachment the placement leads with, or nothing. */
  preview: FeaturedPreview | null
  /** Every featured link — the placement's first, then the cell's own. */
  buttons: FeaturedButton[]
}

/**
 * What the panel leads with for one placement at one cell.
 *
 * The placement's featured attachment is the preview; every featured link,
 * the placement's and then the cell's own, is a button. A placement's own
 * `url` column still exists and has not yet been folded into these rows as
 * a featured link; the panel reads that column separately for now, and this
 * reads only rows.
 */
export function featuredPresentation(input: {
  placementId: string | null
  resources: readonly CellResource[]
}): FeaturedPresentation {
  const featured = input.resources.filter(
    (resource) => resource.featured && resource.url?.trim(),
  )
  const ofPlacement = featured.filter(
    (resource) =>
      input.placementId !== null && resource.placementId === input.placementId,
  )
  const ofCell = featured.filter((resource) => resource.placementId === null)

  const attachment = ofPlacement.find((resource) => resource.kind === 'attachment')
  const preview = attachment
    ? {
        url: attachment.url!.trim(),
        name: attachment.name,
        medium: attachmentMedium(attachment.url!.trim()),
      }
    : null

  const buttons: FeaturedButton[] = []
  const seen = new Set<string>()
  const add = (url: string, name: string) => {
    if (seen.has(url)) return
    seen.add(url)
    buttons.push({ url, name, ...linkPresentation(url) })
  }
  for (const resource of [...ofPlacement, ...ofCell]) {
    if (resource.kind === 'link') add(resource.url!.trim(), resource.name)
  }

  return { preview, buttons }
}

/** The one picture a cell leads with, and where it came from. */
export type FeaturedImage = {
  url: string
  name: string
  source: 'attachment' | 'logo'
}

/**
 * A cell's featured image: its own featured attachment if it has one;
 * otherwise the logo of the touchpoint it is placed on. Nothing else is one.
 *
 * Asked about one placement, only that placement's attachment and logo count.
 * Asked about the cell, its placement-less attachment leads, then any of its
 * placements' in the order the rows arrive, and the logo is the first placed
 * touchpoint that carries one. The logo is read off the registry row each
 * time and never written into `resources`: one logo serves every placement,
 * and a copy per placement would drift from it.
 */
export function featuredImage(input: {
  resources: readonly CellResource[]
  touchpoints: readonly CellTouchpoint[]
  placement?: CellTouchpoint | null
}): FeaturedImage | null {
  const scoped = input.placement
  const attachments = input.resources.filter(
    (resource) =>
      resource.featured && resource.kind === 'attachment' && resource.url?.trim(),
  )
  const own = scoped
    ? attachments.find(
        (resource) => scoped.id !== null && resource.placementId === scoped.id,
      )
    : (attachments.find((resource) => resource.placementId === null) ??
      attachments[0])
  if (own) return { url: own.url!.trim(), name: own.name, source: 'attachment' }

  const logo = (scoped ? [scoped] : input.touchpoints).find((placement) =>
    placement.iconUrl?.trim(),
  )
  return logo ? { url: logo.iconUrl!.trim(), name: logo.name, source: 'logo' } : null
}

/**
 * The logos a cell inherits from the touchpoints placed on it, each once.
 * Derived at read, never stored: the Resources tab lists them read-only.
 */
export function touchpointLogos(
  touchpoints: readonly CellTouchpoint[],
): Array<{ url: string; name: string }> {
  const logos: Array<{ url: string; name: string }> = []
  for (const placement of touchpoints) {
    const url = placement.iconUrl?.trim()
    if (url && !logos.some((logo) => logo.url === url)) {
      logos.push({ url, name: placement.name })
    }
  }
  return logos
}
