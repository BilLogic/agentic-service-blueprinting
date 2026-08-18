import type { DependencyKind } from '@/lib/authoringRpc'

/**
 * Dependency rules, checked before the round trip.
 *
 * Mirrors what `set_cell_dependency` raises. The database stays the authority
 * — two people can connect the same cells at once — but a rule you meet by
 * being rejected is a rule you have to guess at first.
 */

export const DEPENDENCY_KINDS: DependencyKind[] = ['trigger', 'needs']

/**
 * What each kind means, and — the part that matters — whether it draws.
 *
 * Every relationship being an arrow is what makes a blueprint unreadable.
 * Most "this depends on that" facts are not handoffs: they are constraints
 * worth recording and not worth drawing. `needs` is where those go.
 */
export const DEPENDENCY_KIND_HINTS: Record<DependencyKind, string> = {
  trigger: 'One step hands off to the next. Draws an arrow.',
  needs: 'A dependency that is not a handoff. Recorded, never drawn.',
}

export const DEPENDENCY_KIND_LABELS: Record<DependencyKind, string> = {
  trigger: 'Triggers',
  needs: 'Needs',
}

export type DraftDependency = {
  sourceCellId: string
  targetCellId: string | null
  kind: DependencyKind
  label: string
  note: string
}

/** Enough about the other end to check a draft without another read. */
export type DependencyEndpoint = {
  cellId: string
  pathId: string
  label: string
}

/**
 * Problems worth showing, in the order they should be fixed.
 *
 * The same-version rule is the one people hit. An arrow between two versions
 * of a journey would render as a line leaving the grid it belongs to — the
 * versions are alternatives, not stages, so a handoff between them describes
 * something that cannot happen.
 */
export function validateDraftDependency(
  draft: DraftDependency,
  source: DependencyEndpoint,
  target: DependencyEndpoint | null,
  existing: Array<{ targetCellId: string; kind: string }>,
): string[] {
  const problems: string[] = []

  if (!draft.targetCellId || !target) {
    problems.push('Pick the cell this one connects to.')
    return problems
  }

  if (draft.targetCellId === draft.sourceCellId) {
    problems.push('A cell cannot depend on itself.')
  }

  if (target.pathId !== source.pathId) {
    problems.push(
      'Both cells must be on the same path — paths are alternatives, so a handoff between them cannot happen.',
    )
  }

  if (
    existing.some(
      (entry) =>
        entry.targetCellId === draft.targetCellId && entry.kind === draft.kind,
    )
  ) {
    problems.push('That connection already exists.')
  }

  if (!DEPENDENCY_KINDS.includes(draft.kind)) {
    problems.push('Pick whether this is a handoff or a dependency.')
  }

  return problems
}
