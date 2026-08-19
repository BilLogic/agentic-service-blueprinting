import type { Point } from '@/lib/blueprintArrowGeometry'

/**
 * Anchor slots and confluence — the routing contract's endpoint half.
 *
 * Every arrow today derives its own endpoints from the two cells it joins,
 * knowing nothing about the other arrows touching those cells. That is the
 * root of three separate symptoms the eye reads as "the arrows are wrong":
 *
 *   - a cell's inbound and outbound arrow anchor at the same edge midpoint,
 *     so you cannot tell a line passing through from an in-and-out pair;
 *   - N sources converging on one target draw N heads at one point;
 *   - two backward loops on one lane share a corridor and overlap along it.
 *
 * All three are allocation problems, not drawing problems: they need one
 * pass that sees every endpoint on a cell at once. This module is that pass.
 * It is pure — boxes in, anchor points out — so it is testable without a
 * DOM, and the path builders keep owning how a run gets from A to B.
 *
 * Determinism is a hard requirement, not a nicety. Slot order comes from the
 * caller's `sortKey`, never from Map iteration or DOM query order, so the
 * same blueprint always draws the same picture — otherwise a screenshot
 * regression suite is worthless and two viewers of the same board disagree.
 *
 * See docs/plans/2026-08-17-003-feat-trigger-line-anatomy-plan.md §1–§2.
 */

export type Side = 'left' | 'right' | 'top' | 'bottom'
export type Direction = 'in' | 'out'

/** The box an anchor sits on. Same shape the geometry module measures. */
export type AnchorBox = {
  left: number
  right: number
  top: number
  bottom: number
}

export type SlotRequest = {
  /** Unique per endpoint. A trigger contributes two: its out and its in. */
  id: string
  cellId: string
  direction: Direction
  /** Where this endpoint would go if nothing else competed for the edge. */
  preferredSide: Side
  /**
   * Ordering within a side. The caller supplies target column then path
   * order, so slots read left-to-right / top-to-bottom in the same order the
   * reader scans. Ties break on `id`, which keeps it total.
   */
  sortKey: number
}

export type SlotAssignment = {
  id: string
  cellId: string
  direction: Direction
  /** May differ from `preferredSide` when separation forced a move. */
  side: Side
  /** 0-based position among the endpoints sharing this cell+side. */
  index: number
  /** How many endpoints share this cell+side, including this one. */
  count: number
  /** True when this endpoint was moved off its preferred side. */
  displaced: boolean
}

/** The side an endpoint falls back to when its preferred side is taken. */
const FALLBACK: Record<Side, Side> = {
  left: 'top',
  right: 'bottom',
  top: 'left',
  bottom: 'right',
}

function ordered(requests: readonly SlotRequest[]): SlotRequest[] {
  return [...requests].sort(
    (a, b) => a.sortKey - b.sortKey || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
}

/**
 * Allocate a slot for every endpoint.
 *
 * The invariant is separation, and side preference is only the tiebreak: on
 * a cell where an inbound and an outbound both want one side, the OUTBOUND
 * moves. Outbound moves rather than inbound because a head carries more
 * meaning than a tail — the reader follows arrows to where they land, so the
 * arrival keeps the side that faces its source.
 *
 * A cell whose endpoints all point the same way is left alone: two inbounds
 * on one side is not a collision, it is a confluence, and they get adjacent
 * slots so the trunk can gather them.
 */
export function allocateAnchorSlots(
  requests: readonly SlotRequest[],
): Map<string, SlotAssignment> {
  const byCell = new Map<string, SlotRequest[]>()
  for (const request of requests) {
    const list = byCell.get(request.cellId)
    if (list) list.push(request)
    else byCell.set(request.cellId, [request])
  }

  const out = new Map<string, SlotAssignment>()
  // Cell order is fixed too: a Map preserves insertion, but insertion here
  // follows the caller's array, which the caller sorts.
  for (const [cellId, cellRequests] of byCell) {
    const sides = new Map<Side, { request: SlotRequest; displaced: boolean }[]>()
    const claimed = new Map<Side, Direction>()

    for (const request of ordered(cellRequests)) {
      let side = request.preferredSide
      let displaced = false
      const holder = claimed.get(side)
      if (holder !== undefined && holder !== request.direction) {
        // Contested by the opposite direction: the outbound yields.
        if (request.direction === 'out') {
          side = FALLBACK[side]
          displaced = true
        } else {
          // An inbound arriving at a side an outbound already holds pushes
          // the outbound off instead, so arrivals always keep their side.
          const evicted = sides.get(side) ?? []
          const stays = evicted.filter((entry) => {
            if (entry.request.direction !== 'out') return true
            const moved = FALLBACK[side]
            const bucket = sides.get(moved) ?? []
            bucket.push({ request: entry.request, displaced: true })
            sides.set(moved, bucket)
            return false
          })
          sides.set(side, stays)
        }
      }
      const bucket = sides.get(side) ?? []
      bucket.push({ request, displaced })
      sides.set(side, bucket)
      claimed.set(side, request.direction)
    }

    for (const [side, entries] of sides) {
      const sorted = entries.sort(
        (a, b) =>
          a.request.sortKey - b.request.sortKey ||
          (a.request.id < b.request.id ? -1 : 1),
      )
      sorted.forEach((entry, index) => {
        out.set(entry.request.id, {
          id: entry.request.id,
          cellId,
          direction: entry.request.direction,
          side,
          index,
          count: sorted.length,
          displaced: entry.displaced,
        })
      })
    }
  }
  return out
}

/**
 * The point on the box for an assignment.
 *
 * Slots divide the edge into `count + 1` intervals so the first and last
 * never sit on a corner, where a chevron would read as belonging to the
 * adjacent edge. A lone endpoint therefore lands on the midpoint, which is
 * exactly where arrows anchor today — so a board with no contested edges
 * draws identically to before, and this change is visible only where it
 * fixes something.
 */
export function anchorPointFor(
  box: AnchorBox,
  assignment: Pick<SlotAssignment, 'side' | 'index' | 'count'>,
): Point {
  const t = (assignment.index + 1) / (assignment.count + 1)
  switch (assignment.side) {
    case 'left':
      return { x: box.left, y: box.top + (box.bottom - box.top) * t }
    case 'right':
      return { x: box.right, y: box.top + (box.bottom - box.top) * t }
    case 'top':
      return { x: box.left + (box.right - box.left) * t, y: box.top }
    case 'bottom':
      return { x: box.left + (box.right - box.left) * t, y: box.bottom }
  }
}

export type Confluence = {
  /** Stable id built from the members, so React keys survive a re-measure. */
  id: string
  targetCellId: string
  side: Side
  /** Endpoint ids that merge, in slot order. */
  memberIds: string[]
}

/**
 * Group same-side arrivals into trunks.
 *
 * Two arrows landing on one side of one cell should merge and wear a single
 * head — the reader is being told "these all cause that", which is one fact,
 * not N. Opposite-side arrivals are left alone: they approach from different
 * places and merging them would invent a route that does not exist.
 *
 * A group of one is not a confluence and is omitted, so callers can treat a
 * hit as "draw the trunk" without a size check.
 */
export function planConfluences(
  assignments: Iterable<SlotAssignment>,
): Confluence[] {
  const groups = new Map<string, SlotAssignment[]>()
  for (const assignment of assignments) {
    if (assignment.direction !== 'in') continue
    const key = `${assignment.cellId}:${assignment.side}`
    const list = groups.get(key)
    if (list) list.push(assignment)
    else groups.set(key, [assignment])
  }

  const out: Confluence[] = []
  for (const [key, members] of groups) {
    if (members.length < 2) continue
    const sorted = members.sort((a, b) => a.index - b.index)
    const [targetCellId, side] = [
      sorted[0].cellId,
      sorted[0].side,
    ]
    out.push({
      id: `confluence:${key}`,
      targetCellId,
      side,
      memberIds: sorted.map((member) => member.id),
    })
  }
  // Deterministic across runs regardless of Map insertion.
  return out.sort((a, b) => (a.id < b.id ? -1 : 1))
}
