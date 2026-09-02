/**
 * How a resource is SHOWN, read from its url at render — never stored.
 *
 * Two pure maps. A link's host decides the verb on its button ("Open in
 * Figma", "Watch on YouTube") and the glyph beside it; an attachment's
 * extension decides whether the preview is an image, a video, audio or a
 * document card. Both have a default, because a map that refuses an unknown
 * host is a button that goes missing the day someone links a new tool.
 *
 * Stored nowhere on purpose (#110). A `host` column would be a second copy
 * of the url's own host, wrong the moment the url is edited; and "what kind
 * of file is this" is a property of the bytes at the other end, which the
 * url already names. Every featured link gets a button, whatever it
 * points at; the panel's Figma special case (`isFigmaUrl`, so that only a
 * Figma link could be "the design") lasts until #111 turns a placement's
 * link into a featured resource.
 */
import { hostOf } from '@/lib/cellResources'
import type { CellResource } from '@/types/blueprint'

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
 * `url` column still exists until #111 copies it onto the placement as a
 * featured link and drops it; the panel reads that column separately for
 * now, and this reads only rows.
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
