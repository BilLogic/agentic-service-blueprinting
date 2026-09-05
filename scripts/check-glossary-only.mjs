#!/usr/bin/env node
/**
 * `CONTEXT.md` defines this repository's terms and stops.
 *
 * The engineering skills this repo routes to assume one shape: `AGENTS.md`
 * routes, `CONTEXT.md` defines terms, `docs/adr/` holds decisions. This
 * glossary had grown three reference sections inside it — a rename map, an
 * interface-to-schema map, and a section of reasoning about which words a
 * check should exempt — and every session that opened the file to look up one
 * word paid for all three. #137 moved them out: the rename map to
 * `scripts/retired-vocabulary.mjs` and `scripts/check-retired-identifiers.mjs`,
 * where the checks that enforce it live, and the interface map to
 * `references/interface-schema-map.md`, where one pointer reaches it.
 *
 * A file that has been cut once grows back unless something holds it. The
 * glossary already SAID it was definitions only, in its own opening paragraph,
 * and went on saying it while three of its six sections were something else.
 * This is that sentence with a build behind it.
 *
 * ── THE GRAMMAR, READ OFF WHAT IS LEFT ──────────────────────────────────────
 *
 * A glossary is headings, prose, and TERM ROWS — `**term** — definition`, the
 * shape every entry in the file already takes. The rules are three, and each
 * one names a way the file grew last time:
 *
 *   1. NO FENCED CODE BLOCK. A definition is a sentence. A fence is an example,
 *      a schema listing or a snippet — the beginning of a reference document,
 *      and reference documents are disclosed rather than always-open.
 *   2. NO TABLE NAMES A COLUMN. Both evicted maps were tables of
 *      `table.column` spans, and that is the tell: a table whose cells are
 *      schema names restates the catalogue, which is what a generated
 *      reference is for. Tables as such are allowed — the file draws one, of
 *      who writes what, and no cell of it names a column — because the rule
 *      that catches the real thing is narrower than "no tables" and needs no
 *      exemption to stay true.
 *   3. EVERY SECTION DEFINES A TERM. A `##` or `###` section with no term row
 *      in it is a body: prose that is about something other than what a word
 *      means. All three evicted sections failed this rule on the day they were
 *      written, and it is the one that catches the next one before it is a
 *      hundred lines long.
 *
 * SUBJECT is `CONTEXT.md` alone. It is named here rather than walked for,
 * because the glossary is one file by the shape's own definition: a second
 * glossary would be a second vocabulary. A workspace scaffolded from this
 * template carries its own, and `docs/agents/domain.md` is where that layout is
 * described; this check holds the template's.
 *
 * Sibling of the router's three checks (#139) — same shape, same failure style,
 * same place in CI — because `CONTEXT.md` is the first pointer `AGENTS.md`
 * fires and a session that reads the router reads this next.
 *
 * Adapted from the deployment's check of the same name (#365): same three
 * rules, same messages, same test shape. What differs is where a reference
 * lives — `references/` here, because a path under it is a published interface
 * a deployment can import (`docs/adr/0004-reference-paths-are-a-published-interface.md`).
 *
 * Run: node scripts/check-glossary-only.mjs   (also: npm run check:glossary)
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname)

/** The glossary. One file, by the shape's own definition. */
export const SUBJECT = 'CONTEXT.md'

/** A term row: the bold word, then an em dash, then what it means. */
export const TERM_ROW = /^\*\*[^*\n]+\*\*\s+—\s+\S/

/** Extensions that make a dotted code span a path rather than a column. */
const PATH_SUFFIX = /\.(?:md|mjs|js|ts|tsx|jsx|json|ya?ml|sql|css|sh|py|toml|png|svg)$/

/** Does this code span name a `table.column`? */
export function namesAColumn(span) {
  const text = span.trim()
  if (text.includes('/') || text.includes(' ') || PATH_SUFFIX.test(text)) return false
  return /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(text)
}

/** Every `##`/`###`… section: its heading, its line number, and its body lines. */
export function sectionsIn(lines) {
  const sections = []
  let open = null
  for (let i = 0; i < lines.length; i += 1) {
    const heading = /^(#{2,6})\s+(.*)$/.exec(lines[i])
    if (heading) {
      if (open) sections.push(open)
      open = { heading: heading[2].trim(), line: i + 1, body: [] }
      continue
    }
    if (open) open.body.push(lines[i])
  }
  if (open) sections.push(open)
  return sections
}

/**
 * The three rules, over one document's text.
 *
 * Pure and exported, so the unit test can run them over a fixture rather than
 * over the real glossary — which is the only way to prove every branch goes
 * red without editing the file the check protects.
 */
export function findings(text, subject = SUBJECT) {
  const out = []
  const lines = text.split('\n')

  const fenceFailure = (line) =>
    `${subject}:${line} a fenced code block — the glossary is headings, prose and ` +
    '`**term** — definition` rows. A snippet, a listing or an example is a reference, ' +
    'and a reference is a document under references/ or docs/ that a pointer reaches.'

  let fence = null
  const inFence = []
  lines.forEach((line, index) => {
    const marker = /^\s*(```+|~~~+)/.exec(line)
    if (marker) {
      if (fence === null) fence = { char: marker[1][0], line: index + 1 }
      else if (marker[1][0] === fence.char) {
        out.push(fenceFailure(fence.line))
        fence = null
      }
    }
    inFence[index] = fence !== null || Boolean(marker)
  })
  if (fence !== null) out.push(fenceFailure(fence.line))

  lines.forEach((line, index) => {
    if (inFence[index]) return
    if (!line.trimStart().startsWith('|')) return
    const named = [...line.matchAll(/`([^`\n]+)`/g)]
      .map((match) => match[1])
      .filter((span) => namesAColumn(span))
    if (named.length === 0) return
    out.push(
      `${subject}:${index + 1} a table row naming ${named.map((one) => `\`${one}\``).join(', ')} — ` +
        'a table of column names restates the catalogue, which is what ' +
        'references/interface-schema-map.md is generated to do. Put the row there ' +
        'and leave the glossary the word.',
    )
  })

  for (const section of sectionsIn(lines)) {
    if (section.body.some((line) => TERM_ROW.test(line))) continue
    out.push(
      `${subject}:${section.line} § ${section.heading} defines no term — a section with no ` +
        '`**term** — definition` row in it is a body, not a glossary entry. Move it to the ' +
        'document it is about, and leave the words it uses defined here.',
    )
  }

  return out
}

export function sweep(root = REPO_ROOT, subject = SUBJECT) {
  const text = readFileSync(join(root, subject), 'utf8')
  const terms = text.split('\n').filter((line) => TERM_ROW.test(line)).length
  return { failures: findings(text, subject), terms, chars: text.length }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { failures, terms, chars } = sweep()
  if (failures.length > 0) {
    console.error(
      `[glossary] ${failures.length} thing(s) in ${SUBJECT} that are not a definition:\n` +
        failures.map((one) => `  ${one}`).join('\n') +
        '\n  -> the glossary defines the words and stops. Everything else is a document ' +
        'under references/ or docs/ with a pointer in AGENTS.md.',
    )
    process.exit(1)
  }
  console.log(
    `[glossary] ${SUBJECT} is ${terms} term rows of headings, prose and definitions ` +
      `(${chars.toLocaleString('en-US')} chars) — no code fence, no table naming a column, ` +
      'no section without a term.',
  )
}
