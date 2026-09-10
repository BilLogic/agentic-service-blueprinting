import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { attachmentObjectKey } from '@/lib/attachmentUpload'
import { illustrationPath } from '@/lib/illustrationUpload'

/**
 * A storage policy and the code that builds object keys must agree.
 *
 * They drifted once and nothing noticed. `illustrationPath` started writing
 * `slices/<slice>/<slide>/<id>.png` when a slide's images became a set, and
 * `slice_illustrations_insert` went on matching two path segments — so every
 * upload was refused by row-level security after the whole file had gone over
 * the wire, and no test in this repo was in a position to say so. The pattern
 * lives in SQL, the key lives in TypeScript, and the only thing that ever
 * compared them was somebody trying to upload a picture.
 *
 * This is that comparison. It reads the patterns out of the migrations, runs
 * the REAL key builders, and asks the pattern about the key it actually
 * produces — including how deep that key is, which is the axis the two drifted
 * on.
 *
 * Registering a bucket here is not optional: a policy that matches on `name`
 * and is not in the table below fails the last test in this file. That is the
 * point — the defect was not this bucket, it was a pattern nobody compared.
 */

const MIGRATIONS = fileURLToPath(new URL('../../supabase/migrations/', import.meta.url))

const UUID = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
]

/**
 * The last definition of every `storage.objects` policy that matches on `name`.
 *
 * Last, not first: a policy is dropped and recreated to widen it, and only the
 * definition at the end of the chain is the one a fresh database gets.
 */
export function storageNamePatterns(files: Array<{ name: string; sql: string }>) {
  const patterns = new Map<string, { pattern: string; from: string }>()
  for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    const opening = /create policy "([a-z_]+)" on storage\.objects/g
    let match: RegExpExecArray | null
    while ((match = opening.exec(file.sql)) !== null) {
      // Every one of these statements ends at the first `;` after it: no
      // pattern or literal in this tree contains one.
      const end = file.sql.indexOf(';', match.index)
      const body = file.sql.slice(match.index, end === -1 ? undefined : end)
      const name = /name ~ '([^']*)'/.exec(body)
      if (name) patterns.set(match[1], { pattern: name[1], from: file.name })
      else patterns.delete(match[1])
    }
  }
  return patterns
}

/** `prefix/<uuid>/…/<uuid>.png` with exactly `depth` slash-separated segments. */
export function keyOfDepth(prefix: string, depth: number): string {
  const middle = UUID.slice(0, depth - 2)
  return [prefix, ...middle, `${UUID[depth - 2]}.png`].join('/')
}

/**
 * Every bucket whose policies match on `name`, with the code that writes its
 * keys and the depths its policies are allowed to admit.
 *
 * `writes` is what the builder produces today. `admits` is every depth the
 * pattern may accept — wider than `writes` only where objects of an older
 * shape are still in the bucket and must stay writable. Adding a depth here
 * is how you say "on purpose".
 */
const BUCKETS = [
  {
    bucket: 'slice-illustrations',
    prefix: 'slices',
    builder: 'illustrationPath',
    policies: [
      'slice_illustrations_insert',
      'slice_illustrations_update',
      'slice_illustrations_delete',
    ],
    key: () => illustrationPath(UUID[0], UUID[1], 'image/png'),
    writes: 4,
    // 3 is the one-image-per-slide key, and the `frame-N` / `character-ref`
    // names beside it. Objects uploaded under it are still named by rows.
    admits: [3, 4],
  },
  {
    bucket: 'cell-attachments',
    prefix: 'cells',
    builder: 'attachmentObjectKey',
    policies: ['cell_attachments_insert', 'cell_attachments_update'],
    key: () => attachmentObjectKey(UUID[0], UUID[1], 'diagram.png'),
    writes: 3,
    admits: [3],
  },
]

const files = readdirSync(MIGRATIONS)
  .filter((name) => name.endsWith('.sql'))
  .map((name) => ({ name, sql: readFileSync(`${MIGRATIONS}${name}`, 'utf8') }))
const PATTERNS = storageNamePatterns(files)

describe.each(BUCKETS)('$bucket keys and policies agree', (bucket) => {
  const key = bucket.key()

  it(`${bucket.builder} writes a ${bucket.writes}-segment key`, () => {
    expect(key.split('/')).toHaveLength(bucket.writes)
    expect(key.startsWith(`${bucket.prefix}/`)).toBe(true)
  })

  it.each(bucket.policies)('%s accepts the key the code writes', (policy) => {
    const found = PATTERNS.get(policy)
    expect(found, `${policy} defines no name pattern in any migration`).toBeDefined()
    // Postgres `~` is POSIX ARE; these patterns use only syntax JavaScript
    // reads the same way. A POSIX-only class would silently mean something
    // else here, so it is refused rather than mistranslated.
    expect(found!.pattern).not.toMatch(/\[\[:|\\[ymMAZ]/)
    expect(
      new RegExp(found!.pattern).test(key),
      `${policy} (${found!.from}) refuses ${bucket.builder}'s key ${key}`,
    ).toBe(true)
  })

  it.each(bucket.policies)('%s admits exactly the declared depths', (policy) => {
    const found = PATTERNS.get(policy)
    expect(found, `${policy} defines no name pattern in any migration`).toBeDefined()
    const pattern = new RegExp(found!.pattern)
    const accepted = [2, 3, 4, 5].filter((depth) =>
      pattern.test(keyOfDepth(bucket.prefix, depth)),
    )
    expect(accepted).toEqual(bucket.admits)
    expect(bucket.admits).toContain(bucket.writes)
  })
})

describe('nothing matches on a key shape no code writes', () => {
  it('every storage policy with a name pattern is registered above', () => {
    const registered = new Set(BUCKETS.flatMap((bucket) => bucket.policies))
    const unregistered = [...PATTERNS.keys()].filter((name) => !registered.has(name))
    expect(
      unregistered,
      'these storage.objects policies match on `name` with no key builder ' +
        'pinned to them, which is how the slice-illustrations pattern went two ' +
        'segments deep while the app wrote three',
    ).toEqual([])
  })
})
