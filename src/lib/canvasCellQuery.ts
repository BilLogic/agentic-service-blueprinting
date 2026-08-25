/**
 * Reading cell ids off the rendered grid.
 *
 * Bulk selection (a lane, a column, select-all) needs the cells in **grid
 * reading order**, and the DOM already holds that ordering exactly: lane rows
 * carry `data-lane-id`, cells carry `data-step-index`, and both are laid out
 * in the order they are read.
 *
 * Deriving it here rather than threading cell arrays down through the grid
 * keeps the selection out of the render path — the grid's job is drawing, and
 * it already knows nothing about slices.
 */

const CELL_SELECTOR = '[data-blueprint-cell][data-blueprint-cell-interactive]'

/** The mounted canvas. Tabs unmount on switch, so at most one exists. */
function canvasRoot(): ParentNode | null {
  return document.querySelector('[data-zoom-pan-root]')
}

function cellId(element: Element): string | null {
  return element.getAttribute('data-blueprint-cell')
}

function stepIndex(element: Element): number {
  const raw = element.getAttribute('data-step-index')
  const parsed = raw === null ? Number.NaN : Number.parseInt(raw, 10)
  // Cells with no step index sort last rather than scrambling the order.
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed
}

/** Unique ids in the order given, dropping anything unidentifiable. */
function toIds(elements: Element[]): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const element of elements) {
    const id = cellId(element)
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

/** One lane, left to right — the order the lane is read in. */
export function cellsInLane(laneId: string): string[] {
  const root = canvasRoot()
  if (!root) return []
  return toIds(
    Array.from(
      root.querySelectorAll(`[data-blueprint-row][data-lane-id="${CSS.escape(laneId)}"] ${CELL_SELECTOR}`),
    ),
  )
}

/** One column, top to bottom — lane order is DOM order. */
export function cellsInColumn(stepIndexValue: number): string[] {
  const root = canvasRoot()
  if (!root) return []
  return toIds(
    Array.from(root.querySelectorAll(CELL_SELECTOR)).filter(
      (element) => stepIndex(element) === stepIndexValue,
    ),
  )
}

/**
 * Every cell, in reading order: columns left to right, and within a column,
 * lanes top to bottom. DOM order is lane-major, so it is re-sorted by step —
 * a stable sort keeps lane order intact inside each column.
 */
export function allCellsInReadingOrder(): string[] {
  const root = canvasRoot()
  if (!root) return []
  const elements = Array.from(root.querySelectorAll(CELL_SELECTOR))
  const withOrder = elements.map((element, index) => ({ element, index }))
  withOrder.sort(
    (left, right) =>
      stepIndex(left.element) - stepIndex(right.element) ||
      left.index - right.index,
  )
  return toIds(withOrder.map((entry) => entry.element))
}

/**
 * A cell's visible text and lane, read off the rendered grid.
 *
 * The composer needs to name cells, and the id is the only handle a selection
 * carries. Rows labelled `040103` were the single worst thing about the first
 * editor — this is what replaces them.
 */
export function describeCell(id: string): { label: string; lane: string } {
  const root = canvasRoot()
  const element = root?.querySelector(
    `[data-blueprint-cell="${CSS.escape(id)}"]`,
  )
  if (!element) return { label: 'Cell', lane: '' }

  // Overlays live *inside* the cell button, so `textContent` swallows them:
  // the pick badge turned "Field Crew" into "1Field Crew", and a lane of
  // tech pills into "2Slack2Email2Phone". Clone and strip them rather than
  // regexing digits off the front — a cell whose text genuinely starts with a
  // number is a real cell, and stripping it would be a worse bug than the one
  // being fixed.
  const clone = element.cloneNode(true) as Element
  clone
    .querySelectorAll('[data-slice-pick-badge], [data-slice-sequence-badge]')
    .forEach((badge) => badge.remove())

  const label = (clone.textContent ?? '').trim().replace(/\s+/g, ' ')
  const row = element.closest('[data-blueprint-row][data-lane-name]')

  return {
    label: label.length > 0 ? label : 'Untitled cell',
    lane: row?.getAttribute('data-lane-name') ?? '',
  }
}
