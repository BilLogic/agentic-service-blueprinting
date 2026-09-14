#!/usr/bin/env node
/**
 * Does this package still stand alone?
 *
 * The template is published as a template anyone can adopt, and it says so. But it
 * was generalised out of one company's in-house deployment, and for months the
 * claim was never checked: a sweep found eighteen surviving references to that
 * deployment — its repo name, its Slack bot, its migration filenames — all of
 * them comments and prose, none of them load-bearing, every one of them a
 * sentence an adopter cannot decode. Prose rots back. So the claim gets a
 * check, and the check runs in CI.
 *
 * The motive, because the mechanism below does not carry it: standing alone is
 * an ASSERTION this package makes about itself, and for as long as nothing
 * measured it, it was a wish. The reader it is made to is a contributor who
 * arrives with none of the context the package grew up in and wants to adopt
 * it without first decoding another company's vocabulary. A check is what
 * makes that boundary verified rather than assumed.
 *
 *   node scripts/check-standalone.mjs
 *
 * Scans every text file a commit would carry. Exits 1 naming each file and
 * line, so a reference reintroduced in a comment fails the PR that introduced
 * it rather than the next sweep, months later.
 *
 * ── The subject ────────────────────────────────────────────────────────────
 *
 * EVERYTHING A COMMIT WOULD CARRY — the `commit` subject of `sweep.mjs`, which
 * holds the listing, the reason it takes the untracked files too (#180, #181 —
 * its header carries the sentence, and the trap it names is why this sweep does
 * not read the index alone), the vanished-file rule and the empty-subject
 * refusal. `check-content-coupling.mjs` reads the same subject for the same
 * deployment's CONTENT — an id, a cast, a scenario, an asset path, which names
 * nothing and walks past a grep. Two questions, one subject, so the only thing
 * each script states for itself is what it NARROWS and why.
 *
 * WHAT THIS ONE NARROWS. Binary payloads, because there is no line to read out
 * of one — and the list is one extension shorter than the content sweep's: an
 * `svg` is read here on purpose, since `unowned` in an icon was one of the
 * eighteen, and it carries no id, cast or asset path. Fixtures are NOT
 * narrowed away: a word this check forbids has no excuse for being written
 * down, so its fixtures are named file by file in `EXCLUDED` below rather than
 * skipped as a class. Nothing is narrowed by DIRECTORY — a seven-root list no
 * root-level file could match once left `AGENTS.md`, the always-loaded tier,
 * outside the subject entirely.
 *
 * ── The patterns, and why each is bounded the way it is ────────────────────
 *
 * `uno` is a substring of ordinary English. Unbounded, it fires on
 * `unobserve` (three test files), `unowned` (a migration, an SVG, the cover
 * content), `unopposed`, and `notion of "selected"`. So it is word-bounded,
 * and only word-bounded — case-insensitive, because `Uno's own content` in a
 * test comment was one of the eighteen.
 *
 * `PLUS` is matched CASE-SENSITIVELY, and this is the one rule that cannot be
 * relaxed. Lowercase "plus" appears on ~150 lines of legitimate prose and
 * code: "plus polish", "A plus B", and the `Plus` icon lucide-react exports,
 * imported by a dozen components. An insensitive match here would fail every
 * build and get deleted within a week, which is worse than no check.
 *   (`src/content/coverContent.test.ts` reached this conclusion first, over
 *   the cover-page content object alone; this generalises it to the tree.)
 *
 * ── What is NOT matched, deliberately ──────────────────────────────────────
 *
 * `Notion`, `Slack`, `Figma`, `FigJam`: all legitimate product vocabulary
 * here. Figma is a linked design tool the app actually supports, a named UI
 * idiom in ~20 comments, and an ingest source format `sb:map` reads. Notion
 * names a row-styling idiom and a published lane taxonomy in the crosswalk.
 * Slack is an ingest source and an English word ("the slack matters").
 * Grepping for any of them would report 100+ lines, none of them coupling.
 *
 * `BilLogic` is the repository owner and copyright holder — authorship and
 * the canonical repo URL, required rather than coupling.
 */
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sweep } from './sweep.mjs'


/** Each `test` is applied per line; `label` is what the failure report says. */
export const PATTERNS = [
  { label: 'uno', test: /\buno\b/i },
  { label: 'uno-bot / uno-blueprint', test: /uno[-_]?(?:bot|blueprint)/i },
  { label: 'plus-uno', test: /plus[-_]uno/i },
  { label: 'PLUS (case-sensitive)', test: /\bPLUS\b/ },
  // A second deployment's name. It has no English collisions, so a plain
  // word boundary is enough; it is here because a test fixture carried it
  // through a port once, and nothing else would have said so.
  { label: 'Ecoeled', test: /\becoeled\b/i },
]

/**
 * Paths the scan skips, and the reason each one would otherwise cry wolf.
 *
 * Two kinds live here. The first is MIRRORED content: `src/lib/agent/skill/`
 * is a byte-for-byte vendored copy of `skills/` + `references/`. Scanning a
 * mirror reports the same sentence twice and invites someone to "fix" the
 * copy, which is exactly what the sync drift guard forbids. The mirror is
 * held identical to its source by `sync-canvas-skills.mjs --check`, which
 * runs in `npm test`, so a violation cannot hide there: fix the source,
 * re-sync, and both are clean. (`public/cover/`, the other mirror, is
 * gitignored and never reaches this scan at all.)
 *
 * The second is FILES THAT MUST NAME THE FORBIDDEN WORDS to do their job —
 * this script, the narrower guard it generalises, and this check's own
 * fixtures.
 */
export const EXCLUDED = [
  'src/lib/agent/skill/', // mirror of skills/ + references/
  'scripts/check-standalone.mjs', // this file
  'src/content/coverContent.test.ts', // the narrower guard, same words
  'scripts/tests/standalone.test.mjs', // this check's own fixtures
  // Names the instance BY DESIGN: it reads that repository's rename map and
  // holds this template's schema to it (#101). The coupling it carries is the
  // one it exists to measure.
  'scripts/check-instance-vocabulary.mjs',
]

/** Binary payloads git happens to track. Nothing to read a line out of. */
const BINARY = /\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|otf|pdf|zip|mp4)$/i

export function isScanned(path) {
  if (BINARY.test(path)) return false
  return !EXCLUDED.some((prefix) => path.startsWith(prefix))
}

/**
 * The sweep this check reads: the `commit` subject of `sweep.mjs`, narrowed by
 * `isScanned`. The sweep refuses an empty result, which is the failure both
 * steps between `git ls-files` and this subject can produce — the listing
 * itself, and a predicate that can reject every path it returns — and either of
 * them used to print the green line below with a `0` in it.
 */
export function scannedSweep(root = process.cwd()) {
  return sweep({
    subject: 'commit',
    root,
    where: isScanned,
    what: 'scanned file a commit would carry',
  })
}

/** Every file the sweep reads: what a commit would carry, minus the exclusions. */
export function scannedFiles(root = process.cwd()) {
  return scannedSweep(root).files
}

/**
 * A citation of the deployment repository this template was generalised from.
 * Issue #551 moved ADRs here; a cross-reference that could be read from either
 * side has to name the repository as well as the number, and that repository's
 * GitHub path is `BilLogic/plus-uno-blueprint`. The citation is the pointer,
 * not coupling — a line that names "uno" or "PLUS" *beside* the citation still
 * fails.
 */
const SOURCE_REPO_CITATION = /BilLogic\/plus-uno-blueprint/g

/**
 * Character spans on one line that are a source-repository citation.
 *
 * @param {string} text
 * @returns {Array<[number, number]>}
 */
function sourceRepoCitationSpans(text) {
  const spans = []
  SOURCE_REPO_CITATION.lastIndex = 0
  for (const match of text.matchAll(SOURCE_REPO_CITATION)) {
    spans.push([match.index, match.index + match[0].length])
  }
  return spans
}

/**
 * Whether `index` falls inside any of `spans`.
 *
 * @param {number} index
 * @param {Array<[number, number]>} spans
 */
function isInsideSpan(index, spans) {
  return spans.some(([start, end]) => index >= start && index < end)
}

/** Every `{ line, label, text }` in one file's source. */
export function violationsIn(source) {
  const found = []
  source.split('\n').forEach((text, index) => {
    const citations = sourceRepoCitationSpans(text)
    for (const { label, test } of PATTERNS) {
      const global = new RegExp(
        test.source,
        test.flags.includes('g') ? test.flags : `${test.flags}g`,
      )
      for (const match of text.matchAll(global)) {
        if (isInsideSpan(match.index, citations)) continue
        found.push({ line: index + 1, label, text: text.trim() })
        break
      }
    }
  })
  return found
}

/**
 * Every violation in the tree under `root`, as `{ path, line, label, text }`.
 *
 * THE WALK, so there is only one. `main` below and `standalone.test.mjs` are
 * both callers: the test used to re-walk the subject by hand, and the copy it
 * wrote was missing the skip this has — so the release that deleted its own
 * changesets passed the script and failed the suite (#632).
 *
 * A path the listing named and the tree no longer has is skipped, because the
 * listing was taken a moment before the read and `git ls-files` reports the
 * index. Every other read failure throws; the sweep's `read` applies that rule
 * — `read-listed.mjs` holds the argument for it — so this walk states it
 * nowhere. The skip cannot quietly shrink the subject: `standalone.test.mjs`
 * counts what came back.
 *
 * `walk` is the sweep to read, so a caller that has already asked for one —
 * `main` below, which reports its size — walks exactly the subject it counted
 * rather than asking git a second time and hoping for the same answer.
 */
export function violationsUnder(root = process.cwd(), walk = scannedSweep(root)) {
  const problems = []
  for (const path of walk.files) {
    const source = walk.read(path)
    if (source === null) continue // listed, then gone before this read
    if (source.includes('\0')) continue // binary without a listed extension
    for (const hit of violationsIn(source)) problems.push({ path, ...hit })
  }
  return problems
}

function main() {
  const walk = scannedSweep()
  const problems = violationsUnder(process.cwd(), walk)

  if (problems.length === 0) {
    console.log(
      `no uno / PLUS / Ecoeled references in ${walk.files.length} files a commit would carry`,
    )
    return
  }

  console.error(
    'This package claims to stand alone. These lines name the deployment it ' +
      'was generalised from:\n',
  )
  for (const { path, line, label, text } of problems) {
    console.error(`  ${path}:${line} — ${label}`)
    console.error(`    ${text.slice(0, 120)}`)
  }
  console.error(
    `\n${problems.length} reference${problems.length === 1 ? '' : 's'}. ` +
      'Remove each one, or generalise it into an example an adopter can read. ' +
      'If a file legitimately has to name these words, add it to EXCLUDED in ' +
      'scripts/check-standalone.mjs with the reason.',
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
