#!/usr/bin/env node
/**
 * The fourth place this repo states its version: the git tag.
 *
 * `check-version-agreement.mjs` holds the three files together. None of them
 * is what a consumer actually pins — `github:BilLogic/agentic-service-blueprinting#v0.4.0`
 * resolves a TAG, and a lockfile integrity hash exists only because a tag
 * names one immutable tree. A release with no tag states a version that
 * nothing downstream can ask for.
 *
 *   node scripts/check-release-tag.mjs             # tags that exist must be honest
 *   node scripts/check-release-tag.mjs --require   # ...and this version must have one
 *
 * The default mode is deliberately two-sided rather than one:
 *
 *   - A `v*` tag whose name is not a released version in the CHANGELOG is a
 *     tag nobody can read a release out of.
 *   - A `v<version>` tag whose tree states a different version is a tag that
 *     lies about what it points at, which is worse than no tag at all.
 *   - Once tagging has started, it cannot stop: every release from the OLDEST
 *     tagged one forward must have a tag. Before the first tag that clause
 *     sleeps, and it never reaches back over the releases that shipped before
 *     tagging did — retro-tagging six old trees is not what this guard is for.
 *
 * `--require` is the release step (see docs/engineering/releasing.md). It is
 * not run on ordinary pull requests, because the tag for a version is cut
 * after the release commit is on `main`, not before.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

/** `v0.4.0` for `0.4.0`. One shape, so nothing has to guess. */
export const tagFor = (version) => `v${version}`

/** Every version the CHANGELOG records under a release heading. */
export function releasedVersions(source) {
  return [...source.matchAll(/^##\s+(\d+\.\d+\.\d+)\b/gm)].map(([, version]) => version)
}

/**
 * What is wrong with a set of tags, as sentences naming the tag.
 *
 * Pure so the failure shapes are testable without a git repository per case:
 * everything git-shaped is resolved by the caller and handed in.
 *
 * @param tags        the `v*` tags that exist
 * @param released    versions with a CHANGELOG release heading
 * @param version     what package.json states
 * @param taggedTree  version stated by `v<version>`'s tree, or null when the
 *                    tag does not exist
 * @param require     also demand a tag for `version`
 */
export function tagFaults({ tags, released, version, taggedTree, require = false }) {
  const faults = []

  for (const tag of tags) {
    const named = /^v(\d+\.\d+\.\d+)$/.exec(tag)
    if (!named) {
      faults.push(`tag ${tag} is not v<major>.<minor>.<patch>`)
      continue
    }
    if (!released.includes(named[1])) {
      faults.push(`tag ${tag} names a version the CHANGELOG never released`)
    }
  }

  if (taggedTree !== null && taggedTree !== version) {
    faults.push(
      `tag ${tagFor(version)} points at a tree whose package.json says ${taggedTree}`,
    )
  }

  const tagged = (each) => tags.includes(tagFor(each))
  if (require && !tagged(version)) {
    faults.push(`version ${version} is released in the CHANGELOG and has no tag`)
  }
  // The era of tagged releases: from the oldest tag forward, with the
  // CHANGELOG newest-first, there may be no holes. Releases older than that
  // shipped before this repo tagged anything and are left where they are.
  const era = released.map(tagged).lastIndexOf(true)
  for (const each of released.slice(0, Math.max(era, 0))) {
    if (tagged(each)) continue
    if (each === version && require) continue // already said, with its command
    faults.push(`release ${each} has no tag ${tagFor(each)}`)
  }

  return faults
}

const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

/** The `v*` tags this checkout can see. */
export function localTags() {
  const listed = git('tag', '--list', 'v*')
  return listed ? listed.split('\n').filter(Boolean) : []
}

/** The version stated by the tree a tag points at, or null when it is absent. */
export function versionAtTag(tag) {
  const manifest = git('show', `${tag}:package.json`)
  return manifest ? JSON.parse(manifest).version : null
}

function main() {
  const require = process.argv.includes('--require')
  const version = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')).version
  const released = releasedVersions(readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8'))
  const tags = localTags()

  const faults = tagFaults({
    tags,
    released,
    version,
    taggedTree: tags.includes(tagFor(version)) ? versionAtTag(tagFor(version)) : null,
    require,
  })

  if (faults.length === 0) {
    if (tags.length === 0) {
      console.log(`no release tags yet; ${version} is untagged (see docs/engineering/releasing.md)`)
    } else if (tags.includes(tagFor(version))) {
      console.log(`${tags.length} release tag(s), and ${tagFor(version)} is among them`)
    } else {
      console.log(`${tags.length} release tag(s); ${version} is not tagged yet`)
    }
    return
  }

  for (const fault of faults) console.error(fault)
  console.error(
    `\nCut the tag on main and push it:\n` +
      `  git tag -a ${tagFor(version)} -m "${tagFor(version)}" && git push origin ${tagFor(version)}\n` +
      `Procedure: docs/engineering/releasing.md`,
  )
  process.exit(1)
}

// Same shape as scripts/check-version-agreement.mjs: a hand-built `file://`
// comparison no-ops on any path that needs escaping, and a check that quietly
// does nothing is the failure mode this whole guard set exists to refuse.
const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) main()
