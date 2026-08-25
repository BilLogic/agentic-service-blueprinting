#!/usr/bin/env node
/**
 * Does the database the generated halves build hold the shape the app compiles
 * against?
 *
 * The old answer was `supabase/schema.reference.sql`, a hand-refreshed snapshot
 * of a tree that moved underneath it. It is gone: both halves of the schema are
 * generated now (scripts/generate-portable-core.mjs), and CI applies them to a
 * stock Postgres rather than reading a file about them.
 *
 * What is left over is the other direction. `src/types/database.ts` is
 * generated FROM a built database by the Supabase CLI, and the whole app type
 * checks against it. If the applied schema and those types disagree, every
 * compile is checking the app against a database that does not exist. So the
 * types are the reference here, and the freshly built database is what gets
 * compared to them.
 *
 *   psql -At -F $'\t' -f supabase/portable/inventory.sql > inventory.tsv
 *   node scripts/check-schema-inventory.mjs inventory.tsv
 *
 * The comparison is structural rather than textual: tables and their columns.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const GENERATED_TYPES = fileURLToPath(
  new URL('../src/types/database.ts', import.meta.url),
)

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
 * The same inventory, read out of the generated Supabase types.
 *
 * These are what the app is compiled against, which is what makes them worth
 * comparing: a column the database has and the types do not is unreachable
 * from the app, and a column the types have and the database does not is a
 * runtime 42703 that no build catches.
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

/**
 * What the types and the built database disagree about.
 *
 * Direction matters in the report: it is the difference between "regenerate
 * the types" and "the migration that made this is wrong".
 */
export function compare(types, actual) {
  const problems = []
  for (const table of [...actual.keys()].sort()) {
    if (!types.has(table)) {
      problems.push(`the schema builds public.${table}; the generated types do not describe it`)
    }
  }
  for (const table of [...types.keys()].sort()) {
    if (!actual.has(table)) {
      problems.push(`the generated types describe public.${table}; the schema never builds it`)
      continue
    }
    const declared = types.get(table)
    const built = actual.get(table)
    for (const column of [...built].sort()) {
      if (!declared.has(column)) {
        problems.push(`public.${table}.${column} exists in the database and not in the types`)
      }
    }
    for (const column of [...declared].sort()) {
      if (!built.has(column)) {
        problems.push(`public.${table}.${column} is in the types and not in the database`)
      }
    }
  }
  return problems
}

function main() {
  const [inventoryPath] = process.argv.slice(2)
  if (!inventoryPath) {
    console.error('usage: check-schema-inventory.mjs <inventory.tsv>')
    process.exit(2)
  }
  const problems = compare(
    parseGeneratedTypes(readFileSync(GENERATED_TYPES, 'utf8')),
    parseInventory(readFileSync(inventoryPath, 'utf8')),
  )
  if (problems.length === 0) {
    console.log('src/types/database.ts matches the schema that was just built')
    return
  }
  console.error('src/types/database.ts has drifted from the schema:\n')
  for (const problem of problems) console.error(`  ${problem}`)
  console.error(
    '\nThe app compiles against these types. Regenerate them with ' +
      '`npm run supabase:types`, or fix the migration that made them wrong.',
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
