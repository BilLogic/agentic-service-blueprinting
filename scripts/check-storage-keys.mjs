#!/usr/bin/env node
/**
 * Every key the application stores is built by the namespace seam.
 *
 * `src/lib/storageNamespace.ts` opens with the rule and the reason: the prefix
 * on a stored key names the INSTALLATION rather than the code, so two
 * installations served from one origin do not read each other's settings,
 * sessions and remembered layout. An adopter sets it in one place, and every
 * module that stores anything asks `storageKey` for its key instead of writing
 * a prefix down.
 *
 *   node scripts/check-storage-keys.mjs   (also: npm run check:storage-keys)
 *
 * The rule was stated and unmeasured, and for three releases one key ignored
 * it. `slide-sheet-height` was a bare literal in `src/lib/slideSheetHeight.ts`,
 * so an installation that named its own namespace covered every key but that
 * one — and nothing could say so, because a literal key works: the module that
 * writes it reads it back. This is the class of defect a guard is for. A wrong
 * key that throws is found in an afternoon; a wrong key that resolves is found
 * by two installations quietly sharing a value.
 *
 * ── The subject ────────────────────────────────────────────────────────────
 *
 * THE APPLICATION — the `app` subject of `sweep.mjs`, which is a deployment's
 * `src` laid over the package's per path, so the walk lands on the files the
 * build resolves. TypeScript only: `.ts` and `.tsx` are where a store is
 * reached at all, and the rule is about code rather than about prose.
 *
 * TESTS ARE OUT. A test has to be able to write the key it asserts on —
 * `src/lib/storageNamespace.test.ts` reads `acme-mobile-paths` by hand to prove
 * the prefix reached a module that never mentions one, and `devPortal.test.tsx`
 * plants a legacy key. That is the same rule `check-database-names.mjs` states
 * for a dead relation: a fixture has to be able to write down what the code
 * under test receives, and a check that flagged its neighbour's evidence would
 * be pressure to weaken one of the two. The vendored rulebook under
 * `src/lib/agent/skill/` is out for the reason every sweep gives: it is a copy.
 *
 * ── What counts as a key, and what the check will accept ───────────────────
 *
 * A key is the first argument to `getItem`, `setItem` or `removeItem` on
 * `localStorage` or `sessionStorage`. `clear()` takes no key and `length`
 * names none, so neither is read. Comments are blanked before the match: the
 * defect's own account of itself names the literal it used to write, and a
 * sentence about a key is not a key.
 *
 * Two spellings pass, and they are the two the tree uses: `storageKey('…')` at
 * the call site, and an identifier whose `const` in the same file is
 * `storageKey('…')` — the module-scope idiom seven modules share. EVERYTHING
 * ELSE FAILS, including a key assembled some third way, and that strictness is
 * deliberate: a guard that accepted any expression it could not read would
 * accept the next literal that arrives behind a helper. A new spelling that is
 * genuinely namespaced is a reason to teach this check the spelling, in one
 * place, with the reason beside it.
 */
import { sweep } from './sweep.mjs'
import { whenRun } from './verdict.mjs'

/** The tree this script runs in: the working directory — never this file's location; `sweep.mjs` says why. */
const REPO_ROOT = process.cwd()

/** Where a key could be reached at all. */
const SOURCE = /\.tsx?$/

/** A test file, by either of the two spellings this tree uses. */
const TEST_FILE = /\.(?:test|slice\.test)\.tsx?$/

/** The vendored copy of `skills/` + `references/`; held identical by its own guard. */
const VENDORED = 'src/lib/agent/skill/'

/** Whether a path in the application is one this check reads. */
export function isScanned(path) {
  if (!SOURCE.test(path)) return false
  if (TEST_FILE.test(path)) return false
  return !path.startsWith(VENDORED)
}

/**
 * `code` with every comment blanked and its newlines kept, so a line number
 * counted afterwards is the line in the file.
 *
 * String-aware, because `'https://…'` is not the start of a comment and a
 * check that thought so would blank the rest of the line — including, in one
 * of these modules, the store call after it.
 */
export function withoutComments(code) {
  let out = ''
  let i = 0
  while (i < code.length) {
    const char = code[i]
    if (char === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i)
      i = end === -1 ? code.length : end
      continue
    }
    if (char === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2)
      const stop = end === -1 ? code.length : end + 2
      // The newlines survive; everything else in the comment does not.
      out += (code.slice(i, stop).match(/\n/g) ?? []).join('')
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

/** A store call and the expression it is handed as a key. */
const STORE_CALL =
  /\b(?:local|session)Storage\s*\.\s*(?:get|set|remove)Item\s*\(\s*([^,)]+)/g

/** `const NAME = <initialiser>` at any depth, for the identifier lookup below. */
const DECLARATION = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*([^\n]+)/g

const NAMESPACED = /^storageKey\s*\(/
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/
const LITERAL = /^['"`]/

/**
 * Every key in `source` that is not built by the seam, with the line it is on.
 *
 * `reason` separates the two failures a reader acts on differently: a literal
 * is a key to route through `storageKey`, and an expression this check cannot
 * follow is a key whose namespacing nobody can see from here — which is the
 * same problem one remove further out.
 */
export function bareKeysIn(source) {
  const code = withoutComments(source)
  const declared = new Map()
  for (const [, name, initialiser] of code.matchAll(DECLARATION)) {
    // The first declaration wins: a name rebound later is a name this check
    // cannot follow, and the initialiser it was given is what it is measured on.
    if (!declared.has(name)) declared.set(name, initialiser.trim())
  }

  const found = []
  for (const match of code.matchAll(STORE_CALL)) {
    const expression = match[1].trim()
    const line = code.slice(0, match.index).split('\n').length
    const resolved =
      IDENTIFIER.test(expression) && declared.has(expression)
        ? declared.get(expression)
        : expression
    if (NAMESPACED.test(resolved)) continue
    found.push({
      line,
      expression,
      reason: LITERAL.test(resolved) ? 'a bare literal' : 'not built by storageKey()',
    })
  }
  return found
}

/**
 * Every key the application stores that the seam does not build, and how many
 * modules were read to find them.
 *
 * `read` is the count handed to the verdict: a file listed and then gone
 * between the listing and the read is skipped, and a sweep where every read
 * skipped measured nothing — which is the empty-subject rule, decided one
 * place for every check rather than restated here.
 */
export function judgeKeys(root = REPO_ROOT) {
  const application = sweep({
    subject: 'app',
    root,
    where: isScanned,
    what: 'application module that could store a key',
  })
  const keys = []
  let read = 0
  for (const path of application.files) {
    const source = application.read(path)
    if (source === null) continue
    read += 1
    for (const hit of bareKeysIn(source)) keys.push({ path, ...hit })
  }
  return { keys, read }
}

/** The keys alone — what a test asserts on, and what a reader is shown. */
export function findings(root = REPO_ROOT) {
  return judgeKeys(root).keys
}

export function judge() {
  const { keys, read } = judgeKeys()
  const judgement = {
    what: 'application module that could store a key',
    count: read,
    line:
      `check-storage-keys: every key stored by ${read} application modules is` +
      ' built by storageKey().',
  }
  if (keys.length === 0) return judgement
  return {
    ...judgement,
    opening: `${keys.length} stored key${keys.length === 1 ? '' : 's'} that an installation's own prefix does not reach:\n`,
    findings: keys.map(({ path, line, expression, reason }) => `  ${path}:${line}  ${expression} — ${reason}`),
    closing:
      "\nBuild the key with storageKey('…') from src/lib/storageNamespace.ts, whose" +
      '\nheader says why the prefix names the installation rather than the code. A' +
      '\nkey that moves this way is read once as absent, so say so in the changeset.' +
      '\n\n  npm run check:storage-keys\n',
  }
}

whenRun(import.meta.url, judge)
