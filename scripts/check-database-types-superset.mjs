#!/usr/bin/env node
/**
 * Does a deployment's `src/types/database.ts` hold everything this template's
 * declares?
 *
 * The template generates its types from its own portable core. A deployment
 * generates its own — the Supabase CLI against its project, or this same
 * generator against its own core — and they are not the same file: a
 * deployment has tables, columns and vocabulary members of its own, and it is
 * entitled to all of them. What it is not entitled to is fewer. The
 * application it compiles is THIS package's, and every column that application
 * reads and every member its unions name come from the template's core; a
 * deployment whose types are missing one compiles a `Row` without the field,
 * and the failure surfaces as a type error in a file nobody edited, or as a
 * value the deployment's own code cannot name.
 *
 * So the direction is one-way: the template's types are the FLOOR, and this
 * asks only whether the deployment's file is a superset of it.
 *
 *   node scripts/check-database-types-superset.mjs ../a-deployment/src/types/database.ts
 *
 * It runs in a deployment's CI, against the deployment's own file, because
 * that is where the answer is actionable and where the file is. Nothing in
 * this repository's CI runs it: there is no deployment here to point it at.
 *
 * The parsers are `check-schema-inventory.mjs`'s. Both checks read the same
 * generated file for the same two facts — the tables with their columns, and
 * the unions in the tail — and a second parser of one format is a second
 * answer to what that format means.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
// Only built-in modules are available where this runs — a deployment installs
// this package's dependencies and not its development ones. `sweep.mjs` and the
// three modules it imports are dependency-free, which
// `tests/database-types-generator.test.mjs` holds by walking this file's
// import graph and refusing any bare specifier that is not `node:`.
import { sweep } from './sweep.mjs'
import { parseEnumUnions, parseGeneratedTypes } from './check-schema-inventory.mjs'

/** The tree this script is part of: the directory `scripts/` sits in. */
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

/** The application path both files are, wherever the application is. */
const TYPES = 'src/types/database.ts'

/**
 * What the template declares and the deployment does not, grouped by the kind
 * of thing missing.
 *
 * Grouped rather than interleaved because the three groups are three different
 * jobs: a whole table absent is usually a migration the deployment never ran,
 * a column is usually a stale types file, and a vocabulary member is a CHECK
 * constraint that was widened here and not there.
 */
export function missing(template, deployment) {
  const ours = parseGeneratedTypes(template)
  const theirs = parseGeneratedTypes(deployment)
  const ourUnions = parseEnumUnions(template)
  const theirUnions = parseEnumUnions(deployment)

  const tables = []
  const columns = []
  const unions = []
  const members = []

  for (const [table, declared] of [...ours].sort()) {
    const held = theirs.get(table)
    if (!held) {
      tables.push(`public.${table}`)
      continue
    }
    for (const column of [...declared].sort()) {
      if (!held.has(column)) columns.push(`public.${table}.${column}`)
    }
  }
  for (const [name, declared] of [...ourUnions].sort()) {
    const held = theirUnions.get(name)
    if (!held) {
      unions.push(name)
      continue
    }
    for (const member of declared) {
      if (!held.includes(member)) members.push(`${name}: '${member}'`)
    }
  }
  return { tables, columns, unions, members }
}

/** The groups that have anything in them, as the report prints them. */
export function report(groups) {
  const headings = [
    ['tables the deployment does not describe', groups.tables],
    ['columns the deployment does not describe', groups.columns],
    ['unions the deployment does not declare', groups.unions],
    ['union members the deployment does not list', groups.members],
  ]
  return headings
    .filter(([, entries]) => entries.length > 0)
    .map(([heading, entries]) => `${heading}:\n${entries.map((entry) => `  ${entry}`).join('\n')}`)
}

function main() {
  const [deploymentPath] = process.argv.slice(2)
  if (!deploymentPath) {
    console.error(
      'usage: check-database-types-superset.mjs <path to a deployment’s src/types/database.ts>',
    )
    process.exit(2)
  }
  const app = sweep({ subject: 'app', root: REPO_ROOT, what: 'application source' })
  const template = app.read(TYPES)
  if (template === null) {
    throw new Error(`no ${TYPES} under ${app.base}: this check has no subject`)
  }
  const groups = missing(template, readFileSync(deploymentPath, 'utf8'))
  const sections = report(groups)
  if (sections.length === 0) {
    console.log(`${deploymentPath} holds everything this package’s ${TYPES} declares`)
    return
  }
  console.error(`${deploymentPath} is missing what this package’s ${TYPES} declares:\n`)
  for (const section of sections) console.error(`${section}\n`)
  console.error(
    'The application this package ships compiles against these. Regenerate the ' +
      'deployment’s types against a database that carries this core, or run the ' +
      'migration that is missing there.',
  )
  process.exit(1)
}

// Same shape as check-schema-inventory.mjs: compared as paths, not as a
// hand-built `file://` URL, which no-ops under a directory with a space in it.
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) main()
