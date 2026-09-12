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
 * This module holds the two matchers and the prose extractor. Two guards
 * read them: `citations.test.ts` holds both numbers across all of `src/`,
 * and `components/vendoredDivergence.test.ts` holds them again over the
 * vendored component tree, where the divergence rule gives the failure its
 * own words.
 *
 * The narrower rule — hold only what a deployment has already enrolled — was
 * what we enforced until v1.41.0 shipped two files carrying `#622` and
 * `#621` and turned a deployment's gate red. Under that rule a contributor
 * meets the rule by breaking somebody else's build, which is the wrong place
 * to find out. The rule is cheaper to hold where the files are written.
 */

/** `ADR 0014`, `ADR-0014`, `adr 14` — a record number, however spelled. */
export const RECORD_NUMBER = /\bADRs?[\s-]*\d+/i

/**
 * An issue or PR number in prose: `#412`.
 *
 * Not `#fff` (a colour, which starts with a letter here), not `#{id}` or
 * `#${slug}` (a template string), not `#10B981` — the trailing lookahead
 * rejects a run that continues into letters, which is what separates a
 * citation from a hex colour that happens to open with digits. `#000` is
 * indistinguishable from `#000` the issue by shape alone; `proseLines` is
 * what keeps it out, because a colour lives in a declaration and a citation
 * lives in a comment.
 */
export const ISSUE_NUMBER = /(?:^|[\s(])#\d+(?![\w])/

/** A line of prose, and where it came from. */
export type ProseLine = { line: number; text: string }

const COMMENTED = /\.(?:ts|tsx|js|jsx|mjs|cjs|css)$/

/**
 * The lines of `source` a reader reads as prose.
 *
 * A citation is a claim addressed to a person, so it lives in a comment or
 * in a document. The rest of a source file is addressed to a compiler:
 * `linear-gradient(#000 0 0)` is a colour and `'Onboarding interview #4'` is
 * a label the product shows, and neither resolves against anybody's tracker.
 *
 * Markdown is prose end to end. Everything else is scanned by walking the
 * characters, so that a `#` inside a string literal stays out and a comment
 * trailing a statement stays in.
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
    } else if (char === '\\') {
      index += 2
    } else if (char === '"' || char === "'" || char === '`') {
      index += 1
      while (index < source.length && source[index] !== char) {
        if (source[index] === '\\') index += 1
        else if (source[index] === '\n') line += 1
        index += 1
      }
      index += 1
    } else {
      index += 1
    }
  }
  keep()
  return out
}
