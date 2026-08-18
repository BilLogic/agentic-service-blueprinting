import type { PathType } from '@/types/database'

export type PathColorInput = {
  path_type: PathType
  name: string
}

/** Primary accent per path type — also used as defaults for unnamed paths. */
export const PATH_TYPE_COLORS: Record<PathType, string> = {
  happy: '#10B981',
  unhappy: '#F59E0B',
  exception: '#EF4444',
  alternative: '#3B82F6',
}

/** Stroke color for blueprint trigger arrows — muted to complement pastel cells. */
export const PATH_TYPE_ARROW_COLORS: Record<PathType, string> = {
  happy: '#5FA88A',
  unhappy: '#C49A5C',
  exception: '#C97171',
  alternative: '#6E8FC7',
}

/** Stable identity for path colors across scenarios (same type + name → same color). */
export function getPathColorKey(path: PathColorInput): string {
  return `${path.path_type}:${path.name}`
}

/**
 * Canonical path colors — shared across every scenario.
 * Keys match `getPathColorKey` (`path_type:Path Name`).
 */
export const PATH_COLOR_REGISTRY: Record<string, string> = {
  'happy:Happy Path': PATH_TYPE_COLORS.happy,
  'unhappy:Sad Path': PATH_TYPE_COLORS.unhappy,
  'alternative:Alternate Path': PATH_TYPE_COLORS.alternative,
  'alternative:Set Goals': '#6366F1',
  'alternative:Check Goals': '#8B5CF6',
  'alternative:Update Goals': '#EC4899',
  'alternative:Set Goals Edge Case': '#0EA5E9',
  'alternative:Update Goals Edge Case': '#14B8A6',
}

export const PATH_ARROW_COLOR_REGISTRY: Record<string, string> = {
  'happy:Happy Path': PATH_TYPE_ARROW_COLORS.happy,
  'unhappy:Sad Path': PATH_TYPE_ARROW_COLORS.unhappy,
  'alternative:Alternate Path': PATH_TYPE_ARROW_COLORS.alternative,
  'alternative:Set Goals': '#7C83DB',
  'alternative:Check Goals': '#9F88D8',
  'alternative:Update Goals': '#D16BA0',
  'alternative:Set Goals Edge Case': '#3DAFD6',
  'alternative:Update Goals Edge Case': '#3CB8A8',
}

const EXTENDED_PATH_COLORS = [
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#0EA5E9',
  '#14B8A6',
  '#F97316',
  '#84CC16',
  '#A855F7',
  '#E11D48',
  '#0891B2',
] as const

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

  if (path.path_type !== 'alternative') {
    return PATH_TYPE_COLORS[path.path_type]
  }

  return EXTENDED_PATH_COLORS[hashKey(key) % EXTENDED_PATH_COLORS.length]
}

export function getPathArrowColor(path: PathColorInput): string {
  const key = getPathColorKey(path)
  const known = PATH_ARROW_COLOR_REGISTRY[key]
  if (known) return known

  if (path.path_type !== 'alternative') {
    return PATH_TYPE_ARROW_COLORS[path.path_type]
  }

  return getPathColor(path)
}

/**
 * Stroke pattern per path type — the non-colour half of path identity.
 *
 * Paths distinguishable by hue alone fail SC 1.4.1 (use of colour) and are
 * hard to read where two arrows cross. `undefined` means a solid stroke,
 * kept for the happy path so the common case stays cleanest.
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
 * Extra patterns for `alternative` paths (the open-ended type), hashed the
 * same way `EXTENDED_PATH_COLORS` is so a path's dash and colour stay paired
 * — one per extended colour, a real second channel rather than decoration.
 */
const EXTENDED_PATH_DASHES = [
  '7 4 2 4',
  '12 5',
  '2 4',
  '10 4 2 4 2 4',
  '5 5',
  '3 3 9 3',
  '14 4 3 4',
  '9 3',
  '4 4 12 4',
  '6 3 2 3',
] as const

/**
 * Dash pattern for a path's arrows and section borders, paired with
 * {@link getPathColor} through the same hash so the two never come apart.
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
 * Same, from the `${type}:${name}` key the arrow layers already carry on each
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

/**
 * Frame around a path's section. Solid for the happy path, dashed for
 * anything else, so the frame carries the same non-colour distinction the
 * arrows do — CSS borders take a style keyword rather than a dash array, so
 * this is the coarse version of {@link getPathDashArray}.
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

export function getPathBadgeStyle(path: PathColorInput): {
  backgroundColor: string
  color: string
} {
  return {
    backgroundColor: getPathColor(path),
    color: '#FFFFFF',
  }
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
 * layers OVER the cell face's own `background-color` and is clipped by its
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
