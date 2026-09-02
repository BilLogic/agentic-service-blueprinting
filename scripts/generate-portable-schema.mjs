#!/usr/bin/env node
/**
 * The portable core as a schema, not a history.
 *
 * `portable-core.generated.sql` is the SERIES: every core statement in the
 * order a backend replays it, which is why it still says `layers` fifty
 * times — it creates the table under that name and renames it later, as the
 * migrations did. That is the right file to apply. It is the wrong file to
 * READ for what a backend ends up holding: a reader (or a grep, or an agent
 * standing up a fresh instance) meets every name the series ever used, and
 * #101 measured the retired ones at fifty-four, forty, thirty-seven, thirty.
 *
 * This file is the other view of the same thing. A throwaway Postgres
 * replays the series, `pg_dump --schema-only` writes what it holds, and the
 * result is committed beside the series and diffed by CI. It carries only
 * current names by construction — a name the series retired is not in the
 * database it builds — which makes it the file the vocabulary checks read:
 * `portable-schema.test.mjs` for retired identifiers,
 * `check-instance-vocabulary.mjs` for the instance's renames, and #102's
 * value-set guard for the CHECK constraints the ERD and the docs quote.
 *
 * Needs `createdb`, `psql`, `pg_dump` and `dropdb` for a local Postgres 17 —
 * the same tools the database job in CI has. It never edits a database that
 * already exists: the name it creates carries the pid, and it drops it on
 * the way out, success or failure.
 *
 *   npm run generate:portable-schema           write the file
 *   npm run check:portable-schema              regenerate and diff (CI)
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
export const SERIES = resolve(ROOT, 'supabase/generated/portable-core.generated.sql')
export const SCHEMA_FILE = 'portable-core.schema.sql'
export const SCHEMA = resolve(ROOT, 'supabase/generated', SCHEMA_FILE)

const HEADER = `-- The portable core, as the database it builds.
--
-- ⚠ GENERATED FILE — DO NOT EDIT. \`pg_dump --schema-only\` of a stock
-- Postgres that replayed portable-core.generated.sql. Edit the migration,
-- then run \`npm run generate:portable-schema\`. CI regenerates this file and
-- fails on any difference.
--
-- The series beside it is what a backend applies; this is what it holds
-- afterwards, with only the names it holds them under. Read this one.
-- ─────────────────────────────────────────────────────────────────────────

`

/**
 * A dump with the lines that vary between runs removed: the \\restrict token
 * pg_dump 17.6+ writes, and the version banner. Everything else is a function
 * of the schema.
 */
export function normalize(dump) {
  return (
    dump
      .split('\n')
      .filter((line) => !/^\\(un)?restrict\b/.test(line))
      .filter((line) => !/^-- Dumped (from|by) /.test(line))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n'
  )
}

export function dumpSchema() {
  const db = `portable_schema_${process.pid}`
  const pg = (cmd, args, input) =>
    execFileSync(cmd, args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'inherit'] })
  pg('createdb', [db])
  try {
    pg('psql', ['-v', 'ON_ERROR_STOP=1', '-q', '-d', db, '-f', SERIES])
    return HEADER + normalize(pg('pg_dump', ['--schema-only', '--no-owner', '--no-privileges', db]))
  } finally {
    pg('dropdb', ['--if-exists', db])
  }
}

function main() {
  const check = process.argv.includes('--check')
  const next = dumpSchema()
  if (!check) {
    writeFileSync(SCHEMA, next)
    console.log(`wrote supabase/generated/${SCHEMA_FILE}`)
    return
  }
  let current = ''
  try {
    current = readFileSync(SCHEMA, 'utf8')
  } catch {
    current = ''
  }
  if (current === next) {
    console.log(`supabase/generated/${SCHEMA_FILE} is what the series builds`)
    return
  }
  console.error(
    `::error::supabase/generated/${SCHEMA_FILE} is not what portable-core.generated.sql builds. ` +
      `A migration changed the schema and the dump was not regenerated — run: npm run generate:portable-schema`,
  )
  process.exitCode = 1
}

if (import.meta.url === `file://${process.argv[1]}`) main()
