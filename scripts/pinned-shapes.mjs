/**
 * Check — a row shape pinned in prose, held against the schema.
 *
 * Some documents in this repository are read by a MODEL rather than by a
 * compiler, and a few of them pin the shape of a database row: a fenced JSON
 * block whose keys are column names, which an agent is told to produce and a
 * script then validates. `agents/auditor.md` is the case that motivates this.
 *
 * It said `check_name` and `note` for two renames — `21000116000000` made them
 * `check_key` and `summary` — while claiming to be "the same shape
 * `audit_tools.py --help` documents". An auditor following the document to the
 * letter produced a row `audit_tools.py` raises `KeyError: 'check_key'` on.
 * Nothing could see it: `check-database-names.mjs` reads `src` and `scripts`
 * for source extensions, so `agents/` is outside its subject entirely, and
 * `.md` is outside its extension set even under the roots it does read.
 *
 * WHY A BINDING RATHER THAN A PATTERN. A key inside a JSON fence is only a
 * column name if the fence is documenting a row, and only of a table the
 * PROSE names — nothing in `{"summary": "<text>"}` says which relation it
 * belongs to. Three of the four fences in these directories document
 * something else entirely (an agent's own output, a workspace state file), so
 * a pattern that treated every fenced key as a column would be wrong three
 * times out of four. The binding below is short because the claim is rare:
 * one entry per fence that says "this is a row of THAT table", which is the
 * document's own claim written where it can be checked.
 *
 * WHY GENERATION IS NOT THE ANSWER HERE. The obvious fix for a stale document
 * is to generate it, and this repository does that wherever it can —
 * `docs/index.md`, `references/interface-schema-map.md`. It does not fit this
 * block. Two of its ten keys, `reason` and `scope`, are not columns at all:
 * they are fingerprint inputs that `audit_tools.py` consumes and never
 * stores. A generated block would have to invent them, and the ORDER and the
 * `"<what is wrong, citing keys/titles — no excerpts>"` placeholders are
 * instructions to a model, not schema. So the block stays authored and the
 * claim gets checked.
 *
 * TWO ASSERTIONS, because a pinned shape goes stale in two directions:
 *
 *   - a key that is not a column — the rename that moved past the document.
 *   - a required column the shape never mentions — a migration that added
 *     something the model is never told to send. Columns the CALLER fills
 *     rather than the model are listed per binding, with a reason.
 */

/** The fenced blocks of one markdown source, in order, with their language. */
export function fencedBlocks(source) {
  const blocks = []
  const lines = source.split('\n')
  let open = null
  lines.forEach((line, index) => {
    const fence = /^```(\w*)\s*$/.exec(line)
    if (!fence) return
    if (open === null) open = { language: fence[1], from: index, body: [] }
    else {
      blocks.push({ ...open, body: open.body.join('\n'), to: index })
      open = null
    }
  })
  return blocks.map((block) => ({
    ...block,
    body: lines.slice(block.from + 1, block.to).join('\n'),
  }))
}

/** The top-level and nested keys a JSON-ish block names. */
export function keysIn(body) {
  const keys = new Set()
  for (const match of body.matchAll(/"([a-z_][a-z0-9_]*)"\s*:/g)) keys.add(match[1])
  return keys
}

/**
 * One table's columns, from a `pg_dump` schema. Reads the CREATE TABLE body
 * and stops at the first CONSTRAINT — a constraint's own name is not a
 * column, and `audit_findings_severity_check` would otherwise read as one.
 */
export function columnsOf(schemaSql, table) {
  const start = schemaSql.indexOf(`CREATE TABLE public.${table} (`)
  if (start < 0) return null
  const end = schemaSql.indexOf('\n);', start)
  const columns = new Map()
  for (const line of schemaSql.slice(start, end).split('\n').slice(1)) {
    const match = /^\s{4}([a-z_][a-z0-9_]*)\s+(.+?),?\s*$/.exec(line)
    if (!match || match[1] === 'CONSTRAINT') continue
    if (/^CONSTRAINT\b/.test(line.trim())) continue
    columns.set(match[1], {
      required: /\bNOT NULL\b/.test(match[2]) && !/\bDEFAULT\b/.test(match[2]),
    })
  }
  return columns
}

/** The fence a binding points at: the first one after its anchor sentence. */
export function boundBlock(source, anchor) {
  const at = source.indexOf(anchor)
  if (at < 0) return null
  const anchorLine = source.slice(0, at).split('\n').length - 1
  return fencedBlocks(source).find((block) => block.from > anchorLine) ?? null
}

/**
 * Every way a bound shape and its table disagree. `keys` are the shape's own
 * non-column keys and `supplied` the columns something other than the model
 * fills; both carry a reason in the binding and neither is a wildcard.
 */
export function shapeDrift({ source, anchor, relation, notColumns = [], supplied = [] }, schemaSql) {
  const columns = columnsOf(schemaSql, relation)
  if (!columns) return [{ relation, problem: 'no such table in the schema dump' }]
  const block = boundBlock(source, anchor)
  if (!block) return [{ relation, problem: `no fenced block after ${JSON.stringify(anchor)}` }]
  const excused = new Set(notColumns)
  const drift = []
  for (const key of keysIn(block.body))
    if (!columns.has(key) && !excused.has(key))
      drift.push({ relation, problem: `"${key}" is not a column of ${relation}` })
  const filled = new Set(supplied)
  for (const [column, { required }] of columns)
    if (required && !filled.has(column) && !keysIn(block.body).has(column))
      drift.push({ relation, problem: `${relation}.${column} is required and the shape never names it` })
  return drift
}
