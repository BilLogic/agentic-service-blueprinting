/**
 * A small button is one size, and the rung is what says so.
 *
 * `size="sm"` already sets a height and a font size. Thirty-seven of the
 * seventy-four call sites said them again anyway — `h-7`, which is the rung's
 * own height, and `text-xs`, which is not: 12px against the rung's 12.8px. So
 * two buttons in the same column rendered at two different sizes depending on
 * whether the author had remembered to type a class. `ResourcesList` had the
 * pair adjacent on screen — "Upload a file" at 12px, "Save resources" at
 * 12.8px — and `CellPanelEditor` had the same split between "Add value
 * proposition" and the Save/Cancel row below it.
 *
 * The fix could not be a retune of the rung. `components.json` points the
 * shadcn CLI at `@/components/ui`, so `button.tsx` is regenerated rather than
 * authored, and `tokenDiscipline.test.ts` already names its `text-[0.8rem]` as
 * vendored for exactly that reason. So the call sites gave the size back.
 *
 * WHAT THIS PINS is the near-miss specifically, in two clauses, because a flat
 * ban on sizing a small button would be a rule this tree does not keep:
 *
 *  - The rung's own height is never restated. `h-7` on a `size="sm"` button
 *    says nothing the rung has not already said, and a class that reads as a
 *    decision but changes nothing is what taught thirty-seven authors that the
 *    rung could not be trusted. A DIFFERENT height is a decision, and stands:
 *    `EditorZoomIndicator` floats its Reset View button over the canvas at
 *    `h-8`, wearing the same elevated card as the annotation toolbar.
 *  - A font size is never set on top of the rung's own height. This is the
 *    exact shape of the bug — a button keeping the rung's box while changing
 *    only its type, so it sits next to an untouched sibling a fraction of a
 *    pixel off. Changing BOTH is a different control rather than a near-miss,
 *    and five call sites are: the filter and ledger openers, the replace and
 *    retry controls and the scenario action all pair `h-6` with `text-2xs`, a
 *    whole step down the ladder rather than a wobble on one rung.
 *
 * The rung is read off `buttonVariants` rather than spelled out here, so a
 * re-vendor that moves `sm` to different numbers moves this rule with it — a
 * contract that pinned `h-7` and `text-[0.8rem]` as strings would be pinning
 * this week's vendor drop, and would go quietly wrong the moment it changed.
 * Which classes are "a height" and "a font size" is likewise asked of
 * `tailwind-merge`, the same resolver `cn` runs at render time, rather than
 * matched with a pattern that would have to be taught every rung name.
 */
import { describe, expect, it } from 'vitest'
import { twMerge } from 'tailwind-merge'
import { buttonVariants } from '@/components/ui/button'
import { sourceFiles } from '@/lib/tokenModel'

/** The classes a `size="sm"` button actually carries, cascade already run. */
const RUNG = twMerge(buttonVariants({ size: 'sm' }))
  .split(/\s+/)
  .filter(Boolean)

/**
 * Do these two utilities set the same property?
 *
 * `twMerge` keeps the last of a conflicting pair and both of a compatible one,
 * so "the second one won" IS the answer to "same property". This is what keeps
 * `text-muted-foreground` and `hover:text-foreground` out of a font-size rule
 * without a list of colour tokens, and what lets `text-[0.8rem]` be recognised
 * as a size when it is spelled as an arbitrary value.
 */
const setsSameThing = (a: string, b: string): boolean =>
  twMerge(`${a} ${b}`) === b

/** The one class in the rung that answers a probe utility's property. */
function rungClassFor(probe: string, what: string): string {
  const found = RUNG.filter((utility) => setsSameThing(utility, probe))
  expect(found, `the sm rung should set exactly one ${what}`).toHaveLength(1)
  return found[0]
}

const RUNG_HEIGHT = rungClassFor('h-0', 'height')
const RUNG_FONT_SIZE = rungClassFor('text-base', 'font size')

const isHeight = (utility: string): boolean => setsSameThing(utility, 'h-0')
const isFontSize = (utility: string): boolean =>
  setsSameThing(utility, RUNG_FONT_SIZE)

// ---------------------------------------------------------------------------
// Reading the call sites
// ---------------------------------------------------------------------------

type CallSite = { file: string; line: number; classes: string[] }

/**
 * Scan from a `<` to the `>` that closes the opening tag.
 *
 * Brace- and quote-aware, because a JSX attribute list holds arbitrary
 * expressions: `onClick={() => set('mode', 'blank')}` carries both a `>` and a
 * pair of quotes that a regex would stop at. Comments are gone before this
 * runs — `sourceFiles` strips them — which matters more than it looks: an
 * apostrophe in a `//` comment inside an attribute list reads as an unclosed
 * string to any scanner that meets one, and `CanvasDesignTools` writes exactly
 * that, six lines of comment inside the tag it belongs to.
 */
function openingTagEnd(code: string, start: number): number {
  let depth = 0
  let quote: string | null = null
  for (let i = start; i < code.length; i += 1) {
    const char = code[i]
    if (quote) {
      if (char === '\\') i += 1
      else if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === '`') quote = char
    else if (char === '{') depth += 1
    else if (char === '}') depth -= 1
    else if (char === '>' && depth === 0) return i + 1
  }
  return -1
}

/** Every `<Button …>` in the tree, whether or not its tag closed. */
function buttonTags(): Array<{
  file: string
  line: number
  tag: string | null
}> {
  return sourceFiles().flatMap(({ file, code }) =>
    [...code.matchAll(/<Button(?=[\s/>])/g)].map((match) => {
      const start = match.index
      const end = openingTagEnd(code, start)
      return {
        file,
        line: code.slice(0, start).split('\n').length,
        tag: end < 0 ? null : code.slice(start, end),
      }
    }),
  )
}

/**
 * Every class NAMED at a `size="sm"` call site.
 *
 * String literals only, and every literal in the attribute list rather than
 * just the one after `className=`: a `cn(…)` call spreads its classes over
 * several literals and a conditional arm is as much a class the button wears
 * as the unconditional string beside it. A literal that is not a class list —
 * `type="button"`, an `aria-label` — contributes tokens that match no utility,
 * and no rule here asks about those.
 */
function smallButtons(): CallSite[] {
  const sites: CallSite[] = []
  for (const { file, line, tag } of buttonTags()) {
    if (!tag || !/\bsize=(["'])sm\1/.test(tag)) continue
    const classes = [...tag.matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)]
      .map((match) => match[1] ?? match[2])
      .flatMap((literal) => literal.split(/\s+/))
      .filter(Boolean)
    sites.push({ file, line, classes })
  }
  return sites
}

const report = (site: CallSite, utilities: string[]): string =>
  `${site.file}:${site.line}: ${utilities.join(' ')}`

// ---------------------------------------------------------------------------

describe('the rung the sm size sets', () => {
  it('is one height and one font size, read off the component', () => {
    expect(RUNG_HEIGHT).toMatch(/^h-/)
    expect(RUNG_FONT_SIZE).toMatch(/^text-/)
  })

  it('sizes type on its own, so nothing at a call site has to', () => {
    // The near-miss that started this: `text-xs` is not the rung, and every
    // call site that wrote it rendered a pixel smaller than the one beside it.
    expect(isFontSize('text-xs')).toBe(true)
    expect(twMerge(`${RUNG_FONT_SIZE} text-xs`)).toBe('text-xs')
  })
})

describe('a size="sm" Button leaves its size to the rung', () => {
  it('never restates the rung height', () => {
    const offenders = smallButtons()
      .filter((site) => site.classes.includes(RUNG_HEIGHT))
      .map((site) => report(site, [RUNG_HEIGHT]))
    expect(offenders).toEqual([])
  })

  it('never resizes the type while keeping the rung box', () => {
    const offenders = smallButtons()
      .filter((site) => !site.classes.some(isHeight))
      .filter((site) => site.classes.some(isFontSize))
      .map((site) => report(site, site.classes.filter(isFontSize)))
    expect(offenders).toEqual([])
  })
})

describe('the reading this rests on', () => {
  it('closes every opening tag it finds, so nothing goes unread', () => {
    const unparsed = buttonTags()
      .filter((entry) => entry.tag === null)
      .map((entry) => `${entry.file}:${entry.line}`)
    expect(unparsed).toEqual([])
  })

  it('finds the call sites, so a passing rule is not an empty sample', () => {
    const sites = smallButtons()
    expect(sites.length).toBeGreaterThan(0)
    // A reader that stopped at the first `className="…"` would be silent about
    // the `cn(…)` sites, which is where the longest class strings live.
    expect(sites.some((site) => site.classes.length > 8)).toBe(true)
  })

  it('still flags a call site that says the size again', () => {
    // The rule has to be able to fail — both clauses, against the two shapes
    // the thirty-seven were actually written in.
    const classesIn = (tag: string) =>
      [...tag.matchAll(/"([^"\n]*)"/g)]
        .flatMap((match) => match[1].split(/\s+/))
        .filter(Boolean)
    const restated = classesIn(
      `<Button size="sm" className="${RUNG_HEIGHT} px-2">`,
    )
    const resized = classesIn('<Button size="sm" className="px-2 text-xs">')
    expect(restated).toContain(RUNG_HEIGHT)
    expect(resized.some(isHeight)).toBe(false)
    expect(resized.some(isFontSize)).toBe(true)
  })
})
