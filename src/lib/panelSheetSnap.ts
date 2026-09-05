/**
 * Where the phone's panel sheet comes to rest.
 *
 * NOT "the cell sheet". `PanelDrawerShell` is also `EntityDetailPanel`'s shell,
 * so lane, phase, scenario and step wear these stops too. Naming it for the
 * cell panel — its biggest consumer, not its owner — is how the lane panel ends
 * up with different physics from the cell panel by accident (#133).
 *
 * TWO STOPS, AND NO FULL ONE. Three was the shape the issue asked for and the
 * wrong one:
 *
 * - A 100% stop is contested by decisions that came after that issue.
 *   `MobileAgentSheet` records "a little over half the screen, so the canvas
 *   stays visible behind it (92svh read as a full-screen takeover)", and the
 *   mobile shell's governing model is a live canvas under non-modal sheets. A
 *   sheet that covers the board stops being an inspector.
 * - It also could not have worked. The vendored popup carries
 *   `--drawer-content-max-height: calc(100dvh - 6rem)` on the y axis, so a
 *   snap point of `1` asks for a height the element is capped 96px below. The
 *   drag travels the whole way and the sheet stops short. Both stops here sit
 *   under that ceiling on any plausible viewport, so the cap never binds.
 *
 * 0.7 is the height the sheet already shipped with (`max-h-[70svh]`), so the
 * taller stop is today's behaviour rather than a new claim about how tall is
 * too tall.
 *
 * FRACTIONS, NOT `svh`. The issue's recommendation says `['40svh','70svh']` and
 * that cannot work: `resolveSnapPointValue` in base-ui's
 * `useDrawerSnapPoints.mjs` handles `px` and `rem` and returns `null` for
 * anything else, so an `svh` stop is silently unresolvable and the sheet sits
 * at its capped full height. Verified by shipping it: the sheet opened at ~88%
 * with `--drawer-snap-point-offset: 0px`. A fraction of viewport height is what
 * `svh` meant, and it is the form the primitive actually reads.
 */
export const PANEL_SHEET_SNAP_POINTS: (number | string)[] = [0.4, 0.7]

/**
 * Opens low. One drag reaches the top stop.
 *
 * The opposite of the shipped behaviour, deliberately: the sheet used to be
 * content-sized and capped, which meant a long cell filled 70svh unasked. It
 * now opens at 40svh whatever the cell holds, so the board stays readable and
 * the reader chooses to commit. That trade — content-sized for stop-sized — is
 * the one the issue flagged as a product decision, and this is the side it was
 * decided on.
 */
export const PANEL_SHEET_DEFAULT_SNAP = PANEL_SHEET_SNAP_POINTS[0]

/**
 * The stop the reader last settled on, for as long as this visit lasts.
 *
 * Module state rather than storage, and deliberately not exported as a mutable
 * binding: the two functions below are the whole surface, so nothing can read
 * a stale copy or write a value that is not one of the stops.
 */
let remembered: number | string | null = null

/** The stop a sheet should open at: the last one used, or the default. */
export function rememberedSheetSnap(): number | string {
  return remembered ?? PANEL_SHEET_DEFAULT_SNAP
}

/**
 * Record where a sheet came to rest.
 *
 * Ignores anything that is not one of the stops. `onSnapPointChange` fires with
 * whatever the primitive resolved, and a value outside the list would be
 * remembered forever and handed back as a controlled `snapPoint` the primitive
 * would then reject.
 */
export function rememberSheetSnap(point: number | string): void {
  if (!PANEL_SHEET_SNAP_POINTS.includes(point)) return
  remembered = point
}

/** Test seam. Nothing in the app calls this. */
export function resetSheetSnapMemory(): void {
  remembered = null
}
