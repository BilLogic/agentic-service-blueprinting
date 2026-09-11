/**
 * The single cell-focus pipeline's bridge: `useZoomPanViewport` owns the
 * camera (fly + pulse), but its callers — the portalled difference-ledger
 * drawer, the divergence strip, agent commands, presentation cell badges —
 * live outside the viewport's React tree. The viewport registers its
 * `focusCells` here, keyed by the focused scenario's slide id or by a
 * slice-stable key; callers resolve AT CALL TIME so a re-mounted viewport
 * is never driven through a stale closure.
 *
 * A slice tab is addressed by the slice alone, so a badge that wants a
 * cell cannot put that cell on the tab. It leaves a pending focus under
 * the slice key; `registerFocusCells` consumes it when the viewport that
 * can fly exists.
 */

export type FocusCellsResult =
  | { kind: 'flown'; completion: 'completed' | 'cancelled' | 'superseded' }
  | { kind: 'miss'; missing: string[] }

export type FocusCellsFn = (
  cellIds: string[],
  opts?: { animate?: boolean },
) => FocusCellsResult | Promise<FocusCellsResult>

const registry = new Map<string, FocusCellsFn>()
const pendingByKey = new Map<string, string[]>()
let activeFocusCells: FocusCellsFn | null = null

/**
 * Registry key for a slice tab's `focusCells`. Stable for the slice, not
 * the scenario it happens to sit on — a pending focus has to name the
 * viewport that will exist once the tab mounts.
 *
 * @param sliceId - The slice whose tab owns the camera.
 */
export function sliceFocusCellsKey(sliceId: string): string {
  return `slice:${sliceId}`
}

/**
 * Ask a slice tab's viewport to fly to these cells.
 *
 * If that viewport is already registered, it flies now. Otherwise the
 * request is stored and {@link registerFocusCells} consumes it when the
 * viewport appears — a slice tab's address carries no cell, so this is
 * session state rather than part of the tab descriptor.
 *
 * @param sliceId - The slice whose tab should receive the focus.
 * @param cellIds - Cells to bring into view, in the order `focusCells` reads them.
 */
export function requestSliceCellFocus(
  sliceId: string,
  cellIds: string[],
): void {
  const key = sliceFocusCellsKey(sliceId)
  const ids = [...cellIds]
  const focusCells = registry.get(key)
  if (focusCells) {
    pendingByKey.delete(key)
    void focusCells(ids)
    return
  }
  pendingByKey.set(key, ids)
}

/**
 * Drop stored pending focuses. Tests call this between cases so a request
 * that never met a viewport cannot leak into the next one.
 */
export function clearPendingSliceCellFocus(): void {
  pendingByKey.clear()
}

/**
 * Register this viewport's `focusCells` under `key`. If a pending slice
 * focus is waiting for that key, it flies immediately — that is how a
 * presentation badge lands after the slice tab mounts.
 *
 * @param key - Scenario slide id, or {@link sliceFocusCellsKey} for a slice tab.
 * @param focusCells - The live viewport's fly-to-cell function.
 */
export function registerFocusCells(
  key: string,
  focusCells: FocusCellsFn,
): () => void {
  registry.set(key, focusCells)
  const pending = pendingByKey.get(key)
  if (pending) {
    pendingByKey.delete(key)
    void focusCells(pending)
  }
  return () => {
    if (registry.get(key) === focusCells) registry.delete(key)
  }
}

/** Null when no viewport currently serves that key. */
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
