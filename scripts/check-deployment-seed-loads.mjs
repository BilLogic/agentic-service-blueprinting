#!/usr/bin/env node
/**
 * A DEPLOYMENT's own seed loads onto THIS template's portable core, and renders.
 *
 * `check:seed-load` proves the loop closes on content this repository generated
 * itself. That is necessary and it is not the interesting question, because the
 * generator and the schema move together — a seed this repo emits can hardly
 * disagree with a core this repo emits. The interesting question is the one a
 * reconciliation ticket actually asks: is the portable core SUFFICIENT for the
 * content a real deployment holds? Only a deployment's own seed can answer it,
 * and that answer is what this check is.
 *
 *   npm run check:deployment-seed-load
 *   npm run check:deployment-seed-load -- --seed ../their-app/supabase/seed.sql
 *
 * The mechanism is deliberately the same as its sibling's, minus the last step:
 *
 *   1. supabase/portable/supabase-shim.sql        the role names + auth/storage
 *   2. supabase/portable/platform-defaults.sql    the platform's SELECT default
 *   3. supabase/generated/portable-core.generated.sql      the contract
 *   4. supabase/generated/supabase-recipe.generated.sql    the enforcement
 *   5. THE DEPLOYMENT'S SEED, in the order the deployment itself loads it
 *
 * Then the same anon reads: every table the seed inserts into comes back
 * non-empty to the key a browser holds, and the two joins the app renders — the
 * blueprint grid and the service hierarchy — return rows.
 *
 * ── Why the apply half does not stop at the first error ───────────────────
 *
 * Its sibling runs under `ON_ERROR_STOP=1`, because one broken statement in a
 * seed this repo generated is a bug to fix now. Here the failing statements ARE
 * the deliverable: a reconciliation ticket needs the whole list, grouped, not
 * the first line of it. So the seed is applied with the stop switch OFF and
 * every `psql:file:line: ERROR:` is collected, grouped by reason, and reported
 * with counts and examples.
 *
 * Knock-on failures are separated from root causes and labelled, because a seed
 * loads in dependency order: a lane whose path never inserted fails its foreign
 * key, and every cell in that lane then fails the core's row-validation trigger.
 * Reporting forty of those beside the one column that started it buries the
 * finding. Foreign-key violations and the core's own `cells: …` raises are
 * therefore listed second, under a heading that says they are downstream.
 *
 * ── Finding the deployment ────────────────────────────────────────────────
 *
 * `--seed <path>` or `DEPLOYMENT_SEED=<path>` names it outright. With neither,
 * the check looks for a checkout beside this one: a sibling directory that
 * ships `supabase/seed.sql` and whose `package.json` states a name other than
 * this package's — another copy of this template is not a deployment of it.
 * None, or more than one, and the check SKIPS with a message naming what it
 * saw and exits 0. That is why it is not in CI: a CI runner checks out one
 * repository, so this check would skip on every run and prove nothing. It is a
 * local guard — docs/engineering/checks.md § The database.
 *
 * ── What counts as "the seed" ─────────────────────────────────────────────
 *
 * A Supabase deployment states its seed in `supabase/config.toml` as an ORDERED
 * list under `[db.seed]`, and a deployment of any size uses it: one file per
 * scenario, loaded after the file that creates the service they hang off. So
 * when a `config.toml` sits beside the named seed, that list is the seed — in
 * its order, globs expanded — and the named file is only how the deployment was
 * located. Without one, the named file is the whole seed.
 *
 * Needs a reachable Postgres 17 and permission to create a database, exactly
 * like its sibling.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RENDER_READS, RENDER_READ_NAMES, STACK, parseCounts } from './check-seed-loads.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const P = (rel) => resolve(ROOT, rel)

/**
 * The stack, minus this repository's own seed — a deployment's seed replaces
 * that last step rather than landing on top of it. Filtered rather than sliced
 * so a reordering of STACK cannot silently drop the recipe instead.
 */
export const CORE_STACK = STACK.filter((file) => !/seed\.sql$/.test(file))

/** The render reads a deployment's seed is held to, whatever else it carries. */
export const DEPLOYMENT_RENDER_READS = {
  '@grid': RENDER_READS['@grid'],
  '@hierarchy': RENDER_READS['@hierarchy'],
}

// ── Locating a deployment ──────────────────────────────────────────────────

/**
 * Which sibling checkout is a deployment of this template?
 *
 * `candidates` are `{ dir, name, hasSeed }` — `name` is the sibling's declared
 * package name, `null` when it declares none. A deployment ships a seed and is
 * not another checkout of this package; anything else is not a candidate.
 * Returns `{ dir }` for exactly one match, and `{ skip }` otherwise, because
 * both "none" and "several" mean the same thing to the caller: nothing to run
 * against, say so and stay green.
 */
export function chooseDeployment(candidates, selfName) {
  const found = candidates.filter((c) => c.hasSeed && c.name !== selfName)
  if (found.length === 1) return { dir: found[0].dir }
  if (found.length === 0) {
    return { skip: 'no checkout beside this one ships a supabase/seed.sql' }
  }
  return {
    skip:
      `${found.length} checkouts beside this one ship a supabase/seed.sql ` +
      `(${found.map((c) => basename(c.dir)).join(', ')}) — name one with --seed`,
  }
}

/** `{ dir, name, hasSeed }` for every directory beside `root`. */
export function siblingCandidates(root) {
  const parent = dirname(resolve(root))
  let entries
  try {
    entries = readdirSync(parent, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => join(parent, e.name))
    .filter((dir) => dir !== resolve(root))
    .sort()
    .map((dir) => ({
      dir,
      name: packageName(dir),
      hasSeed: existsSync(join(dir, 'supabase', 'seed.sql')),
    }))
}

/** The `name` a directory's package.json states, or null. */
export function packageName(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name ?? null
  } catch {
    return null
  }
}

// ── What the deployment loads, in what order ───────────────────────────────

/**
 * The `[db.seed]` table of a `config.toml`, as `{ enabled, sqlPaths }` — or
 * null when the file states no such section.
 *
 * A hand-rolled reader rather than a TOML parser: this repository depends on
 * nothing to run its checks, and the shape read here is one boolean and one
 * array of strings that may wrap across lines. Anything else in the section is
 * ignored on purpose, including comments, which is why the strings are taken
 * from the array's text rather than from the line.
 */
export function seedSectionFromConfig(toml) {
  const lines = toml.split('\n')
  const start = lines.findIndex((line) => line.trim() === '[db.seed]')
  if (start === -1) return null
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^\s*\[/.test(line))
  const body = (end === -1 ? rest : rest.slice(0, end)).join('\n')

  const enabled = !/^\s*enabled\s*=\s*false/m.test(body)
  const array = body.match(/sql_paths\s*=\s*\[([\s\S]*?)\]/)
  if (!array) return { enabled, sqlPaths: [] }
  const sqlPaths = [...array[1].matchAll(/"([^"]*)"|'([^']*)'/g)]
    .map((m) => m[1] ?? m[2])
    .filter((path) => path !== '')
  return { enabled, sqlPaths }
}

/**
 * The config's entries as paths, relative to the supabase directory, with `*`
 * patterns expanded against `list(dir)` — the config format allows them and a
 * deployment that used one would otherwise load nothing. Expansion is sorted,
 * so a glob's order is stable rather than filesystem order.
 */
export function expandSeedEntries(entries, list) {
  const out = []
  for (const entry of entries) {
    const clean = entry.replace(/^\.\//, '')
    if (!clean.includes('*')) {
      out.push(clean)
      continue
    }
    const dir = dirname(clean)
    const pattern = new RegExp(
      `^${basename(clean).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`,
    )
    for (const name of list(dir === '.' ? '' : dir).sort()) {
      if (pattern.test(name)) out.push(dir === '.' ? name : `${dir}/${name}`)
    }
  }
  return out
}

/**
 * Every file the deployment loads, absolute, in order. When a `config.toml`
 * sits beside the named seed and states a `[db.seed]` list, that list is the
 * seed; otherwise the named file is.
 */
export function resolveSeedFiles(seedPath) {
  const dir = dirname(resolve(seedPath))
  const config = join(dir, 'config.toml')
  if (!existsSync(config)) return [resolve(seedPath)]
  const section = seedSectionFromConfig(readFileSync(config, 'utf8'))
  if (!section || !section.enabled || section.sqlPaths.length === 0) {
    return [resolve(seedPath)]
  }
  const list = (sub) => {
    try {
      return readdirSync(join(dir, sub))
    } catch {
      return []
    }
  }
  return expandSeedEntries(section.sqlPaths, list)
    .map((rel) => join(dir, rel))
    .filter((file) => existsSync(file) && statSync(file).isFile())
}

// ── Reading what psql said ─────────────────────────────────────────────────

/** `psql:<file>:<line>: ERROR:  <message>` — the only line shape that matters. */
export const PSQL_ERROR = /^psql:(.+):(\d+): ERROR:\s+(.*)$/

/** Every failing statement psql reported, as `{ file, line, message }`. */
export function parsePsqlErrors(stderr) {
  const failures = []
  for (const line of stderr.split('\n')) {
    const match = PSQL_ERROR.exec(line.trim())
    if (match) failures.push({ file: match[1], line: Number(match[2]), message: match[3] })
  }
  return failures
}

/**
 * Is this failure a consequence of an earlier one rather than a finding?
 *
 * A seed loads in dependency order. When the statement that inserts a path
 * fails, every lane on that path fails its foreign key and every cell in those
 * lanes fails the core's own row-validation trigger — which raises `cells: …`
 * rather than a constraint name. A seed that wraps its load in one transaction
 * adds a third shape: once any statement fails, Postgres refuses the rest of
 * the block outright. Those three are the whole knock-on surface, and
 * separating them is what keeps the one real cause visible.
 */
export function isDownstream(message) {
  return (
    /violates foreign key constraint/.test(message) ||
    /^cells[.:]/.test(message) ||
    /current transaction is aborted/.test(message)
  )
}

/** Failures collapsed to distinct reasons, root causes first, commonest first. */
export function groupFailures(failures) {
  const byMessage = new Map()
  for (const failure of failures) {
    const group = byMessage.get(failure.message) ?? {
      message: failure.message,
      downstream: isDownstream(failure.message),
      count: 0,
      examples: [],
    }
    group.count += 1
    if (group.examples.length < 3) group.examples.push(`${failure.file}:${failure.line}`)
    byMessage.set(failure.message, group)
  }
  return [...byMessage.values()].sort(
    (a, b) => Number(a.downstream) - Number(b.downstream) || b.count - a.count,
  )
}

// ── Reading the loaded content back, as the deployed key ───────────────────

/** Tables a seed inserts into, in first-mention order. */
export function seededTables(sql) {
  const tables = []
  for (const match of sql.matchAll(/insert\s+into\s+public\.([a-z_][a-z0-9_]*)/gi)) {
    const table = match[1].toLowerCase()
    if (!tables.includes(table)) tables.push(table)
  }
  return tables
}

/** The single `label|count` query, run as `anon`. */
export function buildInventorySql(tables) {
  const rows = [
    ...tables.map((t) => `select '${t}'::text as t, count(*)::bigint as n from public.${t}`),
    ...Object.entries(DEPLOYMENT_RENDER_READS).map(
      ([label, sql]) => `select '${label}', n from (${sql}) as ${label.slice(1)}(n)`,
    ),
  ]
  return `set role anon;\n${rows.join('\nunion all\n')}\norder by t;`
}

/** What is empty that the deployment's seed populated. */
export function evaluate(counts, tables) {
  const problems = []
  for (const table of tables) {
    const n = counts.get(table)
    if (n === undefined) {
      problems.push(`public.${table} returned no row — the anon read never reached it`)
    } else if (n === 0) {
      problems.push(
        `public.${table} is empty as anon — the deployment's seed writes it, but the ` +
          `deployed key cannot see a row of it`,
      )
    }
  }
  for (const label of Object.keys(DEPLOYMENT_RENDER_READS)) {
    const n = counts.get(label)
    if (!n) {
      const what = RENDER_READ_NAMES[label] ?? label
      problems.push(
        `${what} (${label}) returned no rows — the deployment's content loaded but does not render`,
      )
    }
  }
  return problems
}

// ── Running it ─────────────────────────────────────────────────────────────

const DB = process.env.DEPLOYMENT_SEED_DB ?? 'deployment_seed_check'

function run(bin, args, extraEnv = {}) {
  return spawnSync(bin, args, {
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
    maxBuffer: 64 * 1024 * 1024,
  })
}

function psql(args, { stopOnError = true } = {}) {
  return run('psql', ['-X', '-q', '-v', `ON_ERROR_STOP=${stopOnError ? 1 : 0}`, '-d', DB, ...args], {
    PGOPTIONS: '--client-min-messages=warning',
  })
}

/** `--seed <path>` from argv, or null. */
export function seedFlag(argv) {
  const at = argv.indexOf('--seed')
  if (at === -1) return null
  const value = argv[at + 1]
  if (value === undefined || value.startsWith('--')) {
    throw new Error('--seed needs a path')
  }
  return value
}

function skip(reason) {
  console.log(
    `skipped: ${reason}.\n` +
      `  This check loads a DEPLOYMENT's seed onto this template's core, so it needs a\n` +
      `  deployment checkout. Point it at one with --seed <path-to-supabase/seed.sql>\n` +
      `  or DEPLOYMENT_SEED=<path>. CI checks out one repository and so always skips —\n` +
      `  run it locally before a release. See docs/engineering/checks.md § The database.`,
  )
}

function main(argv = process.argv.slice(2)) {
  const named = seedFlag(argv) ?? process.env.DEPLOYMENT_SEED ?? null
  let seedPath
  if (named) {
    seedPath = resolve(named)
    if (!existsSync(seedPath)) {
      console.error(`no seed at ${seedPath}`)
      process.exitCode = 1
      return
    }
  } else {
    const chosen = chooseDeployment(siblingCandidates(ROOT), packageName(ROOT))
    if (chosen.skip) {
      skip(chosen.skip)
      return
    }
    seedPath = join(chosen.dir, 'supabase', 'seed.sql')
  }

  const files = resolveSeedFiles(seedPath)
  if (files.length === 0) {
    console.error(`the seed at ${seedPath} resolves to no files`)
    process.exitCode = 1
    return
  }
  // `supabase/seed.sql` → the checkout that holds it, so every path in the
  // report reads the way the deployment's own tree does.
  const deploymentRoot = dirname(dirname(resolve(seedPath)))
  const show = (file) => relative(deploymentRoot, file)

  run('dropdb', ['--if-exists', DB])
  const created = run('createdb', [DB])
  if (created.status !== 0) {
    console.error(`could not create the scratch database ${DB}:\n${created.stderr?.trim() ?? ''}`)
    process.exitCode = 1
    return
  }
  try {
    for (const file of CORE_STACK) {
      const applied = psql(['-f', P(file)])
      if (applied.status !== 0) {
        console.error(`this template's own stack did not apply — ${file}:\n`)
        console.error(applied.stderr?.trim() ?? '')
        console.error('\nThat is `npm run check:seed-load`\'s failure, not this one. Run it first.')
        process.exitCode = 1
        return
      }
    }

    const failures = []
    for (const file of files) {
      const loaded = psql(['-f', file], { stopOnError: false })
      failures.push(...parsePsqlErrors(loaded.stderr ?? ''))
    }

    if (failures.length > 0) {
      const groups = groupFailures(failures)
      const causes = groups.filter((g) => !g.downstream)
      const knockOn = groups.filter((g) => g.downstream)
      const touched = new Set(failures.map((f) => f.file))
      console.error(
        `The deployment's seed does not load onto this template's portable core: ` +
          `${failures.length} statements failed across ${touched.size} of ${files.length} seed files.\n`,
      )
      console.error(`Root causes (${causes.length} distinct):\n`)
      for (const g of causes) {
        console.error(`  ${g.count}x  ${g.message}`)
        console.error(`        ${g.examples.map((e) => show(e)).join(', ')}`)
      }
      if (knockOn.length > 0) {
        console.error(
          `\nKnock-on (${knockOn.length} distinct) — rows an earlier failure never inserted:\n`,
        )
        for (const g of knockOn) {
          console.error(`  ${g.count}x  ${g.message}`)
          console.error(`        ${g.examples.map((e) => show(e)).join(', ')}`)
        }
      }
      console.error(
        `\nEach root cause is one of two things, and the message says which:\n` +
          `  - a name or column the core does NOT carry, that the deployment needs —\n` +
          `    a gap in the portable core, and the reconciliation ticket's content;\n` +
          `  - a name the core carries under its CURRENT spelling, which the seed still\n` +
          `    writes under a retired one — the seed is behind, not the core.\n` +
          `Compare each against supabase/generated/portable-core.schema.sql before\n` +
          `deciding which. Reproduce by hand with:\n` +
          `  createdb scratch\n` +
          CORE_STACK.map((f) => `  psql -v ON_ERROR_STOP=1 -d scratch -f ${f}`).join('\n') +
          `\n  psql -d scratch -f ${show(files[0])}   # then the rest, in order`,
      )
      process.exitCode = 1
      return
    }

    const tables = seededTables(files.map((file) => readFileSync(file, 'utf8')).join('\n'))
    const inventory = psql(['-At', '-F', '|', '-c', buildInventorySql(tables)])
    if (inventory.status !== 0) {
      console.error("The deployment's seed applied, but the anon read was refused:\n")
      console.error(inventory.stderr?.trim() ?? '')
      process.exitCode = 1
      return
    }
    const problems = evaluate(parseCounts(inventory.stdout ?? ''), tables)
    if (problems.length > 0) {
      console.error("The deployment's seed loaded, but a keyless read does not see the content:\n")
      for (const problem of problems) console.error(`  ${problem}`)
      console.error(
        '\nThis is the deployed app reading with the anon key. A table it cannot see ' +
          'renders blank in the browser. Expose it to anon in the recipe (a migration ' +
          '`grant select … to anon`).',
      )
      process.exitCode = 1
      return
    }
    console.log(
      `the deployment's seed (${files.length} file(s) under ${basename(deploymentRoot)}/) ` +
        `loads on a fresh core + recipe and renders as anon ` +
        `(${tables.length} tables populated, ` +
        `${Object.keys(DEPLOYMENT_RENDER_READS).length} render reads return rows)`,
    )
  } finally {
    run('dropdb', ['--if-exists', DB])
  }
}

// Same shape as scripts/check-seed-loads.mjs: comparing against a hand-built
// `file://` URL silently no-ops whenever the path needs escaping.
const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) main()
