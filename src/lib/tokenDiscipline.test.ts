import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'vitest'
import assert from 'node:assert/strict'

/**
 * The token-discipline rule, enforced.
 *
 * `docs/engineering/standards.md` states it plainly — components consume the
 * SEMANTIC layer, never the primitive ramps ("`text-warning`, not
 * `text-amber-1100`"), and no raw colour values where a token exists. Both
 * halves are convention, not types, and both had drifted: four components had
 * picked steps straight off the amber and violet ramps, three more were on
 * Tailwind's *default* `neutral` ramp (a ramp this design system unsets
 * everywhere else, reached for because every semantic surface token inverts
 * and the blueprint canvas must not), and two swatches carried four hex
 * literals inline.
 *
 * So: a grep with a reason. It fails on the next one instead of waiting for
 * someone to notice a chip that does not track its role, or a "frozen" surface
 * that quietly flipped with the theme.
 */
const COMPONENTS = resolve(__dirname, '../components')

/** Ramps colors.css owns. Semantic tokens derive from these; .tsx may not. */
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

const UTILITY_PREFIXES =
  'bg|text|border|ring|fill|stroke|from|to|via|shadow|outline|divide|accent|caret|placeholder|decoration'

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry)
    if (statSync(path).isDirectory()) return tsxFiles(path)
    return entry.endsWith('.tsx') && !entry.includes('.test.') ? [path] : []
  })
}

/** Strip comments: a comment naming the class it replaced is not a use. */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

test('components take colour from the semantic layer, not the primitive ramps', () => {
  const ramps = [...PRIMITIVE_RAMPS, ...FOREIGN_RAMPS].join('|')
  const pattern = new RegExp(
    `\\b(?:${UTILITY_PREFIXES})-(?:${ramps})-[0-9]{2,4}\\b`,
    'g',
  )
  const offenders = tsxFiles(COMPONENTS).flatMap((file) => {
    const hits = code(readFileSync(file, 'utf-8')).match(pattern) ?? []
    return hits.map((hit) => `${file.replace(COMPONENTS, 'components')}: ${hit}`)
  })
  assert.deepEqual(
    offenders,
    [],
    `Primitive/foreign ramp steps in components — use the semantic token for the role instead:\n${offenders.join('\n')}`,
  )
})

test('components carry no raw hex colours', () => {
  // Six- and three-digit hex only: `#{id}` template strings and CSS ids are
  // not colours, and neither is an 8-digit anything this codebase writes.
  const pattern = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g
  const offenders = tsxFiles(COMPONENTS).flatMap((file) => {
    const hits = code(readFileSync(file, 'utf-8')).match(pattern) ?? []
    return hits.map((hit) => `${file.replace(COMPONENTS, 'components')}: ${hit}`)
  })
  assert.deepEqual(
    offenders,
    [],
    `Raw hex in components — add or use a token (see standards.md):\n${offenders.join('\n')}`,
  )
})

/**
 * Border strengths are named, not dialled.
 *
 * Supabase names every rung — across 1972 of their components: 101
 * `border-default`, 76 `border-strong`, 66 `border-overlay`, 56
 * `border-muted`, 43 `border-control-hover`, and roughly ten alpha modifiers
 * in total. This codebase had the inverse: `border-border` plus 43 hand-tuned
 * alphas (`/35`, `/50`, `/60`, `/70`, `/80`) and ten `ring-foreground/10`, each
 * a strength with no name and no way to reuse it.
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
  const pattern = new RegExp(
    `\\b(?:border|ring|divide|outline)-(?:${tokens})/(?:\\[[^\\]]+\\]|[0-9]+)`,
    'g',
  )
  const offenders = tsxFiles(COMPONENTS).flatMap((file) => {
    const hits = code(readFileSync(file, 'utf-8')).match(pattern) ?? []
    return hits.map((hit) => `${file.replace(COMPONENTS, 'components')}: ${hit}`)
  })
  assert.deepEqual(
    offenders,
    [],
    `Inline alpha on a neutral edge token — use a named rung (border-muted / border-border / border-input / border-overlay / border-control-hover):\n${offenders.join('\n')}`,
  )
})
