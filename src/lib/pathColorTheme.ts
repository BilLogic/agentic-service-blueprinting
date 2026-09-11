import type { CSSProperties } from 'react'
import type { PathKind } from '@/types/database'

export type PathColorInput = {
  kind: PathKind
  name: string
}

/**
 * Primary accent per path type.
 *
 * Two of these three are RESERVED: a `happy` path is green and an `exception`
 * is red whatever either is called, and no other path may be drawn from those
 * two families. That is what makes them worth spending — a reader who has
 * never seen this board before still knows red means trouble, and knows it
 * without being taught. The reasoning is written out at
 * {@link PATH_OPEN_FAMILIES}, which is the set the reservation leaves behind.
 *
 * The `variant` entry is a FALLBACK rather than a colour any variant path
 * renders: a variant reads the open set, so this value is only reached where
 * an archetype is drawn with no path behind it — the type badge and the legend
 * swatch, which have a type and no name. It is the open set's first family for
 * that reason, so the archetype and the paths it stands for read as one thing.
 *
 * Radix step 1100, not the Tailwind v3 defaults these used to be (#10B981 and
 * friends). The step is what makes these fills carriable: the old values
 * measured 2.0–2.9:1 against the ink a badge puts on them — the amber one
 * worst. Step 11 is Radix's text weight; `palette.test.ts` measures every
 * entry's DERIVED ink (see `[data-blueprint-fill]` in blueprint.css) against
 * the stylesheet to keep that true.
 *
 * Historical note, since the reasoning above reads oddly otherwise: these
 * were chosen when badges spelled `text-white` at eight call sites. The ink
 * is derived from the fill now, so the constraint is no longer "legible under
 * white" but "yields legible ink" — which these already satisfy.
 */
export const PATH_KIND_COLORS: Record<PathKind, string> = {
  happy: 'var(--color-green-1100)',
  variant: 'var(--color-indigo-1100)',
  exception: 'var(--color-red-1100)',
}

/**
 * Stroke color for blueprint dependency arrows — step 1000, one notch lighter than
 * the badge, so a stroke reads as related to the label it belongs to without
 * being the same value. Same family per path type as `PATH_KIND_COLORS`.
 */
export const PATH_KIND_ARROW_COLORS: Record<PathKind, string> = {
  happy: 'var(--color-green-1000)',
  variant: 'var(--color-indigo-1000)',
  exception: 'var(--color-red-1000)',
}

/**
 * The `${kind}:${name}` string the render layers address a path by — an arrow
 * segment's marker id, a membership row, a filter selection.
 *
 * It is NOT the key a colour is looked up under, though it once was and the
 * name still says so. A colour is decided by the type for the two reserved
 * kinds and by the NAME alone for a variant (see {@link pathSlot}); this key
 * carries the type as well because the things that address a path want to
 * address a path, not a hue. The two coming apart is deliberate: a path that
 * is re-typed keeps its colour and changes its address, which is the right way
 * round — a reader tracking a route by colour should not lose it because
 * somebody reclassified it.
 */
export function getPathColorKey(path: PathColorInput): string {
  return `${path.kind}:${path.name}`
}

/**
 * The families a VARIANT may be drawn from.
 *
 * Green and red are spoken for: green is always the happy path, red is always
 * an exception. Those two are fixed so a reader can trust them at a glance
 * without learning anything — red means trouble, everywhere, always. What is
 * left identifies variants, which are the only type a scenario holds several
 * of at once, and which therefore need to be told apart from each other rather
 * than recognised on sight.
 *
 * This set used to be seven families open to any path identified by a NAME
 * rather than a type, which spent red and crimson and tomato on paths that
 * were not exceptions. A variant that reads as trouble is worse than one that
 * reads as nothing in particular, so those three went out with red, and what
 * is left is four.
 *
 * Deliberately disjoint from the nine lane families, and `palette.test.ts`
 * holds that. An earlier open set drew on ten families including green, blue,
 * violet and pink, so a differently-named path could render as a 2px line in
 * exactly the hue of the lane it crossed.
 *
 * The disjointness holds for the OPEN set. It does not hold for the path
 * TYPES: `happy` is green and the `actor` lane is green. That is not fixable
 * by reallocation — nine lanes plus seven touchpoint tones is all sixteen
 * families, so `happy` cannot move without displacing something else that is
 * on screen. What holds it together is the weight: a path is a step-1100 line,
 * a lane is a step-500 fill. `palette.test.ts` asserts that the overlap is
 * exactly one, named, and drawn at a heavier step than the lane it crosses.
 * `variant` used to be the second overlap — blue, against the blue `evidence`
 * lane — and moving it onto the open set's first family is what makes the
 * overlap exactly one.
 *
 * Sharing the touchpoint tone set rather than inventing a third is safe because
 * the two never render at the same weight: a tone is a step-400 touchpoint
 * fill, a path is a step-1100 line. Seven hundred steps apart, they cannot be
 * mistaken for each other, and there is one palette to learn instead of two.
 *
 * The order is not load-bearing and should not be read as one: it used to put
 * distant hues beside each other so that adjacent slots did not land on
 * neighbours, which mattered while slots came off a sum of character codes and
 * two similar names took adjacent numbers. They do not any more — see
 * {@link hashKey} — and the order is now just the order. Indigo and purple sit
 * next to each other here, and a set that relied on the order could not have
 * afforded that.
 */
const PATH_OPEN_FAMILIES = ['indigo', 'purple', 'gold', 'yellow'] as const

const step = (family: string, weight: 1000 | 1100) =>
  `var(--color-${family}-${weight})`

/**
 * Names pinned to a slot in the open set, rather than left to the hash.
 *
 * Written by {@link configurePathColorPins} from the deployment config, never
 * authored here. A board that holds several variants in one scenario can
 * hand-pick their slots when the hash puts two of them closer together than a
 * reader can follow; the deployment says so on `pathColorPins`, and this file
 * stays identical across installs. An empty table (the default) is the kit's
 * own behaviour: every name hashes.
 *
 * A slot is a NUMBER, not a colour, and colour and stroke pattern are both
 * read from it — so the pair can never drift, which is the same guarantee the
 * hash gives an unregistered path, stated explicitly for the ones somebody
 * cared enough to pin. Pinning a colour alone is the trap this shape closes:
 * the registry that stood here pinned colours, `getPathDashArray` fell through
 * to the type default for anything it found, and every pinned path on a board
 * came out with the same dash. Colour was doing all the work, which is the
 * exact failure SC 1.4.1 describes.
 *
 * Keyed on the NAME alone, never `${kind}:${name}`. The registry keyed on
 * both, which meant re-typing a path silently dropped it out of its pinned
 * slot and back into the hash. A path's identity is what it is called; its
 * type is a fact about it.
 */
let pinnedPathSlots: Record<string, number> = {}

/**
 * Replace the pin table {@link getPathColor} and {@link getPathDashArray} read.
 *
 * A slot is an index into the open set — indigo, purple, gold, yellow, and
 * the matching dash list — so colour and dash stay a pair. An empty map (the
 * default) leaves every name to the ordinary hash assignment: the kit's own
 * behaviour, and the behaviour of any deployment that does not supply pins.
 *
 * Called from `DeploymentConfigProvider` in a layout effect, and from tests
 * directly. Replaces rather than merges: the resolved config is the whole
 * table. The map is copied, so a later mutation of the host object cannot
 * reach into the theme.
 *
 * @param map Path name → slot index. Names absent from the map fall through.
 */
export function configurePathColorPins(map: Record<string, number>): void {
  pinnedPathSlots = { ...map }
}

/** The open set, by slot. Step 1100, the badge weight. */
const EXTENDED_PATH_COLORS = PATH_OPEN_FAMILIES.map((f) =>
  step(f, 1100),
) as readonly string[]

/** The same set one step lighter, for arrow strokes. */
const EXTENDED_ARROW_COLORS = PATH_OPEN_FAMILIES.map((f) =>
  step(f, 1000),
) as readonly string[]

/**
 * Stroke pattern per path type — the non-colour half of path identity.
 *
 * Paths were distinguishable by hue alone, which fails SC 1.4.1 (use of colour)
 * and is also just hard to read where two arrows cross. `undefined` means a
 * solid stroke, kept for the happy path so the common case stays cleanest.
 *
 * Only the `happy` entry is reached by {@link getPathDashArray} — every other
 * path reads the open set, because a scenario can hold several of them and a
 * type default cannot tell those apart. The other two entries are read by
 * {@link getPathDashArrayFromKey} for the legacy bare-type key, which carries
 * no name to slot.
 *
 * Patterns are tuned for the 2px arrow stroke: shorter than ~2px reads as a
 * dotted blur at overview zoom, longer than ~12px stops repeating within a
 * short segment.
 */
const PATH_KIND_DASH: Record<PathKind, string | undefined> = {
  happy: undefined,
  variant: '12 5',
  exception: '2 4',
}

/**
 * Patterns for the paths a scenario can hold several of, read from the same
 * slot `EXTENDED_PATH_COLORS` is so a path's dash and colour stay paired.
 *
 * SEVEN against four families, and the lengths are coprime on purpose — see
 * {@link PATH_IDENTITY_PERIOD}. An earlier version had five dashes against ten
 * colours, which meant two open paths could share a dash while their colours
 * differed: fine while colour is visible, and exactly the case SC 1.4.1 is
 * about when it is not.
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
 * How many distinct (colour, dash) pairs exist before one repeats.
 *
 * Colour and dash index the same slot through lists of different length, so
 * the pair's period is their lowest common multiple. The lengths are kept
 * COPRIME on purpose: equal lengths would lock one colour to one dash, making
 * the second channel redundant with the first — two paths sharing a colour
 * would share a dash too, and be indistinguishable to a reader who cannot
 * separate the hues (SC 1.4.1). Four and seven give 28.
 */
export const PATH_IDENTITY_PERIOD =
  PATH_OPEN_FAMILIES.length * EXTENDED_PATH_DASHES.length

/**
 * Dash pattern for a path's arrows and section borders, paired with
 * {@link getPathColor} through the same slot so the two never come apart.
 *
 * The happy path is the one route a scenario can only have one of, so it takes
 * the type default — solid — and every other route reads the open set.
 *
 * The dash is not decoration. Four colour families are open, which is not
 * enough to keep a scenario's variants apart on hue alone, and an `exception`
 * has no hue of its own at all: red is reserved for the type, so within a
 * scenario the dash is the ONLY channel separating one exception from another.
 * SC 1.4.1.
 */
export function getPathDashArray(path: PathColorInput): string | undefined {
  if (path.kind === 'happy') return PATH_KIND_DASH.happy
  return EXTENDED_PATH_DASHES[pathSlot(path) % EXTENDED_PATH_DASHES.length]
}

/**
 * Same, from the `${type}:${name}` key the arrow layers already carry on each
 * segment. Bare `'happy'` (no colon) is the legacy default-path key.
 */
export function getPathDashArrayFromKey(colorKey: string): string | undefined {
  const separator = colorKey.indexOf(':')
  if (separator === -1) {
    return PATH_KIND_DASH[colorKey as PathKind] ?? undefined
  }
  return getPathDashArray({
    kind: colorKey.slice(0, separator) as PathKind,
    name: colorKey.slice(separator + 1),
  })
}

/**
 * FNV-1a, for its avalanche: one changed character moves the whole value.
 *
 * This was a plain sum of character codes, which has almost no avalanche and
 * is order-invariant besides — so two names built from the same letters
 * collided EXACTLY, taking the same colour and the same dash. "Check Goals"
 * and "Goals Check" are both plausible names for sibling routes in one
 * scenario, and a pair drawn identically is the SC 1.4.1 failure this file
 * spends a second channel to avoid.
 *
 * The sum was survivable while the open set was seven families wide and every
 * pinned path skipped the hash entirely. Reserving green and red narrows the
 * set to four and sends every unpinned path through here, so the hash now
 * carries the whole guarantee. `Math.imul` keeps the 32-bit multiply exact.
 */
function hashKey(key: string): number {
  let hash = 0x811c9dc5
  for (const char of key) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return Math.abs(hash | 0)
}

/**
 * The one number a non-happy path's colour AND dash are both read from, so the
 * two can never come apart.
 */
function pathSlot(path: PathColorInput): number {
  return pinnedPathSlots[path.name] ?? hashKey(path.name)
}

/**
 * A path's badge colour.
 *
 * A reserved type answers from its type and never looks at the name, which is
 * the whole point of reserving it: renaming an exception cannot make it stop
 * being red.
 */
export function getPathColor(path: PathColorInput): string {
  if (path.kind !== 'variant') return PATH_KIND_COLORS[path.kind]
  return EXTENDED_PATH_COLORS[pathSlot(path) % EXTENDED_PATH_COLORS.length]
}

export function getPathArrowColor(path: PathColorInput): string {
  if (path.kind !== 'variant') return PATH_KIND_ARROW_COLORS[path.kind]
  return EXTENDED_ARROW_COLORS[pathSlot(path) % EXTENDED_ARROW_COLORS.length]
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
