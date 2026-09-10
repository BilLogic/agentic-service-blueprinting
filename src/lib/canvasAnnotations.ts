
export type CanvasAnnotationTool =
  | 'select'
  /**
   * Pan without selecting. Only offered in Edit mode: View's Select already
   * pans, because there is nothing there for a drag to mean instead.
   */
  | 'hand'
  | 'pen'
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'sticky'
  | 'eraser'

export type CanvasPoint = { x: number; y: number }

type AnnotationBase = {
  id: string
  color: string
}

export type PenAnnotation = AnnotationBase & {
  type: 'pen'
  points: CanvasPoint[]
  strokeWidth: number
}

export type ShapeAnnotation = Omit<AnnotationBase, 'color'> & {
  type: 'rect' | 'ellipse'
  x: number
  y: number
  width: number
  height: number
  strokeWidth: number
  /** Outline color; `null` = no outline. */
  color: string | null
  /** `null` = no fill (outline only). */
  fillColor: string | null
  text: string
}

export type TextAnnotation = AnnotationBase & {
  type: 'text'
  x: number
  y: number
  text: string
  fontSize: number
  bold?: boolean
  strike?: boolean
  align?: 'left' | 'center' | 'right'
}

export type StickyAnnotation = AnnotationBase & {
  type: 'sticky'
  x: number
  y: number
  width: number
  height: number
  text: string
  fontSize: number
  bold?: boolean
  strike?: boolean
}

export type CanvasAnnotation =
  | PenAnnotation
  | ShapeAnnotation
  | TextAnnotation
  | StickyAnnotation

export const ANNOTATION_INK: string = 'var(--color-slate-1200)'
export const ANNOTATION_PAPER: string = 'var(--color-gray-100)'
export const ANNOTATION_STICKY_BG: string = 'var(--color-yellow-500)'
export const ANNOTATION_DEFAULT_STROKE = 2.5
export const ANNOTATION_STICKY_SIZE = { width: 160, height: 120 }

/**
 * Annotation colours, derived from the lane set rather than listed four times.
 *
 * These were four hand-written arrays — pen, sticky, shape fill, outline — forty
 * entries that had drifted apart. They are the same eight hues the lane roles
 * use, at four steps, so an annotation sits inside the board's palette rather
 * than beside it:
 * 900 is the vivid ink a stroke needs, 500 matches the cells a sticky sits
 * beside, 300 is pale enough that a filled shape does not hide the lane under
 * it, and 1100 is the text weight an outline needs to survive at 1.5px.
 */
const ANNOTATION_FAMILIES = [
  'slate',
  'blue',
  'green',
  'violet',
  'pink',
  'lime',
  'orange',
  'amber',
] as const

const swatches = (step: 300 | 500 | 900 | 1100) =>
  ANNOTATION_FAMILIES.map((family) => `var(--color-${family}-${step})`)

/** Sticky fills — step 500, the weight of the cells they sit beside. */
export const ANNOTATION_STICKY_SWATCHES = [
  ...swatches(500),
  ANNOTATION_PAPER,
] as const

/** Shape fills — step 300, pale enough to sit over a lane without hiding it. */
export const ANNOTATION_FILL_SWATCHES = [
  ...swatches(300),
  ANNOTATION_PAPER,
  ANNOTATION_INK,
] as const

/** Outlines — step 1100, so a 1.5px stroke still reads. */
export const ANNOTATION_STROKE_SWATCHES = [
  ANNOTATION_INK,
  ANNOTATION_PAPER,
  ...swatches(1100),
] as const

/**
 * The agent's ink. Its boxes should read as "the agent drew this" — a
 * deliberate, attention-red that no human swatch offers — but it must still
 * be a token, so dark mode follows and `annotationSwatchName` returns "Red"
 * to a screen reader instead of "Custom".
 */
export const ANNOTATION_AGENT_INK = 'var(--color-red-900)'

/** Pen ink — step 900, the vivid step. */
export const ANNOTATION_PEN_SWATCHES = [
  ANNOTATION_INK,
  ...swatches(900),
  ANNOTATION_PAPER,
] as const

/**
 * Human name for a swatch, for its `aria-label` and tooltip.
 *
 * A swatch's *value* is the token string it paints with, because that string is
 * what an annotation row stores. That is not a label: without this, every
 * swatch announced itself to a screen reader, and showed on hover, as
 * `var(--color-violet-900)`.
 *
 * One step per family appears in any single row, so the family alone names a
 * swatch unambiguously. Ink and paper are checked first — they are slate-1200
 * and gray-100, and "Slate" / "Gray" would say less than what they are for.
 */
export function annotationSwatchName(swatch: string): string {
  if (swatch === ANNOTATION_INK) return 'Ink'
  if (swatch === ANNOTATION_PAPER) return 'Paper'
  const family = /--color-([a-z]+)-\d+/.exec(swatch)?.[1]
  if (!family) return 'Custom'
  return family.charAt(0).toUpperCase() + family.slice(1)
}

export const ANNOTATION_STROKE_WIDTHS = [1.5, 2.5, 4] as const
/**
 * Pen stroke weights in board units (same space as shape strokes).
 * Thick is intentionally much heavier so it reads at overview zoom.
 */
export const ANNOTATION_PEN_STROKE_WIDTHS = [3, 14] as const
export const ANNOTATION_FONT_SIZES = [12, 14, 18, 24, 32, 48] as const
export const ANNOTATION_MIN_SIZE = { width: 48, height: 40 } as const
export const ANNOTATION_DEFAULT_FONT_SIZE = 14
export const ANNOTATION_DEFAULT_PEN_STROKE = 3
/** Eraser brush radius in screen pixels (converted to board space via live scale). */
export const ANNOTATION_ERASER_SCREEN_RADIUS = 16

export const ANNOTATION_FONT_SIZE_LABELS: Record<number, string> = {
  12: 'Extra small',
  14: 'Small',
  18: 'Medium',
  24: 'Large',
  32: 'Extra large',
  48: 'Huge',
}

export function annotationFontSizeLabel(fontSize: number): string {
  return ANNOTATION_FONT_SIZE_LABELS[fontSize] ?? `${fontSize}px`
}

/*
 * `isPaleAnnotationSwatch()` used to live here — `color !== ANNOTATION_INK`,
 * a membership test standing in for a contrast computation. It answered "is
 * this pale?" for values that invert with the theme, so it was wrong in dark
 * mode for every swatch it said yes to and wrong in dark mode for the one it
 * said no to. The swatch button derives its ink from its own fill now, via
 * `[data-blueprint-fill]`, which is the mechanism path badges and divider tags
 * already used. Nothing needs the membership test.
 */

export function annotationTextOnFill(fillColor: string | null): string {
  if (!fillColor) return ANNOTATION_INK
  return fillColor === ANNOTATION_INK ? ANNOTATION_PAPER : ANNOTATION_INK
}

export function createAnnotationId(): string {
  return `ann-${crypto.randomUUID()}`
}

function distanceSq(a: CanvasPoint, b: CanvasPoint): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

/** Shortest distance from point P to segment AB. */
function distanceToSegment(
  p: CanvasPoint,
  a: CanvasPoint,
  b: CanvasPoint,
): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const lenSq = abx * abx + aby * aby
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby))
}

/**
 * True when the eraser circle touches any point or segment of a pen stroke.
 */
function penStrokeHitsEraser(
  points: CanvasPoint[],
  eraser: CanvasPoint,
  radius: number,
): boolean {
  if (points.length === 0) return false
  const radiusSq = radius * radius
  for (const point of points) {
    if (distanceSq(point, eraser) <= radiusSq) return true
  }
  for (let i = 0; i < points.length - 1; i++) {
    if (distanceToSegment(eraser, points[i], points[i + 1]) <= radius) {
      return true
    }
  }
  return false
}

/** Apply eraser along a drag path (samples between last and next for fast moves). */
export function erasePenAnnotationsAtStroke(
  annotations: CanvasAnnotation[],
  from: CanvasPoint,
  to: CanvasPoint,
  radius: number,
): CanvasAnnotation[] {
  const samples: CanvasPoint[] = []
  const dist = Math.hypot(to.x - from.x, to.y - from.y)
  const step = Math.max(radius * 0.35, 1.5)
  if (dist <= step) {
    samples.push(to)
  } else {
    const count = Math.ceil(dist / step)
    for (let i = 1; i <= count; i++) {
      const t = i / count
      samples.push({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      })
    }
  }

  let next = annotations
  for (const sample of samples) {
    next = erasePenAnnotationsAtPoint(next, sample, radius)
  }
  return next
}

/** Remove whole pen strokes that touch the eraser (no partial cuts). */
export function erasePenAnnotationsAtPoint(
  annotations: CanvasAnnotation[],
  eraser: CanvasPoint,
  radius: number,
): CanvasAnnotation[] {
  return annotations.filter((annotation) => {
    if (annotation.type !== 'pen') return true
    const hitRadius = radius + annotation.strokeWidth * 0.5
    return !penStrokeHitsEraser(annotation.points, eraser, hitRadius)
  })
}

export function normalizeRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(x0, x1)
  const y = Math.min(y0, y1)
  return {
    x,
    y,
    width: Math.abs(x1 - x0),
    height: Math.abs(y1 - y0),
  }
}

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

export function applyResizeHandle(
  handle: ResizeHandle,
  origin: { x: number; y: number; width: number; height: number },
  dx: number,
  dy: number,
  minW = ANNOTATION_MIN_SIZE.width,
  minH = ANNOTATION_MIN_SIZE.height,
): { x: number; y: number; width: number; height: number } {
  let x = origin.x
  let y = origin.y
  let width: number
  let height: number

  switch (handle) {
    case 'se':
      width = origin.width + dx
      height = origin.height + dy
      break
    case 'sw':
      x = origin.x + dx
      width = origin.width - dx
      height = origin.height + dy
      break
    case 'ne':
      y = origin.y + dy
      width = origin.width + dx
      height = origin.height - dy
      break
    default:
      x = origin.x + dx
      y = origin.y + dy
      width = origin.width - dx
      height = origin.height - dy
      break
  }

  if (width < minW) {
    if (handle === 'sw' || handle === 'nw') x = origin.x + origin.width - minW
    width = minW
  }
  if (height < minH) {
    if (handle === 'ne' || handle === 'nw') y = origin.y + origin.height - minH
    height = minH
  }

  return { x, y, width, height }
}
