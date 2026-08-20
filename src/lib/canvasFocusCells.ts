/**
 * The single cell-focus pipeline's bridge: `useZoomPanViewport` owns the
 * camera (fly + pulse), but its callers — the portalled difference-ledger
 * drawer, the divergence strip, agent commands — live outside the
 * viewport's React tree. The viewport registers its `focusCells` here,
 * keyed by the focused scenario's slide id; callers resolve AT CALL TIME
 * so a re-mounted viewport is never driven through a stale closure.
 */

export type FocusCellsResult =
  | { kind: 'flown'; completion: 'completed' | 'cancelled' | 'superseded' }
  | { kind: 'miss'; missing: string[] }

export type FocusCellsFn = (
  cellIds: string[],
  opts?: { animate?: boolean },
) => FocusCellsResult | Promise<FocusCellsResult>

const registry = new Map<string, FocusCellsFn>()
let activeFocusCells: FocusCellsFn | null = null

export function registerFocusCells(
  key: string,
  focusCells: FocusCellsFn,
): () => void {
  registry.set(key, focusCells)
  return () => {
    if (registry.get(key) === focusCells) registry.delete(key)
  }
}

/** Null when no viewport currently serves that scenario. */
export function resolveFocusCells(key: string): FocusCellsFn | null {
  return registry.get(key) ?? null
}

export function registerActiveFocusCells(focusCells: FocusCellsFn): () => void {
  activeFocusCells = focusCells
  return () => {
    if (activeFocusCells === focusCells) activeFocusCells = null
  }
}

export function resolveActiveFocusCells(): FocusCellsFn | null {
  return activeFocusCells
}

const PULSE_ATTRIBUTE = 'data-blueprint-cell-pulse'
const PULSE_DURATION_MS = 1300

let pulseGeneration = 0

/**
 * Brief emphasis ring on cells (counterpart highlight after a fly-to).
 * Pure attribute toggling — the animation itself lives in blueprint.css,
 * where `prefers-reduced-motion` reduces it to a static ring.
 */
export function pulseBlueprintCells(elements: readonly HTMLElement[]): void {
  const generation = ++pulseGeneration
  for (const element of elements) {
    // Retrigger cleanly when a pulse is already running.
    element.removeAttribute(PULSE_ATTRIBUTE)
    // Force a style flush so removing+re-adding restarts the animation.
    void element.offsetWidth
    element.setAttribute(PULSE_ATTRIBUTE, '')
  }
  window.setTimeout(() => {
    if (generation !== pulseGeneration) return
    for (const element of elements) element.removeAttribute(PULSE_ATTRIBUTE)
  }, PULSE_DURATION_MS)
}
