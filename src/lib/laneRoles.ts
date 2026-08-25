/**
 * Semantic lane roles — the stable contract between blueprint content and
 * rendering. A lane's display name (`lanes.name`) is free-form in any
 * language; its `lane_role` carries the rendering semantics (pill cells,
 * visual rows, divider-line anchoring). The vocabulary is extensible:
 * org-defined custom roles render as generic swimlanes, as does a null role
 * (e.g. actor lanes such as "现场技术员" or "Field Crew").
 */
export const CUSTOMER_ACTIONS_ROLE = 'customer_actions'
export const FRONTSTAGE_ACTIONS_ROLE = 'frontstage_actions'
export const BACKSTAGE_ACTIONS_ROLE = 'backstage_actions'
export const FRONTSTAGE_TECH_ROLE = 'frontstage_tech'
export const BACKSTAGE_TECH_ROLE = 'backstage_tech'
export const SUPPORT_SYSTEMS_ROLE = 'support_systems'
export const VISUAL_ROLE = 'visual'
export const STEP_VISUAL_ROLE = 'step_visual'

export const CANONICAL_LANE_ROLES = [
  CUSTOMER_ACTIONS_ROLE,
  FRONTSTAGE_ACTIONS_ROLE,
  BACKSTAGE_ACTIONS_ROLE,
  FRONTSTAGE_TECH_ROLE,
  BACKSTAGE_TECH_ROLE,
  SUPPORT_SYSTEMS_ROLE,
  VISUAL_ROLE,
  STEP_VISUAL_ROLE,
] as const

export type CanonicalLaneRole = (typeof CANONICAL_LANE_ROLES)[number]

/**
 * Legacy magic-name → role mapping for content that predates `lane_role`
 * (DB rows without the backfill and all hand-written TS fallbacks, which
 * carry no role).
 */
export const LEGACY_NAME_TO_ROLE: Readonly<Record<string, CanonicalLaneRole>> =
  {
    'Customer Actions': CUSTOMER_ACTIONS_ROLE,
    'Front Stage Actions': FRONTSTAGE_ACTIONS_ROLE,
    'Frontstage Actions': FRONTSTAGE_ACTIONS_ROLE,
    'Back Stage Actions': BACKSTAGE_ACTIONS_ROLE,
    'Backstage Actions': BACKSTAGE_ACTIONS_ROLE,
    'Front Stage Tech': FRONTSTAGE_TECH_ROLE,
    'Back Stage Tech': BACKSTAGE_TECH_ROLE,
    'Computer Systems': SUPPORT_SYSTEMS_ROLE,
    Visual: VISUAL_ROLE,
    'Step Visual': STEP_VISUAL_ROLE,
  }

/** Resolve a lane's semantic role: explicit role, else legacy name, else none. */
export function getLaneRole(lane: {
  name: string
  role?: string | null
}): string | null {
  return lane.role ?? LEGACY_NAME_TO_ROLE[lane.name] ?? null
}
