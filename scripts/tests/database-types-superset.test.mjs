#!/usr/bin/env node
/**
 * The superset check, over types files written into a temporary tree of its own.
 *
 * Its live half runs in a deployment, against the deployment's own generated
 * types, and there is no deployment here to point it at. What can be wrong
 * without one is the judgement: a check that only compared table names passes a
 * deployment missing a column, and one that compared the two files for equality
 * fails every deployment for having tables of its own. Both are a green or a
 * red line over the wrong question, so the cases are pinned — a column short, a
 * member short, and a strict superset that passes.
 *
 * The last two tests drive the command itself, because the exit code is the
 * whole of what a deployment's CI reads: 2 for a usage error, and 0 for the one
 * file here that is certainly a superset of the template's — a copy of it.
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
import { readAppFile } from '../app-source.mjs'
import { missing, report } from '../check-database-types-superset.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const SCRIPT = fileURLToPath(new URL('../check-database-types-superset.mjs', import.meta.url))

/** A types file of the shape the generator writes, short enough to read. */
function typesFile({ tables, unions }) {
  const rows = Object.entries(tables)
    .map(
      ([table, columns]) =>
        `      ${table}: {\n        Row: {\n` +
        columns.map((column) => `          ${column}: string\n`).join('') +
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

test('a deployment missing a column is told which column, under the columns heading', () => {
  const short = typesFile({
    tables: { cells: ['id', 'status'], phases: ['id'] },
    unions: { PathKind: ['happy', 'variant'] },
  })
  const groups = missing(TEMPLATE, short)
  assert.deepEqual(groups.columns, ['public.cells.summary'])
  assert.deepEqual(groups.tables, [])
  assert.deepEqual(groups.members, [])
  assert.match(report(groups).join('\n'), /columns the deployment does not describe/)
})

test('a deployment missing a union member is told which member, under the members heading', () => {
  const short = typesFile({
    tables: { cells: ['id', 'status', 'summary'], phases: ['id'] },
    unions: { PathKind: ['happy'] },
  })
  const groups = missing(TEMPLATE, short)
  assert.deepEqual(groups.members, ["PathKind: 'variant'"])
  assert.deepEqual(groups.columns, [])
  assert.match(report(groups).join('\n'), /union members the deployment does not list/)
})

test('a deployment that adds a table and a member of its own is a superset and passes', () => {
  const wider = typesFile({
    tables: { cells: ['id', 'status', 'summary', 'tenant_id'], phases: ['id'], billing: ['id'] },
    unions: { PathKind: ['happy', 'variant', 'rehearsal'] },
  })
  const groups = missing(TEMPLATE, wider)
  assert.deepEqual(groups, { tables: [], columns: [], unions: [], members: [] })
  assert.deepEqual(report(groups), [])
})

test('a deployment that declares no union at all is told the union is absent, not its members', () => {
  const none = typesFile({
    tables: { cells: ['id', 'status', 'summary'], phases: ['id'] },
    unions: {},
  })
  const groups = missing(TEMPLATE, none)
  assert.deepEqual(groups.unions, ['PathKind'])
  assert.deepEqual(groups.members, [])
})

test('a deployment missing a whole table is told the table, and not each of its columns', () => {
  const none = typesFile({
    tables: { cells: ['id', 'status', 'summary'] },
    unions: { PathKind: ['happy', 'variant'] },
  })
  const groups = missing(TEMPLATE, none)
  assert.deepEqual(groups.tables, ['public.phases'])
  assert.deepEqual(groups.columns, [])
})

test('the command with no file to compare says so and exits 2', () => {
  const result = run([])
  assert.equal(result.status, 2)
  assert.match(result.stderr, /usage: check-database-types-superset\.mjs/)
})

test('the command exits 0 on a file that holds everything this package declares, and 1 on one that does not', () => {
  const copy = written(readAppFile(ROOT, 'src/types/database.ts'))
  try {
    const passed = run([copy.path])
    assert.equal(passed.status, 0, passed.stderr)
    assert.match(passed.stdout, /holds everything/)
  } finally {
    copy.clean()
  }
  const short = written(TEMPLATE)
  try {
    const failed = run([short.path])
    assert.equal(failed.status, 1)
    assert.match(failed.stderr, /is missing what this package/)
  } finally {
    short.clean()
  }
})
