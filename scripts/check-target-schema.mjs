#!/usr/bin/env node
/**
 * Did the migration actually run against the target?
 *
 * The failure signature every comparable project shares is not a scaffolding
 * gap: the app starts, every container reports healthy, and the database was
 * never migrated. A healthy process says nothing about the schema behind it,
 * and "it renders" is the worst possible check — the no-DB fallback renders
 * too, so a misconfigured target looks exactly like a working one.
 *
 * So the question gets an answer instead of an inference. `public.schema_version`
 * is one row in the portable core, and this asks the live target for it, over
 * the same Data API the app uses and with the same anon key. It answers three
 * distinguishable things:
 *
 *   - reachable, migrated, compatible          -> exit 0
 *   - reachable, migrated, WRONG VERSION       -> exit 1, both versions named
 *   - reachable, NOT MIGRATED (no such table)  -> exit 1, says so in those words
 *
 * The third is the one worth having. A target that answers 404 for
 * schema_version has never had `supabase db push` run against it, and that is
 * a different problem from a stale one.
 *
 * Usage — by path, because the npm alias is each repository's own and this
 * file is read from more than one. Where an alias exists it is `check:target`.
 *
 *   node scripts/check-target-schema.mjs              # .env, then the environment
 *   node scripts/check-target-schema.mjs --url <u> --key <k>
 *
 * This repository's connector document walks the same three answers in a
 * running system, under § Did the migration run.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { sweep } from './sweep.mjs'
import { whenRun } from './verdict.mjs'

/** The tree this script runs in: the working directory — never this file's location; `sweep.mjs` says why. */
const ROOT = process.cwd()

/**
 * The versions this checkout speaks, from the schema that declares them.
 *
 * Same source as `scripts/validate_ir.py` and, by test, as
 * `src/lib/backend/schemaVersion.ts`. A second copy of a version list is a
 * second thing to forget.
 */
export function supportedVersions() {
  const schema = JSON.parse(
    // The schema is the package's reference surface — in a deployment the
    // installed package's, here this tree's — which is what `reference-docs`
    // answers with; the subject lists markdown and `locate` answers for any
    // path under its base, and a missing schema is a failure with the path in it.
    readFileSync(sweep({ subject: 'reference-docs', root: ROOT }).locate('references/ir-schema.json'), 'utf8'),
  )
  return schema.properties.schema_version.enum
}

/** `KEY=value` lines out of a dotenv file. Quotes stripped, `#` lines skipped. */
export function parseEnvFile(text) {
  const values = {}
  for (const line of text.split('\n')) {
    const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    values[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  }
  return values
}

/**
 * What the target said, as one of four outcomes.
 *
 * Split from the fetch so the interesting half is testable without a network
 * or a database: every branch below is a decision about somebody's broken
 * deployment, and those are exactly the paths that never get exercised by
 * hand.
 */
export function interpret({ status, body }, supported) {
  if (status === 404 || status === 400) {
    return {
      ok: false,
      code: 'not-migrated',
      message:
        'the target has no public.schema_version — it has never been migrated. ' +
        'Run `supabase db push` (hosted) or `npm run supabase:reset` (local).',
    }
  }
  if (status !== 200) {
    return { ok: false, code: 'unreachable', message: `the target answered HTTP ${status}` }
  }
  const rows = Array.isArray(body) ? body : []
  if (rows.length === 0) {
    return {
      ok: false,
      code: 'empty',
      message:
        'public.schema_version exists and is empty. Either the migration was ' +
        'interrupted, or the row was deleted — re-apply 21000101000000.',
    }
  }
  const found = rows[0].version
  if (!supported.includes(found)) {
    return {
      ok: false,
      code: 'incompatible',
      message:
        `the target carries schema_version ${found}; this checkout speaks ` +
        `${supported.join(', ')}. Apply the migrations in supabase/migrations, ` +
        'or check out the revision that matches the target.',
    }
  }
  return { ok: true, code: 'compatible', message: `the target carries schema_version ${found}`, found }
}

function readConfig(argv) {
  const flag = (name) => {
    const index = argv.indexOf(`--${name}`)
    return index === -1 ? undefined : argv[index + 1]
  }
  let dotenv = {}
  try {
    dotenv = parseEnvFile(readFileSync(resolve(ROOT, '.env'), 'utf8'))
  } catch {
    // No .env is normal — the environment may carry them instead.
  }
  return {
    url: flag('url') ?? process.env.VITE_SUPABASE_URL ?? dotenv.VITE_SUPABASE_URL,
    key: flag('key') ?? process.env.VITE_SUPABASE_ANON_KEY ?? dotenv.VITE_SUPABASE_ANON_KEY,
  }
}

// THE UNCONFIGURED TARGET IS NEITHER A FINDING NOR A SKIP. It exits 2, which
// is a third thing: the check was asked a question it was never given the
// subject for, and the caller wants to tell that apart from a target that
// answered wrongly. The verdict renders four outcomes and none of them is
// this, so this one branch keeps its own print and its own code.
/**
 * The verdict: the schema version the configured target reports, held to the
 * versions this tree supports.
 *
 * Pure — it asks the target, decides, and hands back what it found. Nothing here
 * prints or exits, bar the unconfigured target, which is not a verdict.
 */
export async function judge(argv = process.argv.slice(2)) {
  const { url, key } = readConfig(argv)
  if (!url || !key) {
    console.error(
      'no target configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env ' +
        'or the environment, or pass --url and --key.\n\n' +
        'Without a configured project this app runs the no-DB adapter, which is a ' +
        'supported mode and not something to check with this script.',
    )
    process.exitCode = 2
    return {}
  }

  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/schema_version?select=version`
  let response
  try {
    response = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  } catch (error) {
    return { what: 'the target database', count: 1, findings: [`could not reach ${url}: ${error.message}`] }
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    // A non-JSON body is itself the answer; interpret() reads the status.
  }

  const result = interpret({ status: response.status, body }, supportedVersions())
  return {
    what: 'the target database',
    count: 1,
    findings: result.ok ? [] : [result.message],
    line: result.message,
  }
}

whenRun(import.meta.url, judge)
