import type { SupabaseClient } from '@supabase/supabase-js'
import {
  deletionImpact,
  type AffectedSlice,
  type DeletionImpact,
  type DeletionKind,
} from '@/lib/authoringRpc'
import { sliceDeletionImpact, type SliceDeletionImpact } from '@/lib/sliceMutations'
import type { Database } from '@/types/database'

/**
 * What a delete would destroy, and whether it could be undone.
 *
 * The plan's rule is that no delete affordance ships before its archive
 * exists. That is enforced structurally — `canDelete` below — rather than by
 * remembering, because a delete button on a schema with no `deleted_structure`
 * table destroys imported blueprint content with nothing behind it.
 */

/**
 * Everything the confirm dialog can delete.
 *
 * **Deliberately narrower than `DeletionKind`.** That type is the set of kinds
 * `deletion_impact` will answer for; this one is the set whose counts are
 * actually TRUE of the delete that follows, and `lane` and `step` are not in
 * it:
 *
 *   * `deletion_impact('lane', id)` counts the cells of ONE `layers` row, but
 *     `remove_lane(scenario_id, lane_name)` deletes every same-named lane
 *     across every path of the scenario. A 12-cell dialog would precede a
 *     36-cell delete — it undercounts.
 *   * `deletion_impact('step', id)` counts the cells of that step across every
 *     path, but `remove_step(path_id, step_id)` deletes only the ones on the
 *     path it is given. It overcounts.
 *
 * Two mismatches in opposite directions, neither of which any caller has ever
 * exercised — nothing passes `lane` or `step`. The type advertised them
 * anyway, which is all a future caller needs to ship a confirm dialog whose
 * numbers are wrong in the one place numbers are the entire point. Making them
 * unrepresentable is chosen over correcting the two SQL predicates because the
 * correction cannot be verified without a migration apply, while this ships
 * with the branch — and because when someone does want a lane delete, the
 * compile error lands exactly on the pair of functions that has to be made to
 * agree first.
 *
 * A slice, conversely, is NOT a `DeletionKind` and must never be added there:
 * `deletion_impact` answers "how much of the BLUEPRINT dies", and a slice
 * delete destroys none of it (see `sliceDeletionImpact`).
 */
export type DeletableKind = Extract<DeletionKind, 'scenario' | 'path'> | 'slice'

/** Nouns for the confirm sentence. */
export const DELETION_NOUNS: Record<DeletableKind, string> = {
  scenario: 'scenario',
  path: 'path',
  slice: 'slice',
}

export type DeletionReadiness =
  | { canDelete: true }
  | { canDelete: false; reason: string }

/**
 * Whether deleting is available at all.
 *
 * `archiveAvailable` comes from the app checking that `deleted_structure` is
 * present. Absent, the affordance is hidden rather than disabled: a disabled
 * delete button invites someone to go looking for how to enable it, and there
 * is no safe way to.
 */
export function deletionReadiness(archiveAvailable: boolean): DeletionReadiness {
  if (!archiveAvailable) {
    return {
      canDelete: false,
      reason:
        'Deleting is unavailable until the recovery archive exists — without it a delete could not be undone.',
    }
  }
  return { canDelete: true }
}

export type FrameLoss = {
  /** Slices that would lose frames and can be restored by undo. */
  recoverable: AffectedSlice[]
  /**
   * Slices holding at least one cell with no stored key. Undo matches on keys,
   * so these frames cannot be put back — the delete is one-way for them.
   */
  unrecoverable: AffectedSlice[]
}

/**
 * Split affected slices by whether undo could actually restore them.
 *
 * A null key means the cell's authored key was never written, so nothing can
 * match it back after a restore. Presenting those together with the
 * recoverable ones would let a confirm dialog imply an undo it cannot perform.
 *
 * **No keys at all counts as unrecoverable, not as nothing to worry about.**
 * This slice is in the list precisely because it loses cells to the delete; an
 * empty key list means not one of them can be matched back, which is the least
 * recoverable state there is. Reading it as "no missing keys, therefore fine"
 * inverts the answer — and that is exactly what a plain `.some()` does on an
 * empty array.
 */
export function splitByRecoverability(slices: AffectedSlice[]): FrameLoss {
  const recoverable: AffectedSlice[] = []
  const unrecoverable: AffectedSlice[] = []
  for (const slice of slices) {
    const missing =
      slice.cell_keys.length === 0 ||
      slice.cell_keys.some((key) => key === null || key === '')
    if (missing) {
      unrecoverable.push(slice)
    } else {
      recoverable.push(slice)
    }
  }
  return { recoverable, unrecoverable }
}

/**
 * One countable consequence — "9 cells", "4 arrows".
 *
 * Split into count and noun rather than pre-formatted prose so the dialog can
 * set the number apart from the word. The number IS the consequence; buried
 * mid-sentence it reads as decoration, which is how a confirm dialog ends up
 * being clicked through.
 */
export type ImpactFact = { count: number; noun: string }

/**
 * What the confirm dialog shows: the counts, and the sentences that qualify
 * them.
 *
 * `facts` are always destroyed. `warnings` are consequences that need a clause
 * to be honest — which slices lose frames, and which of those undo cannot put
 * back. `reassurances` name what deliberately survives, and exist because the
 * most important fact about deleting a slice is that the blueprint is untouched.
 */
export type ImpactSummary = {
  facts: ImpactFact[]
  warnings: string[]
  reassurances: string[]
}

/**
 * Counts come from `deletion_impact`, which counts what the cascade actually
 * destroys — including the arrows that die with the cells. A dialog that named
 * only the cells would be undercounting by design.
 */
export function summarizeImpact(impact: DeletionImpact): ImpactSummary {
  const facts: ImpactFact[] = [{ count: impact.cell_count, noun: 'cell' }]
  if (impact.dependency_count > 0) {
    facts.push({ count: impact.dependency_count, noun: 'arrow' })
  }

  const warnings: string[] = []
  const { recoverable, unrecoverable } = splitByRecoverability(
    impact.affected_slices,
  )
  if (recoverable.length > 0) {
    warnings.push(
      `${plural(recoverable.length, 'slice')} will lose frames: ${names(recoverable)}.`,
    )
  }
  if (unrecoverable.length > 0) {
    warnings.push(
      `${plural(unrecoverable.length, 'slice')} cannot be restored by undo, because some of their cells have no stored key: ${names(unrecoverable)}.`,
    )
  }

  // The reassurance is qualified — not merely softened — when the warning
  // above it has already said some slices cannot be put back. "Nothing is
  // destroyed without a copy behind it" printed directly under "these slices
  // cannot be restored by undo" is a dialog contradicting itself in adjacent
  // lines, and the sentence people believe is the reassuring one. The archive
  // fact is still true and still worth stating; what is not true is the
  // "nothing" — the blueprint rows come back, the slice frames pointing at
  // them do not.
  const reassurances =
    unrecoverable.length > 0
      ? [
          'The blueprint rows are archived to the recovery table first and can be restored — but not the slice frames named above.',
        ]
      : [
          'Archived to the recovery table first — nothing is destroyed without a copy behind it.',
        ]

  return { facts, warnings, reassurances }
}

/**
 * A slice delete is the one case where the reassurance is the headline: the
 * frames die, the blueprint does not. No archive exists for slices, so the
 * warning says so plainly rather than implying the same recovery the
 * structural kinds get.
 */
export function summarizeSliceImpact(impact: SliceDeletionImpact): ImpactSummary {
  return {
    facts: [{ count: impact.frame_count, noun: 'frame' }],
    warnings: [
      'There is no archive for slices — once this is deleted it cannot be restored, and the change list will not offer a revert for it.',
    ],
    reassurances: [
      impact.referenced_cell_count > 0
        ? `The ${plural(impact.referenced_cell_count, 'blueprint cell')} this slice points at stay exactly as they are.`
        : 'No blueprint cells are touched.',
    ],
  }
}

/**
 * The impact for a target, from whichever source that kind's counts come from.
 *
 * **The one branch.** It lived inside `DeleteStructureDialog`, which meant the
 * only way to find out what a delete would cost was to open the dialog — so
 * the agent, which is not allowed to delete anything, also could not TELL a
 * user what a delete would cost. Both surfaces now call this, so the numbers
 * the agent quotes and the numbers the dialog shows cannot drift; a second
 * implementation for the agent would have been a second chance to undercount.
 *
 * A pure read: `deletion_impact` goes through `authoringRpc`'s `read()` seam
 * and `sliceDeletionImpact` is two selects, so nothing here reaches the
 * session ledger. That is what makes it safe to expose to the agent at all.
 */
export function readDeletionImpact(
  client: SupabaseClient<Database>,
  kind: DeletableKind,
  targetId: string,
): Promise<ImpactSummary> {
  if (kind === 'slice') {
    return sliceDeletionImpact(client, targetId).then(summarizeSliceImpact)
  }
  return deletionImpact(client, kind, targetId).then(summarizeImpact)
}

/**
 * Whether the typed confirmation matches.
 *
 * Exact after trimming, and case-sensitive. A case-insensitive match would let
 * "happy path" delete "Happy Path", which is most of the way to not asking.
 */
export function confirmationMatches(typed: string, label: string): boolean {
  return typed.trim() === label.trim() && label.trim().length > 0
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function names(slices: AffectedSlice[]): string {
  return slices.map((slice) => `“${slice.title}”`).join(', ')
}
