import { describe, expect, it } from 'vitest'
import {
  canPanImage,
  clickZoomImage,
  fitImageScale,
  fitImageZoom,
  isImageClick,
  panImageBy,
  resolveImageZoomCursor,
  zoomImageByFactor,
  zoomImageByGesture,
  zoomImageByWheel,
  zoomImageToScale,
  IMAGE_CLICK_DRAG_THRESHOLD_PX,
  IMAGE_ZOOM_GESTURE_MAX_NATURAL_MULTIPLE,
  IMAGE_ZOOM_MIN_CLICK_STEP,
  type ImageZoomViewport,
  type ImagePoint,
  type ImageSize,
} from '@/lib/imageZoomReducer'

const VIEWPORT = { width: 1000, height: 800 }
/** Fits at 0.5 in both axes, so every assertion below has room to zoom. */
const NATURAL = { width: 2000, height: 1600 }

const opened = () => fitImageZoom(VIEWPORT, NATURAL)

/** A point on the image, in natural pixels from its centre, under `anchor`. */
const imagePointUnder = (state: ImageZoomViewport, anchor: ImagePoint) => ({
  x: (anchor.x - state.viewport.width / 2 - state.offset.x) / state.scale,
  y: (anchor.y - state.viewport.height / 2 - state.offset.y) / state.scale,
})

const CENTRE = { x: 500, y: 400 }
const OFF_CENTRE = { x: 700, y: 600 }

describe('fitImageZoom', () => {
  it('opens at fit, centred', () => {
    expect(opened()).toEqual({
      viewport: VIEWPORT,
      natural: NATURAL,
      scale: 0.5,
      offset: { x: 0, y: 0 },
    })
  })

  it('fits to whichever axis runs out first', () => {
    expect(fitImageScale(VIEWPORT, { width: 4000, height: 1600 })).toBe(0.25)
    expect(fitImageScale(VIEWPORT, { width: 2000, height: 3200 })).toBe(0.25)
  })

  it('returns a sibling to fit rather than carrying the viewport over', () => {
    const zoomed = panImageBy(
      zoomImageToScale(opened(), 2, OFF_CENTRE),
      { x: -120, y: -90 },
    )
    expect(zoomed.scale).toBe(2)
    expect(zoomed.offset).not.toEqual({ x: 0, y: 0 })

    const sibling = fitImageZoom(zoomed.viewport, { width: 1000, height: 1000 })
    expect(sibling.scale).toBe(0.8)
    expect(sibling.offset).toEqual({ x: 0, y: 0 })
  })
})

describe('scale bounds', () => {
  it('never zooms out below fit, however hard the wheel is pushed', () => {
    const state = zoomImageByWheel(
      opened(),
      { deltaX: 0, deltaY: 400, deltaMode: 0 },
      CENTRE,
    )
    expect(state.scale).toBe(0.5)
  })

  it('never pushes a free gesture past the guard', () => {
    let state = opened()
    for (let i = 0; i < 40; i += 1) {
      state = zoomImageByWheel(
        state,
        { deltaX: 0, deltaY: -100, deltaMode: 0 },
        CENTRE,
      )
    }
    expect(state.scale).toBe(IMAGE_ZOOM_GESTURE_MAX_NATURAL_MULTIPLE)
  })

  it('opens a postage stamp at the guard, and still leaves it somewhere to go', () => {
    // Fitting a 100px picture to a 1000px viewport would blow it up ten
    // times, which is the mush the guard exists to prevent, so it opens at
    // the guard instead. What it is no longer is PINNED there: the stop
    // above fit is stated against the scale the image opened at, so a click
    // on the smallest picture in the app still does something.
    const stamp = fitImageZoom(VIEWPORT, { width: 100, height: 100 })
    expect(stamp.scale).toBe(IMAGE_ZOOM_GESTURE_MAX_NATURAL_MULTIPLE)
    expect(zoomImageToScale(stamp, 0.5, CENTRE).scale).toBe(
      IMAGE_ZOOM_GESTURE_MAX_NATURAL_MULTIPLE,
    )
    expect(clickZoomImage(stamp, CENTRE).scale).toBe(
      stamp.scale * IMAGE_ZOOM_MIN_CLICK_STEP,
    )
  })

  it('leaves an image that needs shrinking on the fit scale', () => {
    const wide = fitImageZoom(VIEWPORT, { width: 4000, height: 3200 })
    expect(wide.scale).toBe(0.25)
    expect(zoomImageToScale(wide, 0.01, CENTRE).scale).toBe(0.25)
  })
})

describe('continuous zoom', () => {
  it('keeps the point under the cursor under the cursor', () => {
    const state = opened()
    const before = imagePointUnder(state, OFF_CENTRE)
    const zoomed = zoomImageByWheel(
      state,
      { deltaX: 0, deltaY: -10, deltaMode: 0 },
      OFF_CENTRE,
    )
    expect(zoomed.scale).toBeGreaterThan(state.scale)
    const after = imagePointUnder(zoomed, OFF_CENTRE)
    expect(after.x).toBeCloseTo(before.x, 9)
    expect(after.y).toBeCloseTo(before.y, 9)
  })

  it('reads a push away as zoom out and a pull toward as zoom in', () => {
    const state = zoomImageToScale(opened(), 1.5, CENTRE)
    expect(
      zoomImageByWheel(state, { deltaX: 0, deltaY: -10, deltaMode: 0 }, CENTRE)
        .scale,
    ).toBeGreaterThan(1.5)
    expect(
      zoomImageByWheel(state, { deltaX: 0, deltaY: 10, deltaMode: 0 }, CENTRE)
        .scale,
    ).toBeLessThan(1.5)
  })

  it('normalises the wheel unit rather than trusting the raw delta', () => {
    // Three lines on Firefox move the zoom far more than three pixels do;
    // this is the shared normaliser doing its job, not this module's maths.
    const state = opened()
    const pixels = zoomImageByWheel(
      state,
      { deltaX: 0, deltaY: -3, deltaMode: 0 },
      CENTRE,
    )
    const lines = zoomImageByWheel(
      state,
      { deltaX: 0, deltaY: -3, deltaMode: 1 },
      CENTRE,
    )
    expect(lines.scale).toBeGreaterThan(pixels.scale)
  })

  it('pinches by the ratio between two cumulative gesture scales', () => {
    const state = opened()
    expect(zoomImageByGesture(state, 1, 1.5, OFF_CENTRE)).toEqual(
      zoomImageByFactor(state, 1.5, OFF_CENTRE),
    )
    // A gesture that repeats its scale asks for nothing.
    expect(zoomImageByGesture(state, 1.5, 1.5, OFF_CENTRE)).toEqual(state)
  })
})

describe('clickZoomImage', () => {
  it('goes from fit to the stop above it, about the point clicked', () => {
    const state = opened()
    const before = imagePointUnder(state, OFF_CENTRE)
    const clicked = clickZoomImage(state, OFF_CENTRE)
    // This fixture fits at 0.5, so natural size is exactly twice fit and the
    // two halves of the stop agree on scale 1.
    expect(clicked.scale).toBe(1)
    const after = imagePointUnder(clicked, OFF_CENTRE)
    expect(after.x).toBeCloseTo(before.x, 9)
    expect(after.y).toBeCloseTo(before.y, 9)
  })

  it('comes back to fit from the stop, centred again', () => {
    const stop = clickZoomImage(opened(), OFF_CENTRE)
    expect(clickZoomImage(stop, OFF_CENTRE)).toEqual(opened())
  })

  it('comes back to fit from anywhere a wheel can leave a reader, not only from the stop', () => {
    for (const scale of [0.6, 1, 1.7, 3]) {
      const between = zoomImageToScale(opened(), scale, OFF_CENTRE)
      expect(clickZoomImage(between, OFF_CENTRE)).toEqual(opened())
    }
  })

  it('has nothing between the two stops to land on, however many times it is clicked', () => {
    // The third stop is what the old pairing produced and what a click could
    // land on next to one of the others. Clicking round the loop, from
    // wherever the anchor happens to be, visits two scales and no more.
    let state = opened()
    const visited = new Set<number>()
    for (let click = 0; click < 6; click += 1) {
      state = clickZoomImage(state, click % 2 === 0 ? OFF_CENTRE : CENTRE)
      visited.add(state.scale)
    }
    expect([...visited].sort((a, b) => a - b)).toEqual([0.5, 1])
  })
})

describe('isImageClick', () => {
  it('forgives a shaky press', () => {
    expect(isImageClick({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe(true)
    expect(isImageClick({ x: 100, y: 100 }, { x: 102, y: 102 })).toBe(true)
    expect(
      isImageClick(
        { x: 100, y: 100 },
        { x: 100 + IMAGE_CLICK_DRAG_THRESHOLD_PX, y: 100 },
      ),
    ).toBe(true)
  })

  it('calls anything further a drag', () => {
    expect(isImageClick({ x: 100, y: 100 }, { x: 105, y: 100 })).toBe(false)
    expect(isImageClick({ x: 100, y: 100 }, { x: 103, y: 104 })).toBe(false)
  })
})

describe('panImageBy', () => {
  it('does nothing at fit, where there is nothing off screen to reach', () => {
    expect(panImageBy(opened(), { x: -200, y: -150 })).toEqual(opened())
  })

  it('follows the pointer once past fit', () => {
    const state = zoomImageToScale(opened(), 1, CENTRE)
    expect(panImageBy(state, { x: -120, y: -90 }).offset).toEqual({
      x: -120,
      y: -90,
    })
  })

  it('never drags an edge inside the viewport', () => {
    const state = zoomImageToScale(opened(), 1, CENTRE)
    // 2000x1600 at natural size in a 1000x800 viewport: 500px of slack each
    // way horizontally, 400 vertically.
    const dragged = panImageBy(state, { x: -9000, y: 9000 })
    expect(dragged.offset).toEqual({ x: -500, y: 400 })
    const left = dragged.offset.x - (state.natural.width * state.scale) / 2
    expect(left + state.natural.width * state.scale).toBe(
      VIEWPORT.width / 2,
    )
  })

  it('has pan room only past fit', () => {
    expect(canPanImage(opened())).toBe(false)
    expect(canPanImage(zoomImageToScale(opened(), 1, CENTRE))).toBe(true)
  })

  it('recentres an axis the image no longer fills', () => {
    const wide = fitImageZoom(VIEWPORT, { width: 4000, height: 800 })
    const state = zoomImageToScale(wide, 0.5, CENTRE)
    const dragged = panImageBy(state, { x: -400, y: -300 })
    expect(dragged.offset).toEqual({ x: -400, y: 0 })
  })
})

describe('resolveImageZoomCursor', () => {
  it('offers a zoom in at fit', () => {
    expect(resolveImageZoomCursor(opened())).toBe('zoom-in')
  })

  it('offers a grab between the stops, which is where only a wheel can leave a reader', () => {
    expect(
      resolveImageZoomCursor(zoomImageToScale(opened(), 0.75, CENTRE)),
    ).toBe('grab')
  })

  it('grabs while a drag is in progress', () => {
    expect(
      resolveImageZoomCursor(zoomImageToScale(opened(), 1, CENTRE), {
        dragging: true,
      }),
    ).toBe('grabbing')
  })

  it('offers a zoom out at the stop, and above it, where a click returns to fit', () => {
    expect(resolveImageZoomCursor(zoomImageToScale(opened(), 1, CENTRE))).toBe(
      'zoom-out',
    )
    // Wheeled past the stop the click still has only fit to offer, and says so.
    expect(resolveImageZoomCursor(zoomImageToScale(opened(), 3, CENTRE))).toBe(
      'zoom-out',
    )
  })
})

describe('degenerate sizes', () => {
  it('survives a viewport or an image that has not been measured yet', () => {
    const unmeasured = fitImageZoom({ width: 0, height: 0 }, NATURAL)
    expect(unmeasured.scale).toBe(1)
    expect(unmeasured.offset).toEqual({ x: 0, y: 0 })
    expect(panImageBy(unmeasured, { x: 40, y: 40 }).offset).toEqual({
      x: 0,
      y: 0,
    })
    expect(zoomImageByFactor(unmeasured, Number.NaN, CENTRE)).toEqual(
      unmeasured,
    )
  })
})

describe('the two stops, over every shape a reader can hand the viewer', () => {
  /*
    Properties, not a table of scales.

    The pairing this replaced was found by a reader on one viewport at a
    time, three times over, because what was asserted each time was the
    number that viewport produced. A number is true until the next display
    is wider than the last one. So every rule below is a RELATIONSHIP — a
    ratio, an inequality, one function agreeing with another — asserted over
    a sweep of viewports and image sizes rather than over the one fixture
    the rest of this file uses.
  */
  const VIEWPORTS: ImageSize[] = [
    { width: 320, height: 568 }, // a phone
    { width: 768, height: 1024 }, // a tablet, upright
    { width: 1000, height: 750 },
    { width: 1253, height: 940 }, // an odd width, on purpose
    { width: 1440, height: 900 },
    { width: 2400, height: 1300 },
    { width: 3840, height: 2160 }, // where fit outruns natural size entirely
  ]

  const NATURALS: ImageSize[] = [
    { width: 880, height: 660 }, // a cover figure, authored at 880
    { width: 2000, height: 1600 }, // a screenshot bigger than most viewports
    { width: 8000, height: 4500 }, // a very large screenshot
    { width: 100, height: 100 }, // a postage stamp, whose fit outruns the guard
    { width: 2000, height: 1 }, // a one-pixel strip
    { width: 1, height: 2000 }, // and the same strip stood on its end
  ]

  const SHAPES = VIEWPORTS.flatMap((viewport) =>
    NATURALS.map((natural) => ({
      viewport,
      natural,
      /** Named, so a failure says which shape rather than which index. */
      shape:
        `${viewport.width}x${viewport.height} viewport, ` +
        `${natural.width}x${natural.height} image`,
    })),
  )

  const middleOf = (viewport: ImageSize): ImagePoint => ({
    x: viewport.width / 2,
    y: viewport.height / 2,
  })

  /** The two scales this shape offers a click, and where to aim it. */
  const stopsOf = (viewport: ImageSize, natural: ImageSize) => {
    const anchor = middleOf(viewport)
    const fit = fitImageZoom(viewport, natural)
    return { anchor, fit, stop: clickZoomImage(fit, anchor) }
  }

  /** How large a change a click made, as a ratio, whichever way it went. */
  const jump = (from: number, to: number) => Math.max(from / to, to / from)

  it('always moves the scale by a visible factor, in both directions', () => {
    const invisible = SHAPES.flatMap(({ viewport, natural, shape }) => {
      const { anchor, fit, stop } = stopsOf(viewport, natural)
      const back = clickZoomImage(stop, anchor)
      return [
        { shape, going: 'in', ratio: jump(fit.scale, stop.scale) },
        { shape, going: 'out', ratio: jump(stop.scale, back.scale) },
      ].filter(({ ratio }) => ratio < IMAGE_ZOOM_MIN_CLICK_STEP)
    })
    expect(invisible).toEqual([])
  })

  it('never puts the stop below twice fit, at any viewport', () => {
    const tooClose = SHAPES.filter(({ viewport, natural }) => {
      const { fit, stop } = stopsOf(viewport, natural)
      return stop.scale < fit.scale * IMAGE_ZOOM_MIN_CLICK_STEP
    }).map(({ shape }) => shape)
    expect(tooClose).toEqual([])
  })

  it('puts the stop AT natural size wherever natural size is at least twice fit', () => {
    const wrong = SHAPES.filter(({ viewport, natural }) => {
      const { fit, stop } = stopsOf(viewport, natural)
      // Scale is a multiple of natural size, so natural size is scale 1.
      if (1 < fit.scale * IMAGE_ZOOM_MIN_CLICK_STEP) return false
      return stop.scale !== 1
    }).map(({ shape }) => shape)
    expect(wrong).toEqual([])
    // The premise is worth counting: a rule about the shapes where natural
    // size is reachable says nothing if the sweep contains none of them.
    const reachable = SHAPES.filter(
      ({ viewport, natural }) =>
        1 >= stopsOf(viewport, natural).fit.scale * IMAGE_ZOOM_MIN_CLICK_STEP,
    )
    expect(reachable.length).toBeGreaterThan(0)
  })

  it('returns to fit from the stop and from every scale between them', () => {
    const stranded = SHAPES.flatMap(({ viewport, natural, shape }) => {
      const { anchor, fit, stop } = stopsOf(viewport, natural)
      const span = stop.scale - fit.scale
      return [0.25, 0.5, 0.75, 1]
        .map((part) => zoomImageToScale(fit, fit.scale + span * part, anchor))
        .map((state) => ({
          shape,
          from: state.scale,
          to: clickZoomImage(state, anchor).scale,
        }))
        .filter((row) => row.to !== fit.scale)
    })
    expect(stranded).toEqual([])
  })

  it('says zoom-in exactly where a click zooms in, and zoom-out only where one does not', () => {
    const disagreements = SHAPES.flatMap(({ viewport, natural, shape }) => {
      const { anchor, fit, stop } = stopsOf(viewport, natural)
      const span = stop.scale - fit.scale
      return [fit.scale, fit.scale + span / 2, stop.scale, stop.scale * 1.5]
        .map((scale) => zoomImageToScale(fit, scale, anchor))
        .map((state) => ({
          shape,
          scale: state.scale,
          cursor: resolveImageZoomCursor(state),
          zoomsIn: clickZoomImage(state, anchor).scale > state.scale,
        }))
        .filter(
          (row) =>
            (row.cursor === 'zoom-in') !== row.zoomsIn ||
            (row.cursor === 'zoom-out' && row.zoomsIn),
        )
    })
    expect(disagreements).toEqual([])
  })

  it('leaves the wheel free-range: it passes the stops rather than snapping to them', () => {
    const wrong = SHAPES.flatMap(({ viewport, natural, shape }) => {
      const { anchor, fit, stop } = stopsOf(viewport, natural)
      const notch = zoomImageByWheel(
        fit,
        { deltaX: 0, deltaY: -10, deltaMode: 0 },
        anchor,
      )
      let pushed = fit
      for (let push = 0; push < 200; push += 1) {
        pushed = zoomImageByWheel(
          pushed,
          { deltaX: 0, deltaY: -100, deltaMode: 0 },
          anchor,
        )
      }
      const rows: { shape: string; wrong: string; scale: number }[] = []
      const wrongly = (about: string, scale: number) =>
        rows.push({ shape, wrong: about, scale })
      if (!(notch.scale > fit.scale && notch.scale < stop.scale)) {
        wrongly('one notch did not land between the stops', notch.scale)
      }
      if (pushed.scale < IMAGE_ZOOM_GESTURE_MAX_NATURAL_MULTIPLE) {
        wrongly('the wheel stopped short of the guard', pushed.scale)
      }
      if (pushed.scale < stop.scale) {
        wrongly('the wheel could not reach the click stop', pushed.scale)
      }
      return rows
    })
    expect(wrong).toEqual([])
  })
})
