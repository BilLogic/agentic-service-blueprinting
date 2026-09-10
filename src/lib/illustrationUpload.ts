import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

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
      problem: `${describeType(file.type)} cannot be used — images must be PNG, JPEG or WebP.`,
    }
  }
  return { ok: true }
}

/**
 * Where one image lives: `slices/<sliceId>/<slideId>/<uuid>.ext`.
 *
 * A NEW name per upload, never an upsert onto a shared path. Two uploads
 * must not collide, and because no object is overwritten a URL's content
 * never changes.
 *
 * Dropping an image from the set leaves the object in the bucket, exactly as
 * clearing the old column already did, and for the same reason — a duplicate
 * can copy one slide's members onto another, and a delete here would break a
 * slide nobody asked to change. Replacing a slice's slides leaves the folders
 * of dropped slides too: the inverse still names those URLs, and undo would
 * restore a row pointing at nothing. Deleting the slice itself is the case
 * that takes the folders — there is no inverse.
 *
 * The `slices/` prefix is not decoration: the bucket's insert policy matches
 * on the object name, and an unprefixed path is refused. Keyed by the slide's
 * row id rather than its position, because positions move.
 *
 * @param {string} sliceId - The slice that owns the slide.
 * @param {string} itemId - The slide's row id.
 * @param {string} mimeType - Used only to pick the file extension.
 * @returns {string} A unique object path in the slice-illustrations bucket.
 */
export function illustrationPath(
  sliceId: string,
  itemId: string,
  mimeType: string,
): string {
  const extension = EXTENSIONS[mimeType] ?? 'png'
  return `${slideUploadFolder(sliceId, itemId)}/${crypto.randomUUID()}.${extension}`
}

/**
 * The storage folder that holds one slide's uploads.
 *
 * @param {string} sliceId - The slice that owns the slide.
 * @param {string} slideId - The slide's row id.
 * @returns {string} `slices/<sliceId>/<slideId>`.
 */
export function slideUploadFolder(sliceId: string, slideId: string): string {
  return `slices/${sliceId}/${slideId}`
}

/**
 * Object keys to delete for every file listed in a slide's upload folder.
 *
 * @param {string} folder - From `slideUploadFolder`.
 * @param {readonly { name: string }[]} listed - What storage returned for that folder.
 * @returns {string[]} Full object keys, one per listed name.
 */
export function keysInSlideUploadFolder(
  folder: string,
  listed: readonly { name: string }[],
): string[] {
  return listed
    .map((object) => object.name.trim())
    .filter((name) => name.length > 0)
    .map((name) => `${folder}/${name}`)
}

/**
 * Delete every object in one slide's upload folder.
 *
 * The `slides` row cascade does not reach storage. Call this when a slice
 * is deleted, or when undo drops a slide the inverse does not restore,
 * while the slide id is still known. Listing an empty or missing folder
 * is a no-op.
 *
 * @param {Client} client - The signed-in Supabase client.
 * @param {string} sliceId - The slice that owns the slide.
 * @param {string} slideId - The slide whose folder is being removed.
 * @returns {Promise<void>} Resolves when the folder is empty or gone.
 */
export async function removeSlideUploadObjects(
  client: Client,
  sliceId: string,
  slideId: string,
): Promise<void> {
  const folder = slideUploadFolder(sliceId, slideId)
  const bucket = client.storage.from(ILLUSTRATION_BUCKET)
  const listed = await bucket.list(folder)
  if (listed.error) throw new Error(listed.error.message)
  const keys = keysInSlideUploadFolder(folder, listed.data ?? [])
  if (keys.length === 0) return
  const removed = await bucket.remove(keys)
  if (removed.error) throw new Error(removed.error.message)
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
