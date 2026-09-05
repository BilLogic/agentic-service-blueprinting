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

/**
 * The role in words, for a human reading a lane's properties.
 *
 * The enum key is a rendering contract (`frontstage_actions` decides where the
 * visibility line draws); it is not an answer to "what is this row". The
 * sentences come from `references/lane-roles.md`, which is the same source the
 * agent reads, so the two never say different things about the same key.
 *
 * An unknown or absent role is not an error: a custom role and a null role
 * both render as a generic swimlane, which is exactly what this says.
 */
const LANE_ROLE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  [CUSTOMER_ACTIONS_ROLE]:
    'Customer actions — the spine of the journey. The interaction line draws below it.',
  [FRONTSTAGE_ACTIONS_ROLE]:
    'Frontstage — staff actions the customer can see.',
  [BACKSTAGE_ACTIONS_ROLE]: 'Backstage — staff actions out of sight.',
  [FRONTSTAGE_TOUCHPOINTS_ROLE]:
    'Frontstage touchpoints — what the customer meets: apps, documents, '
    + 'places and channels.',
  [BACKSTAGE_TOUCHPOINTS_ROLE]:
    'Backstage touchpoints — the tools and artifacts staff use out of sight.',
  [SUPPORT_ACTIONS_ROLE]:
    'Support — teams, vendors and infrastructure behind the work.',
  [PARTNER_ACTIONS_ROLE]:
    'Partner — a party outside the service, acting where the customer can '
    + 'see them.',
  [STORYBOARD_ROLE]:
    'Storyboard — the frames for each step, not text. A step’s frames across '
    + 'the lanes are its strip.',
}

export function describeLaneRole(role: string | null | undefined): string {
  if (!role) return 'A swimlane with no blueprint role.'
  return LANE_ROLE_DESCRIPTIONS[role] ?? `Custom role: ${role}.`
}

/**
 * The role as a BADGE — the name only, no explanation.
 *
 * The sentences above are one shape: "Name — what it means." A panel that
 * shows a generic "Lane" badge AND that whole sentence underneath says the
 * same thing twice at two sizes. So the badge takes the half before the dash
 * and the sentence moves behind a hint, which is where an explanation belongs
 * once the reader can see the answer.
 */
export function labelLaneRole(role: string | null | undefined): string {
  if (!role) return 'Lane'
  const described = LANE_ROLE_DESCRIPTIONS[role]
  if (!described) return 'Lane'
  return described.split('—')[0]!.trim()
}
