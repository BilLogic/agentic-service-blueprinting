// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  findScrollableRegions,
  hasScrollableRegion,
  scrollableAncestorCanConsume,
} from '@/lib/canvasScrollRegions'

/**
 * jsdom has no layout, so the three numbers the determination reads are
 * stamped on by hand. That is the whole DOM dependency — everything else
 * under test is arithmetic over them.
 */
function stampBox(
  element: HTMLElement,
  box: {
    scrollHeight?: number
    clientHeight?: number
    scrollWidth?: number
    clientWidth?: number
    scrollTop?: number
    scrollLeft?: number
  },
) {
  for (const [key, value] of Object.entries(box)) {
    Object.defineProperty(element, key, { value, writable: true })
  }
}

/** Viewport → grid (overflowing) → row → cell, the shape the board renders. */
function buildBoard(options?: { overflowing?: boolean }) {
  const container = document.createElement('div')
  const grid = document.createElement('div')
  const row = document.createElement('div')
  const cell = document.createElement('button')
  grid.style.overflowY = 'auto'
  grid.style.overflowX = 'auto'
  container.append(grid)
  grid.append(row)
  row.append(cell)
  document.body.append(container)
  stampBox(grid, {
    clientHeight: 400,
    scrollHeight: options?.overflowing === false ? 400 : 1200,
    clientWidth: 600,
    scrollWidth: 600,
    scrollTop: 0,
    scrollLeft: 0,
  })
  return { container, grid, row, cell }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('findScrollableRegions', () => {
  it('finds the grid the board renders several levels inside the canvas', () => {
    const { container, grid, cell } = buildBoard()
    const regions = findScrollableRegions(cell, container)
    expect(regions.map((region) => region.element)).toEqual([grid])
    expect(regions[0]).toMatchObject({ scrollsY: true, scrollsX: false })
  })

  it('ignores an overflow that scrolls nothing', () => {
    const { container, cell } = buildBoard({ overflowing: false })
    expect(findScrollableRegions(cell, container)).toEqual([])
  })

  it('never treats the viewport itself as a region', () => {
    const { container } = buildBoard()
    container.style.overflowY = 'auto'
    stampBox(container, { clientHeight: 100, scrollHeight: 900 })
    expect(findScrollableRegions(container, container)).toEqual([])
  })

  it('walks past a plain wrapper and stops at the container', () => {
    const { container, grid, cell } = buildBoard()
    const outside = document.createElement('div')
    outside.style.overflowY = 'auto'
    stampBox(outside, { clientHeight: 10, scrollHeight: 900 })
    outside.append(container)
    document.body.append(outside)
    expect(findScrollableRegions(cell, container).map((r) => r.element)).toEqual(
      [grid],
    )
  })
})

describe('wheel and touch agree on what counts as scrollable', () => {
  /*
   * The divergence this pins: the wheel path handed its delta to the grid
   * while the touch path prevented every move in the same subtree, so the
   * clipped rows were reachable with a trackpad and unreachable with a
   * finger. One determination, two consumers — asserted on the same node.
   */
  it('gives a finger and a wheel the same answer over an overflowing grid', () => {
    const { container, cell } = buildBoard()
    expect(hasScrollableRegion(cell, container)).toBe(true)
    expect(scrollableAncestorCanConsume(cell, container, 0, 40)).toBe(true)
  })

  it('gives them the same answer over plain canvas', () => {
    const { container, cell } = buildBoard({ overflowing: false })
    expect(hasScrollableRegion(cell, container)).toBe(false)
    expect(scrollableAncestorCanConsume(cell, container, 0, 40)).toBe(false)
  })
})

describe('scrollableAncestorCanConsume', () => {
  it('chains to the camera once the region is at its end', () => {
    const { container, grid, cell } = buildBoard()
    stampBox(grid, { scrollTop: 800 }) // scrollHeight 1200, clientHeight 400
    expect(scrollableAncestorCanConsume(cell, container, 0, 40)).toBe(false)
    // Upward still belongs to the grid.
    expect(scrollableAncestorCanConsume(cell, container, 0, -40)).toBe(true)
  })

  it('answers per axis, so a vertical list never eats a sideways pan', () => {
    const { container, cell } = buildBoard()
    expect(scrollableAncestorCanConsume(cell, container, 40, 0)).toBe(false)
    expect(scrollableAncestorCanConsume(cell, container, 0, 40)).toBe(true)
  })
})
