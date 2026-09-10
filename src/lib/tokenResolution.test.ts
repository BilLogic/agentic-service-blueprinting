import { describe, expect, it } from 'vitest'
import {
  type Consumer,
  consumers,
  declarations,
  sourceDeclarations,
} from '@/lib/tokenModel'

/**
 * Every bare `var(--x)` resolves to a real declaration.
 *
 * The app resolves every colour, every duration and every measurement through
 * a custom property, and a browser handed a name nothing declares does not
 * error: the declaration is dropped, the property simply does not apply, the
 * element keeps whatever it inherited, and nothing anywhere reports it. A
 * renamed token, a deleted one, a typo — all three fail exactly that way. It
 * is the one failure mode in these stylesheets that leaves no trace at all,
 * and this file is what turns it into a red build.
 *
 * The rule matters more here than in the copy it came from: this deployment's
 * component stylesheet alone is several hundred lines longer, and the
 * annotation-chrome ink ladder is consumed through Tailwind's bare-value
 * shorthand rather than through a `@theme` utility, so a whole class of read
 * lives outside every other guard in this tree.
 *
 * Both sides of the seam are swept. `themeDials.test.ts`, `palette.test.ts`
 * and `tokenDiscipline.test.ts` ask what a token RESOLVES TO and what an
 * author may write; this one asks the prior question, whether the name is
 * there at all. All four read the same model, so widening the model's sampling
 * widens every one of them at once — the decision that the token model is the
 * single test seam.
 */

/**
 * Properties injected at runtime by a library, never declared in this tree.
 *
 * Two shapes, and the difference is not cosmetic. The PREFIXES are namespaces
 * a library owns wholesale — the drawer's swipe and stacking state, the
 * accordion's measured panel height — where enumerating the members would be a
 * list nobody could maintain. The NAMES are a fixed published set, so they are
 * named individually: a typo in `--anchor-width` should fail this rule rather
 * than slip through a prefix that happens to cover it.
 */
const RUNTIME_PREFIXES = [
  '--drawer-', // vaul/shadcn drawer swipe and bleed state
  '--accordion-', // base-ui accordion panel height
]

const RUNTIME_NAMES = [
  // Written onto the element by the primitive itself. `--nested-drawers` is
  // the drawer's stacking count; the rest are @base-ui/react's positioner and
  // popup measurements — see its `*CssVars` modules.
  '--nested-drawers',
  '--anchor-width',
  '--available-width',
  '--available-height',
  '--transform-origin',
  '--positioner-width',
  '--positioner-height',
  '--popup-width',
  '--popup-height',
  '--collapsible-panel-height',
  // Tailwind v4's own spacing base, emitted by the framework rather than
  // declared under `src/styles`.
  '--spacing',
]

/**
 * Prefixes left behind when a token name is built by interpolation.
 *
 * `var(--color-${family}-${step})` arrives here truncated at the
 * interpolation. The families and steps it composes from are covered by
 * `palette.test.ts`, which resolves the real token against `colors.css`.
 */
const COMPOSED_TOKEN_PREFIXES = ['--color-']

/**
 * Which side declares a name, or `null` if nothing does.
 *
 * `stylesheet` is a declaration under `src/styles`. `component` is one this app
 * writes from TypeScript — an inline style key, Tailwind's arbitrary-property
 * syntax, a `setProperty` call, or the named constant such a call goes
 * through. `runtime` is a library writing onto an element it owns, which
 * nothing in this tree declares and nothing should.
 *
 * The `component` arm is a real declaration and not a concession. A consumer
 * can tell the two apart by nothing at all: what it needs is for the property
 * to have a value at the point it is read, and a component that sets the token
 * on the element the rule matches has given it one. Splitting them here is so
 * the rule below can say which arm it leaned on, and so a test can hold each
 * arm to its own promise.
 */
const stylesheetNames = new Set(declarations().map((entry) => entry.name))
const componentNames = new Set(sourceDeclarations().map((entry) => entry.name))

export type Declarer = 'stylesheet' | 'component' | 'runtime' | null

export function declarerOf(name: string): Declarer {
  if (stylesheetNames.has(name)) return 'stylesheet'
  if (componentNames.has(name)) return 'component'
  if (RUNTIME_NAMES.includes(name)) return 'runtime'
  if (RUNTIME_PREFIXES.some((prefix) => name.startsWith(prefix))) {
    return 'runtime'
  }
  return null
}

/** A read, as the rules below need to see it. */
export type Reference = Pick<Consumer, 'name' | 'kind' | 'hasFallback'>

/**
 * Why this reference resolves to nothing, or `null` if it resolves.
 *
 * TWO EXEMPTIONS, and both are the design working rather than a hole conceded.
 *
 * A FALLBACK ARM IS THE VALUE. `var(--x, 12px)` renders 12px when nothing
 * declares `--x`, so the reference is not dangling — it is an override seam,
 * and that is how the font seam is spelled: `theme.css` writes
 * `var(--app-font-sans, 'Ubuntu Sans Variable')` and nothing in this tree
 * declares `--app-font-sans`, on purpose, so an embedder can point it at its
 * own face. A rule that failed on it would be asking the seam to be closed.
 * The model records the comma, so this asks which of the two a reference is
 * rather than guessing from the shape of the closing parenthesis.
 *
 * A COMPONENT MAY DECLARE ON ITS OWN ELEMENT. `blueprint.css` reads
 * `--background-blueprint-fill` and `--background-compare-membership-outline`
 * bare, and no stylesheet declares either: the fill comes from data, so the
 * cell writes it inline on the element the rule matches, through
 * `BLUEPRINT_FILL_PROPERTY` in `lib/pathColorTheme.ts` and through an inline
 * style key in `CompareCellBlock.tsx`. That is the component tier doing the one
 * thing a stylesheet cannot, and the rule below has to see it as a declaration
 * or it condemns the mechanism.
 *
 * The exemption is not free, and the test below spends what it costs: each arm
 * is asserted to still be carrying something, so an arm that stops being needed
 * is noticed rather than left behind as a carve-out for the next dangling
 * reference to slip through.
 *
 * `declarer` is a parameter rather than a closure over the model so the rule
 * can be exercised on references it did not read off disk. A guard whose
 * extraction is wrong reports clean forever and looks exactly like a tree that
 * is clean.
 */
export function resolutionFault(
  reference: Reference,
  declarer: (name: string) => Declarer,
): string | null {
  const { name, kind, hasFallback } = reference
  // A name assembled by interpolation arrives truncated — `--color-` and
  // nothing after it. `palette.test.ts` resolves what it composes to.
  if (kind === 'source' && COMPOSED_TOKEN_PREFIXES.includes(name)) return null
  if (kind === 'stylesheet' && hasFallback) return null
  if (declarer(name) !== null) return null
  return `nothing declares ${name}`
}

/**
 * A failure's text, one line per distinct read.
 *
 * `via` is on it because the two shapes fail differently to the eye: a
 * misspelling inside `var(--x)` is visible in the source line, and one inside
 * `duration-(--x)` looks like an ordinary utility until you know the utility
 * name is standing in for `var`.
 */
const report = (entries: ReturnType<typeof consumers>) => [
  ...new Set(
    entries.map(
      (entry) =>
        `${entry.file}:${entry.line} ${entry.name} via ${entry.via}(`,
    ),
  ),
]

const unresolved = (kind: Consumer['kind']) =>
  report(
    consumers().filter(
      (entry) =>
        entry.kind === kind && resolutionFault(entry, declarerOf) !== null,
    ),
  )

describe('token resolution', () => {
  it('resolves every bare var(--x) reference in the stylesheets', () => {
    expect(unresolved('stylesheet')).toEqual([])
  })

  it('resolves every custom-property reference in source', () => {
    // Both ways a component can reach one: `var(--x)` inside a class string or
    // a style value, and Tailwind v4's bare-value shorthand, where the utility
    // itself stands in for `var`. Fallbacks are NOT excused here — a component
    // naming a token this app owns should name one that exists, and the
    // blueprint cell tokens, whose fallback arm is deliberately the default
    // state, are declared per role in `blueprint.css` either way.
    expect(unresolved('source')).toEqual([])
  })

  it('fails on a dangling reference, in either kind', () => {
    // The rules above pass on a clean tree and would pass just as quietly on a
    // tree they could not read. This is the half that says they can still fail.
    const nothing = () => null
    for (const kind of ['stylesheet', 'source'] as const) {
      expect(
        resolutionFault(
          { name: '--nobody-declares-this', kind, hasFallback: false },
          nothing,
        ),
      ).toMatch(/nothing declares --nobody-declares-this/)
    }
  })

  it('leaves the override seam alone, and only in a stylesheet', () => {
    const nothing = () => null
    const seam = { name: '--app-font-sans', hasFallback: true } as const
    expect(resolutionFault({ ...seam, kind: 'stylesheet' }, nothing)).toBeNull()
    // A component writing `var(--typo, 4px)` gets no such excuse: a fallback
    // there hides a misspelling behind a value that happens to look fine.
    expect(resolutionFault({ ...seam, kind: 'source' }, nothing)).not.toBeNull()
  })

  it('takes a component declaring on its own element as declared', () => {
    const asComponent = () => 'component' as const
    expect(
      resolutionFault(
        {
          name: '--background-blueprint-fill',
          kind: 'stylesheet',
          hasFallback: false,
        },
        asComponent,
      ),
    ).toBeNull()
  })

  it('still needs both arms, so neither becomes a dead carve-out', () => {
    const bare = consumers().filter(
      (entry) => entry.kind === 'stylesheet' && !entry.hasFallback,
    )
    const viaComponent = bare.filter(
      (entry) => declarerOf(entry.name) === 'component',
    )
    expect(
      report(viaComponent).length,
      'No stylesheet reads a token only a component declares any more — the ' +
        'component arm of this rule is carrying nothing, and should go with ' +
        'whatever removed the last one.',
    ).toBeGreaterThan(0)
    const seams = consumers().filter(
      (entry) => entry.kind === 'stylesheet' && entry.hasFallback,
    )
    expect(
      seams.filter((entry) => declarerOf(entry.name) === null).length,
      'Every stylesheet fallback now names something declared, so the ' +
        'fallback arm of this rule is excusing nothing. If the font seam was ' +
        'deliberately closed, this arm goes with it.',
    ).toBeGreaterThan(0)
  })
})
