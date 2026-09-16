/**
 * The guard that keeps every stored key on the namespace seam.
 *
 * `src/lib/storageNamespace.ts` opens by forbidding an inlined prefix, and one
 * key ignored it for every release since the slide sheet landed — the incident
 * is in `scripts/check-storage-keys.mjs`'s header, which is its one home. That
 * is the shape this class of defect comes in: a key that works is a key nobody
 * looks at. So the rule is measured rather than stated, and this file is what
 * holds the measurement honest — a planted literal has to fail, every way the
 * tree legitimately builds a key has to pass, and the spellings that put a
 * store beyond the patterns here have to be refused rather than missed. A guard
 * that fires on `storageKey('agent-settings')` is a guard somebody switches
 * off; a guard that passes a store bound to a local name is one that reports
 * nothing.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'

import { balanced, bareKeysIn, findings, isScanned } from '../check-storage-keys.mjs'

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

/* ----------------------------------------------- the spellings it now reads */

test('a computed method name is a store call', () => {
  assert.deepEqual(reasons("window.localStorage['setItem']('bare', '1')\n"), ['a bare literal'])
})

test('a computed store name is a store call', () => {
  assert.deepEqual(reasons("window['localStorage'].setItem('bare', '1')\n"), ['a bare literal'])
})

test('a store bound to a name is refused where it is bound', () => {
  // The call after it names no store, so no pattern here could read its key.
  // Refusing the binding turns a blind spot into a failure that says what it
  // wants instead.
  const found = bareKeysIn(
    'const store = window.localStorage\n' + "store.setItem('bare', '1')\n",
  )
  assert.deepEqual(
    found.map(({ line, reason }) => ({ line, reason })),
    [{ line: 1, reason: 'a store bound to a name, whose keys nothing here can follow' }],
  )
})

test('a destructured store method is refused the same way', () => {
  assert.deepEqual(reasons('const { setItem } = window.localStorage\n'), [
    'a store method destructured, so the call names no store at all',
  ])
})

test('reading through the store in one expression is not a binding', () => {
  // The whole tree does this, and a deny rule that fired on it would be off
  // within a week.
  assert.deepEqual(
    bareKeysIn("const raw = window.localStorage.getItem(storageKey('agent-settings'))\n"),
    [],
  )
})

/* ------------------------------------------------------------- shadowing */

test('a name declared twice fails, whichever declaration looks innocent', () => {
  // The module-scope constant is namespaced and the local one is not, and which
  // of them reaches the call is exactly what a regex cannot answer. Taking the
  // first would pass the literal on the namespaced key's authority.
  const found = bareKeysIn(
    "const K = storageKey('agent-settings')\n" +
      'export function oops() {\n' +
      "  const K = 'bare'\n" +
      '  window.localStorage.setItem(K, "1")\n' +
      '}\n',
  )
  assert.deepEqual(
    found.map(({ line, expression, reason }) => ({ line, expression, reason })),
    [{ line: 4, expression: 'K', reason: 'not built by storageKey()' }],
  )
})

/* ----------------------------------------------------------- the message */

test('a truncated key expression is printed with its parentheses closed', () => {
  // The capture stops at the first `)`, which is enough to judge and not enough
  // to print: `namespacedKey('third'` reads as a typo in the reader's own code.
  assert.equal(balanced("namespacedKey('third'"), "namespacedKey('third')")
  assert.deepEqual(
    expressions("window.localStorage.getItem(namespacedKey('third'))\n"),
    ["namespacedKey('third')"],
  )
})

/* --------------------------------------------------------------- cookies */

test('a bare cookie name is caught, and the name is the subject rather than the write', () => {
  // The write carries a path and a max-age, which are attributes rather than
  // keys: everything before the first `=` is the one thing a prefix reaches.
  const found = bareKeysIn(
    'function remember(open) {\n' +
      '  document.cookie = `sidebar_state=${open}; path=/; max-age=604800`\n' +
      '}\n',
  )
  assert.deepEqual(
    found.map(({ line, expression, reason }) => ({ line, expression, reason })),
    [{ line: 2, expression: "'sidebar_state'", reason: 'a bare literal' }],
  )
})

test('a cookie written as one quoted string is read the same way', () => {
  assert.deepEqual(reasons(`document.cookie = 'sidebar_state=true; path=/'\n`), [
    'a bare literal',
  ])
})

test('a cookie name held in a module constant is caught too', () => {
  const source =
    'const COOKIE_NAME = "sidebar_state"\n' +
    'document.cookie = `${COOKIE_NAME}=${open}; path=/`\n'
  assert.deepEqual(expressions(source), ['COOKIE_NAME'])
  assert.deepEqual(reasons(source), ['a bare literal'])
})

test('a cookie name off the seam passes, at the call site and through a constant', () => {
  assert.deepEqual(
    bareKeysIn("document.cookie = `${storageKey('sidebar_state')}=${open}; path=/`\n"),
    [],
  )
  assert.deepEqual(
    bareKeysIn(
      "const COOKIE_NAME = storageKey('sidebar_state')\n" +
        'document.cookie = `${COOKIE_NAME}=${open}; path=/; max-age=${AGE}`\n',
    ),
    [],
  )
})

test('a computed jar is a cookie write', () => {
  assert.deepEqual(reasons('document["cookie"] = `sidebar_state=${open}`\n'), [
    'a bare literal',
  ])
})

test('a cookie name assembled some third way is refused rather than missed', () => {
  assert.deepEqual(reasons('document.cookie = name + "=" + String(open)\n'), [
    'not built by storageKey()',
  ])
})

test('a jar reached through a name is refused where the write is', () => {
  // `const jar = document` puts the write beyond the pattern that reads one,
  // so the write itself says what it wants instead of passing unread.
  assert.deepEqual(reasons('const jar = document\njar.cookie = `${COOKIE_NAME}=1`\n'), [
    'a cookie written through a document this check cannot name',
  ])
})

test('reading the jar names no cookie, so it is not a write', () => {
  assert.deepEqual(bareKeysIn('const jar = document.cookie\n'), [])
})
