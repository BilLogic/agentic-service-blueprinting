/*
 * WHAT A SHARED FILE MAY CITE.
 *
 * Every file under `src/` is shared. A deployment adopts this tree one
 * release at a time, and enrolling a file in its drift gate is what adoption
 * IS — so "which files are enrolled" is a fact about somebody else's
 * repository on some particular day, not a property of the file. A file that
 * no deployment holds today is a file the next release hands one.
 *
 * A number is the thing that does not survive that trip. `#622` means an
 * issue in THIS repository's queue; a deployment reading it resolves it
 * against its own, where 622 is a different piece of work or none at all.
 * `ADR 0012` is the same trip through a directory rather than a tracker: it
 * means a record in THIS repository's `docs/adr/`, and a deployment that
 * enrols the file gets the sentence without the document. Either way the
 * reader lands on the wrong page, or on no page, and believes they have the
 * reason. So the sentence names the decision instead: "the fallback #622
 * retired" becomes "the retired fallback", and loses nothing, because the
 * number was never carrying the meaning. Where a number IS carrying the
 * meaning, the sentence was incomplete — the fact goes in, not the number.
 *
 * A version is not a number of this kind. `2026.09.08` and
 * `21000122000000` resolve inside a deployment's OWN database and its own
 * migrations directory, which is why `lib/backend/schemaVersion.ts` keeps
 * its schema versions and the migrations that stamped them. The test is
 * where the pointer lands, not whether it has digits.
 *
 * Prose is not only what sits in a comment. A test's name and a failure's
 * message are quoted, and a reader meets them at the moment they can least
 * afford a dead pointer: something has just gone red and the message is the
 * whole of what they have. Two dangling `docs/adr/0011-…` paths sat inside a
 * session pin's own failure text for as long as the extractor read comments
 * only. So `proseLines` reads those literals too, and nothing else quoted —
 * a colour and a label the product shows stay where the compiler reads them.
 *
 * A DOCUMENT PATH is a citation when it reaches an adopter as a DANGLING
 * REFERENCE, and not otherwise. `docs/…` has no digits and needs none: it
 * addresses a file in a tree, and the only question worth asking is whose
 * tree the reader is standing in when they follow it. Three answers, and the
 * guard below is built out of them rather than out of the spelling.
 *
 *   - The reader is in THEIR OWN repository, and the file is not there. That
 *     is the defect. A shared script writing `docs/connectors/supabase/…`
 *     sends a deployment's maintainer to a document only this package has.
 *   - The reader is in THIS PACKAGE, because the file naming the path also
 *     ships from here and is read from here. `docs/` is packed with the rest
 *     of the tree, so an agent that opens the vendored rulebook out of
 *     `node_modules/agentic-service-blueprinting/` finds `docs/erd.mmd`
 *     exactly where the sentence said. Not dangling, not a defect.
 *   - The path is written `./docs/…`, which says out loud that it is
 *     relative to the reader — `bootstrap.ts` shows a host how to import its
 *     OWN account document. Not dangling either, and the matcher's lookbehind
 *     is what encodes that.
 *
 * A TREE is not a document. `docs/adr/` names a directory both repositories
 * have and both use the same way, so nobody following it lands anywhere
 * wrong. It is still not written in a shared file, for a reason that is about
 * cost rather than truth: the sentence never needed it. "the decision records
 * are append-only" says what "`docs/adr/` is append-only" says, one word
 * shorter, and it spares every scanner on either side of the seam a judgement
 * it cannot make from outside the file — a deployment's gate reads a foreign
 * repository's bytes with no parser for their language, so it must be
 * line-based, and a line-based scan cannot tell the tree from the record. So:
 * a shared file names a tree in words, and spells a path only where the path
 * is the SUBJECT. Where the path really is the subject it is not prose at all
 * but a value the code acts on, and a value about the running repository's own
 * tree belongs in `scripts/repo-config.mjs`, which exists for that and is
 * never shared.
 *
 * This module holds the three matchers and the prose extractor. Two guards
 * read them: `citations.test.ts` holds all three across all of `src/`,
 * and `components/vendoredDivergence.test.ts` holds the numbers again over
 * the vendored component tree, where the divergence rule gives the failure
 * its own words.
 *
 * WHO IS THE AUTHORITY FOR WHAT. `scripts/check-doc-paths.mjs` and this
 * guard used to be able to contradict each other, and over one tree they
 * still would if the line were not drawn: `check:doc-paths` REQUIRES every
 * path the plugin surface names to resolve here, and a ban on naming one at
 * all would make both impossible to satisfy. The line is which reader the
 * document is written for.
 *
 *   - `skills/`, `references/`, `agents/`, `hooks/` — and therefore their
 *     byte-for-byte copy under `src/lib/agent/skill/` — are read by an agent
 *     out of this package's own installed tree. `check:doc-paths` is the
 *     authority there: it holds those paths TRUE, and this guard exempts them.
 *   - Everywhere else under `src/`, and in a shared script, the reader is in
 *     their own repository. This guard is the authority there, and
 *     `check:doc-paths` never looks.
 *
 * The narrower rule — hold only what a deployment has already enrolled — was
 * what we enforced until v1.41.0 shipped two files carrying `#622` and
 * `#621` and turned a deployment's gate red. Under that rule a contributor
 * meets the rule by breaking somebody else's build, which is the wrong place
 * to find out. The rule is cheaper to hold where the files are written.
 */

/**
 * `ADR 0014`, `ADR-0014`, `adr 14`, `docs/adr/0014-…` — a record number,
 * however spelled.
 *
 * The path spelling is the same citation: it names a document in THIS
 * repository's `docs/adr/`, and a reader who follows it from an enrolled
 * copy gets a 404 rather than the decision. So `/` joins the separators,
 * and "see the ADR" is written as the decision itself either way.
 */
export const RECORD_NUMBER = /\bADRs?[\s/-]*\d+/i

/**
 * An issue or PR number in prose: `#412`.
 *
 * Not `#fff` (a colour, which starts with a letter here), not `#{id}` or
 * `#${slug}` (a template string), not `#10B981` — the trailing lookahead
 * rejects a run that continues into letters, which is what separates a
 * citation from a hex colour that happens to open with digits. `#000` is
 * indistinguishable from `#000` the issue by shape alone; `proseLines` is
 * what keeps it out, because a colour lives in a declaration or a fixture
 * and a citation lives in a comment, a test's name or a failure's message.
 */
export const ISSUE_NUMBER = /(?:^|[\s(])#\d+(?![\w])/

/**
 * A path into a documentation tree: `docs/erd.mmd`, `docs/guide/`,
 * `docs/connectors/supabase/database.md`.
 *
 * The lookbehind is the whole of the rule that a relative path addresses the
 * READER's tree: `./docs/blueprint.md` and `../../docs/assets` are rejected,
 * `docs/assets` is not. A bare `docs/` with nothing after it names the tree
 * and is rejected too, as is the glob `docs/**` — neither is an address.
 *
 * `docs/adr/0014-…` matches this AND `RECORD_NUMBER`. Both firing on one line
 * is correct: the path dangles and the number means a different decision, and
 * a reader needs to be told the second even after fixing the first.
 */
export const DOCUMENT_PATH = /(?<![.\w/])docs\/[A-Za-z0-9_.-]+/

/** A line of prose, and where it came from. */
export type ProseLine = { line: number; text: string }

const COMMENTED = /\.(?:ts|tsx|js|jsx|mjs|cjs|css)$/

/**
 * The calls that write to a person, and which of their arguments do it.
 *
 * `it('publishes exactly the keys ADR 0011 names')` and `expect(found, 'See
 * `docs/adr/0011-….md`')` are prose that happens to be quoted, and both are
 * read at the one moment a reader cannot go looking: the gate is red and the
 * message is all they have.
 *
 * Position is what separates the message from the data beside it.
 * `expect(value, message)` hands the first argument to a comparison and the
 * rest to a reader, so a fixture — `expect(swatch).toBe('#475569')` — stays
 * out without needing to be exempted. A test's name is its first argument;
 * everything after it is the body, where a string is addressed to the
 * compiler again. An `Error` carries its message first.
 *
 * `ISSUE_NUMBER.test('…')` is not a test declaration: the pattern is
 * anchored, so the name has to START with `it`, `test` or `describe` rather
 * than end with it.
 */
const NARRATED: { call: RegExp; reads: (argument: number) => boolean }[] = [
  { call: /^(?:describe|it|test|suite|bench)(?:\.\w+)*$/, reads: (argument) => argument === 0 },
  { call: /^(?:[A-Z]\w*)?Error$/, reads: (argument) => argument === 0 },
  { call: /^(?:expect|assert|invariant)$/, reads: (argument) => argument >= 1 },
]

/**
 * The lines of `source` a reader reads as prose.
 *
 * A citation is a claim addressed to a person, so it lives in a comment, in
 * a document, in a test's name or in a failure's message. The rest of a
 * source file is addressed to a compiler: `linear-gradient(#000 0 0)` is a
 * colour and `'Onboarding interview #4'` is a label the product shows, and
 * neither resolves against anybody's tracker.
 *
 * Markdown is prose end to end. Everything else is scanned by walking the
 * characters, so that a `#` in a colour stays out, a comment trailing a
 * statement stays in, and a quoted string is judged by the call it sits in.
 *
 * The walk knows nothing of regular-expression literals, which is why a
 * quote inside one reads as a string. The guards it feeds are prose rules,
 * and a missed line is a citation that survives rather than a false failure.
 *
 * @param source - the file's text
 * @param path - the file's name, which decides how it is read
 * @returns {ProseLine[]} every line a reader reads, in the order they occur
 */
export function proseLines(source: string, path: string): ProseLine[] {
  if (!COMMENTED.test(path)) {
    return source.split('\n').map((text, index) => ({ line: index + 1, text }))
  }

  const out: ProseLine[] = []
  let line = 1
  let held = ''
  const keep = () => {
    if (held.trim() !== '') out.push({ line, text: held })
    held = ''
  }

  /** The calls still open, innermost last, and the argument each is inside. */
  const open: { call: string; argument: number }[] = []

  /**
   * The name of the call an argument list belongs to.
   *
   * `it.each(table)(name, fn)` splits one declaration across two argument
   * lists: the table goes where a name usually goes, and the name follows in
   * a second list with no identifier in front of it. So the walk steps back
   * over a finished call to find the name, and the table's own list reads
   * nothing — it is data, and often data full of colours.
   */
  const callee = (paren: number) => {
    let end = paren
    let curried = false
    for (;;) {
      while (end > 0 && /\s/.test(source[end - 1])) end -= 1
      if (source[end - 1] !== ')') break
      let at = end - 2
      let depth = 0
      while (at >= 0) {
        if (source[at] === ')') depth += 1
        else if (source[at] === '(') {
          if (depth === 0) break
          depth -= 1
        }
        at -= 1
      }
      if (at < 0) return ''
      end = at
      curried = true
    }
    let start = end
    while (start > 0 && /[\w$.]/.test(source[start - 1])) start -= 1
    const name = source.slice(start, end)
    return name.endsWith('.each') && !curried ? '' : name
  }
  const narrated = () => {
    const here = open[open.length - 1]
    if (here === undefined) return false
    return NARRATED.some(({ call, reads }) => call.test(here.call) && reads(here.argument))
  }

  let index = 0
  while (index < source.length) {
    const char = source[index]
    const next = source[index + 1]

    if (char === '\n') {
      keep()
      line += 1
      index += 1
    } else if (char === '/' && next === '/') {
      const end = source.indexOf('\n', index)
      const stop = end === -1 ? source.length : end
      held += source.slice(index, stop)
      index = stop
    } else if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2)
      const stop = end === -1 ? source.length : end + 2
      for (let at = index; at < stop; at += 1) {
        if (source[at] === '\n') {
          keep()
          line += 1
        } else {
          held += source[at]
        }
      }
      index = stop
    } else if (char === '(') {
      open.push({ call: callee(index), argument: 0 })
      index += 1
    } else if (char === ')') {
      open.pop()
      index += 1
    } else if (char === ',') {
      const here = open[open.length - 1]
      if (here !== undefined) here.argument += 1
      index += 1
    } else if (char === '\\') {
      index += 2
    } else if (char === '"' || char === "'" || char === '`') {
      const opened = line
      const start = index
      const reads = narrated()
      index += 1
      while (index < source.length && source[index] !== char) {
        if (source[index] === '\\') index += 1
        else if (source[index] === '\n') line += 1
        index += 1
      }
      const quoted = source.slice(start + 1, index)
      index += 1
      if (reads) {
        quoted.split('\n').forEach((text, at) => {
          if (text.trim() !== '') out.push({ line: opened + at, text })
        })
      }
    } else {
      index += 1
    }
  }
  keep()
  return out
}
