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
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { repoConfig } from './repo-config.mjs'
import { APP_PACKAGE, sweep } from './sweep.mjs'

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

/** `path`, spelled the way a finding prints it. */
const slashed = (path) => path.split(sep).join('/')

/**
 * The composition folders in play under `root`, this tree's first and the
 * package's second, each present on disk.
 *
 * The same two layers and the same order `appLayers` answers with, because it
 * is the same rule: a deployment's copy of a name wins, and the package's
 * answers everything the deployment did not name. In this repository the
 * package is not installed, there is one layer, and nothing overlays anything.
 */
export function compositionLayers(root, documents) {
  return [
    resolve(root, documents),
    resolve(root, 'node_modules', APP_PACKAGE, documents),
  ].filter((layer) => existsSync(layer))
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
  layers.forEach((layer, index) => {
    for (const name of readdirSync(layer).sort()) {
      if (!name.endsWith('.md') || name === 'index.md' || found.has(name)) continue
      found.set(name, {
        name,
        path: join(layer, name),
        label: index === 0 ? `${documents}/${name}` : `${APP_PACKAGE}/${documents}/${name}`,
      })
    }
  })
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** Frontmatter, with support for the one block-list key this reads. */
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

/** Every file under an absolute directory, as a path relative to `root`. */
function walk(abs, root, out = []) {
  for (const entry of readdirSync(abs, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const full = join(abs, entry.name)
    if (entry.isDirectory()) walk(full, root, out)
    else if (!isTest(entry.name)) out.push(slashed(relative(root, full)))
  }
  return out
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
  const problems = []
  const application = sweep({
    subject: 'app',
    root: repo,
    where: isAssembled,
    what: `assembled application file under ${ASSEMBLED.join(', ')}`,
  })
  const sources = [...application.files]

  for (const dir of composition.claimed) {
    const abs = resolve(repo, dir)
    if (!existsSync(abs) || !statSync(abs).isDirectory()) {
      problems.push(
        `${dir} is named as a claimed tree and this repository does not have it — ` +
          'correct the name in repo-config.mjs, or drop it',
      )
      continue
    }
    sources.push(...walk(abs, repo))
  }

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
      if (!existsSync(locate(claim))) {
        problems.push(
          `${doc.label} claims ${claim}, which no longer exists — drop the claim or restore the file`,
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

function main() {
  const { problems, sources, docs } = sweepClaims()
  if (problems.length > 0) {
    for (const problem of problems) console.error(`::error::${problem}`)
    console.error(
      `\n${problems.length} composition-claim problem(s). A file this repository does not own ` +
        'is claimed where it is owned: the package documents what the package ships, and a ' +
        'deployment documents the trees `composition.claimed` names.\n\n  npm run check:harness\n',
    )
    process.exitCode = 1
    return
  }
  console.log(
    `check-harness-claims: composition claims are complete — ${sources.length} assembled files across ${docs.length} documents.`,
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
