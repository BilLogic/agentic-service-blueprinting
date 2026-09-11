import type { LaneSetEntry, Layout } from '@/lib/authoringRpc'

/**
 * What a new scenario needs before it is worth sending.
 *
 * Mirrors the checks `create_scenario` raises, for the same reason
 * `sliceValidation.ts` mirrors the slice tool: a rule enforced only in the
 * database is a rule the person meets by being rejected. These run as they
 * type; the database's copy stays as the authority.
 */

export const LAYOUTS: Layout[] = ['stacked', 'merged']

/** Display names. */
export const LAYOUT_LABELS: Record<Layout, string> = {
  stacked: 'Stacked',
  merged: 'Merged',
}

/**
 * What each layout is for, in the words someone choosing one would use.
 *
 * Two rather than three since the migration that gave each thing one
 * spelling: `side-by-side` and `integrated` were one layout the reader
 * switches between, not two a scenario is stored as. Merging every path into
 * one grid is a display state the client holds; it was never a property of the
 * scenario.
 */
export const LAYOUT_HINTS: Record<Layout, string> = {
  stacked: 'One full band per path, on a shared step axis',
  merged: 'The paths combined into one blueprint',
}

/**
 * The template's own lanes for a scenario that copies nothing.
 *
 * A deployment names its own on the config's `defaultLanes`, and the create
 * dialog passes the resolved set to {@link laneSetFor}; this constant is what
 * that resolves to when the deployment names none. So an installation whose
 * boards use different lane names supplies them there and leaves this module
 * as it is.
 *
 * Deliberately the standard set rather than something minimal: an empty lane
 * rail invites inventing a private vocabulary, which is the drift copying
 * exists to prevent.
 *
 * Names, roles and order are all taken from what this database actually
 * contains, not from the generic service-blueprint diagram. Two things there
 * are easy to get wrong and are load-bearing:
 *
 * - The roles come from the closed `lane_role` vocabulary
 *   (`lanes_lane_role_check`): `storyboard`, the two touchpoint roles, the
 *   four stage/support roles. Every lane here carries one — a role outside the
 *   set is rejected on write.
 * - **Touchpoints sit above actions**, which reverses the usual textbook
 *   order. That was a deliberate change — see the
 *   `stage_tech_before_actions_lane_order` migration — and a new blueprint
 *   that ordered them the other way would not line up against any existing one
 *   in the side-by-side view.
 */
export const DEFAULT_LANE_SET: LaneSetEntry[] = [
  { name: 'Storyboard', lane_role: 'storyboard', position: 0 },
  { name: 'Customer Actions', lane_role: 'customer_actions', position: 1 },
  { name: 'Front Stage Touchpoints', lane_role: 'frontstage_touchpoints', position: 2 },
  { name: 'Front Stage Actions', lane_role: 'frontstage_actions', position: 3 },
  { name: 'Back Stage Touchpoints', lane_role: 'backstage_touchpoints', position: 4 },
  { name: 'Back Stage Actions', lane_role: 'backstage_actions', position: 5 },
  { name: 'Support Actions', lane_role: 'support_actions', position: 6 },
]

/** Columns beyond this read as a process map, not a blueprint. */
export const MAX_STEP_COUNT = 12
export const MIN_STEP_COUNT = 1

export type DraftBlueprint = {
  phaseId: string | null
  name: string
  layout: Layout
  /** Copy lanes from this version. Null means use the default lanes. */
  laneSourcePathId: string | null
  stepCount: number
  pathName: string
}

/**
 * Problems worth showing, in the order they should be fixed.
 *
 * Empty means it can be sent. Each string is a sentence a person can act on —
 * no field names, no constraint names.
 */
export function validateDraftBlueprint(draft: DraftBlueprint): string[] {
  const problems: string[] = []

  if (!draft.phaseId) {
    problems.push('Pick the phase this scenario belongs to.')
  }
  if (!draft.name.trim()) {
    problems.push('A scenario needs a name.')
  }
  if (!draft.pathName.trim()) {
    problems.push(
      // Not "Happy Path": a kind is not a name, and `kind` already carries
      // the archetype. The name says which route this one is.
      'The first version needs a name — say what the route is, e.g. "Signs up without conflicts".',
    )
  }
  if (!LAYOUTS.includes(draft.layout)) {
    problems.push('Pick how the versions should be laid out.')
  }
  if (!Number.isInteger(draft.stepCount)) {
    problems.push('The number of steps must be a whole number.')
  } else if (draft.stepCount < MIN_STEP_COUNT) {
    problems.push('A scenario needs at least one step.')
  } else if (draft.stepCount > MAX_STEP_COUNT) {
    problems.push(
      `${MAX_STEP_COUNT} steps is the practical limit — past that it reads as a process map rather than a service blueprint. Add more later if the story needs them.`,
    )
  }

  return problems
}

/**
 * The lane set a draft will actually be created with.
 *
 * `defaultLanes` is the set a new blueprint starts with when nothing is
 * copied — the deployment's, resolved from its config, so the dialog passes
 * what `useDeploymentConfig()` resolved. Omitted, it is this template's own.
 * The lanes come in as an argument rather than being read here so this module
 * stays a set of pure checks, identical in every installation.
 */
export function laneSetFor(
  draft: DraftBlueprint,
  defaultLanes: LaneSetEntry[] = DEFAULT_LANE_SET,
): LaneSetEntry[] {
  return draft.laneSourcePathId ? [] : defaultLanes
}
