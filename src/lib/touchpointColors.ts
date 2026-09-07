import {
  TOUCHPOINT_TONES,
  type TouchpointTone,
} from '@/lib/blueprintCellStyle'

/**
 * What colour a touchpoint's face is drawn in.
 *
 * A touchpoint's colour is a product fact chosen by whoever owns the blueprint
 * — "our scheduling tool is blue" — and not a palette one. It is stored where a
 * product fact belongs: `touchpoints.tone` carries the family and
 * `touchpoints.aliases` carries the other spellings that mean the same row.
 * This module is the machinery that reads them, and #396 Q48 is the decision
 * that split the two: the resolution — aliases, case folding, the
 * deterministic fallback for a name nobody has chosen for — is generic and
 * belongs to every deployment; the tool names any one service happens to use
 * do not (#326).
 *
 * Three answers, in order, and each one is narrower than the one under it:
 *
 * 1. THE REGISTRY — what this deployment's own rows say. Loaded once by
 *    `TouchpointRegistryProvider` and held here rather than in context,
 *    because the one component that must read it is `TouchpointCellFace`,
 *    which takes a label and nothing else (ADR 0005: state non-React code has
 *    to read lives in a module store).
 * 2. THE SEED — `TOUCHPOINT_COLORS`, below. Generic tools any service might
 *    use, so that a deployment with an empty registry still opens with a board
 *    that reads deliberately rather than randomly.
 * 3. THE HASH — deterministic, from the name itself. The right answer for a
 *    tool nobody has ever expressed a preference about: stable across
 *    reloads, and never the same colour by accident twice.
 *
 * A touchpoint renders at step 400, one paler than the step-500 lane it sits in, so
 * it reads as an object on the cell rather than as another cell.
 */
export const TOUCHPOINT_COLORS = {
  Email: 'purple',
  Figma: 'purple',
  'Google Docs': 'crimson',
  'Google Forms': 'gold',
  'Google Sheets': 'red',
  'Marketing Website': 'indigo',
  Notion: 'gold',
  Phone: 'yellow',
  Slack: 'tomato',
  'Social Media': 'crimson',
  Zoom: 'indigo',
} as const satisfies Record<string, TouchpointTone>

export type TouchpointColorName = keyof typeof TOUCHPOINT_COLORS

/*
 * Spelling variants that should resolve to one seed key. Empty, and meant to
 * stay empty: a deployment's own aliases are rows in `touchpoints.aliases`,
 * not entries here. It survives as the seam for a variant of a SEED name — the
 * generic map above is the only thing it may key — so that the seed and the
 * registry are read the same way. (Case alone is already handled by
 * `LOWER_TO_CANONICAL` below.)
 */
const TECH_LABEL_ALIASES: Record<string, TouchpointColorName> = {}

const LOWER_TO_CANONICAL = Object.fromEntries(
  (Object.keys(TOUCHPOINT_COLORS) as TouchpointColorName[]).map((name) => [
    name.toLowerCase(),
    name,
  ]),
) as Record<string, TouchpointColorName>

/** Unknown tech names fall back to a deterministic family from this set. */
const EXTENDED_FALLBACK_TONES = [
  'indigo',
  'gold',
  'crimson',
  'purple',
  'tomato',
  'yellow',
  'red',
] as const satisfies readonly TouchpointTone[]

function hashLabel(label: string): number {
  let hash = 0
  for (const char of label) {
    hash = (hash + char.charCodeAt(0)) | 0
  }
  return Math.abs(hash)
}

/** One `touchpoints` row, as much of it as the colour question needs. */
export type TouchpointRegistryEntry = {
  name: string
  /** `touchpoints.tone`. Null means the author expressed no preference. */
  tone: string | null
  /** `touchpoints.aliases`. Null means no alias has been considered. */
  aliases: readonly string[] | null
}

const NO_STRINGS: ReadonlyMap<string, string> = new Map()
const NO_TONES: ReadonlyMap<string, TouchpointTone> = new Map()

/**
 * The loaded registry, as two lookups keyed on a lowercased label.
 *
 * A module store rather than context, and the reason is specific rather than
 * general: `TouchpointCellFace` is a shared file, held identical in the
 * template and in the deployments built on it, and it resolves its own tone
 * from a label with no hook and no prop to carry a value in. Threading a tone
 * prop to it would fork the file; a store lets it stay identical and still ask
 * this deployment's question. `useTouchpointToneResolver` is what makes a
 * component re-render when these change.
 */
let canonicalByLower: ReadonlyMap<string, string> = NO_STRINGS
let toneByLower: ReadonlyMap<string, TouchpointTone> = NO_TONES
const registryListeners = new Set<() => void>()

/** What `getTouchpointTone` is, as a value a component can depend on. */
export type TouchpointToneResolver = (
  label: string,
  chosen?: TouchpointTone,
) => TouchpointTone

/*
 * The store's snapshot is a FUNCTION, and its identity is the whole signal: it
 * is replaced when — and only when — the loaded rows change, so a
 * `useSyncExternalStore` reader re-renders exactly then and never on an
 * unrelated pass. A counter would do the same job and leave every consumer
 * holding a number it has to remember to depend on; this way the thing they
 * call IS the thing that changed.
 */
let toneResolver: TouchpointToneResolver = (label, chosen) =>
  getTouchpointTone(label, chosen)

const KNOWN_TONES = new Set<string>(TOUCHPOINT_TONES)

function asTone(raw: string | null): TouchpointTone | null {
  // The column carries no CHECK constraint, deliberately — the migration that
  // adds it explains why the tone vocabulary, which belongs to the token
  // model, must not be copied into the schema as a second list. That
  // makes validating it the reader's job, and a value outside the seven
  // families is treated as no preference rather than as a crash or as a
  // `data-blueprint-tone` attribute no stylesheet answers.
  if (raw === null) return null
  const trimmed = raw.trim().toLowerCase()
  return KNOWN_TONES.has(trimmed) ? (trimmed as TouchpointTone) : null
}

function sameMap<T>(a: ReadonlyMap<string, T>, b: ReadonlyMap<string, T>) {
  if (a.size !== b.size) return false
  for (const [key, value] of a) if (b.get(key) !== value) return false
  return true
}

/**
 * Publish the deployment's rows.
 *
 * NAMES BEAT ALIASES, and an alias that collides with a name already claimed
 * is dropped. Nothing in the schema forbids either collision — the migration
 * that adds `aliases` says so, and says the rule belongs to the resolver,
 * which is here. A render must not fail on data, so a collision resolves
 * silently and predictably instead of throwing: a touchpoint's `name` is its
 * identity, unique deployment-wide, so it outranks a spelling some other row
 * remembers, and among aliases the first row in the order the query returned
 * wins.
 *
 * The snapshot is replaced only on a REAL change, which is the
 * reference-stability contract ADR 0005 puts on every store here: a
 * `useSyncExternalStore` reader handed a fresh snapshot per call renders in a
 * loop. Publishing the same rows twice — which the provider does whenever a
 * query settles on what the fixture already said — is a no-op.
 */
export function setTouchpointRegistry(
  entries: readonly TouchpointRegistryEntry[],
): void {
  const nextCanonical = new Map<string, string>()
  const nextTone = new Map<string, TouchpointTone>()

  for (const entry of entries) {
    const name = entry.name.trim()
    if (!name) continue
    nextCanonical.set(name.toLowerCase(), name)
    const tone = asTone(entry.tone)
    if (tone) nextTone.set(name.toLowerCase(), tone)
  }

  for (const entry of entries) {
    const name = entry.name.trim()
    if (!name) continue
    for (const alias of entry.aliases ?? []) {
      const key = alias.trim().toLowerCase()
      if (!key || nextCanonical.has(key)) continue
      nextCanonical.set(key, name)
    }
  }

  if (sameMap(canonicalByLower, nextCanonical) && sameMap(toneByLower, nextTone)) {
    return
  }

  canonicalByLower = nextCanonical
  toneByLower = nextTone
  toneResolver = (label, chosen) => getTouchpointTone(label, chosen)
  for (const listener of registryListeners) listener()
}

/** The snapshot `useSyncExternalStore` reads. Stable until the rows change. */
export function getTouchpointToneResolver(): TouchpointToneResolver {
  return toneResolver
}

export function subscribeTouchpointRegistry(listener: () => void): () => void {
  registryListeners.add(listener)
  return () => {
    registryListeners.delete(listener)
  }
}

/** Forget every loaded row. For tests, and for a sign-out that changes them. */
export function clearTouchpointRegistry(): void {
  setTouchpointRegistry([])
}

/** Resolve a raw touchpoint label to the name that owns its colour. */
export function normalizeTouchpointLabel(label: string): string {
  const trimmed = label.trim()
  const lower = trimmed.toLowerCase()
  return (
    canonicalByLower.get(lower) ??
    TECH_LABEL_ALIASES[lower] ??
    LOWER_TO_CANONICAL[lower] ??
    trimmed
  )
}

/**
 * The Radix family a touchpoint draws from.
 *
 * `chosen` wins when present — it is the seam a caller that already holds a
 * per-placement override arrives through, and it stays even though the stored
 * value now comes in through the registry instead.
 */
export function getTouchpointTone(
  label: string,
  chosen?: TouchpointTone,
): TouchpointTone {
  if (chosen) return chosen
  const canonical = normalizeTouchpointLabel(label)

  const stored = toneByLower.get(canonical.toLowerCase())
  if (stored) return stored

  const seeded = TOUCHPOINT_COLORS[canonical as TouchpointColorName]
  if (seeded) return seeded

  return EXTENDED_FALLBACK_TONES[
    hashLabel(canonical) % EXTENDED_FALLBACK_TONES.length
  ]
}
