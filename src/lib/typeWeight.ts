import {
  classListOf,
  classListsIn,
  type ClassListInput,
  type ClassListSite,
} from '@/lib/classList'

/**
 * The weight guard, under the decision that a rung owns size and leading
 * while a call site owns weight, tracking and ink.
 *
 * A class list is the seam: a type rule is almost never about one utility,
 * and a quoted-string search is defeated the moment weights are reordered
 * or split across `cn()` arguments. This module asks `classList` what a
 * site carries, then applies the doctrine:
 *
 * - 400 — all content (the working weight; `font-normal` need not be written)
 * - 500 — labels, eyebrows, active states, badge text (the one emphasis)
 * - 600 — headings only
 * - 700 — retired
 *
 * It enforces no other type rule.
 */

/** Weight utilities the doctrine names, including the retired 700. */
const WEIGHT = /(?:^|:)font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/

/** 500 and 600 — the two weights that are not the working 400. */
const FUNCTIONAL = new Set(['medium', 'semibold'])

/** 700 and above. None of these is a heading weight. */
const RETIRED = new Set(['bold', 'extrabold', 'black'])

/**
 * Class lists that *are* headings, even when the tag they land on is a
 * `span` or a `p`. Panel title (the inlined class string), canvas
 * column/row header, menubar title — the three the doctrine lists by job
 * rather than by tag.
 *
 * Every entry must still appear in the tree; `typeWeight.test.ts` holds
 * that, so a rename cannot leave a dead token behind while the guard
 * quietly stops recognising the heading.
 */
export const HEADING_TOKENS = [
  'min-w-0 text-sm font-semibold text-foreground',
  'CANVAS_HEADER_TEXT',
  'BLUEPRINT_MENUBAR_TITLE_TEXT_CLASS',
] as const

/**
 * Distinct weight names a class list writes, variants stripped.
 *
 * `aria-pressed:font-medium` is still medium: active states are the one
 * working emphasis, and a site that already carries `font-normal` plus that
 * variant has one functional weight, not two.
 *
 * @param classes - a class list as `classListOf` accepts it
 */
function weightNamesOn(classes: ClassListInput): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  for (const token of classListOf(classes)) {
    const match = token.match(WEIGHT)
    if (!match) continue
    const name = match[1]
    if (seen.has(name)) continue
    seen.add(name)
    names.push(name)
  }
  return names
}

/**
 * The JSX tag the class list is written on, walking back from `site.line`.
 *
 * @param source - the file the site was read from
 * @param line - 1-based line where the list opens
 */
function openingTagAt(source: string, line: number): string | null {
  const lines = source.split('\n')
  const from = Math.max(0, line - 12)
  const window = lines.slice(from, line).join('\n')
  const matches = [...window.matchAll(/<([A-Za-z][A-Za-z0-9.]*)\b/g)]
  return matches.at(-1)?.[1] ?? null
}

/**
 * True iff `tag` is a heading: `h1`–`h6`, or a component whose name ends
 * in `Title` (`DrawerTitle`, `DialogPrimitive.Title`).
 *
 * @param tag - the nearest opening tag, possibly dotted
 */
function isHeadingTag(tag: string): boolean {
  if (/^h[1-6]$/i.test(tag)) return true
  const name = tag.split('.').at(-1) ?? tag
  return /Title$/.test(name)
}

/**
 * True iff the source around `site.line` names a heading token.
 *
 * @param source - the file the site was read from
 * @param line - 1-based line where the list opens
 */
function namesHeadingToken(source: string, line: number): boolean {
  const lines = source.split('\n')
  const window = lines.slice(Math.max(0, line - 1), line + 6).join('\n')
  return HEADING_TOKENS.some((name) => window.includes(name))
}

/**
 * True iff this class list is a heading surface.
 *
 * @param site - one class list
 * @param source - the file the site was read from
 */
function isHeadingSite(site: ClassListSite, source: string): boolean {
  if (namesHeadingToken(source, site.line)) return true
  const tag = openingTagAt(source, site.line)
  return tag !== null && isHeadingTag(tag)
}

/**
 * Why this class list violates the weight rule, or `null` if it does not.
 *
 * @param site - one class list, as `classLists` / `classListsIn` reports it
 * @param source - the file's source, so a heading tag at this line can pass
 */
export function weightFault(
  site: ClassListSite,
  source: string,
): string | null {
  const weights = weightNamesOn(site.classes)
  if (weights.some((name) => RETIRED.has(name))) {
    return 'font-bold is retired: 700 is not a weight this tree uses'
  }
  const functional = weights.filter((name) => FUNCTIONAL.has(name))
  if (functional.length > 1) {
    return (
      `second functional weight (${functional.join(' + ')}): ` +
      '500 is the one working emphasis, 600 is headings only'
    )
  }
  if (functional.includes('semibold') && !isHeadingSite(site, source)) {
    return (
      'second functional weight (font-semibold on a non-heading): ' +
      '600 is headings only'
    )
  }
  return null
}

/**
 * Every weight fault in `source`.
 *
 * @param source - TypeScript / TSX
 * @param file - path recorded on the reported sites
 */
export function weightFaultsIn(source: string, file = ''): string[] {
  return classListsIn(source, file).flatMap((site) => {
    const fault = weightFault(site, source)
    return fault ? [`${file}:${site.line}: ${fault}`] : []
  })
}
