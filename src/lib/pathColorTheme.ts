import type { CSSProperties } from 'react'
import type { PathType } from '@/types/database'

export type PathColorInput = {
  path_type: PathType
  name: string
}

/**
 * Primary accent per path type — the default when a path's own name is not
 * pinned and its type is not one of the open-ended two.
 *
 * Radix step 1100, not the Tailwind v3 defaults these used to be (#10B981 and
 * friends). The step is what makes these fills carriable: the old values
 * measured 2.0–2.9:1 against the ink a badge puts on them — the amber one
 * worst. Step 11 is Radix's text weight; `palette.test.ts` measures every
 * entry's DERIVED ink (see `[data-blueprint-fill]` in blueprint.css) against
 * the stylesheet to keep that true.
 *
 * Historical note, since the reasoning below reads oddly otherwise: these
 * were chosen when badges spelled `text-white` at eight call sites. The ink
 * is derived from the fill now, so the constraint is no longer "legible under
 * white" but "yields legible ink" — which these already satisfy.
 *
 * `unhappy` is orange rather than amber for the same reason: amber's step
 * 9/10 are near-yellow and carry almost no contrast either way, so the whole
 * family would have had to be read at a different step from every other path
 * type.
 */
export const PATH_TYPE_COLORS: Record<PathType, string> = {
  happy: 'var(--color-green-1100)',
  unhappy: 'var(--color-orange-1100)',
  exception: 'var(--color-red-1100)',
  alternative: 'var(--color-blue-1100)',
}

/**
 * Stroke color for blueprint trigger arrows — step 1000, one notch lighter than
 * the badge, so a stroke reads as related to the label it belongs to without
 * being the same value. Same family per path type as `PATH_TYPE_COLORS`.
 */
export const PATH_TYPE_ARROW_COLORS: Record<PathType, string> = {
  happy: 'var(--color-green-1000)',
  unhappy: 'var(--color-orange-1000)',
  exception: 'var(--color-red-1000)',
  alternative: 'var(--color-blue-1000)',
}

/** Stable identity for path colors across scenarios (same type + name → same color). */
export function getPathColorKey(path: PathColorInput): string {
  return `${path.path_type}:${path.name}`
}

/**
 * The families a path may be drawn from once its identity is a *name* rather
 * than a type — the same seven the touchpoint tones use.
 *
 * Deliberately disjoint from the eight lane families, and `palette.test.ts`
 * holds that. An earlier open set drew on ten families including green, blue,
 * violet and pink, so a differently-named path could render as a 2px line in
 * exactly the hue of the lane it crossed.
 *
 * Sharing the tone set rather than inventing a third one is safe because the
 * two never render at the same weight: a tone is a step-400 pill fill, a path
 * is a step-1100 line and badge. Seven hundred steps apart, they cannot be
 * mistaken for each other, and there is one palette to learn instead of two.
 *
 * The order puts distant hues next to each other, so adjacent hashes do not
 * land on neighbours.
 */
const PATH_NAMED_FAMILIES = [
  'indigo',
  'tomato',
  'purple',
  'gold',
  'crimson',
  'yellow',
  'red',
] as const

const step = (family: string, weight: 1000 | 1100) =>
  `var(--color-${family}-${weight})`

/**
 * Pinned colours for the canonical archetype names. Anything else — every
 * differently-named `alternative` path — hashes into the open set below, so a
 * blueprint can name its paths whatever it likes and still get a stable,
 * distinct colour + dash pair.
 */
export const PATH_COLOR_REGISTRY: Record<string, string> = {
  'happy:Happy Path': PATH_TYPE_COLORS.happy,
  'unhappy:Sad Path': PATH_TYPE_COLORS.unhappy,
  'alternative:Alternate Path': PATH_TYPE_COLORS.alternative,
}

export const PATH_ARROW_COLOR_REGISTRY: Record<string, string> = {
  'happy:Happy Path': PATH_TYPE_ARROW_COLORS.happy,
  'unhappy:Sad Path': PATH_TYPE_ARROW_COLORS.unhappy,
  'alternative:Alternate Path': PATH_TYPE_ARROW_COLORS.alternative,
}

/** Hash fallback for a path with no registry entry. Step 1100, the badge weight. */
const EXTENDED_PATH_COLORS = PATH_NAMED_FAMILIES.map((f) =>
  step(f, 1100),
) as readonly string[]

/**
 * Stroke pattern per path type — the non-colour half of path identity.
 *
 * Paths were distinguishable by hue alone, which fails SC 1.4.1 (use of colour)
 * and is also just hard to read where two arrows cross. `undefined` means a
 * solid stroke, kept for the happy path so the common case stays cleanest.
 *
 * Patterns are tuned for the 2px arrow stroke: shorter than ~2px reads as a
 * dotted blur at overview zoom, longer than ~12px stops repeating within a
 * short segment.
 */
const PATH_TYPE_DASH: Record<PathType, string | undefined> = {
  happy: undefined,
  unhappy: '7 4',
  exception: '2 4',
  alternative: '12 5',
}

/**
 * Extra patterns for the types that can have many distinct paths at once, hashed
 * the same way `EXTENDED_PATH_COLORS` is so a path's dash and colour stay paired.
 *
 * One per family in `PATH_NAMED_FAMILIES`. An earlier version had five dashes
 * against ten colours, which meant two open paths could share a dash — fine
 * while colour is visible, and exactly the case SC 1.4.1 is about when it is
 * not. Matching the lengths makes the pattern a real second channel rather
 * than a decoration.
 */
const EXTENDED_PATH_DASHES = [
  '7 4 2 4',
  '12 5',
  '2 4',
  '10 4 2 4 2 4',
  '5 5',
  '3 3 9 3',
  '14 4 3 4',
] as const

/**
 * Dash pattern for a path's arrows and section borders, paired with
 * {@link getPathColor} through the same slot so the two never come apart.
 *
 * Every type uses its own pattern, except an `alternative` path nobody has
 * pinned: its identity is its name, so it hashes into the open set instead of
 * sharing the one type default with every other custom-named path — which
 * would leave colour as the only thing telling them apart.
 */
export function getPathDashArray(path: PathColorInput): string | undefined {
  if (path.path_type === 'alternative') {
    const key = getPathColorKey(path)
    if (!PATH_COLOR_REGISTRY[key]) {
      return EXTENDED_PATH_DASHES[hashKey(key) % EXTENDED_PATH_DASHES.length]
    }
  }
  return PATH_TYPE_DASH[path.path_type]
}

/**
 * Same, from the `${type}:${name}` key the arrow lanes already carry on each
 * segment. Bare `'happy'` (no colon) is the legacy default-path key.
 */
export function getPathDashArrayFromKey(colorKey: string): string | undefined {
  const separator = colorKey.indexOf(':')
  if (separator === -1) {
    return PATH_TYPE_DASH[colorKey as PathType] ?? undefined
  }
  return getPathDashArray({
    path_type: colorKey.slice(0, separator) as PathType,
    name: colorKey.slice(separator + 1),
  })
}

function hashKey(key: string): number {
  let hash = 0
  for (const char of key) {
    hash = (hash + char.charCodeAt(0)) | 0
  }
  return Math.abs(hash)
}

export function getPathColor(path: PathColorInput): string {
  const key = getPathColorKey(path)
  const known = PATH_COLOR_REGISTRY[key]
  if (known) return known

  if (path.path_type === 'alternative') {
    // Same index the dash is read from, so the pair holds.
    return EXTENDED_PATH_COLORS[hashKey(key) % EXTENDED_PATH_COLORS.length]
  }

  return PATH_TYPE_COLORS[path.path_type]
}

export function getPathArrowColor(path: PathColorInput): string {
  const key = getPathColorKey(path)
  const known = PATH_ARROW_COLOR_REGISTRY[key]
  if (known) return known

  if (path.path_type === 'alternative') {
    return getPathColor(path)
  }

  return PATH_TYPE_ARROW_COLORS[path.path_type]
}

/**
 * Frame around a path's section. Solid for the happy path, dashed for anything
 * else, so the frame carries the same non-colour distinction the arrows do —
 * CSS borders take a style keyword rather than a dash array, so this is the
 * coarse version of {@link getPathDashArray}.
 */
export function getPathSectionBorderStyle(path: PathColorInput): {
  borderColor: string
  borderStyle: 'solid' | 'dashed'
  borderWidth: number
} {
  return {
    borderColor: getPathColor(path),
    borderStyle: getPathDashArray(path) ? 'dashed' : 'solid',
    borderWidth: 3,
  }
}

/**
 * Style for a badge filled with a path's colour.
 *
 * Returns the FILL as a custom property, not as `background-color`, and no
 * `color` at all: `[data-blueprint-fill]` in blueprint.css paints both halves
 * and derives the ink from the fill (Supabase's `*-foreground` pattern). Every
 * call site must carry `data-blueprint-fill` for this to apply — which is the
 * point, since it is what makes the ink impossible to get wrong. `text-white`
 * used to be spelled out at eight of them and measured 1.17–2.33:1 in dark
 * mode; `palette.test.ts` measures the derived ink against every fill.
 */
export function getPathBadgeStyle(path: PathColorInput): CSSProperties {
  return {
    [BLUEPRINT_FILL_PROPERTY]: getPathColor(path),
  } as CSSProperties
}

/** The property `[data-blueprint-fill]` reads. One name, one owner. */
export const BLUEPRINT_FILL_PROPERTY = '--background-blueprint-fill'

/** Any solid fill (not just a path colour) plus its derived ink. */
export function getBlueprintFillStyle(fill: string): CSSProperties {
  return { [BLUEPRINT_FILL_PROPERTY]: fill } as CSSProperties
}

/** URL-safe marker suffix from a path color key. */
export function pathColorKeyToMarkerSuffix(colorKey: string): string {
  return colorKey.replace(/[^a-zA-Z0-9]+/g, '-')
}

/**
 * Wash alpha. Deliberately faint: the cell's LANE color is the primary
 * identity and must stay legible under the wash — the path tint is a
 * secondary annotation (the label carries the exact affiliation). 24% read
 * as repainting the cell; 10% was invisible; 16% is the cast that still
 * reads at canvas zoom.
 */
const PATH_WASH_PERCENT = 16

/**
 * The merged view's path-affiliation wash, as a `background-image` so it
 * lanes OVER the cell face's own `background-color` and is clipped by its
 * border radius — the reason the earlier absolutely-positioned tint box
 * read as a second, misaligned card. One colour paints flat; N colours
 * (a subset-shared cell) paint N equal vertical stripes.
 */
export function getPathWashStyle(
  colors: readonly string[] | undefined,
): { backgroundImage: string } | undefined {
  if (!colors || colors.length === 0) return undefined
  const mix = (color: string) =>
    `color-mix(in oklab, ${color} ${PATH_WASH_PERCENT}%, transparent)`
  if (colors.length === 1) {
    return {
      backgroundImage: `linear-gradient(0deg, ${mix(colors[0])}, ${mix(colors[0])})`,
    }
  }
  const stops = colors
    .map((color, index) => {
      const from = ((index / colors.length) * 100).toFixed(2)
      const to = (((index + 1) / colors.length) * 100).toFixed(2)
      return `${mix(color)} ${from}% ${to}%`
    })
    .join(', ')
  return { backgroundImage: `linear-gradient(90deg, ${stops})` }
}
