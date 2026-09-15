#!/usr/bin/env node
/**
 * Does the database a deployment DECLARES carry the shape this package's
 * application reads?
 *
 * The file this is pointed at is a deployment's own `types/database.ts`, and
 * since the import flip that file is not what anything compiles. A deployment
 * reads the application out of this package, `@/types/database` resolves into
 * the package, and the application is typechecked against the copy that ships
 * beside it. What a deployment's own file is, is the DECLARATION of the
 * database its project actually has — the subject its live schema check and
 * its agent-account generator read. So this compares two descriptions of two
 * databases, not a module against the code that imports it, and the questions
 * worth asking are the ones a description can be wrong about.
 *
 *   node scripts/check-database-types-superset.mjs ../a-deployment/types/database.ts
 *
 * The assertion, for every table BOTH files hold: every column this package's
 * types declare is declared there too, and the two declarations of a shared
 * column do not contradict each other. A column absent from a table the
 * deployment does have is the finding that survives the flip — the application
 * will read it there and the database has not got it.
 *
 * Two things that used to fail here are reported now and do not fail:
 *
 * - **A table the deployment does not describe** is a migration it has not
 *   run, which is a fact about that deployment and not a defect in it. A
 *   deployment is entitled to carry the part of this core its service uses;
 *   what it is not entitled to is a table that is half there. So absent tables
 *   are printed as information and the check still exits 0.
 * - **The unions in the tail** are no longer compared at all. They are this
 *   package's own aliases — `EntityStatus`, `LaneRole`, `StakeholderKind` —
 *   imported by this package's code, which reads them out of this package's
 *   copy wherever it runs. No `Row` column is typed as one on either side; the
 *   generated columns are `string`, and the vocabulary they close is a CHECK
 *   constraint, which is a fact about a database and not about a file. Held to
 *   the tail, a deployment following its own documented path failed for using
 *   the Supabase CLI, whose output carries no such tail. Where a vocabulary
 *   does reach a column's type, the width comparison below is what reads it.
 *
 * Contradiction, not width, is the column test: `string` and `EntityStatus`
 * describe the same text column at two precisions and one deployment's file
 * narrows by hand what the CLI leaves wide; `Json` and `NonNullable<Json>` are
 * one jsonb column disagreeing about null. Neither is a defect, and a check
 * that reddened on either would be reading a spelling. `string` against
 * `number` is two files that cannot both be describing the same column, and
 * that is worth the exit code.
 *
 * The parsers are `check-schema-inventory.mjs`'s. Both checks read the same
 * generated file for the same facts — the tables with their columns and the
 * types those columns carry — and a second parser of one format is a second
 * answer to what that format means.
 */
import { readFileSync } from 'node:fs'
// Only built-in modules are available where this runs — a deployment installs
// this package's dependencies and not its development ones. `sweep.mjs` and the
// three modules it imports are dependency-free, which
// `tests/database-types-generator.test.mjs` holds by walking this file's
// import graph and refusing any bare specifier that is not `node:`.
import { sweep } from './sweep.mjs'
import { parseEnumUnions, parseGeneratedColumns } from './check-schema-inventory.mjs'
import { whenRun } from './verdict.mjs'

/** The tree this script runs in: the working directory — never this file's location; `sweep.mjs` says why. */
const REPO_ROOT = process.cwd()

/** The application path this package's own types are, wherever the application is. */
const TYPES = 'src/types/database.ts'

/**
 * A union type's members, as the text between the top-level `|`s.
 *
 * Top-level because a member can carry `|` inside it — `Record<string, A | B>`
 * — and a naive split would cut a type in half and compare the halves.
 */
function members(type) {
  const parts = []
  let depth = 0
  let quote = null
  let start = 0
  for (let index = 0; index < type.length; index += 1) {
    const character = type[index]
    if (quote) {
      if (character === quote) quote = null
      continue
    }
    if (character === "'" || character === '"') quote = character
    else if ('<([{'.includes(character)) depth += 1
    else if ('>)]}'.includes(character)) depth -= 1
    else if (character === '|' && depth === 0) {
      parts.push(type.slice(start, index))
      start = index + 1
    }
  }
  parts.push(type.slice(start))
  return parts.map((part) => part.trim()).filter((part) => part !== '')
}

/**
 * Those members with each named vocabulary replaced by the literals it names,
 * so the two sides are compared as the values they admit.
 *
 * A name is looked up in its own file first and in the other file second. Both
 * files name one vocabulary the same way by construction — the alias is this
 * package's and a deployment that narrows a column by hand imports it — so the
 * second lookup is what lets a file that imports `EntityStatus` be read at all.
 * A name neither file declares stays as it is, and `settles` below is what
 * decides not to judge it.
 */
function values(type, own, other) {
  return members(type).flatMap((member) => {
    const named = own.get(member) ?? other.get(member)
    return named ? named.map((literal) => `'${literal}'`) : [member]
  })
}

/** Does one member admit every value another does? `Json` admits all of them. */
function admits(wide, narrow) {
  if (wide === narrow) return true
  if (wide === 'Json') return true
  if (wide === 'NonNullable<Json>') return narrow !== 'null' && narrow !== 'undefined'
  if (wide === 'string') return /^(['"]).*\1$/.test(narrow)
  if (wide === 'number') return /^-?[\d.]+$/.test(narrow)
  if (wide === 'boolean') return narrow === 'true' || narrow === 'false'
  return false
}

/** A member this check has nothing to say about: a name neither file declares. */
const opaque = (member) =>
  /^[A-Za-z_$][\w$]*$/.test(member) &&
  !['string', 'number', 'boolean', 'null', 'undefined', 'true', 'false', 'Json'].includes(member)

/**
 * Can the two declarations of one column be describing one column?
 *
 * They can when either side admits everything the other does — which is what
 * makes a width difference in either direction pass, the deployment's hand
 * narrowing included. They cannot when neither does: `string` and `number` are
 * two different columns wearing one name.
 *
 * A member neither file declares is a type this check cannot see the inside of
 * — an import, a table's own alias — and a check that reddened on what it
 * cannot read would be guessing. Those settle it: the column passes.
 */
function settles(ours, theirs, ourUnions, theirUnions) {
  const mine = values(ours, ourUnions, theirUnions)
  const yours = values(theirs, theirUnions, ourUnions)
  if (mine.some(opaque) || yours.some(opaque)) return true
  const covers = (wide, narrow) => narrow.every((one) => wide.some((other) => admits(other, one)))
  return covers(mine, yours) || covers(yours, mine)
}

/**
 * What the two declarations disagree about, grouped by what a reader does
 * about it.
 *
 * `columns` and `conflicts` fail; `absent` is printed and does not. Grouped
 * rather than interleaved because they are three different jobs: an absent
 * table is a migration that was never run there, a missing column on a table
 * that IS there is a types file that was not regenerated after one, and a
 * conflicting type is two files that disagree about what a column holds.
 */
export function differences(template, deployment) {
  const ours = parseGeneratedColumns(template)
  const theirs = parseGeneratedColumns(deployment)
  const ourUnions = parseEnumUnions(template)
  const theirUnions = parseEnumUnions(deployment)

  const absent = []
  const columns = []
  const conflicts = []

  for (const [table, declared] of [...ours].sort()) {
    const held = theirs.get(table)
    if (!held) {
      absent.push(`public.${table}`)
      continue
    }
    for (const [column, type] of [...declared].sort()) {
      const theirType = held.get(column)
      if (theirType === undefined) {
        columns.push(`public.${table}.${column}`)
        continue
      }
      if (!settles(type, theirType, ourUnions, theirUnions)) {
        conflicts.push(`public.${table}.${column}: this package says ${type}, it says ${theirType}`)
      }
    }
  }
  return { absent, columns, conflicts }
}

/** The failing groups that have anything in them, as the report prints them. */
export function report(groups) {
  const headings = [
    ['columns missing from a table the deployment does have', groups.columns],
    ['columns the two files describe differently', groups.conflicts],
  ]
  return headings
    .filter(([, entries]) => entries.length > 0)
    .map(([heading, entries]) => `${heading}:\n${entries.map((entry) => `  ${entry}`).join('\n')}`)
}

/** What is worth saying and is not a failure: the tables that are not there. */
export function notes(groups) {
  if (groups.absent.length === 0) return []
  return [
    'tables this package describes and the deployment does not (a migration ' +
      `it has not run, not a failure):\n${groups.absent.map((entry) => `  ${entry}`).join('\n')}`,
  ]
}

/**
 * The verdict: a deployment’s own types file, held against this package’s.
 *
 * Pure — it reads both files, decides, and hands back what it found. Nothing here
 * prints or exits, bar the usage error and the notes, which are not a verdict.
 */
export function judge(argv = process.argv.slice(2)) {
  const [deploymentPath] = argv
  if (!deploymentPath) {
    // Not a verdict: the command was given no file to compare against, and 2
    // is not one of the codes the verdict has words for, so the judgement
    // below is skipped and the module is handed nothing to say.
    console.error(
      'usage: check-database-types-superset.mjs <path to a deployment’s types/database.ts>',
    )
    process.exitCode = 2
    return {}
  }
  const app = sweep({ subject: 'app', root: REPO_ROOT, what: 'application source' })
  const template = app.read(TYPES)
  if (template === null) {
    throw new Error(`no ${TYPES} under ${app.base}: this check has no subject`)
  }
  const groups = differences(template, readFileSync(deploymentPath, 'utf8'))
  // The notes go to stdout whether the comparison passes or fails: a table the
  // deployment has not built is worth saying and is not a finding, so it is
  // said here rather than folded into a verdict that would colour it red.
  for (const note of notes(groups)) console.log(`${note}\n`)
  return {
    what: `a table this package’s ${TYPES} declares`,
    count: parseGeneratedColumns(template).size,
    findings: report(groups).map((section) => `${section}\n`),
    opening: `${deploymentPath} disagrees with this package’s ${TYPES}:\n`,
    closing:
      'The application this package ships reads these columns out of that database. ' +
      'Regenerate the deployment’s types, or run the migration they are behind.',
    line:
      `${deploymentPath} describes every column this package’s ${TYPES} declares, ` +
      'on every table it shares with it',
  }
}

whenRun(import.meta.url, judge)
