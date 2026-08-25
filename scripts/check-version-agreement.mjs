#!/usr/bin/env node
/**
 * One version number, three places that state it.
 *
 * `package.json` is the source. `.claude-plugin/plugin.json` is what a
 * consumer's plugin install reads, and the CHANGELOG's top heading is what a
 * human reads. A release where those three disagree tells three different
 * stories about the same tree, and only one of them is checkable — so check it.
 *
 *   node scripts/check-version-agreement.mjs           # fail on disagreement
 *   node scripts/check-version-agreement.mjs --write   # copy into plugin.json
 *
 * `--write` exists because `changeset version` only knows about package.json.
 * It propagates; it never invents. The CHANGELOG stays a human's job, so a
 * release with no written entry still fails the check.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

/** The version in the CHANGELOG's first release heading, or null. */
export function changelogVersion(source) {
  const match = /^##\s+(\d+\.\d+\.\d+)\b/m.exec(source)
  return match ? match[1] : null
}

export function versions(root = REPO_ROOT) {
  const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
  return {
    'package.json': read('package.json').version,
    '.claude-plugin/plugin.json': read('.claude-plugin/plugin.json').version,
    'CHANGELOG.md': changelogVersion(readFileSync(join(root, 'CHANGELOG.md'), 'utf8')),
  }
}

/** Every file whose stated version differs from package.json's. */
export function disagreements(stated) {
  const source = stated['package.json']
  return Object.entries(stated)
    .filter(([file, version]) => file !== 'package.json' && version !== source)
    .map(([file, version]) => ({ file, version, expected: source }))
}

/** Copy package.json's version into plugin.json. Returns true if it changed. */
export function writePluginVersion(root = REPO_ROOT) {
  const path = join(root, '.claude-plugin/plugin.json')
  const source = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
  const raw = readFileSync(path, 'utf8')
  const next = raw.replace(/("version":\s*)"[^"]*"/, `$1"${source}"`)
  if (next === raw) return false
  writeFileSync(path, next)
  return true
}

function main() {
  if (process.argv.includes('--write')) {
    const changed = writePluginVersion()
    console.log(changed ? 'plugin.json version updated' : 'plugin.json already current')
    return
  }
  const stated = versions()
  const wrong = disagreements(stated)
  if (wrong.length === 0) {
    console.log(`version ${stated['package.json']} agrees everywhere`)
    return
  }
  for (const { file, version, expected } of wrong) {
    console.error(`${file} says ${version ?? '(none)'}, package.json says ${expected}`)
  }
  console.error(
    '\nRun `npx changeset version` to cut a release, or fix the file by hand.',
  )
  process.exit(1)
}

// Same shape as scripts/sync-cover-assets.mjs: comparing against a
// hand-built `file://` URL silently no-ops whenever the path needs escaping,
// so a checkout under a directory with a space in its name would run this
// script and have it do nothing, successfully.
const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) main()
