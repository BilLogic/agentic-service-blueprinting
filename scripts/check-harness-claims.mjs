#!/usr/bin/env node
/**
 * EVERY ASSEMBLED FILE IS CLAIMED BY EXACTLY ONE COMPOSITION DOCUMENT.
 *
 * The composition documents are the prose about the surfaces this application
 * assembles — one document per surface a person can name — and each declares
 * in its frontmatter a `claims:` list naming every file it documents. This
 * holds the two sides to each other in both directions:
 *
 *   - a file no document claims fails, and is named;
 *   - a claim pointing at a file that is no longer there fails, naming both;
 *   - a file two documents claim fails, naming both documents.
 *
 * The mapping is declared rather than derived from folder names on purpose.
 * `editor/` alone spans the canvas, the sidebar, slices, the agent and the
 * dialogs, and the `layer`→`lane` rename is the standing proof that folder
 * names are not stable. What folder-derivation would have bought — nothing
 * silently undocumented — is bought here instead, by a check.
 *
 * ── WHO CLAIMS WHAT, ACROSS THE SEAM ──────────────────────────────────────
 *
 * This check runs in two kinds of repository and the answer has to differ.
 * Here, the application IS this tree and these documents are its own. In a
 * deployment the application arrives inside the installed package, and the
 * package's documents arrive with it.
 *
 * THE PACKAGE CLAIMS WHAT THE PACKAGE SHIPS. That is the whole point. A
 * deployment that pins a release which added a module used to go red on the
 * pin bump alone, and answered it by writing a claim and a paragraph for a
 * file it does not own and did not change — twice in one day, once for four
 * modules and once for thirty-one. The files are the package's, so the claim
 * is the package's, so an unclaimed module fails HERE, in the repository that
 * added it, before any pin moves.
 *
 * SO THE DOCUMENTS OVERLAY, PER DOCUMENT, exactly as the application overlays
 * per path: a deployment's composition folder is laid over the package's, and
 * a document the deployment names replaces the package's document of that
 * name outright. Adding a document is adding a surface; naming one the
 * package already ships is taking that surface's prose over, claims and all.
 * A deployment that overrides nothing writes nothing, and a pin that adds a
 * module adds no red.
 *
 * WHAT A DEPLOYMENT STILL CLAIMS is its own tree: the assembled files it
 * holds outside the application, which the package has never seen and cannot
 * document. `composition.claimed` in `repo-config.mjs` names those trees, and
 * a file under one of them needs a claim in a document of the deployment's
 * own — which is the second half of the same rule, not an exception to it.
 *
 * The composition folder itself is named in `repo-config.mjs` too, for the
 * reason every value about the running repository's own tree is: a deployment
 * holds this file byte-identical and reads it standing in its own tree.
 *
 * Co-located `*.test.*` files are a companion to the file they test, not a
 * surface anyone documents; they are excluded from the source set.
 *
 * `sweepClaims` takes the root it reads and the composition values it applies
 * rather than reaching for either, the shape `check-pointers.mjs` and
 * `check-negation-ratchet.mjs` already use, so that a test can prove the
 * failing cases against a throwaway tree instead of planting a file in the
 * tree ten other suites are walking.
 *
 *   node scripts/check-harness-claims.mjs   (also: npm run check:harness)
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { repoConfig } from './repo-config.mjs'
import { APP_PACKAGE, sweep } from './sweep.mjs'
import { whenRun } from './verdict.mjs'

/**
 * The application directories whose files a composition document has to claim.
 *
 * A fact about the application, which this package owns wherever the check is
 * running, so it is spelled here rather than configured. Paths are the
 * application's own — `src/…` — which is how a claim spells them and what the
 * file is still called after the next pin bump; where a deployment happens to
 * read the application FROM is an installation detail the sweep answers.
 */
export const ASSEMBLED = [
  'src/components/blueprint',
  'src/components/editor',
  'src/components/cover',
  'src/components/mobile',
]

/** The one document a composition folder holds that documents no file itself. */
const SURVEY = 'overview.md'

/** Whether a path is a co-located test, and so no surface to document. */
export const isTest = (path) => /\.test\.[cm]?[jt]sx?$/.test(path)

/** Whether an application path is one of the assembled directories'. */
export const isAssembled = (path) =>
  ASSEMBLED.some((dir) => path.startsWith(`${dir}/`)) && !isTest(path)

/**
 * The composition folders in play under `root`, this tree's first and the
 * package's second, each present on disk.
 *
 * The same two layers and the same order `appLayers` answers with, because it
 * is the same rule: a deployment's copy of a name wins, and the package's
 * answers everything the deployment did not name. In this repository the
 * package is not installed, there is one layer, and nothing overlays anything.
 *
 * ONE FOLDER NAME SERVES BOTH LAYERS, and that is the one place this arrangement
 * asks a deployment to agree with the package rather than to state its own
 * value. A deployment that names its folder something else builds a package
 * layer that is not there, gets one layer, and hears that every file the
 * package ships is unclaimed — a failure that names two hundred files and none
 * of the cause. So `missingPackageLayer` below asks the question separately: an
 * installed package that holds no folder at this name is reported as exactly
 * that, once, instead of as the flood it would otherwise become.
 */
export function compositionLayers(root, documents) {
  return [
    { path: resolve(root, documents), packaged: false },
    { path: resolve(root, 'node_modules', APP_PACKAGE, documents), packaged: true },
  ].filter((layer) => existsSync(layer.path))
}

/**
 * The complaint to make when the package is installed and its composition
 * folder is not where this repository's value says — or null when there is
 * nothing to complain about.
 */
export function missingPackageLayer(root, documents) {
  const installed = resolve(root, 'node_modules', APP_PACKAGE)
  if (!existsSync(installed)) return null
  if (existsSync(resolve(installed, documents))) return null
  return (
    `${APP_PACKAGE} is installed and holds no ${documents} — \`composition.documents\` in ` +
    'repo-config.mjs has to name the folder the package publishes, because it addresses both ' +
    "this repository's documents and the package's"
  )
}

/**
 * The documents the layers resolve to: one entry per NAME, the first layer
 * that holds it winning, in name order.
 *
 * `label` is how a finding addresses the document — the package's copy wears
 * the package name, so a reader who meets a claim problem in a deployment can
 * tell at a glance whether the document to edit is theirs or upstream's.
 */
export function resolveDocuments(layers, documents) {
  const found = new Map()
  for (const layer of layers) {
    for (const name of readdirSync(layer.path).sort()) {
      if (!name.endsWith('.md') || name === 'index.md' || found.has(name)) continue
      found.set(name, {
        name,
        path: join(layer.path, name),
        packaged: layer.packaged,
        label: layer.packaged ? `${APP_PACKAGE}/${documents}/${name}` : `${documents}/${name}`,
      })
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Frontmatter, with support for the one block-list key this reads.
 *
 * `generate-docs-index.mjs` parses frontmatter too, and reads it flat — every
 * value a string — which is the right shape for the one key it wants and the
 * wrong one for `claims:`. Reaching for it would also put a relative import to
 * a module this package does not publish inside a file a deployment holds
 * byte-identical, which the shared-script fence refuses for the reason it
 * gives. So the two parsers coexist, each answering the question its caller
 * asks, and neither is the other's base case.
 */
export function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!match) return {}
  const out = {}
  let listKey = null
  for (const line of match[1].split('\n')) {
    const item = /^\s*-\s+(.*\S)\s*$/.exec(line)
    if (listKey && item) {
      out[listKey].push(item[1])
      continue
    }
    listKey = null
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (value === '') {
      listKey = key
      out[key] = []
    } else {
      out[key] = value
    }
  }
  return out
}

/**
 * The files of this repository's OWN assembled trees, as a commit would carry
 * them.
 *
 * Asked of the `commit` subject rather than walked for, because `sweep.mjs`
 * exists so that no check walks: the ignored directory, the dotted entry and
 * the file that vanished between the listing and the read are its rules, and a
 * private walk here would have re-decided all three and got at least the first
 * wrong — a `node_modules` or a build cache inside a named tree would have been
 * demanded as claims. `commit` is also the honest universe for the question:
 * these are files a repository SHIPS, so a build artifact git already ignores
 * was never one of them, and a file written and checked before `git add` is one
 * a reader can already open.
 */
function ownFiles(repo, claimed) {
  if (claimed.length === 0) return []
  const under = (path) => claimed.some((dir) => path === dir || path.startsWith(`${dir}/`))
  return sweep({
    subject: 'commit',
    root: repo,
    where: (path) => under(path) && !isTest(path),
    what: `assembled file under ${claimed.join(', ')}`,
  }).files
}

/**
 * Every composition-claim problem in one repository.
 *
 * @param {{
 *   root?: string,
 *   composition?: { documents: string, claimed: string[] },
 * }} [options] `root` is the repository to read (the process's working
 *   directory by default); `composition` is where its documents live and
 *   which of its own trees they claim, this repository's by default.
 * @returns {{ problems: string[], sources: string[], docs: string[] }}
 */
export function sweepClaims({ root = process.cwd(), composition = repoConfig.composition } = {}) {
  const repo = resolve(root)
  if (!composition || !Array.isArray(composition.claimed) || !composition.documents) {
    // The first thing a repository adopting this check meets, so it is a
    // sentence rather than a stack: the values are the seam, and a repository
    // that states none of them has not adopted the check, it has installed it.
    throw new Error(
      'repo-config.mjs states no usable `composition`: this check needs `documents` (where ' +
        "this repository's composition documents live) and `claimed` (the trees of its own " +
        'assembled files, possibly empty). See references/customization.md.',
    )
  }
  const problems = []
  const application = sweep({
    subject: 'app',
    root: repo,
    where: isAssembled,
    what: `assembled application file under ${ASSEMBLED.join(', ')}`,
  })
  const sources = [...application.files]

  const absent = composition.claimed.filter((dir) => {
    const abs = resolve(repo, dir)
    return !existsSync(abs) || !statSync(abs).isDirectory()
  })
  for (const dir of absent) {
    // Fail closed, the way every named list here does: a tree nobody can reach
    // is a tree nobody is watching, and a misspelt name would otherwise sweep
    // nothing and report success.
    problems.push(
      `${dir} is named as a claimed tree and this repository does not have it — ` +
        'correct the name in repo-config.mjs, or drop it',
    )
  }
  sources.push(...ownFiles(repo, composition.claimed.filter((dir) => !absent.includes(dir))))

  const absentLayer = missingPackageLayer(repo, composition.documents)
  if (absentLayer) problems.push(absentLayer)

  const layers = compositionLayers(repo, composition.documents)
  if (layers.length === 0) {
    problems.push(
      `${composition.documents} exists neither here nor in the installed package — ` +
        'the documents that claim the assembled files are the whole of this check',
    )
    return { problems, sources, docs: [] }
  }

  /** Where a claimed path actually is: through the overlay for the application. */
  const locate = (claim) =>
    /^src(?:\/|$)/.test(claim) ? application.locate(claim) : join(repo, claim)

  const claimedBy = new Map()
  const docs = resolveDocuments(layers, composition.documents)

  for (const doc of docs) {
    const fm = frontmatter(readFileSync(doc.path, 'utf8'))
    const claims = Array.isArray(fm.claims) ? fm.claims : []
    if (doc.name !== SURVEY && claims.length === 0) {
      problems.push(
        `${doc.label} declares no \`claims:\` list — every composition document claims the files it documents`,
      )
    }
    for (const claim of claims) {
      // A PACKAGE DOCUMENT CLAIMS THE APPLICATION AND NOTHING ELSE. Anything
      // else it named would be resolved against the reader's own root, where
      // it is either absent — a failure in a document that reader cannot edit
      // — or present, and then quietly claimed out from under the document
      // whose repository actually owns it.
      if (doc.packaged && !/^src(?:\/|$)/.test(claim)) {
        problems.push(
          `${doc.label} claims ${claim}, which is not an application path — a document the ` +
            'package ships claims only what the package ships',
        )
        continue
      }
      const at = locate(claim)
      if (!existsSync(at) || !statSync(at).isFile()) {
        problems.push(
          `${doc.label} claims ${claim}, which is no file — drop the claim or restore the file`,
        )
        continue
      }
      const already = claimedBy.get(claim)
      if (already) {
        problems.push(
          `${claim} is claimed twice: ${already} and ${doc.label} — exactly one document owns a file`,
        )
        continue
      }
      claimedBy.set(claim, doc.label)
    }
  }

  for (const source of sources) {
    if (!claimedBy.has(source)) {
      problems.push(
        `${source} is claimed by no composition document — add it to one document's \`claims:\` list`,
      )
    }
  }

  return { problems, sources, docs: docs.map((doc) => doc.label) }
}

/**
 * The verdict: every assembled file claimed by a composition document.
 *
 * Pure — it sweeps, decides, and hands back what it found. Nothing here prints
 * or exits.
 */
export function judge() {
  // A REFUSAL IS A SENTENCE, NOT A STACK. Everything below this line is a
  // finding about the tree; everything `sweepClaims` throws is a fact about the
  // repository it was pointed at — no `composition` stated, no application to
  // sweep — and the first of those is what a repository adopting this check
  // meets before it meets anything else.
  let result
  try {
    result = sweepClaims()
  } catch (error) {
    return { what: 'an assembled file a composition document claims', findings: [`::error::${error.message}`] }
  }
  const { problems, sources, docs } = result
  return {
    what: 'an assembled file a composition document claims',
    count: sources.length,
    findings: problems.map((problem) => `::error::${problem}`),
    closing:
      `\n${problems.length} composition-claim problem(s). A file this repository does not own ` +
      'is claimed where it is owned: the package documents what the package ships, and a ' +
      'deployment documents the trees `composition.claimed` names.\n\n  npm run check:harness\n',
    line: `check-harness-claims: composition claims are complete — ${sources.length} assembled files across ${docs.length} documents.`,
  }
}

whenRun(import.meta.url, judge)
