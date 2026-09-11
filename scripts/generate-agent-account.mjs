#!/usr/bin/env node
/**
 * Render the generated sections of docs/agents/blueprint.md and hold the
 * document to its sources.
 *
 *   npm run agent-account              rewrite the generated sections
 *   npm run agent-account -- --record  …and record the ratchet baseline
 *   npm run check:agent-account        fail if the sections or the ratchet
 *                                      have drifted
 *
 * The schema section comes from `public.schema_comments()` on a LIVE
 * database under the anon key, because pg_description is the source and
 * PostgREST exposes the catalog to no role except through that function.
 * Which relations an agent can read is probed the same way: a bare select
 * as anon.
 *
 * With no database configured this writes nothing, registers nothing, and
 * exits 0 — the template's bundled sample is the no-database path, and a
 * check that always skipped would read as an answer. Same stance as
 * `check:target`. A deployment that has a database runs this against it and
 * registers the generated account through `registerReferenceDocs` or
 * `REFERENCE_NAMES_EXTRA`; the template's reference loader never imports that
 * file by path.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluate, entityKinds, tableColumns } from './agent-account.mjs'
import { parseEnvFile } from './check-target-schema.mjs'

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname)
const DOC = resolve(REPO_ROOT, 'docs/agents/blueprint.md')
const BASELINE = resolve(REPO_ROOT, 'docs/reference/agent-account-baseline.json')
const PANEL_TERMS = resolve(REPO_ROOT, 'src/lib/panelTerms.ts')
const DATABASE_TS = resolve(REPO_ROOT, 'src/types/database.ts')

const PLACEHOLDER_KEY = 'your-anon-key'
const PLACEHOLDER_URL = 'YOUR_PROJECT'
const TIMEOUT_MS = 15_000

/**
 * The live database, or `null` when this checkout has none configured.
 *
 * Missing variables, the example-file placeholder key, and a URL that
 * still names `YOUR_PROJECT` are all the no-database path: the app runs
 * its bundled sample, and this generator has nothing to read comments from.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @param {Record<string, string>} [dotenv]
 * @returns {{ url: string, key: string } | null}
 */
export function credentials(env = process.env, dotenv = {}) {
  const url = env.VITE_SUPABASE_URL ?? dotenv.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY ?? dotenv.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  if (key === PLACEHOLDER_KEY) return null
  if (url.includes(PLACEHOLDER_URL)) return null
  return { url: url.replace(/\/$/, ''), key }
}

/**
 * One PostgREST call as the anon key.
 *
 * @param {string} url
 * @param {string} key
 * @param {string} path
 * @param {RequestInit} [init]
 */
export async function rest(url, key, path, init = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  const text = await response.text()
  let body = null
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: response.status, ok: response.ok, body }
}

/** @param {unknown} body */
export const postgrest = (body) =>
  body && typeof body === 'object' && body.message
    ? `${body.code ?? 'error'}: ${body.message}${body.details ? ` — ${body.details}` : ''}`
    : JSON.stringify(body).slice(0, 300)

/**
 * `.env` values, ignoring a missing file — the environment may carry them.
 *
 * @returns {Record<string, string>}
 */
function readDotenv() {
  try {
    return parseEnvFile(readFileSync(resolve(REPO_ROOT, '.env'), 'utf8'))
  } catch {
    return {}
  }
}

async function main() {
  const check = process.argv.includes('--check')
  const record = process.argv.includes('--record')
  const target = credentials(process.env, readDotenv())
  if (!target) {
    console.log(
      'no database configured — nothing to generate. Set VITE_SUPABASE_URL and ' +
        'VITE_SUPABASE_ANON_KEY (not the example placeholders) to render an account ' +
        'from a connected catalog. The agent reference list stays this template\'s own.',
    )
    return
  }

  const kinds = entityKinds(readFileSync(PANEL_TERMS, 'utf8'))
  const columns = tableColumns(readFileSync(DATABASE_TS, 'utf8'))

  const comments = await rest(target.url, target.key, 'rpc/schema_comments', { method: 'POST', body: '{}' })
  if (!comments.ok || !Array.isArray(comments.body) || comments.body.length === 0) {
    throw new Error(
      `could not read the catalog's comments from ${target.url} — ${postgrest(comments.body)}. ` +
        `public.schema_comments() is the route; nothing here is rendered from memory.`,
    )
  }
  const readable = new Set()
  for (const name of columns.keys()) {
    const probe = await rest(target.url, target.key, `${name}?select=*&limit=0`)
    if (probe.ok) readable.add(name)
  }

  const doc = readFileSync(DOC, 'utf8')
  const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null
  const { next, current, failures } = evaluate({
    doc,
    kinds,
    sources: { columns, comments: comments.body, readable },
    baseline,
    check,
    record,
  })

  if (!check) {
    writeFileSync(DOC, next)
    console.log(`wrote ${DOC.slice(REPO_ROOT.length + 1)}`)
  }

  if (record) {
    writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`)
    console.log(`recorded ${BASELINE.slice(REPO_ROOT.length + 1)}`)
  }

  console.log(
    `vocabulary: ${kinds.length} kinds · schema: ${readable.size} readable relation(s) of ${columns.size} · ` +
      `column comments: ${current.columnComments.described} of ${current.columnComments.of} · ` +
      `prohibitions: ${current.prohibitions}`,
  )
  for (const failure of failures) console.error(`::error::agent account — ${failure}`)
  if (failures.length > 0) process.exitCode = 1
  else console.log('ok — the account agrees with its sources and the ratchet holds')
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  main().catch((error) => {
    console.error(`::error::agent account: ${error.message}`)
    process.exitCode = 1
  })
}
