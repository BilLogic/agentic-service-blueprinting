#!/usr/bin/env node
/**
 * Does the reference snapshot still describe the database the migrations build?
 *
 * `supabase/schema.reference.sql` declares a PORTABLE POSTGRES CORE — "this
 * half runs on any Postgres and is what a replacement backend must carry". It
 * is a hand-refreshed snapshot of a tree that changes underneath it, and it is
 * never executed, so nothing has ever tested either claim. A contract nobody
 * runs drifts, and this one already carries a refresh date rather than a
 * guarantee.
 *
 * CI now replays every migration against stock Postgres — no Supabase, only a
 * small shim supplying the roles and `auth.uid()` the recipe half expects —
 * dumps what it actually built, and hands the inventory here. This compares it
 * against the snapshot, table by table and column by column.
 *
 *   psql -At -F $'\t' -f supabase/portable/inventory.sql > inventory.tsv
 *   node scripts/check-portable-core.mjs inventory.tsv
 *
 * The comparison is deliberately structural rather than textual: a snapshot
 * that says the same thing in different words is fine, and a snapshot missing
 * a column is not.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REFERENCE = fileURLToPath(
  new URL('../supabase/schema.reference.sql', import.meta.url),
)
const GENERATED_TYPES = fileURLToPath(
  new URL('../src/types/database.ts', import.meta.url),
)

/**
 * Tables and their columns, out of the reference snapshot's `create table`
 * blocks.
 *
 * The body is split on commas at paren depth zero, and each piece's first word
 * is the column. Splitting by LINE looks simpler and is wrong: a multi-line
 * check constraint has continuation lines starting with `or` and `references`,
 * and a line-wise parser dutifully reports them as columns named `or` and
 * `references` — which it did, the first time this ran.
 */
export function parseReferenceTables(sql) {
  const tables = new Map()
  const blocks = sql.matchAll(
    /^create table (?:if not exists )?public\.(\w+)\s*\(([\s\S]*?)^\);/gm,
  )
  for (const [, table, body] of blocks) {
    const columns = new Set()
    for (const piece of splitTopLevel(stripComments(body))) {
      const name = /^\s*([a-z_][a-z0-9_]*)\s+\S/.exec(piece)
      if (name && !isConstraintKeyword(name[1])) columns.add(name[1])
    }
    tables.set(table, columns)
  }
  return tables
}

function stripComments(body) {
  return body
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
}

/** Split on commas that are not inside parentheses or a quoted string. */
export function splitTopLevel(body) {
  const pieces = []
  let depth = 0
  let quoted = false
  let current = ''
  for (const char of body) {
    if (char === "'") quoted = !quoted
    if (!quoted && char === '(') depth += 1
    if (!quoted && char === ')') depth -= 1
    if (!quoted && char === ',' && depth === 0) {
      pieces.push(current)
      current = ''
      continue
    }
    current += char
  }
  pieces.push(current)
  return pieces
}

const CONSTRAINT_KEYWORDS = new Set([
  'constraint',
  'primary',
  'unique',
  'check',
  'foreign',
  'exclude',
  'like',
])

function isConstraintKeyword(word) {
  return CONSTRAINT_KEYWORDS.has(word)
}

/** `table<TAB>column` rows, as psql -At -F '\t' emits them. */
export function parseInventory(tsv) {
  const tables = new Map()
  for (const line of tsv.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const [table, column] = trimmed.split('\t')
    if (!table || !column) continue
    if (!tables.has(table)) tables.set(table, new Set())
    tables.get(table).add(column)
  }
  return tables
}

/**
 * What the snapshot and the built database disagree about.
 *
 * Direction matters in the report: a table the migrations build and the
 * snapshot omits means an adopter carrying the snapshot builds something
 * incomplete. A table the snapshot describes and the migrations never build
 * means they are carrying a fiction.
 */
export function compare(reference, actual) {
  const problems = []
  for (const table of [...actual.keys()].sort()) {
    if (!reference.has(table)) {
      problems.push(`the migrations build public.${table}; the snapshot does not describe it`)
    }
  }
  for (const table of [...reference.keys()].sort()) {
    if (!actual.has(table)) {
      problems.push(`the snapshot describes public.${table}; the migrations never build it`)
      continue
    }
    const declared = reference.get(table)
    const built = actual.get(table)
    for (const column of [...built].sort()) {
      if (!declared.has(column)) {
        problems.push(`public.${table}.${column} exists in the database and not in the snapshot`)
      }
    }
    for (const column of [...declared].sort()) {
      if (!built.has(column)) {
        problems.push(`public.${table}.${column} is in the snapshot and not in the database`)
      }
    }
  }
  return problems
}

/**
 * The same inventory, read out of the generated Supabase types instead of a
 * live database.
 *
 * `src/types/database.ts` is generated FROM the built schema, so it is a
 * second, offline witness to what the migrations produce. It cannot replace
 * the CI run — it proves nothing about whether the migrations apply to a
 * Postgres without Supabase in front of it — but it catches snapshot drift on
 * an ordinary laptop, in milliseconds, with no container.
 */
export function parseGeneratedTypes(source) {
  const tablesBlock = /^    Tables: \{$([\s\S]*?)^    Views: \{$/m.exec(source)
  if (!tablesBlock) throw new Error('could not find the Tables block in database.ts')
  const tables = new Map()
  const entries = tablesBlock[1].matchAll(
    /^      (\w+): \{\n        Row: \{\n([\s\S]*?)^        \}$/gm,
  )
  for (const [, table, body] of entries) {
    const columns = new Set()
    for (const line of body.split('\n')) {
      const column = /^          (\w+)\??:/.exec(line)
      if (column) columns.add(column[1])
    }
    tables.set(table, columns)
  }
  return tables
}

function main() {
  const [inventoryPath] = process.argv.slice(2)
  if (!inventoryPath) {
    console.error('usage: check-portable-core.mjs <inventory.tsv> | --from-types')
    process.exit(2)
  }
  const reference = parseReferenceTables(readFileSync(REFERENCE, 'utf8'))
  const actual =
    inventoryPath === '--from-types'
      ? parseGeneratedTypes(readFileSync(GENERATED_TYPES, 'utf8'))
      : parseInventory(readFileSync(inventoryPath, 'utf8'))
  const problems = compare(reference, actual)
  if (problems.length === 0) {
    console.log('schema.reference.sql matches what the migrations build')
    return
  }
  console.error('supabase/schema.reference.sql has drifted from the migrations:\n')
  for (const problem of problems) console.error(`  ${problem}`)
  console.error(
    '\nThe snapshot is what a replacement backend is told to carry. Update it ' +
      'to match, or fix the migration that made it wrong.',
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
