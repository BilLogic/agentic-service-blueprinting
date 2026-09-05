/**
 * The camera's two derived policies, as pure functions.
 *
 * These lived inline in `ServiceOverviewView` and were "tested" by asserting
 * that the component's source text contained certain literals — which passes
 * whatever those lines end up doing, and fails on a reformat. Both decisions
 * are small, total, and worth pinning by behaviour, so they live here.
 */

/**
 * Floor for the phone's fit-to-view zoom — 3x the phone's own semantic
 * threshold, so the frame the reader lands on always has cell text in it with
 * room to pinch out before the text goes. Roughly half a phase board across on
 * a 390px screen.
 */
export const MOBILE_MIN_FIT_ZOOM = 0.45

/**
 * Where the phone's cells give up their text. Lower than the desktop 0.25
 * because a phone has ~3 device pixels per CSS pixel: at 0.15 the blurbs are
 * small but still ink on the screen, and a reader who pinches out to see where
 * they are keeps something to read. At 0.25 the whole board went blank the
 * moment they zoomed out at all, which reads as "this blueprint has no
 * content" rather than "you are too far out".
 */
export const MOBILE_SEMANTIC_ZOOM_THRESHOLD = 0.15

/**
 * A focused comparison is intentionally wider/taller than one blueprint. Its
 * fitted destination commonly lands below the overview's 0.25 density cutoff
 * even though the comparison is the thing the reader explicitly opened. Keep
 * its cell content present until 0.12; manual zoom-out can still cross into
 * the density-map tier, while the programmatic comparison landing no longer
 * looks like an empty board.
 */
export const COMPARE_SEMANTIC_ZOOM_THRESHOLD = 0.12

export type CanvasCameraSurface = {
  /** The phone shell, which has its own floor and threshold. */
  mobileShell: boolean
  /** True while a phase or scenario is the camera target. */
  isDetail: boolean
  /** How many path variants the focused scope is showing. */
  selectedPathCount: number
}

/**
 * The zoom below which cells drop their text for the density map.
 *
 * `undefined` means "use the viewport's own default" — the desktop 0.25.
 * The phone's threshold wins outright; a focused comparison only lowers the
 * desktop one, and only while it is actually comparing.
 */
export function getSemanticZoomThreshold(
  surface: CanvasCameraSurface,
): number | undefined {
  if (surface.mobileShell) return MOBILE_SEMANTIC_ZOOM_THRESHOLD
  if (surface.isDetail && surface.selectedPathCount > 1) {
    return COMPARE_SEMANTIC_ZOOM_THRESHOLD
  }
  return undefined
}

/** The phone's fit floor; desktop keeps the true fit. */
export function getMinFitZoom(
  surface: Pick<CanvasCameraSurface, 'mobileShell'>,
): number | undefined {
  return surface.mobileShell ? MOBILE_MIN_FIT_ZOOM : undefined
}

/**
 * The part of the camera's reset key that a FOCUSED comparison owns.
 *
 * Path selection is a filter at the overview and does not move the camera —
 * but inside a focused scenario it changes the target's geometry, so it is a
 * camera-layout event and the viewport eases to the new fit rather than
 * letting a ResizeObserver snap there afterwards. `'stable'` for everything
 * else is what keeps a path toggle from throwing away the reader's pan and
 * zoom at the overview.
 */
export function getFocusedComparisonCameraKey(input: {
  isFocusedScenario: boolean
  selectedPathIds: readonly string[]
  displayViewType: string
}): string {
  if (!input.isFocusedScenario) return 'stable'
  return `${input.selectedPathIds.join(',')}:${input.displayViewType}`
}
