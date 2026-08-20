import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import {
  getCanvasSpaceHeld,
  setCanvasSpaceHeld,
} from '@/lib/canvasKeyboardState'
import { isEditableKeyboardTarget } from '@/lib/keyboardTarget'
import {
  CAMERA_TRAVEL_MAX_STRETCH,
  cameraTransitionDurationMs,
  cameraTravelOctaves,
  createCameraTransitionClock,
  cameraEaseFor,
  cameraTierChanges,
  interpolateCameraTransform,
  transformCameraAroundPoint,
  type CameraTransitionResult,
} from '@/lib/cameraTransition'
import { isCanvasResizeRefitSuppressed } from '@/lib/canvasChromeResize'
import {
  pulseBlueprintCells,
  type FocusCellsCompletion,
  type FocusCellsResult,
} from '@/lib/canvasFocusCells'
import { MOTION_CAMERA_MS, prefersReducedMotion } from '@/lib/motion'
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
  /**
   * Floor for programmatic fit zoom. A board wider than the viewport fits
   * by zooming out, and past a point that framing is worthless — on a
   * phone the whole-phase fit lands around 0.2, below the semantic tier,
   * so the "default view" arrived as a wall of grey blocks. With a floor
   * the camera stops zooming out at a legible scale and anchors the
   * target's top-left corner instead: the reader starts at the beginning
   * of the journey and pans, rather than at an unreadable everything.
   */
  minFitZoom?: number
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
  /**
   * Zoom below which cells drop their text for the blocks tier. Lower it
   * on high-density screens: the phone was hiding every blurb the moment
   * the reader pinched out past 0.25, which reads as a board with nothing
   * on it rather than as a map. See `SEMANTIC_ZOOM_THRESHOLD`.
   */
  semanticZoomThreshold?: number
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
//
// A DEFAULT, not a constant: what counts as smudge depends on the screen.
// A phone renders at 3 device pixels per CSS pixel, so 12px type at 0.15
// zoom still lands ~5 device pixels tall — enough to tell a full cell from
// an empty one and to catch a word — where the same scale on a 1x desktop
// display is genuinely nothing. Surfaces pass their own; see
// `semanticZoomThreshold`.
export const SEMANTIC_ZOOM_THRESHOLD = 0.25

/** How far a pending touch may wander before it stops being a tap and
 * becomes a board drag. */
const TOUCH_PAN_SLOP = 10

/**
 * Frame cap on the pre-fit settle loop. Comfortably longer than the two
 * frames a stable board needs and than the commits a navigation takes, and
 * short enough that a target which never goes quiet degrades to "fit against
 * whatever we have" rather than polling forever.
 */
const MAX_SETTLE_POLLS = 20
/** Counter-scale that keeps a phase badge at roughly constant screen size
 * (12px type reads ~11px). Capped so a deep zoom-out cannot grow a badge
 * past its artboard. */
// Cap 10, not 16: the badge grows upward from the frame's top edge, and
// with OVERVIEW_PHASE_ROW_GAP's headroom a 10× badge (~220 content px)
// stays inside its own row's gap — 16× reached into the previous phase's
// panels, which broke the badge's group affiliation exactly when zoomed
// out far enough to need it.
// Floored at 1 so the badge never shrinks below its authored size — above
// zoom 0.95 the boost is inert and the badge scales with the board like
// everything else.
const semanticLabelBoost = (zoom: number) =>
  Math.min(10, Math.max(1, 0.95 / Math.max(zoom, 0.01)))

function applyTransformToElement(
  el: HTMLElement,
  pan: { x: number; y: number },
  zoom: number,
  semanticThreshold: number,
) {
  el.style.transform = `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`
  /*
    The tier is read from the zoom being RENDERED, and from nothing else.
    A caller used to be able to override it, so that an animated fit could
    hold the origin's tier while travelling and release the destination's on
    the frame it settled. That is no longer how the flip is timed — it lands
    at the legibility crossing now, which is exactly the frame this
    comparison turns over — so the override said the same thing as the live
    zoom on every frame, and cost a second, redundant write of the transform
    on the crossing frame to say it.
  */
  const blocks = zoom < semanticThreshold
  const wasBlocks = el.dataset.semanticTier === 'blocks'
  if (blocks !== wasBlocks) {
    if (blocks) el.dataset.semanticTier = 'blocks'
    else delete el.dataset.semanticTier
  }
  /*
    Stamped at EVERY zoom, not only inside the blocks tier. When the boost
    existed only past the tier boundary, crossing 0.25 mid-ease snapped the
    badge from board-scale straight to a 3.8x counter-scale in one frame — a
    label lunging at the reader in the middle of the zoom. Continuous, the
    badge tracks the camera: it rides the board down to 95% of its authored
    size, then holds that on-screen size as the zoom drops further, every
    frame of the ease.

    Written ONTO THE BADGES, and only when it changes. It used to be one
    custom property on this element — the board's root — which reads as one
    cheap style write and is not: custom properties inherit, that one is
    read by a rule deep in the subtree, so every write re-resolved computed
    style for thousands of elements. Once per frame of every pinch and every
    navigation ease, on top of the raster the changing scale already costs.
    The rule now reads an inline `scale` on the dozen badges that consume
    it, and the string guard means a pan (constant zoom) writes nothing at
    all.

    The `querySelectorAll` is deliberate rather than cached: it runs only on
    frames where the zoom actually changed, an attribute selector takes the
    engine's fast path, and a cache would need an invalidation signal the
    board does not currently offer. Sub-millisecond against a full-subtree
    style recalc measured in tens.
  */
  stampBadgeBoost(el, zoom)
}

/**
 * Counter-scale the phase title badges so they hold a constant on-screen
 * size — see the reasoning above `applyTransformToElement`.
 *
 * Its own function because it has its own caller: `fitToView` re-stamps the
 * badges a frame after a fit, and that caller must not touch the transform
 * or the semantic tier. It used to reach `applyTransformToElement` for this,
 * and so wrote the tier as collateral, from the LIVE zoom — mid-navigation
 * that is the view being left, not either end of the move. The board went
 * text -> blocks -> text on one crossing navigation: the middle write hides
 * every cell's content and shows it again inside the transition, at a cost
 * of 54-81 ms of whole-board style recalculation, for a value nothing asked
 * for.
 *
 * The guard is on the VALUE, so a pan (constant zoom) writes nothing.
 * `semanticLabelBoost` clamps to [1, 10], so above zoom 0.95 and below 0.095
 * the string is constant and this costs a comparison.
 */
function stampBadgeBoost(el: HTMLElement, zoom: number) {
  const nextBoost = semanticLabelBoost(zoom).toFixed(3)
  if (nextBoost === el.dataset.semanticLabelBoost) return
  el.dataset.semanticLabelBoost = nextBoost
  const badges = el.querySelectorAll<HTMLElement>('[data-phase-title-badge]')
  for (const badge of badges) badge.style.scale = nextBoost
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
    minFitZoom = MIN_ZOOM,
    fitMargin = BLUEPRINT_VIEWPORT_ARTBOARD_MARGIN,
    fitTopInset = BLUEPRINT_VIEWPORT_FIT_TOP_INSET,
    fitBottomInset = 0,
    animateFit = false,
    fitDurationMs = MOTION_CAMERA_MS,
    refitOnResize = true,
    refitDebounceMs = 200,
    suppressResizeRefit = false,
    semanticZoomThreshold = SEMANTIC_ZOOM_THRESHOLD,
  } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [isSpaceHeld, setIsSpaceHeld] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const transformRef = useRef({ pan: { x: 0, y: 0 }, zoom: 1 })
  const pendingFitRef = useRef(false)
  /**
   * Whether the fit `pendingFitRef` still owes should ANIMATE. The resize
   * observer used to run an owed fit with `animate: false` unconditionally —
   * correct for a first mount (nothing to ease from), wrong for a navigation:
   * a phase→scenario click changes layout in the same commit that schedules
   * the fit, so the observer fired before the two-frame rAF path did and the
   * 420ms ease was silently replaced with a hard cut. That was the "super
   * abrupt" navigation. The intent is captured where the fit is scheduled;
   * every executor honours it.
   */
  const pendingFitAnimateRef = useRef(false)
  const userAdjustedViewRef = useRef(false)
  const fitAnimationRef = useRef<number | null>(null)
  const fitAnimationTargetRef = useRef<{
    pan: { x: number; y: number }
    zoom: number
  } | null>(null)
  const fitAnimationResolveRef = useRef<
    ((result: CameraTransitionResult) => void) | null
  >(null)
  /**
   * False until this viewport instance has framed content once. The first
   * fit jumps: animating it would swoop in from the unfitted origin
   * (pan 0,0 / zoom 1) that every fresh mount starts at.
   */
  const hasFittedRef = useRef(false)
  /**
   * True while the resetKey effect's settle loop is waiting for the fit
   * target's layout to go quiet. The resize observer's owed-fit branch
   * defers to it — see the loop for why.
   */
  const fitSettlingRef = useRef(false)
  /**
   * Portrait/landscape, for the rotation rule in the resize observer.
   *
   * A ref, not a closure local of that effect: the effect lists `resetKey`
   * in its deps, so every navigation re-created it and reset the detector to
   * `null` — and a flip needs a previous value to compare against. A freshly
   * constructed ResizeObserver also delivers once for each observed element,
   * which consumed the re-seed. The upshot was that the branch existing
   * because "on a phone there is no Reset control to recover with" could not
   * fire on the first delivery after any navigation. Orientation is device
   * state; it does not belong to an effect generation.
   */
  const lastAspectLandscapeRef = useRef<boolean | null>(null)
  /**
   * Latest semantic threshold, read by every transform write so that NOTHING
   * on the camera path depends on the prop.
   *
   * This ref existed for the post-fit badge re-stamp and said, correctly,
   * that `fitToView` must not "depend on (and re-create itself for) a prop
   * that changes nothing about how a fit is computed" — but `commitTransform`
   * still closed over the prop, so the whole chain
   * (`commitTransform → animateTransform → fitToView → runPendingFit →` the
   * resetKey layout effect) was rebuilt whenever the threshold moved. That
   * effect is NOT idempotent: it raises `pendingFitRef` and clears
   * `userAdjustedViewRef`. The threshold is dynamic now, so a reader focused
   * on a phase who toggled a path — a case `fitKey` deliberately ignores —
   * had their pan and zoom thrown away by a fit nobody asked for. Reading it
   * through the ref finishes the job the comment described.
   *
   * Synced in a LAYOUT effect: the fit effect below is one too, and a passive
   * sync would leave the first fit after a threshold change reading a stale
   * value.
   */
  const semanticThresholdRef = useRef(semanticZoomThreshold)
  useLayoutEffect(() => {
    semanticThresholdRef.current = semanticZoomThreshold
  }, [semanticZoomThreshold])
  /**
   * The content's layout size when the camera last framed it.
   *
   * A fit measures whatever has laid out by the time it runs — two frames
   * after the resetKey changes, with a 150 ms backstop — and a six-phase board
   * with images is still growing then. The resize path afterwards only ever
   * re-CENTRED, which preserves the zoom that intermediate size produced, so
   * nothing corrected it: measured 0.1498 against a correct fit of 0.0617,
   * i.e. the board rendering 2.4x too big for the viewport, at a different
   * wrong value on every load. That is the "random landing".
   *
   * Comparing against this tells a *late layout* (refit) apart from a *window
   * drag* (recentre, because the zoom is the reader's). Layout size, not
   * `getBoundingClientRect`, so the camera's own transform cannot feed back.
   */
  const fittedContentSizeRef = useRef<{ width: number; height: number } | null>(
    null,
  )
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

  const cancelFitAnimation = useCallback(
    (kind: 'cancelled' | 'superseded' = 'cancelled') => {
      if (fitAnimationRef.current !== null) {
        cancelAnimationFrame(fitAnimationRef.current)
        fitAnimationRef.current = null
        fitAnimationTargetRef.current = null
        fitAnimationResolveRef.current?.({
          kind,
          transform: transformRef.current,
        })
        fitAnimationResolveRef.current = null
      }
    },
    [],
  )

  const commitTransform = useCallback(
    (
      nextPan: { x: number; y: number },
      nextZoom: number,
      syncReact = false,
    ) => {
      transformRef.current = { pan: nextPan, zoom: nextZoom }
      const el = contentRef.current
      if (el) {
        applyTransformToElement(
          el,
          nextPan,
          nextZoom,
          semanticThresholdRef.current,
        )
      }
      if (syncReact) {
        setPan(nextPan)
        setZoom(nextZoom)
      }
    },
    // Identity-stable on purpose — see `semanticThresholdRef`. Everything
    // downstream of this callback schedules fits, and a rebuild there is a
    // camera move.
    [],
  )

  const animateTransform = useCallback(
    (
      nextPan: { x: number; y: number },
      nextZoom: number,
    ): Promise<CameraTransitionResult> => {
      cancelFitAnimation('superseded')
      const from = transformRef.current
      const target = { pan: nextPan, zoom: nextZoom }

      /*
        The viewport is read PER FRAME, not snapshotted.

        Interpolating about the viewport centre made `height` load-bearing —
        the old rectangle-width maths used `width` alone. A snapshot taken
        while the container is still zero-height (a fit scheduled from a
        layout effect, a collapsed panel, a `display` change in the same
        commit) fell back to 1, so every intermediate frame was computed
        about y≈0 instead of the real centre: the camera swung hundreds of
        pixels out and snapped home on the last frame, because the endpoints
        short-circuit and stay exact. Reading live also means a container
        that resizes mid-ease (chrome opening) is followed rather than
        ignored.
      */
      const readViewport = () => {
        const container = containerRef.current
        return {
          width: container?.clientWidth ?? 0,
          height: container?.clientHeight ?? 0,
        }
      }

      // Nothing to interpolate against, and no frame would be honest about
      // it — land on the target rather than animate through a fictional
      // centre.
      const initialViewport = readViewport()
      if (initialViewport.width <= 0 || initialViewport.height <= 0) {
        commitTransform(nextPan, nextZoom, true)
        return Promise.resolve<CameraTransitionResult>({
          kind: 'completed',
          transform: target,
        })
      }

      fitAnimationTargetRef.current = target

      /*
        The detail changes ONCE, at the moment cell text stops or starts
        being readable — see `cameraTierChanges`, which owns whether it
        changes at all, and the loop below, which owns when.

        This used to be two hand-picked constants, 0.10 out and 0.88 in, and
        no pair of numbers could have been right. The crossing moves with
        the phase, the window and the direction: on this board a narrow
        phase crosses 93% of the way through a zoom-in while a wide one
        never crosses at all, and widening the window by 160px flips which
        of those is true. A move whose tier does not change now writes
        nothing, which is most sibling navigation.

        The change still costs a whole-board style recalculation — 81 ms
        into the text tier, 54 ms out of it, on 6565 nodes, against 0.2 ms
        for the transform write an ordinary frame does — and still hands
        that cost to `clock.absorb`, so the stall spends a late frame
        instead of a lost stretch of the journey.

        The board also still travels on the CHEAPER tier for most of every
        move, which used to be arranged by pinning the tier to
        `min(from, to)`. It now falls out of the rule for free: the crossing
        is early in a departure and late in an arrival, so the expensive tier
        is on screen for the shorter half either way.
      */

      /*
        The clock runs LONGER for a move that goes further, so every camera
        move travels at the same perceived rate — see `cameraTravelOctaves`.
        Same ease, same interpolation, same curve; only the duration
        changes. A single navigation step comes out exactly where it was.

        Without this, `MOTION_CAMERA_MS` was the whole answer: overview to a
        phase and overview to a scenario both got 420 ms despite the second
        covering roughly twice the perceptual distance, so it ran at twice
        the speed.
      */
      const durationMs = cameraTransitionDurationMs(
        fitDurationMs,
        cameraTravelOctaves(from, target, initialViewport),
      )
      const progressAt = createCameraTransitionClock(durationMs)

      /* Graded by direction: a push in and a pull out are not one event. */
      const ease = cameraEaseFor(from.zoom, nextZoom)

      /*
        ONE move, ONE threshold. The ref is rewritten whenever the surface
        changes — a phone shell reads 0.15, a multi-path comparison 0.12,
        everything else 0.25 — and it can change under a move in flight: drag
        a window across the phone breakpoint mid-navigation and it does.
        Read live on some lines and frozen on others, the crossing test and
        the latch that guards it would disagree about which move this is.
      */
      const threshold = semanticThresholdRef.current

      /*
        False for every move that leaves the tier alone — which is most of
        them — and then nothing below runs at all.
      */
      let tierWritePending = cameraTierChanges(from.zoom, nextZoom, threshold)

      return new Promise((resolve) => {
        fitAnimationResolveRef.current = resolve
        const step = (now: number) => {
          const t = progressAt(now)
          const viewport = readViewport()
          const next = interpolateCameraTransform(
            from,
            target,
            viewport.width > 0 && viewport.height > 0
              ? viewport
              : initialViewport,
            ease(t),
          )
          commitTransform(next.pan, next.zoom, t === 1)

          /*
            `commitTransform` has just written the tier, because the tier is
            read from the zoom it renders. On the frame that zoom crosses the
            threshold, that write costs a whole-board style recalculation —
            81 ms into the text tier, 54 ms out of it, on 6565 nodes, against
            0.2 ms for an ordinary frame's transform. All this does is force
            that recalculation to finish now and tell the clock what it cost,
            so the move lands late rather than losing a stretch of its
            journey — see `CameraTransitionClock.absorb`.

            The element is read live rather than captured at move start. A
            captured one can be replaced mid-move, and then this forces
            layout on a detached node, which costs nothing, and reports
            nothing to the clock, while the real recalculation lands on a
            later frame charged in full to the ease. Silent, and exactly the
            failure the billing exists to prevent.
          */
          const tierEl = contentRef.current
          if (
            tierWritePending &&
            tierEl &&
            cameraTierChanges(from.zoom, next.zoom, threshold)
          ) {
            tierWritePending = false
            const spent = performance.now()
            void tierEl.offsetHeight
            progressAt.absorb(performance.now() - spent)
          }
          if (t < 1) {
            fitAnimationRef.current = requestAnimationFrame(step)
            return
          }
          fitAnimationRef.current = null
          fitAnimationTargetRef.current = null
          fitAnimationResolveRef.current = null
          resolve({ kind: 'completed', transform: target })
        }
        fitAnimationRef.current = requestAnimationFrame(step)
      })
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
    (
      clientX: number,
      clientY: number,
      scaleFactor: number,
      syncReact = true,
    ) => {
      const el = containerRef.current
      if (!el) return

      cancelFitAnimation()
      userAdjustedViewRef.current = true

      const rect = el.getBoundingClientRect()
      const mx = clientX - rect.left
      const my = clientY - rect.top
      const current = transformRef.current
      const newZoom = clampZoom(current.zoom * scaleFactor)
      const next = transformCameraAroundPoint(
        current,
        { x: mx, y: my },
        { x: mx, y: my },
        newZoom,
      )

      commitTransform(next.pan, next.zoom, syncReact)
    },
    [cancelFitAnimation, commitTransform],
  )

  const zoomBetweenPoints = useCallback(
    (
      fromClientX: number,
      fromClientY: number,
      toClientX: number,
      toClientY: number,
      scaleFactor: number,
      syncReact = true,
    ) => {
      const el = containerRef.current
      if (!el) return

      cancelFitAnimation()
      userAdjustedViewRef.current = true

      const rect = el.getBoundingClientRect()
      const current = transformRef.current
      const next = transformCameraAroundPoint(
        current,
        { x: fromClientX - rect.left, y: fromClientY - rect.top },
        { x: toClientX - rect.left, y: toClientY - rect.top },
        clampZoom(current.zoom * scaleFactor),
      )
      commitTransform(next.pan, next.zoom, syncReact)
    },
    [cancelFitAnimation, commitTransform],
  )

  /**
   * Camera transform that frames the fit target, or null when the geometry
   * isn't measurable yet (viewport unmounted, content not laid out).
   * `forcedZoom` keeps an existing zoom and solves for pan only.
   */
  const computeFitTransform = useCallback(
    (forcedZoom?: number, selector = fitSelector) => {
      const el = containerRef.current
      const content = contentRef.current
      if (!el || !content) return null

      const margin = fitMargin
      const matchedTarget = content.querySelector<HTMLElement>(selector)
      const fitTarget =
        matchedTarget ?? (selector === fitSelector ? content : null)
      if (!fitTarget) return null
      const { zoom: currentZoom } = transformRef.current
      const bounds = measureFitBounds(content, fitTarget, currentZoom)

      const insets = {
        top: margin + fitTopInset,
        right: margin,
        bottom: margin + fitBottomInset,
        left: margin,
      }
      const fitWidth = Math.max(el.clientWidth - insets.left - insets.right, 1)
      const fitHeight = Math.max(
        el.clientHeight - insets.top - insets.bottom,
        1,
      )
      if (bounds.width <= 0 || bounds.height <= 0) return null

      const trueFit = Math.min(
        fitWidth / bounds.width,
        fitHeight / bounds.height,
        maxFitZoom,
      )
      const nextZoom = forcedZoom ?? clampZoom(Math.max(trueFit, minFitZoom))
      /**
       * The floor won: the target cannot fit at the floor, and the camera
       * is sitting at it. Stated in terms of the floor rather than "does it
       * overflow" so a resize recentring (`forcedZoom`) at the same floored
       * zoom keeps the same framing — while a reader who has zoomed PAST
       * the floor overflows for their own reasons and keeps centring.
       */
      const floored = trueFit < minFitZoom && nextZoom <= minFitZoom + 1e-6

      const targetCenterX = bounds.left + bounds.width / 2
      const targetCenterY = bounds.top + bounds.height / 2
      const viewportCenterX = insets.left + fitWidth / 2
      const viewportCenterY = insets.top + fitHeight / 2

      /*
        Centre what fits; anchor what the FLOOR pushed off screen.

        An axis the target overflows has no meaningful centre — centring it
        drops the camera in the middle of the board with both edges off
        screen. Anchoring that axis to the viewport's inset corner starts
        the reader at the target's beginning instead.

        Only when the floor caused the overflow. A viewport with no floor
        configured (every desktop canvas) never reaches this branch, and
        neither does a reader who has zoomed in past it — that overflow is
        their own doing, and yanking their view to a corner on the next
        resize would be the surprise.
      */
      const overflowsX = floored && bounds.width * nextZoom > fitWidth + 0.5
      const overflowsY = floored && bounds.height * nextZoom > fitHeight + 0.5

      return {
        pan: {
          x: overflowsX
            ? insets.left - bounds.left * nextZoom
            : viewportCenterX - targetCenterX * nextZoom,
          y: overflowsY
            ? insets.top - bounds.top * nextZoom
            : viewportCenterY - targetCenterY * nextZoom,
        },
        zoom: nextZoom,
      }
    },
    [
      fitBottomInset,
      fitMargin,
      fitSelector,
      fitTopInset,
      maxFitZoom,
      minFitZoom,
    ],
  )

  /** Frames the fit target. Returns false when geometry wasn't measurable. */
  const fitToView = useCallback(
    (options?: { animate?: boolean }) => {
      const next = computeFitTransform()
      if (!next) return false

      const shouldAnimate =
        (options?.animate ?? animateFitRef.current) && !prefersReducedMotion()
      if (shouldAnimate) {
        const activeTarget = fitAnimationTargetRef.current
        if (
          !activeTarget ||
          !isSameTransform(activeTarget, { pan: next.pan, zoom: next.zoom })
        ) {
          void animateTransform(next.pan, next.zoom)
        }
      } else {
        /*
          Cancel first. Every other camera entry point in this file does
          (`zoomAtPoint`, `zoomBetweenPoints`, `beginPan`, `panBy`, the wheel
          pan) — this branch did not, and `commitTransform` only writes the
          ref and the element: a queued `step` still holds its own captured
          `from`/`target` and repaints straight over the correction on the
          next frame.

          It made two escape hatches inert. `refitWhenIdle` gives up waiting
          past its deadline precisely BECAUSE an ease is still running, then
          "corrected" into that ease and lost. And a backgrounded tab stops
          `requestAnimationFrame` mid-flight, so the queued frame is still
          pending when the reader returns — the deadline correction lands
          during the freeze, then the resumed frame slams the camera back to
          the pre-layout framing the instant the tab is looked at.
        */
        cancelFitAnimation()
        commitTransform(next.pan, next.zoom, true)
      }
      const content = contentRef.current
      if (content) {
        fittedContentSizeRef.current = {
          width: content.offsetWidth,
          height: content.offsetHeight,
        }
        /*
          Re-stamp the badges one frame on, unconditionally.

          The boost write is guarded on the VALUE changing — right for a pan,
          wrong across a fit: the badges mount WITH the board, after the write
          that set this zoom's value, so they would keep the scale they were
          born with (1) for as long as the camera then held still. Which is
          the counter-scale silently not happening, and nothing on screen
          says so. One frame later the board has laid out and the forced
          re-stamp finds them.
        */
        requestAnimationFrame(() => {
          const el = contentRef.current
          if (!el) return
          // Badges ONLY. This deliberately does not go through
          // `applyTransformToElement`: the camera is not moving here, and a
          // re-stamp that also wrote the tier described the live zoom,
          // which mid-navigation is neither end of the move.
          delete el.dataset.semanticLabelBoost
          stampBadgeBoost(el, transformRef.current.zoom)
        })
      }
      return true
    },
    [animateTransform, cancelFitAnimation, commitTransform, computeFitTransform],
  )

  /**
   * Re-centers the fit target at the current zoom. Resizes use this instead
   * of a fit so a window drag never throws away the zoom the user chose.
   */
  const recenterToView = useCallback(() => {
    /*
      Never mid-ease. This commits with `syncReact` on, so a resize landing
      partway through a navigation cost a full canvas re-render for a
      transform the next frame overwrites — and it commits from the
      live zoom, which mid-flight is neither end of the move. The ease is already going where this wants to go.
    */
    if (fitAnimationRef.current !== null) return
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

  useLayoutEffect(() => {
    if (resetKey === undefined) return
    pendingFitRef.current = true
    userAdjustedViewRef.current = false

    // Captured now, not read at fit time: a one-shot skip flag may be
    // cleared between scheduling this fit and the frame it runs on.
    const animate = animateFitRef.current
    pendingFitAnimateRef.current = animate

    /*
      Fit when the TARGET has stopped changing size, not on a fixed clock.

      The old schedule (two frames, 150 ms backstop) fit against whatever
      had laid out by then — and a comparison panel is mid-measurement
      right then: its content mounts in one commit, a ResizeObserver
      measures it, and the panel takes its real size a commit later. A
      path toggled onto a focused scenario therefore eased toward a
      half-grown panel, and the growth correction afterwards landed as a
      visible snap on top of the ease — the "zoom messes up the page".
      Waiting for two consecutive frames to measure the same target size
      costs one frame on already-stable boards and buys a single clean
      ease against final geometry everywhere else.

      `fitSettlingRef` tells the resize observer's owed-fit branch to stay
      out while this loop is watching — that branch re-fires the pending
      fit on any content resize, which is precisely the mid-layout moment
      this loop exists to wait out.
    */
    fitSettlingRef.current = true
    let frame = 0
    let polls = 0
    let lastSize: { width: number; height: number } | null = null
    let lastTarget: HTMLElement | null = null

    /*
      Releasing the guard belongs to `stop`, not to the success path.

      `runFit` used to lower `fitSettlingRef` only when the fit was actually
      consumed. A target that measures 0x0 makes `runPendingFit` decline, so
      both terminal paths — the poll cap and the backstop — left the guard
      RAISED with nothing else scheduled. The resize observer's owed-fit
      branch checks that guard and returns early, so the camera was inert
      for the life of the view: exactly the "Edit mode stuck at identity
      zoom over an empty corner" failure that branch exists to prevent.

      The comment below still holds — the guard must stay up while the loop
      is watching. It just has to come down when the loop stops watching,
      however it stops.
    */
    const stop = () => {
      fitSettlingRef.current = false
      cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }

    /*
      Stand down only once the fit has actually been CONSUMED.

      `runPendingFit` can decline: `computeFitTransform` bails when the
      target measures 0×0, leaving `pendingFitRef` raised. Lowering the guard
      regardless handed the next fit to the ResizeObserver's owed-fit branch
      — which fires on the panel's mid-layout growth, i.e. exactly the
      premature fit this loop exists to prevent, ~200 ms before the backstop
      could have helped.
    */
    const runFit = () => {
      runPendingFit(animate)
      if (pendingFitRef.current) return false
      stop()
      return true
    }

    const step = () => {
      const content = contentRef.current
      const target = content?.querySelector<HTMLElement>(fitSelector) ?? content
      const size = target
        ? { width: target.offsetWidth, height: target.offsetHeight }
        : null
      /*
        Three things have to be true to call this settled, and only the last
        one used to be checked.

        A REAL size — `0×0` twice running is a board that has not begun
        laying out, not a board that has finished. That is the heavy mount
        this loop was written for, and it was the one case it mis-read.

        The SAME element both times — `fitSelector` changes on the same
        navigation that mounts the new node, so frame one legitimately
        measures the content fallback and frame two measures the real target.
        Two different elements agreeing within a pixel is a coincidence, not
        a settled layout.

        And the same size, within a pixel of integer `offsetWidth` rounding.
      */
      const measurable = size !== null && size.width > 0 && size.height > 0
      const settled =
        measurable &&
        lastSize !== null &&
        target === lastTarget &&
        Math.abs(size.width - lastSize.width) <= 1 &&
        Math.abs(size.height - lastSize.height) <= 1

      if (settled && runFit()) return

      lastSize = measurable ? size : null
      lastTarget = target
      // Bounded, like `refitWhenIdle` below. A target that never goes quiet
      // — an oscillating measurement, a selector that keeps missing — would
      // otherwise poll forever, and each poll is a `querySelector` plus two
      // forced layout reads scheduled right after our own transform writes.
      if (++polls > MAX_SETTLE_POLLS) {
        runFit()
        return
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)

    // Backstop for content that will not go quiet in time — the ease is
    // 420 ms, and a fit that starts later than this reads as a hang. Late
    // growth after it is the resize observer's correction to make. It also
    // ENDS the loop: leaving the rAF running past the backstop was a
    // permanent per-frame forced layout for the life of the view.
    const timeout = window.setTimeout(runFit, 250)

    // `stop` lowers the settling guard as well as clearing the timers.
    return stop
  }, [resetKey, fitSelector, runPendingFit])

  useEffect(() => {
    return () => cancelFitAnimation()
  }, [cancelFitAnimation])

  useEffect(() => {
    const content = contentRef.current
    const container = containerRef.current
    if (!content) return

    let debounceTimer = 0

    const onResize = () => {
      // A rotation is not a window drag (todo 027 §4): flipping the aspect
      // ratio invalidates whatever framing the user had built, and on a
      // phone there is no Reset control to recover with — so an
      // orientation flip refits even when the user has adjusted the view.
      const box = container?.getBoundingClientRect()
      if (box && box.width > 0 && box.height > 0) {
        const landscape = box.width > box.height
        const flipped =
          lastAspectLandscapeRef.current !== null &&
          landscape !== lastAspectLandscapeRef.current
        lastAspectLandscapeRef.current = landscape
        if (flipped) {
          userAdjustedViewRef.current = false
          window.clearTimeout(debounceTimer)
          fitToView({ animate: false })
          return
        }
      }

      if (userAdjustedViewRef.current) return

      // A fit that is still owed takes priority over every policy below: the
      // resetKey fit's settle loop and backstop can all pass before a heavy
      // mount's grid has laid out — after which this observer is the only
      // agent left, and the refit branch never ran it. A viewport that has
      // never framed anything has nothing to preserve; re-centering a camera
      // that does not exist yet is not a policy question. This is how Edit
      // mode ended up permanently at identity zoom over an empty corner.
      //
      // NOT while the settle loop is still watching: these observations are
      // the very mid-layout growth it is waiting out, and fitting from here
      // is exactly the premature fit the loop exists to prevent.
      if (pendingFitRef.current) {
        if (!fitSettlingRef.current) {
          runPendingFit(pendingFitAnimateRef.current)
        }
        return
      }

      if (refitOnResize) {
        // Checked as the resize is observed, not when the debounce fires:
        // the chrome window closes before a 200 ms debounce would elapse.
        if (suppressResizeRefit || isCanvasResizeRefitSuppressed()) return
        window.clearTimeout(debounceTimer)
        /*
          The content laid out further than the fit ever saw, on a camera the
          reader has not touched: re-FIT, do not re-centre. Re-centring keeps
          the zoom, and here the zoom is exactly what is wrong.

          Anything else — a window drag, chrome opening — still re-centres: a
          resize is not a navigation, and discarding the zoom the reader chose
          is the bug that branch exists to prevent.
        */
        const content = contentRef.current
        const fitted = fittedContentSizeRef.current
        const grewSinceFit =
          content !== null &&
          fitted !== null &&
          (Math.abs(content.offsetWidth - fitted.width) > 1 ||
            Math.abs(content.offsetHeight - fitted.height) > 1)
        /*
          NEVER while a fit ease is still in flight.

          A scenario focus grows its content mid-navigation, so this
          correction used to land ~200ms into the 420ms navigation ease,
          cancel it, and start a fresh ease from a moving camera — an
          easeInOut restart begins at zero velocity, so the visible result is
          the zoom braking hard partway through and setting off again. That
          is the "abrupt" phase→scenario transition. Waiting for the ease to
          land preserves one clean glide, followed only by the instant layout
          correction documented below.
        */
        /*
          Bounded. The poll waits out a fit ease, and a backgrounded tab
          stops `requestAnimationFrame` — so `fitAnimationRef` never clears
          and an unbounded poll spins at the throttled rate until unmount.
          Past the deadline the correction matters more than the ease it
          would interrupt, so it goes through.
        */
        /*
          A WALL-CLOCK deadline, not a poll count.

          This was `ceil(fitDurationMs * 2 / 50)` polls, which is 850 ms of
          grace only if the polls are 50 ms apart. The comment above says
          the bound exists because a backgrounded tab stops
          `requestAnimationFrame` — but a backgrounded tab also clamps
          `setTimeout` to a second or more, so in the one situation the
          bound was written for it stretched to something like 17 seconds.
          The escape hatch went missing exactly when it was needed.

          Two eases long, at the LONGEST an ease can now be — see
          `CAMERA_TRAVEL_MAX_STRETCH`, since a move's duration now scales
          with its distance.
        */
        const refitDeadline =
          performance.now() + fitDurationMs * CAMERA_TRAVEL_MAX_STRETCH * 2
        const refitWhenIdle = () => {
          if (
            fitAnimationRef.current !== null &&
            performance.now() < refitDeadline
          ) {
            // Never snap mid-ease — wait the glide out on a short poll.
            debounceTimer = window.setTimeout(refitWhenIdle, 50)
            return
          }
          /*
            INSTANT, never animated. An animated correction was the visible
            "zoom out from a focused view" on landing: the swap fit framed a
            board that had not finished laying out, and the correction then
            GLIDED to the true fit in front of the reader — a camera move
            nobody asked for. The landing choreography holds everything but
            the bare frames invisible until layout has been quiet, so this
            snap happens against structure only; and a navigation whose
            content grew corrects in the same frame its ease lands rather
            than starting a second glide.
          */
          fitToView({ animate: false })
        }
        /*
          Same poll, same deadline, for the same reason. Recentring used to
          simply RETURN when it landed mid-ease, which reads as "the ease is
          already going where this wants to go" — and is only true while the
          viewport has not changed. A resize is this path's only caller, so
          the premise is false exactly when it is invoked: the ease settles on
          a target computed against the OLD viewport, and because the
          interpolation returns its destination exactly at progress 1, the
          live-viewport reading that saves every intermediate frame does not
          save the last one. The board lands off centre and nothing corrects
          it until the next resize.
        */
        const recenterWhenIdle = () => {
          if (
            fitAnimationRef.current !== null &&
            performance.now() < refitDeadline
          ) {
            debounceTimer = window.setTimeout(recenterWhenIdle, 50)
            return
          }
          recenterToView()
        }
        debounceTimer = window.setTimeout(
          grewSinceFit ? refitWhenIdle : recenterWhenIdle,
          refitDebounceMs,
        )
        return
      }
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
    fitDurationMs,
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
    return () => window.removeEventListener('wheel', onWheel, { capture: true })
  }, [cancelFitAnimation, commitTransform, syncZoomToReact, zoomAtPoint])

  /**
   * Safari's own pinch, swallowed.
   *
   * WebKit ships non-standard `gesture*` events alongside the pointer
   * stream, and on iOS an unprevented `gesturestart` is a *page* zoom —
   * the visual viewport rescaling the whole app while the canvas sits
   * still, which is what "pinch does not work" looks like on a phone.
   * `touch-action: none` does not cover them. Preventing the default is
   * the entire job: the pinch itself is already handled by the pointer map
   * below, so these listeners must never also apply a transform.
   *
   * Bound on the window in capture and filtered by containment, for the
   * same three reasons the wheel listener is (see above) — chiefly that a
   * listener attached from a ref read once may never attach at all.
   */
  useEffect(() => {
    const swallow = (event: Event) => {
      const el = containerRef.current
      const target = event.target
      if (!el || !(target instanceof Node) || !el.contains(target)) return
      event.preventDefault()
    }
    const options = { passive: false, capture: true } as const
    window.addEventListener('gesturestart', swallow, options)
    window.addEventListener('gesturechange', swallow, options)
    window.addEventListener('gestureend', swallow, options)
    return () => {
      window.removeEventListener('gesturestart', swallow, { capture: true })
      window.removeEventListener('gesturechange', swallow, { capture: true })
      window.removeEventListener('gestureend', swallow, { capture: true })
    }
  }, [])

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
      const temporaryPan =
        e.button === 1 ||
        (e.button === 0 && e.pointerType !== 'touch' && getCanvasSpaceHeld())
      if (!panEnabled && !temporaryPan) return
      if (e.button !== 0 && e.button !== 1) return
      const target = e.target as HTMLElement
      // The mouse on an interactive child is a tap on it, never a pan. A
      // single FINGER there goes pending instead — pan if it travels past
      // the slop, tap if it lifts inside it.
      if (
        !temporaryPan &&
        panIgnoreSelector &&
        target.closest(panIgnoreSelector)
      ) {
        if (e.pointerType === 'touch') {
          pendingTouchPan.current = {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
          }
        }
        return
      }

      if (temporaryPan) e.preventDefault()
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

  useEffect(() => {
    const clear = () => {
      setCanvasSpaceHeld(false)
      setIsSpaceHeld(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return
      if (isEditableKeyboardTarget(event.target)) return
      const el = containerRef.current
      const active = document.activeElement
      if (
        !el ||
        (active instanceof Node &&
          active !== document.body &&
          !el.contains(active))
      )
        return
      setCanvasSpaceHeld(true)
      setIsSpaceHeld(true)
      event.preventDefault()
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') clear()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    return () => {
      clear()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
    }
  }, [])

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
          zoomBetweenPoints(
            pinch.x,
            pinch.y,
            midX,
            midY,
            dist / pinch.dist,
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
    [beginPan, commitTransform, syncZoomToReact, zoomBetweenPoints],
  )

  /** Capture-phase click filter: a click synthesized at the end of an
   * engaged touch pan must not reach the cell under the finger. Runs on the
   * container in capture order, so it fires before any cell's own handler. */
  const handleClickCapture = useCallback((e: ReactMouseEvent<HTMLElement>) => {
    if (!suppressNextClick.current) return
    suppressNextClick.current = false
    e.preventDefault()
    e.stopPropagation()
  }, [])

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

  // Native capture is the bug fix: React bubble pointerdown never runs when
  // a populated lane/container child stops propagation. Observing the stream
  // at the viewport boundary first preserves the pending-touch decision and
  // pointer capture regardless of descendant handlers.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const options = { capture: true } as const
    el.addEventListener('pointerdown', handlePointerDown, options)
    el.addEventListener('pointermove', handlePointerMove, options)
    el.addEventListener('pointerup', handlePointerUp, options)
    el.addEventListener('pointercancel', handlePointerUp, options)
    return () => {
      el.removeEventListener('pointerdown', handlePointerDown, options)
      el.removeEventListener('pointermove', handlePointerMove, options)
      el.removeEventListener('pointerup', handlePointerUp, options)
      el.removeEventListener('pointercancel', handlePointerUp, options)
    }
  }, [handlePointerDown, handlePointerMove, handlePointerUp])

  /**
   * The gesture is claimed OUTRIGHT, not merely declared.
   *
   * `touch-action: none` is a *declaration* the compositor consults before
   * it decides whether a touch belongs to the page or to the browser, and
   * the board is the one place where that consultation is unreliable:
   * `[data-zoom-pan-content]` carries a transform, so it is a composited
   * layer, and WebKit does not dependably resolve the property across that
   * boundary (blueprint.css says the same thing from the CSS side). When it
   * resolves to `auto`, the browser takes the touch and answers with
   * `pointercancel` — a finger on empty canvas pans, the identical finger on
   * a cell does nothing, and two fingers zoom the PAGE instead of the board.
   * That asymmetry is the whole bug report.
   *
   * `preventDefault` is not a declaration; it is the answer to a question
   * already asked, on an event the browser has already delivered, and no
   * layer boundary sits between the two. Belt and braces with the CSS: the
   * declaration keeps the compositor from ever starting the gesture on the
   * fast path, this keeps it from finishing one it started anyway.
   *
   * Both listeners are non-passive — `preventDefault` on a passive listener
   * is a no-op with a console warning — and both are scoped to the viewport
   * element, so nothing outside the canvas loses native scrolling. The cell
   * detail sheet is portalled out of this subtree and is unaffected.
   *
   * `touchstart` is prevented only for the SECOND finger. Preventing the
   * first would suppress the synthesized click that a tap depends on;
   * multi-touch synthesizes no click, and preventing it there is what stops
   * WebKit's page pinch-zoom, which `touch-action` cannot reach at all.
   */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const claimPinch = (event: TouchEvent) => {
      if (event.touches.length >= 2 && event.cancelable) event.preventDefault()
    }
    const claimMove = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault()
    }
    const options = { passive: false } as const
    el.addEventListener('touchstart', claimPinch, options)
    el.addEventListener('touchmove', claimMove, options)
    return () => {
      el.removeEventListener('touchstart', claimPinch)
      el.removeEventListener('touchmove', claimMove)
    }
  }, [])

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
    async (
      cellIds: string[],
      opts?: { animate?: boolean },
    ): Promise<FocusCellsResult> => {
      const container = containerRef.current
      const content = contentRef.current
      if (!container || !content) {
        return { kind: 'miss', missing: [...cellIds] }
      }

      focusGenerationRef.current += 1
      const generation = focusGenerationRef.current
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
      let completion: FocusCellsCompletion = 'completed'
      if (animate) completion = (await animateTransform(nextPan, nextZoom)).kind
      else commitTransform(nextPan, nextZoom, true)

      /*
        Two ways this fly-to can be stale by the time its camera move
        resolves, and they need different questions asked.

        A LATER fly-to superseding this one bumps the generation, so the
        counter catches it — without that, two sets of cells flash for one
        request.

        A move that was CANCELLED does not touch the generation, and cannot:
        the unmount path is an effect cleanup, and mutating a ref there makes
        every other write to it a lint error. It reports itself instead. A
        cancelled move means a pointerdown took over or the viewport went
        away, and in both cases the cells to pulse are either somewhere the
        reader has moved on from or detached from the document — where the
        pulse would still write attributes, force a reflow per cell, and
        leave a 1300 ms timeout pinning all of them.
      */
      if (focusGenerationRef.current !== generation) {
        return { kind: 'flown', completion }
      }
      if (completion !== 'completed') return { kind: 'flown', completion }
      pulseBlueprintCells(found)
      return { kind: 'flown', completion }
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

  const panBy = useCallback(
    (dx: number, dy: number) => {
      cancelFitAnimation()
      userAdjustedViewRef.current = true
      const current = transformRef.current
      commitTransform(
        { x: current.pan.x + dx, y: current.pan.y + dy },
        current.zoom,
        true,
      )
    },
    [cancelFitAnimation, commitTransform],
  )

  const getCameraState = useCallback(
    () => ({
      ...transformRef.current,
      moving: fitAnimationRef.current !== null,
    }),
    [],
  )

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
      if (isEditableKeyboardTarget(event.target)) return
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
    isSpaceHeld,
    fitToView,
    focusCells,
    resetView,
    zoomIn,
    zoomOut,
    panBy,
    cancelCamera: cancelFitAnimation,
    getCameraState,
    pointerHandlers: {
      onClickCapture: handleClickCapture,
    },
  }
}
