/**
 * The keyboard's half of the camera.
 *
 * Two decisions, both pure, both feeding the pan primitive the pointer and
 * the agent already share (`panBy`) rather than a second camera model:
 *
 * - which key press is a pan, and how far;
 * - how far the camera must move to bring a focused cell on screen.
 *
 * The second exists because the viewport is transform-based and hides its
 * overflow, so the browser's own `scrollIntoView` on focus has nothing to
 * scroll — a keyboard reader tabbing across a board of hundreds of cells
 * landed on cells nobody could see, with no indication of where they were.
 */

/**
 * One arrow press, in screen pixels. About a cell and a half at 100% zoom:
 * far enough that holding a key crosses a board quickly, short enough that a
 * single press is a nudge rather than a jump-cut.
 */
export const KEYBOARD_PAN_STEP_PX = 80

/** Shift makes it a stride, the way Shift+arrow does in every canvas tool. */
export const KEYBOARD_PAN_STRIDE_MULTIPLIER = 4

/** Breathing room around a cell the camera has just revealed. */
export const FOCUS_REVEAL_MARGIN_PX = 48

export type KeyboardPanInput = {
  key: string
  shiftKey: boolean
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
}

export type CameraPanDelta = { dx: number; dy: number }

const ARROW_DIRECTIONS: Record<string, CameraPanDelta> = {
  // The camera moves OPPOSITE the content: ArrowRight looks right, which
  // slides the board left. Same sign convention the wheel pan uses.
  ArrowLeft: { dx: 1, dy: 0 },
  ArrowRight: { dx: -1, dy: 0 },
  ArrowUp: { dx: 0, dy: 1 },
  ArrowDown: { dx: 0, dy: -1 },
}

/**
 * The pan a key press asks for, or null when the press is not ours.
 *
 * Modified arrows are left alone on purpose: ⌘/Ctrl+arrow is a system and
 * app-level navigation, and Alt+arrow is browser history.
 */
export function resolveKeyboardPan(
  input: KeyboardPanInput,
): CameraPanDelta | null {
  if (input.metaKey || input.ctrlKey || input.altKey) return null
  const direction = ARROW_DIRECTIONS[input.key]
  if (!direction) return null
  const step =
    KEYBOARD_PAN_STEP_PX *
    (input.shiftKey ? KEYBOARD_PAN_STRIDE_MULTIPLIER : 1)
  return { dx: direction.dx * step, dy: direction.dy * step }
}

export type ViewportRect = {
  left: number
  top: number
  width: number
  height: number
}

/**
 * How far to pan so `target` sits inside `viewport`, in screen pixels.
 *
 * `{0, 0}` when it already does — a camera that twitches on every tab stop is
 * worse than one that never moves. A target too big for the viewport anchors
 * its top-left corner instead of centring, so the reader starts at the cell's
 * beginning; that is the same choice `computeFitTransform` makes when its
 * zoom floor pushes content off screen.
 */
export function computeFocusRevealPan(
  target: ViewportRect,
  viewport: ViewportRect,
  margin = FOCUS_REVEAL_MARGIN_PX,
): CameraPanDelta {
  return {
    dx: revealAxis(
      target.left,
      target.width,
      viewport.left,
      viewport.width,
      margin,
    ),
    dy: revealAxis(
      target.top,
      target.height,
      viewport.top,
      viewport.height,
      margin,
    ),
  }
}

function revealAxis(
  targetStart: number,
  targetSize: number,
  viewportStart: number,
  viewportSize: number,
  margin: number,
): number {
  // A margin that would close the window entirely (a narrow viewport, a huge
  // cell) collapses to zero rather than inverting the bounds.
  const usable = Math.max(viewportSize - margin * 2, 0)
  const safeMargin = usable > 0 ? margin : 0
  const min = viewportStart + safeMargin
  const max = viewportStart + viewportSize - safeMargin
  const targetEnd = targetStart + targetSize
  if (targetSize > max - min) return min - targetStart
  if (targetStart < min) return min - targetStart
  if (targetEnd > max) return max - targetEnd
  return 0
}
