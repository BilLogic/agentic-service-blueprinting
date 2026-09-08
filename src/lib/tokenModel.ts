import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hslToRgb, type Rgb } from '@/lib/oklch'

/**
 * One queryable model of the visual vocabulary. Test-time only.
 *
 * The style rules in this repository were enforced by three independent files
 * — `styles/tokens.test.ts`, `lib/palette.test.ts`, `lib/tokenDiscipline.test.ts`
 * — and each one carried its own reader. `tokens.test.ts` concatenated every
 * stylesheet into a single string and swept it for `--name:`, which can answer
 * "is this name written down somewhere" and nothing else. `palette.test.ts`
 * opened `colors.css`, `semantic.css` and both theme files itself, and read a
 * dial by taking the first `--name:` match in one file. Three readers, three
 * samples, and no shared answer to the question every colour rule actually
 * rests on: what does this name resolve to, at the root, under this theme.
 *
 * A fourth ad-hoc guard would have made a fourth reader. So this module is the
 * single seam — the decision that one token model is the single style seam:
 * it answers what is declared, where, under which selector, at what value once
 * the cascade has run, and who consumes it — and every rule becomes an
 * assertion against those answers rather than a new file walker. Widen the
 * sampling here and every rule inherits the fix.
 *
 * Three things in this tree defeat the simpler readers it replaces, and each
 * one is why a piece of the parser below looks the way it does:
 *
 *  - `print.css` declares `--surface`, `--contrast` and most of the dial set
 *    inside `@media print`, and `colors.css` wraps its entire dark palette in
 *    `@media screen`. A reader with no at-rule context reports `print.css` as
 *    the winner for every dial in both themes, and cannot see that the light
 *    ramps are what reach paper. Both are asked about deliberately, so the
 *    printed page is a cascade with an answer rather than a blind spot.
 *  - Forty-two declarations in this tree are wrapped across lines, thirty-six
 *    of them in `semantic.css` — `--primary` itself among them, along with
 *    `--primary-foreground`, `--border` and `--input`. A per-line regex cannot
 *    see any of them.
 *  - `unset-tw-colors.css` is seventeen `--color-amber-*: initial` namespace
 *    resets and nothing else. A property pattern that stops at the hyphen
 *    makes the whole file invisible.
 *
 * NOT in the model: the compiled artifact. Liveness — "does this name still
 * have a consumer" — cannot be read off the stylesheets alone, and this repo
 * has its own proof: `--colors-white` is declared in `global.css` and read
 * exactly once, from a JSX attribute in `components/editor/CanvasPenCursor.tsx`.
 * Nothing asserted today needs the compiled output; a deletion pass would, and
 * that pass has a prerequisite to land first. Tailwind v4 scans non-gitignored
 * markdown, so a class name written in a document under `docs/` generates that
 * class in the compiled CSS and would stand as the evidence that the token it
 * names is live. `styles/tailwind.config.css` carries no `@source` exclusion
 * for `docs/` today, so that exclusion is step one of the phase that needs the
 * artifact, not something to bolt on afterwards.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '..')
const STYLES = resolve(SRC, 'styles')
/** The stylesheet entry. Import order is read from it, never restated here. */
const ENTRY = resolve(STYLES, 'tailwind.config.css')

export type Theme = 'light' | 'dark'

/**
 * Which output medium the cascade is being read for.
 *
 * `screen` sets `@media print` blocks aside; `print` sets `@media screen`
 * blocks aside and lets the print block win. Both halves matter, and neither
 * is decoration: `print.css` restates dials inside `@media print`, and
 * `colors.css` wraps its ENTIRE dark palette in `@media screen` precisely so
 * that the light ramps above it are what reaches paper. A reader with one
 * medium can describe neither arrangement.
 */
export type Medium = 'screen' | 'print'

/**
 * Which layer a name is declared in. A name may appear in exactly one.
 *
 * `dial` is the small set of per-theme inputs; `primitive` the ramps in
 * `colors.css` and the exported palette in `global.css`; `semantic` the
 * derived answers to questions a component asks; `domain` the board's own
 * vocabulary in `blueprint.css`; `registry` the `@theme` keys that mint
 * utilities and the resets that clear Tailwind's own.
 */
export type TokenLayer =
  | 'dial'
  | 'primitive'
  | 'semantic'
  | 'domain'
  | 'registry'

export type Declaration = {
  /** `--surface-hue` */
  name: string
  /** Right-hand side, trimmed and whitespace-collapsed, `var()`s intact. */
  value: string
  /** The selector list the declaration sits under, e.g. `:root, .light`. */
  selector: string
  /**
   * The at-rules and outer selectors wrapping it, outermost first — e.g.
   * `['@media print']` for the print override block. A declaration inside a
   * print-only block is not part of the screen cascade, and a model that
   * could not see that would report `print.css` as the winner for every dial.
   */
  context: string[]
  /** Path relative to `src/styles`, e.g. `themes/light.css`. */
  file: string
  line: number
  layer: TokenLayer
}

export type Consumer = {
  /** The name consumed, e.g. `--motion-micro`. */
  name: string
  /** Path relative to `src`, e.g. `components/editor/CanvasPenCursor.tsx`. */
  file: string
  line: number
  kind: 'stylesheet' | 'source'
  /**
   * How the name was read. `var` is the ordinary function; anything else is
   * Tailwind v4's bare-value shorthand, where the utility itself is the
   * function — `duration-(--motion-micro)`, `w-(--sidebar-width)`. The
   * shorthand resolves the property exactly as `var()` does, so a rule that
   * only knew about `var(` would let a whole class of reference dangle.
   */
  via: string
  /**
   * Was a fallback supplied — `var(--x, 12px)`? A name read WITH a fallback
   * still renders when nothing declares it, so a rule about dangling
   * references has to be able to tell the two apart. The blueprint cell
   * tokens depend on this: every consumer reads them as
   * `var(--…-blueprint-cell, <default>)` and the fallback arm IS the resting
   * state, so those names are undeclared at the root on purpose.
   */
  hasFallback: boolean
}

/**
 * A custom property declared from TypeScript rather than from a stylesheet.
 *
 * Four shapes, and all four are this app declaring a token: an inline style
 * key (`{ '--x': value }`), Tailwind's arbitrary-property syntax inside a
 * class string (`[--x:value]`), an imperative `setProperty('--x', …)`, and
 * the named constant such a call goes through (`const FOO_VAR = '--x'`). The
 * last one matters more than it looks — this codebase routes most of its
 * imperative writes through a named constant, and a reader that only saw
 * literal `setProperty` calls would miss every one of them.
 */
export type SourceDeclaration = {
  name: string
  /** Path relative to `src`. */
  file: string
  line: number
  via: 'style-key' | 'arbitrary-property' | 'set-property' | 'named-constant'
}

export type SourceFile = {
  /** Path relative to `src`. */
  file: string
  /** Contents with comments stripped — a comment naming a class is not a use. */
  code: string
}

export type Stylesheet = {
  /** Path relative to `src/styles`. */
  file: string
  text: string
  /**
   * Position in the cascade. Files the entry imports carry their import index;
   * a stylesheet the entry never imports is not in the cascade at all.
   */
  order: number
}

// ---------------------------------------------------------------------------
// Stylesheets
// ---------------------------------------------------------------------------

function layerOf(file: string): TokenLayer {
  if (file.startsWith('themes/')) return 'dial'
  if (file === 'colors.css' || file === 'global.css') return 'primitive'
  if (file === 'theme.css' || file === 'unset-tw-colors.css') return 'registry'
  if (file === 'blueprint.css') return 'domain'
  return 'semantic'
}

let cachedSheets: Stylesheet[] | null = null

/**
 * Every stylesheet under `src/styles`, in cascade order.
 *
 * Order comes from the `@import` list in the entry sheet rather than from a
 * list here, because the entry's own header says source order is what breaks
 * the `:root`-versus-`.dark` tie — a model that guessed the order would be
 * wrong about exactly the case that matters.
 */
export function stylesheets(): Stylesheet[] {
  if (cachedSheets) return cachedSheets
  const entry = readFileSync(ENTRY, 'utf8')
  const imported = [...entry.matchAll(/@import\s+'\.\/([^']+)'/g)].map(
    ([, path]) => path,
  )
  const onDisk = cssFiles(STYLES).map((path) =>
    relative(STYLES, path).split('\\').join('/'),
  )
  const ordered = [
    ...imported,
    ...onDisk.filter((file) => !imported.includes(file)).sort(),
  ]
  cachedSheets = ordered.map((file, order) => ({
    file,
    text: readFileSync(resolve(STYLES, file), 'utf8'),
    // Files the entry never imports sort after everything it does, and are
    // excluded from cascade resolution below.
    order: imported.includes(file) ? order : Number.POSITIVE_INFINITY,
  }))
  return cachedSheets
}

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry)
    if (statSync(path).isDirectory()) return cssFiles(path)
    return entry.endsWith('.css') ? [path] : []
  })
}

/** One stylesheet by its path relative to `src/styles`. */
export function stylesheet(file: string): Stylesheet {
  const sheet = stylesheets().find((entry) => entry.file === file)
  if (!sheet) throw new Error(`no such stylesheet: ${file}`)
  return sheet
}

// ---------------------------------------------------------------------------
// Declarations
// ---------------------------------------------------------------------------

let cachedDeclarations: Declaration[] | null = null

/**
 * Every custom property declared anywhere under `src/styles`, in cascade order.
 *
 * The parser tracks the selector each declaration sits under by watching brace
 * depth: at depth 1 inside a top-level rule the selector is that rule's, and a
 * nested rule (`&:hover`, a media query's child, the `[data-blueprint-tone]`
 * blocks nested inside the board's own scope) reports the innermost selector
 * with everything outside it in `context`. That is enough to answer "does this
 * rule apply at the root under `.dark`", which is the only question the
 * cascade resolver asks.
 */
export function declarations(): Declaration[] {
  if (cachedDeclarations) return cachedDeclarations
  cachedDeclarations = allDeclarations().filter((entry) =>
    entry.name.startsWith('--'),
  )
  return cachedDeclarations
}

/**
 * Every rule that declares a given CSS property, anywhere in the tree.
 *
 * Takes ordinary properties as well as custom ones, so a rule can ask about
 * `animation:` or `transition:` without opening files of its own.
 */
export function rulesDeclaring(property: string): Declaration[] {
  return allDeclarations().filter((entry) => entry.name === property)
}

let cachedAll: Declaration[] | null = null

/**
 * Every declaration in every stylesheet, with the selector it sits under.
 *
 * A character scanner rather than a per-line regex, because the per-line
 * version could only see a declaration that closed its own line. Forty-two in
 * this tree do not — `--primary`, `--primary-foreground`, `--border`,
 * `--input` and thirty-two more in `semantic.css` alone are written as
 * multi-line `oklch(…)` calls, so the most-derived names in the system would
 * be invisible to the seam that exists to see them. Nothing would have failed:
 * a rule only fails on what it can read.
 *
 * Values are whitespace-collapsed, so a declaration means the same thing
 * whichever way it was wrapped.
 */
function allDeclarations(): Declaration[] {
  if (cachedAll) return cachedAll
  const out: Declaration[] = []
  for (const sheet of stylesheets()) {
    const layer = layerOf(sheet.file)
    const stack: string[] = []
    let buffer = ''
    let line = 1
    // The line the buffer's first non-blank character sits on, so a wrapped
    // declaration is reported where its name is, not where its `;` is.
    let bufferLine = 1
    const flush = () => {
      // `--color-amber-*` is a Tailwind namespace reset, and a declaration:
      // `unset-tw-colors.css` is seventeen of them and nothing else, and a
      // name pattern that stopped at the hyphen made the whole file invisible.
      const declaration =
        /^\s*(-{2}[a-zA-Z0-9-]+\*?|[a-z-]+)\s*:\s*([\s\S]*)$/.exec(buffer)
      if (declaration) {
        out.push({
          name: declaration[1],
          value: declaration[2].trim().replace(/\s+/g, ' '),
          selector: stack[stack.length - 1] ?? '',
          context: stack.slice(0, -1),
          file: sheet.file,
          line: bufferLine,
          layer,
        })
      }
      buffer = ''
    }
    for (const char of blankComments(sheet.text)) {
      if (char === '\n') line += 1
      if (char === '{') {
        stack.push(buffer.trim().replace(/\s+/g, ' '))
        buffer = ''
      } else if (char === '}') {
        // An unterminated final declaration (`color: red }`) is still one.
        flush()
        stack.pop()
      } else if (char === ';') {
        flush()
      } else {
        if (!buffer.trim() && char.trim()) bufferLine = line
        buffer += char
      }
    }
  }
  cachedAll = out
  return cachedAll
}

/**
 * Blank out CSS comments while keeping every newline, so line numbers survive.
 *
 * Needed because the selector a declaration sits under is assembled from the
 * text before its `{`, and this codebase writes a paragraph of prose above
 * almost every block — a per-line comment strip would leave that prose glued
 * to the selector.
 */
function blankComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n]/g, ' '),
  )
}

/** Every declaration in one stylesheet. */
export function declarationsIn(file: string): Declaration[] {
  return declarations().filter((entry) => entry.file === file)
}

/** The distinct names one stylesheet declares. */
export function namesIn(file: string): Set<string> {
  return new Set(declarationsIn(file).map((entry) => entry.name))
}

// ---------------------------------------------------------------------------
// Cascade
// ---------------------------------------------------------------------------

/**
 * Does this selector list apply to the root element under `theme`?
 *
 * `:root`, `.light` and `.dark` all carry specificity (0,1,0), so whichever
 * rule comes last in source order wins — which is the whole mechanism behind
 * the theme flip: `themes/light.css` matches bare `:root`, `:root` matches
 * `<html class="dark">` too, and light imports before dark but after
 * `semantic.css`. Anything more specific, or scoped to a subtree, is not the
 * root cascade and is skipped.
 */
function appliesAtRoot(selector: string, theme: Theme): boolean {
  if (!selector) return false
  return selector.split(',').some((part) => {
    const trimmed = part.trim()
    if (trimmed === ':root') return true
    if (trimmed === '.light') return theme === 'light'
    if (trimmed === '.dark') return theme === 'dark'
    // next-themes stamps the class on documentElement, so `:root.light` and
    // friends are the same element wearing both.
    if (trimmed === ':root.light' || trimmed === 'html.light')
      return theme === 'light'
    if (trimmed === ':root.dark' || trimmed === 'html.dark')
      return theme === 'dark'
    return false
  })
}

/**
 * Does the at-rule context wrapping a declaration apply on `medium`?
 *
 * Only the root cascade counts, so anything nested under a selector rather
 * than an at-rule is out whichever medium is asked for. Among the at-rules,
 * a query naming one medium and not the other applies on that one alone;
 * everything else (`@supports`, `@layer`, a width query, `screen, print`)
 * applies on both.
 */
function appliesOn(context: string[], medium: Medium): boolean {
  return context.every((rule) => {
    if (!rule) return true
    if (!/^@(media|supports|layer)\b/.test(rule)) return false
    if (!/^@media\b/.test(rule)) return true
    const print = /\bprint\b/.test(rule)
    const screen = /\bscreen\b/.test(rule)
    if (print === screen) return true
    return medium === 'print' ? print : screen
  })
}

/**
 * The declaration that wins at the root element under `theme`, or undefined.
 *
 * This is the question no reader in this repo could answer before: not what a
 * file says about `--surface-hue`, but what `--surface-hue` resolves to once
 * the medium's at-rules have been sorted out and source order has broken the
 * `:root`/`.dark` tie.
 *
 * `medium` is what makes the printed page measurable. On `screen` the
 * `@media print` block in `print.css` is set aside; on `print` it is the
 * override that wins, and `colors.css`'s `@media screen` dark palette is the
 * thing set aside instead. Printing from dark mode is a real cascade with a
 * real answer, and asking for it is how a rule can hold that answer to
 * something.
 */
export function winningDeclaration(
  name: string,
  theme: Theme,
  medium: Medium = 'screen',
): Declaration | undefined {
  const order = new Map(stylesheets().map((sheet) => [sheet.file, sheet.order]))
  let winner: Declaration | undefined
  for (const entry of declarations()) {
    if (entry.name !== name) continue
    if (!Number.isFinite(order.get(entry.file) ?? Infinity)) continue
    if (!appliesOn(entry.context, medium)) continue
    if (!appliesAtRoot(entry.selector, theme)) continue
    winner = entry
  }
  return winner
}

/**
 * The value of `name` at the root under `theme`, with `var()` chased through.
 *
 * Falls back to a `var()`'s own default (`var(--x, 12px)`) when the referenced
 * name resolves to nothing, which is what the browser does. `medium` selects
 * which cascade is being asked about — the screen one by default, the printed
 * one on request.
 */
export function resolveValue(
  name: string,
  theme: Theme,
  medium: Medium = 'screen',
): string | undefined {
  return resolveIn(name, theme, medium, new Set())
}

function resolveIn(
  name: string,
  theme: Theme,
  medium: Medium,
  seen: Set<string>,
): string | undefined {
  if (seen.has(name)) return undefined
  seen.add(name)
  const declaration = winningDeclaration(name, theme, medium)
  if (!declaration) return undefined
  return substitute(declaration.value, theme, medium, seen)
}

function substitute(
  value: string,
  theme: Theme,
  medium: Medium,
  seen: Set<string>,
): string {
  return value.replace(
    /var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*([^()]*))?\)/g,
    (whole, referenced: string, fallback: string | undefined) => {
      const resolved = resolveIn(referenced, theme, medium, new Set(seen))
      if (resolved !== undefined) return resolved
      if (fallback !== undefined) return fallback.trim()
      return whole
    },
  )
}

// ---------------------------------------------------------------------------
// Source
// ---------------------------------------------------------------------------

let cachedSource: SourceFile[] | null = null

/**
 * Every non-test TypeScript file under `src`, comments stripped.
 *
 * The whole of `src`, deliberately, and not the shorter list of roots that
 * would look tidier. The rule this model absorbed — "every custom-property
 * reference in the app resolves to something" — already read the entire tree,
 * so a model sampling less than that would have narrowed a live guard while
 * claiming to generalise it. Sampling is the one thing a single seam exists to
 * get right, and the safe direction is outward.
 */
export function sourceFiles(): SourceFile[] {
  if (cachedSource) return cachedSource
  cachedSource = tsFiles(SRC)
    .map((path) => ({
      file: relative(SRC, path).split('\\').join('/'),
      code: stripComments(readFileSync(path, 'utf8')),
    }))
    .sort((a, b) => a.file.localeCompare(b.file))
  return cachedSource
}

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry)
    if (statSync(path).isDirectory()) return tsFiles(path)
    if (!/\.tsx?$/.test(entry)) return []
    if (entry.includes('.test.')) return []
    return [path]
  })
}

/**
 * A comment naming the class it replaced is not a use of that class.
 *
 * Block comments are BLANKED rather than deleted, for the same reason
 * `blankComments` blanks them in the stylesheets: every newline has to
 * survive, or every line number this model reports after a file's header
 * comment is wrong. It used to delete them, and the drift was not small —
 * `dev/ArrowSituationCatalogPage.tsx` opens with a thirteen-line header, so
 * the `#2563eb` on its line 28 was reported at line 15, pointing the reader
 * at an import. Nothing failed while it was wrong, because a passing rule
 * reports no lines at all; the number only has to be right at the moment a
 * rule starts failing, which is the moment nobody is checking it.
 */
export function stripComments(source: string): string {
  return blankComments(source).replace(/(^|[^:])\/\/.*$/gm, '$1')
}

let cachedSourceDeclarations: SourceDeclaration[] | null = null

/** Every custom property this app declares from TypeScript. */
export function sourceDeclarations(): SourceDeclaration[] {
  const cached = cachedSourceDeclarations
  if (cached) return cached
  const patterns: ReadonlyArray<readonly [SourceDeclaration['via'], RegExp]> = [
    ['style-key', /['"`](--[\w-]+)['"`]\s*:/g],
    ['arbitrary-property', /\[(--[\w-]+):/g],
    ['set-property', /setProperty\(\s*['"`](--[\w-]+)['"`]/g],
    ['named-constant', /=\s*['"`](--[\w-]+)['"`]/g],
  ]
  const out: SourceDeclaration[] = []
  for (const source of sourceFiles()) {
    source.code.split('\n').forEach((text, index) => {
      for (const [via, pattern] of patterns) {
        for (const match of text.matchAll(pattern)) {
          out.push({ name: match[1], file: source.file, line: index + 1, via })
        }
      }
    })
  }
  cachedSourceDeclarations = out
  return out
}

/**
 * Every name this app declares, from either side of the seam.
 *
 * A stylesheet declaration and a TypeScript one are the same fact to a
 * consumer: the property has a value at the point it is read. Which side it
 * came from is a question `declarationsIn` and `sourceDeclarations` answer
 * separately, for the rules that care.
 */
export function declaredNames(): Set<string> {
  return new Set([
    ...declarations().map((entry) => entry.name),
    ...sourceDeclarations().map((entry) => entry.name),
  ])
}

// ---------------------------------------------------------------------------
// Consumers
// ---------------------------------------------------------------------------

let cachedConsumers: Consumer[] | null = null

/**
 * Everywhere a custom property is read.
 *
 * Three shapes, and the model needs all three. `var(--x)` in a stylesheet is
 * the obvious one. `var(--x)` inside a class string or template literal in
 * source is the second. The third is Tailwind v4's bare-value shorthand —
 * `duration-(--motion-micro)`, `w-(--sidebar-width)` — where the utility name
 * stands in for `var`, and which a `var(`-only scan reads straight past.
 *
 * The inline style KEY (`{ '--x': value }`) is a declaration, not a read, and
 * lives in `sourceDeclarations` instead.
 */
export function consumers(): Consumer[] {
  if (cachedConsumers) return cachedConsumers
  const out: Consumer[] = []
  // The function name is captured so a failure can say how the name was
  // reached, and the comma so a rule can tell `var(--x)` from `var(--x, 1px)`.
  const VAR_ONLY = /(var)\(\s*(--[a-zA-Z0-9-]+)\s*(,?)/g
  // `[\w-]` carries the trailing hyphen, so `w-`, `max-h-` and `duration-`
  // are each read as the "function" standing in for `var`.
  const VAR_OR_UTILITY = /([a-zA-Z][\w-]*)\(\s*(--[a-zA-Z0-9-]+)\s*(,?)/g
  const push = (
    text: string,
    file: string,
    kind: Consumer['kind'],
    pattern: RegExp,
  ) => {
    text.split('\n').forEach((line, index) => {
      for (const match of line.matchAll(pattern)) {
        out.push({
          name: match[2],
          file,
          line: index + 1,
          kind,
          via: match[1],
          hasFallback: match[3] === ',',
        })
      }
    })
  }
  for (const sheet of stylesheets()) {
    // Comments blanked: `var(--brand-N)` written in a header paragraph to
    // explain a naming convention is prose, not a read, and four stylesheets
    // carry exactly that. Blanking rather than deleting keeps line numbers.
    //
    // `var(` only on this side, because the bare-value shorthand widened for
    // below is a UTILITY-CLASS idiom that cannot appear in a stylesheet. Left
    // broad, it reads Tailwind v4's own `--value(--color-*)` in an `@utility`
    // body as a dangling reference, which it is not.
    push(blankComments(sheet.text), sheet.file, 'stylesheet', VAR_ONLY)
  }
  for (const source of sourceFiles()) {
    push(source.code, source.file, 'source', VAR_OR_UTILITY)
  }
  cachedConsumers = out
  return cachedConsumers
}

/** Every read of one name. */
export function consumersOf(name: string): Consumer[] {
  return consumers().filter((entry) => entry.name === name)
}

// ---------------------------------------------------------------------------
// Class strings
// ---------------------------------------------------------------------------

export type ClassUse = {
  /** The utility as written, e.g. `z-[30]` or `border-border/60`. */
  utility: string
  file: string
  line: number
}

let cachedClassUses: ClassUse[] | null = null

/**
 * Every utility-shaped token that appears inside a quoted string in source.
 *
 * Quoted-string-only on purpose: it keeps identifiers, imports and prose out
 * of the sample without needing to know which prop a string ends up on.
 */
export function classUses(): ClassUse[] {
  if (cachedClassUses) return cachedClassUses
  const out: ClassUse[] = []
  for (const source of sourceFiles()) {
    source.code.split('\n').forEach((line, index) => {
      for (const match of line.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)) {
        const body = match[1] ?? match[2] ?? match[3] ?? ''
        for (const token of body.split(/\s+/)) {
          if (!token) continue
          if (!/^[-a-z@[\]:.]/i.test(token)) continue
          out.push({ utility: token, file: source.file, line: index + 1 })
        }
      }
    })
  }
  cachedClassUses = out
  return cachedClassUses
}

/** Every class use matching a pattern, as `file:line: utility` strings. */
export function classUsesMatching(pattern: RegExp): string[] {
  return classUses()
    .filter((use) => {
      pattern.lastIndex = 0
      return pattern.test(use.utility)
    })
    .map((use) => `${use.file}:${use.line}: ${use.utility}`)
}

/** Every source line matching a pattern, as `file:line: match` strings. */
export function sourceMatching(pattern: RegExp): string[] {
  const out: string[] = []
  for (const source of sourceFiles()) {
    source.code.split('\n').forEach((line, index) => {
      for (const match of line.matchAll(pattern)) {
        out.push(`${source.file}:${index + 1}: ${match[0]}`)
      }
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

/**
 * Colour, re-exported.
 *
 * The arithmetic itself lives in `oklch.ts`, so the brand-accent reader — which
 * runs in a browser — can reach it without dragging this module's `node:fs`
 * reads along. Re-exported here rather than moved out of sight, because every
 * colour rule in the suite asks this model its questions and the seam ADR says
 * there is one place to ask.
 */
export type { Rgb } from '@/lib/oklch'
export {
  chromaCeiling,
  contrast,
  derivedFillInk,
  hexToRgb,
  hslToRgb,
  inSrgbGamut,
  oklch,
  oklchFromSrgb,
  oklchHue,
  oklchToLinearSrgb,
  relativeLuminance,
} from '@/lib/oklch'

const scaleCache = new Map<Theme, Map<string, Rgb>>()

/**
 * The `--color-{family}-{step}` ramps for one theme, keyed `family-step`.
 *
 * Read straight off `colors.css`: light in the leading `:root` block, dark in
 * the `@media screen` block that follows it.
 */
export function palette(theme: Theme): Map<string, Rgb> {
  const cached = scaleCache.get(theme)
  if (cached) return cached
  const css = stylesheet('colors.css').text
  const darkStart = css.indexOf('@media screen {')
  const block =
    theme === 'light'
      ? css.slice(css.indexOf(':root {'), darkStart)
      : css.slice(darkStart)
  const scale = new Map<string, Rgb>()
  const declaration =
    /--color-([a-z]+)-(\d+):\s*hsla?\(\s*([\d.]+)(?:deg)?,\s*([\d.]+)%,\s*([\d.]+)%/g
  for (const [, family, step, h, s, l] of block.matchAll(declaration)) {
    scale.set(`${family}-${step}`, hslToRgb(Number(h), Number(s), Number(l)))
  }
  return scaleCache.set(theme, scale), scale
}

/** Resolve a `var(--color-family-step)` string against one theme. */
export function resolvePaletteToken(token: string, theme: Theme): Rgb {
  const match = /--color-([a-z]+-\d+)/.exec(token)
  if (!match) throw new Error(`not a palette token: ${token}`)
  const value = palette(theme).get(match[1])
  if (!value) throw new Error(`missing from colors.css: ${match[1]}`)
  return value
}

/** A numeric dial's value at the root under `theme`. */
export function dial(name: string, theme: Theme): number {
  const value = resolveValue(name, theme)
  if (value === undefined) throw new Error(`dial not declared: ${name}`)
  const number = /^-?[\d.]+/.exec(value.trim())
  if (!number)
    throw new Error(`dial ${name} is not numeric under ${theme}: ${value}`)
  return Number(number[0])
}
