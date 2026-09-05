#!/usr/bin/env node
/**
 * Every `language sql` function in `public` is CALLED, not read.
 *
 * A SQL-language function body is stored as text and resolved at call time. An
 * `alter table … rename` moves the table and leaves every body that names it
 * exactly as it was — so the function keeps existing, keeps being dumped, keeps
 * passing every static sweep, and raises `42P01` the first time anybody calls
 * it. Creation is no defence: Postgres DOES check the body then, and it passed,
 * because the relation was there when it was written. Only the rename that came
 * afterwards made it false, and a rename validates nothing.
 *
 * #171 is that bug, shipped. `21000115000000` renamed `slice_items` to `slides`
 * and moved the four constraints, the two indexes, the trigger and the four
 * policies with it. `slices_referencing`'s body kept the old name, and because
 * `deletion_impact` reads that function and every delete RPC reads
 * `deletion_impact`, no structural delete could succeed on a fresh core:
 *
 *   ERROR:  relation "public.slice_items" does not exist
 *
 * Nothing here could see it. The catalogue sweep (`check:identifiers`) reads
 * bodies, but only for words the rename map RETIRES — and that row could not
 * retire its word while this defect stood, because the sweep would have failed
 * on the body rather than on residue. The schema dump was regenerated happily:
 * a broken body dumps like any other. The one thing that distinguishes a body
 * that resolves from one that does not is calling it.
 *
 * So this calls all of them. Not the ones a reader would think to name — the
 * migration that caused this rewrote the two functions it suspected and swept
 * those same two, which can only ever confirm the suspicion. `pg_proc` says
 * which functions are `language sql`; each is called with a typed null per
 * argument, inside a transaction that is rolled back. `slices_referencing` and
 * `deletion_impact` are additionally called with REAL ids out of the seeded
 * content, because a null argument proves the body plans and a real one proves
 * it also runs.
 *
 * WHAT COUNTS AS A FAILURE is narrow on purpose: only the SQLSTATEs that mean
 * "this body names something that is not there" — an undefined table, column,
 * function or schema. A function that raises its own exception on null input
 * has answered the question this asks (its body resolved), so it is reported
 * as tolerated and passes. Widening that list would turn the check into a
 * suite of unit tests for functions that already have them.
 *
 *   npm run check:function-bodies
 *   node scripts/check-function-bodies.mjs --self-test   # prove it can fail
 *
 * Needs a reachable Postgres 17 and permission to create a database — the same
 * stance, and the same stack, as `check:seed-load`, whose `STACK` this imports
 * rather than restating. In CI it is the `portable-core` job's service.
 */
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STACK } from './check-seed-loads.mjs'

const ROOT = new URL('../', import.meta.url)
const P = (rel) => fileURLToPath(new URL(rel, ROOT))
const DB = process.env.FUNCTION_BODIES_DB ?? 'function_bodies_check'

/**
 * The SQLSTATEs that mean a body named something the database does not have.
 * These are the class this check exists for, and nothing else fails it.
 */
export const UNRESOLVED = new Map([
  ['42P01', 'undefined table'],
  ['42703', 'undefined column'],
  ['42883', 'undefined function'],
  ['42704', 'undefined object'],
  ['3F000', 'invalid schema name'],
  ['42P02', 'undefined parameter'],
])

/** Which functions to call, and with what: one typed null per argument. */
export const PROBE_LIST_SQL = `
select p.proname,
       'select public.' || quote_ident(p.proname) || '(' ||
       coalesce((select string_agg('null::' || format_type(a.t, null), ', ' order by a.ord)
                   from unnest(p.proargtypes) with ordinality as a(t, ord)), '') || ')'
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
 where n.nspname = 'public' and l.lanname = 'sql' and p.prokind = 'f'
 order by p.proname;
`

/**
 * The two the defect actually disabled, called with content rather than nulls.
 * Each subquery is evaluated against the seeded database, so these say that the
 * body runs over real rows — the delete-confirmation read, and the function it
 * reads — and not merely that it plans.
 */
export const SEEDED_PROBES = [
  [
    'slices_referencing(cells from the seed)',
    "select public.slices_referencing((select coalesce(array_agg(c.id), '{}'::uuid[]) from (select id from public.cells limit 25) c))",
  ],
  ['deletion_impact(scenario)', "select public.deletion_impact('scenario', (select id from public.scenarios limit 1))"],
  ['deletion_impact(path)', "select public.deletion_impact('path', (select id from public.paths limit 1))"],
  ['deletion_impact(step)', "select public.deletion_impact('step', (select id from public.steps limit 1))"],
  ['deletion_impact(lane)', "select public.deletion_impact('lane', (select id from public.lanes limit 1))"],
]

/**
 * The defect itself, planted: a table, a `language sql` body that reads it, and
 * then the rename that leaves the body naming a relation nobody has.
 *
 * Written that way round rather than as a body naming a table that never
 * existed, because Postgres REFUSES the second one — `check_function_bodies` is
 * on, and creation would fail instead of the call. Reproducing the bug means
 * reproducing its order: valid at creation, false one rename later. Everything
 * planted goes with the throwaway database.
 */
export const PLANTED = {
  name: 'zz_selftest_dangling_body()',
  create:
    'create table public.zz_selftest_before_the_rename (id int);\n' +
    'create function public.zz_selftest_dangling_body() returns bigint language sql stable as ' +
    '$$ select count(*) from public.zz_selftest_before_the_rename $$;\n' +
    'alter table public.zz_selftest_before_the_rename rename to zz_selftest_after_the_rename;',
  probe: 'select public.zz_selftest_dangling_body()',
}

/**
 * The SQLSTATE psql reports under `VERBOSITY verbose`, if any.
 *
 * The `psql:<file>:<line>:` prefix is OPTIONAL, and that is not a stylistic
 * allowance: psql writes it when it is reading a file and omits it when the
 * script arrives on stdin, which is how every probe here is sent. Requiring it
 * classified the planted defect as "some other error" — the self-test's first
 * finding was this parser, exactly as `check-retired-identifiers.mjs` records
 * of its own.
 */
export function sqlstateOf(stderr) {
  return /^(?:psql:[^\n]*?:\s*)?ERROR:\s+([0-9A-Z]{5}):/m.exec(stderr ?? '')?.[1] ?? null
}

/** The first ERROR line, without psql's file:line prefix. */
export function messageOf(stderr) {
  const line = (stderr ?? '').split('\n').find((l) => l.includes('ERROR:'))
  return (line ?? '').replace(/^psql:[^:]*:\d+:\s*/, '').trim()
}

/** A probe, run inside a transaction that is always rolled back. */
export function probeScript(sql) {
  return `\\set VERBOSITY verbose\nbegin;\n${sql};\nrollback;\n`
}

function run(bin, args, input) {
  return execFileSync(bin, args, {
    encoding: 'utf8',
    input,
    env: { ...process.env, PGOPTIONS: '--client-min-messages=warning' },
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  })
}

const psql = (args, input) => run('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-d', DB, ...args], input)

/**
 * Call one probe. Returns `null` when the body resolved, and a finding when it
 * named something that is not there. Any other error is tolerated and reported.
 */
export function probe(label, sql) {
  try {
    psql(['-At'], probeScript(sql))
    return { label, outcome: 'answered' }
  } catch (error) {
    const stderr = String(error.stderr ?? '')
    const state = sqlstateOf(stderr)
    if (state && UNRESOLVED.has(state)) {
      return { label, outcome: 'unresolved', state, message: messageOf(stderr) }
    }
    return { label, outcome: 'tolerated', state, message: messageOf(stderr) }
  }
}

function main() {
  const selfTest = process.argv.includes('--self-test')
  run('dropdb', ['--if-exists', DB])
  run('createdb', [DB])
  try {
    for (const file of STACK) psql(['-f', P(file)])

    if (selfTest) {
      psql(['-c', PLANTED.create])
      const planted = probe(PLANTED.name, PLANTED.probe)
      if (planted.outcome !== 'unresolved') {
        console.error(
          `SELF-TEST FAILED: a \`language sql\` body naming a table that does not exist ` +
            `was planted and calling it was reported as "${planted.outcome}". A clean ` +
            'result from this check means nothing until this passes.',
        )
        process.exitCode = 1
        return
      }
      console.log(`ok — self-test: calling ${PLANTED.name} reported ${planted.state} (${planted.message})`)
      return
    }

    const probes = psql(['-At', '-F', '\t', '-c', PROBE_LIST_SQL])
      .split('\n')
      .map((line) => line.replace(/\r$/, '').split('\t'))
      .filter((fields) => fields.length === 2)
      .map(([name, sql]) => [`${name}(typed nulls)`, sql])

    if (probes.length === 0) {
      console.error(
        'no `language sql` function was found in public — this check swept nothing, ' +
          'which is not the same as finding nothing. The stack did not apply as expected.',
      )
      process.exitCode = 1
      return
    }

    const results = [...probes, ...SEEDED_PROBES].map(([label, sql]) => probe(label, sql))
    const broken = results.filter((r) => r.outcome === 'unresolved')
    const tolerated = results.filter((r) => r.outcome === 'tolerated')

    for (const finding of broken) {
      console.error(
        `::error::${finding.label} — ${finding.message}\n` +
          '    The body names something this database does not have. A body is TEXT: a ' +
          'rename moves the relation and never the body, so the function exists, dumps ' +
          'cleanly and fails on call. Rewrite it in a migration (`create or replace`).',
      )
    }
    if (broken.length > 0) {
      console.error(`\n${broken.length} function body/bodies do not resolve when called.`)
      process.exitCode = 1
      return
    }
    console.log(
      `ok — every \`language sql\` function in public resolves when called ` +
        `(${probes.length} called with typed nulls, ${SEEDED_PROBES.length} with seeded rows` +
        `${tolerated.length > 0 ? `, ${tolerated.length} raised their own exception and were tolerated` : ''})`,
    )
    for (const t of tolerated) console.log(`  tolerated — ${t.label}: ${t.message}`)
  } catch (error) {
    console.error('could not stand up a database to call the functions in:\n')
    console.error(String(error.stderr ?? error.message).trim())
    console.error(
      '\nThe stack that is applied, in order:\n' + STACK.map((f) => `  ${f}`).join('\n'),
    )
    process.exitCode = 1
  } finally {
    run('dropdb', ['--if-exists', DB])
  }
}

// Same shape as scripts/check-seed-loads.mjs: comparing against a hand-built
// `file://` URL silently no-ops whenever the path needs escaping.
const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) main()
