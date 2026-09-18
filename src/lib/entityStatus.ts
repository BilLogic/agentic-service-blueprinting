/**
 * How far along the thing an entity describes is — one vocabulary, shared by
 * cells and paths.
 *
 * It began as two values on cells, `planned` and `prototype`, and the boundary
 * between them did not order: both meant "not built", neither said how close.
 * Worse, the one case labelled `planned` was a card already merged on the dev
 * branch and sitting in QA, which is the most built a thing can be without
 * being live.
 *
 * Two things changed on 2026-08-21. It stopped being called `maturity`, which
 * promised a single ladder that orders — three rungs sat below shipped and two
 * qualified it, with shipped itself unrepresented, so `deprecated` was not
 * "further along" than `at_risk`. And `live` was added, which is what turns the
 * list into a lifecycle and removes the double duty NULL was doing: "how it
 * works today" AND "nobody has assessed this", on 879 cells at once.
 *
 * Paths share it rather than getting their own list. A second vocabulary for
 * the same question drifts from the first within a month, and the six path
 * values were already saying it in a name prefix nothing could query.
 */
import type { EntityStatus } from '@/types/database'

/**
 * The vocabulary, in the order the panel shows it. The TYPE is the database's:
 * `EntityStatus` is derived from the `entity_status` domain when the types are
 * generated, so a value added there is a value this list has to carry before
 * the build is green — `satisfies` holds each entry to the union, and the
 * label record below holds the list to the whole of it.
 */
export const ENTITY_STATUS = [
  'proposed',
  'planned',
  'built',
  'live',
  'at_risk',
  'deprecated',
] as const satisfies readonly EntityStatus[]

export type { EntityStatus }

/** What a row gets when nobody has said otherwise. */
export const DEFAULT_ENTITY_STATUS: EntityStatus = 'live'

/** Is this describing something nobody can use yet? */
export function isUnbuilt(status: EntityStatus | null | undefined): boolean {
  return status === 'proposed' || status === 'planned' || status === 'built'
}

/**
 * The state in the words a reader uses.
 *
 * There was a second record here, `ENTITY_STATUS_LABEL`, holding the same six
 * states with their meanings glued on behind an em dash — "Proposed — design
 * only" against the meaning record's "Designed and discussed, with no build
 * card behind it." Two sentences for one state is two things to keep true, and
 * the short one drifted from the long one the moment either was edited. The
 * select now draws the name and the meaning as two nodes from the two records
 * below, so the option list and the badge's definition body read the same
 * source.
 */
export const ENTITY_STATUS_SHORT: Record<EntityStatus, string> = {
  proposed: 'Proposed',
  planned: 'Planned',
  built: 'Built',
  live: 'Live',
  at_risk: 'At risk',
  deprecated: 'Deprecated',
}

/** What each rung means, for the badge's hover. */
export const ENTITY_STATUS_MEANING: Record<EntityStatus, string> = {
  proposed:
    'Designed and discussed, with no build card behind it. It may never happen.',
  planned: 'Committed and carded, but no code exists yet.',
  built:
    'Code exists and is in build or QA. Not deployed, so nobody is using it.',
  live: 'In use today. This is what the service actually does.',
  at_risk: 'Live and in use, and failing in a way somebody has measured.',
  deprecated:
    'Still there and still working, and being taken away. Do not build on it.',
}

export function asEntityStatus(value: unknown): EntityStatus | null {
  return (ENTITY_STATUS as readonly unknown[]).includes(value)
    ? (value as EntityStatus)
    : null
}
