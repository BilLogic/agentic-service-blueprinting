/**
 * Where a deployment's seed is, and which files it is: one home for the two
 * questions the sibling-checkout seed check and the sweep's deployment-seed
 * subject both ask.
 *
 * Locating: which checkout beside this one is a deployment of this template —
 * exactly one that ships a seed and is not another checkout of this package;
 * "none" and "several" both mean nothing to run against, and say which.
 *
 * Listing: what that deployment loads, in the order it loads it. A deployment
 * states its seed in `supabase/config.toml` as an ordered list under
 * `[db.seed]`; when the config is absent or states no such section, the one
 * named file is the seed. The reasons an entry that resolves to nothing, or a
 * section a deployment has emptied on purpose, stop a caller rather than
 * being passed over are stated beside the two messages below — they were
 * learned at the cost of a check that read a twenty-third of a seed and
 * reported the rest as a grant that was already there.
 *
 * Dependency-free, so a shared script and the sweep can both import it.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

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
export const RESOLVES_TO_NOTHING =
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
