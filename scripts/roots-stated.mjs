/**
 * Every place this tree STATES where the application is.
 *
 * Where the application lives is one fact, and more than one file has to say
 * it: the Vite config for the bundler, the two tsconfigs for the compiler,
 * `app-source.mjs` for every check that walks the tree, and any script that
 * resolves a particular application file before `app-source.mjs` could be
 * asked. None can be derived from the others — a compiler cannot import a
 * module, and the config is bundled on its own in a tree that may not have
 * this module at all — so what makes them one fact is a test.
 *
 * THE TEST USED TO NAME FOUR FILES. A fifth was added and the test did not
 * know: `agent-account.mjs` grew its own pair, correct on the day it was
 * written and held by nothing afterwards, which is precisely the drift the
 * test exists to prevent. So the subject is DISCOVERED here instead of listed
 * there — a sixth statement is found the moment it is written, and a statement
 * that stops agreeing is found the moment it stops.
 *
 * WHAT COUNTS AS A STATEMENT: a path under the package's own `src`, IN CODE.
 * A docblock explaining the arrangement names both roots in prose and in
 * whichever order the sentence wanted; it resolves nothing, and holding it to
 * the order would be holding an explanation to a rule about execution. So
 * comments are blanked before the sweep — their newlines kept, so a line
 * number still means what it says.
 *
 * The
 * package may be named as a literal or through a constant the file holds, so
 * both spellings are read. What is REQUIRED of each is that the same path
 * under this repository's own `src` is stated in the same file, first —
 * the order is the rule, because the first root that exists wins and a pair in
 * the other order is a different answer on a tree that has both.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/** The package a deployment reads the application out of. */
export const APP_PACKAGE = 'agentic-service-blueprinting'

/**
 * A path under the package's application root, the package named either way.
 *
 * `${PACKAGE}` and its neighbours are how a file that already holds the name
 * as a constant writes it; a statement is no less a statement for being
 * interpolated, and the fifth one this test did not know about was written
 * exactly that way.
 */
const PACKAGED = new RegExp(
  `node_modules/(?:${APP_PACKAGE}|\\$\\{[A-Za-z_][A-Za-z0-9_]*\\})/src`,
  'g',
)

/** Where a path ends: the quote, space or punctuation that closes it. */
const PATH_END = /[`'"\s,)\]}]/

/**
 * Comments blanked, newlines kept: a docblock is not a statement.
 *
 * STRING-AWARE, because `"@/*"` is a tsconfig key and not the start of a block
 * comment. A stripper that missed that blanked the rest of the file and the
 * two tsconfigs dropped out of the sweep entirely — which is the sweep
 * reporting that every statement it found agrees, having lost the ones that
 * matter most.
 */
export function withoutComments(code) {
  let out = ''
  let i = 0
  const blank = (text) => text.replace(/[^\n]/g, ' ')
  while (i < code.length) {
    const char = code[i]
    if (char === '"' || char === "'" || char === '`') {
      const start = i
      i += 1
      while (i < code.length && code[i] !== char) {
        if (code[i] === '\\') i += 1
        i += 1
      }
      out += code.slice(start, Math.min(i + 1, code.length))
      i += 1
      continue
    }
    if (char === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i)
      const stop = end === -1 ? code.length : end
      out += blank(code.slice(i, stop))
      i = stop
      continue
    }
    if (char === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2)
      const stop = end === -1 ? code.length : end + 2
      out += blank(code.slice(i, stop))
      i = stop
      continue
    }
    out += char
    i += 1
  }
  return out
}

/**
 * The files that RESOLVE the roots: the build configuration and the checks.
 *
 * Not `scripts/tests/`. A test asserts ABOUT the statements — it quotes them,
 * in regular expressions and in fixtures whose roots are `/repo` — and quoting
 * a fact is not stating it. A lockfile is excluded for the same reason it is
 * never read by hand: it names the package as a dependency, which is a
 * different sentence about a different thing.
 */
export function filesThatResolveTheRoots(repoRoot) {
  const found = readdirSync(repoRoot)
    .filter((name) => /\.(?:json|ts|js|mjs|cjs|mts|cts)$/.test(name))
    .filter((name) => !/(?:package-lock|npm-shrinkwrap)\.json$/.test(name))
    .map((name) => join(repoRoot, name))
  const scripts = join(repoRoot, 'scripts')
  const walk = (dir) => {
    for (const entry of readdirSync(dir).sort()) {
      if (entry === 'tests' || entry.startsWith('.')) continue
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) walk(path)
      else if (/\.(?:mjs|mts|cjs|js|ts)$/.test(entry)) found.push(path)
    }
  }
  walk(scripts)
  return found.sort()
}

/**
 * Every statement of the pair in `repoRoot`, discovered.
 *
 * @returns {{ file: string, packaged: string, repository: string, ordered: boolean }[]}
 */
export function statementsOfTheRoots(repoRoot) {
  const statements = []
  for (const path of filesThatResolveTheRoots(repoRoot)) {
    const text = withoutComments(readFileSync(path, 'utf8'))
    for (const match of text.matchAll(PACKAGED)) {
      const after = text.slice(match.index + match[0].length)
      const stop = after.search(PATH_END)
      const suffix = stop === -1 ? after : after.slice(0, stop)
      const repository = `src${suffix}`
      // The repository's own statement of the same path, not counting the one
      // that is the tail of this packaged path.
      const before = text.slice(0, match.index)
      const ordered = before.split(repository).length > 1
      statements.push({
        file: relative(repoRoot, path).split('\\').join('/'),
        packaged: `${match[0]}${suffix}`,
        repository,
        ordered,
      })
    }
  }
  return statements
}
