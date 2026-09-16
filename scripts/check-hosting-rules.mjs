#!/usr/bin/env node
/**
 * A chunk the deploy no longer ships answers 404, and a chunk it does ships
 * cacheable forever.
 *
 * Two rules, in files a host reads before any of this repository's code runs,
 * and neither rule is visible to a build, a test or a page load. That is why
 * they get a check: the failure each one prevents arrives at a reader months
 * later, as a sentence about something else.
 *
 * THE FIRST IS THE ORDER. `netlify.toml` ends in the single-page catch-all,
 * `/*` → `/index.html` with a 200, and the host takes the FIRST rule that
 * matches. A content-hashed chunk under `/assets/` that this deploy does not
 * have therefore matches the catch-all, and the browser is handed
 * `index.html` — a 200, and `text/html`, where it asked for a script. What it
 * reports is "Failed to fetch dynamically imported module", naming the import
 * site and not the file that is missing, so the first place anyone looks is
 * the import. An `/assets/*` rule with a 404 above the catch-all makes the
 * missing file say it is missing.
 *
 * A rule added BELOW the catch-all is the same defect wearing the fix, and it
 * reads as correct in a diff — which is the whole reason the order is asserted
 * rather than described.
 *
 * WHY A PRESENT ASSET IS STILL SERVED, since the rule matches its path too:
 * a host does not shadow existing content with a NON-FORCED rule. The file
 * wins, and the rule is consulted only where there is no file. `:splat` does
 * not do that job — it keeps the TARGET honest, so the rule cannot quietly
 * rewrite one path into another — and with a 404 status the body is the site's
 * own 404 page whatever the target says. `force` is what removes the
 * protection: a forced 404 on `/assets/*` answers 404 for every asset that
 * DOES exist, which is the whole site, and in a diff it reads as merely more
 * emphatic. So forcing is asserted against, and it is the assertion nothing
 * else in this repository could make.
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
 * The `commit` subject of `sweep.mjs`, whose `files` answer "is this path in
 * the commit" and whose `read` answers "is the file there". A host deploys
 * what a git install would ship, so both questions are asked of every rule
 * file: a `netlify.toml` nobody committed is not deployed however well it
 * reads on disk, and that gap is reported rather than passed over. This is the
 * shape `check-reference-paths.mjs` already uses for the same pair of
 * questions.
 *
 * THREE FILES, not two. `public/_redirects` is not in this template and the
 * check reads for it anyway, because a host processes that file BEFORE the
 * configuration file: a repository started from this template that adds its
 * own catch-all there reinstates the defect above every rule in `netlify.toml`,
 * and would do it with this check green. So the file is optional and, where it
 * exists, holds the same order.
 *
 * Both header sources are read: `public/_headers`, and the `[[headers]]`
 * blocks a `netlify.toml` may carry. Only the first has to declare the hashed
 * cache — one home for the rule — but a long cache on an unhashed path is the
 * defect wherever it is written, and a check that read only one of the two
 * would be a check with a documented way around it.
 *
 * What it counts is RULES, not files. Every file here passes every assertion
 * below when it is empty, so a run over emptied files would otherwise print
 * the same green line as a run over the real ones.
 *
 * Run: node scripts/check-hosting-rules.mjs   (also: npm run check:hosting)
 */
import { sweep } from './sweep.mjs'
import { whenRun } from './verdict.mjs'


/** The host's redirect table, and its optional header blocks. */
export const CONFIG = 'netlify.toml'

/** The host's response headers. */
export const HEADERS = 'public/_headers'

/**
 * The redirect file a host reads BEFORE the configuration file. Not in this
 * template; read for because a repository started from it may add one.
 */
export const FILE_REDIRECTS = 'public/_redirects'

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
 * Every freshness directive that names a number of seconds.
 *
 * `max-age` for a browser, `s-maxage` for a shared cache — and `s-maxage` is
 * spelled without the second hyphen, so a pattern written as `(?:s-)?max-age`
 * matches the browser one and walks straight past the CDN one. A shell a CDN
 * holds for a year is the same reader on the same stale shell.
 */
const SECONDS_DIRECTIVE = /\b(?:s-maxage|s-max-age|max-age)\s*=\s*(\d+)/g

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
 * @returns {Array<{ line: number, from?: string, to?: string, status?: string, force?: boolean }>}
 */
export function redirectsIn(text) {
  const blocks = []
  let open = null
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim()
    if (line.startsWith('#')) return
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
    const pair = /^(from|to|status|force)\s*=\s*(.*)$/.exec(line)
    if (!pair) return
    const value = pair[2].trim().replace(/^["']|["']$/g, '')
    if (pair[1] === 'force') open.force = value === 'true'
    else open[pair[1]] = value
  })
  return blocks
}

/**
 * Every rule in a `_redirects` file, in order.
 *
 * The format is positional — `from  to  status` on one line — and forcing is a
 * `!` on the status rather than a key of its own, which is a whole clause of
 * meaning in one character nobody reviews.
 *
 * @param {string} text
 * @returns {Array<{ line: number, from?: string, to?: string, status?: string, force?: boolean }>}
 */
export function redirectLinesIn(text) {
  const rules = []
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim()
    if (!line || line.startsWith('#')) return
    const [from, to, status] = line.split(/\s+/)
    rules.push({
      line: index + 1,
      from,
      to,
      status: status?.replace(/!$/, ''),
      force: Boolean(status?.endsWith('!')),
    })
  })
  return rules
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
 * Every `[[headers]]` block in a TOML file, in the shape `_headers` parses to.
 *
 * `for = "<path>"` names the path and the values live in a nested
 * `[headers.values]` table, so that sub-table is the one `[` which does not
 * close the block. Returned in the same shape as `headerBlocksIn`, so one
 * cache judgement reads both sources.
 *
 * @param {string} text
 * @returns {Array<{ path: string, line: number, headers: Array<{ name: string, value: string, line: number }> }>}
 */
export function tomlHeaderBlocksIn(text) {
  const blocks = []
  let open = null
  let inValues = false
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim()
    if (line.startsWith('#')) return
    if (line === '[[headers]]') {
      open = { path: undefined, line: index + 1, headers: [] }
      inValues = false
      blocks.push(open)
      return
    }
    if (line === '[headers.values]') {
      inValues = true
      return
    }
    if (line.startsWith('[')) {
      open = null
      inValues = false
      return
    }
    if (!open) return
    const forPath = /^for\s*=\s*(.*)$/.exec(line)
    if (forPath) {
      open.path = forPath[1].trim().replace(/^["']|["']$/g, '')
      return
    }
    if (!inValues) return
    const pair = /^([A-Za-z0-9-]+)\s*=\s*(.*)$/.exec(line)
    if (!pair) return
    open.headers.push({
      name: pair[1].trim(),
      value: pair[2].trim().replace(/^["']|["']$/g, ''),
      line: index + 1,
    })
  })
  return blocks.filter((block) => block.path !== undefined)
}

/**
 * Is this header name a cache directive?
 *
 * Every one of them ends in `cache-control`: the standard header, and the
 * `CDN-Cache-Control` / `Netlify-CDN-Cache-Control` pair a host reads in
 * preference to it. Matching the bare name alone left the two that override it
 * unread.
 *
 * @param {string} name
 */
export function isCacheHeader(name) {
  return name.trim().toLowerCase().endsWith('cache-control')
}

/**
 * Does this cache value outlive a deploy?
 *
 * @param {string} value
 */
export function outlivesADeploy(value) {
  const lowered = value.toLowerCase()
  if (/\bimmutable\b/.test(lowered)) return true
  for (const match of lowered.matchAll(SECONDS_DIRECTIVE)) {
    if (Number(match[1]) >= LONG_CACHE_SECONDS) return true
  }
  return false
}

/**
 * The order claim, over one already-parsed redirect table.
 *
 * Pure and exported, so every branch can be driven from a fixture instead of
 * from the file the check protects — which is the only way to see the guard go
 * red without editing what a host reads. `note` is the sentence a particular
 * file adds about its own precedence.
 *
 * @param {ReturnType<typeof redirectsIn>} blocks
 * @param {string} subject
 * @param {string} [note]
 * @returns {string[]}
 */
export function orderFindings(blocks, subject, note = '') {
  const found = []
  const tail = note ? ` ${note}` : ''
  const missing = blocks.findIndex((block) => block.from === MISSING_CHUNK.from)
  const catchAll = blocks.findIndex((block) => block.from === '/*')

  if (missing === -1) {
    found.push(
      `${subject} has no \`${MISSING_CHUNK.from}\` rule, so a hashed chunk this deploy no ` +
        'longer ships falls through to the catch-all and is answered with the app shell — a 200 ' +
        'and text/html where a script was asked for. Add the rule with ' +
        `from = "${MISSING_CHUNK.from}", to = "${MISSING_CHUNK.to}", ` +
        `status = ${MISSING_CHUNK.status}, and no force.${tail}`,
    )
  } else {
    const block = blocks[missing]
    if (block.to !== MISSING_CHUNK.to) {
      found.push(
        `${subject}:${block.line} sends \`${MISSING_CHUNK.from}\` to \`${block.to}\` — the ` +
          `target has to be \`${MISSING_CHUNK.to}\`, which is what keeps the rule from quietly ` +
          'rewriting one path into another.',
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

  // FORCING, on either rule, and this is the finding that matters most. A
  // non-forced rule is not consulted while the file exists, which is the only
  // reason a 404 over the whole of `/assets/*` is safe. Forced, the same rule
  // answers for the files too — a 404 for every asset the site HAS — and the
  // diff that did it reads as emphasis.
  for (const index of [missing, catchAll]) {
    if (index === -1) continue
    const block = blocks[index]
    if (!block.force) continue
    found.push(
      `${subject}:${block.line} forces \`${block.from}\`. A host does not shadow existing ` +
        'content with a non-forced rule, and that — not `:splat` — is why an asset that IS ' +
        'there is still served. Forced, the rule answers for the files too: on ' +
        `\`${MISSING_CHUNK.from}\` that is a ${MISSING_CHUNK.status} for every asset the site ` +
        'has. Remove the force.',
    )
  }

  if (catchAll === -1) {
    found.push(
      `${subject} has no \`/*\` catch-all, so there is nothing for the ` +
        `\`${MISSING_CHUNK.from}\` rule to precede and no path reaches the app. The single-page ` +
        `fallback is what every deep link depends on.${tail}`,
    )
  } else if (missing > catchAll) {
    found.push(
      `${subject}:${blocks[missing].line} puts the \`${MISSING_CHUNK.from}\` rule BELOW the ` +
        `\`/*\` catch-all on line ${blocks[catchAll].line}. The host takes the first rule that ` +
        'matches, so below it the rule is never reached and the defect it fixes is back, wearing ' +
        `the fix. Move the block above the catch-all.${tail}`,
    )
  }

  return found
}

/** The order claim over one `netlify.toml`'s text. */
export function redirectFindings(text, subject = CONFIG) {
  return orderFindings(redirectsIn(text), subject)
}

/**
 * The order claim over one `_redirects` file's text.
 *
 * The note is the reason this file is read at all: a host processes it BEFORE
 * the configuration file, so a catch-all here sits above every rule in
 * `netlify.toml` and reinstates the defect from above it.
 */
export function fileRedirectFindings(text, subject = FILE_REDIRECTS) {
  return orderFindings(
    redirectLinesIn(text),
    subject,
    `A host processes ${subject} BEFORE ${CONFIG}, so this file's own order is the one that ` +
      `decides; the rules in ${CONFIG} are never reached for a path this file matches.`,
  )
}

/**
 * The hashed output declares its own long cache — once.
 *
 * @param {ReturnType<typeof headerBlocksIn>} blocks
 * @param {string} subject
 * @returns {string[]}
 */
export function hashedCacheFindings(blocks, subject = HEADERS) {
  const found = []
  const hashed = blocks.filter((block) => block.path === ASSETS)

  if (hashed.length === 0) {
    found.push(
      `${subject} has no \`${ASSETS}\` block, so every hashed asset is revalidated on every ` +
        `navigation even though its name already encodes its content. Add \`${ASSETS}\` with ` +
        `\`Cache-Control: ${IMMUTABLE}\`.`,
    )
    return found
  }

  if (hashed.length > 1) {
    // Two blocks for one path is one answer and one lie: a host reads the
    // first, a reader reads the last, and a `no-store` underneath the year
    // passes every assertion made about the year alone.
    found.push(
      `${subject}:${hashed[1].line} declares \`${ASSETS}\` a second time (the first is on line ` +
        `${hashed[0].line}). One path, one block — a second one is a rule nobody can read off ` +
        'the file, and the one further down is the one a reviewer sees.',
    )
  }

  for (const block of hashed) {
    const cache = block.headers.find((header) => isCacheHeader(header.name))
    if (!cache) {
      found.push(
        `${subject}:${block.line} \`${ASSETS}\` carries no Cache-Control, so the long cache the ` +
          `content hash makes safe is not claimed. Add \`Cache-Control: ${IMMUTABLE}\`.`,
      )
      continue
    }
    if (cache.value !== IMMUTABLE) {
      found.push(
        `${subject}:${cache.line} \`${ASSETS}\` is cached as \`${cache.value}\` rather than ` +
          `\`${IMMUTABLE}\`. The hash in the name is what makes a year safe; anything shorter ` +
          'spends a round trip per navigation for nothing.',
      )
    }
  }

  return found
}

/**
 * Nothing unhashed is cached past a deploy — in whichever file it was written.
 *
 * @param {ReturnType<typeof headerBlocksIn>} blocks
 * @param {string} subject
 * @returns {string[]}
 */
export function longCacheFindings(blocks, subject = HEADERS) {
  const found = []
  for (const block of blocks) {
    if (block.path === ASSETS) continue
    for (const header of block.headers) {
      if (!isCacheHeader(header.name)) continue
      if (!outlivesADeploy(header.value)) continue
      found.push(
        `${subject}:${header.line} \`${block.path}\` is cached as \`${header.name}: ` +
          `${header.value}\`, which outlives a deploy, and nothing under that path carries a ` +
          'content hash. The shell is what delivers the new hashes: served from an old cache it ' +
          `asks for chunks the site no longer has. Only \`${ASSETS}\` may be cached this long.`,
      )
    }
  }
  return found
}

/** Both cache claims over one `_headers` file's text. */
export function cacheFindings(text, subject = HEADERS) {
  const blocks = headerBlocksIn(text)
  return [...hashedCacheFindings(blocks, subject), ...longCacheFindings(blocks, subject)]
}

/**
 * The commit, whose `files` answer membership and whose `read` answers
 * presence.
 *
 * @param {string} [root]
 */
export function hostingSweep(root = process.cwd()) {
  return sweep({ subject: 'commit', root, what: 'file a commit would carry' })
}

/**
 * Every finding, and how many rules were read for them.
 *
 * A rule file the tree does not have is a FINDING rather than a throw: the
 * guard set's own rule is that a check names a subject and judges, and
 * `verdict.mjs` reserves a throw for a fact about the tree rather than a fact
 * about the subject. With no rule file there is nothing to count either, so
 * `count` falls to zero and the NO SUBJECT outcome says the rest.
 *
 * @param {{ read: (path: string) => string | null, files: string[] }} walk
 */
export function hostingFindings(walk) {
  const tracked = new Set(walk.files)
  const found = []
  let rules = 0

  /** Present, committed, or neither — asked of one rule file. */
  const present = (subject, required) => {
    const text = walk.read(subject)
    if (text === null) {
      if (required) {
        found.push(
          `${subject} is not in this tree. It is what tells the host to answer a missing chunk ` +
            'with a 404 and to cache the hashed output for a year, and neither rule has any ' +
            'other home. Restore it.',
        )
      }
      return null
    }
    if (!tracked.has(subject)) {
      found.push(
        `${subject} is untracked — a git install would not ship it, so a deploy resolves none ` +
          'of the rules in it however well the file reads here. Commit it.',
      )
    }
    return text
  }

  const config = present(CONFIG, true)
  if (config !== null) {
    const blocks = redirectsIn(config)
    const tomlHeaders = tomlHeaderBlocksIn(config)
    rules += blocks.length + tomlHeaders.length
    found.push(...orderFindings(blocks, CONFIG))
    // `[[headers]]` here does not have to declare the hashed cache — that is
    // `public/_headers`'s one home for it — but a long cache on an unhashed
    // path is the defect wherever it was written down.
    found.push(...longCacheFindings(tomlHeaders, CONFIG))
  }

  const headers = present(HEADERS, true)
  if (headers !== null) {
    const blocks = headerBlocksIn(headers)
    rules += blocks.length
    found.push(...hashedCacheFindings(blocks, HEADERS))
    found.push(...longCacheFindings(blocks, HEADERS))
  }

  // Optional, and read for anyway: this template ships none, and a repository
  // started from it that adds one puts its rules AHEAD of everything above.
  const fileRedirects = present(FILE_REDIRECTS, false)
  if (fileRedirects !== null) {
    const lines = redirectLinesIn(fileRedirects)
    rules += lines.length
    found.push(...fileRedirectFindings(fileRedirects, FILE_REDIRECTS))
  }

  return { failures: found, rules }
}

/**
 * The verdict: the files a host reads, held to the order and the cache.
 *
 * Pure — it reads, decides, and hands back what it found and how many rules it
 * counted. Nothing here prints or exits.
 */
export function judge(root = process.cwd()) {
  const { failures, rules } = hostingFindings(hostingSweep(root))
  return {
    what: 'a hosting rule a commit would carry',
    count: rules,
    opening:
      'The files a host reads before any of this code runs no longer say what they have to:\n',
    findings: failures.map((one) => `  ${one}`),
    closing:
      `\n${failures.length} rule${failures.length === 1 ? '' : 's'} to fix in ${CONFIG} / ` +
      `${HEADERS}. Then run npm run check:hosting.`,
    line:
      `[hosting] ${rules} rules in ${CONFIG} and ${HEADERS} — a missing chunk answers ` +
      `${MISSING_CHUNK.status} above the catch-all, nothing is forced, and only ${ASSETS} is ` +
      'cached past a deploy.',
  }
}

whenRun(import.meta.url, judge)
