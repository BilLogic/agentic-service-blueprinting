#!/usr/bin/env node
/**
 * A form key is a column, and a column arrives under its own name.
 *
 * `cells.description` became `cells.summary`. Twelve days later the cell
 * editor's form still said `description` — filled from `content.summary`,
 * written back to `summary`, and the word survived in between, in the one
 * layer no check reads. Two more copies sat in the app's own cell types,
 * filled straight from `cell.summary`.
 *
 * Nothing caught it because nothing could. `check-retired-identifiers` replays
 * the live database. `labels-name-their-columns` reads what a reader sees. A
 * form's state key is neither: it never reaches the schema and never reaches
 * the screen. `tsc` cannot help either — the key is renamed at both edges, so
 * the types agree with themselves.
 *
 * TWO SUBJECTS, BOTH NARROW.
 *
 * 1. THE EDITOR FORM TYPES. Each panel declares a `FormState` for the table it
 *    saves to; every key must be a column of that table, spelled in camelCase.
 *    The panel→table map below is a declaration of the subject — which table a
 *    form edits is a fact this file has to be told — not a list of pardons.
 *    The two keys that carry a `Text` suffix are named with their reason.
 *
 * 2. THE ASSIGNMENT SITE. `description: cell.summary` is a column changing its
 *    name on the way into the app, and it is the exact shape every renamed
 *    column takes when it drifts. The rename roster in `retired-vocabulary`
 *    already knows each pair; this reads the pairs and looks for `was: x.is`.
 *    Only qualified reads (`something.summary`) are matched, so a literal
 *    `description: 'Clear the selection.'` on a command is not a finding.
 *
 * WHAT IT DOES NOT JUDGE: a type that presents a row rather than mirrors one.
 * `phasesToSlides` gives every slide a `title` and a `summary` whatever the
 * source table calls them; that is a display vocabulary, and it is checked by
 * the second subject only where it is fed from a renamed column.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { RENAME_MAP } from '../retired-vocabulary.mjs'
import { appFiles, appPackageRoot, readAppFile } from '../app-source.mjs'

const REPO_ROOT = process.cwd()
const DATABASE_TYPES = 'src/types/database.ts'

/**
 * Where a `src/…` path below actually is.
 *
 * Both subjects are APPLICATION source — the editor forms, and every `.ts`
 * and `.tsx` the assignment sweep reads — and a deployment keeps the
 * application in `node_modules/agentic-service-blueprinting`, not beside its
 * `scripts/`. `resolve(process.cwd(), 'src/…')` named a file that is not
 * there, and the sweep's `resolve(REPO_ROOT, 'src')` named a directory that
 * is not there: the first is an ENOENT and the second a walk of nothing,
 * which is the worse of the two because it passes.
 */
const APP_PACKAGE = appPackageRoot(REPO_ROOT)

/**
 * Which table each editor form writes. `nested` names a key whose value is
 * itself a form for another table; `suffix` names the two keys that could not
 * be spelled as their column.
 */
export const EDITOR_FORMS = [
  {
    file: 'src/components/blueprint/CellPanelEditor.tsx',
    type: 'FormState',
    table: 'cells',
    nested: { placement: 'cell_touchpoints' },
    // `function` and `form` are column names this app cannot use as bare
    // identifiers without shadowing the keyword and the element — so the form
    // key carries a suffix, and this is where that decision is written down.
    suffix: { functionText: 'function', formText: 'form' },
  },
  {
    file: 'src/lib/touchpointMutations.ts',
    type: 'PlacementDetailDraft',
    table: 'cell_touchpoints',
  },
  {
    file: 'src/components/blueprint/ServicePanel.tsx',
    type: 'FormState',
    table: ['services', 'business_models'],
  },
  {
    file: 'src/components/blueprint/PhasePanel.tsx',
    type: 'FormState',
    table: 'phases',
  },
  {
    file: 'src/components/blueprint/ScenarioPanel.tsx',
    type: 'FormState',
    table: 'scenarios',
    nested: { paths: 'paths' },
  },
  {
    file: 'src/components/blueprint/ScenarioPanel.tsx',
    type: 'PathForm',
    table: 'paths',
  },
  {
    file: 'src/components/blueprint/LanePanel.tsx',
    type: 'FormState',
    table: 'lanes',
  },
]

/** `tableName → Set<column>` from the generated `Row` blocks. */
export function tableColumns(source) {
  const tables = new Map()
  const re = /\n {6}(\w+): \{\n {8}Row: \{\n([\s\S]*?)\n {8}\}/g
  let match
  while ((match = re.exec(source))) {
    const columns = new Set(
      match[2]
        .split('\n')
        .map((line) => line.trim().split(':')[0].replace(/\?$/, ''))
        .filter(Boolean),
    )
    tables.set(match[1], columns)
  }
  return tables
}

/** The keys of `type NAME = { … }` in `source`, top level only. */
export function typeKeys(source, name) {
  const start = source.indexOf(`type ${name} = {`)
  if (start === -1) return null
  let depth = 0
  let i = source.indexOf('{', start)
  const open = i
  for (; i < source.length; i++) {
    if (source[i] === '{') depth += 1
    else if (source[i] === '}' && --depth === 0) break
  }
  const body = source.slice(open + 1, i)
  const keys = []
  let level = 0
  for (const line of body.split('\n')) {
    const trimmed = line.trim()
    if (level === 0) {
      const key = /^(\w+)\??:/.exec(trimmed)
      if (key) keys.push(key[1])
    }
    level += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length
  }
  return keys
}

const snake = (key) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

/** Form keys that name no column of the table they write. */
export function keysThatAreNotColumns(form, source, tables) {
  const keys = typeKeys(source, form.type)
  if (!keys) return [`${form.file}: no \`type ${form.type}\` to read`]
  const targets = [form.table].flat().map((t) => tables.get(t))
  if (targets.some((t) => !t)) return [`${form.file}: table not in ${DATABASE_TYPES}`]
  return keys.flatMap((key) => {
    if (form.nested?.[key]) return []
    const column = form.suffix?.[key] ?? snake(key)
    if (targets.some((t) => t.has(column))) return []
    return [`${form.file} ${form.type}.${key} — no column \`${column}\` on ${[form.table].flat().join('/')}`]
  })
}

/**
 * `was: x.is` assignments — a renamed column arriving under its old name.
 *
 * Reads the rename roster: for each `x.was → x.is` pair whose retired word
 * is a bare column name, looks for `was: <ident>.is` in source. Only these
 * pairs, only this shape.
 */
export function renamePairs(map = RENAME_MAP, tables = new Map()) {
  // A retired word that is still a LIVE column somewhere is not this check's
  // subject: `label` left `cell_dependencies` and stayed on `deleted_structure`,
  // so `label: path.name` is a UI label built from a name, not a rename
  // leaking. Same argument `one-spelling-each` makes, applied here as a
  // structural test rather than a list.
  const live = new Set([...tables.values()].flatMap((columns) => [...columns]))
  const pairs = []
  for (const entry of map) {
    entry.was.forEach((was, index) => {
      const is = entry.is[index]
      if (!was || !is || !was.includes('.') || !is.includes('.')) return
      const [wasTable, wasColumn] = was.split('.')
      const [isTable, isColumn] = is.split('.')
      if (wasTable !== isTable || !wasColumn || !isColumn || wasColumn === isColumn) return
      if (live.has(wasColumn)) return
      pairs.push({ was: wasColumn, is: isColumn, table: wasTable })
    })
  }
  return pairs
}

export function columnsArrivingUnderOldNames(source, pairs = renamePairs()) {
  const findings = []
  for (const { was, is } of pairs) {
    const re = new RegExp(`(^|[\\s{,])${was}\\s*:\\s*[\\w.?]+\\.${is}\\b`, 'g')
    let match
    while ((match = re.exec(source))) {
      findings.push({
        line: source.slice(0, match.index).split('\n').length,
        text: `\`${was}:\` is filled from \`.${is}\` — the column is called ${is}`,
      })
    }
  }
  return findings
}

/**
 * Every application `.ts` and `.tsx` that is not a test, as `src/…` paths.
 *
 * `appFiles` sweeps whichever root holds the application and REFUSES an empty
 * result, which is the property the hand-rolled walk here did not have: a
 * deployment's missing `src` made this the check that examined no file and
 * reported success for it.
 */
const applicationSources = () =>
  appFiles(
    REPO_ROOT,
    (path) => /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path),
    '.ts or .tsx outside a test',
  )

test('every editor form key is a column of the table it writes', () => {
  const tables = tableColumns(readAppFile(REPO_ROOT, DATABASE_TYPES))
  const found = EDITOR_FORMS.flatMap((form) =>
    keysThatAreNotColumns(form, readAppFile(REPO_ROOT, form.file), tables),
  )
  assert.deepEqual(
    found,
    [],
    `A form key names the column it writes. Rename the key, or if the ` +
      `column genuinely cannot be spelled, say why in EDITOR_FORMS.suffix:\n${found.join('\n')}`,
  )
})

test('no column arrives in the app under a name the schema retired', () => {
  const tables = tableColumns(readAppFile(REPO_ROOT, DATABASE_TYPES))
  const pairs = renamePairs(RENAME_MAP, tables)
  const found = []
  for (const rel of applicationSources()) {
    const source = readFileSync(join(APP_PACKAGE, rel), 'utf8')
    for (const finding of columnsArrivingUnderOldNames(source, pairs)) {
      found.push(`${rel}:${finding.line}  ${finding.text}`)
    }
  }
  assert.deepEqual(found, [], `A column keeps its name on the way in:\n${found.join('\n')}`)
})

test('the roster yields the pairs this check runs on', () => {
  // The roster records the five-table `description` → `summary` rename as a
  // bare word, because `description` is still ordinary English across the
  // tree, and qualifies only the slice's own pair. That qualified pair is the
  // one this check can run on, so it is the one asserted: without it the
  // assignment-site check above examines nothing.
  const tables = tableColumns(readAppFile(REPO_ROOT, DATABASE_TYPES))
  const pairs = renamePairs(RENAME_MAP, tables)
  assert.ok(!pairs.some((p) => p.was === 'label'), '`label` is still live on deleted_structure and must not be a pair')
  assert.ok(pairs.some((p) => p.was === 'description' && p.is === 'summary' && p.table === 'slices'),
    'slices.description → slices.summary is not on the rename roster, so no qualified pair reaches this check')
})

test('a key that spells its column in camelCase is not a finding', () => {
  const tables = new Map([['lanes', new Set(['owner_team', 'stakeholder_id', 'kpis'])]])
  const source = 'type FormState = {\n  ownerTeam: string\n  stakeholderId: string | null\n  kpis: string[]\n}'
  const form = { file: 'x', type: 'FormState', table: 'lanes' }
  assert.deepEqual(keysThatAreNotColumns(form, source, tables), [])
})

test('a key the schema never had is named with the column it would need', () => {
  const tables = new Map([['cells', new Set(['content', 'summary'])]])
  const source = 'type FormState = {\n  content: string\n  description: string\n}'
  const form = { file: 'x', type: 'FormState', table: 'cells' }
  assert.deepEqual(keysThatAreNotColumns(form, source, tables), [
    'x FormState.description — no column `description` on cells',
  ])
})

test('a nested form is judged against its own table, not the parent', () => {
  const tables = new Map([
    ['scenarios', new Set(['summary'])],
    ['paths', new Set(['summary', 'note', 'status'])],
  ])
  const source = 'type FormState = {\n  summary: string\n  paths: Record<string, PathForm>\n}'
  const form = { file: 'x', type: 'FormState', table: 'scenarios', nested: { paths: 'paths' } }
  assert.deepEqual(keysThatAreNotColumns(form, source, tables), [])
})

test('the assignment-site check matches the qualified read and nothing looser', () => {
  const pairs = [{ was: 'description', is: 'summary', table: 'cells' }]
  assert.equal(columnsArrivingUnderOldNames('{ description: cell.summary }', pairs).length, 1)
  assert.equal(columnsArrivingUnderOldNames("{ description: 'Clear the selection.' }", pairs).length, 0)
  assert.equal(columnsArrivingUnderOldNames('{ summary: cell.summary }', pairs).length, 0)
  assert.equal(columnsArrivingUnderOldNames('{ description: entry.content }', pairs).length, 0)
})
