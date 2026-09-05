import { useEffect } from 'react'
import {
  CANVAS_REGION_SELECTOR,
  CELL_DETAIL_PANEL_TOP_GAP_PX,
  CELL_DETAIL_PANEL_TOP_VAR,
} from '@/components/editor/menubarHeaderLayout'

/*
  ONE variable, TWO panels — so the variable is refcounted.

  The cell drawer and the entity drawer both publish this, and both stay
  active through their exit animation (PANEL_EXIT_MS). Handing over from one
  to the other — clicking a storyboard cell while a cell panel is open is the
  path that shows it — leaves the outgoing panel's effect alive for a moment
  AFTER the incoming one has measured, and its cleanup then removed the
  variable out from under a panel that was still open. The drawer fell back to
  the base navbar's height and jumped up under a taller slice header.

  So: last one out clears it, and every arrival re-measures.
*/
let owners = 0

function measure() {
  const canvas = document.querySelector(CANVAS_REGION_SELECTOR)
  const top = canvas?.getBoundingClientRect().top ?? 0
  document.documentElement.style.setProperty(
    CELL_DETAIL_PANEL_TOP_VAR,
    `${Math.max(0, top) + CELL_DETAIL_PANEL_TOP_GAP_PX}px`,
  )
}

/**
 * Publishes the canvas region's top edge so the portalled drawer can sit
 * below whatever chrome that surface stacks above it — the base view's navbar
 * alone, or a slice tab's header band on top of it. Re-measured on resize and
 * whenever a panel opens; the surface's own transitions (sidebar wipe, tab
 * strip) do not move the canvas top, so no observer is needed.
 */
export function useCanvasTopOffset(active: boolean) {
  useEffect(() => {
    if (!active) return

    owners += 1
    measure()
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
      owners -= 1
      if (owners <= 0) {
        owners = 0
        document.documentElement.style.removeProperty(CELL_DETAIL_PANEL_TOP_VAR)
      }
    }
  }, [active])
}
