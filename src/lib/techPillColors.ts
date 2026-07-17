import { BLUEPRINT_CELL_PALETTE } from '@/lib/blueprintTheme'

/**
 * Stable fill color per technology name — shared across every blueprint and phase.
 * Keys are canonical display labels (case-sensitive).
 */
export const TECH_PILL_COLORS = {
  'Clearance obtainment guide': '#F0E8D8',
  'Dev Tools': '#D8E8F0',
  Email: '#EDE0F5',
  Figma: '#E4D4F8',
  'Google Docs/ Slides': '#F8E0E8',
  'Google Form Application': '#F0E0C8',
  'Google Quiz embedded in Notion': '#F8D8D8',
  'Google Quizzes': '#D8F0E0',
  Handshake: '#D0E8F5',
  'Handshake Employer Profile': '#C8E0F0',
  'Marketing Website': '#E0F0E8',
  Notion: '#F8E8D4',
  'On-campus booth': '#E8F0D8',
  'PLUS App': BLUEPRINT_CELL_PALETTE.chartreuse,
  Posters: '#F5E8C8',
  Slack: BLUEPRINT_CELL_PALETTE.peach,
  'Social Media': '#F8D0E0',
  'Workday (employee view)': '#D0E4F0',
  'Workday (employer view)': '#D0E4F0',
  Workday: '#D0E4F0',
  Bank: BLUEPRINT_CELL_PALETTE.mint,
  Zoom: BLUEPRINT_CELL_PALETTE.powderBlue,
  'Zoom Recording': '#E8D8F0',
  'Zoom/Pencil': BLUEPRINT_CELL_PALETTE.powderBlue,
} as const satisfies Record<string, string>

export type TechPillName = keyof typeof TECH_PILL_COLORS

const TECH_LABEL_ALIASES: Record<string, TechPillName> = {
  'plus app': 'PLUS App',
  workday: 'Workday (employee view)',
  'zoom/pencil': 'Zoom/Pencil',
  'zoom/ pencil': 'Zoom/Pencil',
}

function isZoomPencilLabel(label: string): boolean {
  return /^zoom\s*\/\s*pencil$/i.test(label.trim())
}

const LOWER_TO_CANONICAL = Object.fromEntries(
  (Object.keys(TECH_PILL_COLORS) as TechPillName[]).map((name) => [
    name.toLowerCase(),
    name,
  ]),
) as Record<string, TechPillName>

/** Unknown tech names fall back to a deterministic color from this extended set. */
const EXTENDED_FALLBACK_COLORS = [
  BLUEPRINT_CELL_PALETTE.lavender,
  BLUEPRINT_CELL_PALETTE.mint,
  BLUEPRINT_CELL_PALETTE.blush,
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
  if (isZoomPencilLabel(trimmed)) return 'Zoom/Pencil'

  const lower = trimmed.toLowerCase()
  return TECH_LABEL_ALIASES[lower] ?? LOWER_TO_CANONICAL[lower] ?? trimmed
}

export function getTechPillFill(label: string): string {
  const canonical = normalizeTechPillLabel(label)
  const known = TECH_PILL_COLORS[canonical as TechPillName]
  if (known) return known

  return EXTENDED_FALLBACK_COLORS[
    hashLabel(canonical) % EXTENDED_FALLBACK_COLORS.length
  ]
}
