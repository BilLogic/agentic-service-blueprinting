import { cpSync, mkdtempSync, readdirSync, rmSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  COVER_ASSET_MANIFEST,
  syncCoverAssets,
} from '../sync-cover-assets.mjs'

// Pins the asset pipeline (plan §6 U2): every manifest figure copied from
// docs/assets/ into the destination, and a loud, named failure on a missing
// source — a cover page with a broken figure should never build.

const ASSETS_DIR = fileURLToPath(new URL('../../docs/assets', import.meta.url))

const tempDirs = []
const tempDir = (prefix) => {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop(), { recursive: true, force: true })
})

describe('sync-cover-assets', () => {
  it('copies all eleven manifest figures into the destination', () => {
    const dest = tempDir('cover-dest-')
    const count = syncCoverAssets(ASSETS_DIR, dest)
    expect(count).toBe(11)
    expect(readdirSync(dest).sort()).toEqual([...COVER_ASSET_MANIFEST].sort())
  })

  it('fails naming the missing source, and copies nothing', () => {
    const src = tempDir('cover-src-')
    cpSync(ASSETS_DIR, src, { recursive: true })
    unlinkSync(join(src, 'slicing-model.svg'))

    const dest = tempDir('cover-dest-')
    expect(() => syncCoverAssets(src, dest)).toThrowError(/slicing-model\.svg/)
    expect(readdirSync(dest)).toEqual([])
  })
})
