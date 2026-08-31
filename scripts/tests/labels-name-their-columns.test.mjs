/**
 * #89 — the word a panel puts in front of a reader, and the name behind it.
 *
 * Raised by Bill: *"how come we have inconsistent naming from front and
 * backend again (i.e., resources vs. links)?"* The complaint was never that
 * the words differ. `CONTEXT.md` already records divergences it means — its
 * "Words that keep a retired spelling" section names three words that survive
 * a rename sweep and says, for each, why it is right where it stands. Those
 * are decisions, and they are written down. The defect is that **no document
 * mapped interface words to column names**, so a reader could not tell a
 * decision from an accident: the rename map above covers schema→schema only.
 *
 * So `LABEL_COLUMNS` below is the enforced half of that map — every word a
 * panel puts in front of a reader, the schema name behind it, and a reason
 * wherever the two differ. `CONTEXT.md`'s "The interface→schema map" section
 * is the documented half, and a parity test holds them together in the shape
 * `retired-vocabulary.test.mjs` already uses for the rename map: two lists
 * that do not derive from each other, and a failure when they disagree.
 *
 * FOUR RULES MAKE IT NON-VACUOUS, and each is a way the map could rot:
 *
 *   1. Every panel label is in the map. A label nobody bound to a name is the
 *      whole defect, so a new one fails until somebody says what it names.
 *   2. Every row is a label some panel actually says. A row for a label that
 *      no longer exists is a map of an interface that is gone.
 *   3. Every row names something the schema has. A label cannot be "fixed"
 *      by pointing it at a second word that is also not there.
 *   4. A divergent row carries a reason and an aligned row does not. The
 *      first half is the issue's ask — "a reason, or a rename". The second
 *      half is what keeps the reason column worth reading: a decision
 *      recorded about a row that never diverged is decoration, and
 *      decoration is what a reader learns to skip — taking the real ones
 *      with it.
 *
 * Each is proved to go red, in the shape `scripts/tests/retired-copy.test.mjs`
 * argues for: a planted fixture the rule must flag, next to a neighbour it
 * must leave alone.
 *
 * TWO LABELS ARE RENAMED HERE RATHER THAN REASONED ABOUT, which is the other
 * half of the ask — "a reason, or a rename". The panel said **Text** where the
 * column is `cells.content` and **Value** where it is `cells.value_props`;
 * both columns were already right while the words above them were not.
 *
 * THE THIRD CASE WAS NOT A NAMING PROBLEM AT ALL, and it is no longer a
 * divergence. `cells.links` carried two interface concepts — the tab's `url`
 * entries and the grid's `tech_description` prose — so no label could be its
 * name without lying about half its rows, and the `Resources` row recorded
 * that as a decision while the schema change waited. 21000113000000 made the
 * change: the column is two tables, `Resources` names `resources`, and the row
 * that carried the reason is gone rather than rewritten. What is left is an
 * aligned row like `Evidence`, which is what rule 4 requires of a label that
 * says its own name — a reason kept past the divergence it explained is the
 * decoration this map refuses.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { parseGeneratedTypes } from '../check-schema-inventory.mjs'

const ROOT = resolve(new URL('../..', import.meta.url).pathname)
const SRC = resolve(ROOT, 'src')
const GUARD_FILE = relative(ROOT, new URL(import.meta.url).pathname).split('\\').join('/')
const GUARD_SOURCE = readFileSync(new URL(import.meta.url), 'utf8')
const RERUN = 'npm test -- scripts/tests/labels-name-their-columns.test.mjs'

function sourceLine(code, index) {
  return code.slice(0, Math.max(0, index)).split('\n').length
}

function mapRowLocation(label) {
  const index = GUARD_SOURCE.indexOf(`label: '${label}'`)
  return `${GUARD_FILE}:${sourceLine(GUARD_SOURCE, index)}`
}

export function guardFailure(location, message) {
  return `${location}: ${message}\nRun: ${RERUN}`
}

const PANEL_LABELS_LOCATION = `${GUARD_FILE}:${sourceLine(
  GUARD_SOURCE,
  GUARD_SOURCE.indexOf('export function panelLabels'),
)}`

test('guard diagnostics name a source line and the focused rerun command', () => {
  assert.equal(
    guardFailure('src/Panel.tsx:7', 'A label is not mapped.'),
    `src/Panel.tsx:7: A label is not mapped.\nRun: ${RERUN}`,
  )
})

/* ----------------------------------------------------------- the subject */

/**
 * The components that put a field's name in front of a reader.
 *
 * `Field` labels an editable field in the cell panel's one form;
 * `SpecSection` heads one of the three spec blocks in the panel's overview;
 * `OwnerCell` labels the read-only owner pair; `DependencyGroup` heads one
 * group of rows in the Dependencies tab. Nothing else in the app labels a
 * field or a relation.
 *
 * ELEMENT-SHAPED RATHER THAN FILE-SHAPED, on purpose: a panel written next
 * week is inside the subject without anybody remembering to add it. That is
 * also why the subject is components rather than "words on screen" — the
 * annotation toolbar says `label: 'Text'` about a drawing tool, and a rule
 * that reached it would flag copy that is right.
 */
const LABEL_COMPONENTS = ['Field', 'SpecSection', 'OwnerCell', 'DependencyGroup']

const LABEL_ELEMENT = new RegExp(`<(${LABEL_COMPONENTS.join('|')})\\b([^>]*)>`, 'g')
const LABEL_PROP = /\b(label|title)\s*=\s*"([^"]*)"/

/**
 * The panel's tab row, which is a label surface no JSX prop can see.
 *
 * `PANEL_TABS` is a table of `{ value, label, icon }` that the panel maps
 * over, so the words reach the reader through `{label}` rather than through
 * an attribute. Keyed on the TABLE'S NAME rather than on the file holding
 * it: a fourth tab added to that table is inside the subject the moment it
 * is written, and the annotation toolbar's own `label:` entries — which name
 * drawing tools, not fields — stay outside it.
 */
const TAB_TABLE = 'const PANEL_TABS'

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return walk(path)
    if (!/\.tsx$/.test(entry) || entry.includes('.test.')) return []
    return [path]
  })
}

export function panelSources() {
  return walk(SRC)
    .map((path) => ({
      file: relative(ROOT, path).split('\\').join('/'),
      code: readFileSync(path, 'utf8'),
    }))
    .sort((a, b) => a.file.localeCompare(b.file))
}

/** Every panel label in the app, with where it is written. */
export function panelLabels(sources) {
  const out = []
  for (const { file, code } of sources) {
    for (const element of code.matchAll(LABEL_ELEMENT)) {
      const prop = LABEL_PROP.exec(element[2])
      if (prop) {
        const propIndex = element.index + element[0].indexOf(prop[0])
        out.push({ file, line: sourceLine(code, propIndex), component: element[1], label: prop[2] })
      }
    }
    const start = code.indexOf(TAB_TABLE)
    if (start < 0) continue
    const end = code.indexOf('\n]', start)
    const table = code.slice(start, end < 0 ? code.length : end)
    for (const row of table.matchAll(/\blabel:\s*'([^']*)'/g)) {
      out.push({
        file,
        line: sourceLine(code, start + row.index),
        component: 'PANEL_TABS',
        label: row[1],
      })
    }
  }
  return out
}

/* --------------------------------------------------------------- the map */

/**
 * Every panel label, the schema name behind it, and why they differ.
 *
 * `label` is matched against what a panel actually says, case-insensitively
 * and whole. `names` is one or more `table.column` names, or a bare table
 * where the label heads a whole relation rather than a field of one.
 * `because` is empty on every row whose label and name already agree, and
 * required on every row where they do not.
 *
 * ONE LABEL, SEVERAL NAMES is allowed, and a row is aligned only when it
 * aligns with EVERY name it lists — so a shared word cannot be smuggled past
 * this by pairing a divergence with an agreement.
 *
 * Ordered as a reader meets them: the cell's own fields, then the three
 * tabs and what stands under the first of them.
 */
export const LABEL_COLUMNS = Object.freeze(
  [
    { label: 'Content', names: ['cells.content'], because: '' },
    { label: 'Summary', names: ['cells.summary'], because: '' },
    { label: 'Owner', names: ['cells.owner'], because: '' },
    { label: 'Perceived owner', names: ['cells.perceived_owner'], because: '' },
    { label: 'Function', names: ['cells.function'], because: '' },
    { label: 'Form', names: ['cells.form'], because: '' },
    {
      label: 'Value proposition',
      names: ['cells.value_props'],
      because:
        '`props` abbreviates this exact phrase and no other. A label is read once and a name is typed daily, so the panel spells out what the schema shortens.',
    },
    {
      label: 'Dependencies',
      names: ['cell_dependencies'],
      because:
        'The relation names both ends, because a dependency always runs from one cell to another. The tab is already standing inside a cell, so the prefix would be the one word on it that told a reader nothing.',
    },
    {
      label: 'Follows',
      names: ['cell_dependencies.kind'],
      because:
        "Names a VALUE read from one end rather than a column: these rows are `kind = 'leads_to'` arriving. The schema stores one row and the panel shows it twice, once from each end, so the label has to say which end a reader is standing at — and no column could be called this.",
    },
    {
      label: 'Leads to',
      names: ['cell_dependencies.kind'],
      because:
        "The same value from the other end — `kind = 'leads_to'` leaving, and here the label IS the value minus its underscore. What the pair carries that `kind` cannot is the direction, which is why the arriving end keeps a word of its own.",
    },
    {
      label: 'Enables',
      names: ['cell_dependencies.kind'],
      because:
        "The word IS the value — `kind = 'enables'`, the recorded dependency that never draws — and `kind` is the name of the place holding it. It needs no second label for the other end: `enables` reads source-first whichever end you stand at.",
    },
    {
      label: 'Tech in this step',
      names: ['cells.content'],
      because:
        "Not a field of anything: it heads the technology standing in the same step that nothing on this cell points at, and each item under it is one line parsed out of a tech cell's content. `content` names where the words live; the label names which cells they came from.",
    },
    { label: 'Evidence', names: ['evidence'], because: '' },
    { label: 'Resources', names: ['resources'], because: '' },
  ].map((row) => Object.freeze({ ...row, names: Object.freeze(row.names) })),
)

/**
 * A word reduced to what a comparison can see: lower case, and every run of
 * anything else read as one underscore. "Perceived owner" and
 * `perceived_owner` are the same word written for two audiences.
 */
const canonical = (word) =>
  String(word)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

/**
 * The word a schema name puts in front of a reader: the last dotted segment,
 * with a foreign key's `_id` dropped. A column holding a stakeholder is
 * `stakeholder_id`, and a panel is right to say Stakeholder.
 */
const schemaWord = (name) => canonical(name.split('.').pop().replace(/_id$/, ''))

/**
 * True when a label and a schema name are the same word.
 *
 * Singular and plural count as agreement, and they have to: the label over a
 * relation is the thing, the table is the collection, and neither is wrong.
 * Anything further apart than an `s` is a divergence that owes a reason.
 */
export function aligns(label, name) {
  const said = canonical(label)
  const stored = schemaWord(name)
  return said === stored || `${said}s` === stored || said === `${stored}s`
}

/** The names a row's label does not say. Empty means the row is aligned. */
export function divergentNames(row) {
  return row.names.filter((name) => !aligns(row.label, name))
}

/* ---------------------------------------- rule 1: no label is unmapped */

/** Panel labels the map says nothing about. */
export function labelsMissingFromMap(labels, map = LABEL_COLUMNS) {
  const mapped = new Set(map.map((row) => canonical(row.label)))
  const seen = new Map()
  for (const entry of labels) {
    if (mapped.has(canonical(entry.label))) continue
    if (!seen.has(entry.label)) {
      seen.set(entry.label, {
        label: entry.label,
        file: entry.file,
        line: entry.line,
      })
    }
  }
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label))
}

test('every panel label is a word the map binds to the schema', () => {
  const labels = panelLabels(panelSources())
  // The extraction, asserted before its result is trusted: a walker that
  // found no labels would pass exactly as loudly as an interface that is
  // clean.
  assert.ok(
    labels.length > 15,
    guardFailure(PANEL_LABELS_LOCATION, `only ${labels.length} panel labels found — the extraction is wrong`),
  )
  for (const component of [...LABEL_COMPONENTS, 'PANEL_TABS']) {
    assert.ok(
      labels.some((one) => one.component === component),
      guardFailure(
        PANEL_LABELS_LOCATION,
        `no ${component} label was found — either it is gone or the extraction missed it`,
      ),
    )
  }
  const found = labelsMissingFromMap(labels)
  const rendered = found.map(
    (entry) => `"${entry.label}" (${entry.file}:${entry.line})`,
  )
  assert.deepEqual(
    found,
    [],
    guardFailure(
      found[0] ? `${found[0].file}:${found[0].line}` : PANEL_LABELS_LOCATION,
      'A panel label is bound to nothing. This is #89 exactly: not that the word ' +
        'differs from its column, but that no document says which column it is, so ' +
        'nobody downstream can tell a decision from an accident. Add a row to ' +
        "LABEL_COLUMNS and to CONTEXT.md's interface→schema map — with a reason if " +
        `the two words differ:\n${rendered.join('\n')}`,
    ),
  )
})

test('the unmapped-label check goes red on a label nobody bound', () => {
  const planted = [
    {
      file: 'src/components/blueprint/Planted.tsx',
      code: [
        '<Field label="Cadence" hint="How often this repeats." />',
        // Already mapped, and must not be reported: the check is about words
        // with no row, not about words it dislikes.
        '<Field label="Content" />',
        '<DependencyGroup title="Enables">',
        // Case and spacing are the label's business, not the map's.
        '<OwnerCell label="perceived owner" />',
        "const PANEL_TABS = [",
        "  { value: 'evidence', label: 'Evidence' },",
        "  { value: 'costs', label: 'Costs' },",
        ']',
      ].join('\n'),
    },
  ]
  assert.deepEqual(labelsMissingFromMap(panelLabels(planted)), [
    { label: 'Cadence', file: 'src/components/blueprint/Planted.tsx', line: 1 },
    { label: 'Costs', file: 'src/components/blueprint/Planted.tsx', line: 7 },
  ])
})

/* ---------------------------------------- rule 2: no row is a fossil */

/** Rows for labels no panel says any more. */
export function rowsNoPanelSays(labels, map = LABEL_COLUMNS) {
  const said = new Set(labels.map((entry) => canonical(entry.label)))
  return map.filter((row) => !said.has(canonical(row.label))).map((row) => row.label)
}

test('every row of the map is a label some panel still says', () => {
  const found = rowsNoPanelSays(panelLabels(panelSources()))
  assert.deepEqual(
    found,
    [],
    guardFailure(
      mapRowLocation(found[0] ?? 'Content'),
      `The map describes an interface that is gone: ${found.join(', ')}. A stale row is ` +
        'worse than a missing one — a reader looking the word up finds an answer, and ' +
        'the answer is about a panel nobody can open. Delete the row, or restore the label.',
    ),
  )
})

test('the fossil check goes red on a row no panel says', () => {
  const map = [
    { label: 'Content', names: ['cells.content'], because: '' },
    { label: 'Text', names: ['cells.content'], because: '' },
  ]
  const labels = [{ file: 'src/x.tsx', component: 'Field', label: 'Content' }]
  assert.deepEqual(rowsNoPanelSays(labels, map), ['Text'])
})

/* ------------------------------- rule 3: every row names something real */

/**
 * The schema, read where this package can read it without a database.
 *
 * `src/types/database.ts` is generated FROM a built database by the Supabase
 * CLI and the whole app compiles against it, and
 * `scripts/check-schema-inventory.mjs` holds it to a freshly built schema in
 * CI. So the types are the schema here, and this file reuses that script's
 * parser rather than growing a second reader of the same file.
 */
const SCHEMA = parseGeneratedTypes(readFileSync(resolve(ROOT, 'src/types/database.ts'), 'utf8'))

/** Schema names the map claims, that the schema does not have. */
export function namesThatDoNotExist(schema, map = LABEL_COLUMNS) {
  return map.flatMap((row) =>
    row.names.flatMap((name) => {
      const [table, column] = name.split('.')
      const relation = schema.get(table)
      if (!relation) return [`${name} — there is no ${table}, so "${row.label}" names nothing`]
      if (column === undefined) return []
      if (!relation.has(column)) {
        return [`${name} — ${table} has no ${column}, so "${row.label}" names nothing`]
      }
      return []
    }),
  )
}

test('every row of the map names something the schema has', () => {
  assert.ok(
    SCHEMA.size > 10,
    guardFailure(
      'src/types/database.ts:1',
      `only ${SCHEMA.size} tables parsed — the generated-schema reader is wrong`,
    ),
  )
  assert.deepEqual(
    namesThatDoNotExist(SCHEMA),
    [],
    guardFailure(
      mapRowLocation(/"([^"]+)"/.exec(namesThatDoNotExist(SCHEMA)[0] ?? '')?.[1] ?? 'Content'),
      'A label is bound to a name the schema does not have. A map that points at a ' +
        'second missing word is the defect restated, not the fix for it.',
    ),
  )
})

test('the existence check goes red on a schema missing them', () => {
  const every = LABEL_COLUMNS.flatMap((row) => row.names)
  assert.equal(namesThatDoNotExist(new Map()).length, every.length)

  // And one name at a time, which is the shape a half-done rename takes: the
  // table survives, the column under it does not.
  const partial = new Map()
  for (const name of every) {
    const [table, column] = name.split('.')
    if (!partial.has(table)) partial.set(table, new Set())
    if (column) partial.get(table).add(column)
  }
  assert.deepEqual(namesThatDoNotExist(partial), [])
  partial.get('cells').delete('value_props')
  assert.deepEqual(namesThatDoNotExist(partial), [
    'cells.value_props — cells has no value_props, so "Value proposition" names nothing',
  ])
})

/* --------------------- rule 4: a divergence is a decision, and nothing else */

/** Rows whose label is not its name, with no reason recorded. */
export function divergencesWithoutReason(map = LABEL_COLUMNS) {
  return map
    .filter((row) => divergentNames(row).length > 0 && row.because.trim().length < 40)
    .map((row) => `${row.label} → ${divergentNames(row).join(', ')}`)
}

/** Rows that agree with the schema and carry a reason anyway. */
export function reasonsWithoutDivergence(map = LABEL_COLUMNS) {
  return map
    .filter((row) => divergentNames(row).length === 0 && row.because.trim().length > 0)
    .map((row) => row.label)
}

test('every divergence is a decision somebody wrote down', () => {
  const found = divergencesWithoutReason()
  assert.deepEqual(
    found,
    [],
    guardFailure(
      mapRowLocation(found[0]?.split(' → ')[0] ?? 'Content'),
      `A label differs from its name with no reason a stranger can evaluate: ${found.join('; ')}. ` +
        "CONTEXT.md's retired-spelling entries are the shape: a word that stands where " +
        'it is, and the sentence saying why. That is what every divergence needs — a ' +
        'reason, or a rename.',
    ),
  )
})

test('no row that agrees with the schema carries a reason anyway', () => {
  const found = reasonsWithoutDivergence()
  assert.deepEqual(
    found,
    [],
    guardFailure(
      mapRowLocation(found[0] ?? 'Content'),
      `A reason recorded about a label that never diverged: ${found.join(', ')}. It reads ` +
        'as a decision and settles nothing, and a reason column with decoration in it is ' +
        'a column readers learn to skip — which is how the real ones would get skipped ' +
        'with it.',
    ),
  )
})

test('both halves of the reason rule go red', () => {
  assert.deepEqual(
    divergencesWithoutReason([
      { label: 'Resources', names: ['cells.content'], because: '' },
      { label: 'Blurb', names: ['cells.summary'], because: 'too short to evaluate' },
      { label: 'Summary', names: ['cells.summary'], because: '' },
      {
        label: 'Needs',
        names: ['cell_dependencies.kind'],
        because: 'It names the value the kind holds, not the name of the place holding it.',
      },
    ]),
    ['Resources → cells.content', 'Blurb → cells.summary'],
  )
  assert.deepEqual(
    reasonsWithoutDivergence([
      { label: 'Summary', names: ['cells.summary'], because: 'Because somebody felt like it.' },
      { label: 'Content', names: ['cells.content'], because: '' },
    ]),
    ['Summary'],
  )
})

test('a row is divergent when ANY of its names disagrees', () => {
  // The failure this forbids: a shared word riding into the map on the one
  // name where it happens to match.
  assert.deepEqual(
    divergentNames({ label: 'Summary', names: ['cells.summary', 'cells.content'], because: '' }),
    ['cells.content'],
  )
  assert.deepEqual(divergentNames({ label: 'Evidence', names: ['evidence'], because: '' }), [])
  assert.deepEqual(
    divergentNames({ label: 'Perceived owner', names: ['cells.perceived_owner'], because: '' }),
    [],
  )
})

/* ------------------------------------------- and the map a person reads */

const CONTEXT = readFileSync(resolve(ROOT, 'CONTEXT.md'), 'utf8')

/** The `| … | … | … |` rows under the interface→schema heading. */
export function documentedRows(context = CONTEXT) {
  const section = /##\s+The interface→schema map[^\n]*\n([\s\S]*?)(?:\n##\s|$)/.exec(context)
  assert.ok(
    section,
    guardFailure('CONTEXT.md:1', 'CONTEXT.md has no "## The interface→schema map" section any more'),
  )
  return section[1]
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .map((line) => line.trim().slice(1, -1).split('|').map((cell) => cell.trim()))
    .filter((cells) => cells.length === 3 && !/^-+$/.test(cells[0].replace(/[\s:]/g, '')))
    .filter((cells) => !/^the interface says$/i.test(cells[0].replace(/\*/g, '')))
    .map((cells) => ({
      label: cells[0].replace(/\*/g, '').trim(),
      names: [...cells[1].matchAll(/`([^`]+)`/g)].map((match) => match[1]),
      because: cells[2] === '—' ? '' : cells[2],
    }))
}

test('a missing documented map names its file, line, and focused rerun', () => {
  assert.throws(
    () => documentedRows('# Context without the interface map'),
    new RegExp(
      guardFailure(
        'CONTEXT.md:1',
        'CONTEXT.md has no "## The interface→schema map" section any more',
      ).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    ),
  )
})

test('the enforced interface map still matches the one CONTEXT.md documents', () => {
  const enforced = LABEL_COLUMNS.map((row) => ({
    label: row.label,
    names: [...row.names],
    because: row.because,
  }))
  assert.deepEqual(
    enforced,
    documentedRows(),
    guardFailure(
      `CONTEXT.md:${sourceLine(CONTEXT, CONTEXT.indexOf('## The interface→schema map'))}`,
      "CONTEXT.md's interface→schema map and LABEL_COLUMNS disagree. Whichever moved, " +
        'move the other: the documented map is what a person reads and this one is what ' +
        'CI acts on, and a difference between them is a lie in the file people trust to ' +
        'learn the vocabulary.',
    ),
  )
})

test('the parity check goes red on a table that has drifted', () => {
  const drifted = [
    '## The interface→schema map',
    '',
    '| The interface says | The schema says | Why they differ |',
    '|---|---|---|',
    '| **Content** | `cells.content` | — |',
    '',
    '## Next section',
  ].join('\n')
  assert.deepEqual(documentedRows(drifted), [
    { label: 'Content', names: ['cells.content'], because: '' },
  ])
  assert.notEqual(documentedRows(drifted).length, LABEL_COLUMNS.length)

  // A reason dropped from the documented half is a drift too, and the least
  // visible one: the table still has every row, and one of them has quietly
  // stopped explaining itself.
  const reasonless = drifted.replace(
    '| **Content** | `cells.content` | — |',
    '| **Resources** | `cells.content` | — |',
  )
  assert.deepEqual(documentedRows(reasonless), [
    { label: 'Resources', names: ['cells.content'], because: '' },
  ])
})
