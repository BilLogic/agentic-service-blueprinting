import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import {
  canPanImage,
  clickZoomImage,
  fitImageZoom,
  isImageClick,
  panImageBy,
  resolveImageZoomCursor,
  zoomImageByFactor,
  zoomImageByGesture,
  zoomImageByWheel,
  type ImagePoint,
  type ImageSize,
  type ImageZoomCursor,
  type ImageZoomViewport,
} from '@/lib/imageZoomReducer'
import { shouldApplyGestureZoom } from '@/lib/canvasGestureZoom'
import { prefersReducedMotion } from '@/lib/motion'

/**
 * The DOM half of the image viewer: nodes, events, and the transform.
 *
 * Every decision about scale and offset belongs to `imageZoomReducer` and is
 * only CALLED from here — this file measures two boxes, turns pointer and
 * wheel events into anchors, and writes the result onto an element. That
 * split is the whole reason the reducer is pure: the arithmetic is argued
 * about in a test with no DOM, and what is left here is wiring.
 *
 * Explicitly NOT `useZoomPanViewport`. The board's camera is wired to
 * artboards, focus cells, an annotation layer, agent commands and a
 * semantic-zoom threshold, none of which an image has; sharing it would mean
 * a change to image zoom could regress the board. What IS shared is the
 * arithmetic underneath, through the reducer's own imports.
 *
 * Nodes are held in state rather than in refs. The popup mounts when the
 * dialog opens, so an effect that read a ref once, at a moment the popup did
 * not exist, would attach its wheel listener to nothing and never retry.
 */

/** A box that has not been measured yet — fit of an unmeasured box is 1. */
const UNMEASURED: ImageSize = { width: 0, height: 0 }

/**
 * How far a press must travel sideways before it is a swipe to a sibling.
 *
 * Comfortably clear of `IMAGE_CLICK_DRAG_THRESHOLD_PX`, which is four: the
 * two thresholds answer different questions on the same gesture, and a
 * number close to the click threshold would turn every slightly-dragged
 * press at fit into a step. A layout number, and TypeScript owns this
 * project's layout numbers, so it is stated here rather than hidden in a
 * media query.
 */
const IMAGE_SWIPE_STEP_THRESHOLD_PX = 48

/**
 * The spread between two contacts, and the point half way between them.
 *
 * Module scope because it closes over nothing: defined in the component it
 * would be rebuilt every render and captured by callbacks that do not list
 * it, which reads as a stale closure even where it cannot be one.
 */
function pinchOf(points: ImagePoint[]) {
  const [a, b] = points
  if (!a || !b) return null
  return {
    distance: Math.hypot(b.x - a.x, b.y - a.y),
    centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  }
}

/**
 * WebKit's pinch, which no `lib.dom` type describes.
 *
 * Safari alone ships `gesturestart`/`gesturechange`/`gestureend`, and on a
 * macOS trackpad they are the ONLY thing a pinch produces — no touch
 * pointers, no synthesised ctrl+wheel. Unprevented, `gesturestart` zooms the
 * page rather than the picture.
 */
type WebKitGestureEvent = Event & {
  scale?: number
  clientX?: number
  clientY?: number
}

export type UseImageZoomResult = {
  /** The popup, whose whole area — margin included — takes the wheel. */
  popupRef: (node: HTMLElement | null) => void
  /** The box the image is fitted to and clipped by. */
  viewportRef: (node: HTMLElement | null) => void
  imageRef: (node: HTMLImageElement | null) => void
  /** Re-reads both boxes; the image's `load` is the event that needs it. */
  measure: () => void
  /**
   * Returns the view to fit whether or not either box changed size.
   *
   * `measure` deliberately does nothing when both boxes measure the same,
   * and a step from one sibling to the next usually IS the same: a row of
   * lane frames is a row of screenshots at one size. Stepping has to reset
   * the scale and the pan regardless, so it has its own way in.
   */
  reset: () => void
  /** Which CSS cursor this state implies, straight from the reducer. */
  cursor: ImageZoomCursor
  /**
   * Whether this transform should be tweened. Discrete steps are; continuous
   * gestures are not, because a tween on a gesture the hand is still making
   * reads as lag. Reduced motion drops it in both cases.
   */
  animated: boolean
  imageStyle: CSSProperties
  imageHandlers: {
    onPointerDown: (event: ReactPointerEvent<HTMLImageElement>) => void
    onPointerMove: (event: ReactPointerEvent<HTMLImageElement>) => void
    onPointerUp: (event: ReactPointerEvent<HTMLImageElement>) => void
    onPointerCancel: (event: ReactPointerEvent<HTMLImageElement>) => void
    onClick: (event: ReactMouseEvent<HTMLImageElement>) => void
  }
}

/** A press in flight: where it started, where it last was, and whether it pans. */
type DragState = {
  pointerId: number
  start: ImagePoint
  last: ImagePoint
  /** Set once the press has travelled past the click threshold. */
  panning: boolean
}

export function useImageZoom({
  naturalWidth,
  naturalHeight,
  onSwipeStep,
}: {
  /**
   * The image's authored size, when the caller knows it.
   *
   * `naturalWidth` is not trustworthy for the asset class this viewer was
   * built for. An SVG authored with a `viewBox` and no root `width`/`height`
   * has no intrinsic size, and the browser answers with its default box —
   * Chrome reports 300 wide for an 880px diagram — which the reducer then
   * correctly fits and correctly holds at the guard, to a picture three
   * times too small. Where an adopter carries the authored numbers, they are
   * the truth and `naturalWidth` is a guess; where it does not, a raster
   * screenshot reports its own size honestly and the guess is the truth.
   */
  naturalWidth?: number
  naturalHeight?: number
  /**
   * A horizontal swipe, as a step through whatever the caller's siblings
   * are: `1` forward, `-1` back. This hook has no idea a group exists — it
   * reports the gesture and `ZoomableImage` decides what it means.
   *
   * Only ever called AT FIT, so the swipe cannot steal the pan gesture from
   * a zoomed image. `canPanImage` is the gate, and it is exactly the right
   * one rather than an approximation of the scale: pan limits are zero on
   * both axes precisely when the image overflows neither, which is true at
   * or below fit and false at every scale above it. So "there is no pan to
   * steal here" and "this is fit" are the same sentence.
   */
  onSwipeStep?: (step: 1 | -1) => void
} = {}): UseImageZoomResult {
  const [popupNode, setPopupNode] = useState<HTMLElement | null>(null)
  const [viewportNode, setViewportNode] = useState<HTMLElement | null>(null)
  const [imageNode, setImageNode] = useState<HTMLImageElement | null>(null)

  const [state, setState] = useState<ImageZoomViewport>(() =>
    fitImageZoom(UNMEASURED, UNMEASURED),
  )
  const [dragging, setDragging] = useState(false)
  const [animated, setAnimated] = useState(false)

  /**
   * The state, readable synchronously.
   *
   * A wheel arrives as dozens of events inside one React commit and a drag as
   * one per frame; reading `state` from a handler's closure would compound
   * every one of them onto the same stale scale. The ref is the value each
   * gesture builds on, and `setState` exists to render it.
   */
  const stateRef = useRef(state)
  const dragRef = useRef<DragState | null>(null)
  /** Set on release when the press panned: the click that follows is not one. */
  const draggedRef = useRef(false)
  /**
   * Every touch contact currently down on the image, by pointer id.
   *
   * The canvas keeps the same map for the same reason: two fingers are a
   * pinch, and a pinch is not something the single-pointer drag path above
   * can express. It is also the gate on Safari's `gesture*` events — see the
   * gesture effect, which now has a second pinch mechanism to collide with
   * where it once had none.
   */
  const touchPoints = useRef(new Map<number, ImagePoint>())
  /** The finger spread this pinch was last measured at, in CSS pixels. */
  const pinchDistanceRef = useRef<number | null>(null)
  /**
   * Whether the press in flight came from a finger.
   *
   * A tap must not zoom: on touch, tap-to-zoom fights the tap-to-dismiss
   * habit every other fullscreen image on the device has taught. `click` and
   * `dblclick` are `MouseEvent`s and carry no `pointerType` of their own, so
   * the answer is recorded on the way down and read on the way out.
   */
  const touchPressRef = useRef(false)
  /** Held in a ref so an inline callback from the adopter is not a dependency. */
  const swipeRef = useRef(onSwipeStep)
  useEffect(() => {
    swipeRef.current = onSwipeStep
  }, [onSwipeStep])

  const apply = useCallback(
    (next: (current: ImageZoomViewport) => ImageZoomViewport, tween: boolean) => {
      const result = next(stateRef.current)
      if (result === stateRef.current) return
      stateRef.current = result
      setAnimated(tween && !prefersReducedMotion())
      setState(result)
    },
    [],
  )

  /**
   * Both boxes, re-read.
   *
   * `clientWidth`/`clientHeight` rather than `getBoundingClientRect`: the
   * popup carries an entrance transform, and a rect is scaled by it while a
   * layout size is not. Measuring during the entrance would otherwise fit the
   * image to 95% of the viewport and never correct itself, since a transform
   * fires no resize.
   *
   * A measurement always returns to fit. A viewport that changed size has a
   * different fit scale and a different pan limit, and re-deriving both from
   * the new box is more honest than carrying a scale that was chosen for the
   * old one. It is also what resets the viewer between openings: on close the
   * nodes go, the boxes measure zero, and the next opening starts at fit.
   *
   * `force` is what a sibling step needs. Two frames of one step are usually
   * the same size, so a step would measure identical boxes, take the early
   * return, and hand the reader the next picture at the scale and pan they
   * had built up on the last one — which is precisely what stepping is
   * specified NOT to do.
   */
  const fitToBoxes = useCallback(
    (force: boolean) => {
      const viewport: ImageSize = viewportNode
        ? { width: viewportNode.clientWidth, height: viewportNode.clientHeight }
        : UNMEASURED
      const authored =
        naturalWidth && naturalHeight
          ? { width: naturalWidth, height: naturalHeight }
          : null
      const measured = imageNode
        ? { width: imageNode.naturalWidth, height: imageNode.naturalHeight }
        : UNMEASURED
      // Only while the popup is mounted: on close the nodes go, and an
      // authored size that outlived them would keep the viewer measured.
      const natural: ImageSize = imageNode ? (authored ?? measured) : UNMEASURED
      const current = stateRef.current
      if (
        !force &&
        current.viewport.width === viewport.width &&
        current.viewport.height === viewport.height &&
        current.natural.width === natural.width &&
        current.natural.height === natural.height
      ) {
        return
      }
      stateRef.current = fitImageZoom(viewport, natural)
      setAnimated(false)
      setState(stateRef.current)
    },
    [imageNode, naturalHeight, naturalWidth, viewportNode],
  )

  const measure = useCallback(() => fitToBoxes(false), [fitToBoxes])
  const reset = useCallback(() => fitToBoxes(true), [fitToBoxes])

  /**
   * Measured in a layout effect so the first painted frame is already fitted,
   * and re-measured on `load` for an image whose pixels arrive later. A
   * cached image is already `complete` by the time the ref lands, which is
   * why this cannot be left to `load` alone.
   */
  useLayoutEffect(() => {
    measure()
  }, [measure])

  useEffect(() => {
    if (!viewportNode) return
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    // jsdom ships no ResizeObserver, and the window resize above is the
    // coarse half of the same job — so its absence degrades rather than throws.
    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null
    observer?.observe(viewportNode)
    return () => {
      window.removeEventListener('resize', onResize)
      observer?.disconnect()
    }
  }, [measure, viewportNode])

  /** A client point as the reducer wants it: CSS pixels from the box's corner. */
  const anchorAt = useCallback(
    (clientX: number, clientY: number): ImagePoint => {
      const box = viewportNode?.getBoundingClientRect()
      if (!box) return { x: clientX, y: clientY }
      return { x: clientX - box.left, y: clientY - box.top }
    },
    [viewportNode],
  )

  /**
   * The wheel, bound to the POPUP rather than to the image.
   *
   * A reader whose pointer has drifted into the empty margin is still inside
   * the viewer, and a gesture that dies over part of the surface reads as
   * broken. `{ passive: false }` is what makes `preventDefault` legal, and
   * preventing it is what stops the page behind scrolling under the popup.
   */
  useEffect(() => {
    if (!popupNode) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const anchor = anchorAt(event.clientX, event.clientY)
      apply((current) => zoomImageByWheel(current, event, anchor), false)
    }
    popupNode.addEventListener('wheel', onWheel, { passive: false })
    return () => popupNode.removeEventListener('wheel', onWheel)
  }, [anchorAt, apply, popupNode])

  /**
   * Safari's pinch — prevented on the page, applied to the picture.
   *
   * Gated on the touch-pointer count, exactly as the canvas gates it, and
   * for the reason the canvas discovered. On macOS a trackpad pinch produces
   * gesture events and nothing else, so without this handler there is no
   * pinch at all; on iOS the same pinch is ALSO a pair of touch pointers,
   * and the map below zooms from them — applying both would square every
   * step. `shouldApplyGestureZoom` is the one place that judgement lives.
   *
   * This gate is new in this slice. Slice two's version of this comment said
   * there was nothing to gate, and it was right: the viewer had no second
   * pinch mechanism until the touch path below was added for the phone.
   *
   * Bound on the window in capture and filtered by containment, as the canvas
   * binds it — `gesture*` reach the window whatever they are dispatched on.
   */
  useEffect(() => {
    if (!popupNode) return
    let previousScale = 1
    const inPopup = (event: Event) =>
      event.target instanceof Node && popupNode.contains(event.target)
    const onGestureStart = (event: Event) => {
      if (!inPopup(event)) return
      event.preventDefault()
      previousScale = 1
    }
    const onGestureChange = (event: Event) => {
      if (!inPopup(event)) return
      event.preventDefault()
      if (!shouldApplyGestureZoom(touchPoints.current.size)) return
      const gesture = event as WebKitGestureEvent
      const nextScale = gesture.scale ?? previousScale
      const box = popupNode.getBoundingClientRect()
      const anchor = anchorAt(
        gesture.clientX ?? box.left + box.width / 2,
        gesture.clientY ?? box.top + box.height / 2,
      )
      const from = previousScale
      if (Number.isFinite(gesture.scale)) previousScale = nextScale
      apply(
        (current) => zoomImageByGesture(current, from, nextScale, anchor),
        false,
      )
    }
    const onGestureEnd = (event: Event) => {
      if (!inPopup(event)) return
      event.preventDefault()
      previousScale = 1
    }
    const options = { passive: false, capture: true } as const
    window.addEventListener('gesturestart', onGestureStart, options)
    window.addEventListener('gesturechange', onGestureChange, options)
    window.addEventListener('gestureend', onGestureEnd, options)
    return () => {
      window.removeEventListener('gesturestart', onGestureStart, {
        capture: true,
      })
      window.removeEventListener('gesturechange', onGestureChange, {
        capture: true,
      })
      window.removeEventListener('gestureend', onGestureEnd, { capture: true })
    }
  }, [anchorAt, apply, popupNode])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLImageElement>) => {
      if (event.button !== 0) return
      const point = { x: event.clientX, y: event.clientY }
      touchPressRef.current = event.pointerType === 'touch'
      if (event.pointerType === 'touch') {
        touchPoints.current.set(event.pointerId, point)
        if (touchPoints.current.size >= 2) {
          // A second finger: whatever the first one was doing, this is a
          // pinch now. The drag is abandoned rather than finished, so the
          // pinch does not also pan by the midpoint's drift.
          const pinch = pinchOf([...touchPoints.current.values()])
          pinchDistanceRef.current = pinch?.distance ?? null
          dragRef.current = null
          draggedRef.current = true
          setDragging(false)
          return
        }
      }
      dragRef.current = {
        pointerId: event.pointerId,
        start: point,
        last: point,
        panning: false,
      }
      draggedRef.current = false
      // The pointer leaves a zoomed image long before the drag ends.
      event.currentTarget.setPointerCapture?.(event.pointerId)
    },
    [],
  )

  /**
   * Pan, but not before the press has proved it is a drag.
   *
   * `isImageClick` holds the press still inside the threshold, so the shaky
   * three-pixel press that the reducer promises still counts as a click also
   * moves the image not at all. The first pan once the threshold breaks
   * carries the whole travel since the press, because `last` is still where
   * the press went down.
   */
  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLImageElement>) => {
      if (
        event.pointerType === 'touch' &&
        touchPoints.current.has(event.pointerId)
      ) {
        touchPoints.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        })
        if (touchPoints.current.size >= 2) {
          const pinch = pinchOf([...touchPoints.current.values()])
          const from = pinchDistanceRef.current
          if (pinch && from != null && from > 0 && pinch.distance > 0) {
            pinchDistanceRef.current = pinch.distance
            const anchor = anchorAt(pinch.centre.x, pinch.centre.y)
            // Continuous, so untweened — the same rule the wheel follows.
            apply(
              (current) =>
                zoomImageByFactor(current, pinch.distance / from, anchor),
              false,
            )
          }
          return
        }
      }
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      const point = { x: event.clientX, y: event.clientY }
      if (!drag.panning) {
        if (isImageClick(drag.start, point)) return
        drag.panning = true
        setDragging(true)
      }
      const delta = { x: point.x - drag.last.x, y: point.y - drag.last.y }
      drag.last = point
      apply((current) => panImageBy(current, delta), false)
    },
    [anchorAt, apply],
  )

  /**
   * The release, which is also where a swipe is finally recognisable.
   *
   * It cannot be decided on the way in: a press that travels sideways is a
   * pan on a zoomed image and a step on a fitted one, and the only thing
   * that separates a step from a wobble is how far it got by the end.
   */
  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLImageElement>) => {
      if (event.pointerType === 'touch') {
        touchPoints.current.delete(event.pointerId)
        if (touchPoints.current.size < 2) pinchDistanceRef.current = null
      }
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      dragRef.current = null
      draggedRef.current = drag.panning
      setDragging(false)

      const travel = {
        x: event.clientX - drag.start.x,
        y: event.clientY - drag.start.y,
      }
      if (
        swipeRef.current &&
        // At fit, and only at fit: above it this same press was the pan.
        !canPanImage(stateRef.current) &&
        Math.abs(travel.x) >= IMAGE_SWIPE_STEP_THRESHOLD_PX &&
        // Sideways, not merely far. A diagonal flick that travelled further
        // down than across is not a reader asking for the next sibling.
        Math.abs(travel.x) > Math.abs(travel.y)
      ) {
        // Dragging left brings the next sibling in from the right, the
        // direction every carousel on the device already means by it.
        swipeRef.current(travel.x < 0 ? 1 : -1)
      }
      // `releasePointerCapture` throws `NotFoundError` for an id the element
      // no longer holds, and mid-drag that is ordinary rather than a bug: a
      // `pointercancel` from an OS edge swipe releases capture on the way out,
      // so the teardown that follows is giving back something already gone.
      // The drag state above is cleared first, so a throw here would strand
      // nothing — but this repository has been bitten twice by the bare call
      // (`ResizableComparePanel`, then `CanvasAnnotationLayer`, which carries
      // the long version of this note), and an uncaught throw out of an event
      // handler is not the house style. Fourth site, same guard.
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // Already released, or never captured.
      }
    },
    [],
  )

  /**
   * A click on the image: the stop above fit, or back to fit from anywhere
   * that is not fit.
   *
   * The second click of a double click is stepped over rather than applied.
   * `detail` is 2 there, and with a single stop above fit a second toggle
   * would only undo the first, so a double click would zoom in and back out
   * under the reader's hand. Stepping it over is what makes a double click
   * land where the single click did rather than nowhere. The FIRST click is
   * not stepped over, because nothing yet says a second is coming; a timer
   * would be the only way to know, and this viewer refuses timers for the
   * same reason the reducer does.
   *
   * A TAP does not zoom. Every fullscreen image on a phone has taught the
   * reader that a tap dismisses, and a viewer that zoomed instead would
   * spend that habit on the one gesture it cannot afford to surprise anyone
   * with. Pinch, drag and swipe are the touch gesture set; the tap is left
   * meaning nothing here rather than made to mean two things.
   */
  const onClick = useCallback(
    (event: ReactMouseEvent<HTMLImageElement>) => {
      if (draggedRef.current) {
        draggedRef.current = false
        return
      }
      if (touchPressRef.current) return
      if (event.detail >= 2) return
      const anchor = anchorAt(event.clientX, event.clientY)
      apply((current) => clickZoomImage(current, anchor), true)
    },
    [anchorAt, apply],
  )

  const imageStyle = useMemo<CSSProperties>(() => {
    const { natural, scale, offset } = state
    return {
      width: natural.width || undefined,
      height: natural.height || undefined,
      /*
        Read right to left. `translate(-50%, -50%)` puts the image's own
        centre on the origin, `scale` grows it about that centre, and the
        pixel translate is the offset the reducer holds — the centre's
        displacement from the viewport centre, which is what the element's
        `top: 50%; left: 50%` has already put the origin at. Ordered any
        other way the half-size shift would be taken at the wrong scale.
      */
      transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) translate(-50%, -50%)`,
    }
  }, [state])

  return {
    popupRef: setPopupNode,
    viewportRef: setViewportNode,
    imageRef: setImageNode,
    measure,
    reset,
    cursor: resolveImageZoomCursor(state, { dragging }),
    animated,
    imageStyle,
    imageHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClick,
    },
  }
}
