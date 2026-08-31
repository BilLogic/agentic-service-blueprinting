#!/usr/bin/env node
/**
 * Check B — retired database names inside application string literals.
 *
 * This is the class no compiler reaches. `src/types/database.ts` is generated
 * from a built database, so every table and column name arrives in TypeScript
 * by machine and `tsc` fails if the app disagrees. That is why a vocabulary
 * refactor can look clean: the part a compiler can see IS clean. A relation
 * named inside a string is opaque to all of it.
 *
 * Upstream's standing example, which is what this check was written for: a
 * backfill script embedding `phase:phases(lifecycle:service_lifecycles(name))`
 * — a relationship that no longer existed — in a file that typechecked
 * perfectly and could not run. Seven of this package\'s renames create exactly
 * that hazard, and `21000106` renamed a table whose name appears in PostgREST
 * embed hints rather than in any type.
 *
 * SUBJECT, NARROWLY: string literals that NAME A DATABASE OBJECT.
 *
 *   - the argument to `.from(…)` and `.rpc(…)`
 *   - embed hints inside `.select(…)`: the relation in `alias:relation(…)`,
 *     `relation(…)` and `relation!constraint(…)`
 *   - the same syntax inside a raw PostgREST query string — `…?select=…`,
 *     which is how the REST helpers in `scripts/` read
 *   - a SCHEMA-QUALIFIED relation, `public.<name>`, in SQL this repository
 *     GENERATES rather than stores
 *
 * That last one was added by a defect this check watched go past. `21000111`
 * renamed `propositions` to `business_model`, and `generate_seed_sql.py` kept
 * emitting `if to_regclass('public.propositions') is not null then` into every
 * verify script. `to_regclass` returns null for a table that is not there, so
 * the branch simply stopped running: no error, no notice, one line of the
 * analysis-tier report silently gone. A generator is the worst place for this
 * because the string is two removes from anyone reading SQL — and Python is
 * outside every type system in the repository.
 *
 * `public.` is what makes the rule safe. It appears in SQL and nowhere else,
 * so the pattern needs no exemption for prose: the nine occurrences of
 * `public.layers` in this repository are all either comments (stripped) or
 * fixtures in test files (out of subject).
 *
 * NOT every occurrence of a word, and not the column list. A check that
 * matched any string containing "layer" would need an exemption for every
 * sentence of prose in the repository, and each exemption is a place to hide
 * something real. The narrower subject needs none.
 *
 * Static, needs no database, runs in `gates`.
 *
 * Run: node scripts/check-database-names.mjs   (also: npm run check:database-names)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { replacementFor, retiredFragmentsIn } from './retired-vocabulary.mjs'

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname)
const ROOTS = ['src', 'scripts']
const SOURCE = /\.(?:[cm]?[jt]sx?|py)$/
/**
 * Test files are out of subject.
 *
 * Two reasons, and the second is the one that matters. A test that names a
 * dead relation fails the moment it runs, which is what a test is for — the
 * whole reason this check exists is that application code carrying the same
 * string does NOT fail until a user finds it. And a guard's own fixtures have
 * to be able to name dead relations: `scripts/tests/retired-copy.test.mjs`
 * proves the copy guard ignores `.from('service_lifecycles')` by writing
 * exactly that, and a check that flagged its sibling's evidence would be
 * pressure to weaken one of the two.
 */
const TEST_FILE = /(?:\.test\.[cm]?[jt]sx?|_test\.py|^test_.*\.py)$/

/**
 * Database names allowed to keep a retired spelling. Same shape and same two
 * rules as every other list in this batch — see
 * `scripts/tests/retired-vocabulary.test.mjs`.
 *
 * @type {ReadonlyArray<import('./retired-vocabulary.mjs').Exemption>}
 */
export const DATABASE_NAME_EXEMPTIONS = []

/* ------------------------------------------------------------- extraction */

/** Every single-, double- or back-quoted literal, with its line number. */
export function stringLiterals(code) {
  const out = []
  let line = 1
  let i = 0
  while (i < code.length) {
    const char = code[i]
    if (char === '\n') {
      line += 1
      i += 1
      continue
    }
    if (char === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i)
      i = end === -1 ? code.length : end
      continue
    }
    if (char === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2)
      const stop = end === -1 ? code.length : end + 2
      line += (code.slice(i, stop).match(/\n/g) ?? []).length
      i = stop
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      const start = i
      const startLine = line
      i += 1
      while (i < code.length && code[i] !== char) {
        if (code[i] === '\\') i += 1
        else if (code[i] === '\n') line += 1
        i += 1
      }
      i += 1
      out.push({ value: code.slice(start + 1, i - 1), line: startLine, quote: char })
      continue
    }
    i += 1
  }
  return out
}

/**
 * Relation and function names a literal declares, given how it is used.
 *
 * `kind` is `from`, `rpc`, `select` or `url`. Everything but the relation name
 * is deliberately dropped: an alias is the app's own word, a column is not an
 * embed hint, and neither is this check's subject.
 */
export function databaseNames(value, kind) {
  if (kind === 'from' || kind === 'rpc') return [value.trim()].filter(Boolean)
  const source = kind === 'url' ? selectClause(value) : value
  if (!source) return []
  const names = []
  // `alias:relation(`, `relation(`, `relation!constraint(` — the token that
  // immediately precedes an opening parenthesis is the embedded relation.
  // Lookbehind, not a consuming class: an embed opens with the `(` that the
  // previous match had to end on, so consuming the delimiter loses every
  // nested relation after the first.
  for (const match of source.matchAll(
    /(?:^|(?<=[(,]))\s*(?:[A-Za-z_]\w*\s*:\s*)?([A-Za-z_]\w*)\s*(?:!\s*([A-Za-z_]\w*)\s*)?\(/g,
  )) {
    names.push(match[1])
    if (match[2]) names.push(match[2])
  }
  if (kind === 'url') {
    const path = /^\/?([A-Za-z_]\w*)\?/.exec(value)
    if (path) names.push(path[1])
  }
  return names
}

/** The `select=` parameter of a PostgREST query string, or null. */
function selectClause(value) {
  const match = /[?&]select=([^&]*)/.exec(value)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * The same source with every comment blanked out, line numbers intact.
 *
 * A comment naming a relation is not a use of it — the same rule
 * `stripComments` states in `src/lib/tokenModel.ts`. This check flagged its
 * own docstring the first time it ran, which is the cheapest possible
 * demonstration of why.
 */
export function withoutComments(code) {
  let out = ''
  let i = 0
  while (i < code.length) {
    const char = code[i]
    if (char === '/' && (code[i + 1] === '/' || code[i + 1] === '*')) {
      const block = code[i + 1] === '*'
      const end = block ? code.indexOf('*/', i + 2) : code.indexOf('\n', i)
      const stop = end === -1 ? code.length : block ? end + 2 : end
      out += code.slice(i, stop).replace(/[^\n]/g, ' ')
      i = stop
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      const start = i
      i += 1
      while (i < code.length && code[i] !== char) {
        if (code[i] === '\\') i += 1
        i += 1
      }
      i += 1
      out += code.slice(start, i)
      continue
    }
    out += char
    i += 1
  }
  return out
}

/** `alias:relation(` — the PostgREST embedded-relationship syntax. */
const EMBED_SYNTAX = /[A-Za-z_]\w*\s*:\s*[A-Za-z_]\w*\s*\(/

/** Every literal in a file that names a database object, tagged with how. */
/** `public.<relation>` — a qualified name, which only SQL text contains. */
const QUALIFIED = /\bpublic\.([a-z_][a-z0-9_]*)/g

/**
 * Whole-line `#` comments blanked, line numbering preserved.
 *
 * Deliberately not a Python tokenizer. An INLINE `#` is left alone, so a
 * trailing comment naming a retired relation is reported — which is a false
 * positive in the strictest reading and the right answer in practice: a
 * comment in a SQL generator that names a table the schema moved is stale
 * documentation sitting next to the code it describes. The failure this
 * refuses to have is the other one, where a tokenizer that mishandles a
 * triple-quoted string swallows the statement inside it.
 */
export function withoutHashComments(code) {
  return code
    .split('\n')
    .map((line) => (line.trimStart().startsWith('#') ? '' : line))
    .join('\n')
}

/** Schema-qualified relations named in generated or embedded SQL. */
export function qualifiedRelations(code, language = 'javascript') {
  const bare = language === 'python' ? withoutHashComments(code) : withoutComments(code)
  const out = []
  for (const match of bare.matchAll(QUALIFIED)) {
    const line = (bare.slice(0, match.index).match(/\n/g) ?? []).length + 1
    out.push({ line, name: match[1], kind: 'schema-qualified relation' })
  }
  return out
}

/**
 * Every database object a file names, by whichever rule reaches it.
 *
 * Python gets the qualified-relation rule ONLY. The other three read
 * JavaScript string literals through `stringLiterals`, which knows `//`,
 * `/* *\/` and three quote characters — none of which describes a Python
 * triple-quoted string. Running it over `.py` would not find more; it would
 * mis-tokenize and quietly find less.
 */
export function namedObjects(code, language = 'javascript') {
  if (language === 'python') return qualifiedRelations(code, language)
  const out = []
  for (const literal of stringLiterals(code)) {
    if (/[?&]select=/.test(literal.value)) {
      for (const name of databaseNames(literal.value, 'url')) {
        out.push({ ...literal, name, kind: 'PostgREST query string' })
      }
      continue
    }
    // A `select=` clause long enough to need concatenating is split across
    // several literals, and only the first piece carries the `select=`. A
    // backfill script upstream is the whole reason this branch exists: its
    // dead relation sat on the third line of a three-line concatenation, and
    // matching only the piece that opens the query stepped straight over it.
    // The embed grammar — `alias:relation(` — is distinctive enough to stand
    // on its own. No such script is in this tree; the hazard is in the shape.
    if (EMBED_SYNTAX.test(literal.value)) {
      for (const name of databaseNames(literal.value, 'select')) {
        out.push({ ...literal, name, kind: 'embed hint' })
      }
    }
  }
  const bare = withoutComments(code)
  for (const match of bare.matchAll(/\.(from|rpc|select)\s*\(\s*(['"`])((?:[^\\]|\\.)*?)\2/g)) {
    const kind = match[1]
    const line = (bare.slice(0, match.index).match(/\n/g) ?? []).length + 1
    for (const name of databaseNames(match[3], kind)) {
      out.push({ line, name, kind: kind === 'select' ? 'embed hint' : `.${kind}()` })
    }
  }
  out.push(...qualifiedRelations(code, language))
  return out
}

/* ------------------------------------------------------------------- walk */

/**
 * Every source file under `root`, test files excluded.
 *
 * Exported so the copy guard walks the same tree. Upstream's copy guard grew a
 * second walker and its docstring records the sampling gap that caused —
 * `lib/`, `hooks/` and `contexts/` missing from the roots while `components/`
 * was there, so a whole class of file was never read by a guard that reported
 * clean.
 */
export function sourceFilesUnder(root) {
  const abs = resolve(REPO_ROOT, root)
  let stats
  try {
    stats = statSync(abs)
  } catch {
    return []
  }
  if (!stats.isDirectory()) return SOURCE.test(abs) ? [abs] : []
  return readdirSync(abs, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) return []
      const full = join(abs, entry.name)
      if (entry.isDirectory()) return sourceFilesUnder(full)
      if (TEST_FILE.test(entry.name)) return []
      return SOURCE.test(entry.name) ? [full] : []
    })
}

/**
 * Every finding, in file order, each site reported once.
 *
 * The dedupe is not cosmetic. A `.select('alias:relation(…)')` literal matches
 * BOTH extraction paths — the embed-syntax scan over string literals and the
 * `.from|rpc|select(` scan over the comment-stripped source — so one call site
 * yields two identical findings. Upstream prints both. Reporting the same line
 * twice teaches a reader that the count is not the number of places to fix.
 */
export function findings() {
  const out = []
  const seen = new Set()
  for (const root of ROOTS) {
    for (const file of sourceFilesUnder(root)) {
      const relativePath = relative(REPO_ROOT, file).split('\\').join('/')
      const language = file.endsWith('.py') ? 'python' : 'javascript'
      for (const use of namedObjects(readFileSync(file, 'utf8'), language)) {
        const words = retiredFragmentsIn(use.name)
        if (words.length === 0) continue
        const identifier = `${relativePath}:${use.line} ${use.name}`
        if (DATABASE_NAME_EXEMPTIONS.some((entry) => entry.identifier === identifier)) continue
        if (seen.has(identifier)) continue
        seen.add(identifier)
        out.push({ ...use, file: relativePath, identifier, words, replacement: replacementFor(words[0]) })
      }
    }
  }
  return out
}

function main() {
  const problems = findings()
  for (const problem of problems) {
    console.error(
      `::error file=${problem.file},line=${problem.line}::retired database name in a string ` +
        `literal — ${problem.kind} names \`${problem.name}\`, which the schema retired ` +
        `(${problem.words.join(', ')} → ${problem.replacement}). Nothing typechecks this.`,
    )
  }
  if (problems.length > 0) {
    console.error(`\n${problems.length} retired database name(s) inside string literals.`)
    process.exit(1)
  }
  console.log('ok — every database name in a string literal is one the schema still has')
}

if (import.meta.url === `file://${process.argv[1]}`) main()
