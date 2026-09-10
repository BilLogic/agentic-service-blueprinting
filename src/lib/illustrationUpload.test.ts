import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import {
  illustrationPath,
  keysInSlideUploadFolder,
  removeSlideUploadObjects,
  slideUploadFolder,
} from '@/lib/illustrationUpload'
import type { Database } from '@/types/database'

describe('slide upload storage paths', () => {
  it('puts each upload under slices/<sliceId>/<slideId>/ with a unique name', () => {
    const first = illustrationPath('slice-1', 'slide-1', 'image/png')
    const second = illustrationPath('slice-1', 'slide-1', 'image/png')
    expect(first).toMatch(/^slices\/slice-1\/slide-1\/.+\.png$/)
    expect(second).toMatch(/^slices\/slice-1\/slide-1\/.+\.png$/)
    expect(first).not.toEqual(second)
  })

  it('does not share a folder across sibling slides', () => {
    expect(slideUploadFolder('slice-1', 'slide-a')).not.toEqual(
      slideUploadFolder('slice-1', 'slide-b'),
    )
  })

  it('names every listed object for removal', () => {
    const folder = slideUploadFolder('slice-1', 'slide-1')
    expect(
      keysInSlideUploadFolder(folder, [{ name: 'a.png' }, { name: 'b.jpg' }]),
    ).toEqual([`${folder}/a.png`, `${folder}/b.jpg`])
  })
})

/**
 * A storage client that lists two objects and removes however many it is told
 * to. `removed` is what the API hands back — and a delete refused by row-level
 * security hands back an empty array with `error: null`, which is the whole
 * reason these tests exist.
 */
function clientRemoving(removed: string[]) {
  const asked: string[][] = []
  const client = {
    storage: {
      from: () => ({
        list: async () => ({ data: [{ name: 'a.png' }, { name: 'b.jpg' }], error: null }),
        remove: async (keys: string[]) => {
          asked.push(keys)
          return { data: removed.map((name) => ({ name })), error: null }
        },
      }),
    },
  } as unknown as SupabaseClient<Database>
  return { client, asked }
}

describe('sweeping a slide folder counts the rows it removed', () => {
  it('resolves when storage removed every object it listed', async () => {
    const { client, asked } = clientRemoving(['a.png', 'b.jpg'])
    await expect(
      removeSlideUploadObjects(client, 'slice-1', 'slide-1'),
    ).resolves.toBeUndefined()
    expect(asked).toEqual([
      ['slices/slice-1/slide-1/a.png', 'slices/slice-1/slide-1/b.jpg'],
    ])
  })

  it('raises when the delete matched nothing, which is not an error', async () => {
    const { client } = clientRemoving([])
    await expect(
      removeSlideUploadObjects(client, 'slice-1', 'slide-1'),
    ).rejects.toThrow(/removed 0 of 2 images/)
  })

  it('raises when only some of the objects went', async () => {
    const { client } = clientRemoving(['a.png'])
    await expect(
      removeSlideUploadObjects(client, 'slice-1', 'slide-1'),
    ).rejects.toThrow(/removed 1 of 2 images/)
  })
})
