import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
} from 'react'
import {
  BLUEPRINT_VIEWPORT_ARTBOARD_MARGIN,
  BLUEPRINT_VIEWPORT_FIT_TOP_INSET,
} from '@/lib/slideLayout'
import { pulseBlueprintCells, type FocusCellsResult } from '@/lib/canvasFocusCells'

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4

export const BLUEPRINT_ARTBOARD_SELECTOR = '[data-blueprint-artboard]'
/** Root wrapper for fit-to-view / centering across overview and detail canvases. */
export const CANVAS_FIT_SELECTOR = '[data-canvas-fit]'

export function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

type UseZoomPanViewportOptions = {
  /** When this value changes, the viewport recenters and fits content. */
  resetKey?: string
  /** Ignore pan start on these selectors (e.g. interactive controls). */
  panIgnoreSelector?: string
  /** Element used to compute fit-to-view bounds. */
  fitSelector?: string
  /** Refit whenever the content box resizes (e.g. async blueprint panels). */
  refitOnResize?: boolean
  /** Debounce for refitOnResize (ms). */
  refitDebounceMs?: number
}

/**
 * Below this zoom the board switches to its SEMANTIC tier: cells stop
 * pretending their text is readable (it is smudge at these scales) and
 * render as flat blocks, while phase title badges counter-scale to hold a
 * constant on-screen size — the overview becomes a table of contents
 * instead of a shrunken page. Stamped as a data attribute + CSS variable
 * straight from the transform writer: a pinch is sixty events a second,
 * and the tier must never cost a React render. Styling lives in
 * blueprint.css under [data-semantic-tier].
 */
// 0.25 (uno-blueprint's current threshold, down from its original 0.35):
// the blocks tier was kicking in while cell text was still legible enough
// to skim, which read as content being withheld. Below 0.25 the text
// really is smudge.
const SEMANTIC_ZOOM_THRESHOLD = 0.25

/** How far a pending touch may wander before it stops being a tap and
 * becomes a board drag. */
const TOUCH_PAN_SLOP = 10

/** Counter-scale that keeps a phase badge at roughly constant screen size
 * (12px type reads ~11px). Capped so a deep zoom-out cannot grow a badge
 * past its artboard. */
// Cap 10, not 16: the badge grows upward from the frame's top edge, and
// with OVERVIEW_PHASE_ROW_GAP's headroom a 10× badge (~220 content px)
// stays inside its own row's gap — 16× reached into the previous phase's
// panels, which broke the badge's group affiliation exactly when zoomed
// out far enough to need it.
const semanticLabelBoost = (zoom: number) =>
  Math.min(10, 0.95 / Math.max(zoom, 0.01))

function applyTransformToElement(
  el: HTMLElement,
  pan: { x: number; y: number },
  zoom: number,
) {
  el.style.transform = `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`
  const blocks = zoom < SEMANTIC_ZOOM_THRESHOLD
  const wasBlocks = el.dataset.semanticTier === 'blocks'
  if (blocks !== wasBlocks) {
    if (blocks) el.dataset.semanticTier = 'blocks'
    else delete el.dataset.semanticTier
  }
  // The boost only exists inside the blocks tier — outside it, skip the
  // style write entirely so a mouse pan stays a single transform write per
  // frame ("never cost a React render" extends to redundant style churn).
  if (blocks) {
    el.style.setProperty(
      '--semantic-label-boost',
      semanticLabelBoost(zoom).toFixed(3),
    )
  } else if (wasBlocks) {
    el.style.removeProperty('--semantic-label-boost')
  }
}

function measureFitBounds(
  content: HTMLElement,
  fitTarget: HTMLElement,
  zoom: number,
): { left: number; top: number; width: number; height: number } {
  if (fitTarget === content) {
    return {
      left: 0,
      top: 0,
      width: content.scrollWidth,
      height: content.scrollHeight,
    }
  }

  const contentRect = content.getBoundingClientRect()
  const targetRect = fitTarget.getBoundingClientRect()
  const safeZoom = zoom || 1

  return {
    left: (targetRect.left - contentRect.left) / safeZoom,
    top: (targetRect.top - contentRect.top) / safeZoom,
    width: targetRect.width / safeZoom,
    height: targetRect.height / safeZoom,
  }
}

export function useZoomPanViewport(options: UseZoomPanViewportOptions = {}) {
  const {
    resetKey,
    panIgnoreSelector = 'button, a, input, textarea, select, [role="button"]',
    fitSelector = CANVAS_FIT_SELECTOR,
    refitOnResize = true,
    refitDebounceMs = 200,
  } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const transformRef = useRef({ pan: { x: 0, y: 0 }, zoom: 1 })
  const pendingFitRef = useRef(false)
  const userAdjustedViewRef = useRef(false)

  const commitTransform = useCallback(
    (
      nextPan: { x: number; y: number },
      nextZoom: number,
      syncReact = false,
    ) => {
      transformRef.current = { pan: nextPan, zoom: nextZoom }
      const el = contentRef.current
      if (el) {
        applyTransformToElement(el, nextPan, nextZoom)
      }
      if (syncReact) {
        setPan(nextPan)
        setZoom(nextZoom)
      }
    },
    [],
  )

  const zoomAtPoint = useCallback(
    (clientX: number, clientY: number, scaleFactor: number, syncReact = true) => {
      const el = containerRef.current
      if (!el) return

      userAdjustedViewRef.current = true

      const rect = el.getBoundingClientRect()
      const mx = clientX - rect.left
      const my = clientY - rect.top
      const { pan: p, zoom: z } = transformRef.current
      const newZoom = clampZoom(z * scaleFactor)
      const worldX = (mx - p.x) / z
      const worldY = (my - p.y) / z
      const nextPan = {
        x: mx - worldX * newZoom,
        y: my - worldY * newZoom,
      }

      commitTransform(nextPan, newZoom, syncReact)
    },
    [commitTransform],
  )

  const fitToView = useCallback(() => {
    const el = containerRef.current
    const content = contentRef.current
    if (!el || !content) return

    const margin = BLUEPRINT_VIEWPORT_ARTBOARD_MARGIN
    const fitTarget =
      content.querySelector<HTMLElement>(fitSelector) ?? content
    const { zoom: currentZoom } = transformRef.current
    const bounds = measureFitBounds(content, fitTarget, currentZoom)

    const insets = {
      top: margin + BLUEPRINT_VIEWPORT_FIT_TOP_INSET,
      right: margin,
      bottom: margin,
      left: margin,
    }
    const fitWidth = Math.max(el.clientWidth - insets.left - insets.right, 1)
    const fitHeight = Math.max(el.clientHeight - insets.top - insets.bottom, 1)
    if (bounds.width <= 0 || bounds.height <= 0) return

    const nextZoom = clampZoom(
      Math.min(fitWidth / bounds.width, fitHeight / bounds.height, 1),
    )

    const targetCenterX = bounds.left + bounds.width / 2
    const targetCenterY = bounds.top + bounds.height / 2
    const viewportCenterX = insets.left + fitWidth / 2
    const viewportCenterY = insets.top + fitHeight / 2

    commitTransform(
      {
        x: viewportCenterX - targetCenterX * nextZoom,
        y: viewportCenterY - targetCenterY * nextZoom,
      },
      nextZoom,
      true,
    )
  }, [commitTransform, fitSelector])

  const resetView = useCallback(() => {
    userAdjustedViewRef.current = false
    commitTransform({ x: 0, y: 0 }, 1, true)
  }, [commitTransform])

  useLayoutEffect(() => {
    const { pan: p, zoom: z } = transformRef.current
    commitTransform(p, z, false)
  }, [commitTransform])

  useEffect(() => {
    if (resetKey === undefined) return
    pendingFitRef.current = true
    userAdjustedViewRef.current = false

    let frame1 = 0
    let frame2 = 0
    const runFit = () => {
      if (!pendingFitRef.current) return
      fitToView()
    }

    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(runFit)
    })

    const timeout = window.setTimeout(() => {
      if (!pendingFitRef.current) return
      fitToView()
      pendingFitRef.current = false
    }, 150)

    return () => {
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frame2)
      window.clearTimeout(timeout)
    }
  }, [resetKey, fitToView])

  useEffect(() => {
    const content = contentRef.current
    const container = containerRef.current
    if (!content) return

    let debounceTimer = 0

    const scheduleFit = () => {
      if (userAdjustedViewRef.current) return

      if (refitOnResize) {
        window.clearTimeout(debounceTimer)
        debounceTimer = window.setTimeout(() => fitToView(), refitDebounceMs)
        return
      }
      if (!pendingFitRef.current) return
      fitToView()
      pendingFitRef.current = false
    }

    const observer = new ResizeObserver(scheduleFit)

    observer.observe(content)
    if (container) observer.observe(container)

    return () => {
      window.clearTimeout(debounceTimer)
      observer.disconnect()
    }
  }, [fitToView, resetKey, refitOnResize, refitDebounceMs])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const scaleFactor = Math.exp(-e.deltaY * 0.01)
        zoomAtPoint(e.clientX, e.clientY, scaleFactor, true)
        return
      }

      if (e.deltaX !== 0 || e.deltaY !== 0) {
        e.preventDefault()
        userAdjustedViewRef.current = true
        const { pan: p, zoom: z } = transformRef.current
        commitTransform(
          {
            x: p.x - e.deltaX,
            y: p.y - e.deltaY,
          },
          z,
          false,
        )
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [commitTransform, zoomAtPoint])

  /**
   * Publish the live transform to React once the gesture goes quiet.
   *
   * Trailing rather than leading: during a pinch nothing reads `zoom` that
   * cannot wait, and the point is to keep React out of the gesture entirely.
   */
  const syncTimer = useRef<number | null>(null)
  const syncZoomToReact = useCallback(() => {
    if (syncTimer.current !== null) window.clearTimeout(syncTimer.current)
    syncTimer.current = window.setTimeout(() => {
      syncTimer.current = null
      const { pan: p, zoom: z } = transformRef.current
      setPan(p)
      setZoom(z)
    }, 80)
  }, [])

  useEffect(
    () => () => {
      if (syncTimer.current !== null) window.clearTimeout(syncTimer.current)
    },
    [],
  )

  /**
   * Touch gestures ride the SAME Pointer Events as mouse pan — no parallel
   * TouchEvent code path. Every touch pointer is tracked in a map; one
   * finger pans (same rules as a mouse drag), and the moment a second
   * finger lands the gesture becomes a pinch: zoom by the ratio of pinch
   * distances through `zoomAtPoint` (centered on the midpoint), pan by the
   * midpoint's drift. The container's `touch-none` is what makes this
   * possible — it keeps the browser from claiming the gesture and
   * cancelling the pointer stream.
   *
   * Refs, not state: a pinch is sixty events a second, and the transform
   * writes straight to the element exactly like the wheel path above.
   */
  const touchPoints = useRef(new Map<number, { x: number; y: number }>())
  const pinchStart = useRef<{ dist: number; x: number; y: number } | null>(null)
  /**
   * A finger down on a CELL is ambiguous: a tap (open it) or the start of a
   * board drag — phones expect both from anywhere. Neither is committed at
   * pointerdown; the finger goes into "pending" and only crossing the slop
   * distance turns it into a pan (and swallows the trailing click so the
   * drag does not also open the cell). A finger that lifts inside the slop
   * was a tap and is left entirely alone. Mouse keeps the strict rule —
   * cursor affordances make drag-from-background natural there.
   */
  const pendingTouchPan = useRef<{ id: number; x: number; y: number } | null>(
    null,
  )
  const suppressNextClick = useRef(false)
  // Mirror of `isPanning` for the 60Hz move path: `beginPan` from inside a
  // pointermove schedules (not flushes) the state commit, so the moves that
  // arrive before React lands would read the stale closure and be dropped —
  // the first frames of a slop-crossed drag stuttering. The ref is the
  // handler's truth; the state exists only for chrome (cursor).
  const isPanningRef = useRef(false)

  const beginPan = useCallback((clientX: number, clientY: number) => {
    userAdjustedViewRef.current = true
    isPanningRef.current = true
    setIsPanning(true)
    panStart.current = {
      x: clientX,
      y: clientY,
      panX: transformRef.current.pan.x,
      panY: transformRef.current.pan.y,
    }
  }, [])

  const endPan = useCallback(() => {
    isPanningRef.current = false
    setIsPanning(false)
  }, [])

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        // A primary touch means the browser sees NO other active touches —
        // anything still in the map is a ghost (a stream that died without
        // its up/cancel: an unmounted target, an OS takeover). Ghosts
        // otherwise pin the gesture in pinch mode forever, a stale pending
        // pan teleports the camera when its pointer id is reused, and a
        // stranded suppress flag eats the next honest tap — so a fresh
        // primary contact resets the whole gesture world.
        if (e.isPrimary) {
          touchPoints.current.clear()
          pinchStart.current = null
          pendingTouchPan.current = null
          suppressNextClick.current = false
        }
        touchPoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (touchPoints.current.size >= 2) {
          // Another finger: whatever was happening becomes a pinch — even if
          // a finger sits on a cell, and even mid-pinch (a third contact
          // rebases the pair rather than falling through to the mouse
          // path). Capture all so the stream cannot be stolen mid-gesture.
          pendingTouchPan.current = null
          endPan()
          const [a, b] = [...touchPoints.current.values()]
          pinchStart.current = {
            dist: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
          }
          for (const id of touchPoints.current.keys()) {
            try {
              containerRef.current?.setPointerCapture(id)
            } catch {
              // A pointer that lifted between the map write and here.
            }
          }
          userAdjustedViewRef.current = true
          return
        }
      }
      // Cleared before ANY early return: a suppress flag stranded by a
      // cancelled gesture (OS edge swipe — no click ever fires to consume
      // it) must not eat the first honest click of a later, unrelated
      // interaction.
      suppressNextClick.current = false
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      // The mouse on an interactive child is a tap on it, never a pan. A
      // single FINGER there goes pending instead — pan if it travels past
      // the slop, tap if it lifts inside it.
      if (panIgnoreSelector && target.closest(panIgnoreSelector)) {
        if (e.pointerType === 'touch') {
          pendingTouchPan.current = {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
          }
        }
        return
      }

      try {
        containerRef.current?.setPointerCapture(e.pointerId)
      } catch {
        // Capture is an assist, not a precondition — a pointer the browser
        // no longer recognizes must not veto the pan itself.
      }
      beginPan(e.clientX, e.clientY)
    },
    [beginPan, endPan, panIgnoreSelector],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (e.pointerType === 'touch' && touchPoints.current.has(e.pointerId)) {
        touchPoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const pinch = pinchStart.current
        if (pinch && touchPoints.current.size >= 2) {
          const [a, b] = [...touchPoints.current.values()]
          const dist = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y))
          const midX = (a.x + b.x) / 2
          const midY = (a.y + b.y) / 2
          zoomAtPoint(midX, midY, dist / pinch.dist, false)
          const { pan: p, zoom: z } = transformRef.current
          commitTransform(
            { x: p.x + (midX - pinch.x), y: p.y + (midY - pinch.y) },
            z,
            false,
          )
          pinchStart.current = { dist, x: midX, y: midY }
          syncZoomToReact()
          return
        }
        const pending = pendingTouchPan.current
        if (pending && pending.id === e.pointerId) {
          if (
            Math.hypot(e.clientX - pending.x, e.clientY - pending.y) <
            TOUCH_PAN_SLOP
          )
            return
          // Slop crossed: this was a drag all along. Pan from the DOWN
          // point (no jump), and swallow the click the browser will still
          // synthesize at lift — a pan must not also open the cell.
          pendingTouchPan.current = null
          suppressNextClick.current = true
          try {
            containerRef.current?.setPointerCapture(e.pointerId)
          } catch {
            // Capture is an assist, not a precondition.
          }
          beginPan(pending.x, pending.y)
          commitTransform(
            {
              x: transformRef.current.pan.x + (e.clientX - pending.x),
              y: transformRef.current.pan.y + (e.clientY - pending.y),
            },
            transformRef.current.zoom,
            false,
          )
          return
        }
      }
      // The ref, not the state: a slop-crossed drag begins inside a
      // pointermove, and the moves coalesced before React commits the
      // state would otherwise be dropped — a visible stutter at the exact
      // moment the drag engages.
      if (!isPanningRef.current) return
      commitTransform(
        {
          x: panStart.current.panX + (e.clientX - panStart.current.x),
          y: panStart.current.panY + (e.clientY - panStart.current.y),
        },
        transformRef.current.zoom,
        false,
      )
    },
    [beginPan, commitTransform, syncZoomToReact, zoomAtPoint],
  )

  /** Capture-phase click filter: a click synthesized at the end of an
   * engaged touch pan must not reach the cell under the finger. Runs on the
   * container in capture order, so it fires before any cell's own handler. */
  const handleClickCapture = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      if (!suppressNextClick.current) return
      suppressNextClick.current = false
      e.preventDefault()
      e.stopPropagation()
    },
    [],
  )

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      let continuesAsPan = false
      if (e.pointerType === 'touch') {
        touchPoints.current.delete(e.pointerId)
        if (pendingTouchPan.current?.id === e.pointerId)
          pendingTouchPan.current = null
        if (touchPoints.current.size < 2) {
          pinchStart.current = null
        } else if (pinchStart.current) {
          // Three fingers down to two: rebase the pinch on the surviving
          // pair. Leaving the old pair's distance in place would make the
          // next move compute a ratio against a gesture that no longer
          // exists — the board lurching by an arbitrary zoom in one frame.
          const [a, b] = [...touchPoints.current.values()]
          pinchStart.current = {
            dist: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
          }
        }
        if (touchPoints.current.size === 1) {
          // Pinch released down to one finger: hand the gesture back to a
          // pan from where that finger is, instead of a dead stop — and
          // swallow the click its eventual lift may synthesize, same as a
          // slop-crossed drag. A pinch is never a tap.
          const [rest] = [...touchPoints.current.values()]
          beginPan(rest.x, rest.y)
          suppressNextClick.current = true
          continuesAsPan = true
        }
      }
      if (!continuesAsPan) endPan()
      try {
        containerRef.current?.releasePointerCapture(e.pointerId)
      } catch {
        // Never captured (a plain tap) — nothing to release.
      }
      // The drag committed straight to the element the whole way; publish the
      // final camera to React so its copy is not the one from before the drag.
      syncZoomToReact()
    },
    [beginPan, endPan, syncZoomToReact],
  )

  /**
   * Fly the camera to a set of blueprint cells (by `data-blueprint-cell` id)
   * and pulse them — the single cell-focus gesture the difference ledger,
   * the divergence strip and zone chips all go through. Cells not on the
   * current canvas are reported as a miss instead of doing nothing.
   */
  const focusCells = useCallback(
    (cellIds: string[]): FocusCellsResult => {
      const container = containerRef.current
      const content = contentRef.current
      if (!container || !content) {
        return { kind: 'miss', missing: [...cellIds] }
      }

      const found: HTMLElement[] = []
      const missing: string[] = []
      for (const cellId of cellIds) {
        const el = content.querySelector<HTMLElement>(
          `[data-blueprint-cell="${CSS.escape(cellId)}"]`,
        )
        if (el) found.push(el)
        else missing.push(cellId)
      }
      if (found.length === 0) return { kind: 'miss', missing }

      // The debounced refit must not yank the camera back after the fly.
      userAdjustedViewRef.current = true

      const { zoom: currentZoom } = transformRef.current
      const safeZoom = currentZoom || 1
      const contentRect = content.getBoundingClientRect()
      const targetRect = found[0].getBoundingClientRect()
      // Content-space center of the first target.
      const worldX =
        (targetRect.left - contentRect.left + targetRect.width / 2) / safeZoom
      const worldY =
        (targetRect.top - contentRect.top + targetRect.height / 2) / safeZoom

      // Readable-zoom clamp: keep the camera the user chose when it can
      // already read a cell; only zoom in from far-out overview scales.
      const nextZoom = safeZoom >= 0.5 ? safeZoom : clampZoom(0.7)
      const nextPan = {
        x: container.clientWidth / 2 - worldX * nextZoom,
        y: container.clientHeight / 2 - worldY * nextZoom,
      }

      commitTransform(nextPan, nextZoom, true)
      pulseBlueprintCells(found)
      return { kind: 'flown' }
    },
    [commitTransform],
  )

  const zoomIn = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.2)
  }, [zoomAtPoint])

  const zoomOut = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, 1 / 1.2)
  }, [zoomAtPoint])

  return {
    containerRef,
    contentRef,
    pan,
    zoom,
    isPanning,
    fitToView,
    resetView,
    focusCells,
    zoomIn,
    zoomOut,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerUp,
      // Touch streams can be cancelled by the OS (edge gestures, alerts) —
      // without this a cancelled pinch strands ghost pointers in the map.
      onPointerCancel: handlePointerUp,
      onClickCapture: handleClickCapture,
    },
  }
}
