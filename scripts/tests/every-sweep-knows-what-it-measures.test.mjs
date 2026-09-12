#!/usr/bin/env node
/**
 * No script names an application path without knowing where the application is.
 *
 * A deployment installs this repository as a package and reads the application
 * out of `node_modules/agentic-service-blueprinting/src`, with no `src` of its
 * own. `src/lib/agent/tools/specs.ts` written by hand is a file that is not
 * there: the check either crashes or sweeps an empty set and reports success —
 * and the second goes on reporting it, because a check that has stopped
 * looking prints the same line as one that looked and found nothing.
 *
 * Two answers are correct and this holds both apart. A script that measures
 * the APPLICATION resolves through `app-source.mjs`. A script that measures
 * THIS REPOSITORY — a generator writing into its own `src/data`, the vendoring
 * sync, a `git ls-files` sweep of what this commit would carry — says so on
 * `repository-only.mjs`, with the reason, so that the next sweep through these
 * files does not re-decide the same handful.
 *
 * WHAT IS NOT CHECKED HERE is whether a resolving script resolves EVERY path
 * it names; a file that imports `app-source.mjs` is taken at its word. This
 * guard is for the file that was written without the question being asked at
 * all, which is how all of them got here.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { REPOSITORY_ONLY, REPOSITORY_ONLY_SCRIPTS } from '../repository-only.mjs'

const REPO_ROOT = process.cwd()

/**
 * The resolver itself, and the two files that describe the arrangement.
 *
 * `app-source.mjs` states the roots — it is where the answer is, so it cannot
 * be asked to import itself. The other two hold the lists this test reads.
 */
const NOT_A_SWEEP = new Set([
  'scripts/app-source.mjs',
  'scripts/roots-stated.mjs',
  'scripts/repository-only.mjs',
])

/** Every script, tests excluded — a fixture is allowed to name anything. */
export function scriptsUnder(root) {
  const found = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir).sort()) {
      if (entry === 'tests' || entry.startsWith('.')) continue
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) walk(path)
      else if (/\.(?:mjs|cjs|js|mts|cts|ts|py)$/.test(entry)) found.push(path)
    }
  }
  walk(join(root, 'scripts'))
  return found.map((path) => relative(root, path).split('\\').join('/')).sort()
}

/** Comments blanked, newlines kept, so a docblock naming a path is not a use. */
export function withoutComments(code, python = false) {
  let out = ''
  let i = 0
  const blank = (text) => text.replace(/[^\n]/g, ' ')
  while (i < code.length) {
    const char = code[i]
    if (!python && char === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i)
      i = end === -1 ? code.length : end
      continue
    }
    if (!python && char === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2)
      const stop = end === -1 ? code.length : end + 2
      out += blank(code.slice(i, stop))
      i = stop
      continue
    }
    if (python && char === '#') {
      const end = code.indexOf('\n', i)
      i = end === -1 ? code.length : end
      continue
    }
    if (python && (code.startsWith('"""', i) || code.startsWith("'''", i))) {
      const quote = code.slice(i, i + 3)
      const end = code.indexOf(quote, i + 3)
      const stop = end === -1 ? code.length : end + 3
      out += blank(code.slice(i, stop))
      i = stop
      continue
    }
    out += char
    i += 1
  }
  return out
}

/** Every quoted literal in `code`. */
const LITERAL = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g

/**
 * A literal that is a path into the application: `src`, `src/…`, `../src`.
 *
 * Whitespace disqualifies it, which is what separates a path from a sentence
 * about one — `'src/types/database.ts has drifted from the schema'` is a
 * failure message, and a check is entitled to name the file it is reporting on.
 */
export function applicationPathsIn(code, python = false) {
  const found = []
  for (const match of withoutComments(code, python).matchAll(LITERAL)) {
    const value = match[2]
    if (/\s/.test(value)) continue
    if (/^(?:\.{1,2}\/)*src(?:\/|$)/.test(value)) found.push(value)
  }
  return found
}

/** Whether a script asks `app-source.mjs` where the application is. */
export function resolvesTheApplication(code) {
  return /from\s+'[^']*app-source\.mjs'/.test(code)
}

test('every script naming an application path either resolves it or says it is this repository’s', () => {
  const unresolved = []
  for (const script of scriptsUnder(REPO_ROOT)) {
    if (NOT_A_SWEEP.has(script) || REPOSITORY_ONLY_SCRIPTS.includes(script)) continue
    const code = readFileSync(join(REPO_ROOT, script), 'utf8')
    const paths = applicationPathsIn(code, script.endsWith('.py'))
    if (paths.length === 0 || resolvesTheApplication(code)) continue
    unresolved.push(`${script}: ${[...new Set(paths)].join(', ')}`)
  }
  assert.deepEqual(
    unresolved,
    [],
    'These scripts name a path into the application and never ask where the ' +
      'application is. In a deployment that reads it out of the package there ' +
      'is no `src`, so each one either fails there or sweeps nothing and ' +
      'reports success. Resolve through scripts/app-source.mjs, or add the ' +
      'script to scripts/repository-only.mjs with the reason it measures this ' +
      `repository alone:\n${unresolved.join('\n')}`,
  )
})

test('the sweep read scripts, and enough of them to mean something', () => {
  // The shape the assertion above cannot see from the inside: a walk that
  // stopped descending reports no unresolved script, which is exactly what a
  // clean tree reports.
  const scripts = scriptsUnder(REPO_ROOT)
  assert.ok(scripts.length > 20, `only ${scripts.length} scripts in the subject`)
  assert.ok(
    scripts.includes('scripts/app-source.mjs'),
    'the walk did not reach scripts/app-source.mjs, so it is not reading scripts/',
  )
})

test('every repository-only script is a file that is here, with a reason', () => {
  // A list that names a file nobody has is a list that exempts nothing and
  // says it did.
  const missing = REPOSITORY_ONLY_SCRIPTS.filter(
    (script) => !existsSync(join(REPO_ROOT, script)),
  )
  assert.deepEqual(missing, [], `repository-only scripts that are not here: ${missing.join(', ')}`)
  assert.ok(REPOSITORY_ONLY.length > 0, 'the repository-only list is empty')
  for (const entry of REPOSITORY_ONLY) {
    assert.ok(
      entry.why && entry.why.length > 40,
      `${entry.script} is exempted without a reason worth reading`,
    )
  }
})

test('a repository-only listing is not a place to park an application sweep', () => {
  // Every entry has to still BE repository-only. The two shapes the list
  // admits are a write into this tree's own application and a `git ls-files`
  // sweep of what this commit would carry; a file doing neither is a file that
  // was put here to quiet the guard.
  const wrong = []
  for (const entry of REPOSITORY_ONLY) {
    const code = readFileSync(join(REPO_ROOT, entry.script), 'utf8')
    const writes = /writeFileSync|copyFileSync|mkdirSync|\bPath\(|\.write_text\(/.test(code)
    const listsTheCommit = /ls-files/.test(code)
    if (!writes && !listsTheCommit) wrong.push(entry.script)
  }
  assert.deepEqual(
    wrong,
    [],
    'a script on the repository-only list neither writes into this tree nor ' +
      `sweeps what this commit would carry:\n${wrong.join('\n')}`,
  )
})
