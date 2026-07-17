import { BLUEPRINT_CELL_PALETTE } from '@/lib/blueprintTheme'

/**
 * Stable fill color per technology name — shared across every blueprint and
 * phase. The template ships no branded registry: every tech label gets a
 * deterministic color from the neutral palette below (hash of the label), so
 * the same tech name always renders the same color. Orgs can pin specific
 * brand colors by adding entries keyed by canonical display label.
 */
export const TECH_PILL_COLORS: Record<string, string> = {}

/** Optional label aliases mapping raw cell text to a canonical registry key. */
const TECH_LABEL_ALIASES: Record<string, string> = {}

const LOWER_TO_CANONICAL = Object.fromEntries(
  Object.keys(TECH_PILL_COLORS).map((name) => [name.toLowerCase(), name]),
) as Record<string, string>

/** Neutral palette for deterministic per-label color assignment. */
const TECH_PILL_PALETTE = [
  BLUEPRINT_CELL_PALETTE.powderBlue,
  BLUEPRINT_CELL_PALETTE.lavender,
  BLUEPRINT_CELL_PALETTE.mint,
  BLUEPRINT_CELL_PALETTE.peach,
  BLUEPRINT_CELL_PALETTE.blush,
  BLUEPRINT_CELL_PALETTE.cream,
  '#E8F4E0',
  '#F4E8F0',
  '#E0F4F0',
  '#F0F0E0',
  '#F0E4E8',
  '#E4F0F8',
  '#F8F0E0',
] as const

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

export function getTechPillFill(label: string): string {
  const canonical = normalizeTechPillLabel(label)
  const pinned = TECH_PILL_COLORS[canonical]
  if (pinned) return pinned

  return TECH_PILL_PALETTE[hashLabel(canonical) % TECH_PILL_PALETTE.length]
}
