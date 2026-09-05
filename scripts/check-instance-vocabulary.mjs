#!/usr/bin/env node
/**
 * Does this template still say a word the instance retired?
 *
 * plus-uno-blueprint is an instance built on this template, and it records
 * every rename it ships in `scripts/retired-vocabulary.mjs` — table, column,
 * value, with the migration that did it. #94 measured this template against
 * that list by hand and found fifteen. This is that measurement, run on every
 * build, so the next rename in the instance shows up here as a failing check
 * and not as a discovery six weeks later.
 *
 * The subject is `portable-core.schema.sql` — what a backend holds after the
 * series, with only the names it holds them under — so a name the instance
 * retired counts only when it is LIVE here: a table, a column, a value a
 * CHECK still accepts. The instance's map is read from the sibling checkout
 * when there is one (`../plus-uno-blueprint`), otherwise from GitHub; the
 * file has no imports, which is what makes it loadable from either.
 *
 * Divergence is not always drift. A rename the instance made for a feature
 * this template has not ported yet is listed in `ACCEPTED_DIVERGENCES` with
 * the issue that will remove it, and the check says so rather than failing.
 * An entry that no longer matches anything is itself a failure: the port
 * landed, so the exemption should go.
 *
 *   npm run check:instance-vocabulary
 *   INSTANCE_RENAME_MAP=<path or URL> npm run check:instance-vocabulary
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
export const SCHEMA = resolve(ROOT, 'supabase/generated/portable-core.schema.sql')
const SIBLING = resolve(ROOT, '../plus-uno-blueprint/scripts/retired-vocabulary.mjs')
const RAW = 'https://raw.githubusercontent.com/BilLogic/plus-uno-blueprint/main/scripts/retired-vocabulary.mjs'

/**
 * Renames the instance shipped that this template keeps on purpose, for now.
 * `was` is the instance's spelling of the retired name; `until` is the issue
 * whose landing removes the entry.
 */
export const ACCEPTED_DIVERGENCES = []

/* ------------------------------------------------------------ the schema */

/**
 * What the dump holds: tables, `table.column` pairs, and the value list each
 * single-column CHECK accepts, keyed the same way.
 */
export function schemaInventory(dump) {
  const tables = new Set()
  const columns = new Set()
  const values = new Map()
  // A column typed by a domain carries the domain's set, not a CHECK of its
  // own: `status public.entity_status` says everything a CHECK would. Noted
  // here and resolved once the domains below have been read.
  const typed = new Map()
  const body = dump.replace(/^--.*$/gm, '')
  for (const m of body.matchAll(/CREATE TABLE public\.(\w+) \(\n([\s\S]*?)\n\);/g)) {
    tables.add(m[1])
    for (const line of m[2].split('\n')) {
      // `"?` because pg_dump quotes a column whose name is a reserved word,
      // and nine tables here have a `"position"`. Without it the inventory
      // silently lacked every one of them.
      const col = /^\s{4}"?(\w+)"?\s/.exec(line)
      if (col && !/^(CONSTRAINT)$/.test(col[1])) columns.add(`${m[1]}.${col[1]}`)
      const inline = /^\s{4}\w+\s.*CHECK \(\(?(?:\(\w+ IS NULL\) OR \()?\(?(\w+) = ANY \(ARRAY\[([^\]]*)\]\)/.exec(line)
      if (inline) values.set(`${m[1]}.${inline[1]}`, valueList(inline[2]))
      const viaDomain = /^\s{4}"?(\w+)"? public\.(\w+)\b/.exec(line)
      if (viaDomain) typed.set(`${m[1]}.${viaDomain[1]}`, viaDomain[2])
    }
  }
  const CHECK =
    /ALTER TABLE(?: ONLY)? public\.(\w+)\n\s+ADD CONSTRAINT \w+ CHECK \(\(?(?:\((\w+) IS NULL\) OR \()?\(?(\w+) = ANY \(ARRAY\[([^\]]*)\]\)/g
  for (const m of body.matchAll(CHECK)) values.set(`${m[1]}.${m[3]}`, valueList(m[4]))
  for (const m of body.matchAll(/CREATE DOMAIN public\.(\w+) AS \w+\n\s+CONSTRAINT \w+ CHECK \(\(VALUE = ANY \(ARRAY\[([^\]]*)\]\)/g)) {
    values.set(`domain ${m[1]}`, valueList(m[2]))
  }
  for (const [key, domain] of typed) {
    const set = values.get(`domain ${domain}`)
    if (set && !values.has(key)) values.set(key, set)
  }
  return { tables, columns, values, typed }
}

const valueList = (list) => new Set([...list.matchAll(/'((?:[^']|'')*)'/g)].map((v) => v[1].replaceAll("''", "'")))

/* ---------------------------------------------------------- the findings */

const VALUE = /^(\w+)\.(\w+) = '([^']+)'$/
const GLOB = /^\*_(\w+)$/
const QUALIFIED = /^(\w+)\.(\w+)$/

/** Every `was` of the instance's map that is still live in this inventory. */
export function trailingNames(map, inventory, accepted = ACCEPTED_DIVERGENCES) {
  const findings = []
  const used = new Set()
  for (const row of map) {
    if (row.migrations.length === 0) continue // a label rename is copy, not schema
    row.was.forEach((was, index) => {
      const is = row.is[index] ?? row.is[0]
      const hit = liveAs(was, inventory)
      if (!hit) return
      const exemption = accepted.find((entry) => entry.was === was)
      if (exemption) {
        used.add(was)
        return
      }
      findings.push({ was, is, migration: row.migrations.at(-1), hit })
    })
  }
  const stale = accepted.filter((entry) => !used.has(entry.was))
  return { findings, stale }
}

/** How a retired spelling is still live here, or null. */
function liveAs(was, { tables, columns, values }) {
  const value = VALUE.exec(was)
  if (value) {
    const set = values.get(`${value[1]}.${value[2]}`)
    return set?.has(value[3]) ? `the CHECK on ${value[1]}.${value[2]} still accepts '${value[3]}'` : null
  }
  const glob = GLOB.exec(was)
  if (glob) {
    // `*_service_scenario_id` is the suffix itself and every prefixed form.
    const match = [...columns].find((column) => {
      const name = column.split('.')[1]
      return name === glob[1] || name.endsWith(`_${glob[1]}`)
    })
    return match ? `column ${match}` : null
  }
  const qualified = QUALIFIED.exec(was)
  if (qualified) return columns.has(was) ? `column ${was}` : null
  if (tables.has(was)) return `table ${was}`
  const column = [...columns].find((c) => c.endsWith(`.${was}`))
  if (column) return `column ${column}`
  for (const [key, set] of values) if (set.has(was)) return `a value ${key} still accepts`
  return null
}

/* ------------------------------------------------------------- the map */

export async function loadInstanceRenameMap(source = process.env.INSTANCE_RENAME_MAP) {
  const from = source ?? (existsSync(SIBLING) ? SIBLING : RAW)
  let file = from
  if (/^https?:\/\//.test(from)) {
    const response = await fetch(from, { signal: AbortSignal.timeout(30_000) })
    if (!response.ok) throw new Error(`could not fetch the instance's rename map: HTTP ${response.status} from ${from}`)
    file = join(tmpdir(), `instance-retired-vocabulary-${process.pid}.mjs`)
    writeFileSync(file, await response.text())
  }
  const module = await import(pathToFileURL(file).href)
  if (!Array.isArray(module.RENAME_MAP)) throw new Error(`${from} exports no RENAME_MAP`)
  return { map: module.RENAME_MAP, from }
}

async function main() {
  const { map, from } = await loadInstanceRenameMap()
  const inventory = schemaInventory(readFileSync(SCHEMA, 'utf8'))
  const { findings, stale } = trailingNames(map, inventory)
  console.log(
    `${map.length} instance rename(s) from ${from.startsWith('http') ? 'GitHub' : 'the sibling checkout'}, ` +
      `against ${inventory.tables.size} tables / ${inventory.columns.size} columns / ${inventory.values.size} value lists`,
  )
  for (const f of findings) {
    console.error(
      `::error::instance vocabulary — \`${f.was}\` is still ${f.hit}; the instance renamed it to ` +
        `\`${f.is}\` in ${f.migration}. Port the rename, or list it in ACCEPTED_DIVERGENCES with the issue that will.`,
    )
  }
  for (const s of stale) {
    console.error(
      `::error::instance vocabulary — ACCEPTED_DIVERGENCES still lists \`${s.was}\` (until ${s.until}) ` +
        `but nothing here matches it any more. The port landed; remove the entry.`,
    )
  }
  const accepted = ACCEPTED_DIVERGENCES.filter((entry) => !stale.includes(entry))
  for (const a of accepted) console.log(`accepted until ${a.until}: \`${a.was}\` — ${a.because}`)
  if (findings.length + stale.length > 0) process.exitCode = 1
  else console.log('ok — every name the instance retired is retired here too, or accepted with an issue')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`::error::instance vocabulary: ${error.message}`)
    process.exitCode = 1
  })
}
