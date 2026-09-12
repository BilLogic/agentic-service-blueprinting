#!/usr/bin/env node
/**
 * Check B — database names inside application string literals.
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
 *     which is how the REST helpers in `scripts/` read, `scripts/agent-harness/`
 *     included: its reads are real reads, against a live project
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
 * NOT every occurrence of a word. A check that matched any string containing
 * "layer" would need an exemption for every sentence of prose in the
 * repository, and each exemption is a place to hide something real. The
 * narrower subject needs none.
 *
 * SECOND ASSERTION: a PostgREST query path, against the schema dump.
 *
 * The rule above is a rename-map lookup, so it only ever sees a name somebody
 * retired AS A WORD — and the map is right to retire few. #173 is the other
 * half. `21000116000000` renamed the `findings` table to `audit_findings` and
 * `findings.note` to `.summary`, and the map deliberately enforces neither
 * fragment: `finding` is the live domain word a panel has to be able to say,
 * and `note` is a live word everywhere else in the tree. So the eval harness
 * went on reading `findings?select=…,note,…` with every guard green, and the
 * same migration's `slices.description`, `slices.origin` and `21000115`'s
 * `slice_items.caption` sat three lines above it for the same reason. Six
 * dead names in one file, none of them a retired word.
 *
 * A raw query path is where this check can stop being lexical and be exact
 * instead. `<relation>?select=<columns>` puts a relation in the one position
 * PostgREST reads as a relation, and everything inside `select=` is either a
 * column of it or an embed of another relation — so both halves can be held
 * against `supabase/generated/portable-core.schema.sql`, the dump of what the
 * migration series builds, which `check:portable-schema` keeps current and
 * `check:rpc-arguments` already reads for its own signatures. A name the dump
 * does not have fails, whether or not anybody wrote it down as retired.
 *
 * The COLUMN half stops at the query path, and stays there on purpose. A
 * `.select('id, name')` string is the same information, but the relation it
 * belongs to is the `.from(…)` on another line, and a check that chased it
 * would be reading a query builder rather than a literal — the moment it
 * guessed wrong it would fail a correct call, which is how a guard gets
 * switched off. A query path carries its own relation, so nothing is guessed.
 *
 * THIRD ASSERTION: a written column list, against the same dump.
 *
 * A query path is not the only string that carries its own relation. So does
 * the SQL this repository GENERATES: `insert into public.<table> (<columns>)`
 * names the relation and its columns in one statement, and `update
 * public.<table> set <column> = …` does the same. The qualified-relation rule
 * above already reads the TABLE out of those statements; it just had nothing
 * to say about the names inside the parentheses.
 *
 * #277 is what that missed. `21000116000000` renamed `slices.description` to
 * `summary` and `slices.origin` to `authorship`, and
 * `skills/slice/scripts/slice_tools.py` went on emitting the retired pair in
 * its column list — an INSERT Postgres rejects outright. Neither word is in
 * the rename map's word lists and neither can be: `description` and `origin`
 * are live columns elsewhere in this schema, which is why
 * `scripts/tests/retired-database-names.test.mjs` asserts
 * `retiredFragmentsIn('slices.description')` is empty. The dump is what
 * separates them, per table, exactly as it does for the query path.
 *
 * ASSEMBLED LISTS ARE DROPPED RATHER THAN GUESSED AT — the rule `selectTree`
 * states for the same reason. `insert into public.lanes ({', '.join(fields)})`
 * has a column list this check cannot read, so it reads none: a list is taken
 * only when every piece of it is a bare identifier. Twenty-six statements in
 * this tree are literal and five are assembled.
 *
 * `skills/` IS IN THE SUBJECT, and was not before. The two shipped skill
 * scripts are the most exposed code in the repository — a model runs them
 * against a real database — and no database-name guard walked them at all.
 * Adding the root costs nothing on the first two assertions: both were already
 * clean there.
 *
 * Static, needs no database, runs in `gates`.
 *
 * Run: node scripts/check-database-names.mjs   (also: npm run check:database-names)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { appPackageRoot, appSourceRoot } from './app-source.mjs'
import { RENAME_MAP, replacementFor, retiredFragmentsIn } from './retired-vocabulary.mjs'

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname)
/**
 * The application, and the directory it sits in.
 *
 * `src` is not a directory of this repository — it is the APPLICATION, and a
 * deployment that reads the application out of the package has none of its
 * own. A walk that resolved `src` against this tree's root would find nothing
 * there, report no findings, and print the same clean line it prints after
 * reading three hundred files. `scripts` and `skills` stay this tree's, because
 * they are: a deployment's scripts are its own.
 */
const APP_SOURCE = appSourceRoot(REPO_ROOT)
const APP_PACKAGE = appPackageRoot(REPO_ROOT)
// `skills/` carries the two scripts a model runs against a live database.
const ROOTS = ['src', 'scripts', 'skills']

/** Which root a relative sweep root hangs off: the application's, or this tree's. */
function baseOf(root) {
  return /^src(?:\/|$)/.test(root) ? APP_PACKAGE : REPO_ROOT
}
const SCHEMA = 'supabase/generated/portable-core.schema.sql'
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
  const abs = resolve(baseOf(root), root)
  let stats
  try {
    stats = statSync(abs)
  } catch (error) {
    // A PATH THE LISTING NAMED AND THE TREE NO LONGER HAS IS SKIPPED, and
    // every other failure throws — the rule the application walk holds,
    // applied here to the stat between the listing and the descent. A bare
    // catch took both cases, which traded a loud failure for a silent one: a
    // root that is unreadable rather than absent swept nothing and printed
    // the line it prints after reading three hundred files. The refusal in
    // `findings` is what stops the skip shrinking the subject quietly.
    if (error.code === 'ENOENT') return []
    throw error
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
 * What a path in a finding is relative to.
 *
 * The application's own package, so a finding reads `src/lib/…` whether that
 * `src` is this repository's or the one inside
 * `node_modules/agentic-service-blueprinting`; this tree's root for everything
 * else, which is this tree's.
 */
function reportBase(file) {
  return file.startsWith(APP_SOURCE + sep) ? APP_PACKAGE : REPO_ROOT
}

/**
 * Why a sweep of `swept` files, `sweptApplication` of them the application's,
 * has no subject — or null when it has one.
 *
 * A WALK THAT FINDS NOTHING IS A FAILURE, not a pass. An empty subject and a
 * clean one print the same green line, and the green one goes on being
 * printed every run after: the run that would have caught the defect looks
 * exactly like the run before it.
 *
 * The application half is counted separately because it can vanish on its
 * own. `src` is not a directory of this repository — it is the APPLICATION,
 * and a deployment reading the application out of the package has none of its
 * own — so a walk that resolved `src` against the wrong root would still read
 * `scripts/` and `skills/`, report no findings, and print clean over the
 * three hundred files it never opened.
 */
export function sweepRefusal({ swept, sweptApplication }) {
  if (swept === 0) {
    return `no source file under ${ROOTS.join(', ')}: this walk has no subject, which is a failure and not a pass`
  }
  if (sweptApplication === 0) {
    return (
      `no application source among the ${swept} file(s) swept: the application is read from ` +
      `${APP_SOURCE}, and a walk that misses it reports clean over every file in it`
    )
  }
  return null
}

/**
 * Every finding, in file order, each site reported once.
 *
 * The dedupe is not cosmetic. A `.select('alias:relation(…)')` literal matches
 * BOTH extraction paths — the embed-syntax scan over string literals and the
 * `.from|rpc|select(` scan over the comment-stripped source — so one call site
 * yields two identical findings. Upstream prints both. Reporting the same line
 * twice teaches a reader that the count is not the number of places to fix.
 *
 * `roots` is the sweep's subject, and is a parameter so the refusal below can
 * be driven through the real walk rather than described beside it.
 *
 * @param {string[]} [roots]
 */
export function findings(roots = ROOTS) {
  const out = []
  const seen = new Set()
  let swept = 0
  let sweptApplication = 0
  for (const root of roots) {
    for (const file of sourceFilesUnder(root)) {
      swept += 1
      if (file.startsWith(APP_SOURCE + sep)) sweptApplication += 1
      const relativePath = relative(reportBase(file), file).split('\\').join('/')
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
  const refusal = sweepRefusal({ swept, sweptApplication })
  if (refusal) throw new Error(refusal)
  return out
}

/* ------------------------------------------------------------ schema dump */

/**
 * Every relation the dump declares: name → its column names.
 *
 * A VIEW maps to `null` — its columns are the projection's business, and a
 * parser that guessed at them would either invent columns or refuse real ones.
 * `null` means "this relation exists, its columns are unchecked", which is the
 * honest half of the answer and the half that matters: a query naming a view
 * still has to name one that is there.
 */
export function schemaRelations(sql) {
  const relations = new Map()
  for (const table of sql.matchAll(/CREATE TABLE public\.([a-z_]+) \(([\s\S]*?)\n\);/g)) {
    const columns = new Set()
    for (const line of table[2].split('\n')) {
      if (/^\s*CONSTRAINT\b/.test(line)) continue
      const column = /^\s+"?([a-z_][a-z0-9_]*)"?\s/.exec(line)
      if (column) columns.add(column[1])
    }
    relations.set(table[1], columns)
  }
  for (const view of sql.matchAll(/CREATE (?:MATERIALIZED )?VIEW public\.([a-z_]+) AS/g)) {
    if (!relations.has(view[1])) relations.set(view[1], null)
  }
  return relations
}

/**
 * The name the rename map pairs with a retired one, or null.
 *
 * Read off the row's PAIRS. Until #279 this took `row.is[at]`, the entry at the
 * same index in a parallel array, which is a guess wherever two names folded
 * onto one: it named `resources.kind` as what `cell_touchpoints.screenshots`
 * became, and no screenshot ever became a kind.
 */
export function renamedTo(...spellings) {
  for (const spelling of spellings) {
    for (const row of RENAME_MAP) {
      const pair = row.renames.find((entry) => entry.from === spelling)
      if (pair && pair.to) return pair.to
    }
  }
  return null
}

/* ------------------------------------------------------------ select list */

/** Top-level commas of a select list — an embed's own commas are its. */
function splitSelect(list) {
  const out = []
  let depth = 0
  let start = 0
  for (let i = 0; i < list.length; i += 1) {
    if (list[i] === '(') depth += 1
    else if (list[i] === ')') depth -= 1
    else if (list[i] === ',' && depth === 0) {
      out.push(list.slice(start, i))
      start = i + 1
    }
  }
  out.push(list.slice(start))
  return out.filter((entry) => entry.trim())
}

/**
 * The tree a `select=` clause describes: `{ name, columns }`, where `columns`
 * is null for a plain column and the parsed list for an embedded relation.
 *
 * Anything that is not a bare identifier or an embed is DROPPED rather than
 * guessed at — `*`, a JSON path (`value_props->>0`), a cast, and the `${…}` a
 * template literal leaves behind when the query is assembled from variables.
 * Each of those is a real thing to select and none of them is a name this
 * check can hold against a column list, so the tree carries what it can prove
 * and stays silent about the rest.
 */
export function selectTree(list) {
  const out = []
  for (const piece of splitSelect(list)) {
    const embed =
      /^\s*(?:[A-Za-z_]\w*\s*:\s*)?([A-Za-z_]\w*)\s*(?:!\s*[A-Za-z_]\w*\s*)?\(([\s\S]*)\)\s*$/.exec(
        piece,
      )
    if (embed) {
      out.push({ name: embed[1], columns: selectTree(embed[2]) })
      continue
    }
    const column = /^\s*(?:[A-Za-z_]\w*\s*:\s*)?([A-Za-z_]\w*)\s*$/.exec(piece)
    if (column) out.push({ name: column[1], columns: null })
  }
  return out
}

/**
 * Every raw PostgREST query path in a file — `<relation>?select=<columns>`.
 *
 * The shape is what makes the second assertion possible: a literal opening
 * `<identifier>?` names a RELATION in the position PostgREST reads it, and
 * everything in its `select=` is either a column of that relation or an embed
 * of another one. No other string in this repository can be read that
 * confidently, which is why the column half of the check stops here.
 */
export function postgrestQueries(code) {
  const out = []
  for (const literal of stringLiterals(code)) {
    const path = /^\/?([A-Za-z_]\w*)\?/.exec(literal.value)
    if (!path) continue
    const clause = selectClause(literal.value)
    if (clause === null) continue
    out.push({ line: literal.line, table: path[1], columns: selectTree(clause) })
  }
  return out
}

/**
 * Every name in one query that the schema does not have, relation first.
 *
 * A relation the dump lacks is still followed THROUGH the rename map rather
 * than abandoned, because the two halves of one rename are one defect: the
 * table `findings` and the column `note` moved in the same migration, and a
 * check that reported the table and then went quiet about the column would
 * send somebody back for a second round trip against a live database.
 */
export function unknownNames(table, columns, relations) {
  const known = relations.get(table)
  const renamed = known === undefined ? renamedTo(table) : null
  const resolved = known === undefined ? relations.get(renamed) : known
  const out =
    known === undefined ? [{ relation: null, name: table, renamed, kind: 'relation' }] : []
  if (resolved === undefined || resolved === null) return out
  const spelled = renamed ?? table
  for (const entry of columns) {
    if (entry.columns === null) {
      if (resolved.has(entry.name)) continue
      out.push({
        relation: spelled,
        name: entry.name,
        renamed: renamedTo(`${table}.${entry.name}`, `${spelled}.${entry.name}`),
        kind: 'column',
      })
      continue
    }
    out.push(...unknownNames(entry.name, entry.columns, relations))
  }
  return out
}

/**
 * Every query in the tree naming something the schema dump does not have.
 *
 * Sites the retired-word pass already reported are dropped: one rename is one
 * fix, and a name that is both retired and gone would otherwise be printed
 * twice — the same reason `findings()` dedupes within itself.
 */
export function strayNames(reported = new Set()) {
  const relations = schemaRelations(readFileSync(join(REPO_ROOT, SCHEMA), 'utf8'))
  if (relations.size === 0) throw new Error(`no relations parsed from ${SCHEMA}`)
  const out = []
  for (const root of ROOTS) {
    for (const file of sourceFilesUnder(root)) {
      if (file.endsWith('.py')) continue
      const relativePath = relative(REPO_ROOT, file).split('\\').join('/')
      for (const query of postgrestQueries(readFileSync(file, 'utf8'))) {
        for (const stray of unknownNames(query.table, query.columns, relations)) {
          const identifier = `${relativePath}:${query.line} ${stray.name}`
          if (reported.has(identifier)) continue
          out.push({ ...stray, file: relativePath, line: query.line, identifier })
        }
      }
    }
  }
  return out
}

/* --------------------------------------------------- generated SQL writes */

/**
 * The same source with adjacent string literals joined, line numbers intact.
 *
 * A statement too long for one line is written as two literals — Python
 * concatenates them implicitly, JavaScript with `+` — and the seam is
 * invisible to a pattern that reads one literal at a time. `slice_tools.py`
 * is that shape exactly: `"insert into public.slices "` on one line and
 * `"(id, service_id, kind, …) values ("` on the next, so the relation and its
 * column list live in different strings. A rule matching either alone sees a
 * table with no columns, or a column list belonging to nothing.
 *
 * The quotes become SPACES rather than vanishing, and newlines are kept — the
 * rule `withoutHashComments` states: a finding that points at the wrong line
 * is worse than a finding nobody can find.
 */
export function joinAdjacentLiterals(code) {
  return code.replace(/(['"])[ \t\r\n]*\+?[ \t\r\n]*\1/g, (match) =>
    match.replace(/[^\n]/g, ' '),
  )
}

/** `insert into public.<table> (<columns>)` — the list is parenthesised and flat. */
const INSERT_LIST = /insert\s+into\s+public\.([a-z_][a-z0-9_]*)\s*\(([^)]*)\)/gi
/** `update public.<table> set …` up to the clause that ends the assignments. */
const UPDATE_SET =
  /update\s+public\.([a-z_][a-z0-9_]*)\s+set\s+([\s\S]*?)(?:\bwhere\b|\breturning\b|;)/gi
/** `<column> =` at the head of a SET clause or after one of its commas. */
const ASSIGNED = /(?:^|,)\s*"?([a-z_][a-z0-9_]*)"?\s*=/g
/** A column list piece that is a bare name — quoted only because `position` is reserved. */
const COLUMN_TOKEN = /^"?([a-z_][a-z0-9_]*)"?$/

/**
 * Every relation a file WRITES in generated SQL, with the columns it names.
 *
 * `verb` is `insert` or `update`. Both statements carry their own relation, so
 * nothing about the binding is guessed — which is the property the query-path
 * rule needed and a `.select()` string does not have.
 *
 * A column list is read only when EVERY piece of it is a bare identifier.
 * `insert into public.lanes ({', '.join(fields)})` is assembled from a
 * variable, and a check that read `{'` as a column would fail a correct
 * generator on its first run. Dropping it is the same refusal `selectTree`
 * makes about a cast or a JSON path: carry what can be proved, stay silent
 * about the rest.
 */
export function writtenColumns(code, language = 'javascript') {
  const bare = joinAdjacentLiterals(
    language === 'python' ? withoutHashComments(code) : withoutComments(code),
  )
  const at = (index) => (bare.slice(0, index).match(/\n/g) ?? []).length + 1
  const out = []
  for (const match of bare.matchAll(INSERT_LIST)) {
    const pieces = match[2].split(',').map((piece) => piece.trim()).filter(Boolean)
    if (pieces.length === 0 || !pieces.every((piece) => COLUMN_TOKEN.test(piece))) continue
    out.push({
      line: at(match.index),
      table: match[1],
      columns: pieces.map((piece) => COLUMN_TOKEN.exec(piece)[1]),
      verb: 'insert',
    })
  }
  for (const match of bare.matchAll(UPDATE_SET)) {
    const columns = [...match[2].matchAll(ASSIGNED)].map((one) => one[1])
    if (columns.length === 0) continue
    out.push({ line: at(match.index), table: match[1], columns, verb: 'update' })
  }
  return out.sort((a, b) => a.line - b.line || a.table.localeCompare(b.table))
}

/**
 * Every generated write naming a relation or column the schema dump lacks.
 *
 * A VIEW is skipped once named: `schemaRelations` maps it to `null` because a
 * projection's columns are its own business, and inventing them here would
 * either refuse real columns or accept absent ones.
 */
export function strayWrites(reported = new Set()) {
  const relations = schemaRelations(readFileSync(join(REPO_ROOT, SCHEMA), 'utf8'))
  if (relations.size === 0) throw new Error(`no relations parsed from ${SCHEMA}`)
  const out = []
  for (const root of ROOTS) {
    for (const file of sourceFilesUnder(root)) {
      const relativePath = relative(REPO_ROOT, file).split('\\').join('/')
      const language = file.endsWith('.py') ? 'python' : 'javascript'
      for (const write of writtenColumns(readFileSync(file, 'utf8'), language)) {
        const known = relations.get(write.table)
        const site = (name) => `${relativePath}:${write.line} ${name}`
        if (known === undefined) {
          if (reported.has(site(write.table))) continue
          out.push({
            file: relativePath,
            line: write.line,
            verb: write.verb,
            relation: null,
            name: write.table,
            renamed: renamedTo(write.table),
            kind: 'relation',
            identifier: site(write.table),
          })
          continue
        }
        if (known === null) continue
        for (const column of write.columns) {
          if (known.has(column) || reported.has(site(column))) continue
          out.push({
            file: relativePath,
            line: write.line,
            verb: write.verb,
            relation: write.table,
            name: column,
            renamed: renamedTo(`${write.table}.${column}`),
            kind: 'column',
            identifier: site(column),
          })
        }
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
  const strays = strayNames(new Set(problems.map((problem) => problem.identifier)))
  for (const stray of strays) {
    const what =
      stray.kind === 'relation'
        ? `names \`${stray.name}\`, which is not a table or view in ${SCHEMA}`
        : `selects \`${stray.name}\`, which is not a column of \`${stray.relation}\` in ${SCHEMA}`
    console.error(
      `::error file=${stray.file},line=${stray.line}::PostgREST query string ${what}` +
        `${stray.renamed ? ` (→ \`${stray.renamed}\`)` : ''}. Nothing typechecks this.`,
    )
  }
  const writes = strayWrites(
    new Set([...problems.map((problem) => problem.identifier), ...strays.map((stray) => stray.identifier)]),
  )
  for (const write of writes) {
    const what =
      write.kind === 'relation'
        ? `names \`${write.name}\`, which is not a table or view in ${SCHEMA}`
        : `writes \`${write.name}\`, which is not a column of \`${write.relation}\` in ${SCHEMA}`
    console.error(
      `::error file=${write.file},line=${write.line}::generated ${write.verb.toUpperCase()} ${what}` +
        `${write.renamed ? ` (→ \`${write.renamed}\`)` : ''}. Postgres rejects the statement; nothing here typechecks.`,
    )
  }
  if (problems.length + strays.length + writes.length > 0) {
    if (problems.length > 0)
      console.error(`\n${problems.length} retired database name(s) inside string literals.`)
    if (strays.length > 0)
      console.error(
        `\n${strays.length} name(s) in a PostgREST query string that ${SCHEMA} does not have.` +
          ` Fix the query, or regenerate the dump with \`npm run generate:portable-schema\`.`,
      )
    if (writes.length > 0)
      console.error(
        `\n${writes.length} name(s) in generated SQL that ${SCHEMA} does not have.` +
          ` Fix the statement, or regenerate the dump with \`npm run generate:portable-schema\`.`,
      )
    process.exit(1)
  }
  console.log(
    'ok — every database name in a string literal is one the schema still has, every' +
      ' PostgREST query names a relation and columns the dump declares, and every generated' +
      ' INSERT and UPDATE writes columns the dump has',
  )
}

if (import.meta.url === `file://${process.argv[1]}`) main()
