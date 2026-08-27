#!/usr/bin/env node
/**
 * Check A — retired vocabulary surviving in a database identifier.
 *
 * `alter table … rename` moves the table and the column and nothing else. The
 * index, the constraint, the policy, the trigger, the comment and every plpgsql
 * body keep the name they were created with. An instance built on this
 * template discovered that the hard way — twenty-two objects still carrying
 * retired words a day after the rename that was supposed to have moved them,
 * and nine functions referencing columns that no longer existed because the
 * sweep's `\mservice_scenarios?\M` could not match inside
 * `service_scenario_id`. Both were found by hand, weeks later.
 *
 * This package avoided both: `21000102`'s `__rename_schema_objects` reads the
 * catalogue instead of a hand-written list, and `__assert_vocabulary_gone` was
 * run by each rename. But those helpers were dropped by `21000109` — correctly,
 * they were scaffolding — so nothing has watched the schema since. A rename
 * that lands tomorrow gets no assertion at all unless it writes its own.
 *
 * WHY THIS ASKS A REAL DATABASE. Upstream's equivalent statically replays the
 * migration series in JavaScript, and its own output admits the limit: it
 * checks the FILES, and anything applied out of band is invisible to it. It
 * also cannot see through a `do` block that renames objects from the catalogue,
 * which is exactly how every rename in this package is written — a static
 * reader would report the pre-rename names and be wrong about all of them.
 *
 * CI already builds the real thing. `ci.yml` applies the generated core to a
 * stock `postgres:17`, and separately replays every migration in order into
 * `migration_replay`. Sweeping `pg_catalog` there costs one query and cannot
 * drift from what the migrations actually do.
 *
 * The word list is `scripts/retired-vocabulary.mjs` and is not restated in SQL:
 * this builds the query from it, so a new rename row is enforced the moment it
 * is written down.
 *
 *   node scripts/check-retired-identifiers.mjs            # uses PG* env vars
 *   node scripts/check-retired-identifiers.mjs --database migration_replay
 *   node scripts/check-retired-identifiers.mjs --self-test  # prove it can fail
 *
 * `--self-test` plants an object named for a retired word inside a transaction,
 * asserts the sweep reports it, and rolls back. It runs first in CI, because a
 * sweep that returns nothing looks identical whether the schema is clean or the
 * query is broken — and this query cannot be executed on a machine without
 * Postgres, so its author may never have watched it work.
 *
 * Exits 0 when the database is clean, 1 on any finding, and 1 — loudly — when
 * it cannot reach a database at all. A guard that passes when blind is not a
 * guard; that sentence is `sync-blueprint-contract.mjs`'s and it was written
 * after a check spent weeks exiting 0 without comparing anything.
 */
import { execFileSync } from 'node:child_process'
import { RETIRED_IDENTIFIER_FRAGMENTS, replacementFor } from './retired-vocabulary.mjs'

/**
 * Identifiers allowed to keep a retired word, each with a reason and usually an
 * expiry. See `scripts/tests/retired-vocabulary.test.mjs` for the two rules that
 * keep the list honest: a permanent entry must be defined in `CONTEXT.md`, and
 * an entry whose subject no longer exists fails until someone deletes it.
 *
 * EMPTY, and that is an outcome to protect rather than an accident. Two rows of
 * the rename map could have needed one and do not:
 *
 *   `description` → `summary` enforces no fragment at all, because
 *   `slices.description` and the `tech_description` link type are live words
 *   rather than residue — recorded in the row itself, where the reasoning sits
 *   next to the decision, instead of here where it would read as a grudging
 *   allowance.
 *
 *   `propositions` → `business_model` keys on the plural, so
 *   `evidence.proposition_question_key` is not a case this check has to be
 *   talked out of. It is a live column and always was.
 *
 * @type {ReadonlyArray<import('./retired-vocabulary.mjs').Exemption>}
 */
export const RETIRED_IDENTIFIER_EXEMPTIONS = []

/** The sweep, built from the enforced word list rather than restating it. */
export function sweepSql(fragments = RETIRED_IDENTIFIER_FRAGMENTS) {
  if (fragments.length === 0) throw new Error('no retired fragments — the map is empty')
  const values = fragments.map((f) => `(${quote(f)})`).join(', ')
  return `
with fragment(word) as (values ${values})
select kind, identifier, word from (
  select 'table' as kind, cls.relname as identifier, f.word
    from pg_class cls
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    cross join fragment f
   where nsp.nspname = 'public' and cls.relkind in ('r','v','m','p')
     and strpos(cls.relname, f.word) > 0
  union all
  select 'column', cls.relname || '.' || att.attname, f.word
    from pg_attribute att
    join pg_class cls on cls.oid = att.attrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    cross join fragment f
   where nsp.nspname = 'public' and att.attnum > 0 and not att.attisdropped
     and cls.relkind in ('r','v','m','p')
     and strpos(att.attname, f.word) > 0
  union all
  select 'constraint', con.conname, f.word
    from pg_constraint con
    join pg_namespace nsp on nsp.oid = con.connamespace
    cross join fragment f
   where nsp.nspname = 'public' and strpos(con.conname, f.word) > 0
  union all
  select 'index', idx.relname, f.word
    from pg_class idx
    join pg_namespace nsp on nsp.oid = idx.relnamespace
    cross join fragment f
   where nsp.nspname = 'public' and idx.relkind = 'i'
     and strpos(idx.relname, f.word) > 0
  union all
  select 'policy', pol.polname || ' on ' || cls.relname, f.word
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    cross join fragment f
   where nsp.nspname = 'public' and strpos(pol.polname, f.word) > 0
  union all
  select 'trigger', tg.tgname || ' on ' || cls.relname, f.word
    from pg_trigger tg
    join pg_class cls on cls.oid = tg.tgrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    cross join fragment f
   where nsp.nspname = 'public' and not tg.tgisinternal
     and strpos(tg.tgname, f.word) > 0
  union all
  select 'sequence', cls.relname, f.word
    from pg_class cls
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    cross join fragment f
   where nsp.nspname = 'public' and cls.relkind = 'S'
     and strpos(cls.relname, f.word) > 0
  union all
  select 'type', typ.typname, f.word
    from pg_type typ
    join pg_namespace nsp on nsp.oid = typ.typnamespace
    cross join fragment f
   where nsp.nspname = 'public' and typ.typtype in ('e','d','c')
     and strpos(typ.typname, f.word) > 0
  union all
  select 'function', pro.proname, f.word
    from pg_proc pro
    join pg_namespace nsp on nsp.oid = pro.pronamespace
    cross join fragment f
   where nsp.nspname = 'public' and strpos(pro.proname, f.word) > 0
  union all
  -- The one an assertion against information_schema cannot see, and the one
  -- that broke upstream: a body still naming a relation the rename moved.
  select 'function body', pro.proname, f.word
    from pg_proc pro
    join pg_namespace nsp on nsp.oid = pro.pronamespace
    cross join fragment f
   where nsp.nspname = 'public' and pro.prokind = 'f'
     and strpos(coalesce(pro.prosrc, ''), f.word) > 0
  union all
  -- A comment is read by the next person and by an agent reading the schema,
  -- so a stale one is a wrong answer with a citation.
  select 'comment on ' || coalesce(cls.relname, '?'), coalesce(cls.relname, '?'), f.word
    from pg_description des
    join pg_class cls on cls.oid = des.objoid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    cross join fragment f
   where nsp.nspname = 'public' and strpos(des.description, f.word) > 0
) hit
order by kind, identifier, word;
`
}

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`

/**
 * Parse the `kind<TAB>identifier<TAB>word` rows psql emits under `-At -F \t`.
 *
 * A THREE-FIELD LINE IS A ROW; everything else is noise. psql echoes a command
 * tag — `BEGIN`, `CREATE TABLE`, `ROLLBACK` — for every statement in a
 * multi-statement script, and a tag carries no tabs. The self-test sends
 * exactly such a script, so the first time this ran against a real database it
 * destructured `undefined` and crashed.
 *
 * Which is the self-test doing its job, one layer further out than intended.
 * It was written on the argument that a sweep returning nothing looks the same
 * whether the schema is clean or the query is broken; the thing it actually
 * caught first was the PARSER, on a machine with no Postgres to catch it on.
 */
export function parseRows(tsv) {
  return tsv
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('\t'))
    .filter((fields) => fields.length === 3)
    .map(([kind, identifier, word]) => ({ kind, identifier, word }))
}

/** Findings, with exemptions applied. */
export function findings(rows, exemptions = RETIRED_IDENTIFIER_EXEMPTIONS) {
  return rows
    .map((row) => ({ ...row, subject: `${row.kind} ${row.identifier}` }))
    .filter((row) => !exemptions.some((entry) => entry.identifier === row.subject))
}

/**
 * Prove the sweep reports something, by planting something for it to report.
 *
 * Wrapped in a transaction that always rolls back, so the database it runs
 * against is unchanged whether the assertion passes or fails.
 */
export function selfTestSql(fragments = RETIRED_IDENTIFIER_FRAGMENTS) {
  const word = fragments[fragments.length - 1] // the shortest, so the name stays readable
  return `begin;
create table public.zz_selftest_${word}_table (id int);
${sweepSql([word])}
rollback;`
}

function psql(args, input) {
  return execFileSync('psql', ['-At', '-F', '\t', '-v', 'ON_ERROR_STOP=1', ...args], {
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

function main() {
  const args = process.argv.slice(2)
  const dbIndex = args.indexOf('--database')
  const database = dbIndex === -1 ? process.env.PGDATABASE : args[dbIndex + 1]

  const target = database ? ['-d', database] : []

  if (args.includes('--self-test')) {
    let out
    try {
      out = psql(target, selfTestSql())
    } catch (error) {
      console.error(`self-test could not run: ${String(error.stderr || error.message).trim()}`)
      process.exit(1)
    }
    const planted = parseRows(out).filter((row) => row.identifier.includes('zz_selftest'))
    if (planted.length === 0) {
      console.error(
        'SELF-TEST FAILED: a table named for a retired word was planted and the sweep ' +
          'did not report it. The query is broken, and a clean result from it means nothing.',
      )
      process.exit(1)
    }
    console.log(`ok — self-test: the sweep reported ${planted.length} planted object(s), then rolled back`)
    return
  }

  let tsv
  try {
    tsv = psql([...target, '-c', sweepSql()])
  } catch (error) {
    console.error(
      'could not sweep a database — this check compares the CATALOGUE, not the ' +
        'migration files, and has nothing to say without one.\n' +
        `  ${String(error.stderr || error.message).trim().split('\n').slice(-3).join('\n  ')}\n` +
        '\nSet PGHOST/PGUSER/PGDATABASE, or pass --database <name>. In CI this runs ' +
        'after the migration replay in ci.yml.',
    )
    process.exit(1)
  }

  const problems = findings(parseRows(tsv))
  for (const problem of problems) {
    console.error(
      `::error::retired vocabulary in ${problem.subject} — "${problem.word}" was ` +
        `renamed to ${replacementFor(problem.word)}. A rename moves the table and ` +
        'the column; it never moves this.',
    )
  }
  if (problems.length > 0) {
    console.error(`\n${problems.length} database identifier(s) still carry a retired word.`)
    process.exit(1)
  }
  console.log(
    `ok — no retired vocabulary in any database identifier ` +
      `(${RETIRED_IDENTIFIER_FRAGMENTS.length} fragments swept across the catalogue)`,
  )
}

if (import.meta.url === `file://${process.argv[1]}`) main()
