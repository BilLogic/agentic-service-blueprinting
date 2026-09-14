/**
 * The deployment check, over types files written into a temporary tree of its own.
 *
 * Its live half runs in a deployment, against the deployment's own declaration
 * of its database, and there is no deployment here to point it at. What can be
 * wrong without one is the judgement, and the judgement moved: the file a
 * deployment points this at is not what its application compiles — the
 * application is read out of this package — so a table that deployment never
 * built is a fact about it and a column absent from a table it DID build is
 * not. A check that failed on the first reddens on every honest deployment; a
 * check that ignored the second passes a database the application will read a
 * missing column out of. Both are a line over the wrong question, so the cases
 * are pinned: the two the reported deployment fails on, which pass, and a
 * column short on a shared table, which does not.
 *
 * The width cases are pinned in both directions because the two generators
 * differ in both: the Supabase CLI a deployment's docs send it to emits
 * `string` for a column this package's generator may narrow, and the reported
 * deployment narrows by hand — `EntityStatus` — where this package's own
 * generated column is `string`.
 *
 * The last tests drive the command itself, because the exit code is the whole
 * of what a deployment's CI reads: 2 for a usage error, and 0 for the one file
 * here that certainly agrees with the template's — a copy of it.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sweep } from '../sweep.mjs'
import { differences, notes, report } from '../check-database-types-superset.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const SCRIPT = fileURLToPath(new URL('../check-database-types-superset.mjs', import.meta.url))

const app = sweep({ subject: 'app', root: ROOT })

/** An application file, wherever it sits; its absence is this test's subject gone. */
const readApp = (path) => {
  const text = app.read(path)
  assert.ok(text !== null, `no ${path} under ${app.base}: this test has no subject`)
  return text
}

/**
 * A types file of the shape either generator writes, short enough to read.
 *
 * A column is a name, or a `name: type` pair where the type is what the file
 * is being written to say.
 */
function typesFile({ tables, unions = {}, imports = '' }) {
  const rows = Object.entries(tables)
    .map(
      ([table, columns]) =>
        `      ${table}: {\n        Row: {\n` +
        columns
          .map((column) => {
            const [name, type] = Array.isArray(column) ? column : [column, 'string']
            return `          ${name}: ${type}\n`
          })
          .join('') +
        `        }\n        Insert: {\n          x: string\n        }\n      }`,
    )
    .join('\n')
  const tail = Object.entries(unions)
    .map(
      ([name, members]) =>
        `/** doc */\nexport type ${name} =\n${members.map((member) => `  | '${member}'\n`).join('')}`,
    )
    .join('\n')
  return [
    imports,
    'export type Database = {',
    '  public: {',
    '    Tables: {',
    rows,
    '    }',
    '    Views: {',
    '    }',
    '  }',
    '}',
    '',
    tail,
  ].join('\n')
}

/** What this package declares, in the fixtures: two tables and a vocabulary. */
const TEMPLATE = typesFile({
  tables: { cells: ['id', 'status', 'summary'], phases: ['id'] },
  unions: { PathKind: ['happy', 'variant'] },
})

/** One fixture file, written into a throwaway directory, with its cleanup. */
function written(content) {
  const dir = mkdtempSync(join(tmpdir(), 'superset-'))
  const path = join(dir, 'deployment-database-types.ts')
  writeFileSync(path, content)
  return { path, clean: () => rmSync(dir, { recursive: true, force: true }) }
}

/** The command, run on a fixture: its exit status and what it printed. */
function run(args) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { status: 0, stdout, stderr: '' }
  } catch (error) {
    return {
      status: error.status,
      stdout: error.stdout?.toString() ?? '',
      stderr: error.stderr?.toString() ?? '',
    }
  }
}

test('a deployment missing a column of a table it does have is told which column', () => {
  const short = typesFile({
    tables: { cells: ['id', 'status'], phases: ['id'] },
    unions: { PathKind: ['happy', 'variant'] },
  })
  const groups = differences(TEMPLATE, short)
  assert.deepEqual(groups.columns, ['public.cells.summary'])
  assert.deepEqual(groups.absent, [])
  assert.deepEqual(groups.conflicts, [])
  assert.match(report(groups).join('\n'), /columns missing from a table the deployment does have/)
})

test('a table the deployment does not describe is a note, and the check still passes', () => {
  const fewer = typesFile({
    tables: { cells: ['id', 'status', 'summary'] },
    unions: { PathKind: ['happy', 'variant'] },
  })
  const groups = differences(TEMPLATE, fewer)
  assert.deepEqual(groups.absent, ['public.phases'])
  assert.deepEqual(report(groups), [])
  assert.match(notes(groups).join('\n'), /public\.phases/)
})

test('the two cases the reported deployment fails the old check on both pass', () => {
  // Its database lacks two of this package's tables, and its own file narrows
  // `status` to the alias this package declares and it imports.
  const deployment = typesFile({
    imports: "import type { EntityStatus } from '@/lib/entityStatus'",
    tables: { cells: ['id', ['status', 'EntityStatus'], 'summary'] },
    unions: {},
  })
  const template = typesFile({
    tables: { cells: ['id', 'status', 'summary'], phases: ['id'] },
    unions: { EntityStatus: ['live', 'planned'] },
  })
  const groups = differences(template, deployment)
  assert.deepEqual(groups.columns, [])
  assert.deepEqual(groups.conflicts, [])
  assert.deepEqual(groups.absent, ['public.phases'])
  assert.deepEqual(report(groups), [])
})

test('a deployment whose generator leaves a narrowed column wide passes too', () => {
  // The Supabase CLI's direction: this package narrows, the deployment's file
  // says `string`, and one text column is being described at two precisions.
  const template = typesFile({
    tables: { cells: ['id', ['status', 'EntityStatus']] },
    unions: { EntityStatus: ['live', 'planned'] },
  })
  const cli = typesFile({ tables: { cells: ['id', 'status'] } })
  assert.deepEqual(differences(template, cli), { absent: [], columns: [], conflicts: [] })
})

test('a deployment that declares none of this package’s unions is not asked to', () => {
  const none = typesFile({
    tables: { cells: ['id', 'status', 'summary'], phases: ['id'] },
    unions: {},
  })
  assert.deepEqual(differences(TEMPLATE, none), { absent: [], columns: [], conflicts: [] })
})

test('a nullable column, and a jsonb column that disagrees about null, both pass', () => {
  const template = typesFile({
    tables: { cells: [['id', 'string'], ['args', 'NonNullable<Json>']] },
  })
  const wider = typesFile({
    tables: { cells: [['id', 'string | null'], ['args', 'Json']] },
  })
  assert.deepEqual(differences(template, wider), { absent: [], columns: [], conflicts: [] })
})

test('two files that cannot be describing one column say so, with both spellings', () => {
  const template = typesFile({ tables: { cells: [['id', 'string']] } })
  const other = typesFile({ tables: { cells: [['id', 'number']] } })
  const groups = differences(template, other)
  assert.deepEqual(groups.conflicts, [
    'public.cells.id: this package says string, it says number',
  ])
  assert.match(report(groups).join('\n'), /columns the two files describe differently/)
})

test('a deployment that adds a table and a column of its own is welcome to them', () => {
  const wider = typesFile({
    tables: { cells: ['id', 'status', 'summary', 'tenant_id'], phases: ['id'], billing: ['id'] },
    unions: { PathKind: ['happy', 'variant', 'rehearsal'] },
  })
  assert.deepEqual(differences(TEMPLATE, wider), { absent: [], columns: [], conflicts: [] })
})

test('the command with no file to compare says so and exits 2', () => {
  const result = run([])
  assert.equal(result.status, 2)
  assert.match(result.stderr, /usage: check-database-types-superset\.mjs/)
})

test('the command exits 0 on a file that agrees with this package’s, and 1 on one short a column', () => {
  const copy = written(readApp('src/types/database.ts'))
  try {
    const passed = run([copy.path])
    assert.equal(passed.status, 0, passed.stderr)
    assert.match(passed.stdout, /describes every column/)
  } finally {
    copy.clean()
  }
  const short = written(TEMPLATE)
  try {
    const failed = run([short.path])
    assert.equal(failed.status, 1)
    assert.match(failed.stderr, /disagrees with this package/)
  } finally {
    short.clean()
  }
})
