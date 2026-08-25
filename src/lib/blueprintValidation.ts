import type { LaneSetEntry, ViewType } from '@/lib/authoringRpc'

/**
 * What a new scenario needs before it is worth sending.
 *
 * Mirrors the checks `create_scenario` raises, for the same reason
 * `sliceValidation.ts` mirrors the slice tool: a rule enforced only in the
 * database is a rule the person meets by being rejected. These run as they
 * type; the database's copy stays as the authority.
 */

export const VIEW_TYPES: ViewType[] = ['single', 'side-by-side', 'integrated']

/** Display names. The stored values are hyphenated; nobody should read those. */
export const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  single: 'Single',
  'side-by-side': 'Side by side',
  integrated: 'Integrated',
}

/** What each view type is for, in the words someone choosing one would use. */
export const VIEW_TYPE_HINTS: Record<ViewType, string> = {
  single: 'One version at a time',
  'side-by-side': 'Paths compared step by step',
  integrated: 'Every version merged into one grid',
}

/**
 * The lanes a scenario starts with when nothing is copied.
 *
 * Deliberately the standard set rather than something minimal: an empty lane
 * rail invites inventing a private vocabulary, which is the drift copying
 * exists to prevent.
 *
 * Names, roles and order are all taken from what this database actually
 * contains, not from the generic service-blueprint diagram. Two things there
 * are easy to get wrong and are load-bearing:
 *
 * - The roles are `frontstage_tech`, not `front_stage_tech`. Only `visual` and
 *   the four stage roles carry one; actor lanes and Support Actions have none,
 *   and inventing a role for them would put a stage separator where there is
 *   no stage boundary.
 * - **Tech sits above actions**, which reverses the usual textbook order. That
 *   was a deliberate change — see the `stage_tech_before_actions_lane_order`
 *   migration — and a new blueprint that ordered them the other way would not
 *   line up against any existing one in the side-by-side view.
 */
export const DEFAULT_LANE_SET: LaneSetEntry[] = [
  { name: 'Visual', lane_role: 'visual', position: 0 },
  { name: 'Customer Actions', lane_role: 'customer_actions', position: 1 },
  { name: 'Front Stage Tech', lane_role: 'frontstage_tech', position: 2 },
  { name: 'Front Stage Actions', lane_role: 'frontstage_actions', position: 3 },
  { name: 'Back Stage Tech', lane_role: 'backstage_tech', position: 4 },
  { name: 'Back Stage Actions', lane_role: 'backstage_actions', position: 5 },
  { name: 'Support Actions', lane_role: null, position: 6 },
]

/** Columns beyond this read as a process map, not a blueprint. */
export const MAX_STEP_COUNT = 12
export const MIN_STEP_COUNT = 1

export type DraftBlueprint = {
  phaseId: string | null
  name: string
  viewType: ViewType
  /** Copy lanes from this version. Null means use `DEFAULT_LANE_SET`. */
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
    problems.push('The first version needs a name — "Happy Path" is the usual one.')
  }
  if (!VIEW_TYPES.includes(draft.viewType)) {
    problems.push('Pick how the versions should be laid out.')
  }
  if (!Number.isInteger(draft.stepCount)) {
    problems.push('The number of columns must be a whole number.')
  } else if (draft.stepCount < MIN_STEP_COUNT) {
    problems.push('A scenario needs at least one step.')
  } else if (draft.stepCount > MAX_STEP_COUNT) {
    problems.push(
      `${MAX_STEP_COUNT} steps is the practical limit — past that it reads as a process map rather than a service blueprint. Add more later if the story needs them.`,
    )
  }

  return problems
}

/** The lane set a draft will actually be created with. */
export function laneSetFor(draft: DraftBlueprint): LaneSetEntry[] {
  return draft.laneSourcePathId ? [] : DEFAULT_LANE_SET
}
