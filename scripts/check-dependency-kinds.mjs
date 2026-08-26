#!/usr/bin/env node
/**
 * The dependency vocabulary the documents teach, against the one the database
 * enforces.
 *
 * `references/data-model.md` called the two `cell_dependencies.kind` values
 * `leads_to` and `enables`. The column has never accepted either. An agent
 * that trusted the normative reference — which is what normative means —
 * wrote a value the CHECK constraint refused, and five more reference docs
 * repeated the same two words downstream.
 *
 * So two assertions, mirroring check-read-surface.mjs:
 *
 *   1. THE ENUM. `references/data-model.md`'s Enums section states the values;
 *      the schema's CHECK constraint states the values; they must be the same
 *      set, in both directions.
 *
 *   2. THE RETIRED SPELLING. The wrong words had spread into slice, audit and
 *      whatif references, where no enum row exists to compare against. So no
 *      rulebook document may contain them at all. `enables` is an ordinary
 *      English verb, so only its code-span form (`` `enables` ``) counts;
 *      `leads_to` is not English and counts anywhere.
 *
 * SOURCE OF TRUTH: `supabase/generated/portable-core.generated.sql`, not the
 * migrations directly. It is generated FROM the migrations, and CI runs
 * `npm run check:portable-core` — which regenerates and diffs it — before it
 * runs this, so the two cannot disagree without that check failing first.
 * What it buys is a single flat file instead of a replay: reading the
 * constraint out of the migrations means ordering 20-odd files and tracking
 * drop/re-add across a table rename, and a check that reimplements migration
 * replay is a check with its own bugs. The parse below insists on exactly one
 * definition, so a future migration that redefines the constraint fails here
 * loudly rather than being read stale.
 *
 *   node scripts/check-dependency-kinds.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

const SCHEMA = 'supabase/generated/portable-core.generated.sql'
const DATA_MODEL = 'references/data-model.md'

/** The rulebook trees the canvas agent and the IDE skills both read. */
const RULEBOOK = ['references', 'skills']

/** Retired kind words, and what the database calls them instead. */
const RETIRED = [
  [/\bleads_to\b/g, 'leads_to', 'trigger'],
  [/`enables`/g, '`enables`', '`needs`'],
]

/**
 * The values `cell_dependencies.kind` accepts.
 *
 * The constraint is still named for the table's old name — the rename
 * migration says so on purpose — so match either.
 */
export function enforcedKinds(sql) {
  const pattern =
    /constraint (?:cell_triggers|cell_dependencies)_kind_check check \(kind in \(([^)]*)\)\)/g
  const found = [...sql.matchAll(pattern)]
  if (found.length !== 1) {
    throw new Error(
      `expected exactly one cell-dependency kind constraint in ${SCHEMA}, found ${found.length}`,
    )
  }
  return [...found[0][1].matchAll(/'([a-z_]+)'/g)].map(([, value]) => value)
}

/** The values the Enums section states for `cell_dependencies.kind`. */
export function documentedKinds(markdown) {
  const row = markdown
    .split('\n')
    .find((line) => line.startsWith('- `cell_dependencies.kind`:'))
  if (!row) throw new Error(`no cell_dependencies.kind enum row found in ${DATA_MODEL}`)
  const list = row.slice(row.indexOf(':') + 1).split('.')[0]
  return [...list.matchAll(/`([a-z_]+)`/g)].map(([, value]) => value)
}

/** Values on one side and not the other. */
export function differences(documented, enforced) {
  const stated = new Set(documented)
  const real = new Set(enforced)
  return {
    undocumented: enforced.filter((value) => !stated.has(value)),
    unknown: documented.filter((value) => !real.has(value)),
  }
}

/** Every rulebook markdown file, repo-relative. */
function rulebookFiles(root) {
  const out = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (entry.endsWith('.md')) out.push(relative(root, full))
    }
  }
  for (const tree of RULEBOOK) walk(join(root, tree))
  return out
}

/** `{ file, line, found, instead }` for every retired word still in the rulebook. */
export function retiredMentions(files, read) {
  const hits = []
  for (const file of files) {
    read(file)
      .split('\n')
      .forEach((text, index) => {
        for (const [pattern, found, instead] of RETIRED) {
          pattern.lastIndex = 0
          if (pattern.test(text)) hits.push({ file, line: index + 1, found, instead })
        }
      })
  }
  return hits
}

export function compare(root = REPO_ROOT) {
  const read = (path) => readFileSync(join(root, path), 'utf8')
  return {
    ...differences(documentedKinds(read(DATA_MODEL)), enforcedKinds(read(SCHEMA))),
    retired: retiredMentions(rulebookFiles(root), read),
  }
}

function main() {
  const { undocumented, unknown, retired } = compare()
  if (undocumented.length + unknown.length + retired.length === 0) {
    console.log(
      `${DATA_MODEL} states the kind vocabulary the constraint enforces, and no` +
        ` rulebook document contradicts it`,
    )
    return
  }
  for (const value of undocumented) {
    console.error(`the constraint accepts kind '${value}', which ${DATA_MODEL} does not state`)
  }
  for (const value of unknown) {
    console.error(`${DATA_MODEL} states kind '${value}', which the constraint refuses`)
  }
  for (const { file, line, found, instead } of retired) {
    console.error(`${file}:${line} says ${found}; the database calls it ${instead}`)
  }
  console.error(
    `\nThe enforced vocabulary wins — a documented value the CHECK constraint` +
      ` refuses is an agent writing a call that cannot land. Fix the documents.`,
  )
  process.exit(1)
}

// Same shape as scripts/check-write-surface.mjs: comparing against a
// hand-built `file://` URL silently no-ops whenever the path needs escaping.
const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) main()
