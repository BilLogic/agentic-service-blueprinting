#!/usr/bin/env node
/**
 * The authoring RPCs' ARGUMENT names, against the functions they are sent to.
 *
 * `src/lib/authoringRpc.ts` is the app's entire structural write surface, and
 * every call in it is a JSON object posted to PostgREST. PostgREST resolves an
 * RPC by matching the body's KEYS to a function's parameter names: a key the
 * function does not have means no candidate matches, so the request comes back
 * `PGRST202 — Could not find the function public.<name>(<keys>) in the schema
 * cache`. It is a 404 at the seam, not a null column — the write never lands,
 * and nothing in TypeScript can see it coming, because `client.rpc` is called
 * through an `any` cast for exactly the reason the file records: these
 * functions post-date the last type generation.
 *
 * That is the shape of #168. `21000116000000` renamed `cell_dependencies.label`
 * to `.name` and moved the RPC parameter with it, and this file kept sending
 * `label`. Every arrow saved from the panel failed, every `create_cell_dependency`
 * from the agent failed, and the whole guard set stayed green — the name lived
 * in a string on one side and in a SQL signature on the other, with nothing
 * between them.
 *
 * SUBJECT: every RPC argument object in `src/lib/authoringRpc.ts`, which is
 * two kinds of site and both are posted the same way —
 *
 *   - the object passed to `call<T>(client, 'fn', { … })` and
 *     `read<T>(client, 'fn', { … })`;
 *   - the `args` of a revert spec, `{ fn: 'fn', args: { … } }`. An inverse is
 *     posted the moment somebody clicks undo, which is the latest a name can
 *     be wrong and the least likely place to notice.
 *
 * AGAINST: the parameter lists parsed from
 * `supabase/generated/portable-core.schema.sql` — the dump of what the
 * migration series builds, regenerated and diffed in CI
 * (`npm run check:portable-schema`), and already the file the vocabulary
 * checks read.
 *
 * **The `p_` prefix is not stripped, because PostgREST does not strip it.**
 * Some functions in this schema take `p_`-prefixed parameters —
 * `sync_cell_resources(p_cell_id, p_rows)`, `set_featured_resource`,
 * `sync_cell_touchpoints` — and their callers in `cellContentMutations.ts` and
 * `placementResourceMutations.ts` send `p_cell_id` and `p_rows` verbatim. A
 * check that stripped the prefix would call those calls wrong and this file's
 * unprefixed calls wrong too. The comparison is the plain parameter name.
 *
 * Three ways to fail, each naming the file, the line and the function:
 *
 *   - a key that is not a parameter of that function;
 *   - a parameter with no DEFAULT that the call does not pass — PostgREST
 *     cannot resolve that one either;
 *   - a function the schema dump does not have at all.
 *
 * Run: node scripts/check-rpc-arguments.mjs   (also: npm run check:rpc-arguments)
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

const CALLER = 'src/lib/authoringRpc.ts'
const SCHEMA = 'supabase/generated/portable-core.schema.sql'

/* ----------------------------------------------------------------- schema */

/** Top-level commas of a parameter list — `'[]'::jsonb` carries none, but a
 *  future `numeric(10, 2)` would, so depth is tracked rather than assumed. */
function splitParameters(text) {
  const out = []
  let depth = 0
  let start = 0
  let quote = null
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quote) {
      if (char === quote) quote = null
      continue
    }
    if (char === "'" || char === '"') quote = char
    else if (char === '(' || char === '[') depth += 1
    else if (char === ')' || char === ']') depth -= 1
    else if (char === ',' && depth === 0) {
      out.push(text.slice(start, i))
      start = i + 1
    }
  }
  out.push(text.slice(start))
  return out.map((entry) => entry.trim()).filter(Boolean)
}

/**
 * Every function the dump declares: name → one entry per signature.
 *
 * A list rather than a single entry because Postgres allows overloads, and a
 * call is right when it satisfies ANY of them. Nothing in this schema is
 * overloaded today; the shape is what stops the check going wrong on the day
 * one is.
 */
export function schemaFunctions(sql) {
  const functions = new Map()
  const opener = /CREATE FUNCTION public\.([a-z_]+)\(/g
  let match
  while ((match = opener.exec(sql)) !== null) {
    let depth = 1
    let i = opener.lastIndex
    while (i < sql.length && depth > 0) {
      if (sql[i] === '(') depth += 1
      else if (sql[i] === ')') depth -= 1
      i += 1
    }
    const parameters = splitParameters(sql.slice(opener.lastIndex, i - 1)).map((entry) => {
      const [name] = entry.split(/\s+/)
      return { name, required: !/\sDEFAULT\s/i.test(entry) }
    })
    const signature = {
      accepted: parameters.map(({ name }) => name),
      required: parameters.filter(({ required }) => required).map(({ name }) => name),
    }
    functions.set(match[1], [...(functions.get(match[1]) ?? []), signature])
  }
  return functions
}

/* ------------------------------------------------------------------ calls */

/** The object literal starting at `from`, and the index just past its `}`. */
function objectAt(source, from) {
  let i = from
  while (i < source.length && /\s/.test(source[i])) i += 1
  if (source[i] !== '{') return null
  let depth = 0
  let quote = null
  for (let j = i; j < source.length; j += 1) {
    const char = source[j]
    if (quote) {
      if (char === '\\') j += 1
      else if (char === quote) quote = null
      continue
    }
    if (char === "'" || char === '"' || char === '`') quote = char
    else if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return { text: source.slice(i + 1, j), end: j + 1 }
    }
  }
  return null
}

/**
 * The keys of one object literal, shorthand included.
 *
 * `deletion_impact` is called `{ kind, target_id: targetId }` — the shorthand
 * is a key like any other, and a reader of this check who assumed `name:`
 * syntax would silently stop seeing half of one call.
 *
 * A spread is not a key set, so it is returned as one: the caller reports the
 * site rather than guessing at what the spread carries.
 */
export function objectKeys(text) {
  const keys = []
  let depth = 0
  let quote = null
  let atTop = true
  let token = ''
  // `a: b` and a bare `a` both leave the key in `token`, so one flush serves
  // both: what differs is only whether `atTop` survives to the next one.
  const flush = () => {
    const word = token.trim()
    token = ''
    if (!atTop || !word) return
    if (word.startsWith('...')) keys.push({ key: word, spread: true })
    else if (/^[A-Za-z_$][\w$]*$/.test(word)) keys.push({ key: word, spread: false })
  }
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quote) {
      if (char === '\\') i += 1
      else if (char === quote) quote = null
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char
      continue
    }
    if (char === '{' || char === '(' || char === '[') {
      depth += 1
      atTop = false
      continue
    }
    if (char === '}' || char === ')' || char === ']') {
      depth -= 1
      continue
    }
    if (depth > 0) continue
    if (char === ':') {
      flush()
      atTop = false
      continue
    }
    if (char === ',') {
      flush()
      atTop = true
      continue
    }
    token += char
  }
  flush()
  return keys
}

/** Line number of an offset, 1-based, for a failure a person can jump to. */
function lineOf(source, index) {
  return source.slice(0, index).split('\n').length
}

/**
 * Every RPC argument object in `source`, with the function it is posted to.
 *
 * Anchored on the two seams the file actually has rather than on `client.rpc`:
 * `call`/`read` are the only things that reach `invoke`, and a revert spec is
 * the same object one step later.
 */
export function rpcCallSites(source) {
  const sites = []
  const anchors = [
    /\b(?:call|read)\s*<[^>]*>\s*\(\s*client\s*,\s*'([a-z_]+)'\s*,/g,
    /\bfn:\s*'([a-z_]+)'\s*,\s*args:/g,
  ]
  for (const anchor of anchors) {
    let match
    while ((match = anchor.exec(source)) !== null) {
      const object = objectAt(source, anchor.lastIndex)
      if (!object) continue
      sites.push({
        fn: match[1],
        line: lineOf(source, match.index),
        keys: objectKeys(object.text),
      })
    }
  }
  return sites.sort((a, b) => a.line - b.line)
}

/* --------------------------------------------------------------- compare */

/** Every problem at one site, as sentences. */
export function problemsAt(site, functions) {
  const signatures = functions.get(site.fn)
  if (!signatures) {
    return [`${site.fn} is not a function in ${SCHEMA}`]
  }
  const spread = site.keys.find(({ spread: isSpread }) => isSpread)
  if (spread) {
    return [`${site.fn} is called with ${spread.key}, whose keys this check cannot read`]
  }
  const sent = site.keys.map(({ key }) => key)
  const scored = signatures.map((signature) => ({
    unknown: sent.filter((key) => !signature.accepted.includes(key)),
    missing: signature.required.filter((name) => !sent.includes(name)),
  }))
  const best = scored.reduce((a, b) =>
    a.unknown.length + a.missing.length <= b.unknown.length + b.missing.length ? a : b,
  )
  return [
    ...best.unknown.map(
      (key) =>
        `${site.fn} is called with ${key}, which is not one of its parameters` +
        ` (${signatures[0].accepted.join(', ')})`,
    ),
    ...best.missing.map(
      (name) => `${site.fn} is called without ${name}, which has no default`,
    ),
  ]
}

export function compare(root = REPO_ROOT) {
  const read = (path) => readFileSync(join(root, path), 'utf8')
  const source = read(CALLER)
  const functions = schemaFunctions(read(SCHEMA))
  const sites = rpcCallSites(source)
  if (sites.length === 0) {
    throw new Error(`no RPC call sites found in ${CALLER}`)
  }
  return sites.flatMap((site) =>
    problemsAt(site, functions).map((problem) => ({ line: site.line, problem })),
  )
}

function main() {
  const failures = compare()
  if (failures.length === 0) {
    console.log(`${CALLER} calls every RPC with the arguments ${SCHEMA} declares`)
    return
  }
  for (const { line, problem } of failures) {
    console.error(`${CALLER}:${line}: ${problem}`)
  }
  console.error(
    `\nPostgREST resolves an RPC by its argument NAMES, so a stray or missing` +
      ` key is a 404 rather than a null column. Fix the call in ${CALLER}, or the` +
      ` function in the migration series and regenerate with` +
      ` \`npm run generate:portable-schema\`.`,
  )
  process.exit(1)
}

// Same shape as scripts/check-write-surface.mjs: comparing against a
// hand-built `file://` URL silently no-ops whenever the path needs escaping.
const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) main()
