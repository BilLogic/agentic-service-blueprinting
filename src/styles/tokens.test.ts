import { describe, expect, it } from 'vitest'
import {
  consumers,
  consumersOf,
  declarationsIn,
  declaredNames,
  dial,
  missingRoleTokens,
  namesIn,
  resolveValue,
  ROLES,
  roleTokens,
  rulesDeclaring,
  stylesheet,
  winningDeclaration,
} from '@/lib/tokenModel'

/**
 * Token drift guard for the ported design-system foundation. The app resolves
 * every colour through `var()`, so a deleted or renamed token fails silently
 * in the browser — the property simply does not apply. These are the rules
 * that catch that:
 *
 *  - every bare `var(--x)` in a stylesheet resolves to a declaration
 *    somewhere, and so does every custom-property reference in source,
 *  - the theme dials the semantic layer derives from exist in both themes and
 *    resolve to a number under each,
 *  - every semantic token is declared, at a scope a subtree can re-derive at,
 *  - the blueprint's per-role component tokens hand over token references and
 *    nothing else, and stay unreachable at the root so their fallback arm
 *    remains the default,
 *  - the motion tokens in animations.css agree with `lib/motion.ts`.
 *
 * What changed here is not the rules, it is the reader. This file used to open
 * every stylesheet itself, concatenate them, and sweep the result for
 * `--name:` — which can say whether a name is written down somewhere and can
 * never say what it resolves to, under which theme, at which scope. Two of the
 * rules below could only be approximated on that reading, and one of them was
 * quietly dead. The sample now comes from `tokenModel` (ADR 6), so widening it
 * widens every rule that asks.
 */

/**
 * Properties injected at runtime by a library, never declared in this tree.
 *
 * Two shapes, and the difference is not cosmetic. The PREFIXES are namespaces
 * a library owns wholesale — Tailwind's internals, the drawer's stacking
 * state — where enumerating the members would be a list nobody could maintain.
 * The NAMES are the Base UI positioner variables, which are a fixed published
 * set, so they are named individually: a typo in `--anchor-width` should fail
 * this rule rather than slip through a prefix that happens to cover it.
 *
 * The Base UI list arrived with the fix to this file's second rule. That rule
 * meant to cover Tailwind's bare-value shorthand — `w-(--anchor-width)`,
 * `origin-(--transform-origin)` — and its pattern required a LETTER before
 * the parenthesis, where every such utility ends in a hyphen. It therefore
 * matched nothing the `var()` pattern beside it had not already matched, and
 * nineteen references in eight files were outside every rule in this file for
 * as long as it has existed. They are inside it now, and this is what they
 * resolve against.
 */
const RUNTIME_PREFIXES = [
  '--tw-', // Tailwind internal
  '--drawer-', // shadcn/base-ui drawer state
  '--stack-', // drawer stacking
  '--nested-drawers',
  '--accordion-', // base-ui accordion panel height
  '--radix-', // radix primitives
]

const RUNTIME_NAMES = [
  // @base-ui/react positioner and popup measurements, written onto the
  // positioner element by the primitive itself. See its `*CssVars` modules.
  '--anchor-width',
  '--available-width',
  '--available-height',
  '--transform-origin',
  '--positioner-width',
  '--positioner-height',
  '--popup-width',
  '--popup-height',
  '--collapsible-panel-height',
]

/**
 * Prefixes left behind when a token name is built by interpolation.
 *
 * `var(--color-${family}-${step})` arrives here truncated at the
 * interpolation. The families and steps it composes from are covered by
 * `palette.test.ts`, which resolves the real token against `colors.css`.
 */
const COMPOSED_TOKEN_PREFIXES = ['--color-']

const declared = declaredNames()

const resolves = (name: string): boolean =>
  declared.has(name) ||
  RUNTIME_NAMES.includes(name) ||
  RUNTIME_PREFIXES.some((prefix) => name.startsWith(prefix))

const report = (entries: ReturnType<typeof consumers>) => [
  ...new Set(
    entries.map((entry) => `${entry.file}:${entry.line} ${entry.name}`),
  ),
]

describe('token resolution', () => {
  it('resolves every bare var(--x) reference in the stylesheets', () => {
    // Bare, because `var(--x, 12px)` still renders when nothing declares
    // `--x` — the fallback arm is the value. The model records the comma, so
    // this rule can say which of the two it means instead of matching on the
    // shape of the closing parenthesis.
    const unresolved = consumers().filter(
      (entry) =>
        entry.kind === 'stylesheet' &&
        !entry.hasFallback &&
        !resolves(entry.name),
    )
    expect(report(unresolved)).toEqual([])
  })

  it('resolves every custom-property reference in source', () => {
    // Both ways a component can reach one: `var(--x)` inside a class string or
    // a style value, and Tailwind v4's bare-value shorthand, where the utility
    // itself stands in for `var`. Fallbacks are NOT excused here — a component
    // naming a token this app owns should name one that exists, and the
    // blueprint cell tokens, whose fallback arm is deliberately the default
    // state, are declared per role in `blueprint.css` either way.
    const unresolved = consumers().filter(
      (entry) =>
        entry.kind === 'source' &&
        !COMPOSED_TOKEN_PREFIXES.includes(entry.name) &&
        !resolves(entry.name),
    )
    expect(report(unresolved)).toEqual([])
  })
})

/* ------------------------------------------------------------------ *
 * Theme dials: the inputs semantic.css derives everything from. Each
 * must be declared in both theme files or a whole derivation chain
 * silently collapses in one mode.
 * ------------------------------------------------------------------ */

const DIALS = [
  '--hue',
  // Declared in both theme files since the unreachable `var(--hue)` default in
  // semantic.css went. It is a dial and not a derivation — a theme picks the
  // neutral ramp's hue — and each theme picks its own, so it belongs here and
  // not in MODE_INVARIANT_DIALS.
  '--surface-hue',
  '--chroma',
  '--surface',
  '--elevation-step',
  '--contrast',
  '--foreground-lightness',
  '--muted-foreground-level',
  '--tertiary-foreground-level',
  '--primary-lightness',
  '--primary-chroma',
  // Brand's own pair. Not in MODE_INVARIANT_DIALS even though both themes
  // carry one value here: what the rule below asserts is that a dial is
  // written in both files, and a deployment whose identity fill wants a
  // different lightness per mode is still declaring the same dial.
  '--brand-lightness',
  '--brand-chroma',
  '--ring-lightness',
  '--warning-lightness',
  '--destructive-lightness',
  '--info-lightness',
  '--success-lightness',
]

/**
 * Dials whose value belongs to the design rather than to the mode.
 *
 * These are declared in BOTH theme files, at one value, the way `--hue` is.
 * Not because the cascade needs the second declaration — `themes/light.css`
 * opens on a bare `:root`, so everything in it reaches dark mode whether dark
 * restates it or not — but because that reach is a leak rather than a design.
 * It is the same mechanism that carried light's warm `--surface-hue` into dark
 * and ran every dark surface on it, silently, until somebody looked. A dial
 * that is mode-invariant says so in both files, and the two cannot drift
 * apart without failing below.
 */
const MODE_INVARIANT_DIALS = ['--hue', '--radius']

/** Semantic tokens the shadcn components consume via theme.css. */
const SEMANTIC_TOKENS = [
  '--background',
  '--foreground',
  '--canvas',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--primary-border',
  '--brand',
  '--brand-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--tertiary',
  '--tertiary-foreground',
  '--accent',
  '--accent-foreground',
  '--destructive',
  '--destructive-foreground',
  '--warning',
  '--warning-foreground',
  '--info',
  '--info-foreground',
  '--success',
  '--success-foreground',
  '--border',
  '--input',
  '--ring',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
  '--sidebar-selected',
  '--sidebar-selected-foreground',
  '--sidebar-selected-rail',
  '--sidebar-ancestor',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
]

describe('theme dials and semantic layer', () => {
  it('declares every dial in both theme files', () => {
    const light = namesIn('themes/light.css')
    const dark = namesIn('themes/dark.css')
    expect(DIALS.filter((name) => !light.has(name))).toEqual([])
    expect(DIALS.filter((name) => !dark.has(name))).toEqual([])
  })

  it.each(['light', 'dark'] as const)(
    'resolves every dial to a number under %s',
    (theme) => {
      // The half the old reading could not do. Presence in a file is not the
      // same fact as winning at the root: `print.css` restates most of these
      // inside `@media print`, and `themes/light.css` declares most of them
      // under a bare `:root` that matches under dark as well.
      const broken = DIALS.filter((name) => {
        try {
          return !Number.isFinite(dial(name, theme))
        } catch {
          return true
        }
      })
      expect(broken).toEqual([])
    },
  )

  it.each(MODE_INVARIANT_DIALS)(
    'declares %s in both theme files, at one value',
    (name) => {
      // Each theme's own file is what wins in that theme. Drop the dial from
      // either one and the other's declaration leaks across to cover for it,
      // which is the arrangement this rule exists to forbid.
      expect(winningDeclaration(name, 'light')?.file).toBe('themes/light.css')
      expect(winningDeclaration(name, 'dark')?.file).toBe('themes/dark.css')
      expect(resolveValue(name, 'dark')).toBe(resolveValue(name, 'light'))
    },
  )

  it('leaves --radius out of the print override, so a printed corner is the screen corner', () => {
    // `print.css` restates the dials it needs to force the light palette, and
    // radius is not one of them. With both themes answering the same length,
    // print inherits that length whichever mode the page was in.
    const overridden = rulesDeclaring('--radius').filter((rule) =>
      rule.context.some((at) => /^@media\b/.test(at) && /\bprint\b/.test(at)),
    )
    expect(overridden.map((rule) => `${rule.file}:${rule.line}`)).toEqual([])
    expect(resolveValue('--radius', 'light')).toMatch(/^[\d.]+rem$/)
  })

  it('derives every semantic token in semantic.css', () => {
    const semantic = namesIn('semantic.css')
    expect(SEMANTIC_TOKENS.filter((name) => !semantic.has(name))).toEqual([])
  })

  it('re-derives every semantic token under .dark and .light subtree scopes', () => {
    // Custom properties resolve `var()` at computed-value time, before
    // inheritance — a subtree that re-declares a dial (the presentation stage)
    // needs the derivations re-declared at that scope, or it inherits the
    // ancestor's already-computed colours.
    //
    // The old reading of this rule checked that a `:root, .dark, .light` block
    // existed SOMEWHERE in the file. Now that the model records the selector
    // each declaration sits under, the rule can ask the question it always
    // meant: is every one of these tokens inside such a block.
    const scoped = new Map(
      declarationsIn('semantic.css').map((entry) => [entry.name, entry.selector]),
    )
    const misscoped = SEMANTIC_TOKENS.filter((name) => {
      const selector = scoped.get(name) ?? ''
      return !(
        selector.includes(':root') &&
        selector.includes('.dark') &&
        selector.includes('.light')
      )
    })
    expect(misscoped).toEqual([])
  })
})

/* ------------------------------------------------------------------ *
 * The print override.
 *
 * `print.css` forces the light palette onto paper by restating dials
 * inside `@media print`, under `:root, .dark` — the `.dark` arm is what
 * takes the dark theme's declarations back, and it can only take back a
 * name it mentions. So the block has to mention every dial the two themes
 * disagree about, and the header comment in `print.css` said so in prose.
 * Prose does not run, and the block fell nineteen dials behind: a page
 * printed from dark mode kept dark's `--primary-lightness` (0.922) on the
 * light print ground (0.968), and dark's brand, warning and destructive
 * ramps with it.
 *
 * These are that sentence as assertions. Deliberately invariants and not a
 * census: nothing below counts the entries in the block or names the dials
 * it should hold, so a dial added to the theme files at differing values is
 * inside the first rule the day it is added — which is exactly what a count
 * of thirteen could not do.
 * ------------------------------------------------------------------ */

/**
 * Every dial, read off the theme files rather than listed here.
 *
 * `DIALS` above is a hand-kept list, and it is the right shape for what it
 * asserts — those fifteen are the inputs `semantic.css` derives from, and
 * naming them is how a rename gets caught. It is the wrong shape here. A
 * hand-kept list is the failure this file is guarding against.
 */
function themeDials(): string[] {
  return [
    ...new Set([
      ...namesIn('themes/light.css'),
      ...namesIn('themes/dark.css'),
    ]),
  ].sort()
}

/**
 * The dials print sets to a value that is neither theme's, and why.
 *
 * Print is not light mode on paper — it is light mode on a sheet that is
 * already white, so the ground drops off the near-white ceiling to leave the
 * elevation ladder somewhere to climb. Those two are the whole of the
 * deviation, and stating them here is what lets the rule below be "every
 * other dial prints at its light value" instead of a list of hopes.
 *
 * A dial restated in the print block at the DARK value would satisfy the
 * mode-independence rule perfectly well — both modes would agree, on the
 * wrong colour. This is what stops that.
 */
const PAPER_TUNED: Record<string, string> = {
  // The light theme's 0.995 leaves no room above it: a raised surface rounds
  // up against L=1 and the ladder flattens. On paper the plates have to be
  // visible, so the ground drops and the step shrinks to match.
  '--surface': '0.968',
  '--elevation-step': '0.009',
}

describe('the print override', () => {
  it('resolves every dial to one value, whichever mode the page was in', () => {
    // The invariant. A page prints the same whether the reader had dark mode
    // on or not, and no list here has to be updated for that to keep being
    // true of a dial nobody has written yet.
    const modeBound = themeDials()
      .map((name) => ({
        name,
        light: resolveValue(name, 'light', 'print'),
        dark: resolveValue(name, 'dark', 'print'),
      }))
      .filter((entry) => entry.light !== entry.dark)
      .map(
        (entry) =>
          `${entry.name}: ${entry.light} from light, ${entry.dark} from dark`,
      )
    expect(modeBound).toEqual([])
  })

  it.each(['light', 'dark'] as const)(
    'prints every dial at its light-theme value, from %s',
    (theme) => {
      // And the value they agree on is the light theme's, for everything
      // except the two paper tunings above.
      const wrong = themeDials()
        .filter((name) => !(name in PAPER_TUNED))
        .map((name) => ({
          name,
          printed: resolveValue(name, theme, 'print'),
          light: resolveValue(name, 'light'),
        }))
        .filter((entry) => entry.printed !== entry.light)
        .map(
          (entry) =>
            `${entry.name}: prints ${entry.printed}, light is ${entry.light}`,
        )
      expect(wrong).toEqual([])
    },
  )

  it('deviates from the light theme only where PAPER_TUNED says so', () => {
    // The ledger is held from both ends, so it cannot keep an entry for a
    // deviation that has since been undone.
    const deviating = themeDials().filter(
      (name) =>
        resolveValue(name, 'light', 'print') !== resolveValue(name, 'light'),
    )
    expect(deviating.sort()).toEqual(Object.keys(PAPER_TUNED).sort())
    for (const [name, value] of Object.entries(PAPER_TUNED)) {
      expect(resolveValue(name, 'dark', 'print')).toBe(value)
    }
  })

  it('restates nothing the dark theme does not take over', () => {
    // The other end of the same rule. `.dark` can only take back a name the
    // block mentions, and the block has no business mentioning anything else:
    // a restatement of a dial both themes already agree on is a second copy
    // with nothing holding it, and the first rule above is what now enforces
    // "the two themes agree" — so the defensive copy buys nothing and rots.
    // This is the general form of the `--radius` rule above.
    const restated = declarationsIn('print.css').filter((rule) =>
      rule.context.some((at) => /^@media\b/.test(at) && /\bprint\b/.test(at)),
    )
    const unnecessary = [...new Set(restated.map((rule) => rule.name))]
      .filter((name) => !(name in PAPER_TUNED))
      .filter(
        (name) => resolveValue(name, 'light') === resolveValue(name, 'dark'),
      )
    expect(unnecessary.sort()).toEqual([])
  })

  it.each([
    ['--primary', 'the filled control'],
    ['--ring', 'the focus ring'],
    ['--brand-link', 'a link'],
  ])('prints %s — %s — from dark exactly as light mode renders it', (token) => {
    // The three the bug was reported through, asserted where a reader sees
    // them: on the derived colour, not on the dial underneath it. (`--ring`
    // and `--primary` are `semantic.css` derivations; `theme.css` registers
    // the link as `--color-brand-link: hsl(var(--brand-link))`, inside an
    // `@theme inline` block that is not part of the root cascade — which is
    // why the dial, not the registration, is what can be measured here.)
    const light = resolveValue(token, 'light')
    // A token neither side can resolve would pass this by agreeing on
    // `undefined`, which is how the registered `--color-*` name slipped
    // through when it was written that way.
    expect(light).toBeDefined()
    expect(resolveValue(token, 'dark', 'print')).toBe(light)
  })
})

/* ------------------------------------------------------------------ *
 * Blueprint component tokens. A cell's resting colour comes from its LANE or
 * its touchpoint TONE, which comes from data, so blueprint.css hands the value
 * to the shared rules through `--{property}-blueprint-{part}` custom
 * properties declared per role. Nothing type-checks that contract.
 *
 * Which roles exist, and that each declares the full set, is asserted in
 * `palette.test.ts` — beside the contrast measurements that make the same
 * parse worth doing — and deliberately not restated here. What lives here is
 * the pair of rules about the VALUES those declarations carry, which is a
 * different question from which of them are present.
 * ------------------------------------------------------------------ */

const CELL_TOKENS = [
  '--background-blueprint-cell',
  '--background-blueprint-cell-origin',
  '--background-blueprint-cell-hover',
  '--background-blueprint-cell-pressed',
  '--ring-blueprint-cell',
  '--ring-blueprint-cell-soft',
  '--foreground-blueprint-cell',
]

const ROLE_SELECTOR = /^\[data-blueprint-(?:lane|tone)='[a-z-]+'\]$/

describe('blueprint component tokens', () => {
  it('assigns only token references, never a raw colour', () => {
    // The whole point of the tier: a component token hands over a value that
    // was chosen in colors.css or semantic.css. A literal here would be a
    // colour invented at the consumer, invisible to both themes' palettes.
    //
    // Every role block, lanes and touchpoint tones alike. The old reading
    // matched `[data-blueprint-lane]` only, so the seven tone blocks — which
    // set the same seven properties from the same ramps — were outside it.
    const literals = declarationsIn('blueprint.css')
      .filter((entry) => ROLE_SELECTOR.test(entry.selector))
      .filter((entry) => !/^(?:var\(|color-mix\()/.test(entry.value))
      .map((entry) => `${entry.selector} ${entry.name}: ${entry.value}`)
    expect(literals).toEqual([])
  })

  it.each(['light', 'dark'] as const)(
    'leaves no blueprint cell token reachable at the root under %s',
    (theme) => {
      // Every consumer reads these as `var(--…-blueprint-…, fallback)`, and
      // the fallback arm IS the default state. A declaration that won at the
      // root would make the property always resolve, so the default would
      // become unreachable.
      //
      // Asked of the cascade rather than of one `:root { … }` block, which is
      // what the old reading could see: a declaration under `.dark`, or under
      // `html.light`, or in a later sheet, would have passed that check and
      // broken the app in exactly the way it was written to prevent.
      const reachable = CELL_TOKENS.filter((name) =>
        winningDeclaration(name, theme),
      )
      expect(reachable).toEqual([])
    },
  )
})

/* ------------------------------------------------------------------ *
 * Motion vocabulary: animations.css and lib/motion.ts state the same
 * numbers; change both together or this fails.
 * ------------------------------------------------------------------ */

const MOTION_TOKENS = [
  '--motion-structural',
  '--motion-fade',
  '--motion-fade-stagger',
  '--motion-camera',
  '--motion-micro',
]

describe('motion tokens', () => {
  it('declares all five motion durations in animations.css', () => {
    for (const name of MOTION_TOKENS) {
      const rules = rulesDeclaring(name)
      expect(rules.map((rule) => rule.file), name).toEqual(['animations.css'])
      expect(rules[0].value, name).toMatch(/^\d+ms$/)
    }
  })

  it('agrees with lib/motion.ts', async () => {
    const motion = await import('../lib/motion')
    const ms = (name: string) =>
      Number(/^(\d+)ms$/.exec(rulesDeclaring(name)[0].value)![1])
    expect(ms('--motion-structural')).toBe(motion.MOTION_STRUCTURAL_MS)
    expect(ms('--motion-fade')).toBe(motion.MOTION_FADE_MS)
    expect(ms('--motion-fade-stagger')).toBe(motion.MOTION_FADE_STAGGER_MS)
    expect(ms('--motion-camera')).toBe(motion.MOTION_CAMERA_MS)
    expect(ms('--motion-micro')).toBe(motion.MOTION_MICRO_MS)
    expect(stylesheet('animations.css').text).toContain(
      motion.MOTION_STRUCTURAL_EASE,
    )
  })
})

/**
 * The role vocabulary: seven roles, seven names each, one shape.
 *
 * Asserted as an INVARIANT of the vocabulary and never as a census of it.
 * "Every role declares all seven" survives an eighth role being added and
 * starts failing the moment that role is short a name; "there are forty-nine
 * role tokens" is true once and wrong for every edit afterwards. That is the
 * distinction this codebase learned the expensive way in its migration ledger,
 * and it is the reason the rule is driven off `ROLES` rather than off a list
 * of names written out here.
 */
describe('the role vocabulary', () => {
  it('declares all seven names for every role', () => {
    expect(missingRoleTokens()).toEqual([])
  })

  it('fails when a role arrives with fewer than seven', () => {
    // The rule held to its own job. A completeness check that cannot be made
    // to fail is not a completeness check, and the failure mode it has to
    // catch is the realistic one: not a role with nothing declared, but a role
    // with six of the seven, which is what a hand-written role looks like.
    const short = new Set([...declaredNames(), ...roleTokens('ghost')])
    short.delete('--wash-ghost')
    expect(missingRoleTokens([...ROLES, 'ghost'], short)).toEqual(['--wash-ghost'])
  })

  it('makes every role name reachable as a utility', () => {
    // A name nothing can be written against is a name that does not exist. The
    // Tailwind map is the only route from a semantic token to a class, so the
    // rule is that every one of the forty-nine is read there — and it is
    // driven off the role list, so an eighth role has to be registered as well
    // as declared.
    const unregistered = ROLES.flatMap((role) =>
      roleTokens(role).filter(
        (name) =>
          !consumersOf(name).some((entry) => entry.file.endsWith('theme.css')),
      ),
    )
    expect(unregistered).toEqual([])
  })

  it.each(['light', 'dark'] as const)(
    'resolves every role name to a colour under %s',
    (theme) => {
      // Declared is not the same fact as resolves. A name whose derivation
      // reaches a `var()` that only one theme declares is declared in the file
      // and resolves to nothing in the other, which is the failure the dial
      // rules above exist for and which reaches these names too.
      const unresolved = ROLES.flatMap((role) =>
        roleTokens(role).filter((name) => resolveValue(name, theme) === undefined),
      )
      expect(unresolved).toEqual([])
    },
  )

  it('derives every role name in semantic.css, inside the re-scoped block', () => {
    // Custom properties resolve their `var()`s at computed-value time, before
    // inheritance, so a subtree that re-declares a dial needs the derivations
    // re-declared at that scope. A role name outside that block inherits the
    // ancestor's already-computed colour and quietly ignores the theme it is
    // sitting in.
    const scoped = new Map(
      declarationsIn('semantic.css').map((entry) => [entry.name, entry.selector]),
    )
    const misplaced = ROLES.flatMap((role) =>
      roleTokens(role).filter((name) => {
        const selector = scoped.get(name) ?? ''
        return !(
          selector.includes(':root') &&
          selector.includes('.dark') &&
          selector.includes('.light')
        )
      }),
    )
    expect(misplaced).toEqual([])
  })
})
