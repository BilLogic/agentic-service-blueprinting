import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'vitest'
import assert from 'node:assert/strict'

import { readAppFile } from '../app-source.mjs'
import { toolSources } from '../tool-sources.mjs'

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

/**
 * Every tool is a definition: its schema, its handler and its roster facts
 * are one object under `definitions/`, and `TOOL_SPECS` is a projection of
 * that list. What used to be checked here — that a spec literal had a
 * dispatch case and read the arguments it advertised — is now what the
 * compiler checks. What remains to hold is that the old shape stays gone:
 * no literal back in the spec table, no `case` back in the dispatcher, and
 * every name the write roster still lists is a definition.
 */
test('the spec table declares nothing and the dispatcher switches on nothing', () => {
  assert.ok(
    !/^\s*\{\s*name: '[a-z_]+'/m.test(specs),
    'specs.ts holds an inline tool-spec literal again — a tool is one definition',
  )
  assert.ok(
    !/\bcase '[a-z_]+':/.test(registry),
    'registry.ts dispatches by switch case again — a tool is run from its definition',
  )
  assert.match(
    specs,
    /TOOL_SPECS: ToolSpec\[\] = TOOL_DEFINITIONS\.map\(toolSpec\)/,
    'TOOL_SPECS is no longer a projection of the definition list',
  )
})

test('every write tool on the roster is a definition', () => {
  const definitions = toolSources(REPO_ROOT)
  for (const name of setMembers(specs, 'WRITE_TOOL_NAMES')) {
    assert.ok(
      definitions.includes(`name: '${name}'`),
      `${name} is listed as a write tool but no definition declares it`,
    )
  }
})

/**
 * The declarations are IMPORTED rather than parsed: specs.ts is pure data and
 * loads in Node. The projection must offer every tool the definitions
 * declare, in their order, and nothing a definition did not declare.
 */
const TOOL_SPECS = (await import('@/lib/agent/tools/specs')).TOOL_SPECS
const TOOL_DEFINITIONS = (await import('@/lib/agent/tools/definitions')).TOOL_DEFINITIONS

test('the spec table is the definition list, projected', () => {
  assert.deepEqual(
    TOOL_SPECS.map((spec) => spec.name),
    TOOL_DEFINITIONS.map((tool) => tool.name),
  )
  for (const spec of TOOL_SPECS) {
    assert.equal(spec.parameters.type, 'object', `${spec.name} has no object schema`)
  }
})
