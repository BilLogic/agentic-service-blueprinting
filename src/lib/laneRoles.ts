/**
 * Semantic lane roles — the stable contract between blueprint content and
 * rendering. A lane's display name (`lanes.name`) is free-form in any
 * language; its `lane_role` carries the rendering semantics (touchpoint cells,
 * storyboard rows, divider-line anchoring). The vocabulary is closed: the
 * `lanes_lane_role_check` constraint accepts exactly these roles or null, and
 * a null role (e.g. an actor lane such as "现场技术员" or "Field Crew") renders
 * as a generic swimlane.
 */
export const CUSTOMER_ACTIONS_ROLE = 'customer_actions'
export const FRONTSTAGE_ACTIONS_ROLE = 'frontstage_actions'
export const BACKSTAGE_ACTIONS_ROLE = 'backstage_actions'
export const PARTNER_ACTIONS_ROLE = 'partner_actions'
export const FRONTSTAGE_TOUCHPOINTS_ROLE = 'frontstage_touchpoints'
export const BACKSTAGE_TOUCHPOINTS_ROLE = 'backstage_touchpoints'
export const SUPPORT_ACTIONS_ROLE = 'support_actions'
export const STORYBOARD_ROLE = 'storyboard'

/**
 * The vocabulary, and the whole of it. Held identical to the `lane_role` CHECK
 * constraint added in `21000122000000`. `support_systems` and `step_visual`
 * are gone — the tech lanes were never only tech, so their systems are
 * touchpoints, and a step never carried its own storyboard variation.
 */
export const CANONICAL_LANE_ROLES = [
  CUSTOMER_ACTIONS_ROLE,
  FRONTSTAGE_ACTIONS_ROLE,
  BACKSTAGE_ACTIONS_ROLE,
  PARTNER_ACTIONS_ROLE,
  FRONTSTAGE_TOUCHPOINTS_ROLE,
  BACKSTAGE_TOUCHPOINTS_ROLE,
  SUPPORT_ACTIONS_ROLE,
  STORYBOARD_ROLE,
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
    'Front Stage Tech': FRONTSTAGE_TOUCHPOINTS_ROLE,
    'Back Stage Tech': BACKSTAGE_TOUCHPOINTS_ROLE,
    'Front Stage Touchpoints': FRONTSTAGE_TOUCHPOINTS_ROLE,
    'Back Stage Touchpoints': BACKSTAGE_TOUCHPOINTS_ROLE,
    'Support Actions': SUPPORT_ACTIONS_ROLE,
    Visual: STORYBOARD_ROLE,
    Storyboard: STORYBOARD_ROLE,
  }

/** Resolve a lane's semantic role: explicit role, else legacy name, else none. */
export function getLaneRole(lane: {
  name: string
  role?: string | null
}): string | null {
  return lane.role ?? LEGACY_NAME_TO_ROLE[lane.name] ?? null
}
