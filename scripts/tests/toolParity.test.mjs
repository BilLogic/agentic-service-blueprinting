import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'vitest'
import assert from 'node:assert/strict'

import { sweep } from '../sweep.mjs'
import { toolSources, toolsOnSurface } from '../tool-sources.mjs'

/**
 * The eval harness must run against the app's tool surface. The spec
 * DECLARATIONS are one-sourced — `surface.mjs` bundles `app-surface.entry.ts`
 * with rolldown once per run, that entry re-exports TOOL_SPECS from specs.ts
 * and derives WRITE_TOOL_NAMES / MOBILE_READ_TOOL_NAMES from the definitions,
 * and every harness module imports them from `surface.mjs` — so the check is
 * that the import wiring still exists and no fork has crept back in.
 *
 * Deliberately text-parsed: `registry.ts` imports supabase-js and Vite
 * `?raw` markdown, so it cannot be loaded from Node without a bundler.
 */
// The runner copies test files into a temp dir, so paths resolve from the
// working directory (npm test runs at the repo root), not from import.meta.
const REPO_ROOT = process.cwd()

/** The application, wherever this tree keeps it. */
const app = sweep({ subject: 'app', root: REPO_ROOT })

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
 * import, which took the parity checks out of the run entirely. So the sweep
 * reads them through the overlay, and a file it cannot find is a missing
 * subject said out loud rather than an empty string.
 */
function readApp(path) {
  const text = app.read(path)
  assert.ok(text !== null, `no ${path} under ${app.base}: this test has no subject`)
  return text
}


// The spec table lives in specs.ts (pure data); dispatch stays in
// registry.ts. The parity checks read each from where it lives.
const specs = readApp('src/lib/agent/tools/specs.ts')
const registry = readApp('src/lib/agent/tools/registry.ts')
const harness = read('scripts/agent-harness/run.mjs')
const bundler = read('scripts/agent-harness/surface.mjs')
const surfaceEntry = read('scripts/agent-harness/app-surface.entry.ts')

/**
 * A binding the runner takes from the bundled surface. Asserts the NAME is in
 * a destructured list, not the list's ORDER: a pin that spells the whole list
 * reds a correct harness the moment someone adds a binding or a formatter
 * rewraps it.
 */
function destructuredFromSurface(binding) {
  assert.match(
    harness,
    new RegExp(`\\{[^}]*\\b${binding}\\b[^}]*\\}\\s*=\\s*surface`),
    `run.mjs no longer takes ${binding} from the bundled surface`,
  )
}

/**
 * ONE SHARED REFUSAL, four pins — the shape every shared sentence gets, so the
 * next one is one line here and no sentence ends up guarded more loosely than
 * its neighbours.
 *
 *   `binding` the export name: `refusals.ts` must own it, the entry must
 *             re-export it, and run.mjs must destructure it.
 *   `copy`    a pattern over the WORDS of the sentence, which must not appear
 *             in run.mjs. Over the words, not the template syntax: a builder
 *             can be re-spelled as a concatenation, a `%s` format or a
 *             single-name literal, and a regex pinned to `${…}` sees none of
 *             those.
 *   `use`     where the harness's own gate answers with it. An import the
 *             dispatch never reaches is a sentence that only looks shared.
 *             Matched on the assignment alone — the binding in a result
 *             position — never on the `case` label above it or the whitespace
 *             between, which a reformat or an added `if` would move.
 *
 * WHY, once: see the header of `src/lib/agent/tools/refusals.ts`, which owns
 * the rule for what is shared and what is app-only. It is not restated here.
 */
function sharedRefusal({ binding, copy, use }) {
  assert.match(
    surfaceEntry,
    new RegExp(`export\\s*\\{[^}]*\\b${binding}\\b[^}]*\\}\\s*from\\s*'@/lib/agent/tools/refusals'`),
    `app-surface.entry.ts no longer re-exports ${binding} from refusals.ts`,
  )
  destructuredFromSurface(binding)
  assert.doesNotMatch(harness, copy, `run.mjs carries its own copy of ${binding}: ${copy}`)
  assert.match(harness, use, `run.mjs no longer answers its own gate with ${binding}`)
}

test('harness imports the app tool specs instead of forking them', () => {
  // The wiring: surface.mjs bundles the surface entry, the entry derives
  // the rosters from the definitions, and the runner destructures them from the
  // bundle surface.mjs hands it.
  assert.ok(
    bundler.includes("'app-surface.entry.ts'"),
    'surface.mjs no longer bundles app-surface.entry.ts, its neighbour',
  )
  assert.match(
    harness,
    /import\s*\{\s*surface\s*\}\s*from\s*'\.\/surface\.mjs'/,
    'run.mjs no longer takes the bundled surface from surface.mjs',
  )
  assert.match(
    surfaceEntry,
    /export\s*\{\s*TOOL_SPECS\s*\}\s*from\s*'@\/lib\/agent\/tools\/specs'/,
    'app-surface.entry.ts no longer re-exports TOOL_SPECS from specs.ts',
  )
  // The two rosters the harness gates on are derived from the app's
  // definitions inside the entry — the surface and availability each
  // definition states — not listed there.
  assert.match(
    surfaceEntry,
    /WRITE_TOOL_NAMES = new Set\(\s*TOOL_DEFINITIONS\.filter\(\(tool\) => tool\.surface === 'write'\)/,
    'app-surface.entry.ts no longer derives WRITE_TOOL_NAMES from the definitions',
  )
  assert.match(
    surfaceEntry,
    /MOBILE_READ_TOOL_NAMES = new Set\(\s*TOOL_DEFINITIONS\.filter\(\(tool\) => tool\.availability\.mobile\)/,
    'app-surface.entry.ts no longer derives MOBILE_READ_TOOL_NAMES from the definitions',
  )
  // The reference list too, so the harness offers exactly the list the app
  // offers.
  assert.match(
    surfaceEntry,
    /export\s*\{\s*REFERENCE_NAMES\s*\}\s*from\s*'@\/lib\/agent\/tools\/referenceNames'/,
    'app-surface.entry.ts no longer re-exports REFERENCE_NAMES from referenceNames.ts',
  )
  for (const binding of [
    'TOOL_SPECS',
    'TOOL_DEFINITIONS',
    'WRITE_TOOL_NAMES',
    'MOBILE_READ_TOOL_NAMES',
    'WRITE_BATCH_LIMIT',
    'AGENT_CELL_FIELDS',
    'renderCanvasAdapter',
    'rehearsalContext',
    'runTool',
  ])
    destructuredFromSurface(binding)
  // The refusals are destructured too, each with its own pins below.
  // A dry-run write answers in the TOOL's words: its own `run`, through the
  // app's own call seam, against the rehearsal context. The harness composed
  // a sentence per write before, which is a sentence the tool can change
  // without the harness noticing.
  assert.match(
    surfaceEntry,
    /export\s*\{\s*runTool\s*\}\s*from\s*'@\/lib\/agent\/tools\/definition'/,
    'app-surface.entry.ts no longer re-exports runTool from definition.ts',
  )
  assert.match(
    surfaceEntry,
    /export\s*\{\s*rehearsalContext\s*\}\s*from\s*'@\/lib\/agent\/tools\/rehearsal'/,
    'app-surface.entry.ts no longer re-exports rehearsalContext from rehearsal.ts',
  )
  assert.match(
    harness,
    /rehearsalContext\(\{ definition, args, placeholder \}\)/,
    'run.mjs no longer builds the rehearsal from the definition and the call’s own arguments',
  )
  assert.match(
    harness,
    /runTool\(definition, args, rehearsal\.ctx\)/,
    'run.mjs no longer rehearses a dry-run write through the tool’s own run',
  )
  for (const copy of [/accepted, ref dry-/, /Recorded \$\{args\.severity/]) {
    assert.doesNotMatch(harness, copy, `run.mjs composes a write result of its own: ${copy}`)
  }
  // THE REFUSALS. Each shared sentence gets the same four pins, through the
  // one helper above; `src/lib/agent/tools/refusals.ts` owns the rule for
  // which sentences are shared and why, and this test does not restate it.
  sharedRefusal({
    binding: 'BATCH_LIMIT_REFUSAL',
    copy: /Batch limit:/,
    use: /record\.result = BATCH_LIMIT_REFUSAL/,
  })
  sharedRefusal({
    binding: 'MOBILE_SHELL_REFUSAL',
    copy: /mobile shell is view-only/,
    use: /record\.result = MOBILE_SHELL_REFUSAL/,
  })
  sharedRefusal({
    binding: 'VIEW_ONLY_REFUSAL',
    copy: /view-only \(not a service account\)/,
    use: /record\.result = VIEW_ONLY_REFUSAL/,
  })
  sharedRefusal({
    binding: 'noSuchToolRefusal',
    // The one shared sentence BUILDER, so the copy that matters is the one a
    // regex over `${…}` cannot see. These words in run.mjs are a copy however
    // the name is spliced in: a template, a concatenation, a format string, or
    // one name hard-coded.
    copy: /There is no .{0,40} tool in this session/,
    use: /record\.result = noSuchToolRefusal\(name\)/,
  })
  // AND ONE THAT IS NOT SHARED, pinned from the other side. The app says
  // `NO_SEARCH_REFUSAL` only where the tool was never offered; this harness
  // offers `search_blueprint`, so the app's sentence would be false of its
  // session. So the entry must not publish it, run.mjs must not spell it, and
  // the harness must answer that call with a sentence of its own that still
  // steers to the two reads a case grades the recovery on.
  assert.doesNotMatch(
    surfaceEntry,
    /\bNO_SEARCH_REFUSAL\b/,
    'app-surface.entry.ts publishes NO_SEARCH_REFUSAL again — it is false of a session that offers search_blueprint',
  )
  assert.doesNotMatch(
    harness,
    /no search_blueprint tool in this session/,
    'run.mjs says the app’s missing-search sentence, which is untrue of a session that offers the tool',
  )
  assert.match(
    harness,
    /record\.result = NO_SEARCH_HERE/,
    'run.mjs no longer answers a ranked-search call with its own true refusal',
  )
  assert.match(
    harness,
    /const NO_SEARCH_HERE =\s*'[^']*list_blueprint[^']*get_blueprint/,
    'the harness’s ranked-search refusal no longer steers to list_blueprint and get_blueprint',
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
    // The entry DERIVES the write set from the definitions (asserted above);
    // a `new Set` of names in either harness module would be a fork of it.
    if (file !== 'app-surface.entry.ts')
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
 * NO TOOL RESULT SENTENCE IS WRITTEN TWICE.
 *
 * The checks above name the copies that were found and removed, one regex
 * each — which catches those and nothing else. This one is the rule they were
 * instances of: a sentence the harness hands a model as a tool result must
 * not also exist in the application, because then the application can reword
 * it and the harness will go on saying the old words, and the eval will pass
 * against a sentence no tool says.
 *
 * WHAT IT COMPARES. A "sentence literal" is a quoted string with a space in
 * it, at least 20 characters long, with every `${…}` reduced to `${}` so a
 * template matches the same template written with different variable names.
 * On the harness side it reads the literals in RESULT POSITIONS — a line
 * carrying `record.result`, a `return`, a ternary arm, or a SHOUTING const —
 * which is where a tool result is composed; on the application side it sweeps
 * every literal under `src/lib/agent`, through the overlay, so a deployment's
 * own copy of a read is the subject when it has one.
 *
 * WHAT IT DOES NOT CATCH, said out loud: a short sentence, a sentence with no
 * space, and the system-prompt ASSEMBLY, which is declared mirrored-by-hand in
 * run.mjs's header and is not a tool result. Those are the header's business.
 */
const SENTENCE = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g
const RESULT_POSITION = /record\.result|\breturn\b|^\s*[?:]\s|^\s*(?:const|let) [A-Z][A-Z0-9_]*\s*=/
const sentences = (text) => {
  const found = new Set()
  for (const match of text.matchAll(SENTENCE)) {
    const literal = (match[1] ?? match[2] ?? match[3] ?? '').replace(/\$\{[^}]*\}/g, '${}')
    if (literal.length >= 20 && literal.includes(' ')) found.add(literal)
  }
  return found
}

test('run.mjs composes no tool result sentence the app already says', () => {
  const appSentences = new Set()
  const agent = sweep({
    subject: 'app',
    root: REPO_ROOT,
    where: (path) => path.startsWith('src/lib/agent/') && path.endsWith('.ts'),
    what: 'agent tool surface',
  })
  for (const path of agent.files) {
    const text = agent.read(path)
    if (text !== null) for (const sentence of sentences(text)) appSentences.add(sentence)
  }
  assert.ok(appSentences.size > 0, 'swept no sentences from src/lib/agent: this check has no subject')
  const copies = []
  for (const line of harness.split('\n')) {
    if (!RESULT_POSITION.test(line)) continue
    for (const sentence of sentences(line)) if (appSentences.has(sentence)) copies.push(sentence)
  }
  assert.deepEqual(
    copies,
    [],
    `run.mjs hands a model a sentence the app also says — export it from the src module that owns it, re-export it through app-surface.entry.ts, and use the export: ${copies.map((copy) => JSON.stringify(copy)).join(', ')}`,
  )
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

test('every write tool is a defineWriteTool definition', () => {
  const definitions = toolSources(REPO_ROOT)
  const writes = toolsOnSurface(definitions, 'write')
  assert.equal(writes.length, 20, `expected the twenty write tools, found ${writes.length}`)
  for (const name of writes) {
    assert.ok(
      /^export const \w+ = defineWriteTool\(/m.test(definitions) && definitions.includes(`name: '${name}'`),
      `${name} is on the write surface but no definition declares it`,
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
