import type { SliceType } from '@/lib/sliceValidation'

/**
 * What kind of slice a selection *is*, read off the selection itself.
 *
 * It used to be a five-way toggle, which asked the author to classify
 * something the picking had already decided: cells sharing one step column are
 * a step slice, and choosing "lane" for them does not make them one — it only
 * files them somewhere they will not be found. The type steers the sidebar
 * group and nothing else, so a wrong answer is a lost slice, and there is no
 * question here a person can answer better than the geometry can.
 *
 * Read from the DOM rather than from the blueprint model because that is where
 * position already lives: every cell renders with its step and lane on it, and
 * a second source for the same fact is a second thing that can disagree.
 */
export type CellPosition = { step: string | null; lane: string | null }

export function readCellPosition(cellId: string): CellPosition {
  const element = document.querySelector(
    `[data-blueprint-cell="${CSS.escape(cellId)}"]`,
  )
  // The step is on the cell; the lane is on the row that holds it. That is
  // already how `canvasCellQuery` reads the grid, and following the same path
  // means one place is wrong if the markup changes rather than two.
  const row = element?.closest('[data-blueprint-row][data-layer-id]')
  return {
    step: element?.getAttribute('data-step-index') ?? null,
    lane: row?.getAttribute('data-layer-id') ?? null,
  }
}

/**
 * Never returns `custom` for an empty pick — an empty selection has no shape,
 * and calling it custom would state something about it that is not known.
 */
export function deriveSliceType(
  cellIds: readonly string[],
  read: (cellId: string) => CellPosition = readCellPosition,
): SliceType {
  if (cellIds.length === 0) return 'custom'
  if (cellIds.length === 1) return 'cell'

  const positions = cellIds.map(read)
  // Any cell whose position cannot be read disqualifies the whole guess:
  // three unknowns all report lane `null`, which a Set is happy to call "one
  // lane" — and a slice confidently filed under LANE on no evidence is worse
  // than one filed under CUSTOM honestly.
  if (positions.some((position) => position.step === null && position.lane === null)) {
    return 'custom'
  }
  const steps = new Set(positions.map((position) => position.step))
  const lanes = new Set(positions.map((position) => position.lane))

  // One lane across several steps is the common case and the useful one: it is
  // what a journey is. Checked before `step` so that a two-cell selection
  // sitting in one lane and one step — which is both, degenerately — is called
  // the thing a reader would call it.
  if (lanes.size === 1 && steps.size > 1) return 'journey'
  if (steps.size === 1 && lanes.size > 1) return 'step'
  if (lanes.size === 1) return 'lane'
  return 'custom'
}

/** One line naming what was picked, in the words a reader would use. */
export function describeSliceType(type: SliceType, count: number): string {
  const cells = `${count} cell${count === 1 ? '' : 's'}`
  switch (type) {
    case 'journey':
      return `${cells} down one lane — a journey`
    case 'step':
      return `${cells} across one moment — a step`
    case 'lane':
      return `${cells} in one lane`
    case 'cell':
      return 'One cell, read closely'
    default:
      return `${cells} from across the service`
  }
}
