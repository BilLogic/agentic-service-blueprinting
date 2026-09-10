/**
 * Storyboard images for a slice screen.
 *
 * The bucket enforces its own size and mime limits, and those are the real
 * ones. These checks exist so the message is useful: a rejection from storage
 * arrives as a status code after the whole file has gone over the wire, which
 * for a 6 MB image is a long wait to be told nothing you can act on.
 */

export const ILLUSTRATION_BUCKET = 'slice-illustrations'

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
export const ALLOWED_ILLUSTRATION_TYPES = ['image/png', 'image/jpeg', 'image/webp']

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
export function checkIllustrationFile(file: {
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
  if (!ALLOWED_ILLUSTRATION_TYPES.includes(file.type)) {
    return {
      ok: false,
      problem: `${describeType(file.type)} cannot be used — illustrations must be PNG, JPEG or WebP.`,
    }
  }
  return { ok: true }
}

/**
 * Where one image lives: under its slide, under its own name.
 *
 * This used to derive ONE path per slide and upsert onto it, so a replacement
 * overwrote its predecessor and nothing was ever orphaned. That was the right
 * trade while a slide held one image. A slide keeps a POOL now, and a pool
 * whose members share a path is a pool of one.
 *
 * The orphan the old shape avoided is now real and deliberately tolerated:
 * dropping an image from the pool leaves the object in the bucket, exactly as
 * clearing the old column already did, and for the same reason — a merge can
 * copy one slide's pool onto another, and a delete here would break a slide
 * nobody asked to change. Storage is cheap; a slide that renders a broken
 * image is not.
 *
 * Not overwriting also retires the cache-buster. `{src, updated_at}` existed
 * because a URL's content could change under a reader; a name minted per
 * upload means it never can.
 *
 * The `slices/` prefix is not decoration: the bucket's insert policy matches
 * on the object name, and an unprefixed path is refused. Keyed by the slide's
 * row id rather than its position, because positions move — splitting or
 * reordering slides renumbers them, and a position-keyed image would silently
 * end up on a different slide.
 */
export function illustrationPath(
  sliceId: string,
  itemId: string,
  mimeType: string,
): string {
  const extension = EXTENSIONS[mimeType] ?? 'png'
  // A NEW name per upload, not one derived name upserted over. A slide keeps
  // a pool, so a second image must not land on the first — and because no
  // object is ever overwritten, a URL's content never changes and there is
  // nothing for a cache-buster to bust. That is what retired the
  // `{src, updated_at}` shape the single column carried.
  return `slices/${sliceId}/${itemId}/${crypto.randomUUID()}.${extension}`
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
