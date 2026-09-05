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
 * That is what a READER sees. The same database is then asked what a signed-in
 * AUTHOR may write: every column the five panel editors write directly must be
 * granted to `authenticated`, and every table they write must carry an UPDATE
 * policy that admits it. Both halves have been missing in the last three
 * migrations, neither is visible on a laptop holding the dev service key, and
 * the second half fails silently — see scripts/panel-write-surface.mjs.
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
import {
  buildWriteSurfaceSql,
  evaluateWriteSurface,
  writtenColumns,
  writtenTables,
} from './panel-write-surface.mjs'

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
 * The reads the app performs to render, as raw counts. `@grid` is the
 * blueprint itself — a path, its ordered steps, and the cells at each
 * lane × step; `@hierarchy` is the nav spine down to a path. Each must return
 * rows, which a populated-but-unjoinable seed (a dangling foreign key the owner
 * inserted around) would not.
 *
 * `@registry` and `@placement` are the touchpoint registry the same way the
 * app reaches it (#325). The registry is the SERVICE's — `touchpoints` carries
 * `service_id` — so `useRegistryTouchpoints` resolves a cell's owning service
 * (cell → path → scenario → phase → `service_id`) and lists that service's
 * touchpoints; `@registry` runs exactly that per-service join, so the read that
 * feeds the registry UI is proven to reach a cell's registry as anon, scoped to
 * the service that owns it. `@placement` is the other half — a cell's placement
 * joined to its registry row, the name / kind / icon a touchpoint cell renders
 * (`cellTouchpointsFromRows`). A deployment's touchpoints render through this
 * template's registry exactly when both joins return rows to the deployed key.
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
  // A deployment carries its tool logos as data in `touchpoints.icon_url`
  // (#326). The fixture below seeds one as the owner; this read, run as anon,
  // is the deployed key seeing it — the value a deployment renders off the row
  // rather than a tool name matched against a table baked into code.
  '@icon': `select count(*) from public.touchpoints where icon_url = '${'/touchpoint-logos/example-logo.png'}'`,
  // The registry a cell can link to, resolved per-service the way the hook does:
  // a cell reaches its service through its path, and the registry is that
  // service's touchpoints. Non-zero proves the anon key can walk the whole
  // scope and read the touchpoints filtered by the service it lands on.
  '@registry':
    'select count(*) from public.cells c ' +
    'join public.paths p on p.id = c.path_id ' +
    'join public.scenarios sc on sc.id = p.scenario_id ' +
    'join public.phases ph on ph.id = sc.phase_id ' +
    'join public.touchpoints tp on tp.service_id = ph.service_id',
  // A placement joined to its registry row — the name the touchpoint cell shows
  // in the registry's spelling, not the placement's own. The embed the board
  // query names `touchpoints`, run here as the join it compiles to.
  '@placement':
    'select count(*) from public.cell_touchpoints ct ' +
    'join public.touchpoints tp on tp.id = ct.touchpoint_id',
}

/**
 * What each render read renders, for the failure line. `@icon` is not here: its
 * empty result has a bespoke message (a grant the recipe never extended to the
 * new column), handled before this map is consulted.
 */
export const RENDER_READ_NAMES = {
  '@grid': 'the blueprint grid',
  '@hierarchy': 'the service hierarchy',
  '@registry': 'the touchpoint registry a cell links to',
  '@placement': "a cell's touchpoint placement",
}

/**
 * The sample seed ships no tool logos, so the icon column would read as all-null
 * and `@icon` above could never see a value carried to the anon key. This stands
 * one up the way a deployment's seed would: the OWNER sets one touchpoint's
 * icon, and the anon read proves the deployed key sees it (#326). It runs after
 * the stack and before the inventory read.
 */
export const ICON_FIXTURE_URL = '/touchpoint-logos/example-logo.png'
export const ICON_FIXTURE_SQL =
  `update public.touchpoints set icon_url = '${ICON_FIXTURE_URL}' ` +
  'where id = (select id from public.touchpoints order by id limit 1);'

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
      if (label === '@icon') {
        problems.push(
          `a deployment touchpoint icon (@icon) is not visible as anon — the ` +
            `icon_url column did not reach the deployed key (a grant the recipe ` +
            `never extended to the new column, or the fixture did not apply)`,
        )
        continue
      }
      const what = RENDER_READ_NAMES[label] ?? label
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
    // Stand up a deployment's tool logo (#326) as the owner, so the anon read
    // below (`@icon`) proves the value reaches the deployed key.
    psql(['-c', ICON_FIXTURE_SQL])
    // The other half of "a deployment works": the anon read above is what a
    // reader sees, this is what a signed-in AUTHOR may write. It asks the
    // catalog rather than becoming the role, so it costs one more query and no
    // more setup — see scripts/panel-write-surface.mjs for why both the grant
    // and the policy have to be asked separately.
    const writeProblems = evaluateWriteSurface(
      psql(['-At', '-F', '|', '-c', buildWriteSurfaceSql()]),
    )
    if (writeProblems.length > 0) {
      console.error('The recipe applied, but a signed-in author cannot write what the panels show:\n')
      for (const problem of writeProblems) console.error(`  ${problem}`)
      console.error(
        '\nThe panel editors write these columns directly, under the caller\'s own ' +
          'privileges. A missing grant is a refusal the author sees; a missing ' +
          'UPDATE policy is worse — the save matches no row and is reported as a ' +
          'deleted one. Neither is visible locally, where the dev service key ' +
          'bypasses RLS.',
      )
      process.exitCode = 1
      return
    }
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
        `(${POPULATED.length} tables populated, ${Object.keys(RENDER_READS).length} render reads return rows), ` +
        `and every column the panels write is reachable by authenticated ` +
        `(${writtenColumns().length} grants, ${writtenTables().length} update policies)`,
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
