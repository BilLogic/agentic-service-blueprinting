import { describe, expect, it } from 'vitest'
import {
  consumers,
  declarationsIn,
  declaredNames,
  dial,
  namesIn,
  resolveValue,
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
  '--chroma',
  '--surface',
  '--elevation-step',
  '--contrast',
  '--foreground-lightness',
  '--muted-foreground-level',
  '--tertiary-foreground-level',
  '--primary-lightness',
  '--primary-chroma',
  '--ring-lightness',
  '--warning-lightness',
  '--destructive-lightness',
  '--info-lightness',
  '--success-lightness',
]

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
      // same fact as winning at the root: `print.css` restates thirteen of
      // these inside `@media print`, and `themes/light.css` declares most of
      // them under a bare `:root` that matches under dark as well.
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

  it('declares --radius in the light theme root', () => {
    expect(winningDeclaration('--radius', 'light')?.file).toBe(
      'themes/light.css',
    )
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
