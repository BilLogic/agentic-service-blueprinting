import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
} from 'react'
import { isCanvasResizeRefitSuppressed } from '@/lib/canvasChromeResize'
import {
  pulseBlueprintCells,
  type FocusCellsResult,
} from '@/lib/canvasFocusCells'
import { prefersReducedMotion } from '@/lib/motion'
import {
  BLUEPRINT_VIEWPORT_ARTBOARD_MARGIN,
  BLUEPRINT_VIEWPORT_FIT_TOP_INSET,
} from '@/lib/slideLayout'

export const MIN_ZOOM = 0.05
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
  /** When false, left-drag never starts a pan (e.g. while drawing). */
  panEnabled?: boolean
  /** Element used to compute fit-to-view bounds. */
  fitSelector?: string
  /** Cap for programmatic fit zoom (overview stays ≤1; focus can zoom in). */
  maxFitZoom?: number
  /** Uniform margin around the fit target (px). */
  fitMargin?: number
  /** Extra top inset on top of fitMargin (px). */
  fitTopInset?: number
  /** Extra bottom inset on top of fitMargin (px). */
  fitBottomInset?: number
  /** Animate camera moves when resetKey / fitSelector change. */
  animateFit?: boolean
  /** Duration for animated camera moves (ms). */
  fitDurationMs?: number
  /** Re-center whenever the content box resizes (e.g. async blueprint panels). */
  refitOnResize?: boolean
  /** Debounce for refitOnResize (ms). */
  refitDebounceMs?: number
  /** Never react to container/content resizes (viewport owns its own framing). */
  suppressResizeRefit?: boolean
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
// 0.25, down from 0.35 (2026-08-17): the blocks tier was kicking in while
// cell text was still legible enough to skim, which read as content being
// withheld — users saw "skeletons" on a loaded board. Below 0.25 the text
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

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * True when something between `target` and `container` can still scroll in
 * the direction of this wheel delta — in which case the wheel belongs to it,
 * not to the camera. At-the-end counts as "cannot": a list scrolled to its
 * bottom hands further downward wheel to the canvas, which is how native
 * scroll chaining behaves everywhere else.
 */
function scrollableAncestorCanConsume(
  target: Node,
  container: HTMLElement,
  deltaX: number,
  deltaY: number,
): boolean {
  let node: Node | null = target
  while (node && node !== container) {
    if (node instanceof HTMLElement) {
      const style = getComputedStyle(node)
      const scrollsY =
        node.scrollHeight > node.clientHeight &&
        /auto|scroll/.test(style.overflowY)
      const scrollsX =
        node.scrollWidth > node.clientWidth &&
        /auto|scroll/.test(style.overflowX)
      if (scrollsY && deltaY !== 0) {
        const atTop = node.scrollTop <= 0
        const atBottom =
          node.scrollTop + node.clientHeight >= node.scrollHeight - 1
        if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return true
      }
      if (scrollsX && deltaX !== 0) {
        const atLeft = node.scrollLeft <= 0
        const atRight =
          node.scrollLeft + node.clientWidth >= node.scrollWidth - 1
        if ((deltaX < 0 && !atLeft) || (deltaX > 0 && !atRight)) return true
      }
    }
    node = node.parentNode
  }
  return false
}

/** Sub-pixel camera deltas aren't worth a React commit. */
function isSameTransform(
  a: { pan: { x: number; y: number }; zoom: number },
  b: { pan: { x: number; y: number }; zoom: number },
) {
  return (
    Math.abs(a.pan.x - b.pan.x) < 0.5 &&
    Math.abs(a.pan.y - b.pan.y) < 0.5 &&
    Math.abs(a.zoom - b.zoom) < 0.0001
  )
}

export function useZoomPanViewport(options: UseZoomPanViewportOptions = {}) {
  const {
    resetKey,
    panIgnoreSelector = 'button, a, input, textarea, select, [role="button"]',
    panEnabled = true,
    fitSelector = CANVAS_FIT_SELECTOR,
    maxFitZoom = 1,
    fitMargin = BLUEPRINT_VIEWPORT_ARTBOARD_MARGIN,
    fitTopInset = BLUEPRINT_VIEWPORT_FIT_TOP_INSET,
    fitBottomInset = 0,
    animateFit = false,
    fitDurationMs = 420,
    refitOnResize = true,
    refitDebounceMs = 200,
    suppressResizeRefit = false,
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
  const fitAnimationRef = useRef<number | null>(null)
  /**
   * False until this viewport instance has framed content once. The first
   * fit jumps: animating it would swoop in from the unfitted origin
   * (pan 0,0 / zoom 1) that every fresh mount starts at.
   */
  const hasFittedRef = useRef(false)
  /**
   * Latest `animateFit`, kept in a ref so `fitToView` stays identity-stable
   * across renders — otherwise flipping the prop would re-run the fit
   * effect and fire a second camera move. Synced by an effect declared
   * above the fit effect, so it is current by the time that effect reads it.
   */
  const animateFitRef = useRef(animateFit)

  useEffect(() => {
    animateFitRef.current = animateFit
  }, [animateFit])

  const cancelFitAnimation = useCallback(() => {
    if (fitAnimationRef.current !== null) {
      cancelAnimationFrame(fitAnimationRef.current)
      fitAnimationRef.current = null
    }
  }, [])

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

  const animateTransform = useCallback(
    (nextPan: { x: number; y: number }, nextZoom: number) => {
      cancelFitAnimation()
      const from = transformRef.current
      const start = performance.now()

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / fitDurationMs)
        const e = easeInOutCubic(t)
        commitTransform(
          {
            x: from.pan.x + (nextPan.x - from.pan.x) * e,
            y: from.pan.y + (nextPan.y - from.pan.y) * e,
          },
          from.zoom + (nextZoom - from.zoom) * e,
          t === 1,
        )
        if (t < 1) {
          fitAnimationRef.current = requestAnimationFrame(step)
          return
        }
        fitAnimationRef.current = null
      }

      fitAnimationRef.current = requestAnimationFrame(step)
    },
    [cancelFitAnimation, commitTransform, fitDurationMs],
  )

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

  const zoomAtPoint = useCallback(
    (clientX: number, clientY: number, scaleFactor: number, syncReact = true) => {
      const el = containerRef.current
      if (!el) return

      cancelFitAnimation()
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
    [cancelFitAnimation, commitTransform],
  )

  /**
   * Camera transform that frames the fit target, or null when the geometry
   * isn't measurable yet (viewport unmounted, content not laid out).
   * `forcedZoom` keeps an existing zoom and solves for pan only.
   */
  const computeFitTransform = useCallback(
    (forcedZoom?: number) => {
      const el = containerRef.current
      const content = contentRef.current
      if (!el || !content) return null

      const margin = fitMargin
      const fitTarget =
        content.querySelector<HTMLElement>(fitSelector) ?? content
      const { zoom: currentZoom } = transformRef.current
      const bounds = measureFitBounds(content, fitTarget, currentZoom)

      const insets = {
        top: margin + fitTopInset,
        right: margin,
        bottom: margin + fitBottomInset,
        left: margin,
      }
      const fitWidth = Math.max(el.clientWidth - insets.left - insets.right, 1)
      const fitHeight = Math.max(el.clientHeight - insets.top - insets.bottom, 1)
      if (bounds.width <= 0 || bounds.height <= 0) return null

      const nextZoom =
        forcedZoom ??
        clampZoom(
          Math.min(fitWidth / bounds.width, fitHeight / bounds.height, maxFitZoom),
        )

      const targetCenterX = bounds.left + bounds.width / 2
      const targetCenterY = bounds.top + bounds.height / 2
      const viewportCenterX = insets.left + fitWidth / 2
      const viewportCenterY = insets.top + fitHeight / 2

      return {
        pan: {
          x: viewportCenterX - targetCenterX * nextZoom,
          y: viewportCenterY - targetCenterY * nextZoom,
        },
        zoom: nextZoom,
      }
    },
    [fitBottomInset, fitMargin, fitSelector, fitTopInset, maxFitZoom],
  )

  /** Frames the fit target. Returns false when geometry wasn't measurable. */
  const fitToView = useCallback(
    (options?: { animate?: boolean }) => {
      const next = computeFitTransform()
      if (!next) return false

      const shouldAnimate =
        (options?.animate ?? animateFitRef.current) && !prefersReducedMotion()
      if (shouldAnimate) {
        animateTransform(next.pan, next.zoom)
      } else {
        commitTransform(next.pan, next.zoom, true)
      }
      return true
    },
    [animateTransform, commitTransform, computeFitTransform],
  )

  /**
   * Re-centers the fit target at the current zoom. Resizes use this instead
   * of a fit so a window drag never throws away the zoom the user chose.
   */
  const recenterToView = useCallback(() => {
    const current = transformRef.current
    const next = computeFitTransform(current.zoom)
    if (!next || isSameTransform(current, next)) return
    commitTransform(next.pan, next.zoom, true)
  }, [commitTransform, computeFitTransform])

  /**
   * Runs the fit scheduled by the last `resetKey` change, at most once.
   * Clearing `pendingFitRef` here is what demotes the 150 ms timeout to a
   * true backstop — without it the timeout fires on top of the rAF fit and
   * restarts the ease from its own midpoint.
   */
  const runPendingFit = useCallback(
    (animate: boolean) => {
      if (!pendingFitRef.current) return
      const didFit = fitToView({ animate: hasFittedRef.current && animate })
      // Geometry wasn't ready — leave the fit pending for the backstop.
      if (!didFit) return
      pendingFitRef.current = false
      hasFittedRef.current = true
    },
    [fitToView],
  )

  const resetView = useCallback(() => {
    cancelFitAnimation()
    userAdjustedViewRef.current = false
    commitTransform({ x: 0, y: 0 }, 1, true)
  }, [cancelFitAnimation, commitTransform])

  useLayoutEffect(() => {
    const { pan: p, zoom: z } = transformRef.current
    commitTransform(p, z, false)
  }, [commitTransform])

  useEffect(() => {
    if (resetKey === undefined) return
    pendingFitRef.current = true
    userAdjustedViewRef.current = false

    // Captured now, not read at fit time: a one-shot skip flag may be
    // cleared between scheduling this fit and the frame it runs on.
    const animate = animateFitRef.current
    let frame1 = 0
    let frame2 = 0
    const runFit = () => runPendingFit(animate)

    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(runFit)
    })

    // Backstop for content that hasn't laid out within two frames.
    const timeout = window.setTimeout(runFit, 150)

    return () => {
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frame2)
      window.clearTimeout(timeout)
    }
  }, [resetKey, fitSelector, runPendingFit])

  useEffect(() => {
    return () => cancelFitAnimation()
  }, [cancelFitAnimation])

  useEffect(() => {
    const content = contentRef.current
    const container = containerRef.current
    if (!content) return

    let debounceTimer = 0
    // Portrait/landscape detection for the rotation rule below.
    let lastAspectLandscape: boolean | null = null

    const onResize = () => {
      // A rotation is not a window drag (todo 027 §4): flipping the aspect
      // ratio invalidates whatever framing the user had built, and on a
      // phone there is no Reset control to recover with — so an
      // orientation flip refits even when the user has adjusted the view.
      const box = container?.getBoundingClientRect()
      if (box && box.width > 0 && box.height > 0) {
        const landscape = box.width > box.height
        const flipped =
          lastAspectLandscape !== null && landscape !== lastAspectLandscape
        lastAspectLandscape = landscape
        if (flipped) {
          userAdjustedViewRef.current = false
          window.clearTimeout(debounceTimer)
          fitToView({ animate: false })
          return
        }
      }

      if (userAdjustedViewRef.current) return

      // A fit that is still owed takes priority over every policy below: the
      // resetKey fit retries twice by frame and once at 150ms, and on a heavy
      // mount all three fire before the grid has laid out — after which this
      // observer used to be the only agent left, and the refit branch never
      // ran it. A viewport that has never framed anything has nothing to
      // preserve; re-centering a camera that does not exist yet is not a
      // policy question. This is how Edit mode ended up permanently at
      // identity zoom over an empty corner.
      if (pendingFitRef.current) {
        runPendingFit(false)
        return
      }

      if (refitOnResize) {
        // Checked as the resize is observed, not when the debounce fires:
        // the chrome window closes before a 200 ms debounce would elapse.
        if (suppressResizeRefit || isCanvasResizeRefitSuppressed()) return
        window.clearTimeout(debounceTimer)
        // Re-center only. A resize is not a navigation, so it must not
        // discard the zoom level the viewport is currently at.
        debounceTimer = window.setTimeout(recenterToView, refitDebounceMs)
        return
      }
      // Not a refit: the fit scheduled by the last resetKey is still
      // waiting on content that has only now laid out.
      runPendingFit(false)
    }

    const observer = new ResizeObserver(onResize)

    observer.observe(content)
    if (container) observer.observe(container)

    return () => {
      window.clearTimeout(debounceTimer)
      observer.disconnect()
    }
  }, [
    fitToView,
    recenterToView,
    resetKey,
    refitOnResize,
    refitDebounceMs,
    runPendingFit,
    suppressResizeRefit,
  ])

  /**
   * Pinch to zoom, two fingers to pan.
   *
   * Bound on **window, in the capture phase**, and then filtered by hit test —
   * not on the container. Three failures came out of binding it to the
   * container, and they all look identical to the person using it (the canvas
   * simply does not move):
   *
   * 1. The effect reads `containerRef.current` once. If it runs before that
   *    node exists the listener is never attached, and since the deps are all
   *    stable it is never retried — the canvas is permanently unzoomable.
   * 2. Anything between the pointer and the container that handles `wheel`
   *    first wins, and the overlays on this canvas are numerous and change.
   * 3. A pointer over a child that is not a DOM descendant of the container —
   *    a portalled overlay drawn on top of the canvas — never bubbles to it.
   *
   * Capture on window has none of those failure modes: it runs before every
   * other handler, needs no ref at attach time, and asks
   * `elementFromPoint`-style containment rather than trusting the event path.
   *
   * `{ passive: false }` is what makes `preventDefault` legal here, and
   * preventing the default is the whole job on macOS — an unprevented
   * ctrl+wheel is a browser page-zoom, which is why an unzoomable canvas often
   * came with the *page* zooming instead.
   */
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const el = containerRef.current
      if (!el) return
      const target = e.target
      if (!(target instanceof Node) || !el.contains(target)) {
        // Not the canvas — but an unprevented ctrl+wheel is still a browser
        // *page* zoom, and a pinch that strays two pixels onto a popover or
        // the toolbar must not permanently rescale the whole app. Page zoom
        // persists across everything and is exactly what "the zoom keeps
        // shifting" feels like. Swallow the page zoom; apply nothing.
        if (e.ctrlKey) e.preventDefault()
        return
      }

      // macOS sends pinch as ctrl+wheel; ⌘+wheel is the mouse equivalent.
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        // Immediate: a second viewport's window listener must not also apply
        // the same tick, squaring the scale factor.
        e.stopImmediatePropagation()
        const scaleFactor = Math.exp(-e.deltaY * 0.01)
        /*
          `syncReact: false` — and this is the whole bug.

          A pinch is not one event, it is sixty a second. Syncing React on
          each one re-rendered the entire canvas subtree, which on a
          four-hundred-cell blueprint is far more work than a frame has time
          for, so the main thread saturated and the camera appeared not to
          move at all. A single ⌘+wheel tick always worked, which is exactly
          why this looked like "zoom is broken on the trackpad only".

          The pan branch below has always passed `false` for the same reason.
          The transform is written straight to the element either way; React
          state only carries `zoom` for chrome that reads it, and that can
          arrive one frame after the fingers stop.
        */
        zoomAtPoint(e.clientX, e.clientY, scaleFactor, false)
        syncZoomToReact()
        return
      }

      if (e.deltaX !== 0 || e.deltaY !== 0) {
        // A scrollable *inside* the canvas that can still consume this delta
        // keeps it — an overflowing cell body, a text editor. Hijacking those
        // scrolls pans the whole canvas while the text under the pointer
        // sits unread, which is the exact jank this handler exists to fight.
        if (scrollableAncestorCanConsume(target, el, e.deltaX, e.deltaY)) {
          return
        }
        e.preventDefault()
        e.stopImmediatePropagation()
        cancelFitAnimation()
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
        // Pan must publish too, on the same trailing debounce as zoom —
        // otherwise React's copy of the camera is the camera of ten minutes
        // ago, and the next feature to read it inherits a stale-state bug.
        syncZoomToReact()
      }
    }

    window.addEventListener('wheel', onWheel, {
      passive: false,
      capture: true,
    })
    return () =>
      window.removeEventListener('wheel', onWheel, { capture: true })
  }, [cancelFitAnimation, commitTransform, syncZoomToReact, zoomAtPoint])

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

  const beginPan = useCallback(
    (clientX: number, clientY: number) => {
      cancelFitAnimation()
      userAdjustedViewRef.current = true
      isPanningRef.current = true
      setIsPanning(true)
      panStart.current = {
        x: clientX,
        y: clientY,
        panX: transformRef.current.pan.x,
        panY: transformRef.current.pan.y,
      }
    },
    [cancelFitAnimation],
  )

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
          cancelFitAnimation()
          userAdjustedViewRef.current = true
          return
        }
      }
      // Cleared before ANY early return: a suppress flag stranded by a
      // cancelled gesture (OS edge swipe — no click ever fires to consume
      // it) must not eat the first honest click of a later, unrelated
      // interaction, including ones that arrive while panning is disabled.
      suppressNextClick.current = false
      if (!panEnabled) return
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
    [beginPan, cancelFitAnimation, endPan, panEnabled, panIgnoreSelector],
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
        if (touchPoints.current.size === 1 && panEnabled) {
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
    [beginPan, endPan, panEnabled, syncZoomToReact],
  )

  useEffect(() => {
    if (panEnabled) return
    isPanningRef.current = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- timing-sensitive pan/zoom state: cancels an in-flight drag the moment panning is disabled
    setIsPanning(false)
  }, [panEnabled])

  /**
   * Monotonic focus generation: each `focusCells` call claims a new token,
   * and any deferred work from an earlier call (the pulse cleanup, future
   * expand-then-fly measures) aborts when it wakes up stale — ▶-spam must
   * never land three animations on top of each other.
   */
  const focusGenerationRef = useRef(0)

  /**
   * The single cell-focus pipeline: fly the camera to the FIRST resolvable
   * target and pulse every matched cell (counterpart emphasis included).
   * Returns `{kind:'miss'}` with the unresolvable ids instead of silently
   * doing nothing — callers (ledger rows, strip, agent commands) report it.
   *
   * Reads the camera from `transformRef.current`, never the React copies —
   * those trail the live transform by up to ~80ms (see syncZoomToReact) and
   * a fly computed from them lands beside the target, not on it.
   */
  const focusCells = useCallback(
    (cellIds: string[], opts?: { animate?: boolean }): FocusCellsResult => {
      const container = containerRef.current
      const content = contentRef.current
      if (!container || !content) {
        return { kind: 'miss', missing: [...cellIds] }
      }

      focusGenerationRef.current += 1
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

      cancelFitAnimation()
      // The debounced recenterToView must not yank the camera back after
      // the fly — same suppression the resize handler honors (~line 441).
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

      const animate = (opts?.animate ?? true) && !prefersReducedMotion()
      if (animate) animateTransform(nextPan, nextZoom)
      else commitTransform(nextPan, nextZoom, true)

      pulseBlueprintCells(found)
      return { kind: 'flown' }
    },
    [animateTransform, cancelFitAnimation, commitTransform],
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

  /**
   * Keyboard zoom, because on some setups there is otherwise none.
   *
   * Zoom had exactly two gestures: `cmd`+wheel, and clicking a blueprint in
   * View mode to fit the camera to it. Design mode gives that click to the cell
   * picker, so a mouse without a pinch gesture could not zoom in Design mode
   * **at all**. `zoomIn`/`zoomOut`/`fitToView` already existed here and were
   * bound to nothing; this binds them.
   *
   * Guarded on the event target so it never steals `⌘−` from a text field, and
   * on `⌘` so a bare `-` still types a hyphen.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }
      // `=` is the unshifted key most people press for "+".
      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        zoomIn()
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        zoomOut()
      } else if (event.key === '0') {
        event.preventDefault()
        fitToView({ animate: true })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fitToView, zoomIn, zoomOut])

  return {
    containerRef,
    contentRef,
    pan,
    zoom,
    isPanning,
    fitToView,
    focusCells,
    resetView,
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
