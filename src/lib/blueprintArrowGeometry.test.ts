// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ARROW_CHEVRON_SIZE,
  buildCrossLayerForwardArrowPath,
  buildOverheadRailPath,
  buildWrapColumnLeg,
  getOverheadRailY,
  runArrowMeasurementPass,
} from '@/lib/blueprintArrowGeometry'

/*
  The routers are pure functions of the rendered grid, so the fixture is the
  grid: real elements carrying the data attributes the routers query, with
  their boxes declared rather than laid out. What is pinned below is the route
  DECISION — which corridor a run takes, which side it leaves by, which
  vertices it turns at — never a pixel count that a spacing change would move.
*/

type Rect = { left: number; top: number; width: number; height: number }

function place(el: HTMLElement, rect: Rect): HTMLElement {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: rect.left,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    }),
  })
  return el
}

const COLUMN_WIDTH = 200
const COLUMN_GAP = 40
const columnLeft = (index: number) => index * (COLUMN_WIDTH + COLUMN_GAP)
const columnRight = (index: number) => columnLeft(index) + COLUMN_WIDTH
const columnCenter = (index: number) => columnLeft(index) + COLUMN_WIDTH / 2
/** Centre of the gap AFTER column `index` — what the gutter helpers resolve. */
const gapCenter = (index: number) => columnRight(index) + COLUMN_GAP / 2

class Grid {
  readonly root = document.createElement('div')
  private readonly rows = new Map<string, HTMLElement>()

  constructor(width = 2000, height = 2000) {
    place(this.root, { left: 0, top: 0, width, height })
    Object.defineProperty(this.root, 'offsetWidth', { value: width })
    Object.defineProperty(this.root, 'offsetHeight', { value: height })
    document.body.append(this.root)
  }

  /** One lane row; `railCorridor` reserves the overhead strip above it. */
  row(id: string, top: number, height: number, railCorridor = 0): this {
    const row = document.createElement('div')
    row.dataset.blueprintRow = ''
    row.dataset.layerId = id
    row.dataset.layerName = id
    place(row, { left: 0, top, width: 2000, height })

    if (railCorridor > 0) {
      const corridor = document.createElement('div')
      corridor.dataset.blueprintRailCorridor = 'above'
      place(corridor, { left: 0, top, width: 2000, height: railCorridor })
      row.append(corridor)
    }

    this.root.append(row)
    this.rows.set(id, row)
    return this
  }

  cell(rowId: string, stepIndex: number, top: number, height: number): this {
    const cell = document.createElement('div')
    cell.dataset.blueprintCell = `${rowId}-${stepIndex}-${top}`
    cell.dataset.stepIndex = String(stepIndex)
    place(cell, {
      left: columnLeft(stepIndex),
      top,
      width: COLUMN_WIDTH,
      height,
    })
    this.rows.get(rowId)!.append(cell)
    return this
  }

  /** The column-gap spacers the gutter helpers route through. */
  gaps(count: number): this {
    for (let index = 0; index < count; index++) {
      const gap = document.createElement('div')
      gap.dataset.stepGap = String(index)
      place(gap, {
        left: columnRight(index),
        top: 0,
        width: COLUMN_GAP,
        height: 1,
      })
      this.root.append(gap)
    }
    return this
  }

  find(rowId: string, stepIndex: number, top?: number): HTMLElement {
    const matches = Array.from(
      this.rows
        .get(rowId)!
        .querySelectorAll<HTMLElement>(
          `[data-blueprint-cell][data-step-index="${stepIndex}"]`,
        ),
    )
    const found =
      top === undefined
        ? matches[0]
        : matches.find((el) => el.getBoundingClientRect().top === top)
    if (!found) throw new Error(`no cell ${rowId}/${stepIndex}`)
    return found
  }
}

/**
 * Corner-free vertices of a rounded polyline: each rounded corner keeps the
 * original turning point as its quadratic control point, so the route reads
 * back exactly as it was asked for.
 */
function vertices(d: string): Array<[number, number]> {
  const points: Array<[number, number]> = []
  const num = String.raw`(-?\d+(?:\.\d+)?)`
  const move = new RegExp(`^M ${num} ${num}`).exec(d)
  if (move) points.push([Number(move[1]), Number(move[2])])
  for (const q of d.matchAll(
    new RegExp(`Q ${num} ${num} ${num} ${num}`, 'g'),
  )) {
    points.push([Number(q[1]), Number(q[2])])
  }
  const tail = [...d.matchAll(new RegExp(`L ${num} ${num}`, 'g'))].pop()
  if (tail) points.push([Number(tail[1]), Number(tail[2])])
  return points.map(([x, y]) => [Math.round(x), Math.round(y)])
}

const route = (run: () => string) => vertices(runArrowMeasurementPass(run))

beforeEach(() => {
  document.body.replaceChildren()
})

describe('overhead rail', () => {
  /*
    Lane rows: the rail lane reserves a 36px strip above itself, so its cards
    start at 236 and the strip runs 200..236.
  */
  function railGrid() {
    return new Grid()
      .row('lane', 200, 140, 36)
      .cell('lane', 0, 236, 80)
      .cell('lane', 1, 236, 80)
      .cell('lane', 2, 236, 80)
      .gaps(4)
  }

  it('rides the middle of the strip the layout reserved, not the card tops', () => {
    const grid = railGrid()
    const railY = runArrowMeasurementPass(() =>
      getOverheadRailY(grid.find('lane', 0), grid.find('lane', 2), grid.root),
    )
    // Middle of the reserved strip (200..236). Counting back from the card
    // tops instead would put the rail inside whatever else the lane hangs
    // between the strip and its cards — a loop corridor, for one.
    expect(railY).toBe(218)
  })

  it('climbs straight out of a clear column and drops into the target top', () => {
    const grid = railGrid()
    expect(
      route(() =>
        buildOverheadRailPath(
          grid.find('lane', 0),
          grid.find('lane', 2),
          grid.root,
        ),
      ),
    ).toEqual([
      [columnCenter(0), 236],
      [columnCenter(0), 218],
      [columnCenter(2), 218],
      [columnCenter(2), 236 - ARROW_CHEVRON_SIZE],
    ])
  })

  it('leaves sideways when a stacked sub-cell blocks the climb', () => {
    // A merged slot: a second sub-cell sits above the source in its column.
    const grid = new Grid()
      .row('lane', 200, 240, 36)
      .cell('lane', 0, 236, 80)
      .cell('lane', 0, 330, 80)
      .cell('lane', 2, 236, 80)
      .cell('lane', 2, 330, 80)
      .gaps(4)

    const path = route(() =>
      buildOverheadRailPath(
        grid.find('lane', 0, 330),
        grid.find('lane', 2, 330),
        grid.root,
      ),
    )

    // Forward run, so the blocked source leaves by its RIGHT gutter and the
    // blocked target is met on its LEFT — the route never doubles back, and
    // neither vertical leg crosses the sub-cell stacked above.
    expect(path).toEqual([
      [columnRight(0), 370],
      [gapCenter(0), 370],
      [gapCenter(0), 218],
      [gapCenter(1), 218],
      [gapCenter(1), 370],
      [columnLeft(2) - ARROW_CHEVRON_SIZE, 370],
    ])
  })
})

describe('wrap column legs', () => {
  function legGrid() {
    return new Grid()
      .row('lane', 200, 240, 0)
      .cell('lane', 1, 236, 80)
      .cell('lane', 1, 330, 80)
      .gaps(4)
  }

  it('sends a backward wrap out of the left gutter', () => {
    const grid = legGrid()
    const leg = runArrowMeasurementPass(() =>
      buildWrapColumnLeg(
        grid.find('lane', 1, 330),
        grid.root,
        180,
        'exit',
        'above',
      ),
    )
    expect(leg?.map((p) => Math.round(p.x))).toEqual([
      columnLeft(1),
      gapCenter(0),
      gapCenter(0),
    ])
  })

  it('mirrors that for a forward rail', () => {
    const grid = legGrid()
    const leg = runArrowMeasurementPass(() =>
      buildWrapColumnLeg(
        grid.find('lane', 1, 330),
        grid.root,
        180,
        'exit',
        'above',
        'forward',
      ),
    )
    expect(leg?.map((p) => Math.round(p.x))).toEqual([
      columnRight(1),
      gapCenter(1),
      gapCenter(1),
    ])
  })
})

describe('cross-lane forward', () => {
  /** Two lanes; the connector runs from `from` on top to `to` underneath. */
  function crossGrid(options: {
    sourceRowFilled: boolean
    targetRowFilled: boolean
  }) {
    const grid = new Grid()
      .row('upper', 100, 100)
      .cell('upper', 0, 120, 60)
      .row('lower', 300, 100)
      .cell('lower', 2, 320, 60)
      .gaps(4)
    if (options.sourceRowFilled) grid.cell('upper', 1, 120, 60)
    if (options.targetRowFilled) grid.cell('lower', 1, 320, 60)
    return grid
  }

  it('drops late when the source row is clear across the skip', () => {
    const grid = crossGrid({ sourceRowFilled: false, targetRowFilled: true })
    const path = route(() =>
      buildCrossLayerForwardArrowPath(
        grid.find('upper', 0),
        grid.find('lower', 2),
        grid.root,
      ),
    )
    expect(path).toHaveLength(4)
    expect(path[0]).toEqual([columnRight(0), 150])
    // The whole run stays on the source row until the gap BEFORE the target.
    expect(path[1]![1]).toBe(150)
    expect(path[1]![0]).toBeGreaterThan(columnRight(1))
    expect(path[1]![0]).toBeLessThan(columnLeft(2))
    expect(path[2]).toEqual([path[1]![0], 350])
    expect(path[3]).toEqual([columnLeft(2) - ARROW_CHEVRON_SIZE, 350])
  })

  it('drops early when the source row carries the columns it skips', () => {
    const grid = crossGrid({ sourceRowFilled: true, targetRowFilled: false })
    expect(
      route(() =>
        buildCrossLayerForwardArrowPath(
          grid.find('upper', 0),
          grid.find('lower', 2),
          grid.root,
        ),
      ),
    ).toEqual([
      [columnRight(0), 150],
      [gapCenter(0), 150],
      [gapCenter(0), 350],
      [columnLeft(2) - ARROW_CHEVRON_SIZE, 350],
    ])
  })

  it('crosses above the target lane when both rows are occupied', () => {
    const grid = crossGrid({ sourceRowFilled: true, targetRowFilled: true })
    const path = route(() =>
      buildCrossLayerForwardArrowPath(
        grid.find('upper', 0),
        grid.find('lower', 2),
        grid.root,
      ),
    )
    expect(path).toHaveLength(6)
    expect(path[0]).toEqual([columnRight(0), 150])
    expect(path[1]).toEqual([gapCenter(0), 150])
    // The long leg leaves the rows entirely — above every card in the target
    // lane, and clear of the source lane's own cards.
    expect(path[2]![1]).toBeLessThan(320)
    expect(path[2]![1]).toBeGreaterThan(180)
    expect(path[3]).toEqual([gapCenter(1), path[2]![1]])
    expect(path[4]).toEqual([gapCenter(1), 350])
    expect(path[5]).toEqual([columnLeft(2) - ARROW_CHEVRON_SIZE, 350])
  })
})
