/**
 * A deployment's agent-facing account of the schema — the pure half.
 *
 * `docs/agents/blueprint.md` has two kinds of section. The hand-written core
 * says what the catalog cannot: how to read a cell, what absence means, what
 * a status licenses an agent to say, how paths relate to a scenario's main
 * route. The generated sections say what the code and the catalog already
 * say, and are RENDERED from them rather than written a third time:
 *
 *   vocabulary   from `ENTITY_KIND_DEFINITIONS` in src/lib/panelTerms.ts —
 *                the six kinds the board defines for a reader, read off the
 *                source text
 *   schema       from `public.schema_comments()` (pg_description, live) laid
 *                over the column inventory in src/types/database.ts, so an
 *                undescribed column shows as a gap rather than vanishing
 *
 * Two numbers ratchet against docs/reference/agent-account-baseline.json:
 * column-comment coverage, which may only rise, and the count of
 * prohibitions in the hand-written core, which may only fall. Instructions
 * phrased as what to do are what an agent can act on; "never X" leaves it
 * guessing what to do instead.
 *
 * Pure: reads text, returns text. `generate-agent-account.mjs` does the I/O.
 * With no database connected that script generates nothing, so this module
 * is the whole of what CI can hold.
 */

/* ------------------------------------------------------------- sources */

/**
 * The entity kinds and their definitions, read off panelTerms.ts.
 *
 * @param {string} source
 * @returns {{ kind: string, label: string, definition: string }[]}
 */
export function entityKinds(source) {
  const start = source.indexOf('export const ENTITY_KIND_DEFINITIONS = {')
  const end = source.indexOf('} as const', start)
  if (start === -1 || end === -1) throw new Error('ENTITY_KIND_DEFINITIONS not found in panelTerms.ts')
  const block = source.slice(start, end)
  const kinds = []
  const ENTRY = /^\s{2}([a-z_]+): \{\s*\n\s*label: '((?:[^'\\]|\\.)*)',\s*\n\s*definition:\s*\n?\s*'((?:[^'\\]|\\.)*)',/gm
  for (const m of block.matchAll(ENTRY)) {
    kinds.push({ kind: m[1], label: unescape(m[2]), definition: unescape(m[3]) })
  }
  if (kinds.length === 0) throw new Error('ENTITY_KIND_DEFINITIONS has no entries the renderer can read')
  return kinds
}

/** @param {string} text */
const unescape = (text) => text.replace(/\\(.)/g, '$1')

/**
 * Every relation's columns, read off the generated Supabase types: each
 * `name: { Row: { … } }` under Tables and Views. Functions carry no Row and
 * are not relations.
 *
 * @param {string} databaseTs
 * @returns {Map<string, string[]>}
 */
export function tableColumns(databaseTs) {
  const relations = new Map()
  const ROW = /\n {6}([a-z_]+): \{\n {8}Row: \{\n([\s\S]*?)\n {8}\}/g
  for (const m of databaseTs.matchAll(ROW)) {
    const columns = [...m[2].matchAll(/^\s+([a-z_]+)\??:/gm)].map((c) => c[1])
    relations.set(m[1], columns)
  }
  if (relations.size === 0) throw new Error('no Row types found in database.ts')
  return relations
}

/* ------------------------------------------------------------ rendering */

/** @param {unknown} text */
const cell = (text) => String(text ?? '').replace(/\s+/g, ' ').replaceAll('|', '\\|').trim()

/**
 * The vocabulary section: one line per kind, the label bold, the definition as written.
 *
 * @param {{ kind: string, label: string, definition: string }[]} kinds
 */
export function renderVocabulary(kinds) {
  return kinds.map(({ label, definition }) => `**${label}** — ${definition}`).join('\n\n')
}

/**
 * The schema section. One block per relation an agent can read: the table's
 * own comment, then every column with its comment or a dash. Relations the
 * anon key cannot select are listed after, comment only, so an agent knows
 * they exist and what key they need.
 *
 * `comments` is what `schema_comments()` returns; `columns` is
 * `tableColumns()`; `readable` is the set of relations a bare select
 * succeeded on.
 *
 * @param {{ columns: Map<string, string[]>, comments: { relation: string, column_name: string | null, comment: string }[], readable: Set<string> }} sources
 */
export function renderSchema({ columns, comments, readable }) {
  const tableComment = new Map()
  const columnComment = new Map()
  for (const row of comments) {
    if (row.column_name) columnComment.set(`${row.relation}.${row.column_name}`, row.comment)
    else tableComment.set(row.relation, row.comment)
  }
  const names = [...columns.keys()].sort()
  const open = names.filter((name) => readable.has(name))
  const sealed = names.filter((name) => !readable.has(name))
  const parts = []
  for (const name of open) {
    const cols = columns.get(name)
    const described = cols.filter((c) => columnComment.has(`${name}.${c}`)).length
    // The comment sits in the heading's paragraph on purpose: a table
    // comment that records its own rename ("the bare word `findings` gave a
    // reader no clue") is excused by the name beside it, and `a-doc-names`
    // judges by paragraph.
    parts.push(
      `### \`${name}\`\n` +
        `${cell(tableComment.get(name) ?? '—')}\n\n` +
        `${described} of ${cols.length} columns described.\n\n` +
        '| Column | Meaning |\n|---|---|\n' +
        cols.map((c) => `| \`${c}\` | ${cell(columnComment.get(`${name}.${c}`) ?? '—')} |`).join('\n'),
    )
  }
  if (sealed.length > 0) {
    parts.push(
      '### Not readable with the anon key\n\n' +
        'These exist and a service key reads them. What each is for:\n\n' +
        sealed.map((name) => `- \`${name}\` — ${cell(tableComment.get(name) ?? '—')}`).join('\n'),
    )
  }
  return parts.join('\n\n')
}

/**
 * Column-comment coverage over the relations an agent can read.
 *
 * @param {{ columns: Map<string, string[]>, comments: { relation: string, column_name: string | null }[], readable: Set<string> }} sources
 * @returns {{ described: number, of: number }}
 */
export function coverage({ columns, comments, readable }) {
  const described = new Set(comments.filter((r) => r.column_name).map((r) => `${r.relation}.${r.column_name}`))
  let of = 0
  let done = 0
  for (const [name, cols] of columns) {
    if (!readable.has(name)) continue
    of += cols.length
    done += cols.filter((c) => described.has(`${name}.${c}`)).length
  }
  return { described: done, of }
}

/* --------------------------------------------------------------- splice */

/** @param {string} name */
const marker = (name) => ({
  open: new RegExp(`<!-- generated:${name}[^>]*-->`),
  close: `<!-- /generated:${name} -->`,
})

/**
 * The document with the named generated section replaced by `body`.
 *
 * @param {string} doc
 * @param {string} name
 * @param {string} body
 */
export function splice(doc, name, body) {
  const { open, close } = marker(name)
  const start = open.exec(doc)
  const end = doc.indexOf(close)
  if (!start || end === -1 || end < start.index) {
    throw new Error(`docs/agents/blueprint.md has no <!-- generated:${name} --> … ${close} section`)
  }
  const head = doc.slice(0, start.index + start[0].length)
  return `${head}\n\n${body.trim()}\n\n${doc.slice(end)}`
}

/**
 * The hand-written text: everything outside the generated sections and the frontmatter.
 *
 * @param {string} doc
 */
export function handWritten(doc) {
  return doc
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/<!-- generated:([a-z]+)[^>]*-->[\s\S]*?<!-- \/generated:\1 -->/g, '')
}

// An instruction, not a description: "Never assert…" at the head of a
// sentence or a bullet, not "the staff they do not see" inside one.
const PROHIBITION = /(?:^|[.;:!?]\s+|—\s+|\n\s*-\s+)(?:never|do not|don't|must not)\b/gim

/**
 * How many times the hand-written core tells the reader what not to do.
 *
 * @param {string} text
 */
export function prohibitionCount(text) {
  return (text.match(PROHIBITION) ?? []).length
}

/* -------------------------------------------------------------- ratchet */

/**
 * Failures against the recorded baseline, empty when it holds. Coverage may
 * only rise and prohibitions may only fall; an improvement that is not
 * recorded is a failure too, because a baseline that never moves is a
 * backlog wearing a ratchet's clothes.
 *
 * @param {{ columnComments: { described: number, of: number }, prohibitions: number }} current
 * @param {{ columnComments: { described: number, of: number }, prohibitions: number }} baseline
 * @returns {string[]}
 */
export function ratchetFailures(current, baseline) {
  const failures = []
  const ratio = ({ described, of }) => (of === 0 ? 0 : described / of)
  const now = ratio(current.columnComments)
  const was = ratio(baseline.columnComments)
  if (now < was) {
    failures.push(
      `column-comment coverage fell: ${current.columnComments.described} of ${current.columnComments.of} ` +
        `described, against ${baseline.columnComments.described} of ${baseline.columnComments.of} recorded. ` +
        `A column added without a comment is a gap in what every agent reads — comment it in the migration.`,
    )
  }
  if (current.prohibitions > baseline.prohibitions) {
    failures.push(
      `the hand-written core has ${current.prohibitions} prohibition(s), against ${baseline.prohibitions} recorded. ` +
        `Say what to do instead of what not to.`,
    )
  }
  if (now > was || current.prohibitions < baseline.prohibitions) {
    failures.push(
      `the baseline is stale — coverage ${current.columnComments.described}/${current.columnComments.of}, ` +
        `prohibitions ${current.prohibitions}, better than recorded. Re-record: npm run agent-account -- --record`,
    )
  }
  return failures
}

/**
 * Render the generated sections and collect check failures, without I/O.
 *
 * `check: true` fails when the document is not what the sources render.
 * Missing `baseline` is itself a failure: a ratchet that was never recorded
 * cannot hold. `record: true` skips both baseline failures, because the run
 * is writing the baseline they ask for; judging it against the one it
 * replaces failed the very command those failures prescribe.
 *
 * @param {{
 *   doc: string,
 *   kinds: { kind: string, label: string, definition: string }[],
 *   sources: { columns: Map<string, string[]>, comments: { relation: string, column_name: string | null, comment: string }[], readable: Set<string> },
 *   baseline: { columnComments: { described: number, of: number }, prohibitions: number } | null,
 *   check: boolean,
 *   record?: boolean,
 * }} input
 * @returns {{ next: string, current: { columnComments: { described: number, of: number }, prohibitions: number }, failures: string[] }}
 */
export function evaluate({ doc, kinds, sources, baseline, check, record = false }) {
  const next = splice(splice(doc, 'vocabulary', renderVocabulary(kinds)), 'schema', renderSchema(sources))
  const current = { columnComments: coverage(sources), prohibitions: prohibitionCount(handWritten(next)) }
  const failures = []
  if (check && next !== doc) {
    failures.push(
      'docs/agents/blueprint.md is not what its sources render — panelTerms.ts, pg_description or ' +
        'database.ts changed and the account did not. Run: npm run agent-account',
    )
  }
  if (record) return { next, current, failures }
  if (baseline) {
    failures.push(...ratchetFailures(current, baseline))
  } else {
    failures.push(
      'docs/reference/agent-account-baseline.json does not exist — record it: npm run agent-account -- --record',
    )
  }
  return { next, current, failures }
}
