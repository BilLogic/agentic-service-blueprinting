#!/usr/bin/env node
/**
 * One version number, four places that state it.
 *
 * `package.json` is the source. `.claude-plugin/plugin.json` is what a
 * consumer's plugin install reads, the CHANGELOG's top heading is what a
 * human reads, and `package-lock.json` states it twice — at its root and in
 * its `packages[""]` entry — because `npm install` rewrites both from
 * package.json and a lockfile behind the manifest makes every install in a
 * fresh worktree a dirty file. A release where those disagree tells four
 * different stories about the same tree, and only one of them is checkable —
 * so check it.
 *
 *   node scripts/check-version-agreement.mjs           # fail on disagreement
 *   node scripts/check-version-agreement.mjs --write   # copy into plugin.json
 *
 * `--write` exists because `changeset version` only knows about package.json.
 * It propagates — into plugin.json and both lockfile entries; it never
 * invents. The CHANGELOG stays a human's job, so a release with no written
 * entry still fails the check.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { whenRun } from './verdict.mjs'

/** The tree this script runs in: the working directory — never this file's location; `sweep.mjs` says why. */
const REPO_ROOT = process.cwd()

/** The version in the CHANGELOG's first release heading, or null. */
export function changelogVersion(source) {
  const match = /^##\s+(\d+\.\d+\.\d+)\b/m.exec(source)
  return match ? match[1] : null
}

export function versions(root = REPO_ROOT) {
  const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
  const lock = read('package-lock.json')
  return {
    'package.json': read('package.json').version,
    '.claude-plugin/plugin.json': read('.claude-plugin/plugin.json').version,
    'CHANGELOG.md': changelogVersion(readFileSync(join(root, 'CHANGELOG.md'), 'utf8')),
    'package-lock.json': lockfileVersion(lock),
  }
}

/**
 * The version a lockfile states, or null when its two statements disagree.
 * npm writes the same number at the root and under `packages[""]`; a lockfile
 * that says two things says nothing this check can trust.
 */
export function lockfileVersion(lock) {
  const root = lock.version ?? null
  const self = lock.packages?.['']?.version ?? null
  return root === self ? root : null
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

/**
 * Copy package.json's version into the lockfile's two statements. A text
 * edit rather than a JSON round-trip, so the lockfile keeps npm's formatting
 * byte for byte and the diff is the two lines that changed.
 */
export function writeLockfileVersion(root = REPO_ROOT) {
  const path = join(root, 'package-lock.json')
  const source = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
  const raw = readFileSync(path, 'utf8')
  // The root statement is the first "version" in the file; the packages[""]
  // statement is the first "version" after the `"": {` entry opens.
  const next = raw
    .replace(/^(\s*"version":\s*)"[^"]*"/m, `$1"${source}"`)
    .replace(/("":\s*\{\s*\n\s*"name":[^\n]*\n\s*"version":\s*)"[^"]*"/, `$1"${source}"`)
  if (next === raw) return false
  writeFileSync(path, next)
  return true
}

whenRun(import.meta.url, () => {
  // `--write` is the release step propagating package.json's number, not a
  // judgement about the tree, so it says what it did and hands the verdict
  // nothing to say.
  if (process.argv.includes('--write')) {
    const plugin = writePluginVersion()
    const lock = writeLockfileVersion()
    console.log(plugin ? 'plugin.json version updated' : 'plugin.json already current')
    console.log(lock ? 'package-lock.json version updated' : 'package-lock.json already current')
    return {}
  }
  const stated = versions()
  return {
    what: 'a file stating the version',
    count: Object.keys(stated).length,
    findings: disagreements(stated).map(
      ({ file, version, expected }) =>
        `${file} says ${version ?? '(none)'}, package.json says ${expected}`,
    ),
    closing: '\nRun `npx changeset version` to cut a release, or fix the file by hand.',
    line: `version ${stated['package.json']} agrees everywhere`,
  }
})
