import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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
 * single seam (`docs/adr/0006-one-token-model-is-the-single-style-seam.md`):
 * it answers what is declared, where, under which selector, at what value once
 * the cascade has run, and who consumes it — and every rule becomes an
 * assertion against those answers rather than a new file walker. Widen the
 * sampling here and every rule inherits the fix.
 *
 * Three things in this tree defeat the simpler readers it replaces, and each
 * one is why a piece of the parser below looks the way it does:
 *
 *  - `print.css` declares `--hue`, `--surface`, `--contrast` and ten more
 *    dials inside `@media print`. A reader with no at-rule context reports
 *    `print.css` as the winner for every one of them, in both themes.
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
 * The declaration that wins at the root element under `theme`, or undefined.
 *
 * This is the question no reader in this repo could answer before: not what a
 * file says about `--surface-hue`, but what `--surface-hue` resolves to once
 * `print.css`'s `@media print` block has been set aside and source order has
 * broken the `:root`/`.dark` tie.
 */
export function winningDeclaration(
  name: string,
  theme: Theme,
): Declaration | undefined {
  const order = new Map(stylesheets().map((sheet) => [sheet.file, sheet.order]))
  let winner: Declaration | undefined
  for (const entry of declarations()) {
    if (entry.name !== name) continue
    if (!Number.isFinite(order.get(entry.file) ?? Infinity)) continue
    if (
      entry.context.some(
        (rule) => /^@media\b/.test(rule) && /\bprint\b/.test(rule),
      )
    )
      continue
    if (
      entry.context.some(
        (rule) => rule && !/^@(media|supports|layer)\b/.test(rule),
      )
    )
      continue
    if (!appliesAtRoot(entry.selector, theme)) continue
    winner = entry
  }
  return winner
}

/**
 * The value of `name` at the root under `theme`, with `var()` chased through.
 *
 * Falls back to a `var()`'s own default (`var(--x, 12px)`) when the referenced
 * name resolves to nothing, which is what the browser does.
 */
export function resolveValue(
  name: string,
  theme: Theme,
  seen: Set<string> = new Set(),
): string | undefined {
  if (seen.has(name)) return undefined
  seen.add(name)
  const declaration = winningDeclaration(name, theme)
  if (!declaration) return undefined
  return substitute(declaration.value, theme, seen)
}

function substitute(value: string, theme: Theme, seen: Set<string>): string {
  return value.replace(
    /var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*([^()]*))?\)/g,
    (whole, referenced: string, fallback: string | undefined) => {
      const resolved = resolveValue(referenced, theme, new Set(seen))
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

/** A comment naming the class it replaced is not a use of that class. */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
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

export type Rgb = [number, number, number]

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const sat = s / 100
  const light = l / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = light - c / 2
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  return [r + m, g + m, b + m]
}

/** OKLCH -> linear sRGB (Bjorn Ottosson's matrices). */
export function oklchToLinearSrgb(l: number, c: number, hDeg: number): Rgb {
  const h = (hDeg * Math.PI) / 180
  const a = c * Math.cos(h)
  const b = c * Math.sin(h)
  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  ]
}

export const inSrgbGamut = (rgb: Rgb) =>
  rgb.every((v) => v >= -1e-6 && v <= 1 + 1e-6)

/** Gamma-encoded sRGB, so these values meet the `Rgb` the solver expects. */
export function oklch(l: number, c: number, hDeg: number): Rgb {
  return oklchToLinearSrgb(l, c, hDeg).map((v) => {
    const clamped = Math.min(1, Math.max(0, v))
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * clamped ** (1 / 2.4) - 0.055
  }) as Rgb
}

/** Gamma-encoded sRGB -> OKLCH triple. */
export function oklchFromSrgb([r, g, b]: Rgb): [number, number, number] {
  const lin = (v: number) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const l_ = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m_ = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s_ = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const B2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  return [
    L,
    Math.hypot(A, B2),
    ((Math.atan2(B2, A) * 180) / Math.PI + 360) % 360,
  ]
}

/** OKLCH hue in degrees for a gamma-encoded sRGB colour. */
export function oklchHue(rgb: Rgb): number {
  return oklchFromSrgb(rgb)[2]
}

/** Largest in-gamut chroma at this lightness and hue, to 4dp. */
export function chromaCeiling(l: number, hDeg: number): number {
  let lo = 0
  let hi = 0.5
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (inSrgbGamut(oklchToLinearSrgb(l, mid, hDeg))) lo = mid
    else hi = mid
  }
  return lo
}

export function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (v: number) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  )
  return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2))
}

/**
 * The ink `[data-blueprint-fill]` derives for a fill, mirrored in JS.
 *
 * The CSS is `oklch(from <fill> clamp(0.12, calc((0.62 - l) * 100), 0.99)
 * calc(c * 0.08) h)`. The clamp is a step function in practice: any fill below
 * L 0.62 gets L 0.99 ink, anything above gets 0.12, because the multiplier is
 * 100. Chroma drops to 8% so the ink is tinted rather than stark, and the hue
 * rides along.
 *
 * Mirrored rather than asserted against one hard-coded ink, because a
 * hard-coded ink is exactly what this pairing replaced.
 */
export function derivedFillInk(fill: Rgb): Rgb {
  const [l, c, h] = oklchFromSrgb(fill)
  const inkL = Math.min(0.99, Math.max(0.12, (0.62 - l) * 100))
  return oklch(inkL, c * 0.08, h)
}

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
