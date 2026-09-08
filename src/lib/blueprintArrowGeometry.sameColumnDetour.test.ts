// @vitest-environment jsdom

/**
 * Which way a detoured same-column connector points its head (#450).
 *
 * Two cells in one step column but different lanes are joined by a vertical
 * connector, and a card standing between them forces the run out through a
 * column gutter. The gutter it takes is a fact about which side had room; the
 * arrowhead must not be. The markers are `orient="auto"`, so a bracket that
 * ends by turning back INTO the card's side draws its head along that last
 * stub — rightward out of the left gutter, and leftward out of the right one.
 * A leftward head on a grid whose whole convention is that time runs left to
 * right reads as "this flows backward", which a same-step connector never does.
 *
 * These boards are built the way `arrowSituationCatalog` builds its fixtures —
 * a real element tree whose rects are pinned — and read the engine's own
 * output, so what they assert is the `d` string the overlays draw.
 */

import { describe, expect, test } from 'vitest'
import {
  computeSituationSegments,
  type BoardSpec,
} from '@/dev/arrowSituationCatalog'

/** Every point the drawn path lands on: `M`/`L` ends and each `Q`'s end. */
function pathPoints(d: string): { x: number; y: number }[] {
  const tokens = d.trim().split(/\s+/)
  const points: { x: number; y: number }[] = []
  for (let i = 0; i < tokens.length; ) {
    const command = tokens[i]
    if (command === 'M' || command === 'L') {
      points.push({ x: Number(tokens[i + 1]), y: Number(tokens[i + 2]) })
      i += 3
    } else if (command === 'Q') {
      points.push({ x: Number(tokens[i + 3]), y: Number(tokens[i + 4]) })
      i += 5
    } else {
      i += 1
    }
  }
  return points
}

/**
 * The direction the head points: the last segment of real length, which is
 * exactly what an `orient="auto"` marker rotates itself onto.
 */
function headDirection(d: string): { dx: number; dy: number } {
  const points = pathPoints(d)
  for (let i = points.length - 1; i > 0; i--) {
    const dx = points[i]!.x - points[i - 1]!.x
    const dy = points[i]!.y - points[i - 1]!.y
    if (dx !== 0 || dy !== 0) return { dx, dy }
  }
  throw new Error(`path has no segment with length: ${d}`)
}

function onlySegment(board: BoardSpec) {
  const segments = computeSituationSegments(board)
  expect(segments).toHaveLength(1)
  return segments[0]!
}

/* ------------------------------------------------------------- fixtures

  One column of cells, PAD 40 wide by COL_W 160, so a card spans x 248..408 in
  column 1 and x 40..200 in column 0. A gap element is what makes a gutter
  reachable: column 0 has no gap before it, so a board that supplies only
  `gap 0` leaves the RIGHT gutter as the single candidate — the case that
  draws the backward head today.
*/

const CARD_W = 160
const COL0_LEFT = 40
const COL1_LEFT = 248

type CellSpec = { id: string; left: number; top: number; height: number }

function board(
  step: number,
  cells: CellSpec[],
  gaps: { gapIndex: number; left: number; width: number }[],
  dependency: { from: string; to: string },
): BoardSpec {
  return {
    rootBox: { left: 0, top: 0, width: 700, height: 620 },
    rows: cells.map((cell) => ({
      key: `lane-${cell.id}`,
      cells: [
        {
          id: cell.id,
          stepIndex: step,
          box: {
            left: cell.left,
            top: cell.top,
            width: CARD_W,
            height: cell.height,
          },
        },
      ],
    })),
    gaps: gaps.map((gap) => ({
      gapIndex: gap.gapIndex,
      box: { left: gap.left, top: 40, width: gap.width, height: 560 },
    })),
    dependencies: [
      {
        id: 'dep',
        source_cell_id: dependency.from,
        target_cell_id: dependency.to,
      },
    ],
  }
}

/** Column 0, one gap to its right: only the right gutter can be bracketed. */
function rightGutterOnlyBoard(): BoardSpec {
  return board(
    0,
    [
      { id: 'source', left: COL0_LEFT, top: 40, height: 100 },
      { id: 'between', left: COL0_LEFT, top: 200, height: 60 },
      { id: 'target', left: COL0_LEFT, top: 340, height: 100 },
    ],
    [{ gapIndex: 0, left: 200, width: 48 }],
    { from: 'source', to: 'target' },
  )
}

/** Column 1 with no gap after it: only the left gutter can be bracketed. */
function leftGutterOnlyBoard(): BoardSpec {
  return board(
    1,
    [
      { id: 'source', left: COL1_LEFT, top: 40, height: 100 },
      { id: 'between', left: COL1_LEFT, top: 200, height: 60 },
      { id: 'target', left: COL1_LEFT, top: 340, height: 100 },
    ],
    [{ gapIndex: 0, left: 200, width: 48 }],
    { from: 'source', to: 'target' },
  )
}

/** Column 1 with a gap either side, the right one nearer the cards. */
function bothGuttersBoard(): BoardSpec {
  return board(
    1,
    [
      { id: 'source', left: COL1_LEFT, top: 40, height: 100 },
      { id: 'between', left: COL1_LEFT, top: 200, height: 60 },
      { id: 'target', left: COL1_LEFT, top: 340, height: 100 },
    ],
    [
      { gapIndex: 0, left: 160, width: 88 },
      { gapIndex: 1, left: 408, width: 48 },
    ],
    { from: 'source', to: 'target' },
  )
}

/**
 * Both gutters reachable, and the target walled in above and below by cards
 * standing within the chevron's room of its horizontal edges — the case the
 * side entry exists for.
 */
function walledTargetBoard(): BoardSpec {
  return board(
    1,
    [
      { id: 'source', left: COL1_LEFT, top: 40, height: 100 },
      { id: 'between', left: COL1_LEFT, top: 180, height: 60 },
      { id: 'target', left: COL1_LEFT, top: 262, height: 100 },
      { id: 'below', left: COL1_LEFT, top: 384, height: 60 },
    ],
    [
      { gapIndex: 0, left: 160, width: 88 },
      { gapIndex: 1, left: 408, width: 48 },
    ],
    { from: 'source', to: 'target' },
  )
}

describe('a detoured same-column connector', () => {
  test('arrives on the target’s top edge when only the right gutter has room', () => {
    // The route must bracket through the right gutter — there is no gap
    // element before column 0 — so this is the board that used to end with a
    // leftward stub into the target's right edge.
    const { d } = onlySegment(rightGutterOnlyBoard())
    expect(d).toContain('L 224 ')
    // Down the right gutter, in above the card, then down onto its top edge:
    // the chevron's base lands a chevron clear of the edge at y 324.
    expect(d.endsWith('L 120 324')).toBe(true)
    expect(headDirection(d)).toEqual({ dx: 0, dy: 6 })
  })

  test('reads the same way out of either gutter', () => {
    // Which gutter had room is a fact about the neighbours, never about the
    // dependency; the head must not encode it.
    const right = headDirection(onlySegment(rightGutterOnlyBoard()).d)
    const left = headDirection(onlySegment(leftGutterOnlyBoard()).d)
    const both = headDirection(onlySegment(bothGuttersBoard()).d)
    expect(left).toEqual(right)
    expect(both).toEqual(right)
    expect(right.dx).toBe(0)
    expect(right.dy).toBeGreaterThan(0)
  })

  test('never points its head backward along the time axis', () => {
    for (const make of [
      rightGutterOnlyBoard,
      leftGutterOnlyBoard,
      bothGuttersBoard,
      walledTargetBoard,
    ]) {
      const { dx } = headDirection(onlySegment(make()).d)
      expect(dx, `${make.name} drew a backward head`).toBeGreaterThanOrEqual(0)
    }
  })

  test('falls back to a side entry, through the left gutter, when both horizontal edges are walled', () => {
    const { d } = onlySegment(walledTargetBoard())
    // Out of the LEFT gutter (centre 204) even though the right one (432) is
    // the nearer of the two, so the last stub travels rightward into the
    // target's left edge rather than backward into its right one.
    expect(d).toContain('L 204 ')
    expect(d.endsWith('L 232 312')).toBe(true)
    expect(headDirection(d).dy).toBe(0)
    expect(headDirection(d).dx).toBeGreaterThan(0)
  })

  test('draws nothing at all when no gutter is clear', () => {
    // A one-column board with no gap element either side: the left gutter
    // falls inside the chevron and there is no gap to the right. A missing
    // arrow beats one drawn through a cell's text.
    const noGutters = board(
      0,
      [
        { id: 'source', left: COL0_LEFT, top: 40, height: 100 },
        { id: 'between', left: COL0_LEFT, top: 200, height: 60 },
        { id: 'target', left: COL0_LEFT, top: 340, height: 100 },
      ],
      [],
      { from: 'source', to: 'target' },
    )
    expect(computeSituationSegments(noGutters)).toEqual([])
  })
})

describe('an undetoured same-column connector', () => {
  test('is the straight run between the two cards, unchanged', () => {
    const clear = board(
      0,
      [
        { id: 'source', left: COL0_LEFT, top: 40, height: 100 },
        { id: 'target', left: COL0_LEFT, top: 240, height: 100 },
      ],
      [{ gapIndex: 0, left: 200, width: 48 }],
      { from: 'source', to: 'target' },
    )
    expect(onlySegment(clear).d).toBe('M 120 140 L 120 224')
  })
})
