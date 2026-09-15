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
 * The comparison is structural rather than textual: tables and their columns,
 * and the closed vocabularies beside them. The vocabularies are here because
 * the types' tail is DERIVED now — `generate-database-types.mjs` reads each
 * union off the constraint `ENUMS` names — and a derived tail is worth holding
 * to the database for the same reason the body is. A member the constraint
 * accepts and the union does not list is a value the app cannot name; a member
 * the union lists and the constraint refuses is a `23514` no build catches.
 */
import { readFileSync } from 'node:fs'

import { sweep } from './sweep.mjs'
import { whenRun } from './verdict.mjs'
// The list, not the generator: this module is also what the deployment
// superset check imports, out of the installed package, where the generator's
// own dependencies are not installed.
import { ENUMS } from './database-vocabularies.mjs'

/** The tree this script is part of: the directory `scripts/` sits in. */
/** The tree this script runs in: the working directory — never this file's location; `sweep.mjs` says why. */
const REPO_ROOT = process.cwd()

/** The application path the types are, wherever the application is. */
const TYPES = 'src/types/database.ts'

/**
 * The generated types, wherever the application is.
 *
 * `../src/types/database.ts` was a path relative to THIS FILE, and a
 * deployment's `scripts/` is its own while its application is the package's —
 * so the types sat one directory away from where that path pointed and this
 * check died on an ENOENT with nothing to say about why. Swept rather than
 * read at load, because both halves of this module are imported for their
 * parsers by tests that never open the file.
 *
 * A file the sweep listed and cannot read has vanished mid-run; this check
 * named it as its subject, so its absence is the subject's absence and says so.
 */
function generatedTypes() {
  const app = sweep({ subject: 'app', root: REPO_ROOT, what: 'application source' })
  const source = app.read(TYPES)
  if (source === null) throw new Error(`no ${TYPES} under ${app.base}: this check has no subject`)
  return source
}

/**
 * `kind<TAB>subject<TAB>member` rows, as psql -At -F '\t' emits them, into the
 * two halves the comparison reads: `tables`, keyed by table name, and `enums`,
 * keyed by the subject the vocabulary closes — a domain's name, or
 * `table.column`. `supabase/portable/inventory.sql` says why the kind leads.
 */
export function parseInventory(tsv) {
  const tables = new Map()
  const enums = new Map()
  for (const line of tsv.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const [kind, subject, member] = trimmed.split('\t')
    if (!kind || !subject || !member) continue
    // An unknown kind is a row this reader does not understand, and a reader
    // that files it under one of the two halves anyway reports a table called
    // whatever the new subject is. It is louder to say so.
    if (kind !== 'column' && kind !== 'enum') {
      throw new Error(`the inventory emits a row of kind ${kind}, which this check does not read`)
    }
    const into = kind === 'enum' ? enums : tables
    if (!into.has(subject)) into.set(subject, new Set())
    into.get(subject).add(member)
  }
  return { tables, enums }
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
  const tables = new Map()
  for (const [table, columns] of parseGeneratedColumns(source)) {
    tables.set(table, new Set(columns.keys()))
  }
  return tables
}

/**
 * The same `Row` blocks, keeping each column's declared TYPE beside its name.
 *
 * The inventory above compares against a database, which knows its columns by
 * name and not by how TypeScript spells them, so it reads the names alone. The
 * deployment check compares two of these files against each other, where the
 * spelling is half of what there is to compare, and a second regex over the
 * same block would be a second answer to what this format means. So the
 * fuller read is the one that exists and the narrower one is derived from it.
 *
 * A type is everything after the colon, which is usually the rest of that one
 * line — both generators emit a `Row` member per line — but need not be: a
 * file that has been through a formatter wraps a long union onto lines of its
 * own. Deeper-indented lines belong to the member above them, and are folded
 * back onto it, because a column whose type this reader dropped would be
 * reported as a column the deployment has not got.
 */
export function parseGeneratedColumns(source) {
  const tablesBlock = /^    Tables: \{$([\s\S]*?)^    Views: \{$/m.exec(source)
  if (!tablesBlock) throw new Error('could not find the Tables block in database.ts')
  const tables = new Map()
  const entries = tablesBlock[1].matchAll(
    /^      (\w+): \{\n        Row: \{\n([\s\S]*?)^        \}$/gm,
  )
  for (const [, table, body] of entries) {
    const columns = new Map()
    let open = null
    for (const line of body.split('\n')) {
      const column = /^          (\w+)\??:\s*(.*?)\s*$/.exec(line)
      if (column) {
        open = column[1]
        columns.set(open, column[2])
        continue
      }
      const wrapped = /^ {11,}(\S.*?)\s*$/.exec(line)
      if (open && wrapped) {
        const so_far = columns.get(open)
        columns.set(open, so_far === '' ? wrapped[1] : `${so_far} ${wrapped[1]}`)
        continue
      }
      open = null
    }
    tables.set(table, columns)
  }
  return tables
}

/**
 * The unions in the file's tail, as `name → members`.
 *
 * The tail is where the closed vocabularies land — `export type PathKind =`
 * and a `| 'member'` line each — and it is derived from the constraints now,
 * which is exactly why it is read back and compared rather than trusted. The
 * row aliases below it match nothing here: an alias's next line is a
 * `Database[…]` lookup and not a member.
 */
export function parseEnumUnions(source) {
  const unions = new Map()
  // A union of string literals, however it is laid out: the generator writes
  // one member per line, and the Supabase CLI's output a deployment may still
  // carry writes `= 'a' | 'b'` on one line. Both are the same type, so both
  // are read; a body that is anything but quoted literals joined by `|` is
  // not a vocabulary and is left alone.
  for (const [, name, body] of source.matchAll(
    /^export type (\w+) =((?:\s*\|?\s*'[^']*')+)\s*$/gm,
  )) {
    unions.set(name, [...body.matchAll(/'([^']*)'/g)].map((match) => match[1]))
  }
  return unions
}

/**
 * Those unions under the subject each one closes, so the two sides of the
 * comparison are keyed alike: `ENUMS` is what says which union describes which
 * domain or column, and it is the same list the generator derived them from.
 *
 * The value keeps the union's NAME beside its members because that is the half
 * of a finding a reader can act on — `paths.kind` names the constraint to fix
 * and `PathKind` names the type that is wrong about it.
 */
export function declaredVocabularies(unions) {
  const bySubject = new Map()
  for (const entry of ENUMS) {
    const subject = entry.domain ?? `${entry.table}.${entry.column}`
    const members = unions.get(entry.name)
    if (!members) continue
    bySubject.set(subject, { name: entry.name, members: new Set(members) })
  }
  return bySubject
}

/** The subject of each `ENUMS` entry, in that order. */
export const enumSubjects = () =>
  ENUMS.map((entry) => ({
    name: entry.name,
    subject: entry.domain ?? `${entry.table}.${entry.column}`,
  }))

/**
 * What the types and the built database disagree about.
 *
 * Direction matters in the report: it is the difference between "regenerate
 * the types" and "the migration that made this is wrong". Both arguments carry
 * the two halves `parseInventory` names — `{ tables, enums }` — and the types'
 * `enums` are `declaredVocabularies`, keyed by subject the same way.
 */
export function compare(types, actual) {
  const problems = []
  for (const table of [...actual.tables.keys()].sort()) {
    if (!types.tables.has(table)) {
      problems.push(`the schema builds public.${table}; the generated types do not describe it`)
    }
  }
  for (const table of [...types.tables.keys()].sort()) {
    if (!actual.tables.has(table)) {
      problems.push(`the generated types describe public.${table}; the schema never builds it`)
      continue
    }
    const declared = types.tables.get(table)
    const built = actual.tables.get(table)
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
  // The vocabularies, member for member, in both directions. Only the subjects
  // `ENUMS` names are compared: the database closes dozens of columns this way
  // and the app is typed against four of them, so a subject the types say
  // nothing about is a subject nobody asked them to describe.
  for (const { name, subject } of enumSubjects()) {
    const declared = types.enums.get(subject)
    const built = actual.enums.get(subject)
    if (!built) {
      problems.push(`${name} is the union over public.${subject}; the database closes no such vocabulary`)
      continue
    }
    if (!declared) {
      problems.push(`public.${subject} is closed to a fixed list; the generated types declare no ${name}`)
      continue
    }
    for (const member of [...built].sort()) {
      if (!declared.members.has(member)) {
        problems.push(`public.${subject} accepts '${member}' in the database and ${name} does not list it`)
      }
    }
    for (const member of [...declared.members].sort()) {
      if (!built.has(member)) {
        problems.push(`${name} lists '${member}' and public.${subject} does not accept it in the database`)
      }
    }
  }
  return problems
}

/**
 * The verdict: src/types/database.ts held against an inventory of the schema that
 * was just built.
 *
 * Pure — it reads both, decides, and hands back what it found. Nothing here prints
 * or exits, bar the usage error, which is not a verdict.
 */
export function judge(argv = process.argv.slice(2)) {
  const [inventoryPath] = argv
  if (!inventoryPath) {
    // Not a verdict: the command was given nothing to judge. The 2 says that,
    // and it is not one of the codes the verdict has words for, so the
    // judgement below is skipped and the module is handed nothing to say.
    console.error('usage: check-schema-inventory.mjs <inventory.tsv>')
    process.exitCode = 2
    return {}
  }
  const source = generatedTypes()
  const tables = parseGeneratedTypes(source)
  const problems = compare(
    { tables, enums: declaredVocabularies(parseEnumUnions(source)) },
    parseInventory(readFileSync(inventoryPath, 'utf8')),
  )
  return {
    what: 'a table src/types/database.ts describes',
    count: tables.size,
    findings: problems.map((problem) => `  ${problem}`),
    opening: 'src/types/database.ts has drifted from the schema:\n',
    closing:
      '\nThe app compiles against these types. Regenerate them with ' +
      '`npm run generate:database-types`, or fix the migration that made them wrong.',
    line: 'src/types/database.ts matches the schema that was just built',
  }
}

whenRun(import.meta.url, judge)
