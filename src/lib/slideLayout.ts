import {
  getMainSlides,
  getSubslides,
  isSubslide,
  type Slide,
} from '@/types/slides'
import {
  getBlueprintArtboardSize,
  type ArtboardSize,
} from '@/lib/blueprintLayout'
import type { BlueprintData } from '@/types/blueprint'

export const CANVAS_WIDTH = 16000
export const CANVAS_HEIGHT = 6000
export const SLIDE_ARTBOARD_WIDTH = 960
export const SLIDE_ARTBOARD_HEIGHT = (SLIDE_ARTBOARD_WIDTH * 9) / 16
export const SLIDE_GAP = 160
export const SUBSLIDE_GAP = 96
/** Equal gray margin around blueprint artboards in the stack zoom viewport. */
export const BLUEPRINT_VIEWPORT_ARTBOARD_MARGIN = 48
/** Extra top inset so fit-to-view centers below sticky menubar overlays. */
export const BLUEPRINT_VIEWPORT_FIT_TOP_INSET = 56
/** Space between a canvas artboard and the header card above it. */
export const CANVAS_SLIDE_HEADER_GAP = 16
/** Reserved vertical space for the header card above each canvas artboard. */
export const CANVAS_SLIDE_HEADER_ESTIMATED_HEIGHT = 96
export const CANVAS_SLIDE_HEADER_BLOCK =
  CANVAS_SLIDE_HEADER_GAP + CANVAS_SLIDE_HEADER_ESTIMATED_HEIGHT

export const DEFAULT_ARTBOARD_SIZE: ArtboardSize = {
  width: SLIDE_ARTBOARD_WIDTH,
  height: SLIDE_ARTBOARD_HEIGHT,
}

export type SlidePosition = { x: number; y: number }
export type SlideLayout = SlidePosition & ArtboardSize

export function getSlideArtboardSize(
  slide: Slide,
  blueprintsByScenario: Map<string, BlueprintData>,
): ArtboardSize {
  if (!isSubslide(slide)) return DEFAULT_ARTBOARD_SIZE
  const blueprint = blueprintsByScenario.get(slide.id)
  if (blueprint) return getBlueprintArtboardSize(blueprint)
  return DEFAULT_ARTBOARD_SIZE
}

/** Main slides stacked vertically; scenarios extend horizontally with per-slide widths. */
export function computeSlideLayouts(
  slides: Slide[],
  blueprintsByScenario: Map<string, BlueprintData> = new Map(),
  layoutOverrides: Map<string, ArtboardSize> = new Map(),
): Map<string, SlideLayout> {
  const layouts = new Map<string, SlideLayout>()
  const mains = getMainSlides(slides)

  const stackHeight =
    mains.length * (CANVAS_SLIDE_HEADER_BLOCK + SLIDE_ARTBOARD_HEIGHT) +
    Math.max(0, mains.length - 1) * SLIDE_GAP
  const stackTop = (CANVAS_HEIGHT - stackHeight) / 2
  const mainX = (CANVAS_WIDTH - SLIDE_ARTBOARD_WIDTH) / 2

  let mainRowY = stackTop
  mains.forEach((slide) => {
    layouts.set(slide.id, {
      x: mainX,
      y: mainRowY + CANVAS_SLIDE_HEADER_BLOCK,
      ...DEFAULT_ARTBOARD_SIZE,
    })
    mainRowY +=
      CANVAS_SLIDE_HEADER_BLOCK + SLIDE_ARTBOARD_HEIGHT + SLIDE_GAP
  })

  for (const main of mains) {
    const parent = layouts.get(main.id)
    if (!parent) continue

    const children = getSubslides(main.id, slides)
    let cursorX = parent.x + parent.width + SUBSLIDE_GAP

    children.forEach((child) => {
      const size =
        layoutOverrides.get(child.id) ??
        getSlideArtboardSize(child, blueprintsByScenario)
      layouts.set(child.id, {
        x: cursorX,
        y: parent.y,
        ...size,
      })
      cursorX += size.width + SUBSLIDE_GAP
    })
  }

  return layouts
}

export function computeSlidePositions(
  slides: Slide[],
  blueprintsByScenario?: Map<string, BlueprintData>,
): Map<string, SlidePosition> {
  const layouts = computeSlideLayouts(slides, blueprintsByScenario)
  const positions = new Map<string, SlidePosition>()
  layouts.forEach((layout, id) => {
    positions.set(id, { x: layout.x, y: layout.y })
  })
  return positions
}

export function getSlideLayout(
  slideId: string,
  slides: Slide[],
  blueprintsByScenario?: Map<string, BlueprintData>,
): SlideLayout {
  const layouts = computeSlideLayouts(slides, blueprintsByScenario)
  return (
    layouts.get(slideId) ?? {
      x: (CANVAS_WIDTH - SLIDE_ARTBOARD_WIDTH) / 2,
      y: (CANVAS_HEIGHT - SLIDE_ARTBOARD_HEIGHT) / 2,
      ...DEFAULT_ARTBOARD_SIZE,
    }
  )
}

export function getSlideCanvasPosition(
  slideId: string,
  slides: Slide[],
  blueprintsByScenario?: Map<string, BlueprintData>,
): SlidePosition {
  const { x, y } = getSlideLayout(slideId, slides, blueprintsByScenario)
  return { x, y }
}

export function getSlideCanvasCenter(
  slideId: string,
  slides: Slide[],
  blueprintsByScenario?: Map<string, BlueprintData>,
) {
  const layout = getSlideLayout(slideId, slides, blueprintsByScenario)
  return {
    x: layout.x + layout.width / 2,
    y: layout.y + layout.height / 2,
  }
}

export type OverviewBounds = {
  minX: number
  minY: number
  width: number
  height: number
}

/** Bounding box of all slide artboards including header blocks. */
export function getOverviewBounds(
  layouts: Map<string, SlideLayout>,
): OverviewBounds | null {
  if (layouts.size === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  layouts.forEach((layout) => {
    minX = Math.min(minX, layout.x)
    minY = Math.min(minY, layout.y - CANVAS_SLIDE_HEADER_BLOCK)
    maxX = Math.max(maxX, layout.x + layout.width)
    maxY = Math.max(maxY, layout.y + layout.height)
  })

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/** Pan/zoom to fit the full service overview inside a viewport. */
export function computeOverviewFit(
  bounds: OverviewBounds,
  viewportWidth: number,
  viewportHeight: number,
  padding = 64,
): { pan: { x: number; y: number }; zoom: number } {
  const availableWidth = Math.max(viewportWidth - padding * 2, 1)
  const availableHeight = Math.max(viewportHeight - padding * 2, 1)
  const zoom = Math.min(
    availableWidth / bounds.width,
    availableHeight / bounds.height,
    1,
  )
  const centerX = bounds.minX + bounds.width / 2
  const centerY = bounds.minY + bounds.height / 2

  return {
    zoom,
    pan: {
      x: viewportWidth / 2 - centerX * zoom,
      y: viewportHeight / 2 - centerY * zoom,
    },
  }
}
