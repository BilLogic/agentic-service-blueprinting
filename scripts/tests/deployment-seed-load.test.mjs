#!/usr/bin/env node
/**
 * The parsing and the skip decision in `check:deployment-seed-load`.
 *
 * The check itself needs a Postgres and a deployment checkout, so it does not
 * run in CI and cannot be tested here. Everything it does BEFORE it touches a
 * database can be, and those are the parts that fail quietly: a config format
 * read slightly wrong loads the wrong files in the wrong order and reports a
 * dependency failure as a finding; a skip that misfires turns "I could not look"
 * into "I looked and it was fine".
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  chooseDeployment,
  expandSeedEntries,
  groupFailures,
  isDownstream,
  parsePsqlErrors,
  resolveSeedFiles,
  seedFlag,
  seedSectionFromConfig,
  seededTables,
} from '../check-deployment-seed-loads.mjs'

const CONFIG = `
[db]
port = 54322

[db.seed]
# If enabled, seeds the database after migrations during a db reset.
enabled = true
sql_paths = [
  "./seed.sql",
  "./seeds/second.sql",
  "./seeds/first.sql",
]

[db.network_restrictions]
enabled = false
`

test('the seed list is read in the order the deployment states it', () => {
  assert.deepEqual(seedSectionFromConfig(CONFIG), {
    enabled: true,
    sqlPaths: ['./seed.sql', './seeds/second.sql', './seeds/first.sql'],
  })
})

test('the section stops at the next table, so a later array is not read as seeds', () => {
  const withTrailer = `${CONFIG}\nsql_paths = ["./not-a-seed.sql"]\n`
  assert.deepEqual(seedSectionFromConfig(withTrailer).sqlPaths, [
    './seed.sql',
    './seeds/second.sql',
    './seeds/first.sql',
  ])
})

test('a config that states no seed section, or disables it, says so', () => {
  assert.equal(seedSectionFromConfig('[db]\nport = 54322\n'), null)
  assert.equal(seedSectionFromConfig('[db.seed]\nenabled = false\n').enabled, false)
})

test('a glob expands sorted, and a plain entry is left alone', () => {
  const list = (dir) => (dir === 'seeds' ? ['b.sql', 'a.sql', 'notes.md'] : ['seed.sql'])
  assert.deepEqual(expandSeedEntries(['./seed.sql', './seeds/*.sql'], list), [
    'seed.sql',
    'seeds/a.sql',
    'seeds/b.sql',
  ])
})

test('a seed with no config beside it is the whole seed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'deployment-seed-'))
  mkdirSync(join(dir, 'supabase'))
  const seed = join(dir, 'supabase', 'seed.sql')
  writeFileSync(seed, 'select 1;\n')
  assert.deepEqual(resolveSeedFiles(seed), [seed])
})

test("the config's list wins over the named file, and a missing entry is dropped", () => {
  const dir = mkdtempSync(join(tmpdir(), 'deployment-seed-'))
  const supabase = join(dir, 'supabase')
  mkdirSync(join(supabase, 'seeds'), { recursive: true })
  writeFileSync(join(supabase, 'seed.sql'), 'select 1;\n')
  writeFileSync(join(supabase, 'seeds', 'one.sql'), 'select 1;\n')
  writeFileSync(
    join(supabase, 'config.toml'),
    '[db.seed]\nenabled = true\nsql_paths = ["./seed.sql", "./seeds/one.sql", "./seeds/gone.sql"]\n',
  )
  assert.deepEqual(resolveSeedFiles(join(supabase, 'seed.sql')), [
    join(supabase, 'seed.sql'),
    join(supabase, 'seeds', 'one.sql'),
  ])
})

test('only the ERROR lines are failures; notices and detail lines are not', () => {
  const stderr = [
    'psql:supabase/seed.sql:11: ERROR:  relation "public.old_name" does not exist',
    'LINE 1: insert into public.old_name (id)',
    'psql:supabase/seed.sql:70: ERROR:  column "old_column" of relation "phases" does not exist',
    'psql:supabase/seed.sql:70: DETAIL:  Failing row contains (…)',
    'NOTICE:  renamed 11 objects',
  ].join('\n')
  assert.deepEqual(parsePsqlErrors(stderr), [
    {
      file: 'supabase/seed.sql',
      line: 11,
      message: 'relation "public.old_name" does not exist',
    },
    {
      file: 'supabase/seed.sql',
      line: 70,
      message: 'column "old_column" of relation "phases" does not exist',
    },
  ])
})

test('a knock-on failure is one of three shapes, and nothing else is', () => {
  assert.equal(isDownstream('insert or update on table "lanes" violates foreign key constraint "x"'), true)
  assert.equal(isDownstream('cells: lane_id does not exist'), true)
  assert.equal(isDownstream('current transaction is aborted, commands ignored until end of transaction block'), true)
  assert.equal(isDownstream('column "picture" of relation "cells" does not exist'), false)
})

test('root causes come first, commonest first, with at most three examples each', () => {
  const failures = [
    ...Array.from({ length: 4 }, (_, i) => ({
      file: 'a.sql',
      line: i,
      message: 'lanes violates foreign key constraint "lanes_path_id_fkey"',
    })),
    { file: 'a.sql', line: 9, message: 'column "picture" of relation "cells" does not exist' },
    { file: 'b.sql', line: 1, message: 'column "picture" of relation "cells" does not exist' },
    { file: 'b.sql', line: 2, message: 'relation "public.old_name" does not exist' },
  ]
  const groups = groupFailures(failures)
  assert.deepEqual(
    groups.map((g) => [g.message, g.count, g.downstream]),
    [
      ['column "picture" of relation "cells" does not exist', 2, false],
      ['relation "public.old_name" does not exist', 1, false],
      ['lanes violates foreign key constraint "lanes_path_id_fkey"', 4, true],
    ],
  )
  assert.deepEqual(groups[2].examples, ['a.sql:0', 'a.sql:1', 'a.sql:2'])
})

test('the tables read back are the ones the seed INSERTS into, once each', () => {
  const sql = [
    'insert into public.services (id) values (1);',
    'INSERT INTO public.services (id) values (2);',
    'update public.cells set picture = null;',
    'delete from public.phases;',
    'insert into  public.cell_dependencies (id) values (3);',
  ].join('\n')
  assert.deepEqual(seededTables(sql), ['services', 'cell_dependencies'])
})

test('exactly one deployment beside this checkout is the one it runs against', () => {
  const candidates = [
    { dir: '/w/another-copy', name: 'agentic-service-blueprinting', hasSeed: true },
    { dir: '/w/their-app', name: 'their-app', hasSeed: true },
    { dir: '/w/no-database', name: 'other', hasSeed: false },
  ]
  assert.deepEqual(chooseDeployment(candidates, 'agentic-service-blueprinting'), {
    dir: '/w/their-app',
  })
})

test('none and several both skip, and the message says which it was', () => {
  const none = chooseDeployment(
    [{ dir: '/w/another-copy', name: 'agentic-service-blueprinting', hasSeed: true }],
    'agentic-service-blueprinting',
  )
  assert.match(none.skip, /no checkout beside this one/)

  const several = chooseDeployment(
    [
      { dir: '/w/their-app', name: 'their-app', hasSeed: true },
      { dir: '/w/other-app', name: 'other-app', hasSeed: true },
    ],
    'agentic-service-blueprinting',
  )
  assert.match(several.skip, /2 checkouts/)
  assert.match(several.skip, /their-app, other-app/)
  assert.match(several.skip, /--seed/)
})

test('--seed takes the next argument, and refuses to swallow the next flag', () => {
  assert.equal(seedFlag(['--seed', '../their-app/supabase/seed.sql']), '../their-app/supabase/seed.sql')
  assert.equal(seedFlag([]), null)
  assert.throws(() => seedFlag(['--seed']))
  assert.throws(() => seedFlag(['--seed', '--verbose']))
})
