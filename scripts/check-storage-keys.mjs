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
 * THE INCIDENT, and this is its one home — every other statement of it points
 * here rather than restating it. The rule was stated and unmeasured from the
 * day the seam existed, and one key ignored it for every release since the
 * slide sheet landed: `slide-sheet-height`, a bare literal in
 * `src/lib/slideSheetHeight.ts`, so an installation that named its own
 * namespace covered every key but that one. Nothing could say so, because a
 * literal key WORKS — the module that writes it reads it back — and only a
 * second installation on the origin ever finds out. That is the class of
 * defect a guard is for: a wrong key that throws is found in an afternoon.
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
 * be pressure to weaken one of the two.
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
 * the call site, and an identifier declared ONCE in the file as
 * `storageKey('…')` — the module-scope idiom eight modules share. Every other
 * key expression at a store call fails, including one assembled some third way
 * and one this check simply cannot follow, and that strictness is deliberate: a
 * guard that accepted what it could not read would accept the next literal
 * arriving behind a helper. A name declared twice in a file fails too, because
 * the declaration reaching the call is the one a regex cannot pick — and taking
 * the first would be exactly the permissive branch this paragraph refuses. A
 * new spelling that is genuinely namespaced is a reason to teach the check that
 * spelling, in one place, with the reason beside it.
 *
 * WHAT IT IS BLIND TO, so the claim above is not read wider than it is. This
 * reads text, not a syntax tree, so a store reached other than by naming it at
 * the call site is out of reach: `const store = window.localStorage` and
 * `const { setItem } = window.localStorage` put the call beyond any pattern
 * here. Neither is silently allowed — both are DENIED coarsely, by the store
 * appearing as a bound value rather than as the receiver of a call — which
 * turns a blind spot into a failure that says what it wants instead. The
 * spellings that ARE read include computed member access
 * (`localStorage['setItem'](…)`, `window['localStorage'].setItem(…)`), because
 * they name the store and the method where a reader of the line expects them.
 * A store handed to a function as an argument remains out of reach, and would
 * be a reason to reach for a parser rather than to widen these patterns.
 */
import { sweep } from './sweep.mjs'
import { whenRun } from './verdict.mjs'

/** The tree this script runs in: the working directory — never this file's location; `sweep.mjs` says why. */
const REPO_ROOT = process.cwd()

/** Where a key could be reached at all. */
const SOURCE = /\.tsx?$/

/** A test file, spelled as the rest of this repository's checks spell it. */
const TEST_FILE = /\.test\.tsx?$/

/** Whether a path in the application is one this check reads. */
export function isScanned(path) {
  if (!SOURCE.test(path)) return false
  return !TEST_FILE.test(path)
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

/**
 * A store call and the expression it is handed as a key.
 *
 * The store may be named plainly or through a computed member
 * (`window['localStorage']`), and so may the method — both spellings name the
 * two things a reader of the line is looking for, so both are read.
 */
const STORE_CALL =
  /\b(?:local|session)Storage\b(?:['"]\s*\])?\s*(?:\.\s*(?:get|set|remove)Item|\[\s*['"](?:get|set|remove)Item['"]\s*\])\s*\(\s*([^,)]+)/g

/**
 * A store taken as a VALUE rather than called: bound to a name, or picked
 * apart. The call that follows is beyond every pattern here, so it is refused
 * where it is created instead — coarse on purpose, and a refusal rather than a
 * silence.
 */
const ESCAPED_STORE = [
  // The narrower rule first: a destructuring is also an assignment, and one
  // line deserves the finding that names what is actually on it.
  {
    label: 'a store method destructured, so the call names no store at all',
    test: /\{[^}]*\}\s*=\s*(?:(?:window|globalThis)\s*(?:\.\s*|\[\s*['"]))?(?:local|session)Storage\b/,
  },
  {
    label: 'a store bound to a name, whose keys nothing here can follow',
    test: /=\s*(?:(?:window|globalThis)\s*(?:\.\s*|\[\s*['"]))?(?:local|session)Storage\b(?:['"]\s*\])?\s*(?![.[(])/,
  },
]

/** `const NAME = <initialiser>` at any depth, for the identifier lookup below. */
const DECLARATION = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*([^\n]+)/g

const NAMESPACED = /^storageKey\s*\(/
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/
const LITERAL = /^['"`]/

/**
 * `expression` with the parentheses the capture truncated closed again.
 *
 * The key is captured up to the first `)` — enough to judge it, and enough to
 * print `namespacedKey('third'` at a reader, which reads as a typo in their
 * code rather than as this check's cut.
 */
export function balanced(expression) {
  const opened = (expression.match(/\(/g) ?? []).length
  const closed = (expression.match(/\)/g) ?? []).length
  return expression + ')'.repeat(Math.max(0, opened - closed))
}

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

  // A name declared twice is a name whose declaration at the call site cannot
  // be picked from here, so it resolves to nothing and fails as unfollowable.
  // Taking the first would pass a module-scope `storageKey` call on behalf of a
  // function-local literal, which is the one branch this check refuses to take.
  const declared = new Map()
  for (const [, name, initialiser] of code.matchAll(DECLARATION)) {
    declared.set(name, declared.has(name) ? null : initialiser.trim())
  }

  const lineOf = (index) => code.slice(0, index).split('\n').length

  const found = []
  for (const match of code.matchAll(STORE_CALL)) {
    const expression = balanced(match[1].trim())
    const resolved =
      IDENTIFIER.test(expression) && declared.has(expression)
        ? declared.get(expression)
        : expression
    if (resolved !== null && NAMESPACED.test(resolved)) continue
    found.push({
      line: lineOf(match.index),
      expression,
      reason:
        resolved !== null && LITERAL.test(resolved)
          ? 'a bare literal'
          : 'not built by storageKey()',
    })
  }

  // The stores taken as values, line by line — a line is the unit here because
  // these patterns are coarse and a line is what a reader is sent to.
  code.split('\n').forEach((text, index) => {
    // One finding per line: the rules overlap by construction, and a reader
    // sent twice to one line learns nothing the second time.
    const escaped = ESCAPED_STORE.find(({ test }) => test.test(text))
    if (escaped) found.push({ line: index + 1, expression: text.trim(), reason: escaped.label })
  })

  return found.sort((a, b) => a.line - b.line)
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
