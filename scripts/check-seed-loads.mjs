#!/usr/bin/env node
/**
 * A generated seed loads onto a FRESH core + recipe, and a keyless read returns
 * the content.
 *
 * The path this guards is the one a non-professional deployer actually walks:
 * clone the repo, set the two `VITE_SUPABASE_*` values, replay the schema and
 * the seed onto a brand-new database, and expect their content to show up. Every
 * other database check here reads as the OWNER — which cannot see the failure
 * that matters most on that path, because the deployed app never reads as the
 * owner. It holds the anon key. A table the migrations forgot to expose renders
 * blank in a browser and stays green in an owner-only check.
 *
 * So this builds the whole stack on an empty Postgres, loads the committed seed,
 * and reads it back AS `anon` — the role the deployed app's key resolves to:
 *
 *   1. supabase/portable/supabase-shim.sql        the role names + auth/storage
 *   2. supabase/portable/platform-defaults.sql    the platform's SELECT default
 *   3. supabase/generated/portable-core.generated.sql      the contract
 *   4. supabase/generated/supabase-recipe.generated.sql    Supabase's enforcement
 *   5. supabase/seed.sql                          the generated sample content
 *
 * Then, as `anon`: every table the seed populates comes back non-empty, and the
 * two joins the app actually renders — the blueprint grid and the service
 * hierarchy — return rows. A permission the recipe never granted surfaces here
 * as "permission denied for table …", which is the browser's blank screen, six
 * minutes earlier and with the table named.
 *
 * Ordering is the whole subtlety. The platform default (step 2) is set BEFORE
 * the core creates any table, so every table inherits the anon SELECT the way a
 * real project's tables do — and the recipe's surgical revokes (evidence,
 * business_models) then land on top exactly as they do on Supabase. See
 * platform-defaults.sql for why that file exists at all.
 *
 * This IS the behavioural-parity substrate later reconciliation tickets read
 * against: swap the sample seed for a deployment's own generated seed and the
 * same assertion says whether that content renders.
 *
 *   npm run check:seed-load
 *
 * Needs a reachable Postgres 17 and permission to create a database. In CI that
 * is the `portable-core` job's `postgres:17` service (PG* already in the env);
 * locally it is whatever `psql` / `createdb` connect to by default. No Docker,
 * no Supabase, no shim an adopter installs — the same stance as the rest of the
 * portable-core job.
 */
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = new URL('../', import.meta.url)
const P = (rel) => fileURLToPath(new URL(rel, ROOT))

/** Applied in this order onto the empty database. */
export const STACK = [
  'supabase/portable/supabase-shim.sql',
  'supabase/portable/platform-defaults.sql',
  'supabase/generated/portable-core.generated.sql',
  'supabase/generated/supabase-recipe.generated.sql',
  'supabase/seed.sql',
]

/**
 * Tables the sample seed populates. Each must come back non-empty when read as
 * `anon`; an empty one means the seed did not write it OR the recipe does not
 * expose it to the deployed key, and the report cannot tell those apart from
 * here — both are the same blank screen, and both are this check's job to catch.
 *
 * evidence and business_models are deliberately absent: the seed leaves them
 * empty (an offline reader could never see restricted rows), and the recipe
 * hides business_models from anon outright.
 */
export const POPULATED = [
  'services',
  'phases',
  'scenarios',
  'paths',
  'steps',
  'path_steps',
  'lanes',
  'cells',
  'cell_dependencies',
  'touchpoints',
  'cell_touchpoints',
  'resources',
  'slices',
  'slides',
]

/**
 * The two reads the app performs to render, as raw counts. `@grid` is the
 * blueprint itself — a path, its ordered steps, and the cells at each
 * lane × step; `@hierarchy` is the nav spine down to a path. Both must return
 * rows, which a populated-but-unjoinable seed (a dangling foreign key the owner
 * inserted around) would not.
 */
export const RENDER_READS = {
  '@grid':
    'select count(*) from public.paths p ' +
    'join public.path_steps ps on ps.path_id = p.id ' +
    'join public.steps s on s.id = ps.step_id ' +
    'join public.cells c on c.step_id = s.id ' +
    'join public.lanes l on l.id = c.lane_id',
  '@hierarchy':
    'select count(*) from public.services sv ' +
    'join public.phases ph on ph.service_id = sv.id ' +
    'join public.scenarios sc on sc.phase_id = ph.id ' +
    'join public.paths pa on pa.scenario_id = sc.id',
}

/** The single query, run as `anon`, that returns one `label|count` row each. */
export function buildInventorySql() {
  const rows = [
    ...POPULATED.map(
      (t) => `select '${t}'::text as t, count(*)::bigint as n from public.${t}`,
    ),
    ...Object.entries(RENDER_READS).map(
      ([label, sql]) => `select '${label}', n from (${sql}) as ${label.slice(1)}(n)`,
    ),
  ]
  return `set role anon;\n${rows.join('\nunion all\n')}\norder by t;`
}

/** Parse `label|count` lines from `psql -At -F '|'`. */
export function parseCounts(stdout) {
  const counts = new Map()
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const [label, n] = trimmed.split('|')
    if (label === undefined || n === undefined) continue
    counts.set(label, Number(n))
  }
  return counts
}

/** What is empty that should not be. */
export function evaluate(counts) {
  const problems = []
  for (const table of POPULATED) {
    const n = counts.get(table)
    if (n === undefined) {
      problems.push(`public.${table} returned no row — the anon read never reached it`)
    } else if (n === 0) {
      problems.push(`public.${table} is empty as anon — the seed did not populate it, or the recipe does not expose it to the anon key`)
    }
  }
  for (const label of Object.keys(RENDER_READS)) {
    const n = counts.get(label)
    if (!n || n === 0) {
      const what = label === '@grid' ? 'the blueprint grid' : 'the service hierarchy'
      problems.push(`${what} (${label}) returned no rows — the seed loaded but does not render`)
    }
  }
  return problems
}

const DB = process.env.SEED_LOAD_DB ?? 'seed_load_check'

function run(bin, args, extraEnv = {}) {
  return execFileSync(bin, args, {
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  })
}

function psql(args, extraEnv = {}) {
  // Notices are the migrations' running commentary (`renamed 11 objects …`);
  // warnings and above still come through, and ON_ERROR_STOP makes any error a
  // non-zero exit rather than a message swallowed mid-file.
  return run('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-d', DB, ...args], {
    PGOPTIONS: '--client-min-messages=warning',
    ...extraEnv,
  })
}

function main() {
  run('dropdb', ['--if-exists', DB])
  run('createdb', [DB])
  try {
    for (const file of STACK) psql(['-f', P(file)])
    const stdout = psql(['-At', '-F', '|', '-c', buildInventorySql()])
    const problems = evaluate(parseCounts(stdout))
    if (problems.length > 0) {
      console.error('The seed loaded, but a keyless read does not see the content:\n')
      for (const problem of problems) console.error(`  ${problem}`)
      console.error(
        '\nThis is the deployed app reading with the anon key. A table it cannot ' +
          'see renders blank in the browser. Expose it to anon in the recipe ' +
          '(a migration `grant select … to anon`), or fix the seed that left it empty.',
      )
      process.exitCode = 1
      return
    }
    console.log(
      `the generated seed loads on a fresh core + recipe and renders as anon ` +
        `(${POPULATED.length} tables populated, both render reads return rows)`,
    )
  } catch (error) {
    // A non-zero psql exit — an apply that would not run, or a read the anon
    // role is refused. Its stderr names the file and the statement, so it is
    // the most useful thing to print.
    const stderr = error.stderr?.toString() ?? ''
    console.error('The fresh-database seed load failed:\n')
    console.error(stderr.trim() || String(error.message))
    console.error(
      '\nThe stack that is applied, in order:\n' +
        STACK.map((f) => `  ${f}`).join('\n') +
        '\n\nReproduce it by hand against a scratch database with those files, ' +
        'in that order, under `psql -v ON_ERROR_STOP=1`.',
    )
    process.exitCode = 1
  } finally {
    run('dropdb', ['--if-exists', DB])
  }
}

// Same shape as scripts/generate-portable-core.mjs: comparing against a
// hand-built `file://` URL silently no-ops whenever the path needs escaping.
const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) main()
