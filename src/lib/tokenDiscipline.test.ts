import { readdirSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  classUsesMatching,
  sourceFiles,
  sourceMatching,
  stylesheetMatching,
  type TokenLayer,
} from '@/lib/tokenModel'
import { BRAND } from '@/config'

/**
 * The token-discipline rule, enforced — now against the one model.
 *
 * The rule itself has not moved: source consumes the SEMANTIC layer, never the
 * primitive ramps (`text-warning`, not `text-amber-1100`), and no raw value
 * where a token exists. This file is where it is written down — there is no
 * prose document stating it, and the citation that used to stand here pointed
 * at an engineering-standards document this repository does not have.
 *
 * What changed is the SAMPLE. The decision that one token model is the single
 * style seam made `tokenModel` the one reader, and `palette.test.ts` and
 * `styles/tokens.test.ts` were converted onto it; this file was the guard left
 * behind, still walking `src/components/**.tsx` with a reader of its own. That
 * decision's consequences say so in as many words, and name converting it as
 * the change that closes them. This is that change.
 *
 * WHAT THE WIDENING FOUND, on a tree of 399 files where the old sample was 185:
 *
 *  - `lib/filterToolbarButton.ts` carried `border-border/60` and
 *    `border-border/50` — the exact pattern the neutral-edge rule below
 *    forbids, in the one directory the old walk did not look at. It is the
 *    canonical case: a guard scoped to a folder is a guard that reports on the
 *    folder, not on the rule.
 *  - Twenty-seven hex matches, every one of them in `src/dev/`, which sat
 *    outside every style rule in this repository. Twenty-one are real colours
 *    in a dev-only instrument, exempted below by file and with a reason; the
 *    other six were parenthesised issue references in prose, and have since
 *    gone with the prose that carried them.
 *
 * Three rules are NEW here rather than widened, and they are the reason this
 * conversion is worth more than a scope change. `styles/theme.css` already
 * declares the rungs — `--text-5xl`, the radius ladder — because that sheet
 * converged with the deployment's ahead of this.
 * The vocabulary was there and nothing held the call sites to it, so nine bare
 * `rounded`, five bracketed z-indexes and four font-size literals had
 * accumulated against rungs that already existed. A token nothing enforces is
 * a token nobody finds.
 *
 * Two more close the ramp rule's own blind spots, and both came home from the
 * deployment this template is forked into, which grew them first. Absolute
 * `white` and `black` are ramps with the number left off, and `var(--color-
 * slate-500)` is `text-slate-500` spelled a second way; the ramp rule read
 * neither. Measured on this tree, the first found one component spelling
 * absolute white all through a bar that `semantic.css` had already given an
 * ink ladder — `CanvasAnnotationLayer.tsx`, which now consumes the ladder
 * instead of carrying an exemption — and the rest is categorical colour,
 * named file by file below with the reason each one is categorical.
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
 * resolve, silently, to colours that belong to no layer at all. The frozen
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

/**
 * The two colours that are a ramp with the number left off.
 *
 * `white` and `black` are primitives — Tailwind's own, absolute, outside every
 * family this design system declares and outside both themes. `bg-white` on a
 * surface that inverts is the same defect as `bg-gray-100` on one, minus the
 * step that would have made it visible to the rule above: a colour picked at a
 * call site because it was the nearest thing to hand, with no name saying what
 * job it does.
 *
 * The alpha modifiers come with them (`bg-white/60`, `ring-black/[0.04]`), and
 * they are the majority of the uses: an absolute colour at 10% is a wash, and a
 * wash is a role the vocabulary names.
 */
const ABSOLUTE_COLOURS = ['white', 'black']

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

const RAMPS = [...PRIMITIVE_RAMPS, ...FOREIGN_RAMPS].join('|')

/**
 * A ramp step, or an absolute, written as a utility class.
 *
 * Two branches because the shapes differ: a ramp step ends in its number, and
 * an absolute ends in an optional alpha modifier. The absolute branch closes on
 * `(?![\w-])` rather than `\b`, because `ring-black/[0.04]` ends on `]` and a
 * word boundary after a non-word character depends on what follows it — which
 * would have let the bracketed alpha form through while catching `/40`.
 */
const RAMP_OR_ABSOLUTE_UTILITY = new RegExp(
  `\\b(?:${UTILITY_PREFIXES})-(?:${RAMPS})-[0-9]{2,4}\\b` +
    `|\\b(?:${UTILITY_PREFIXES})-(?:${ABSOLUTE_COLOURS.join('|')})` +
    `(?:/(?:\\[[^\\]]+\\]|[0-9]+))?(?![\\w-])`,
  'g',
)

test('source takes colour from the semantic layer, not the primitive ramps', () => {
  const offenders = sourceMatching(RAMP_OR_ABSOLUTE_UTILITY).filter(
    (use) => !isCategorical(ABSOLUTE_EXEMPT_FILES, use),
  )
  assert.deepEqual(
    offenders,
    [],
    `Primitive/foreign ramp steps or absolute white/black in source — use the semantic token for the role instead:\n${offenders.join('\n')}`,
  )
})

/**
 * The `var()` spelling of the same reach.
 *
 * `text-slate-500` and `color: var(--color-slate-500)` name one colour by one
 * route, and the rule above can see the first and not the second. That is not
 * a gap in the pattern, it is a gap in the sample: a class-string rule reads
 * `src/**.tsx` and nothing else, so a stylesheet could consume a primitive at a
 * tier the same rule forbids a component to touch, and a TypeScript file could
 * too as long as it spelled the reach as a `var()` string handed to an inline
 * style rather than as a class.
 *
 * Both halves are closed here, against one pattern, because they are one rule:
 * `sourceMatching` for the application code and `stylesheetMatching` for the
 * sheets.
 *
 * TWO LAYERS ARE OUT OF SCOPE, and by layer rather than by filename, so the
 * scope survives a file being added or renamed. The `primitive` layer is where
 * the ramps are declared: `colors.css` and the exported palette in `global.css`
 * may name their own materials. The `registry` layer is `theme.css`, whose
 * whole job is minting a utility per ramp step — every match in it is the
 * tautology `--color-amber-100: var(--color-amber-100)`, which registers the
 * name rather than consuming it. Every other layer — the dials, the semantics,
 * the board's own domain vocabulary — must go through a name that says what
 * the colour is for.
 */
const VAR_PRIMITIVE = new RegExp(
  `var\\(\\s*--color-(?:${RAMPS})-[0-9]{2,4}\\s*\\)`,
  'g',
)

/** Layers whose job is to declare or register a ramp, not to consume one. */
const RAMP_OWNING_LAYERS: ReadonlyArray<TokenLayer> = ['primitive', 'registry']

/**
 * Every `var()` reach at a ramp step, source and stylesheet in one list.
 *
 * Stylesheet paths are prefixed `styles/` so the two namespaces cannot collide
 * in the exemption list below — `sourceMatching` reports relative to `src`, and
 * `stylesheetMatching` relative to `src/styles`.
 */
function varPrimitiveReaches(): string[] {
  return [
    ...sourceMatching(VAR_PRIMITIVE),
    ...stylesheetMatching(VAR_PRIMITIVE)
      .filter((use) => !RAMP_OWNING_LAYERS.includes(use.layer))
      .map((use) => `styles/${use.file}:${use.line}: ${use.match}`),
  ]
}

test('nothing outside the ramp-owning layers reaches a ramp step through var()', () => {
  const offenders = varPrimitiveReaches().filter(
    (use) => !isCategorical(VAR_PRIMITIVE_EXEMPT_FILES, use),
  )
  assert.deepEqual(
    offenders,
    [],
    `var(--color-{ramp}-{step}) outside colors.css / global.css / theme.css — use the semantic name for the role, or add a reasoned exemption if the colour is categorical:\n${offenders.join('\n')}`,
  )
})

/**
 * Categorical colour, named file by file, with the reason it is categorical.
 *
 * The two rules above, read all the way through this tree for the first time,
 * fail on well over a hundred places between them, and most of those are
 * correct code. That is not a sign the rules are too wide — it is what the
 * vocabulary looks like once something reads it end to end. A colour reaches
 * legitimately into the primitive layer when it is CATEGORICAL: it
 * distinguishes one thing from another and carries no meaning a semantic name
 * could hold. A lane's identity fill, a path's ink, an annotation swatch and a
 * scrim over arbitrary media are all that; they are picked from a ramp because
 * a ramp is a set of distinguishable materials, which is the one thing the
 * semantic layer is not.
 *
 * Named files rather than a narrowed pattern, for the reason the hex and
 * vendored font-size lists below already give: a pattern bent to step over a
 * real case reads, to the next person, as a rule that never covered it. Every
 * entry is asserted to still match something, so an exemption cannot outlive
 * the offender it was written for.
 *
 * One entry records a DEFERRAL rather than a justification, and says so:
 * `styles/blueprint.css`'s panel chrome is a genuine tier violation whose fix
 * changes rendered colour, so it waits on a decision about which semantic
 * rungs the board chrome gets rather than riding a guard change. Writing it
 * down as deferred is the difference between a guard that records a debt and a
 * guard that hides one.
 *
 * One file that measured as an offender is fixed rather than listed:
 * `CanvasAnnotationLayer.tsx` spelled absolute white all through the
 * annotation bars while `semantic.css` already declared the mode-invariant ink
 * ladder those bars sit on (`--foreground-annotation-chrome` and its rungs),
 * every rung the same white at an alpha the call sites already carried. It
 * consumes the ladder now, which is a rename rather than a retune.
 */
const ABSOLUTE_EXEMPT_FILES: ReadonlyArray<{ file: string; because: string }> = [
  {
    file: 'components/blueprint/FeaturedResources.tsx',
    because:
      'the play glyph sits on a video poster frame, not on a themed surface — its ground is whatever the author uploaded, so absolute white plus a drop shadow is the only ink that holds in both themes',
  },
  {
    file: 'components/blueprint/ZoomableImage.tsx',
    because:
      'a modal scrim darkens rather than inverts; `bg-foreground/70` — which this same file uses on the close button — would turn the backdrop pale in dark mode, and the vendored overlays it sits beside are all `bg-black/N`',
  },
  {
    file: 'components/cover/CoverSections.tsx',
    because:
      'the mat behind a `framed` cover image, which the variant exists to provide: that asset was authored on its own light ground, so the mat must stay white when the page does not',
  },
  {
    file: 'components/ui/dialog.tsx',
    because:
      'upstream shadcn overlay scrim (components.json — the CLI owns this file)',
  },
  {
    file: 'components/ui/drawer.tsx',
    because:
      'upstream shadcn overlay scrim (components.json — the CLI owns this file)',
  },
  {
    file: 'lib/filterToolbarButton.ts',
    because:
      'a 4% black hairline on a raised plate, which is a shadow written as a ring rather than an edge colour — the neutral semantics invert and a shadow must not, so it darkens in light and disappears in dark, which is what a shadow does',
  },
]

const VAR_PRIMITIVE_EXEMPT_FILES: ReadonlyArray<{
  file: string
  because: string
}> = [
  {
    file: 'components/editor/CanvasAnnotationLayer.tsx',
    because:
      'the line-style preview swatch, shown at `--color-gray-700` until a stroke colour is chosen — it stands in for a swatch the user has not picked yet, so it is one member of the swatch set rather than a role',
  },
  {
    file: 'lib/blueprintCellStyle.ts',
    because:
      "the grid's rules, held at one neutral across every lane so a row of differently-tinted cells reads as one table — the board's own chrome ladder, the same one `blueprintTheme.ts` documents below",
  },
  {
    file: 'lib/blueprintTheme.ts',
    because:
      'eleven board-chrome values plus three lane label inks. The chrome is a slate-tinted grey ladder with no equivalent in the neutral semantic set — the file records the measurement, `divider` misses its nearest semantic match by Δ97 — and the label inks are the step-1200 text of the lane family each section names, which is lane identity',
  },
  {
    file: 'lib/canvasAnnotations.ts',
    because:
      'the annotation swatch set — ink, paper, sticky fill and the agent ink, four members of the eight-family palette the swatch pickers offer. A swatch has no role: it is the colour a reader chose, and its token string is what the annotation row stores',
  },
  {
    file: 'lib/pathColorTheme.ts',
    because:
      'the happy / variant / exception path inks and their arrow strokes. A path is a category, not a status — the families are chosen so paths stay apart on a board whose lanes are already coloured, which no semantic name expresses',
  },
  {
    file: 'styles/blueprint.css',
    because:
      'both halves of the board. The bulk are the lane-family identity steps — surface, hover, pressed, ring and ink per `[data-blueprint-lane]` — which is categorical exactly as a lane fill should be. The rest are the phase and scenario panel chrome, and those are DEFERRED, not categorical: the same slate ladder `blueprintTheme.ts` carries, moved here when the hover states became CSS rules, and waiting on the decision that gives the board chrome semantic rungs',
  },
  {
    file: 'styles/semantic.css',
    because:
      'one declaration, `--annotation-selected`. Blue step 900 is the mode-stable solid step, so annotation selection chrome holds still when the presentation stage flips to `.dark` — a semantic name would follow the theme, which is the one thing this outline must not do',
  },
]

const isCategorical = (
  list: ReadonlyArray<{ file: string; because: string }>,
  use: string,
): boolean => list.some((entry) => use.startsWith(`${entry.file}:`))

const staleIn = (
  list: ReadonlyArray<{ file: string; because: string }>,
  matches: string[],
): string[] =>
  list
    .filter((entry) => !matches.some((use) => use.startsWith(`${entry.file}:`)))
    .map((entry) => entry.file)

test('every absolute-colour exemption is still a file that needs one', () => {
  const stale = staleIn(
    ABSOLUTE_EXEMPT_FILES,
    sourceMatching(RAMP_OR_ABSOLUTE_UTILITY),
  )
  assert.deepEqual(
    stale,
    [],
    `Exempted from the ramp rule but no longer matching it: ${stale.join(', ')}. ` +
      'If the file moved, move the exemption with it; if the colour is gone, delete the exemption.',
  )
})

test('every var() ramp exemption is still a file that needs one', () => {
  const stale = staleIn(VAR_PRIMITIVE_EXEMPT_FILES, varPrimitiveReaches())
  assert.deepEqual(
    stale,
    [],
    `Exempted from the var() ramp rule but no longer matching it: ${stale.join(', ')}. ` +
      'If the file moved, move the exemption with it; if the reach is gone, delete the exemption.',
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
 * which is the liveness problem the single-style-seam decision already flags;
 * tokens instead would make a fixed visual reference invert with the theme,
 * which is the one thing a reference held against a golden snapshot must not
 * do. The page also carries two `(#NNN)` references in JSX text, which a
 * three-digit hex pattern cannot tell from `#fff`.
 *
 * Every entry is asserted below to still match something, so a file that stops
 * needing its exemption loses it instead of leaving a dead carve-out behind
 * for the next hex to slip through. `arrowSituationCatalog.ts` was the second
 * entry and is the rule working: it carried no colour at all, only
 * parenthesised issue references inside the `note:` prose of its fixtures —
 * in a string rather than a comment, so comment-stripping could not reach them
 * and a three-digit hex pattern could not tell them from `#fff`. Those
 * references have gone from the prose, so the carve-out goes with them.
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

/**
 * THE ONE PLACE A HEX BELONGS, and why the rule has to know about it.
 *
 * `config.ts` is the brand seam. A deployment built on this template writes
 * its own accent there and layers a theme whose `--brand-*` ramp is drawn at
 * that hue. The accent cannot itself be a token, because it is the input the
 * tokens are derived FROM — so a rule that forbids every hex in source forbids
 * the one hex the architecture requires, and a deployment adopting this guard
 * has to either fork it or unenrol the file. Both are worse than saying it
 * here.
 *
 * So the seam is allowed exactly ONE hex, and it is CHECKED rather than merely
 * permitted: the hex present must be the accent `BRAND` exports. A second hex,
 * or one that is not the accent, is a colour hiding in the only file nothing
 * else guards.
 *
 * This template has no accent, so the allowance is zero here and the rule is
 * exactly as strict as it was. That is the point of writing it this way: the
 * behaviour is identical in the tree with no brand and correct in the tree
 * that has one, so a single file serves both and neither has to fork it.
 */
function seamOffence(seam: readonly string[], accent: string | undefined): string | null {
  if (accent === undefined) {
    return seam.length === 0
      ? null
      : `config.ts carries a hex but BRAND exports no accent — name it as the accent or take it out:\n${seam.join('\n')}`
  }
  if (seam.length !== 1) {
    return `config.ts may carry exactly one hex, the brand accent:\n${seam.join('\n')}`
  }
  // Compared as a colour, not as text: `#0B6E4F` and `#0b6e4f` are the same
  // paint, and a rule that called one of them an offender would be reporting a
  // typing habit rather than a colour.
  const hex = seam[0].slice(seam[0].lastIndexOf(' ') + 1).toLowerCase()
  return hex === accent.toLowerCase()
    ? null
    : `the hex in config.ts is not the accent it exports: ${seam[0]}`
}

/**
 * The seam rule, on inputs this tree cannot produce.
 *
 * Half of `seamOffence` is unreachable in a template with no accent, and it is
 * the half the deployment runs. Checking it against fabricated seams is the
 * only way the branch a fork depends on is exercised at all before the fork
 * runs it.
 */
test('the brand seam allows one hex, and only the accent', () => {
  const at = (hex: string) => `config.ts:21: ${hex}`
  assert.equal(seamOffence([], undefined), null)
  assert.equal(seamOffence([at('#0b6e4f')], '#0b6e4f'), null)
  // Case is a typing habit, not a different colour.
  assert.equal(seamOffence([at('#0B6E4F')], '#0b6e4f'), null)
  // A hex with no accent to be: the seam is not a place to keep a colour.
  assert.ok(seamOffence([at('#0b6e4f')], undefined))
  // An accent with a second hex beside it, which the accent's own exemption
  // would otherwise carry through unread.
  assert.ok(seamOffence([at('#0b6e4f'), at('#ff0000')], '#0b6e4f'))
  // A hex that is not the accent: branded-looking, and unrelated to the ramp
  // every token in the deployment is drawn from.
  assert.ok(seamOffence([at('#ff0000')], '#0b6e4f'))
  // An accent declared and no hex present — the theme is drawn at a hue the
  // seam never states.
  assert.ok(seamOffence([], '#0b6e4f'))
})

test('source carries no raw hex colours, bar the one the brand seam takes', () => {
  const found = sourceMatching(RAW_HEX)
  const seam = found.filter((entry) => entry.startsWith('config.ts:'))
  assert.equal(seamOffence(seam, BRAND.accent), null)
  const offenders = found.filter((use) => !hexIsExempt(use) && !seam.includes(use))
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
 * The type scale floors at `xs` (12px). The decision that a rung owns size and
 * leading: a rung is chosen for the text's job, never to fit a container.
 * `--text-5xl` is already declared in `styles/theme.css` for the same reason a
 * literal is forbidden — and four call sites were still writing the literal,
 * because nothing in this repository asked them not to.
 *
 * The rule reads px AND rem, because a px-scoped pattern leaves the identical
 * gap open at the top of the scale: the two display headings were written in
 * rem — `text-[2.5rem]` on the scenario slide title, `sm:text-[2.25rem]` on the
 * cover title — and neither is a px literal. `--text-5xl` is the top rung
 * (46px sans / 48px mono) and 36px was already Tailwind's `text-4xl`.
 *
 * `em` is NOT covered, and that is a rule rather than a hole. `text-[0.85em]`
 * and `text-[0.8em]` on markdown inline and fenced code are a proportion
 * of whatever encloses them — the same code at a different enclosing size is a
 * different number of pixels, which is the point — and no fixed rung can
 * express that. A rung is an absolute size: every `--text-*` this codebase
 * declares is one, commented in px. Cover inline code inherits its enclosing
 * rung instead, so it matches the sentence beside it.
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
    `Arbitrary font size — name the rung in styles/theme.css instead (text-xs is the floor; text-4xl / -5xl above text-3xl):\n${offenders.join('\n')}`,
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
