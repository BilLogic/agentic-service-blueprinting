import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'vitest'
import assert from 'node:assert/strict'

import { readAppFile } from '../app-source.mjs'

/**
 * The eval harness must run against the app's tool surface. The spec
 * DECLARATIONS are one-sourced — `surface.mjs` bundles `app-surface.entry.ts`
 * with rolldown once per run, that entry re-exports TOOL_SPECS /
 * WRITE_TOOL_NAMES / MOBILE_READ_TOOL_NAMES from specs.ts, and every harness
 * module imports them from `surface.mjs` — so the check is that the import
 * wiring still exists and no fork has crept back in.
 *
 * Deliberately text-parsed: `registry.ts` imports supabase-js and Vite
 * `?raw` markdown, so it cannot be loaded from Node without a bundler.
 */
// The runner copies test files into a temp dir, so paths resolve from the
// working directory (npm test runs at the repo root), not from import.meta.
const REPO_ROOT = process.cwd()

/** A file of THIS tree: the harness, which a deployment holds beside this test. */
function read(path) {
  return readFileSync(resolve(REPO_ROOT, path), 'utf8')
}

/**
 * A file of the APPLICATION, wherever this tree keeps it.
 *
 * The harness modules above are this repository's and sit next to this test in
 * every deployment. `specs.ts` and `registry.ts` are not: a deployment keeps no
 * `src` and reads them out of `node_modules/agentic-service-blueprinting`.
 * Read by hand from `src/…`, this file did not fail there — it threw ENOENT on
 * import, which took the parity checks out of the run entirely.
 */
function readApp(path) {
  return readAppFile(REPO_ROOT, path)
}

/** The string members of a `new Set([...])` assigned to `name`. */
function setMembers(source, name) {
  const at = source.indexOf(`${name} = new Set([`)
  assert.ok(at !== -1, `${name} not found`)
  const body = source.slice(at, source.indexOf('])', at))
  return new Set([...body.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]))
}

// Specs and rosters live in specs.ts (pure data); dispatch stays in
// registry.ts. The parity checks read each from where it lives.
const specs = readApp('src/lib/agent/tools/specs.ts')
const registry = readApp('src/lib/agent/tools/registry.ts')
const harness = read('scripts/agent-harness/run.mjs')
const bundler = read('scripts/agent-harness/surface.mjs')
const surfaceEntry = read('scripts/agent-harness/app-surface.entry.ts')

test('harness imports the app tool specs instead of forking them', () => {
  // The wiring: surface.mjs bundles the surface entry, the entry re-exports
  // the rosters from specs.ts, and the runner destructures them from the
  // bundle surface.mjs hands it.
  assert.ok(
    bundler.includes('scripts/agent-harness/app-surface.entry.ts'),
    'surface.mjs no longer bundles scripts/agent-harness/app-surface.entry.ts',
  )
  assert.match(
    harness,
    /import\s*\{\s*surface\s*\}\s*from\s*'\.\/surface\.mjs'/,
    'run.mjs no longer takes the bundled surface from surface.mjs',
  )
  assert.match(
    surfaceEntry,
    /export\s*\{\s*TOOL_SPECS,\s*WRITE_TOOL_NAMES,\s*MOBILE_READ_TOOL_NAMES,?\s*\}\s*from\s*'@\/lib\/agent\/tools\/specs'/,
    'app-surface.entry.ts no longer re-exports TOOL_SPECS/WRITE_TOOL_NAMES/MOBILE_READ_TOOL_NAMES from specs.ts',
  )
  // The reference list too, so the harness offers exactly the list the app
  // offers.
  assert.match(
    surfaceEntry,
    /export\s*\{\s*REFERENCE_NAMES\s*\}\s*from\s*'@\/lib\/agent\/tools\/referenceNames'/,
    'app-surface.entry.ts no longer re-exports REFERENCE_NAMES from referenceNames.ts',
  )
  assert.match(
    harness,
    /\{\s*TOOL_SPECS,\s*WRITE_TOOL_NAMES,\s*MOBILE_READ_TOOL_NAMES\s*\}\s*=\s*surface/,
    'run.mjs no longer destructures the rosters from the bundled surface',
  )
  // And no fork crept back: a local spec array would re-declare tool
  // objects (`name: '...'` entries) and a local write set would shadow the
  // imported roster.
  for (const [file, source] of [
    ['run.mjs', harness],
    ['surface.mjs', bundler],
    ['app-surface.entry.ts', surfaceEntry],
  ]) {
    assert.ok(
      !/TOOL_SPECS\s*(?::[^=]*)?=\s*\[/.test(source),
      `${file} declares a local TOOL_SPECS array — the fork is back`,
    )
    assert.ok(
      !/WRITE_TOOL(?:_NAME)?S\s*=\s*new Set/.test(source),
      `${file} declares a local write set — the fork is back`,
    )
    assert.ok(
      !/^\s*\{\s*name: '[a-z_]+', description:/m.test(source),
      `${file} contains inline tool-spec declarations — the fork is back`,
    )
  }
})

/**
 * The case file's write list is the dangerous one: a name missing from it
 * makes a "no writes happened" trace check PASS, so drift there hides itself
 * instead of failing loudly. `harness-write-list.test.mjs` pins that it is
 * imported from the bundled surface; this pins that what the trace checks
 * count against IS that roster, not a set built from it or beside it.
 */
test('cases.mjs counts writes against the app write roster itself', () => {
  const cases = read('scripts/agent-harness/cases.mjs')
  assert.match(
    cases,
    /^const WRITES = WRITE_TOOL_NAMES\s*$/m,
    'cases.mjs WRITES is no longer the imported WRITE_TOOL_NAMES roster',
  )
  assert.ok(
    !/WRITES\s*=\s*new Set\(/.test(cases),
    'cases.mjs builds its own write set again — it will drift from specs.ts',
  )
})

test('every write tool is dispatchable', () => {
  const app = setMembers(specs, 'WRITE_TOOL_NAMES')
  for (const name of app) {
    assert.ok(
      registry.includes(`case '${name}':`),
      `${name} is listed as a write tool but has no dispatch case`,
    )
  }
})

/** Every `name:` at the top level of the TOOL_SPECS array literal. */
function specNames(source) {
  const at = source.indexOf('TOOL_SPECS: ToolSpec[] = [')
  assert.ok(at !== -1, 'TOOL_SPECS array not found')
  const names = [
    ...source.slice(at).matchAll(/^ {2}\{\n {4}name: '([a-z_]+)'/gm),
  ].map((m) => m[1])
  assert.ok(names.length > 0, 'no tool names parsed out of TOOL_SPECS')
  return names
}

/**
 * The write roster had this check; the read half did not, so a renamed or
 * newly added READ tool could sit in specs.ts with no dispatch case and
 * fail only at runtime, in front of a user. Covering every spec — not just
 * the write roster — closes that and subsumes the check above.
 */
test('every tool spec is dispatchable', () => {
  for (const name of specNames(specs)) {
    assert.ok(
      registry.includes(`case '${name}':`),
      `${name} is declared in TOOL_SPECS but has no dispatch case in registry.ts`,
    )
  }
})

/**
 * The other direction: a dispatch case with no spec is dead code the model
 * can never reach — the residue a rename leaves when specs.ts moves on and
 * registry.ts keeps the old arm.
 */
test('every dispatch case has a tool spec', () => {
  const declared = new Set(specNames(specs))
  const dispatched = [...registry.matchAll(/case '([a-z_]+)':/g)].map(
    (m) => m[1],
  )
  const orphans = dispatched.filter((name) => !declared.has(name))
  assert.deepEqual(
    orphans,
    [],
    `registry.ts dispatches tools that no longer exist in TOOL_SPECS: ${orphans.join(', ')}`,
  )
})

/**
 * The names on the wire, in both directions.
 *
 * A tool spec is a contract with a model. The model can only send the
 * properties the schema declares, and the handler can only read the keys it
 * asks for by name — nothing connects the two, and nothing fails when they
 * disagree. A handler reading a key the schema never offers gets `undefined`
 * on every call and reports success; a schema offering a property no handler
 * reads takes an argument from the model and throws it away. Both are silent,
 * and both look exactly like working software from the outside.
 *
 * This is not hypothetical. `create_slice` once advertised `description` and
 * read `summary`, so a model that filled in the field the schema asked for
 * wrote an empty summary and was told the slice was created; `update_slice`
 * kept the old summary and reported the edit as done. No test could see it,
 * because every test asserted about one file or the other.
 *
 * The declarations are IMPORTED rather than parsed: specs.ts is pure data and
 * loads in Node. registry.ts is still read as text, because it imports
 * supabase-js and Vite `?raw` markdown and cannot be loaded without a bundler.
 */
const TOOL_SPECS = (await import('@/lib/agent/tools/specs')).TOOL_SPECS

/**
 * The argument keys a stretch of registry source reads. The four forms are the
 * four the file uses: `need(args, 'x')` for a required string, `s(args, 'x')`
 * for an optional one, and `args.x` / `args['x']` for everything typed by hand.
 */
function keysIn(body) {
  return [
    ...body.matchAll(
      /(?:need|s)\(args, '([a-z_]+)'\)|args\.([a-z_]+)|args\['([a-z_]+)'\]/g,
    ),
  ].map((m) => m[1] ?? m[2] ?? m[3])
}

/**
 * The keys each local helper reads when a case hands it `args` whole.
 * `readScope(client, args)` reads `service` on behalf of every case that calls
 * it, and a reader that did not follow it would call that argument ignored.
 * The dispatchers themselves take `args` too and are not helpers: their
 * bodies are the cases.
 */
function helperKeys(source) {
  const helpers = new Map()
  for (const match of source.matchAll(
    /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\(([^)]*)\)[^{]*\{\n([\s\S]*?)^\}/gm,
  )) {
    const [, name, params, body] = match
    if (!/\bargs\s*:/.test(params) || /switch \(name\)/.test(body)) continue
    helpers.set(name, new Set(keysIn(body)))
  }
  return helpers
}

/**
 * The argument keys each dispatch case reads.
 *
 * A case runs to the next `case '...':`, which covers both shapes registry.ts
 * uses — the braced block and the single-expression arm. A tool dispatched in
 * more than one switch (the live client and the no-database sample) is judged
 * by everything any of its arms reads, because the model sends one set of
 * arguments to whichever arm answers.
 */
function argKeysByCase(source) {
  const helpers = helperKeys(source)
  const marks = [...source.matchAll(/case '([a-z_]+)':/g)]
  const byCase = new Map()
  marks.forEach((mark, index) => {
    const start = mark.index + mark[0].length
    const end = index + 1 < marks.length ? marks[index + 1].index : source.length
    const body = source.slice(start, end)
    const keys = byCase.get(mark[1]) ?? new Set()
    for (const key of keysIn(body)) keys.add(key)
    for (const [helper, helperReads] of helpers) {
      if (new RegExp(`\\b${helper}\\([^)]*\\bargs\\b`).test(body)) {
        for (const key of helperReads) keys.add(key)
      }
    }
    byCase.set(mark[1], keys)
  })
  return byCase
}

/**
 * Argument names a handler still accepts and the schema no longer offers.
 *
 * A rename on this wire cannot be a swap. Anything pinned to an older
 * description of these tools keeps sending the old word, and a handler that
 * stopped reading it turns a working call into a refusal. So the schema moves
 * first and the handler keeps accepting both for a release.
 *
 * Every entry is asserted below to still be READ, so an alias whose handler
 * dropped it loses its exemption instead of leaving a carve-out behind for the
 * next rename to slip through. Deleting an entry is how the alias retires:
 * remove the fallback in registry.ts and the line here together.
 */
const ACCEPTED_ALIASES = [
  {
    tool: 'create_slice',
    alias: 'description',
    now: 'summary',
    because:
      'the schema advertised description while the handler read summary, so a model taught the old wire still sends it',
  },
  {
    tool: 'update_slice',
    alias: 'description',
    now: 'summary',
    because: 'same rename, same tool pair',
  },
]

const isAlias = (tool, key) =>
  ACCEPTED_ALIASES.some((entry) => entry.tool === tool && entry.alias === key)

test('every accepted alias is still read, or it has stopped being one', () => {
  const read = argKeysByCase(registry)
  const dead = ACCEPTED_ALIASES.filter(
    (entry) => !read.get(entry.tool)?.has(entry.alias),
  ).map((entry) => `${entry.tool}.${entry.alias}`)
  assert.deepEqual(
    dead,
    [],
    `Exempted as an accepted alias but no longer read by registry.ts: ${dead.join(', ')}. ` +
      'The alias has retired — delete the entry rather than leaving a dead carve-out.',
  )
})

test('every argument a handler reads is one the schema offers', () => {
  const declared = new Map(
    TOOL_SPECS.map((spec) => [
      spec.name,
      new Set(Object.keys(spec.parameters?.properties ?? {})),
    ]),
  )
  const undeclared = []
  for (const [name, keys] of argKeysByCase(registry)) {
    const offered = declared.get(name)
    // A case with no spec is the previous test's failure, not this one's.
    if (!offered) continue
    for (const key of keys) {
      if (offered.has(key) || isAlias(name, key)) continue
      undeclared.push(`${name}.${key}`)
    }
  }
  assert.deepEqual(
    undeclared.sort(),
    [],
    `registry.ts reads arguments no model can send, so they are always undefined: ${undeclared.join(', ')}`,
  )
})

test('every argument the schema offers is one a handler reads', () => {
  const read = argKeysByCase(registry)
  const ignored = []
  for (const spec of TOOL_SPECS) {
    const keys = read.get(spec.name)
    // Tools dispatched elsewhere are out of this file's reach.
    if (!keys) continue
    for (const key of Object.keys(spec.parameters?.properties ?? {})) {
      if (!keys.has(key)) ignored.push(`${spec.name}.${key}`)
    }
  }
  assert.deepEqual(
    ignored.sort(),
    [],
    `TOOL_SPECS offers arguments registry.ts never reads, so a model filling them in is ignored: ${ignored.join(', ')}`,
  )
})

test('the argument reader follows a helper and joins a tool across both switches', () => {
  // Non-vacuity for the two things the reader does beyond a regex: without
  // them the checks above would report `service` as ignored and could not see
  // an argument read only by the sample arm.
  const source = [
    'function readScope(client: Client, args: Record<string, unknown>) {',
    "  return scope(s(args, 'service'))",
    '}',
    "    case 'list_things':",
    '      return listThings(client, await readScope(client, args))',
    "    case 'get_thing':",
    "      return getThing(need(args, 'thing_id'))",
    "    case 'get_thing':",
    "      return sampleThing(need(args, 'thing_id'), s(args, 'locale'))",
  ].join('\n')
  const read = argKeysByCase(source)
  assert.deepEqual([...read.get('list_things')], ['service'])
  assert.deepEqual([...read.get('get_thing')].sort(), ['locale', 'thing_id'])
})
