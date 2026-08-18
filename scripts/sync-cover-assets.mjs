#!/usr/bin/env node
/**
 * Copy the cover page's figures from their authored home (docs/assets/) into
 * public/cover/, where the app serves them. Runs at predev and prebuild;
 * public/cover/ is generated and gitignored, so docs/assets/ stays the single
 * source of truth and the two copies cannot drift.
 *
 * Fails loudly, naming every missing source — a cover page with a broken
 * figure should never build.
 *
 * Usage: node scripts/sync-cover-assets.mjs [srcDir] [destDir]
 * (the optional dirs exist for the test harness; defaults are the real ones)
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Every SVG the cover page may reference, by basename. The content module's
 * `/cover/<name>` paths are checked against this list in a test. */
export const COVER_ASSET_MANIFEST = [
  'blueprint-anatomy.svg',
  'cell-anatomy.svg',
  'data-model-hierarchy.svg',
  'four-ways-in.svg',
  'sb-audit.svg',
  'sb-map.svg',
  'sb-slice.svg',
  'sb-whatif.svg',
  'skill-architecture.svg',
  'slicing-model.svg',
  'why-now.svg',
]

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function syncCoverAssets(
  srcDir = join(repoRoot, 'docs', 'assets'),
  destDir = join(repoRoot, 'public', 'cover'),
) {
  const missing = COVER_ASSET_MANIFEST.filter(
    (name) => !existsSync(join(srcDir, name)),
  )
  if (missing.length > 0) {
    throw new Error(
      `sync-cover-assets: missing source figure(s) in ${srcDir}: ${missing.join(', ')}`,
    )
  }

  mkdirSync(destDir, { recursive: true })
  for (const name of COVER_ASSET_MANIFEST) {
    copyFileSync(join(srcDir, name), join(destDir, name))
  }
  return COVER_ASSET_MANIFEST.length
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  try {
    const count = syncCoverAssets(process.argv[2], process.argv[3])
    console.log(`sync-cover-assets: copied ${count} figures to public/cover/`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
