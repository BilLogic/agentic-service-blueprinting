/**
 * Rules for creating or copying a path of a journey.
 *
 * A journey has one happy path and any number of alternatives, and they are
 * *alternatives* — not stages, not revisions. That is why nothing connects
 * across them.
 */

export type VersionMode = 'blank' | 'duplicate'

/**
 * The `path_type` values the database actually accepts.
 *
 * These are not a UI vocabulary choice — `paths_path_type_check` is a CHECK
 * constraint, and anything outside this list is refused by the insert. The
 * list here was previously `happy | alternative | edge-case | sad`, of which
 * **two did not exist**: picking "Edge case" or "Sad path" built a row the
 * database rejected, so half the dropdown could not be submitted — the app
 * could not create the data it was already showing.
 *
 * Keep this in step with the constraint. If a new type is wanted, the
 * constraint changes first.
 */
export const PATH_TYPES = [
  'happy',
  'alternative',
  'unhappy',
  'exception',
] as const
export type PathType = (typeof PATH_TYPES)[number]

export const PATH_TYPE_LABELS: Record<PathType, string> = {
  happy: 'Happy path',
  alternative: 'Alternative',
  unhappy: 'Unhappy path',
  exception: 'Exception',
}

export type DraftVersion = {
  mode: VersionMode
  name: string
  pathType: PathType
  /** Blank mode: copy lanes from here. Duplicate mode: the version to copy. */
  sourcePathId: string | null
  copyCells: boolean
  copyDependencies: boolean
}

export function validateDraftVersion(
  draft: DraftVersion,
  siblingNames: string[],
): string[] {
  const problems: string[] = []
  const name = draft.name.trim()

  if (!name) {
    problems.push('A path needs a name.')
  } else if (
    siblingNames.some((sibling) => sibling.trim().toLowerCase() === name.toLowerCase())
  ) {
    problems.push(
      `This journey already has a path called “${name}”. Two paths with the same name cannot be told apart in the sidebar or a slice.`,
    )
  }

  if (draft.mode === 'duplicate' && !draft.sourcePathId) {
    problems.push('Pick the path to copy.')
  }

  if (draft.mode === 'duplicate' && draft.copyDependencies && !draft.copyCells) {
    problems.push(
      'Arrows cannot be copied without the cells they connect — either copy the cells too, or leave the arrows behind.',
    )
  }

  return problems
}

/**
 * What the copy will contain, phrased as an outcome rather than as settings.
 *
 * Worth saying out loud because the arrow behaviour is the part people get
 * wrong: a copy whose arrows still pointed at the original's cells would draw
 * lines leaving the path they belong to.
 */
export function describeVersionOutcome(draft: DraftVersion): string {
  if (draft.mode === 'blank') {
    return draft.sourcePathId
      ? 'An empty grid with the same lanes as the path you picked.'
      : 'An empty grid with the same lanes as the rest of this journey.'
  }
  if (!draft.copyCells) return 'The lanes and steps only — no cell text.'
  return draft.copyDependencies
    ? 'Every cell and every arrow, with the arrows repointed onto the copies.'
    : 'Every cell, with no arrows between them.'
}
