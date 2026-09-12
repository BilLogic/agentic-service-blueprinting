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
 * WHO OWNS WHICH SOURCE. The vocabulary is the APPLICATION'S: the six kinds
 * are how the board defines itself to a reader, and they travel with whichever
 * copy of the application is running — so a deployment that reads the
 * application out of this package reads the same six, and `vocabularySource`
 * follows the application into `node_modules`. The schema is the DATABASE'S: a
 * deployment extends the template, so which relations exist and what columns
 * they carry is a fact about ITS database and no other. That is why
 * `schemaDeclaration` looks in the deployment's own root before this tree's,
 * and why what this package ships is only the last of three — a default, not
 * the truth.
 *
 * AND THE DATABASE HAS THE LAST WORD. A declaration is a list of relations to
 * ASK the database about; `reconcile` renders only what the answers confirmed.
 * A declared relation the database does not have is dropped, a declared column
 * it does not have is dropped, and a column it has that no declaration
 * mentions is rendered anyway. So the rendering is monotone in accuracy: the
 * command a red check prints can only move the document toward the database,
 * never away from it, whatever the declaration it started from said. The
 * disagreements come back as notes for the deployment to fold into its own
 * declaration, and none of them is a failure — a deployment is entitled to a
 * schema this package never had.
 *
 * Pure: reads text and paths, returns text and paths. Every answer that needs
 * a filesystem or a database is taken by `generate-agent-account.mjs` and
 * handed in. With no database connected that script generates nothing, so this
 * module is the whole of what CI can hold.
 */

/* ------------------------------------------------ where a source comes from */

/** The package a deployment reads the application out of. */
const PACKAGE = 'agentic-service-blueprinting'

/**
 * The first of `candidates` that exists, or the last of them when none does —
 * the last is the default, and naming it lets the caller report a source it
 * could not find rather than a source it never had.
 *
 * @param {{ path: string, owner: string }[]} candidates
 * @param {(path: string) => boolean} exists
 */
function firstPresent(candidates, exists) {
  return candidates.find((candidate) => exists(candidate.path)) ?? candidates[candidates.length - 1]
}

/**
 * Where the entity definitions are read from: this tree's own application, or
 * the package's when this tree has none.
 *
 * A deployment that stopped keeping a copy of the application did not stop
 * running it, and the kinds it shows a reader are the kinds that copy defines.
 * Two roots, in the order the build config resolves them.
 *
 * @param {string} root
 * @param {(path: string) => boolean} exists
 * @returns {{ path: string, owner: 'repository' | 'package' }}
 */
export function vocabularySource(root, exists) {
  return firstPresent(
    [
      { path: `${root}/src/lib/panelTerms.ts`, owner: 'repository' },
      { path: `${root}/node_modules/${PACKAGE}/src/lib/panelTerms.ts`, owner: 'package' },
    ],
    exists,
  )
}

/**
 * Where the declared relation inventory is read from.
 *
 * The deployment's own root first, because a deployment must not have to
 * change a file it holds identical to this package's in order to say something
 * true about its own database. Then this tree's own application, for a
 * repository that still keeps one — this package included. The package's copy
 * is last and is a DEFAULT: a starting list of relations to ask the database
 * about, which `reconcile` then corrects.
 *
 * @param {string} root
 * @param {(path: string) => boolean} exists
 * @returns {{ path: string, owner: 'deployment' | 'repository' | 'package' }}
 */
export function schemaDeclaration(root, exists) {
  return firstPresent(
    [
      { path: `${root}/deployment/types/database.ts`, owner: 'deployment' },
      { path: `${root}/src/types/database.ts`, owner: 'repository' },
      { path: `${root}/node_modules/${PACKAGE}/src/types/database.ts`, owner: 'package' },
    ],
    exists,
  )
}

/* --------------------------------------------- what the database answered */

/**
 * What one bare select said about a relation.
 *
 *   readable  the anon key selects it
 *   sealed    it is there and this key may not read it (42501, 401, 403)
 *   absent    this database does not have it at all (PGRST205, 404)
 *   unknown   something else went wrong, and the caller says so out loud
 *
 * `absent` is the answer the whole seam turns on, and PostgREST distinguishes
 * it from `sealed` precisely: a missing grant and a missing table are
 * different failures, and an account that confuses them either hides a
 * relation an agent could be told about or invents one that is not there.
 *
 * @param {{ status: number, body: unknown }} response
 * @returns {'readable' | 'sealed' | 'absent' | 'unknown'}
 */
export function classifyRelation({ status, body }) {
  const code = body && typeof body === 'object' ? body.code : undefined
  if (status === 200 || status === 206) return 'readable'
  if (status === 404 || code === 'PGRST205') return 'absent'
  if (status === 401 || status === 403 || code === '42501') return 'sealed'
  return 'unknown'
}

/**
 * The relations and columns the account may name, from what the database
 * answered — with the declaration contributing candidates and nothing else.
 *
 * `probed` is one entry per candidate relation: its classification, and for a
 * readable one the columns the database confirmed. A commented column is
 * confirmed too, because a comment hangs off an attribute that exists, so the
 * catalog's own columns are added to whatever the probe found; that is what
 * keeps an undescribed column a visible gap rather than the only column
 * anybody can see.
 *
 * ORDER. `order: 'table'` means the probe read a row and its keys are the
 * relation's own column order, which is the order worth printing. Anything
 * else means the columns were assembled name by name, and the order they came
 * out in is the order they were ASKED in — a property of whoever wrote the
 * declaration, not of the database. Those are sorted, so two deployments
 * asking the same database the same question in different orders render the
 * same table.
 *
 * @param {{
 *   declared: Map<string, string[]>,
 *   probed: Map<string, { status: 'readable' | 'sealed' | 'absent', columns?: string[], order?: 'table' }>,
 *   comments: { relation: string, column_name: string | null }[],
 * }} input
 * @returns {{ columns: Map<string, string[]>, readable: Set<string>, notes: string[] }}
 */
export function reconcile({ declared, probed, comments }) {
  const commented = new Map()
  for (const row of comments) {
    if (!row.column_name) continue
    if (!commented.has(row.relation)) commented.set(row.relation, [])
    commented.get(row.relation).push(row.column_name)
  }

  const columns = new Map()
  const readable = new Set()
  const absent = []
  const dropped = []
  const undeclared = []

  for (const [name, probe] of probed) {
    if (probe.status === 'absent') {
      if (declared.has(name)) absent.push(name)
      continue
    }
    if (probe.status === 'sealed') {
      columns.set(name, [])
      continue
    }
    const confirmed = []
    for (const column of [...(probe.columns ?? []), ...(commented.get(name) ?? [])]) {
      if (!confirmed.includes(column)) confirmed.push(column)
    }
    if (probe.order !== 'table') confirmed.sort()
    columns.set(name, confirmed)
    readable.add(name)
    for (const column of declared.get(name) ?? []) {
      if (!confirmed.includes(column)) dropped.push(`${name}.${column}`)
    }
    for (const column of confirmed) {
      if (!(declared.get(name) ?? []).includes(column)) undeclared.push(`${name}.${column}`)
    }
  }

  const notes = []
  if (absent.length > 0) {
    notes.push(`declared but not in this database, so not in the account: ${absent.join(', ')}`)
  }
  if (dropped.length > 0) {
    notes.push(`declared columns this database does not have: ${dropped.join(', ')}`)
  }
  if (undeclared.length > 0) {
    notes.push(`columns this database has that the declaration does not: ${undeclared.join(', ')}`)
  }
  return { columns, readable, notes }
}

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
      'docs/agents/blueprint.md is not what its sources render — the vocabulary, the catalog or ' +
        'this database changed and the account did not. Run: npm run agent-account. It renders only ' +
        'what this database confirmed, so it moves the document toward the database it talks to.',
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
