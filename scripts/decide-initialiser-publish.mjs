#!/usr/bin/env node
/**
 * Should this run publish the initialiser? One answer, reached before the one
 * command that cannot be taken back.
 *
 * The initialiser, `create-uno-blueprint`, is the one package in this tree
 * that goes to a registry, and a version there is permanent: it cannot be
 * published twice and it cannot be replaced. It also downloads the release
 * whose tag is its own version. So the publish workflow asks here first, and
 * runs `npm publish` only when this says so.
 *
 *   node scripts/decide-initialiser-publish.mjs
 *
 * It reads the run from the environment a workflow sets — `GITHUB_REF_TYPE`,
 * `GITHUB_REF_NAME`, `GITHUB_REPOSITORY` — and writes `publish=true` or
 * `publish=false` to `GITHUB_OUTPUT`. It publishes nothing itself.
 *
 * FOUR ANSWERS, AND ONLY ONE OF THEM IS YES.
 *
 *   NOTHING TO PUBLISH   This tree carries no initialiser, or this repository
 *                        is not the one its manifest names. A workspace the
 *                        initialiser wrote carries this script and the
 *                        workflow that runs it, and a fork carries the
 *                        manifest too; neither is where the package comes
 *                        from, and a tag pushed there is not a failure. Said
 *                        through the unverified register, and green.
 *   REFUSED              The run was not started by a `v<version>` tag, the
 *                        tag is not the version the initialiser's manifest
 *                        states, the places that state the version disagree
 *                        (`check-version-agreement.mjs` is what holds them),
 *                        or the registry could not be asked. Red. An unasked
 *                        registry is a refusal rather than a guess, because
 *                        the guess is a publish.
 *   ALREADY PUBLISHED    The registry has this version. Green, and nothing
 *                        is published: a run started again says so and stops.
 *   PUBLISH              The tag, the manifest and every other statement
 *                        agree, and the registry does not have the version.
 *
 * THE TAG EXISTS BEFORE THE PUBLISH BECAUSE THE TAG STARTS IT. The published
 * initialiser downloads `v<its own version>`, so a version on the registry
 * with no tag behind it is a command that ends in a 404. A run a tag started
 * cannot be in that state, which is why any other kind of run is refused.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { tagFor } from './check-release-tag.mjs'
import { INITIALISER_MANIFEST, disagreements, versions } from './check-version-agreement.mjs'
import { whenRun } from './verdict.mjs'

/** The tree this script runs in: the working directory — never this file's location; `sweep.mjs` says why. */
const REPO_ROOT = process.cwd()

/** The registry the initialiser is published to. */
export const REGISTRY = 'https://registry.npmjs.org'

/** How long the registry is given to answer. A stalled lookup is a job that never ends. */
const LOOKUP_TIMEOUT_MS = 30_000

/**
 * `owner/name` for the GitHub repository a manifest names, or null when it
 * names none this can read. A manifest states it as a url or as an object
 * holding one, and npm writes the url as `git+https://github.com/<owner>/<name>.git`.
 */
export function repositoryOf(manifest) {
  const stated = manifest?.repository
  const url = typeof stated === 'string' ? stated : stated?.url
  const match = /^(?:git\+)?https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/.exec(url ?? '')
  return match ? match[1] : null
}

/**
 * Whether the registry has `name@version`, asked with the `fetch` handed in.
 *
 * 200 is a version that exists and 404 is one that does not. Anything else —
 * a 5xx, a rate limit, a network that is not there — throws, because it is
 * not an answer to the question.
 */
export function registryLookup(fetch = globalThis.fetch) {
  return async (name, version) => {
    const url = `${REGISTRY}/${name}/${version}`
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    })
    if (response.status === 200) return true
    if (response.status === 404) return false
    throw new Error(`${url} answered ${response.status}`)
  }
}

/**
 * The decision, from everything it would otherwise read.
 *
 * Pure but for the lookup it is handed, so every answer is testable without a
 * tag, a runner or a registry.
 *
 * @param tag          the tag that started the run, or null when none did
 * @param repository   `owner/name` of the repository the run is in
 * @param manifest     the initialiser's manifest, or null where there is none
 * @param stated       every place that states the version, by file
 * @param isPublished  `(name, version) => Promise<boolean>`
 * @returns {Promise<{
 *   publish: boolean,
 *   refusals: string[],
 *   line?: string,
 *   nothing?: string,
 * }>} `refusals` are why the run is red; `nothing` is why there was nothing
 *   here to publish; `line` is the green sentence.
 */
export async function decide({ tag, repository, manifest, stated, isPublished }) {
  const no = (rest) => ({ publish: false, refusals: [], ...rest })

  if (!manifest) {
    return no({
      nothing:
        `this tree has no ${INITIALISER_MANIFEST}, so there is no initialiser here to ` +
        `publish. A workspace is the template without that folder.`,
    })
  }
  const home = repositoryOf(manifest)
  if (!home || repository !== home) {
    return no({
      nothing:
        `this run is in ${repository ?? 'no repository it can name'} and the initialiser's ` +
        `manifest names ${home ?? 'none'}. The package is published from the repository its ` +
        `manifest names and from nowhere else.`,
    })
  }

  const { name, version } = manifest
  if (!tag) {
    return no({
      refusals: [
        `this run was not started by a tag. ${name} downloads the release tagged ` +
          `${tagFor(version)}, so the tag comes first and the tag is what publishes.`,
      ],
    })
  }
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
    return no({ refusals: [`tag ${tag} is not v<major>.<minor>.<patch>`] })
  }
  const refusals = []
  if (tag !== tagFor(version)) {
    refusals.push(`tag ${tag} is not the version ${INITIALISER_MANIFEST} states, ${version}`)
  }
  for (const { file, version: said, expected } of disagreements(stated)) {
    refusals.push(`${file} says ${said ?? '(none)'}, package.json says ${expected}`)
  }
  if (refusals.length > 0) return no({ refusals })

  let published
  try {
    published = await isPublished(name, version)
  } catch (error) {
    return no({
      refusals: [
        `the registry could not be asked whether ${name}@${version} exists: ${error.message}`,
      ],
    })
  }
  return published
    ? no({ line: `${name}@${version} is already on the registry; nothing published` })
    : { publish: true, refusals: [], line: `${name}@${version} is not on the registry; publishing it` }
}

/** What the workflow's next step reads: one line of `GITHUB_OUTPUT`. */
export const outputOf = (decision) => `publish=${decision.publish ? 'true' : 'false'}\n`

/** The decision as `verdict.mjs` takes it: unverified, findings, or one green line. */
export function judgementOf(decision) {
  if (decision.nothing) return { what: 'the initialiser', unverified: decision.nothing }
  return {
    what: 'the initialiser at this tag',
    count: 1,
    findings: decision.refusals,
    opening: 'The initialiser is not published from this run:',
    closing: '\nProcedure: docs/engineering/releasing.md',
    line: decision.line,
  }
}

/**
 * The verdict for this run: read the environment and the tree, decide, and
 * leave the answer where the next step reads it.
 */
export async function judge(env = process.env) {
  const path = join(REPO_ROOT, INITIALISER_MANIFEST)
  const decision = await decide({
    tag: env.GITHUB_REF_TYPE === 'tag' ? (env.GITHUB_REF_NAME ?? null) : null,
    repository: env.GITHUB_REPOSITORY,
    manifest: existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null,
    stated: versions(REPO_ROOT),
    isPublished: registryLookup(),
  })
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, outputOf(decision))
  return judgementOf(decision)
}

whenRun(import.meta.url, judge)
