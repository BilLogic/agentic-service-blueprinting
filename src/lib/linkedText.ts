import { safeExternalHref } from '@/lib/sliceCells'

/** One run of authored prose: plain text, or a URL that may render as a link. */
export type LinkedTextSegment =
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; href: string }

/**
 * A URL as an author types it into prose.
 *
 * Deliberately narrow: a scheme is REQUIRED. A bare `example.com/x` is not
 * matched, because the alternative is guessing that every dotted word is an
 * address — and the sentence "see the note in data-model.md" would become a
 * link to a host that does not exist. `safeExternalHref` then has the last
 * word on whether a match may be rendered as an anchor at all, so a
 * `javascript:` scheme reaches this function and leaves it as text.
 */
const URL_IN_PROSE = /\b[a-z][a-z0-9+.-]*:\/\/\S+/gi

/**
 * Trailing characters that belong to the sentence, not to the address.
 *
 * A URL at the end of a clause is written `see https://example.com/x.` and the
 * full stop is punctuation. A closing bracket is only trimmed when the URL
 * carries no opening one, because a Wikipedia-shaped path legitimately ends in
 * `)` — `…/Service_blueprint_(design)`.
 */
function trimSentencePunctuation(url: string): string {
  let end = url.length
  while (end > 0) {
    const char = url[end - 1]
    if ('.,;:!?\'"'.includes(char)) {
      end -= 1
      continue
    }
    if (char === ')' && !url.slice(0, end).includes('(')) {
      end -= 1
      continue
    }
    if (char === ']' && !url.slice(0, end).includes('[')) {
      end -= 1
      continue
    }
    break
  }
  return url.slice(0, end)
}

/**
 * Authored prose, split into the runs a renderer draws.
 *
 * This is the whole job `evidence.ref` was carrying: a
 * locator does not need a field of its own when a note can hold one and the
 * note renders it as a link. The split happens at render rather than at write,
 * so a URL pasted into a note that already exists becomes reachable without
 * anybody re-saving the row.
 */
export function linkedTextSegments(
  text: string | null | undefined,
): LinkedTextSegment[] {
  if (!text) return []
  const segments: LinkedTextSegment[] = []
  let cursor = 0
  for (const match of text.matchAll(URL_IN_PROSE)) {
    const at = match.index
    const candidate = trimSentencePunctuation(match[0])
    const href = safeExternalHref(candidate)
    if (!href) continue
    if (at > cursor) {
      segments.push({ kind: 'text', text: text.slice(cursor, at) })
    }
    segments.push({ kind: 'link', text: candidate, href })
    cursor = at + candidate.length
  }
  if (cursor < text.length) {
    segments.push({ kind: 'text', text: text.slice(cursor) })
  }
  return segments
}
