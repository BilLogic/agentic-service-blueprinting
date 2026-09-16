/**
 * The guard that keeps every stored key on the namespace seam.
 *
 * `src/lib/storageNamespace.ts` opens by forbidding an inlined prefix, and for
 * three releases one key ignored it: `slide-sheet-height`, written as a bare
 * literal, read back perfectly by the module that wrote it and invisible to
 * every other one. That is the shape this class of defect comes in — a key
 * that works is a key nobody looks at — so the rule is measured rather than
 * stated, and this file is what holds the measurement honest: a planted
 * literal has to fail, and every way the tree legitimately builds a key has to
 * pass. A guard that fires on `storageKey('agent-settings')` is a guard
 * somebody switches off.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'

import { bareKeysIn, findings, isScanned } from '../check-storage-keys.mjs'

const reasons = (source) => bareKeysIn(source).map((hit) => hit.reason)
const expressions = (source) => bareKeysIn(source).map((hit) => hit.expression)

/* ------------------------------------------------------------ the tree */

test('no key the application stores is built outside the seam', () => {
  assert.deepEqual(
    findings().map(({ path, line, expression }) => `${path}:${line} — ${expression}`),
    [],
  )
})

/* ------------------------------------------------------------- planted */

test('a literal passed straight to a store is caught, with its line', () => {
  const found = bareKeysIn(
    'function read() {\n' +
      "  return window.localStorage.getItem('slide-sheet-height')\n" +
      '}\n',
  )
  assert.deepEqual(
    found.map(({ line, expression }) => ({ line, expression })),
    [{ line: 2, expression: "'slide-sheet-height'" }],
  )
})

test('a literal held in a module constant is caught too — the shape it shipped as', () => {
  // The defect never wrote the literal at the call site: it named a constant,
  // which is exactly as unreachable from an installation's prefix and reads
  // like every namespaced key in the tree.
  const source =
    "const STORAGE_KEY = 'slide-sheet-height'\n" +
    'export function persist(height) {\n' +
    '  window.localStorage.setItem(STORAGE_KEY, String(height))\n' +
    '}\n'
  assert.deepEqual(expressions(source), ['STORAGE_KEY'])
  assert.deepEqual(reasons(source), ['a bare literal'])
  assert.deepEqual(
    bareKeysIn(source).map((hit) => hit.line),
    [3],
  )
})

test('sessionStorage is held to the same rule as localStorage', () => {
  assert.deepEqual(
    reasons('window.sessionStorage.setItem("chunk-reload", "1")\n'),
    ['a bare literal'],
  )
})

test('removeItem counts: retiring a key needs the prefix as much as writing one', () => {
  assert.deepEqual(reasons("window.localStorage.removeItem('dev-tier-override')\n"), [
    'a bare literal',
  ])
})

/* ---------------------------------------------------------- legitimate */

test('a key built at the call site passes', () => {
  assert.deepEqual(bareKeysIn("window.localStorage.getItem(storageKey('mobile-paths'))\n"), [])
})

test('a key built into a module constant passes — the idiom the tree uses', () => {
  assert.deepEqual(
    bareKeysIn(
      "const STORAGE_KEY = storageKey('agent-sessions')\n" +
        'window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))\n',
    ),
    [],
  )
})

test('a literal in a comment is not a key', () => {
  assert.deepEqual(
    bareKeysIn(
      '// window.localStorage.getItem(\'slide-sheet-height\') is how it used to read\n' +
        "/* window.localStorage.setItem('x', y) */\n",
    ),
    [],
  )
})

test('clear() and length are not keys, and neither is a store nobody indexes', () => {
  assert.deepEqual(bareKeysIn('window.localStorage.clear()\nwindow.localStorage.length\n'), [])
})

/* ------------------------------------------------------------- subject */

test('the application is in subject; its tests are not', () => {
  // A test has to be able to write the key it is asserting on — this file's
  // siblings in `src/` name `acme-mobile-paths` to prove the prefix moved —
  // and a guard that flagged its neighbour's evidence would be pressure to
  // weaken one of the two.
  assert.equal(isScanned('src/lib/slideSheetHeight.ts'), true)
  assert.equal(isScanned('src/components/editor/EditorShell.tsx'), true)
  assert.equal(isScanned('src/lib/storageNamespace.test.ts'), false)
  assert.equal(isScanned('src/lib/devPortal.test.tsx'), false)
  assert.equal(isScanned('src/slices/agentSession.slice.test.tsx'), false)
  assert.equal(isScanned('src/data/sampleBlueprint.ts'), true)
  assert.equal(isScanned('src/styles/tailwind.config.css'), false)
})

test('the vendored rulebook is out of subject — it is a copy, not a module', () => {
  assert.equal(isScanned('src/lib/agent/skill/map/SKILL.md'), false)
})
