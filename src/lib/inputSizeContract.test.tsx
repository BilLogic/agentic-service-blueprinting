// @vitest-environment jsdom
/**
 * A field and the button beside it are the same height, by name.
 *
 * `Button` has a rung ladder and `Input` had one shape, so sixteen dense
 * fields improvised the same override by hand — eleven `h-7 … text-xs`, five
 * `h-6 … text-xs`, in six different orders. `fieldInputSizes.ts` gives that
 * ladder a name; this pins the property that makes the name worth having.
 *
 * WHAT THIS PINS is parity, not appearance, in three clauses:
 *
 *  - Every rung is the same height on both primitives. These two share a row
 *    constantly — the API-key field against Save, the paste-a-link field
 *    against Add — and a ladder that agreed on `sm` but not on `xs` would be
 *    worse than no ladder, because the disagreement only shows up in the one
 *    layout nobody screenshots.
 *  - The rungs are distinct heights, so a name that stopped existing fails
 *    here rather than collapsing quietly. `cva` returns the default variant
 *    for a name it does not know, so a re-vendor that dropped `xs` from
 *    `buttonVariants` would hand back `h-8` — which the first clause then
 *    reads against the field's `h-6`.
 *  - No field outside `components/ui` names its own height or type size. That
 *    is what the rung is for, and a class that says it again is how the next
 *    author learns the rung cannot be trusted.
 *
 * NOTHING HERE SPELLS A CLASS OUT. The heights are rendered — both components
 * mounted, `cn` run, the real cascade of base against rung — and read back by
 * asking `tailwind-merge`, the same resolver `cn` uses, which of the classes
 * on the node answers a probe utility. A contract that pinned `h-7` would be
 * pinning this week's vendor drop of `button.tsx` and `input.tsx`, and would
 * go quietly wrong the moment either moved.
 *
 * The one thing NOT asserted is type size, and its absence is a decision.
 * `Button`'s `sm` is `text-[0.8rem]`, an arbitrary literal that
 * `tokenDiscipline.test.ts` exempts *because `button.tsx` is vendored*; the
 * wrapper takes `text-xs` rather than ask for that exemption in an authored
 * file, so the two sit 0.8px apart on purpose. `fieldInputSizes.ts` carries the
 * argument. What IS asserted is that a rung which sets a type size sets it
 * at every width — the primitive's base carries `md:text-sm`, and a responsive
 * variant is emitted after every unvariant utility, so a bare `text-xs` from a
 * call site loses above 768px. That is the fault the sixteen call sites were
 * all quietly carrying.
 */
import { cleanup, render } from '@testing-library/react'
import { twMerge } from 'tailwind-merge'
import { afterEach, describe, expect, it } from 'vitest'
import { FieldInput } from '@/components/blueprint/FieldInput'
import { Button } from '@/components/ui/button'
import {
  FIELD_INPUT_SIZES,
  fieldInputVariants,
  type FieldInputSize,
} from '@/lib/fieldInputSizes'
import { sourceFiles } from '@/lib/tokenModel'

afterEach(cleanup)

// ---------------------------------------------------------------------------
// Asking tailwind-merge what a class is
// ---------------------------------------------------------------------------

/**
 * Do these two utilities set the same property?
 *
 * `twMerge` keeps the last of a conflicting pair and both of a compatible one,
 * so "the second one won" IS the answer. This is what keeps
 * `text-muted-foreground` out of a font-size rule without a list of colour
 * tokens, and what recognises `text-[0.8rem]` as a size when it is spelled as
 * an arbitrary value.
 */
const setsSameThing = (a: string, b: string): boolean =>
  twMerge(`${a} ${b}`) === b

/** A utility with its variant chain removed: `md:text-xs` → `text-xs`. */
const unprefixed = (utility: string): string =>
  utility.replace(/^(?:[\w-]+(?:-\[[^\]]*\])?:|\[[^\]]*\]:)*/, '')

/**
 * Is this utility about the control itself, at some width?
 *
 * A breakpoint is the one variant that still describes THIS box — `md:text-xs`
 * is the field's own type above 768px, and the rung has to name it there or
 * the primitive's `md:text-sm` outlives it. Every other variant describes
 * something else: the vendored input carries `file:h-6` and `file:text-sm` for
 * the file-picker button it encloses, which is not the field's height and not
 * the field's type.
 */
const variantChain = (utility: string): string =>
  utility.slice(0, utility.length - unprefixed(utility).length)

const atSomeWidth = (utility: string): boolean =>
  /^(?:(?:sm|md|lg|xl|2xl):)*$/.test(variantChain(utility))

const isHeight = (utility: string): boolean =>
  atSomeWidth(utility) && setsSameThing(unprefixed(utility), 'h-0')
const isFontSize = (utility: string): boolean =>
  atSomeWidth(utility) && setsSameThing(unprefixed(utility), 'text-base')

// ---------------------------------------------------------------------------
// Reading a rendered rung
// ---------------------------------------------------------------------------

/** The classes a component actually carries, `cn` already run. */
function renderedClasses(element: React.ReactElement): string[] {
  const { container } = render(element)
  const node = container.firstElementChild
  expect(node, 'the component rendered an element').not.toBeNull()
  return (node as HTMLElement).className.split(/\s+/).filter(Boolean)
}

const fieldClasses = (size: FieldInputSize): string[] =>
  renderedClasses(<FieldInput size={size} />)

const buttonClasses = (size: FieldInputSize): string[] =>
  renderedClasses(<Button size={size}>label</Button>)

/** The one class on this node that answers `h-0`. */
function heightOf(classes: string[], what: string): string {
  const found = classes.filter(isHeight)
  expect(found, `${what} should carry exactly one height`).toHaveLength(1)
  return found[0]
}

// ---------------------------------------------------------------------------
// Reading the call sites
// ---------------------------------------------------------------------------

type FieldTag = { file: string; line: number; tag: string | null }

/**
 * Scan from a `<` to the `>` that closes the opening tag.
 *
 * Brace- and quote-aware, because a JSX attribute list holds arbitrary
 * expressions — `onChange={(event) => set('name', event.target.value)}`
 * carries both a `>` and a pair of quotes that a regex would stop at.
 * Comments are already gone: `sourceFiles` strips them, which is load-bearing
 * rather than tidy. `LanePanel` writes "the cell panel's owner field" in a
 * `//` comment INSIDE the tag, and that apostrophe reads as an unclosed
 * string to any scanner that meets it — a reader without comment-stripping
 * silently loses that call site, which is one of the sixteen this change
 * converted.
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

/** Every `<Input …>` and `<FieldInput …>` this app writes for itself. */
function fieldTags(): FieldTag[] {
  return sourceFiles()
    .filter((source) => !source.file.startsWith('components/ui/'))
    .flatMap(({ file, code }) =>
      [...code.matchAll(/<(?:Field)?Input(?=[\s/>])/g)].map((match) => {
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

/** Every class NAMED at a call site, from every string literal in the tag. */
function classesIn(tag: string): string[] {
  return [...tag.matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)]
    .map((match) => match[1] ?? match[2])
    .flatMap((literal) => literal.split(/\s+/))
    .filter(Boolean)
}

// ---------------------------------------------------------------------------

describe('the ladder a dense field asks for by name', () => {
  it('is the same height as the button on the same rung', () => {
    const disagreements = FIELD_INPUT_SIZES.map((size) => ({
      size,
      field: heightOf(fieldClasses(size), `the ${size} field`),
      button: heightOf(buttonClasses(size), `the ${size} button`),
    }))
      .filter((rung) => rung.field !== rung.button)
      .map((rung) => `${rung.size}: field ${rung.field}, button ${rung.button}`)
    expect(disagreements).toEqual([])
  })

  it('is a different height on every rung', () => {
    const heights = FIELD_INPUT_SIZES.map((size) =>
      heightOf(fieldClasses(size), `the ${size} field`),
    )
    expect(new Set(heights).size).toBe(FIELD_INPUT_SIZES.length)
  })

  it('sets one type size at every width, or none at all', () => {
    const wobbling = FIELD_INPUT_SIZES.filter((size) => {
      const rung = fieldInputVariants({ size }).split(/\s+/).filter(Boolean)
      if (!rung.some(isFontSize)) return false
      const sizes = fieldClasses(size).filter(isFontSize).map(unprefixed)
      return new Set(sizes).size !== 1
    })
    expect(wobbling).toEqual([])
  })
})

/** Every call site that names something the rung is supposed to own. */
function fieldsNaming(what: (utility: string) => boolean): string[] {
  return fieldTags()
    .flatMap((entry) =>
      entry.tag === null ? [] : [{ ...entry, tag: entry.tag }],
    )
    .map((entry) => ({ ...entry, named: classesIn(entry.tag).filter(what) }))
    .filter((entry) => entry.named.length > 0)
    .map((entry) => `${entry.file}:${entry.line}: ${entry.named.join(' ')}`)
}

describe('a field leaves its size to the rung', () => {
  it('never names a height of its own', () => {
    expect(fieldsNaming(isHeight)).toEqual([])
  })

  it('never names a type size of its own', () => {
    expect(fieldsNaming(isFontSize)).toEqual([])
  })
})

describe('the reading this rests on', () => {
  it('closes every opening tag it finds, so nothing goes unread', () => {
    const unparsed = fieldTags()
      .filter((entry) => entry.tag === null)
      .map((entry) => `${entry.file}:${entry.line}`)
    expect(unparsed).toEqual([])
  })

  it('finds the call sites, so a passing rule is not an empty sample', () => {
    const tags = fieldTags()
    expect(tags.length).toBeGreaterThan(0)
    // A reader that stopped at the first `className="…"` would miss the tags
    // whose class list sits behind an aria-label or a placeholder.
    expect(
      tags.filter((entry) => /\bsize=(["'])(?:xs|sm)\1/.test(entry.tag ?? '')),
    ).not.toHaveLength(0)
  })

  it('still flags a field that says its own size', () => {
    // Both clauses have to be able to fail, against the two shapes the
    // sixteen were actually written in.
    const restated = classesIn('<Input className="h-7 text-xs" />')
    expect(restated.filter(isHeight)).toEqual(['h-7'])
    expect(restated.filter(isFontSize)).toEqual(['text-xs'])
    // …and the classes a call site DOES decide are caught by neither. These
    // are the ones that survived the conversion: a width, a flex rule, a
    // typeface. `font-mono` and `flex-1` are per-field decisions, not rungs.
    const kept = classesIn('<Input className="w-24 flex-1 font-mono" />')
    expect(kept.filter((utility) => isHeight(utility) || isFontSize(utility)))
      .toEqual([])
  })
})
