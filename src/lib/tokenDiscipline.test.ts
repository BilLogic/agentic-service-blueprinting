import { readdirSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { classUsesMatching, sourceFiles, sourceMatching } from '@/lib/tokenModel'

/**
 * The token-discipline rule, enforced — now against the one model.
 *
 * The rule itself has not moved: source consumes the SEMANTIC layer, never the
 * primitive ramps (`text-warning`, not `text-amber-1100`), and no raw value
 * where a token exists. This file is where it is written down — there is no
 * prose document stating it, and the citation that used to stand here pointed
 * at `docs/engineering/standards.md`, which this repository does not have.
 *
 * What changed is the SAMPLE. ADR 6 made `tokenModel` the one reader, and
 * `palette.test.ts` and `styles/tokens.test.ts` were converted onto it; this
 * file was the guard left behind, still walking `src/components/**.tsx` with a
 * reader of its own. The ADR's consequences say so in as many words, and name
 * converting it as the change that closes them. This is that change.
 *
 * WHAT THE WIDENING FOUND, on a tree of 399 files where the old sample was 185:
 *
 *  - `lib/filterToolbarButton.ts` carried `border-border/60` and
 *    `border-border/50` — the exact pattern the fourth rule below forbids, in
 *    the one directory the old walk did not look at. It is the canonical case:
 *    a guard scoped to a folder is a guard that reports on the folder, not on
 *    the rule.
 *  - Twenty-seven hex matches, every one of them in `src/dev/`, which sat
 *    outside every style rule in this repository. Twenty-one are real colours
 *    in a dev-only instrument and six are `(#NNN)` issue references in prose;
 *    both are exempted below, by file and with a reason.
 *
 * Three rules are NEW here rather than widened, and they are the reason this
 * conversion is worth more than a scope change. `styles/theme.css` already
 * declares the rungs — `--text-4xs`, `--text-5xs`, `--text-5xl`, the radius
 * ladder — because that sheet converged with the deployment's ahead of this
 * (#327 S3). The vocabulary was there and nothing held the call sites to it,
 * so nine bare `rounded`, five bracketed z-indexes and four font-size literals
 * had accumulated against rungs that already existed. A token nothing enforces
 * is a token nobody finds.
 */

/** Ramps colors.css owns. Semantic tokens derive from these; source may not. */
const PRIMITIVE_RAMPS = [
  'amber',
  'blue',
  'crimson',
  'gold',
  'gray',
  'green',
  'indigo',
  'lime',
  'orange',
  'pink',
  'purple',
  'red',
  'slate',
  'tomato',
  'violet',
  'yellow',
  'scale',
]

/**
 * Ramps Tailwind ships and this design system does not unset — so they
 * resolve, silently, to colours that belong to no lane at all. The frozen
 * canvas/annotation surfaces are what kept reaching for these; they have
 * named tokens now (`--background-canvas-chrome`, `--background-annotation-chrome`).
 */
const FOREIGN_RAMPS = [
  'neutral',
  'stone',
  'zinc',
  'sky',
  'teal',
  'emerald',
  'cyan',
  'rose',
  'fuchsia',
]

const UTILITY_PREFIXES =
  'bg|text|border|ring|fill|stroke|from|to|via|shadow|outline|divide|accent|caret|placeholder|decoration'

/**
 * A variant chain in front of a utility, as `classUses` sees it.
 *
 * `classUses` records each whitespace-delimited token WHOLE — `sm:z-[40]` is
 * one utility, not a variant plus `z-[40]` — so any rule anchored with `^` has
 * to spell the prefix out or it only holds at the default breakpoint. That is
 * not hypothetical here: `sm:text-[2.25rem]` on the cover title is one of the
 * four font-size literals this file found, and an anchored pattern with no
 * variant clause reads straight past it.
 *
 * Three shapes cover what this tree writes, and they chain, hence the `*`:
 * a plain variant (`sm:`, `hover:`, `before:`), a variant carrying a bracketed
 * argument (`peer-data-[variant=inset]:`, which `ui/sidebar.tsx` writes), and a
 * bare arbitrary selector (`[&>svg]:`). The bracketed two are why this is not
 * simply `(?:[\w-]+:)*` — `[\w-]+` stops at the `[`, so that shorter form
 * holds at every breakpoint but not behind a data-attribute variant, which is
 * the same class of hole one step along.
 *
 * Shared rather than repeated so the three anchored rules below cannot drift
 * apart: one of them being widened and the others not is the state this
 * constant exists to end.
 */
const VARIANTS = '(?:[\\w-]+(?:-\\[[^\\]]*\\])?:|\\[[^\\]]*\\]:)*'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Every non-test `.ts`/`.tsx` under `src`, enumerated independently.
 *
 * A second walk in a file whose whole point is that there should be one — and
 * deliberately so. It reads no file and applies no rule; it lists paths, and
 * it exists precisely to be compared against the model's own list. A guard
 * that asked the model whether the model reads enough could only ever agree
 * with itself.
 */
function everySourceFile(dir: string = SRC): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry)
    if (statSync(path).isDirectory()) return everySourceFile(path)
    if (!/\.tsx?$/.test(entry)) return []
    if (entry.includes('.test.')) return []
    return [relative(SRC, path).split('\\').join('/')]
  })
}

test('the sample is the whole tree, file for file', () => {
  // A rule is only as good as its sample, and this file's was one directory
  // until now. Counting files or naming roots is what lets a narrowing pass —
  // `roots.has('lib')` is true of a reader that misses `types/`, and a
  // `length > 300` floor is true of a reader that misses fifty files. So this
  // asserts the set difference in both directions and names what is missing,
  // which is the one form a narrowing cannot satisfy by adding another string
  // to a list.
  const sampled = new Set(sourceFiles().map((file) => file.file))
  const onDisk = everySourceFile()
  const missing = onDisk.filter((file) => !sampled.has(file))
  assert.deepEqual(
    missing,
    [],
    `Outside the model's sample, so outside every rule below:\n${missing.join('\n')}`,
  )
  const phantom = [...sampled].filter((file) => !onDisk.includes(file))
  assert.deepEqual(phantom, [], `Sampled but not on disk:\n${phantom.join('\n')}`)
  assert.ok(onDisk.length > 300, 'the tree itself is still the whole tree')
})

test('source takes colour from the semantic layer, not the primitive ramps', () => {
  const ramps = [...PRIMITIVE_RAMPS, ...FOREIGN_RAMPS].join('|')
  const offenders = sourceMatching(
    new RegExp(`\\b(?:${UTILITY_PREFIXES})-(?:${ramps})-[0-9]{2,4}\\b`, 'g'),
  )
  assert.deepEqual(
    offenders,
    [],
    `Primitive/foreign ramp steps in source — use the semantic token for the role instead:\n${offenders.join('\n')}`,
  )
})

/**
 * Files allowed to carry something the hex pattern matches, and why.
 *
 * The one entry is `src/dev/`, and naming the file is the point of the list
 * rather than narrowing the pattern. A pattern bent to step over it would
 * read, to the next person, as a rule that never covered it; the same argument
 * the vendored font-size list makes below, and the reason the exemption is not
 * a regex.
 *
 * `ArrowSituationCatalogPage.tsx` is a measuring instrument, not a surface.
 * It is reached only at `/proto/arrows` behind `import.meta.env.DEV`, which
 * Vite folds to a static `false` in a production build, so the module and its
 * colours are dropped by the bundler and reach neither a user nor the compiled
 * stylesheet. Its twenty-one hexes are calibration — graph paper, a cell
 * outline, one blue arrow, one violet alternate — and none of them names a
 * role this design system has a token for. The two ways to "fix" it are both
 * worse than the exemption: minting `--arrow-catalog-*` names in `src/styles`
 * would put tokens no shipping surface consumes into the production layer,
 * which is the liveness problem ADR 6 already flags; and taking the semantic
 * tokens instead would make a fixed visual reference invert with the theme,
 * which is the one thing a reference held against a golden snapshot must not
 * do. The page also carries two `(#NNN)` references in JSX text, which a
 * three-digit hex pattern cannot tell from `#fff`.
 *
 * Every entry is asserted below to still match something, so a file that stops
 * needing its exemption loses it instead of leaving a dead carve-out behind
 * for the next hex to slip through.
 */
const HEX_EXEMPT_FILES: ReadonlyArray<{ file: string; because: string }> = [
  {
    file: 'dev/ArrowSituationCatalogPage.tsx',
    because:
      'dev-only /proto/arrows instrument, dropped from production builds; its colours are calibration, not vocabulary — plus two (#NNN) issue references in prose',
  },
]

/** Six- and three-digit hex. `#{id}` template strings and CSS ids are not colours. */
const RAW_HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g

const hexIsExempt = (match: string): boolean =>
  HEX_EXEMPT_FILES.some((entry) => match.startsWith(`${entry.file}:`))

/*
 * No seam exemption here, and that is a property of the template rather than
 * an oversight. The deployment this template is forked into carries one hex in
 * `config.ts` — the accent its brand tokens are derived FROM — and exempts it
 * by re-deriving it (`the hex IS BRAND.accent`) rather than by listing the
 * file. The template ships the brand seam neutral: `config.ts` exports a name
 * and nothing else, `--chroma` and `--primary-chroma` are 0, and the
 * `--brand-*` ramp is greyscale. There is no colour at the seam to excuse, so
 * every hex in this tree is either a dev instrument or an offender.
 */
test('source carries no raw hex colours', () => {
  const offenders = sourceMatching(RAW_HEX).filter((use) => !hexIsExempt(use))
  assert.deepEqual(
    offenders,
    [],
    `Raw hex in source — add or use a token, and see the colour layers in styles/semantic.css:\n${offenders.join('\n')}`,
  )
})

test('every hex exemption is still a file that needs one', () => {
  const matches = sourceMatching(RAW_HEX)
  const stale = HEX_EXEMPT_FILES.filter(
    (entry) => !matches.some((use) => use.startsWith(`${entry.file}:`)),
  ).map((entry) => entry.file)
  assert.deepEqual(
    stale,
    [],
    `Exempted from the hex rule but no longer matching it: ${stale.join(', ')}. ` +
      'If the file moved, move the exemption with it; if the hexes are gone, delete the exemption.',
  )
})

/**
 * Border strengths are named, not dialled.
 *
 * Supabase names every rung — across 1972 of their components: 101
 * `border-default`, 76 `border-strong`, 66 `border-overlay`, 56
 * `border-muted`, 43 `border-control-hover`, and roughly ten alpha modifiers
 * in total. This codebase had the inverse: `border-border` plus hand-tuned
 * alphas (`/35`, `/50`, `/60`, `/70`, `/80`), each a strength with no name and
 * no way to reuse it.
 *
 * So the modifier is the thing under test, and only on the two NEUTRAL edge
 * tokens, which now have rungs: `--border-muted`, `--border`, `--input`,
 * `--border-overlay`, `--border-control-hover`. A new alpha on one of those
 * means a rung is missing.
 *
 * Role colours keep their modifiers — `border-primary/50`,
 * `border-destructive/30`, `ring-ring/50`, `border-foreground/70` are a tint of
 * a MEANING rather than an invented strength, and upstream writes those too
 * (32 `border-foreground`, plus `/20` and `/10`).
 */
const NEUTRAL_EDGE_TOKENS = ['border', 'input']

test('neutral border and ring strengths come from a named rung', () => {
  const tokens = NEUTRAL_EDGE_TOKENS.join('|')
  const offenders = sourceMatching(
    new RegExp(
      `\\b(?:border|ring|divide|outline)-(?:${tokens})/(?:\\[[^\\]]+\\]|[0-9]+)`,
      'g',
    ),
  )
  assert.deepEqual(
    offenders,
    [],
    `Inline alpha on a neutral edge token — use a named rung (border-muted / border-border / border-input / border-overlay / border-control-hover):\n${offenders.join('\n')}`,
  )
})

/**
 * The bare radius utility is a literal that looks tokenised.
 *
 * `tailwindcss@4.3.3` declares `--radius: 0.25rem` under `@theme default
 * inline reference`. `inline` substitutes the literal straight into the
 * utility and `reference` emits no custom property, so `.rounded` compiles to
 * `border-radius: 0.25rem` and a `:root { --radius: … }` rule — which is where
 * ours is declared — cannot reach it. Nine call sites were writing it, so nine
 * corners in this app were deaf to the dial that is supposed to own them.
 *
 * Every sided variant has the same problem (`rounded-l`, `rounded-t`, …), so
 * the rule is "a radius utility names its rung". `rounded-full` and
 * `rounded-none` are exempt because neither is a rung — they are the two ends,
 * and neither reads the dial by design.
 */
const SIDES = 'l|r|t|b|tl|tr|bl|br|s|e|ss|se|es|ee'

test('every radius utility names a rung, so the dial reaches all of them', () => {
  const offenders = classUsesMatching(
    new RegExp(`^${VARIANTS}rounded(?:-(?:${SIDES}))?$`),
  )
  assert.deepEqual(
    offenders,
    [],
    `Bare radius utility — 4px hardcoded by Tailwind, deaf to --radius. Name the rung (rounded-sm / -md / -lg / -xl), or rounded-full / rounded-none:\n${offenders.join('\n')}`,
  )
})

/**
 * One value, one spelling.
 *
 * Tailwind v4 takes a bare integer for z-index, so the bracket buys nothing at
 * all: every arbitrary spelling has a plain one, and the plain one is the
 * vocabulary. Five sites were written the other way, and the cost of two
 * spellings is not cosmetic — a contract test that pins a stacking order as an
 * exact substring pins whichever spelling it happened to be written in, and
 * then enforces the minority form.
 */
test('z-index is spelled one way, so a contract cannot pin the other', () => {
  const offenders = classUsesMatching(new RegExp(`^${VARIANTS}z-\\[\\d+\\]$`))
  assert.deepEqual(
    offenders,
    [],
    `Arbitrary z-index — Tailwind v4 takes the bare number, so write z-30 not z-[30]:\n${offenders.join('\n')}`,
  )
})

/**
 * A font size written out is a rung that was never added.
 *
 * The type scale bottoms out below Tailwind's, on purpose: `--text-2xs` (11px)
 * and `--text-3xs` (10px) exist because the editor's dense chrome kept writing
 * `text-[11px]`/`text-[10px]`, and naming them made the ladder reusable.
 * `--text-4xs` (9px), `--text-5xs` (8px) and `--text-5xl` (40px) are already
 * declared in `styles/theme.css` for exactly the same reason — and four call
 * sites were still writing the literal, because nothing in this repository
 * asked them not to.
 *
 * The rule reads px AND rem, because a px-scoped pattern leaves the identical
 * gap open at the top of the scale: the two display headings were written in
 * rem — `text-[2.5rem]` on the scenario slide title, `sm:text-[2.25rem]` on the
 * cover title — and neither is a px literal. 40px is `--text-5xl` and 36px was
 * already Tailwind's `text-4xl`.
 *
 * `em` is NOT covered, and that is a rule rather than a hole. `text-[0.85em]`
 * on markdown inline code and `text-[0.8em]` in `coverInline` are a proportion
 * of whatever encloses them — the same code at a different enclosing size is a
 * different number of pixels, which is the point — and no fixed rung can
 * express that. A rung is an absolute size: every `--text-*` this codebase
 * declares is one, commented in px.
 *
 * The other exemption is vendored, and it is a named list rather than a
 * narrower pattern — see `VENDORED_FONT_SIZE_LITERALS` directly below. A
 * pattern narrowed to dodge a real case reads, to the next person, as a rule
 * that never covered it.
 */

/**
 * Vendored shadcn files that carry an arbitrary font size from upstream.
 *
 * `components.json` at the repository root points the shadcn CLI at
 * `@/components/ui`, so that directory is regenerated rather than authored.
 * Retuning upstream's `text-[0.8rem]` to a rung would be deleted by the next
 * `npx shadcn add button`, and until then it is one more hunk in the vendor
 * diff. A product need the primitive does not meet is a wrapper in
 * `components/blueprint/`, not an edit here, and nothing needs one: these two
 * are upstream's own sizing, not a size this app reached for.
 *
 * Named here rather than carved out of the pattern, because the pattern is what
 * the next reader will take for the whole rule. Each entry is asserted below to
 * still carry a literal, so a re-vendor that drops one fails loudly instead of
 * leaving a dead exemption behind to widen quietly.
 */
const VENDORED_FONT_SIZE_LITERALS: ReadonlyArray<{
  file: string
  because: string
}> = [
  {
    file: 'components/ui/button.tsx',
    because: 'upstream shadcn button sizing (components.json — the CLI owns this file)',
  },
  {
    file: 'components/ui/toggle.tsx',
    because: 'upstream shadcn toggle sizing (components.json — the CLI owns this file)',
  },
]

/** Absolute font-size literals: px and rem, at any breakpoint. Not `em`. */
const FONT_SIZE_LITERAL = new RegExp(
  `^${VARIANTS}text-\\[(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:px|rem)\\]$`,
)

const isExempt = (use: string): boolean =>
  VENDORED_FONT_SIZE_LITERALS.some((entry) => use.startsWith(`${entry.file}:`))

test('font sizes come from a named rung, not a px or rem literal', () => {
  const offenders = classUsesMatching(FONT_SIZE_LITERAL).filter(
    (use) => !isExempt(use),
  )
  assert.deepEqual(
    offenders,
    [],
    `Arbitrary font size — name the rung in styles/theme.css instead (text-2xs / -3xs / -4xs / -5xs below text-xs, text-4xl / -5xl above text-3xl):\n${offenders.join('\n')}`,
  )
})

test('every vendored font-size exemption is still a file that needs one', () => {
  const literals = classUsesMatching(FONT_SIZE_LITERAL)
  const stale = VENDORED_FONT_SIZE_LITERALS.filter(
    (entry) => !literals.some((use) => use.startsWith(`${entry.file}:`)),
  ).map((entry) => entry.file)
  assert.deepEqual(
    stale,
    [],
    `Exempted from the font-size rule but no longer carrying a literal: ${stale.join(', ')}. ` +
      'If the file moved, move the exemption with it; if the re-vendor dropped the literal, delete the exemption.',
  )
})
