import type { TouchpointTone } from '@/lib/blueprintCellStyle'

/**
 * DEFAULT family per touchpoint, not a styling decision.
 *
 * A touchpoint's colour is meant to be chosen by whoever owns the blueprint —
 * "our scheduling tool is blue" is a product fact, not a palette one. There is nowhere to
 * store that yet: a tech pill is a parsed substring of `cells.content`, so
 * there is no row to attach a colour to. Until a `touchpoints` table exists,
 * this map is the seed, and `getTouchpointTone` already takes the override that
 * will carry the stored value.
 *
 * A pill renders at step 400, one paler than the step-500 lane it sits in, so
 * it reads as an object on the cell rather than as another cell.
 */
export const TECH_PILL_COLORS = {
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

export type TechPillName = keyof typeof TECH_PILL_COLORS

/*
 * Spelling variants that should resolve to one registry key. Empty in the
 * template: an adopter's own touchpoints go in the registry above, and their
 * aliases here, so `Google Docs` and `google docs` do not become two colours.
 * (Case alone is already handled by LOWER_TO_CANONICAL below.)
 */
const TECH_LABEL_ALIASES: Record<string, TechPillName> = {}

const LOWER_TO_CANONICAL = Object.fromEntries(
  (Object.keys(TECH_PILL_COLORS) as TechPillName[]).map((name) => [
    name.toLowerCase(),
    name,
  ]),
) as Record<string, TechPillName>

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

/** Resolve a raw pill label to its canonical registry key when possible. */
export function normalizeTechPillLabel(label: string): string {
  const trimmed = label.trim()
  const lower = trimmed.toLowerCase()
  return TECH_LABEL_ALIASES[lower] ?? LOWER_TO_CANONICAL[lower] ?? trimmed
}

/**
 * The Radix family a tech pill draws from.
 *
 * `chosen` wins when present — it is the seam the stored per-touchpoint colour
 * will arrive through, so adding the table later needs no restructuring here.
 */
export function getTouchpointTone(
  label: string,
  chosen?: TouchpointTone,
): TouchpointTone {
  if (chosen) return chosen
  const canonical = normalizeTechPillLabel(label)
  const known = TECH_PILL_COLORS[canonical as TechPillName]
  if (known) return known

  return EXTENDED_FALLBACK_TONES[
    hashLabel(canonical) % EXTENDED_FALLBACK_TONES.length
  ]
}
