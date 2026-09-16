/**
 * Semantic lane roles — the stable contract between blueprint content and
 * rendering. A lane's display name (`lanes.name`) is free-form in any
 * language; its `lane_role` carries the rendering semantics (touchpoint cells,
 * storyboard rows, divider-line anchoring). The vocabulary is closed: the
 * `lanes_lane_role_check` constraint accepts exactly these roles or null, and
 * a null role (e.g. an actor lane such as "现场技术员" or "Field Crew") renders
 * as a generic swimlane.
 */
import type { LaneRole } from '@/types/database'

export const CUSTOMER_ACTIONS_ROLE = 'customer_actions'
export const FRONTSTAGE_ACTIONS_ROLE = 'frontstage_actions'
export const BACKSTAGE_ACTIONS_ROLE = 'backstage_actions'
export const PARTNER_ACTIONS_ROLE = 'partner_actions'
export const FRONTSTAGE_TOUCHPOINTS_ROLE = 'frontstage_touchpoints'
export const BACKSTAGE_TOUCHPOINTS_ROLE = 'backstage_touchpoints'
export const SUPPORT_ACTIONS_ROLE = 'support_actions'
export const STORYBOARD_ROLE = 'storyboard'

/**
 * The vocabulary, and the whole of it. Held identical to the closed
 * `lane_role` CHECK constraint the schema declares. `support_systems` and
 * `step_visual` are gone — the tech lanes were never only tech, so their
 * systems are touchpoints, and a step never carried its own storyboard
 * variation.
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
] as const satisfies readonly LaneRole[]

export type CanonicalLaneRole = (typeof CANONICAL_LANE_ROLES)[number]

/**
 * "Held identical to the CHECK constraint" is a type error now rather than a
 * sentence: `LaneRole` is derived from `lanes_lane_role_check` when the types
 * are generated, `satisfies` above holds every entry to it, and this holds
 * the list to the whole of it — a role the schema accepts and this list omits
 * leaves `Exclude` non-empty and the assignment red.
 */
const _everyRoleIsListed: Exclude<LaneRole, CanonicalLaneRole> extends never ? true : never =
  true
// Read once: `noUnusedLocals` would otherwise refuse the proof for being one.
void _everyRoleIsListed

/**
 * The roles whose lanes hold TOUCHPOINTS rather than actions — what a moment
 * happens through: an app, a document, a channel, a place.
 *
 * A fact about what a row MEANS, so it sits here beside the vocabulary rather
 * than in whichever module asked first. Two different questions read it: how a
 * cell's content is parsed (one touchpoint per line — `blueprintLayout`), and
 * whether a cell's frame is a logo rather than a drawn moment (the storyboard
 * walkthrough's roster).
 */
export const TOUCHPOINT_LANE_ROLES = [
  FRONTSTAGE_TOUCHPOINTS_ROLE,
  BACKSTAGE_TOUCHPOINTS_ROLE,
] as const satisfies readonly CanonicalLaneRole[]

/** Whether a resolved role is one of the touchpoint roles. */
export function isTouchpointLaneRole(role: string | null | undefined): boolean {
  if (!role) return false
  return (TOUCHPOINT_LANE_ROLES as readonly string[]).includes(role)
}

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
 * The role in words, for a human reading a lane's properties: a LABEL for the
 * badge and a BODY for the definition under it.
 *
 * The enum key is a rendering contract (`frontstage_actions` decides where the
 * visibility line draws); it is not an answer to "what is this row". The
 * sentences come from `references/lane-roles.md`, which is the same source the
 * agent reads, so the two never say different things about the same key.
 *
 * Two fields rather than one sentence a reader splits on an em dash. The old
 * shape was `"Storyboard — the frames for each step"` and `labelLaneRole` took
 * the half before the dash, which made the badge's word a parsing result: an
 * author who wrote a body containing a dash renamed the badge without meaning
 * to. It also printed the term twice — once in the badge, once at the head of
 * the sentence under it. The body now starts with the sentence, which is the
 * rule the entity-panels composition guideline states: a definition never
 * repeats its term.
 *
 * An unknown or absent role is not an error: a custom role and a null role
 * both render as a generic swimlane, which is exactly what this says.
 */
export const LANE_ROLES: Readonly<
  Record<CanonicalLaneRole, { label: string; body: string }>
> = {
  [CUSTOMER_ACTIONS_ROLE]: {
    label: 'Customer actions',
    body: 'The spine of the journey. The interaction line draws below it.',
  },
  [FRONTSTAGE_ACTIONS_ROLE]: {
    label: 'Frontstage',
    body: 'Staff actions the customer can see.',
  },
  [BACKSTAGE_ACTIONS_ROLE]: {
    label: 'Backstage',
    body: 'Staff actions out of sight.',
  },
  [FRONTSTAGE_TOUCHPOINTS_ROLE]: {
    label: 'Frontstage touchpoints',
    body: 'What the customer meets: apps, documents, places and channels.',
  },
  [BACKSTAGE_TOUCHPOINTS_ROLE]: {
    label: 'Backstage touchpoints',
    body: 'The tools and artifacts staff use out of sight.',
  },
  [SUPPORT_ACTIONS_ROLE]: {
    label: 'Support',
    body: 'Teams, vendors and infrastructure behind the work.',
  },
  [PARTNER_ACTIONS_ROLE]: {
    label: 'Partner',
    body: 'A party outside the service, acting where the customer can see them.',
  },
  [STORYBOARD_ROLE]: {
    label: 'Storyboard',
    body:
      'The frames for each step, not text. A step’s frames across the '
      + 'lanes are its strip.',
  },
}

export function describeLaneRole(role: string | null | undefined): string {
  if (!role) return 'A swimlane with no blueprint role.'
  return LANE_ROLES[role as CanonicalLaneRole]?.body ?? `Custom role: ${role}.`
}

/**
 * The role as a BADGE — the name only, no explanation.
 *
 * A panel that shows a generic "Lane" badge AND a sentence naming the role
 * underneath says the same thing twice at two sizes. The badge takes the
 * label and the definition lives behind the hover, which is where an
 * explanation belongs once the reader can see the answer.
 */
export function labelLaneRole(role: string | null | undefined): string {
  if (!role) return 'Lane'
  return LANE_ROLES[role as CanonicalLaneRole]?.label ?? 'Lane'
}
