import { CANVAS_FIT_SELECTOR, MAX_ZOOM } from '@/hooks/useZoomPanViewport'
import { BLUEPRINT_VIEWPORT_ARTBOARD_MARGIN } from '@/lib/slideLayout'
import { isSubslide, type EditorView, type NavItem } from '@/types/nav'

/** CSS selector for the canvas region the camera should frame. */
export function getCanvasFocusSelector(
  view: EditorView,
  activeSlide: NavItem,
): string {
  if (view === 'home' || view === 'landing') return CANVAS_FIT_SELECTOR
  if (isSubslide(activeSlide)) {
    return `[data-focus-slide-id="${activeSlide.id}"]`
  }
  return `[data-phase-id="${activeSlide.id}"]`
}

/**
 * Cap for programmatic fit zoom.
 * Overview stays ≤100%; focus zooms as far as needed to fill the viewport
 * (bounded only by the global zoom max).
 */
export function getCanvasFocusMaxZoom(view: EditorView): number {
  return view === 'home' || view === 'landing' ? 1 : MAX_ZOOM
}

export type CanvasFocusFitInsets = {
  margin: number
  topInset: number
  bottomInset: number
}

/**
 * Breathing room around the framed target.
 * Focus uses a tight margin so the selected scenario fills the viewport
 * without clipping; bottom inset clears the prev/next nav controls.
 */
export function getCanvasFocusFitInsets(view: EditorView): CanvasFocusFitInsets {
  if (view === 'home' || view === 'landing') {
    return {
      margin: BLUEPRINT_VIEWPORT_ARTBOARD_MARGIN,
      // Sticky navbar sits outside the viewport — no overlay inset needed.
      topInset: 0,
      bottomInset: 0,
    }
  }

  return {
    margin: 20,
    // Keep bottom navigation clearance without shifting the selected board
    // above the canvas center. Equal insets preserve the true visual center.
    topInset: 56,
    bottomInset: 56,
  }
}
