#!/usr/bin/env node
/**
 * `src/types/database.ts`, generated from the database the portable core
 * builds — the whole file, tail included.
 *
 * The app compiles against this file. It used to be two things stapled
 * together: a body the Supabase CLI wrote against whichever project somebody
 * had linked, and a hand-written tail of unions and aliases that "survived
 * regeneration" because the header asked the next person to paste it back.
 * The body described a database this repository does not own; the tail's
 * unions restated CHECK constraints by hand, and a value added to a
 * constraint reached the type only when somebody remembered.
 *
 * Now there is one source and one generator. The source is the portable core
 * and the recipe, applied to a fresh Postgres here — the stack
 * `check:seed-load` stands up, minus the seed — because that is the database
 * every deployment runs and the one the rest of this job proves. The
 * generator is the engine behind `supabase gen types`,
 * `@supabase/postgrest-typegen`, called from Node over a plain `pg`
 * connection: no Docker, no linked project, no CLI account; `psql` and
 * `createdb` are all it asks of the machine. The body is what that engine
 * emits. The tail is DERIVED in the same run: the enum unions are read off
 * the domain and the CHECK constraints `ENUMS` names
 * (`database-vocabularies.mjs`, shared with the checks that compare against
 * them), and the row aliases are the names the codebase imports, listed here
 * as data rather than typed into the output.
 *
 * `--check` regenerates into memory and diffs against the committed file, so
 * CI's `portable-core` job fails when a migration changes a shape the types do
 * not carry — and when the committed file was edited by hand, which is the
 * failure this replaces the header's plea with.
 *
 *   npm run generate:database-types
 *   npm run check:database-types
 *
 * Needs a reachable Postgres 17 and permission to create a database, the way
 * `check:seed-load` does; in CI that is the `portable-core` job's service.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { introspect } from '@supabase/postgrest-typegen/introspection'
import { generateTypescript, sortGeneratorMetadata } from '@supabase/postgrest-typegen/generation'
import { CORE_STACK } from './check-deployment-seed-loads.mjs'
import { ENUMS, membersOfCheck } from './database-vocabularies.mjs'

/** The tree this script runs in: the working directory — never this file's location; `sweep.mjs` says why. */
const ROOT = process.cwd()
const P = (rel) => resolve(ROOT, rel)

/** Where the types live. */
export const TYPES_FILE = 'src/types/database.ts'

/**
 * Applied in this order onto the empty database: the deployer's stack without
 * the seed. It is `check:seed-load`'s list with the last step filtered off,
 * imported rather than restated, so a file added to that stack reaches this
 * one without a second edit.
 */
export const STACK = CORE_STACK

/**
 * The PostgREST the generated client is typed against. The generator writes
 * it into the file's `__InternalSupabase` block, where `@supabase/supabase-js`
 * reads it to pick the query shapes that version supports. A deployment's
 * project reports its own; this is the one the app is developed against.
 * Nothing here holds it to a running server — this repository has none — so
 * a bump is a deliberate edit, and a mismatch shows as a query the client
 * types differently, not as a silent drift `--check` would miss.
 */
export const POSTGREST_VERSION = '14.15'

/**
 * The names the codebase imports for a table's row. `[alias, table]`, or
 * `[alias, table, 'Views']` for a view; `Slide` carries the nested join the
 * canvas select asks for.
 */
export const ROW_ALIASES = [
  ['Cell', 'cells'],
  ['CellDependency', 'cell_dependencies'],
  ['Lane', 'lanes'],
  ['Stakeholder', 'stakeholders'],
  ['Path', 'paths'],
  ['PathStep', 'path_steps'],
  ['Phase', 'phases'],
  ['Service', 'services'],
  ['Scenario', 'scenarios'],
  ['Step', 'steps'],
  ['Slice', 'slices'],
  ['SlideImage', 'slide_images'],
  ['Slide', 'slides'],
  ['Evidence', 'evidence'],
  ['Finding', 'audit_findings'],
  ['EvidenceCount', 'evidence_counts', 'Views'],
]

/**
 * The SQL that reads every closed vocabulary `ENUMS` names, as
 * `name<TAB>member` rows in declaration order.
 */
export function enumMembersSql() {
  const domains = ENUMS.filter((entry) => entry.domain)
  const columns = ENUMS.filter((entry) => entry.table)
  const literal = (value) => `'${value.replace(/'/g, "''")}'`
  return `
    select v.name, pg_get_constraintdef(c.oid) as definition
    from (values ${domains.map((entry) => `(${literal(entry.name)}, ${literal(entry.domain)})`).join(', ')}) as v(name, domain)
    join pg_type t on t.typname = v.domain and t.typnamespace = 'public'::regnamespace
    join pg_constraint c on c.contypid = t.oid and c.contype = 'c'
    union all
    select v.name, pg_get_constraintdef(c.oid)
    from (values ${columns.map((entry) => `(${literal(entry.name)}, ${literal(entry.table)}, ${literal(entry.column)})`).join(', ')}) as v(name, tbl, col)
    join pg_class r on r.relname = v.tbl and r.relnamespace = 'public'::regnamespace
    join pg_attribute a on a.attrelid = r.oid and a.attname = v.col
    join pg_constraint c on c.conrelid = r.oid and c.contype = 'c' and c.conkey = array[a.attnum]
  `
}

/** `ENUMS` with each entry's members, read from the built database. */
export async function readEnumMembers(client) {
  const { rows } = await client.query(enumMembersSql())
  const byName = new Map()
  for (const row of rows) {
    const members = membersOfCheck(row.definition)
    if (members) byName.set(row.name, members)
  }
  const missing = ENUMS.filter((entry) => !byName.has(entry.name)).map((entry) => entry.name)
  if (missing.length > 0) {
    throw new Error(
      `no closed vocabulary in the database for ${missing.join(', ')}: the constraint ENUMS ` +
        `names is not there, or is not of the shape x = ANY (ARRAY[...])`,
    )
  }
  return ENUMS.map((entry) => ({ ...entry, members: byName.get(entry.name) }))
}

/** The tail: the derived unions and the row aliases, as TypeScript. */
export function renderTail(enums) {
  const lines = [
    '// ---------------------------------------------------------------------------',
    '// Derived with the file above by scripts/generate-database-types.mjs: the',
    '// unions are read off the constraints that close each vocabulary, and the',
    '// aliases are the names the codebase imports. Edit the generator, not this.',
    '// ---------------------------------------------------------------------------',
    '',
  ]
  for (const entry of enums) {
    lines.push(`/** ${entry.doc} */`)
    lines.push(`export type ${entry.name} =`)
    for (const member of entry.members) lines.push(`  | '${member}'`)
    lines.push('')
  }
  for (const [alias, table, kind = 'Tables'] of ROW_ALIASES) {
    const row = `Database['public']['${kind}']['${table}']['Row']`
    if (alias === 'Slide') {
      lines.push(`export type ${alias} = ${row} & {`, '  slide_images?: SlideImage[]', '}')
    } else {
      lines.push(`export type ${alias} = ${row}`)
    }
  }
  lines.push('')
  return lines.join('\n')
}

/** The file's header. */
export const HEADER = `/**
 * Supabase database types for the \`public\` schema.
 *
 * GENERATED by scripts/generate-database-types.mjs from the database the
 * portable core and the recipe build. Do not edit: run
 *
 *   npm run generate:database-types
 *
 * and commit the result. CI regenerates it and fails on any difference.
 *
 * @see docs/connectors/supabase/database.md — schema, RLS, and connection docs
 * @see docs/erd.mmd — entity relationship diagram
 */

`

/** The whole file, from a connected client. */
export async function renderTypesFile(client) {
  const metadata = await introspect(client, { includedSchemas: ['public'] })
  const body = await generateTypescript(sortGeneratorMetadata(metadata), {
    postgrestVersion: POSTGREST_VERSION,
  })
  const enums = await readEnumMembers(client)
  return `${HEADER}${body.trimEnd()}\n\n${renderTail(enums)}`
}

const DB = process.env.DATABASE_TYPES_DB ?? 'database_types_check'

function run(bin, args) {
  return execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function psql(args) {
  return run('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-d', DB, ...args])
}

/** The stack, stood up on a fresh database of its own, and torn down after. */
async function withBuiltDatabase(work) {
  run('dropdb', ['--if-exists', DB])
  run('createdb', [DB])
  try {
    for (const file of STACK) psql(['-f', P(file)])
    // A pool, because the introspection issues its queries concurrently and a
    // single client serialises them with a deprecation warning.
    const pool = new pg.Pool({ database: DB })
    try {
      return await work(pool)
    } finally {
      await pool.end()
    }
  } finally {
    run('dropdb', ['--if-exists', DB])
  }
}

async function main() {
  const check = process.argv.includes('--check')
  const rendered = await withBuiltDatabase(renderTypesFile)
  const target = P(TYPES_FILE)
  if (!check) {
    writeFileSync(target, rendered)
    console.log(`wrote ${TYPES_FILE}`)
    return
  }
  const committed = readFileSync(target, 'utf8')
  if (committed === rendered) {
    console.log(`${TYPES_FILE} is what the built database generates`)
    return
  }
  const before = committed.split('\n')
  const after = rendered.split('\n')
  const firstDifference = before.findIndex((line, index) => line !== after[index])
  console.error(
    `${TYPES_FILE} is not what the built database generates (first difference at line ` +
      `${firstDifference + 1}):\n  committed: ${JSON.stringify(before[firstDifference] ?? '<end>')}\n` +
      `  generated: ${JSON.stringify(after[firstDifference] ?? '<end>')}\n\n` +
      'Run `npm run generate:database-types` and commit the result, or fix the migration ' +
      'that made the difference.',
  )
  process.exit(1)
}

// Same shape as check-schema-inventory.mjs: compared as paths, not as a
// hand-built `file://` URL, which no-ops under a directory with a space in it.
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  main().catch((error) => {
    console.error(error.stderr?.toString() || error.message)
    process.exit(1)
  })
}
