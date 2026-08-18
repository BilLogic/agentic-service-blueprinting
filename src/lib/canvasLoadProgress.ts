export type CanvasLoadStage = {
  /** Shown while this is the earliest stage still loading. */
  label: string
  done: boolean
}

/** The bar never reads as parked at zero. */
const FLOOR_PERCENT = 8

/** Fraction of stages complete, floored — pure so a unit test can pin it. */
export function loadProgressPercent(stages: CanvasLoadStage[]): number {
  if (stages.length === 0) return FLOOR_PERCENT
  const done = stages.filter((stage) => stage.done).length
  return Math.max(FLOOR_PERCENT, Math.round((done / stages.length) * 100))
}

/**
 * Percent from REAL completed work units (network requests settled over
 * requests issued), floored the same way. Callers with per-request counts
 * pass these instead of stage booleans, so the bar's movement is actual
 * fetch completion — never a timer.
 */
export function loadProgressUnitPercent(loaded: number, total: number): number {
  if (total <= 0) return FLOOR_PERCENT
  const clamped = Math.min(Math.max(loaded, 0), total)
  return Math.max(FLOOR_PERCENT, Math.round((clamped / total) * 100))
}

/** The earliest not-done stage names the work; all done → last label. */
export function loadProgressLabel(stages: CanvasLoadStage[]): string {
  return (
    stages.find((stage) => !stage.done)?.label ??
    stages[stages.length - 1]?.label ??
    ''
  )
}
