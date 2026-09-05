#!/usr/bin/env node
/**
 * Does this package still stand alone?
 *
 * The kit is published as a template anyone can adopt, and it says so. But it
 * was generalised out of one company's in-house deployment, and for months the
 * claim was never checked: a sweep found eighteen surviving references to that
 * deployment — its repo name, its Slack bot, its migration filenames — all of
 * them comments and prose, none of them load-bearing, every one of them a
 * sentence an adopter cannot decode. Prose rots back. So the claim gets a
 * check, and the check runs in CI.
 *
 *   node scripts/check-standalone.mjs
 *
 * Scans every tracked text file. Exits 1 naming each file and line, so a
 * reference reintroduced in a comment fails the PR that introduced it rather
 * than the next sweep, months later.
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
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

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
 * this script, the narrower guard it generalises, and the plans that ordered
 * the decoupling. Stripping the plans would destroy the record of why the
 * boundary exists.
 */
export const EXCLUDED = [
  'src/lib/agent/skill/', // mirror of skills/ + references/
  'scripts/check-standalone.mjs', // this file
  'src/content/coverContent.test.ts', // the narrower guard, same words
  'scripts/tests/standalone.test.mjs', // this check's own fixtures
  'docs/plans/', // the specs that ordered the boundary
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

/** Tracked text files, minus the exclusions above. */
/**
 * Every file the sweep reads: tracked, plus untracked files git would not
 * ignore. Tracked alone was a trap — a changeset written and checked locally
 * before `git add` was invisible to `npm run check:standalone`, then failed
 * `npm test` in CI the moment it was committed (#180, #181). The two subjects
 * are one function, and that function sees what a commit would.
 */
export function scannedFiles(root = REPO_ROOT) {
  const listed = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  )
  const seen = new Set()
  return listed.split('\0').filter((path) => {
    if (path === '' || seen.has(path) || !isScanned(path)) return false
    seen.add(path)
    return true
  })
}

/** Every `{ line, label, text }` in one file's source. */
export function violationsIn(source) {
  const found = []
  source.split('\n').forEach((text, index) => {
    for (const { label, test } of PATTERNS) {
      if (test.test(text)) found.push({ line: index + 1, label, text: text.trim() })
    }
  })
  return found
}

function main() {
  const files = scannedFiles()
  const problems = []
  for (const path of files) {
    let source
    try {
      source = readFileSync(resolve(REPO_ROOT, path), 'utf8')
    } catch {
      continue // a submodule or a path removed between ls-files and here
    }
    if (source.includes('\0')) continue // binary without a listed extension
    for (const hit of violationsIn(source)) problems.push({ path, ...hit })
  }

  if (problems.length === 0) {
    console.log(`no uno / PLUS / Ecoeled references in ${files.length} tracked files`)
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
