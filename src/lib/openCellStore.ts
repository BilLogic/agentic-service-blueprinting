import { useSyncExternalStore } from 'react'

/**
 * Which cell the detail panel is showing, as a module-level fact.
 *
 * The panel's selection lives in `BlueprintCellDetailProvider`, mounted deep
 * under the canvas; the URL is written by `ViewStateProvider`, mounted above
 * the whole shell. They share no provider, so the open cell reaches the URL the
 * same way compare state reaches the menubar — module store +
 * `useSyncExternalStore` (see `compareReviewStore`, `CanvasModeProvider`).
 *
 * Why the URL needs it at all: `?cell=` is the share link. A person who opens a
 * cell and copies the address bar should hand over the cell, not the homepage —
 * the same link the agent builds when it cites that cell.
 *
 * Deliberately just the id. The panel can show a tech pill inside a cell, a
 * draft, or the compare ledger; none of those are a stable thing to link to.
 */

let openCellId: string | null = null

const listeners = new Set<() => void>()

export function subscribeOpenCell(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getOpenCellId(): string | null {
  return openCellId
}

/** The one write path. Null when the panel closes or shows no single cell. */
export function setOpenCellId(cellId: string | null): void {
  if (openCellId === cellId) return
  openCellId = cellId
  for (const listener of listeners) listener()
}

export function useOpenCellId(): string | null {
  return useSyncExternalStore(subscribeOpenCell, getOpenCellId)
}
