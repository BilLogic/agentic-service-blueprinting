/**
 * Storyboard images for a slice screen.
 *
 * The bucket enforces its own size and mime limits, and those are the real
 * ones. These checks exist so the message is useful: a rejection from storage
 * arrives as a status code after the whole file has gone over the wire, which
 * for a 6 MB image is a long wait to be told nothing you can act on.
 */

export const STORYBOARD_BUCKET = 'slice-illustrations'

/** Matches `storage.buckets.file_size_limit` for this bucket. */
export const MAX_STORYBOARD_BYTES = 5 * 1024 * 1024

/**
 * Matches the bucket's `allowed_mime_types` *after* the authoring migration
 * widens it. Before that lands, storage still accepts PNG only — an upload of
 * a JPEG will be refused server-side with a mime error even though this passes
 * it. That is the right way round: loosening here without loosening the bucket
 * would be a lie, and tightening here to match the old bucket would have to be
 * undone the moment the migration runs.
 */
export const ALLOWED_STORYBOARD_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export type StoryboardCheck =
  | { ok: true }
  | { ok: false; problem: string }

/**
 * Check a file before it is sent.
 *
 * **Size is checked first, deliberately.** A 6 MB JPEG fails both rules, and
 * "that image is too large" is the one worth saying — being told the format is
 * wrong sends someone off to convert a file that would still be rejected.
 */
export function checkStoryboardFile(file: {
  size: number
  type: string
  name?: string
}): StoryboardCheck {
  if (file.size > MAX_STORYBOARD_BYTES) {
    return {
      ok: false,
      problem: `That image is ${formatMb(file.size)}, over the ${formatMb(
        MAX_STORYBOARD_BYTES,
      )} limit. Export it smaller and try again.`,
    }
  }
  if (file.size === 0) {
    return { ok: false, problem: 'That file is empty.' }
  }
  if (!ALLOWED_STORYBOARD_TYPES.includes(file.type)) {
    return {
      ok: false,
      problem: `${describeType(file.type)} cannot be used — storyboards must be PNG, JPEG or WebP.`,
    }
  }
  return { ok: true }
}

/**
 * Where the image lives, derived rather than random.
 *
 * One path per screen means replacing an image overwrites it instead of
 * accumulating orphans nothing points at — a slice edited ten times would
 * otherwise leave nine files behind, and nothing in the app would ever list
 * them.
 *
 * The `slices/` prefix is not decoration: the bucket's insert policy matches
 * on the object name, and an unprefixed path is refused. Keyed by the frame's
 * row id rather than its position, because positions move — splitting or
 * reordering frames renumbers them, and a position-keyed image would silently
 * end up on a different frame.
 */
export function storyboardPath(
  sliceId: string,
  itemId: string,
  mimeType: string,
): string {
  const extension = EXTENSIONS[mimeType] ?? 'png'
  return `slices/${sliceId}/${itemId}.${extension}`
}

function formatMb(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`
}

function describeType(type: string): string {
  if (!type) return 'That file'
  const short = type.split('/')[1]?.toUpperCase()
  return short ? `${short} files` : 'That file type'
}
