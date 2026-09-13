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
 * located. With no `[db.seed]` section at all, the named file is the whole seed.
 *
 * A section that is there but DISABLED or EMPTY is neither of those, and is the
 * third case this check used to collapse into the second: a deployment that has
 * taken its seed list out of the CLI's reach on purpose. It refuses — see
 * `SEED_LIST_IS_ELSEWHERE` — and the way to run it against such a deployment is
 * to name the files, `--seed a.sql --seed b.sql` or `--seed a.sql,b.sql`, in
 * load order. Named files win over everything, including that refusal.
 *
 * An entry in that list with no file behind it stops the check rather than
 * being passed over, and the text of the files is read before a database is
 * created rather than after the whole apply. Both for the same reason: what
 * this check reports is a claim about a named set of files.
 *
 * Needs a reachable Postgres 17 and permission to create a database, exactly
 * like its sibling.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RENDER_READS, RENDER_READ_NAMES, STACK, parseCounts } from './check-seed-loads.mjs'
import { unverified } from './unverified.mjs'

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
 * Why a `[db.seed]` entry that resolves to nothing stops the check.
 *
 * This is the one thing the surrounding script is built to keep visible. A seed
 * loads in dependency order, so a file that never ran takes every row that
 * depended on it with it: the foreign keys fail, the core's row validation
 * raises, and `isDownstream` correctly files all of it under knock-on. The one
 * line that would explain the pile is the file that was never loaded — and if
 * it was dropped quietly, that line is nowhere in the output at all. The check
 * would be reading a seed the deployment does not have, and saying so in a
 * sentence that counts the files it managed to read.
 */
const RESOLVES_TO_NOTHING =
  'This check loads what the deployment loads, in the order the deployment loads it, ' +
  'and its result is a claim about that set. Passing over one of those files would ' +
  'load the rest out of dependency order, report every row that then failed as ' +
  'knock-on, and leave the one thing that explains them — a file that never ran — out ' +
  'of the report entirely. Ship the file, or take its entry out of sql_paths.'

/**
 * Why a `[db.seed]` a deployment has emptied stops the check rather than
 * falling back to the one file it was pointed at.
 *
 * A section that is `enabled = false`, or whose `sql_paths` is empty, is not a
 * broken config and not an absent one. It is a deployment that has deliberately
 * taken its seed list out of the CLI's reach: four `supabase` subcommands read
 * that table and only one of them has the word "reset" in its name, so
 * `db push --include-seed` — whose `--linked` is the default — would load a
 * whole seed, deletes and upserts included, into a live project. A deployment
 * that has noticed empties the table, disables it, and moves the list into a
 * loader of its own.
 *
 * The list then lives in a file of that deployment's choosing, under a name
 * this package has no business knowing. So the honest answer is that the seed
 * cannot be resolved from here — NOT that it is the single file this check
 * happened to be pointed at. Falling back cost exactly what
 * `RESOLVES_TO_NOTHING` describes, at the scale of twenty-two files instead of
 * one: the check read a twenty-third of a deployment's content, found the
 * tables the rest fill empty, and reported that as the anon role being unable
 * to read them — naming the wrong subsystem and prescribing a grant that was
 * already in the recipe.
 */
const SEED_LIST_IS_ELSEWHERE =
  'states a [db.seed] section that is disabled or empty, so this deployment loads its ' +
  'seed from somewhere this check cannot read — which is a deliberate thing to do, ' +
  'because `supabase db push --include-seed` reads that table and defaults to --linked. ' +
  'The seed therefore cannot be resolved from the config. Name the files instead, in ' +
  'load order: --seed <a.sql> --seed <b.sql>, or --seed <a.sql,b.sql>. Passing the one ' +
  'file this check was pointed at would load a fraction of the seed and report every ' +
  'table the rest fill as one the deployed key cannot see.'

/**
 * One `[db.seed]` entry as an absolute path — or a failure naming what is there
 * instead.
 *
 * `statSync` is the only call that can answer this, and it answers both halves
 * at once: whether the path is there, and whether it is a file. An `existsSync`
 * in front of it asks the first half a second time and believes the older
 * answer, which buys nothing — if the path can go it can go between the two
 * calls, and if it cannot the question was already settled.
 *
 * Absence is NOT tolerated here, and neither population makes it normal. A
 * literal entry is the deployment stating outright that it loads that file. A
 * pattern's matches came out of a directory listing taken microseconds earlier,
 * in a check that creates its own database and touches nothing else — so a path
 * that has gone by the time this runs is news either way. See
 * `RESOLVES_TO_NOTHING` for what tolerating it would cost.
 */
function seedFile(dir, rel, config) {
  const file = join(dir, rel)
  let stats
  try {
    stats = statSync(file)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    throw new Error(
      `${config} loads ${rel} under [db.seed], and ${file} is not there.\n${RESOLVES_TO_NOTHING}`,
      { cause: error },
    )
  }
  if (!stats.isFile()) {
    throw new Error(
      `${config} loads ${rel} under [db.seed], and ${file} is not a file.\n${RESOLVES_TO_NOTHING}`,
    )
  }
  return file
}

/**
 * Every file the deployment loads, absolute, in order. When a `config.toml`
 * sits beside the named seed and states a `[db.seed]` list, that list is the
 * seed; otherwise the named file is.
 *
 * Every entry that list resolves to has to be a file that is there — see
 * `seedFile`.
 */
export function resolveSeedFiles(seedPath) {
  const dir = dirname(resolve(seedPath))
  const config = join(dir, 'config.toml')
  if (!existsSync(config)) return [resolve(seedPath)]
  const section = seedSectionFromConfig(readFileSync(config, 'utf8'))
  if (!section) return [resolve(seedPath)]
  if (!section.enabled || section.sqlPaths.length === 0) {
    throw new Error(`${config}\n${SEED_LIST_IS_ELSEWHERE}`)
  }
  const list = (sub) => {
    try {
      return readdirSync(join(dir, sub))
    } catch {
      return []
    }
  }
  return expandSeedEntries(section.sqlPaths, list).map((rel) => seedFile(dir, rel, config))
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
 * Did psql fail to RUN a seed file at all, rather than report the statements in
 * it?
 *
 * The apply half runs with the stop switch off on purpose, so a file whose
 * every statement fails still exits 0 and hands back the whole list. A non-zero
 * status therefore means psql itself gave up before or outside that — and the
 * reachable way for that to happen here is a path that stopped being there,
 * since a scratch database that was just created sits between the listing and
 * this moment. Left unread, that status is the quiet version of the same
 * defect: nothing loads, nothing is reported, and the run goes on to grade a
 * seed that never arrived.
 *
 * Collected failures win, because a seed that sets `ON_ERROR_STOP` in its own
 * text exits non-zero with real findings attached, and those findings are the
 * deliverable.
 */
export function fileNeverRan(status, failures) {
  return status !== 0 && failures.length === 0
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

/**
 * The text of every seed file, joined — read BEFORE anything is applied.
 *
 * This read used to sit at the far end of the run: after the scratch database
 * was made, after four core files went into it, and after one `psql -f` per
 * seed file. Every other listing-then-read in this repository closes in
 * microseconds; this one was held open across a multi-second subprocess, which
 * made it the longest such window in the tree and the only one wide enough for
 * an unrelated process to walk through.
 *
 * Nothing in the read needs the apply — it only wants the text, to learn which
 * tables the seed writes. So it happens here, a moment after the listing that
 * produced these paths, where the window is a few microseconds and where a path
 * that has gone costs nothing that has already been done.
 *
 * A file that is not there is not skipped. The check's whole output is a claim
 * about a named set of files, and a set it quietly shrank is a green that
 * measured something else. This throws, and the reason stays legible in what it
 * throws: `ENOENT` for a path that has gone, something else for a path that
 * cannot be read — the same two cases `scripts/read-listed.mjs` keeps apart for
 * the listings that ARE deliberately stale. Neither is tolerable here, so
 * neither is caught.
 */
export function readSeedFiles(files) {
  return files.map((file) => readFileSync(file, 'utf8')).join('\n')
}

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
export function seedFlags(argv) {
  const paths = []
  for (let at = 0; at < argv.length; at += 1) {
    if (argv[at] !== '--seed') continue
    const value = argv[at + 1]
    if (value === undefined || value.startsWith('--')) {
      throw new Error('--seed needs a path')
    }
    // Repeated and comma-separated both, because a deployment whose seed is
    // twenty-three files has to be able to name them without twenty-three
    // flags, and a caller assembling the list from a loop wants the flag.
    for (const part of value.split(',')) {
      const path = part.trim()
      if (path !== '') paths.push(path)
    }
    at += 1
  }
  return paths
}

/**
 * Named seed files, absolute and in the order given — the operator's answer to
 * the question a config with no list cannot answer.
 *
 * Held to the same rule as an entry in a `[db.seed]` list: every one has to be
 * a file that is there. A name with nothing behind it is the failure
 * `RESOLVES_TO_NOTHING` describes, and typing it by hand makes it likelier,
 * not less.
 */
export function resolveNamedSeeds(paths) {
  return paths.map((path) => {
    const file = resolve(path)
    let stats
    try {
      stats = statSync(file)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      throw new Error(`--seed names ${file}, and it is not there.\n${RESOLVES_TO_NOTHING}`, {
        cause: error,
      })
    }
    if (!stats.isFile()) {
      throw new Error(`--seed names ${file}, and it is not a file.\n${RESOLVES_TO_NOTHING}`)
    }
    return file
  })
}

function skip(reason) {
  // The skip is correct — one checkout genuinely has no deployment to load —
  // and it was invisible, which is the half that is not. A run that loaded a
  // deployment's seed onto this core and a run that loaded nothing at all
  // both ended in a green exit and a log line.
  unverified(
    "a deployment's seed against this core",
    `${reason}, so nothing was loaded: not that the portable core accepts a real ` +
      `deployment's content, and not that the app's role can read it back. Point this ` +
      `at a deployment checkout with --seed <path> or DEPLOYMENT_SEED=<path>.`,
  )
  console.log(
    `skipped: ${reason}.\n` +
      `  This check loads a DEPLOYMENT's seed onto this template's core, so it needs a\n` +
      `  deployment checkout. Point it at one with --seed <path-to-supabase/seed.sql>\n` +
      `  or DEPLOYMENT_SEED=<path>. CI checks out one repository and so always skips —\n` +
      `  run it locally before a release. See docs/engineering/checks.md § The database.`,
  )
}

function main(argv = process.argv.slice(2)) {
  const fromEnv = process.env.DEPLOYMENT_SEED
    ? process.env.DEPLOYMENT_SEED.split(',').map((part) => part.trim()).filter(Boolean)
    : []
  const named = [...seedFlags(argv), ...fromEnv]
  let seedPath
  let files
  // Every way of resolving the seed refuses by throwing, and each of those
  // refusals is written for the person who ran the command. A stack trace
  // buries the sentence that tells them what to pass — so the message is the
  // output, and the exit code carries the failure.
  const refuse = (error) => {
    console.error(error.message)
    process.exitCode = 1
  }
  if (named.length > 1) {
    // Several files named outright: the operator has answered what the config
    // could not, so nothing else is consulted. This is the ONLY way to run the
    // check against a deployment that loads its seed from its own loader.
    try {
      files = resolveNamedSeeds(named)
    } catch (error) {
      return refuse(error)
    }
    seedPath = files[0]
  } else {
    if (named.length === 1) {
      seedPath = resolve(named[0])
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
    try {
      files = resolveSeedFiles(seedPath)
    } catch (error) {
      return refuse(error)
    }
  }
  if (files.length === 0) {
    console.error(`the seed at ${seedPath} resolves to no files`)
    process.exitCode = 1
    return
  }
  // `supabase/seed.sql` → the checkout that holds it, so every path in the
  // report reads the way the deployment's own tree does.
  const deploymentRoot = dirname(dirname(resolve(seedPath)))
  const show = (file) => relative(deploymentRoot, file)
  // Here, next to the listing, rather than after the apply — see readSeedFiles.
  const seedSql = readSeedFiles(files)

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
      const reported = parsePsqlErrors(loaded.stderr ?? '')
      if (fileNeverRan(loaded.status, reported)) {
        console.error(`psql could not run ${show(file)}:\n`)
        console.error(loaded.stderr?.trim() ?? '')
        console.error(
          '\nNothing in that file reached the database, so everything after it would be ' +
            'grading a seed the deployment does not load.',
        )
        process.exitCode = 1
        return
      }
      failures.push(...reported)
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

    const tables = seededTables(seedSql)
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
