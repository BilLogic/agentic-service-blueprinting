#!/usr/bin/env node
/**
 * A chunk the deploy no longer ships answers 404, and a chunk it does ships
 * cacheable forever.
 *
 * Two rules, in two files a host reads before any of this repository's code
 * runs, and neither rule is visible to a build, a test or a page load. That is
 * why they get a check: the failure each one prevents arrives at a reader
 * months later, as a sentence about something else.
 *
 * THE FIRST IS THE ORDER. `netlify.toml` ends in the single-page catch-all,
 * `/*` → `/index.html` with a 200, and the host takes the FIRST rule that
 * matches. A content-hashed chunk under `/assets/` that this deploy does not
 * have therefore matches the catch-all, and the browser is handed
 * `index.html` — a 200, and `text/html`, where it asked for a script. What it
 * reports is "Failed to fetch dynamically imported module", naming the import
 * site and not the file that is missing, so the first place anyone looks is
 * the import. An `/assets/*` rule with a 404 above the catch-all makes the
 * missing file say it is missing. `:splat` in the target keeps the real path,
 * so a chunk that IS there is still served from it.
 *
 * A rule added BELOW the catch-all is the same defect wearing the fix, and it
 * reads as correct in a diff — which is the whole reason the order is asserted
 * rather than described.
 *
 * THE SECOND IS THE CACHE, and it is only safe because of the hash. Vite puts
 * the content hash in every name under `/assets/`, so that name can never mean
 * two things and a year is not a risk. Nothing else may take a long cache: the
 * shell — `/`, `index.html`, the icon, the image folders — is what carries the
 * new hashes, and a shell served from a year-old cache pins a reader to the
 * deploy they first visited, asking for chunks the site no longer has. Which
 * is the first rule's failure again, arriving from the other side.
 *
 * ── The subject ────────────────────────────────────────────────────────────
 *
 * The two files, out of the `commit` subject of `sweep.mjs` — a host reads
 * what was committed, so what a commit would carry is the right listing, and
 * a file that is not in it is not deployed however well it reads on disk.
 * Named rather than walked for: each of these is one file by the host's own
 * definition, and a second of either would be a second answer to the same
 * question.
 *
 * What it counts is RULES, not files. Both files pass every assertion below
 * when they are empty, so a run over two emptied files would otherwise print
 * the same green line as a run over the real ones.
 *
 * Run: node scripts/check-hosting-rules.mjs   (also: npm run check:hosting)
 */
import { sweep } from './sweep.mjs'
import { whenRun } from './verdict.mjs'


/** The host's redirect table. */
export const REDIRECTS = 'netlify.toml'

/** The host's response headers. */
export const HEADERS = 'public/_headers'

/** The path the hashed build output is served from. */
export const ASSETS = '/assets/*'

/** What the missing-chunk rule has to say, in full. */
export const MISSING_CHUNK = { from: ASSETS, to: '/assets/:splat', status: '404' }

/** What a hashed asset may be cached for. A year, and never revalidated. */
export const IMMUTABLE = 'public, max-age=31536000, immutable'

/**
 * How long a cache has to be before it outlives a deploy.
 *
 * An hour is a CDN detail; a day is a decision about how long a reader may be
 * held on an old shell. Anything at or above this on an unhashed path is the
 * defect, `immutable` at any length is the defect, and below it is somebody's
 * ordinary revalidation policy and not this check's business.
 */
export const LONG_CACHE_SECONDS = 86400

/**
 * Every `[[redirects]]` block in a TOML file, in the order the host reads
 * them.
 *
 * Deliberately a line reader rather than a TOML parse: the order is the claim,
 * and an object parse hands back a list whose order is an artifact of the
 * parser rather than of the file. The line number comes with each block
 * because a finding that cannot be jumped to is a finding somebody has to
 * reproduce.
 *
 * @param {string} text
 * @returns {Array<{ line: number, from?: string, to?: string, status?: string }>}
 */
export function redirectsIn(text) {
  const blocks = []
  let open = null
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim()
    if (line === '[[redirects]]') {
      open = { line: index + 1 }
      blocks.push(open)
      return
    }
    // Any other table header closes the block: a key under `[build]` is not a
    // redirect, whatever it is called.
    if (line.startsWith('[')) {
      open = null
      return
    }
    if (!open) return
    const pair = /^(from|to|status)\s*=\s*(.*)$/.exec(line)
    if (!pair) return
    open[pair[1]] = pair[2].trim().replace(/^["']|["']$/g, '')
  })
  return blocks
}

/**
 * Every path block in a `_headers` file: the path, and the headers under it.
 *
 * The format is positional — a path at column zero, its headers indented
 * beneath — so an indented line belongs to whatever path was last seen, and a
 * header before any path belongs to nothing and is dropped.
 *
 * @param {string} text
 * @returns {Array<{ path: string, line: number, headers: Array<{ name: string, value: string, line: number }> }>}
 */
export function headerBlocksIn(text) {
  const blocks = []
  let open = null
  text.split('\n').forEach((raw, index) => {
    if (!raw.trim() || raw.trimStart().startsWith('#')) return
    if (!/^\s/.test(raw)) {
      open = { path: raw.trim(), line: index + 1, headers: [] }
      blocks.push(open)
      return
    }
    if (!open) return
    const pair = /^([^:]+):\s*(.*)$/.exec(raw.trim())
    if (!pair) return
    open.headers.push({ name: pair[1].trim(), value: pair[2].trim(), line: index + 1 })
  })
  return blocks
}

/**
 * Does this `Cache-Control` value outlive a deploy?
 *
 * @param {string} value
 */
export function outlivesADeploy(value) {
  const lowered = value.toLowerCase()
  if (/\bimmutable\b/.test(lowered)) return true
  const age = /\bmax-age\s*=\s*(\d+)/.exec(lowered)
  return Boolean(age) && Number(age[1]) >= LONG_CACHE_SECONDS
}

/**
 * The order claim, over one `netlify.toml`'s text.
 *
 * Pure and exported, so every branch can be driven from a fixture instead of
 * from the file the check protects — which is the only way to see the guard
 * go red without editing what a host reads.
 *
 * @param {string} text
 * @param {string} subject
 * @returns {string[]}
 */
export function redirectFindings(text, subject = REDIRECTS) {
  const found = []
  const blocks = redirectsIn(text)
  const missing = blocks.findIndex((block) => block.from === MISSING_CHUNK.from)
  const catchAll = blocks.findIndex((block) => block.from === '/*')

  if (missing === -1) {
    found.push(
      `${subject}:1 has no \`${MISSING_CHUNK.from}\` rule, so a hashed chunk this deploy no ` +
        `longer ships falls through to the catch-all and is answered with the app shell — a 200 ` +
        `and text/html where a script was asked for. Add a [[redirects]] block with ` +
        `from = "${MISSING_CHUNK.from}", to = "${MISSING_CHUNK.to}", status = ${MISSING_CHUNK.status}.`,
    )
  } else {
    const block = blocks[missing]
    if (block.to !== MISSING_CHUNK.to) {
      found.push(
        `${subject}:${block.line} sends \`${MISSING_CHUNK.from}\` to \`${block.to}\` — the ` +
          `target has to be \`${MISSING_CHUNK.to}\`, which keeps the real path so an asset that ` +
          'IS there is still served from it.',
      )
    }
    if (block.status !== MISSING_CHUNK.status) {
      found.push(
        `${subject}:${block.line} answers \`${MISSING_CHUNK.from}\` with ${block.status} — the ` +
          `status has to be ${MISSING_CHUNK.status}, which is the whole point of the rule: a ` +
          'missing chunk saying it is missing.',
      )
    }
  }

  if (catchAll === -1) {
    found.push(
      `${subject}:1 has no \`/*\` catch-all, so there is nothing for the ` +
        `\`${MISSING_CHUNK.from}\` rule to precede and no path reaches the app. The single-page ` +
        'fallback is what every deep link depends on.',
    )
  } else if (missing > catchAll) {
    found.push(
      `${subject}:${blocks[missing].line} puts the \`${MISSING_CHUNK.from}\` rule BELOW the ` +
        `\`/*\` catch-all on line ${blocks[catchAll].line}. The host takes the first rule that ` +
        'matches, so below it the rule is never reached and the defect it fixes is back, wearing ' +
        'the fix. Move the block above the catch-all.',
    )
  }

  return found
}

/**
 * The cache claim, over one `_headers` file's text.
 *
 * @param {string} text
 * @param {string} subject
 * @returns {string[]}
 */
export function cacheFindings(text, subject = HEADERS) {
  const found = []
  const blocks = headerBlocksIn(text)
  const hashed = blocks.find((block) => block.path === ASSETS)

  if (!hashed) {
    found.push(
      `${subject}:1 has no \`${ASSETS}\` block, so every hashed asset is revalidated on every ` +
        `navigation even though its name already encodes its content. Add \`${ASSETS}\` with ` +
        `\`Cache-Control: ${IMMUTABLE}\`.`,
    )
  } else {
    const cache = hashed.headers.find((header) => header.name.toLowerCase() === 'cache-control')
    if (!cache) {
      found.push(
        `${subject}:${hashed.line} \`${ASSETS}\` carries no Cache-Control, so the long cache the ` +
          `content hash makes safe is not claimed. Add \`Cache-Control: ${IMMUTABLE}\`.`,
      )
    } else if (cache.value !== IMMUTABLE) {
      found.push(
        `${subject}:${cache.line} \`${ASSETS}\` is cached as \`${cache.value}\` rather than ` +
          `\`${IMMUTABLE}\`. The hash in the name is what makes a year safe; anything shorter ` +
          'spends a round trip per navigation for nothing.',
      )
    }
  }

  for (const block of blocks) {
    if (block.path === ASSETS) continue
    for (const header of block.headers) {
      if (header.name.toLowerCase() !== 'cache-control') continue
      if (!outlivesADeploy(header.value)) continue
      found.push(
        `${subject}:${header.line} \`${block.path}\` is cached as \`${header.value}\`, which ` +
          'outlives a deploy, and nothing under that path carries a content hash. The shell is ' +
          'what delivers the new hashes: served from an old cache it asks for chunks the site no ' +
          `longer has. Only \`${ASSETS}\` may be cached this long.`,
      )
    }
  }

  return found
}

/**
 * Both files, and both claims.
 *
 * The bytes come from the `commit` subject rather than from a path this file
 * joins: a host reads what was committed, and a rule file that is not in the
 * commit is a subject nobody measured rather than a clean run.
 *
 * @param {string} [root]
 */
export function sweepHostingRules(root = process.cwd()) {
  const committed = sweep({
    subject: 'commit',
    root,
    where: (path) => path === REDIRECTS || path === HEADERS,
    what: 'hosting rule file a commit would carry',
  })

  const files = []
  for (const subject of [REDIRECTS, HEADERS]) {
    const text = committed.read(subject)
    if (text === null) {
      throw new Error(
        `no ${subject} under ${committed.base}: a host reads its rules out of the commit, and ` +
          'this one carries none',
      )
    }
    files.push({ subject, text })
  }

  const [redirects, headers] = files
  return {
    failures: [
      ...redirectFindings(redirects.text, redirects.subject),
      ...cacheFindings(headers.text, headers.subject),
    ],
    rules:
      redirectsIn(redirects.text).length + headerBlocksIn(headers.text).length,
  }
}

/**
 * The verdict: the two files a host reads, held to the order and the cache.
 *
 * Pure — it reads, decides, and hands back what it found and how many rules it
 * counted. Nothing here prints or exits.
 */
export function judge(root = process.cwd()) {
  const { failures, rules } = sweepHostingRules(root)
  return {
    what: 'a hosting rule a commit would carry',
    count: rules,
    opening:
      'The two files a host reads before any of this code runs no longer say what they have ' +
      'to:\n',
    findings: failures.map((one) => `  ${one}`),
    closing:
      `\n${failures.length} rule${failures.length === 1 ? '' : 's'} to fix in ${REDIRECTS} / ` +
      `${HEADERS}. Then run npm run check:hosting.`,
    line:
      `[hosting] ${rules} rules in ${REDIRECTS} and ${HEADERS} — a missing chunk answers ` +
      `${MISSING_CHUNK.status} above the catch-all, and only ${ASSETS} is cached past a deploy.`,
  }
}

whenRun(import.meta.url, judge)
