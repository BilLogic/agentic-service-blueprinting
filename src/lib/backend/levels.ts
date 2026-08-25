/**
 * Two conformance levels — the decision that makes "any backend" true rather
 * than a marketing line.
 *
 * A contract that demands transactions excludes stores people actually want to
 * use. Notion has no transactions at all. Firestore has them, within limits on
 * how much one may touch. Saying "bring your own backend" and then requiring
 * atomic multi-row writes would be the Supabase requirement again, wearing a
 * different word.
 *
 * So there are two levels, and a backend states which it meets:
 *
 * **Transactional** — every operation marked `atomic` is all-or-nothing. A
 * rejected write leaves nothing behind. `repairSlices` is a no-op, because
 * nothing can tear.
 *
 * **Idempotent** — atomic operations may tear. In exchange the backend owes
 * two things: re-running the same request must converge on the same state,
 * and `repairSlices` must be able to name every torn state and drive it
 * forward. A store with no transactions can be correct; it cannot be correct
 * *silently*.
 *
 * The difference is visible to a user in one place, and it is honest to say
 * so: on an Idempotent backend a write interrupted at the wrong moment can
 * leave a slice with no frames until something calls repair. That is a real
 * cost, stated up front, rather than a guarantee quietly assumed and quietly
 * broken.
 */
import type { ConformanceLevel } from './ports'

export const CONFORMANCE_LEVELS: Record<
  ConformanceLevel,
  { title: string; requires: string[] }
> = {
  transactional: {
    title: 'Transactional',
    requires: [
      'Operations marked @guarantee atomic are all-or-nothing.',
      'A rejected write leaves no trace: no orphan rows, no half-written aggregate.',
      'repairSlices() finds nothing to repair, and returns 0.',
    ],
  },
  idempotent: {
    title: 'Idempotent',
    requires: [
      'Operations marked @guarantee atomic may tear.',
      'Re-running the same request converges on the same state.',
      'repairSlices() resolves every state a torn write can leave behind.',
      'The app tells the user that a repair pass exists and when it runs.',
    ],
  },
}

/** Levels a backend at `level` is expected to satisfy, weakest first. */
export function levelsFor(level: ConformanceLevel): ConformanceLevel[] {
  return level === 'transactional' ? ['idempotent', 'transactional'] : ['idempotent']
}
