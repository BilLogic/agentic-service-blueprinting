import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Circle,
  Square,
  Strikethrough,
  Trash2,
} from 'lucide-react'
import { useCanvasAnnotations } from '@/contexts/canvasAnnotationContext'
import {
  ANNOTATION_DEFAULT_FONT_SIZE,
  ANNOTATION_DEFAULT_STROKE,
  ANNOTATION_ERASER_SCREEN_RADIUS,
  ANNOTATION_FILL_SWATCHES,
  ANNOTATION_FONT_SIZES,
  ANNOTATION_INK,
  isPaleAnnotationSwatch,
  ANNOTATION_STICKY_BG,
  ANNOTATION_STICKY_SIZE,
  ANNOTATION_STICKY_SWATCHES,
  ANNOTATION_STROKE_SWATCHES,
  ANNOTATION_STROKE_WIDTHS,
  annotationFontSizeLabel,
  annotationTextOnFill,
  applyResizeHandle,
  createAnnotationId,
  erasePenAnnotationsAtPoint,
  erasePenAnnotationsAtStroke,
  normalizeRect,
  type CanvasPoint,
  type ResizeHandle,
  type ShapeAnnotation,
  type StickyAnnotation,
  type TextAnnotation,
  annotationSwatchName,
} from '@/lib/canvasAnnotations'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { cn } from '@/lib/utils'

type DraftPen = {
  type: 'pen'
  points: CanvasPoint[]
  strokeWidth: number
  color: string
}

type DraftShape = {
  type: 'rect' | 'ellipse'
  x0: number
  y0: number
  x1: number
  y1: number
}

type DraftEraser = {
  type: 'eraser'
  last: CanvasPoint
}

type Draft = DraftPen | DraftShape | DraftEraser | null

type DragState = {
  id: string
  pointerId: number
  originX: number
  originY: number
  startX: number
  startY: number
  moved: boolean
}

type ResizeState = {
  id: string
  handle: ResizeHandle
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  originW: number
  originH: number
  /** When set, scales fontSize with the resize (text annotations). */
  originFontSize?: number
}

const DRAG_THRESHOLD = 3

/** Keep annotation chrome at a constant screen size as the canvas zooms. */
function chromeScreenScale(zoom: number): number {
  return 1 / Math.max(zoom, 0.05)
}

function chromeAnchorStyle(
  x: number,
  y: number,
  width: number,
  zoom: number,
  gap = 12,
): CSSProperties {
  const scale = chromeScreenScale(zoom)
  return {
    left: x + width / 2,
    top: Math.max(0, y - gap),
    transform: `translate(-50%, -100%) scale(${scale})`,
    transformOrigin: 'center bottom',
  }
}

const RESIZE_CURSOR: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  se: 'nwse-resize',
}

/** Focus a textarea after mount/edit — deferred past pointerup / chrome mount. */
function useFocusTextarea(active: boolean) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!active) return
    let cancelled = false
    const focus = () => {
      if (cancelled) return
      const el = ref.current
      if (!el) return
      el.focus({ preventScroll: true })
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
    // Double rAF + timeout: first paint, then after pointer capture releases.
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        focus()
        window.setTimeout(focus, 0)
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [active])
  return ref
}

function clientToLocal(
  el: HTMLElement,
  clientX: number,
  clientY: number,
): CanvasPoint {
  const rect = el.getBoundingClientRect()
  const scaleX = rect.width / Math.max(el.offsetWidth, 1)
  const scaleY = rect.height / Math.max(el.offsetHeight, 1)
  return {
    x: (clientX - rect.left) / scaleX,
    y: (clientY - rect.top) / scaleY,
  }
}

/** Live CSS scale of the annotation layer (more reliable than React zoom state). */
function getLayerScale(el: HTMLElement): number {
  const rect = el.getBoundingClientRect()
  return Math.max(rect.width / Math.max(el.offsetWidth, 1), 0.05)
}

function pointsToPath(points: CanvasPoint[]): string {
  if (points.length === 0) return ''
  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(' ')
}

function ColorSwatch({
  color,
  label,
  selected,
  onSelect,
  empty,
}: {
  color?: string
  label: string
  selected: boolean
  onSelect: () => void
  empty?: boolean
}) {
  const isLight = !empty && isPaleAnnotationSwatch(color)

  return (
    <IconTooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(
          'relative size-6 shrink-0 rounded-full border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          empty
            ? 'border-border bg-[linear-gradient(45deg,#d4d4d8_25%,transparent_25%,transparent_75%,#d4d4d8_75%),linear-gradient(45deg,#d4d4d8_25%,#fafafa_25%,#fafafa_75%,#d4d4d8_75%)] bg-[length:6px_6px] bg-[position:0_0,3px_3px]'
            : 'border-black/10 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]',
          selected && 'scale-110 ring-2 ring-foreground/80 ring-offset-1',
        )}
        style={empty ? undefined : { backgroundColor: color }}
      >
        {selected ? (
          <Check
            className={cn(
              'absolute inset-0 m-auto size-3 stroke-[2.5]',
              empty || isLight ? 'text-neutral-800' : 'text-white',
            )}
            aria-hidden
          />
        ) : null}
      </button>
    </IconTooltip>
  )
}

function StrokeWidthSwatch({
  width,
  selected,
  onSelect,
  dark = false,
}: {
  width: number
  selected: boolean
  onSelect: () => void
  dark?: boolean
}) {
  return (
    <IconTooltip label={`${width}px`}>
      <button
        type="button"
        aria-label={`Outline weight ${width}px`}
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          dark
            ? selected
              ? 'border-white/25 bg-white/15'
              : 'hover:bg-white/10'
            : selected
              ? 'border-border bg-muted'
              : 'hover:bg-muted',
        )}
      >
        <span
          className={cn(
            'block w-3.5 rounded-full',
            dark ? 'bg-white' : 'bg-foreground',
          )}
          style={{ height: Math.min(width, 4) }}
          aria-hidden
        />
      </button>
    </IconTooltip>
  )
}

function ResizeHandles({
  onResizeStart,
}: {
  onResizeStart: (
    handle: ResizeHandle,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
}) {
  const handles: ResizeHandle[] = ['nw', 'ne', 'sw', 'se']
  return (
    <>
      {handles.map((handle) => (
        <button
          key={handle}
          type="button"
          aria-label={`Resize ${handle}`}
          data-annotation-editable=""
          data-resize-handle={handle}
          className="pointer-events-auto absolute z-20 size-3 rounded-[2px] border-2 border-annotation-selected bg-white shadow-none"
          style={{
            cursor: RESIZE_CURSOR[handle],
            ...(handle.includes('n') ? { top: -6 } : { bottom: -6 }),
            ...(handle.includes('w') ? { left: -6 } : { right: -6 }),
          }}
          onPointerDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onResizeStart(handle, e)
          }}
        />
      ))}
    </>
  )
}

const SHAPE_TOOLBAR_TRIGGER_CLASS =
  'flex h-8 items-center gap-0.5 rounded-full px-2 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'

/**
 * The round icon-only slot in the floating style bars (currently every
 * bar's Delete): SHAPE_TOOLBAR_TRIGGER_CLASS's fixed-square sibling — same
 * white-on-dark hover and focus ring, but a centered `size-8` circle with
 * no label gutter.
 */
const SHAPE_TOOLBAR_ICON_BUTTON_CLASS =
  'flex size-8 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'

const SHAPE_TOOLBAR_MENU_CLASS =
  'border-0 bg-neutral-900 text-white shadow-floating ring-1 ring-white/10'

const SHAPE_TOOLBAR_ITEM_CLASS =
  'gap-2 text-white focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white'

function ShapeToolbarDivider() {
  return <div className="mx-0.5 h-4 w-px shrink-0 bg-white/20" aria-hidden />
}

/**
 * `IconTooltip` on this file's own dark plane. These bars float over the
 * canvas in neutral-900, so the popup and its arrow (`**:` selectors) are
 * repainted to match — the one place in the app that overrides the tooltip
 * surface, and the reason `IconTooltip` takes a className at all.
 */
function ShapeToolbarTooltip({
  label,
  children,
}: {
  label: string
  children: ReactElement
}) {
  return (
    <IconTooltip
      label={label}
      side="top"
      sideOffset={8}
      className="rounded-md bg-neutral-900 px-2.5 py-1.5 font-medium text-white shadow-floating **:!bg-neutral-900 **:!fill-neutral-900"
    >
      {children}
    </IconTooltip>
  )
}

/** Compact Figma-style shape controls: type · fill · stroke · delete. */
function ShapeStyleBar({
  shape,
  zoom,
  onChange,
  onDelete,
}: {
  shape: ShapeAnnotation
  zoom: number
  onChange: (patch: Partial<ShapeAnnotation>) => void
  onDelete: () => void
}) {
  const [fillOpen, setFillOpen] = useState(false)
  const [strokeOpen, setStrokeOpen] = useState(false)
  const ShapeIcon = shape.type === 'ellipse' ? Circle : Square
  const fillPreview = shape.fillColor
  const strokePreview = shape.color

  return (
    <div
      data-annotation-editable=""
      data-annotation-chrome=""
      className="pointer-events-auto absolute z-50 flex h-10 items-center gap-0.5 rounded-full bg-neutral-900 px-1.5 shadow-floating"
      style={chromeAnchorStyle(shape.x, shape.y, shape.width, zoom)}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
    >
      <DropdownMenu>
        <ShapeToolbarTooltip label="Shape">
          <DropdownMenuTrigger
            aria-label="Shape"
            className={SHAPE_TOOLBAR_TRIGGER_CLASS}
          >
            <ShapeIcon className="size-4" strokeWidth={2} aria-hidden />
            <ChevronDown className="size-3 opacity-80" aria-hidden />
          </DropdownMenuTrigger>
        </ShapeToolbarTooltip>
        <DropdownMenuContent
          align="start"
          side="top"
          sideOffset={8}
          className={cn('min-w-36', SHAPE_TOOLBAR_MENU_CLASS)}
          data-annotation-chrome=""
        >
          <DropdownMenuItem
            onClick={() => onChange({ type: 'rect' })}
            className={SHAPE_TOOLBAR_ITEM_CLASS}
          >
            <Square className="size-4" aria-hidden />
            Rectangle
            {shape.type === 'rect' ? (
              <Check className="ml-auto size-3.5" aria-hidden />
            ) : null}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onChange({ type: 'ellipse' })}
            className={SHAPE_TOOLBAR_ITEM_CLASS}
          >
            <Circle className="size-4" aria-hidden />
            Ellipse
            {shape.type === 'ellipse' ? (
              <Check className="ml-auto size-3.5" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShapeToolbarDivider />

      <Popover open={fillOpen} onOpenChange={setFillOpen}>
        <ShapeToolbarTooltip label="Fill">
          <PopoverTrigger
            aria-label="Fill"
            className={SHAPE_TOOLBAR_TRIGGER_CLASS}
          >
            <span
              className={cn(
                'size-4 rounded-full border border-white/30',
                !fillPreview &&
                  'bg-[linear-gradient(45deg,#a3a3a3_25%,transparent_25%,transparent_75%,#a3a3a3_75%),linear-gradient(45deg,#a3a3a3_25%,#404040_25%,#404040_75%,#a3a3a3_75%)] bg-[length:6px_6px] bg-[position:0_0,3px_3px]',
              )}
              style={fillPreview ? { backgroundColor: fillPreview } : undefined}
              aria-hidden
            />
            <ChevronDown className="size-3 opacity-80" aria-hidden />
          </PopoverTrigger>
        </ShapeToolbarTooltip>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={8}
          className={cn('w-auto min-w-0 p-2.5', SHAPE_TOOLBAR_MENU_CLASS)}
          data-annotation-chrome=""
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="mb-1.5 text-3xs font-semibold tracking-wide text-white/55 uppercase">
            Fill
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <ColorSwatch
              empty
              label="No fill"
              selected={shape.fillColor === null}
              onSelect={() => {
                onChange({ fillColor: null })
                setFillOpen(false)
              }}
            />
            {ANNOTATION_FILL_SWATCHES.map((swatch) => (
              <ColorSwatch
                key={`fill-${swatch}`}
                color={swatch}
                label={`Fill ${annotationSwatchName(swatch)}`}
                selected={shape.fillColor === swatch}
                onSelect={() => {
                  onChange({ fillColor: swatch })
                  setFillOpen(false)
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <ShapeToolbarDivider />

      <Popover open={strokeOpen} onOpenChange={setStrokeOpen}>
        <ShapeToolbarTooltip label="Line style">
          <PopoverTrigger
            aria-label="Line style"
            className={SHAPE_TOOLBAR_TRIGGER_CLASS}
          >
            <span
              className="flex size-4 flex-col items-center justify-center gap-[2.5px]"
              aria-hidden
            >
              <span
                className="block h-px w-3.5 rounded-full"
                style={{ backgroundColor: strokePreview ?? 'var(--color-gray-700)' }}
              />
              <span
                className="block h-[2px] w-3.5 rounded-full"
                style={{ backgroundColor: strokePreview ?? 'var(--color-gray-700)' }}
              />
              <span
                className="block h-[3px] w-3.5 rounded-full"
                style={{ backgroundColor: strokePreview ?? 'var(--color-gray-700)' }}
              />
            </span>
            <ChevronDown className="size-3 opacity-80" aria-hidden />
          </PopoverTrigger>
        </ShapeToolbarTooltip>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={8}
          className={cn('w-auto min-w-0 p-2.5', SHAPE_TOOLBAR_MENU_CLASS)}
          data-annotation-chrome=""
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="text-3xs font-semibold tracking-wide text-white/55 uppercase">
              Stroke
            </span>
            {shape.color ? (
              <div className="flex items-center gap-0.5">
                {ANNOTATION_STROKE_WIDTHS.map((width) => (
                  <StrokeWidthSwatch
                    key={width}
                    width={width}
                    selected={shape.strokeWidth === width}
                    onSelect={() => onChange({ strokeWidth: width })}
                    dark
                  />
                ))}
              </div>
            ) : (
              <span className="text-3xs text-white/55">None</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <ColorSwatch
              empty
              label="No stroke"
              selected={shape.color === null}
              onSelect={() => {
                onChange({ color: null })
                setStrokeOpen(false)
              }}
            />
            {ANNOTATION_STROKE_SWATCHES.map((swatch) => (
              <ColorSwatch
                key={`stroke-${swatch}`}
                color={swatch}
                label={`Stroke ${annotationSwatchName(swatch)}`}
                selected={shape.color === swatch}
                onSelect={() => {
                  onChange({
                    color: swatch,
                    strokeWidth:
                      shape.strokeWidth > 0
                        ? shape.strokeWidth
                        : ANNOTATION_DEFAULT_STROKE,
                  })
                  setStrokeOpen(false)
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <ShapeToolbarDivider />

      <ShapeToolbarTooltip label="Delete">
        <button
          type="button"
          aria-label="Delete shape"
          onClick={onDelete}
          className={SHAPE_TOOLBAR_ICON_BUTTON_CLASS}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </ShapeToolbarTooltip>
    </div>
  )
}

/** FigJam-style sticky controls: color · size · bold · strike · delete. */
function StickyStyleBar({
  sticky,
  zoom,
  onChange,
  onDelete,
}: {
  sticky: StickyAnnotation
  zoom: number
  onChange: (patch: Partial<StickyAnnotation>) => void
  onDelete: () => void
}) {
  const [colorOpen, setColorOpen] = useState(false)
  const [sizeOpen, setSizeOpen] = useState(false)
  const sizeLabel = annotationFontSizeLabel(sticky.fontSize)

  return (
    <div
      data-annotation-editable=""
      data-annotation-chrome=""
      className="pointer-events-auto absolute z-50 flex h-10 items-center gap-0.5 rounded-full bg-neutral-900 px-1.5 shadow-floating"
      style={chromeAnchorStyle(sticky.x, sticky.y, sticky.width, zoom)}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
    >
      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <ShapeToolbarTooltip label="Color">
          <PopoverTrigger
            aria-label="Color"
            className={SHAPE_TOOLBAR_TRIGGER_CLASS}
          >
            <span
              className="size-4 rounded-full border border-white/30"
              style={{ backgroundColor: sticky.color }}
              aria-hidden
            />
            <ChevronDown className="size-3 opacity-80" aria-hidden />
          </PopoverTrigger>
        </ShapeToolbarTooltip>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={8}
          className={cn('w-auto min-w-0 p-2.5', SHAPE_TOOLBAR_MENU_CLASS)}
          data-annotation-chrome=""
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="mb-1.5 text-3xs font-semibold tracking-wide text-white/55 uppercase">
            Color
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {ANNOTATION_STICKY_SWATCHES.map((swatch) => (
              <ColorSwatch
                key={`sticky-${swatch}`}
                color={swatch}
                label={`Sticky ${annotationSwatchName(swatch)}`}
                selected={sticky.color.toUpperCase() === swatch.toUpperCase()}
                onSelect={() => {
                  onChange({ color: swatch })
                  setColorOpen(false)
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <ShapeToolbarDivider />

      <Popover open={sizeOpen} onOpenChange={setSizeOpen}>
        <ShapeToolbarTooltip label="Text size">
          <PopoverTrigger
            aria-label="Text size"
            className={cn(SHAPE_TOOLBAR_TRIGGER_CLASS, 'min-w-[4.75rem]')}
          >
            <span className="text-xs font-medium tracking-tight">{sizeLabel}</span>
            <ChevronDown className="size-3 opacity-80" aria-hidden />
          </PopoverTrigger>
        </ShapeToolbarTooltip>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={8}
          className={cn('w-auto min-w-36 p-1', SHAPE_TOOLBAR_MENU_CLASS)}
          data-annotation-chrome=""
          onMouseDown={(e) => e.preventDefault()}
        >
          {ANNOTATION_FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                onChange({ fontSize: size })
                setSizeOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-sm text-white transition-colors hover:bg-white/10',
                sticky.fontSize === size && 'bg-white/10',
              )}
            >
              {annotationFontSizeLabel(size)}
              {sticky.fontSize === size ? (
                <Check className="size-3.5 opacity-90" aria-hidden />
              ) : null}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <ShapeToolbarDivider />

      <ShapeToolbarTooltip label="Bold">
        <button
          type="button"
          aria-label="Bold"
          aria-pressed={Boolean(sticky.bold)}
          onClick={() => onChange({ bold: !sticky.bold })}
          className={cn(
            SHAPE_TOOLBAR_TRIGGER_CLASS,
            sticky.bold && 'bg-white/15',
          )}
        >
          <Bold className="size-3.5" aria-hidden />
        </button>
      </ShapeToolbarTooltip>

      <ShapeToolbarTooltip label="Strikethrough">
        <button
          type="button"
          aria-label="Strikethrough"
          aria-pressed={Boolean(sticky.strike)}
          onClick={() => onChange({ strike: !sticky.strike })}
          className={cn(
            SHAPE_TOOLBAR_TRIGGER_CLASS,
            sticky.strike && 'bg-white/15',
          )}
        >
          <Strikethrough className="size-3.5" aria-hidden />
        </button>
      </ShapeToolbarTooltip>

      <ShapeToolbarDivider />

      <ShapeToolbarTooltip label="Delete">
        <button
          type="button"
          aria-label="Delete sticky"
          onClick={onDelete}
          className={SHAPE_TOOLBAR_ICON_BUTTON_CLASS}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </ShapeToolbarTooltip>
    </div>
  )
}

const TEXT_ALIGN_OPTIONS = [
  { id: 'left' as const, label: 'Left', Icon: AlignLeft },
  { id: 'center' as const, label: 'Center', Icon: AlignCenter },
  { id: 'right' as const, label: 'Right', Icon: AlignRight },
]

/** Figma-style text controls: color · size · bold · strike · align · delete. */
function TextStyleBar({
  text,
  zoom,
  width,
  onChange,
  onDelete,
}: {
  text: TextAnnotation
  zoom: number
  width: number
  onChange: (patch: Partial<TextAnnotation>) => void
  onDelete: () => void
}) {
  const [colorOpen, setColorOpen] = useState(false)
  const [sizeOpen, setSizeOpen] = useState(false)
  const [alignOpen, setAlignOpen] = useState(false)
  const sizeLabel = annotationFontSizeLabel(text.fontSize)
  const align = text.align ?? 'left'
  const AlignIcon =
    TEXT_ALIGN_OPTIONS.find((option) => option.id === align)?.Icon ?? AlignLeft

  return (
    <div
      data-annotation-editable=""
      data-annotation-chrome=""
      className="pointer-events-auto absolute z-50 flex h-10 items-center gap-0.5 rounded-full bg-neutral-900 px-1.5 shadow-floating"
      style={chromeAnchorStyle(text.x, text.y, width, zoom)}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
    >
      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <ShapeToolbarTooltip label="Color">
          <PopoverTrigger
            aria-label="Color"
            className={SHAPE_TOOLBAR_TRIGGER_CLASS}
          >
            <span
              className="size-4 rounded-full border border-white/30"
              style={{ backgroundColor: text.color }}
              aria-hidden
            />
            <ChevronDown className="size-3 opacity-80" aria-hidden />
          </PopoverTrigger>
        </ShapeToolbarTooltip>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={8}
          className={cn('w-auto min-w-0 p-2.5', SHAPE_TOOLBAR_MENU_CLASS)}
          data-annotation-chrome=""
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="mb-1.5 text-3xs font-semibold tracking-wide text-white/55 uppercase">
            Color
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {ANNOTATION_STROKE_SWATCHES.map((swatch) => (
              <ColorSwatch
                key={`text-${swatch}`}
                color={swatch}
                label={`Text ${annotationSwatchName(swatch)}`}
                selected={text.color.toUpperCase() === swatch.toUpperCase()}
                onSelect={() => {
                  onChange({ color: swatch })
                  setColorOpen(false)
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <ShapeToolbarDivider />

      <Popover open={sizeOpen} onOpenChange={setSizeOpen}>
        <ShapeToolbarTooltip label="Text size">
          <PopoverTrigger
            aria-label="Text size"
            className={cn(SHAPE_TOOLBAR_TRIGGER_CLASS, 'min-w-[4.75rem]')}
          >
            <span className="text-xs font-medium tracking-tight">{sizeLabel}</span>
            <ChevronDown className="size-3 opacity-80" aria-hidden />
          </PopoverTrigger>
        </ShapeToolbarTooltip>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={8}
          className={cn('w-auto min-w-36 p-1', SHAPE_TOOLBAR_MENU_CLASS)}
          data-annotation-chrome=""
          onMouseDown={(e) => e.preventDefault()}
        >
          {ANNOTATION_FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                onChange({ fontSize: size })
                setSizeOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-sm text-white transition-colors hover:bg-white/10',
                text.fontSize === size && 'bg-white/10',
              )}
            >
              {annotationFontSizeLabel(size)}
              {text.fontSize === size ? (
                <Check className="size-3.5 opacity-90" aria-hidden />
              ) : null}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <ShapeToolbarDivider />

      <ShapeToolbarTooltip label="Bold">
        <button
          type="button"
          aria-label="Bold"
          aria-pressed={Boolean(text.bold)}
          onClick={() => onChange({ bold: !text.bold })}
          className={cn(
            SHAPE_TOOLBAR_TRIGGER_CLASS,
            text.bold && 'bg-white/15',
          )}
        >
          <Bold className="size-3.5" aria-hidden />
        </button>
      </ShapeToolbarTooltip>

      <ShapeToolbarTooltip label="Strikethrough">
        <button
          type="button"
          aria-label="Strikethrough"
          aria-pressed={Boolean(text.strike)}
          onClick={() => onChange({ strike: !text.strike })}
          className={cn(
            SHAPE_TOOLBAR_TRIGGER_CLASS,
            text.strike && 'bg-white/15',
          )}
        >
          <Strikethrough className="size-3.5" aria-hidden />
        </button>
      </ShapeToolbarTooltip>

      <ShapeToolbarDivider />

      <Popover open={alignOpen} onOpenChange={setAlignOpen}>
        <ShapeToolbarTooltip label="Alignment">
          <PopoverTrigger
            aria-label="Alignment"
            className={SHAPE_TOOLBAR_TRIGGER_CLASS}
          >
            <AlignIcon className="size-3.5" aria-hidden />
            <ChevronDown className="size-3 opacity-80" aria-hidden />
          </PopoverTrigger>
        </ShapeToolbarTooltip>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={8}
          className={cn('w-auto min-w-32 p-1', SHAPE_TOOLBAR_MENU_CLASS)}
          data-annotation-chrome=""
          onMouseDown={(e) => e.preventDefault()}
        >
          {TEXT_ALIGN_OPTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onChange({ align: id })
                setAlignOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-white transition-colors hover:bg-white/10',
                align === id && 'bg-white/10',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
              {align === id ? (
                <Check className="ml-auto size-3.5 opacity-90" aria-hidden />
              ) : null}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <ShapeToolbarDivider />

      <ShapeToolbarTooltip label="Delete">
        <button
          type="button"
          aria-label="Delete text"
          onClick={onDelete}
          className={SHAPE_TOOLBAR_ICON_BUTTON_CLASS}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </ShapeToolbarTooltip>
    </div>
  )
}

type MovableProps = {
  selected: boolean
  editing: boolean
  canInteract: boolean
  isEraser: boolean
  canDrag: boolean
  onSelect: () => void
  onStartEdit: () => void
  onStopEdit: () => void
  onErase: () => void
  onDragStart: (event: ReactPointerEvent<HTMLElement>) => void
  onResizeStart: (
    handle: ResizeHandle,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
}

function ShapeAnnotationNode({
  annotation,
  zoom,
  onUpdate,
  ...movable
}: MovableProps & {
  annotation: ShapeAnnotation
  zoom: number
  onUpdate: (patch: Partial<ShapeAnnotation>) => void
}) {
    const {
    selected,
    editing,
    canInteract,
    isEraser,
    canDrag,
    onSelect,
    onStartEdit,
    onErase,
    onDragStart,
    onResizeStart,
  } = movable
  const isEllipse = annotation.type === 'ellipse'
  const textColor = annotationTextOnFill(annotation.fillColor)
  const hasFill = Boolean(annotation.fillColor)
  const textareaRef = useFocusTextarea(editing)

  return (
    <>
      {selected && !isEraser ? (
        <ShapeStyleBar
          shape={annotation}
          zoom={zoom}
          onChange={onUpdate}
          onDelete={onErase}
        />
      ) : null}
      <div
        data-annotation-id={annotation.id}
        data-annotation-editable=""
        className={cn(
          'absolute box-border flex flex-col items-center justify-center p-2.5 transition-[box-shadow,outline-color] duration-(--motion-micro)',
          canInteract ? 'pointer-events-auto' : 'pointer-events-none',
          selected &&
            !isEraser &&
            'outline outline-2 outline-offset-0 outline-annotation-selected',
          canDrag && !editing && 'cursor-grab active:cursor-grabbing',
          hasFill && 'shadow-sm',
          !selected && 'overflow-hidden',
        )}
        style={{
          left: annotation.x,
          top: annotation.y,
          width: annotation.width,
          height: annotation.height,
          borderStyle: annotation.color ? 'solid' : 'none',
          borderWidth: annotation.color ? annotation.strokeWidth : 0,
          borderColor: annotation.color ?? 'transparent',
          backgroundColor: annotation.fillColor ?? 'transparent',
          borderRadius: isEllipse ? '50%' : 8,
          boxShadow: hasFill
            ? 'var(--shadow-blueprint-annotation-fill)'
            : undefined,
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
          if (isEraser) {
            onErase()
            return
          }
          if ((e.target as HTMLElement).closest('[data-resize-handle]')) return
          if ((e.target as HTMLElement).closest('textarea')) return
          // Click the label to edit without starting a drag.
          if ((e.target as HTMLElement).closest('[data-annotation-text]')) {
            onSelect()
            onStartEdit()
            return
          }
          onSelect()
          if (canDrag && !editing) onDragStart(e)
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          if (isEraser) return
          onSelect()
          onStartEdit()
        }}
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-2.5">
          {editing ? (
            <textarea
              ref={textareaRef}
              value={annotation.text}
              placeholder="Add text…"
              rows={Math.max(1, annotation.text.split('\n').length)}
              className={cn(
                'max-h-full w-full resize-none border-0 bg-transparent text-center font-sans leading-snug outline-none placeholder:opacity-40',
                isEllipse && 'px-3',
                'pointer-events-auto cursor-text',
              )}
              style={{ color: textColor, fontSize: 14 }}
              onChange={(e) => onUpdate({ text: e.target.value })}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              data-annotation-text=""
              className={cn(
                'pointer-events-auto max-h-full w-full overflow-hidden text-center font-sans text-sm leading-snug whitespace-pre-wrap break-words',
                isEllipse && 'px-3',
                !annotation.text && 'opacity-40',
              )}
              style={{ color: textColor }}
            >
              {annotation.text || (selected ? 'Add text…' : null)}
            </div>
          )}
        </div>
        {selected && !isEraser ? (
          <ResizeHandles onResizeStart={onResizeStart} />
        ) : null}
      </div>
    </>
  )
}

function StickyAnnotationNode({
  annotation,
  zoom,
  onUpdate,
  ...movable
}: MovableProps & {
  annotation: StickyAnnotation
  zoom: number
  onUpdate: (patch: Partial<StickyAnnotation>) => void
}) {
  const {
    selected,
    editing,
    canInteract,
    isEraser,
    canDrag,
    onSelect,
    onStartEdit,
    onErase,
    onDragStart,
    onResizeStart,
  } = movable

  const showChrome = selected && !isEraser
  const textareaRef = useFocusTextarea(editing)

  return (
    <>
      {showChrome ? (
        <StickyStyleBar
          sticky={annotation}
          zoom={zoom}
          onChange={onUpdate}
          onDelete={onErase}
        />
      ) : null}
      <div
        data-annotation-id={annotation.id}
        data-annotation-editable=""
        className={cn(
          'absolute box-border rounded-sm p-2 shadow-md',
          canInteract ? 'pointer-events-auto' : 'pointer-events-none',
          showChrome
            ? 'border-2 border-annotation-selected'
            : 'border border-black/15',
          canDrag && !editing && 'cursor-grab active:cursor-grabbing',
        )}
        style={{
          left: annotation.x,
          top: annotation.y,
          width: annotation.width,
          height: annotation.height,
          backgroundColor: annotation.color,
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
          if (isEraser) {
            onErase()
            return
          }
          if ((e.target as HTMLElement).closest('[data-resize-handle]')) return
          if ((e.target as HTMLElement).closest('textarea')) return
          onSelect()
          if (canDrag && !editing) onDragStart(e)
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          if (isEraser) return
          onSelect()
          onStartEdit()
        }}
      >
        <textarea
          ref={textareaRef}
          value={annotation.text}
          placeholder="Sticky note…"
          readOnly={!editing}
          className={cn(
            'size-full resize-none border-0 font-sans leading-snug text-neutral-900 outline-none placeholder:text-neutral-900/45',
            editing || selected
              ? 'pointer-events-auto cursor-text'
              : 'pointer-events-none cursor-inherit',
            annotation.bold && 'font-bold',
            annotation.strike && 'line-through',
          )}
          style={{
            backgroundColor: annotation.color,
            fontSize: annotation.fontSize,
          }}
          onChange={(e) => onUpdate({ text: e.target.value })}
          onPointerDown={(e) => {
            e.stopPropagation()
            if (isEraser) return
            onSelect()
            if (!editing) onStartEdit()
          }}
          onFocus={() => {
            if (!editing && !isEraser) onStartEdit()
          }}
        />
        {showChrome ? <ResizeHandles onResizeStart={onResizeStart} /> : null}
      </div>
    </>
  )
}

function TextAnnotationNode({
  annotation,
  zoom,
  onUpdate,
  ...movable
}: MovableProps & {
  annotation: TextAnnotation
  zoom: number
  onUpdate: (patch: Partial<TextAnnotation>) => void
}) {
  const {
    selected,
    editing,
    canInteract,
    isEraser,
    canDrag,
    onSelect,
    onStartEdit,
    onErase,
    onDragStart,
    onResizeStart,
  } = movable

  const showChrome = selected && !isEraser
  const approxWidth = Math.max(120, annotation.fontSize * 8)
  const approxHeight = Math.max(32, annotation.fontSize * 2.2)
  const showInput = editing || !annotation.text
  const textareaRef = useFocusTextarea(editing)
  const align = annotation.align ?? 'left'
  const textAlignClass =
    align === 'center'
      ? 'text-center'
      : align === 'right'
        ? 'text-right'
        : 'text-left'

  return (
    <>
      {showChrome ? (
        <TextStyleBar
          text={annotation}
          zoom={zoom}
          width={approxWidth}
          onChange={onUpdate}
          onDelete={onErase}
        />
      ) : null}
      <div
        data-annotation-id={annotation.id}
        data-annotation-editable=""
        className={cn(
          'absolute min-w-[4rem] box-border',
          canInteract ? 'pointer-events-auto' : 'pointer-events-none',
          showChrome && 'border-2 border-annotation-selected bg-white',
          canDrag && !editing && 'cursor-grab active:cursor-grabbing',
        )}
        style={{
          left: annotation.x,
          top: annotation.y,
          color: annotation.color,
          fontSize: annotation.fontSize,
          width: approxWidth,
          minHeight: approxHeight,
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
          if (isEraser) {
            onErase()
            return
          }
          if ((e.target as HTMLElement).closest('[data-resize-handle]')) return
          if ((e.target as HTMLElement).closest('textarea')) return
          onSelect()
          if (canDrag && !editing) onDragStart(e)
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          if (isEraser) return
          onSelect()
          onStartEdit()
        }}
      >
        {showInput ? (
          <textarea
            ref={textareaRef}
            value={annotation.text}
            placeholder="Type…"
            rows={2}
            className={cn(
              'w-full resize-none px-1.5 py-1 font-sans leading-snug outline-none',
              'pointer-events-auto cursor-text',
              textAlignClass,
              annotation.bold && 'font-bold',
              annotation.strike && 'line-through',
              showChrome
                ? 'border-0 bg-transparent text-inherit'
                : 'rounded border border-border/60 bg-card/95 text-foreground shadow-sm focus:border-ring',
            )}
            style={{ fontSize: annotation.fontSize }}
            onChange={(e) => onUpdate({ text: e.target.value })}
            onPointerDown={(e) => {
              e.stopPropagation()
              if (isEraser) return
              onSelect()
              if (!editing) onStartEdit()
            }}
          />
        ) : (
          <div
            className={cn(
              'max-w-full px-1.5 py-1 whitespace-pre-wrap font-sans leading-snug',
              textAlignClass,
              annotation.bold && 'font-bold',
              annotation.strike && 'line-through',
            )}
          >
            {annotation.text}
          </div>
        )}
        {showChrome ? <ResizeHandles onResizeStart={onResizeStart} /> : null}
      </div>
    </>
  )
}

/**
 * FigJam-style annotation surface over the canvas: pen strokes, shapes, text and
 * stickies, plus their selection and resize chrome. Coordinates are board space,
 * so `zoom` is only needed where a hit radius must stay constant on screen.
 */
export function CanvasAnnotationLayer({ zoom = 1 }: { zoom?: number }) {
  const {
    tool,
    setTool,
    penColor,
    penStrokeWidth,
    annotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    replaceAnnotations,
    selectedId,
    setSelectedId,
    isAnnotating,
  } = useCanvasAnnotations()
  const layerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const resizeRef = useRef<ResizeState | null>(null)
  const draftRef = useRef<Draft>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const strokeListenersRef = useRef<(() => void) | null>(null)
  const paintRafRef = useRef(0)
  const eraserPendingRef = useRef<{
    from: CanvasPoint
    points: CanvasPoint[]
    radius: number
  } | null>(null)
  const eraserRafRef = useRef(0)
  const [draft, setDraftState] = useState<Draft>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const setDraft = (next: Draft | ((current: Draft) => Draft)) => {
    const resolved =
      typeof next === 'function' ? next(draftRef.current) : next
    draftRef.current = resolved
    setDraftState(resolved)
  }

  const scheduleDraftPaint = () => {
    if (paintRafRef.current) return
    paintRafRef.current = requestAnimationFrame(() => {
      paintRafRef.current = 0
      const current = draftRef.current
      if (!current) {
        setDraftState(null)
        return
      }
      // Clone so React sees a new reference after in-place point pushes.
      if (current.type === 'pen') {
        setDraftState({
          ...current,
          points: current.points.slice(),
        })
        return
      }
      setDraftState({ ...current })
    })
  }

  const flushEraserPending = () => {
    if (eraserRafRef.current) {
      cancelAnimationFrame(eraserRafRef.current)
      eraserRafRef.current = 0
    }
    const pending = eraserPendingRef.current
    eraserPendingRef.current = null
    if (!pending || pending.points.length === 0) return
    let from = pending.from
    replaceAnnotations((annotations) => {
      let next = annotations
      for (const to of pending.points) {
        next = erasePenAnnotationsAtStroke(
          next,
          from,
          to,
          pending.radius,
        )
        from = to
      }
      return next
    })
  }

  const endStrokeListeners = () => {
    strokeListenersRef.current?.()
    strokeListenersRef.current = null
    if (paintRafRef.current) {
      cancelAnimationFrame(paintRafRef.current)
      paintRafRef.current = 0
    }
    if (eraserRafRef.current) {
      cancelAnimationFrame(eraserRafRef.current)
      eraserRafRef.current = 0
    }
  }

  useEffect(
    () => () => {
      endStrokeListeners()
      eraserPendingRef.current = null
    },
    // Mount/unmount only — refs keep listeners current.
    [],
  )

  // Only capture the board while drawing or mid drag/resize. Select mode must
  // let clicks pass through to blueprint cells (side panel); annotation
  // children keep their own pointer-events-auto.
  const layerInteractive = isAnnotating || Boolean(draggingId)

  // FigJam-style: Escape / click outside clears selection; Delete removes it.
  useEffect(() => {
    if (!selectedId && !editingId) return
    if (draggingId) return

    const keepSelectionSelector = [
      '[data-annotation-editable]',
      '[data-annotation-id]',
      '[data-annotation-chrome]',
      '[data-annotation-toolbar]',
      '[data-pen-cursor]',
      '[data-slot="popover-content"]',
      '[data-slot="dropdown-menu-content"]',
    ].join(', ')

    const clearSelection = () => {
      if (editingId) {
        const editing = annotations.find((item) => item.id === editingId)
        if (
          editing?.type === 'text' &&
          !editing.text.trim()
        ) {
          removeAnnotation(editingId)
        }
      }
      setSelectedId(null)
      setEditingId(null)
    }

    const isTypingInField = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      return (
        tag === 'TEXTAREA' ||
        tag === 'INPUT' ||
        target.isContentEditable
      )
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearSelection()
        return
      }

      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      // While editing text, let the field handle delete/backspace.
      if (editingId && isTypingInField(event.target)) return
      if (!selectedId) return

      event.preventDefault()
      removeAnnotation(selectedId)
      setEditingId(null)
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest(keepSelectionSelector)) return
      clearSelection()
    }

    window.addEventListener('keydown', onKeyDown)
    // Capture so we observe the click even when the layer has pointer-events: none.
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [
    selectedId,
    editingId,
    draggingId,
    annotations,
    setSelectedId,
    removeAnnotation,
  ])

  const finishPlacement = (id: string, startEditing = true) => {
    setSelectedId(id)
    if (startEditing) setEditingId(id)
    setTool('select')
  }

  const beginDrag = (
    id: string,
    event: ReactPointerEvent<HTMLElement>,
    originX: number,
    originY: number,
  ) => {
    if (!layerRef.current || tool === 'eraser') return
    if (resizeRef.current) return
    const point = clientToLocal(
      layerRef.current,
      event.clientX,
      event.clientY,
    )
    dragRef.current = {
      id,
      pointerId: event.pointerId,
      originX,
      originY,
      startX: point.x,
      startY: point.y,
      moved: false,
    }
    setDraggingId(id)
    layerRef.current.setPointerCapture(event.pointerId)
  }

  const beginResize = (
    id: string,
    handle: ResizeHandle,
    event: ReactPointerEvent<HTMLButtonElement>,
    box: {
      x: number
      y: number
      width: number
      height: number
      fontSize?: number
    },
  ) => {
    if (!layerRef.current || tool === 'eraser') return
    const point = clientToLocal(
      layerRef.current,
      event.clientX,
      event.clientY,
    )
    dragRef.current = null
    resizeRef.current = {
      id,
      handle,
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      originX: box.x,
      originY: box.y,
      originW: box.width,
      originH: box.height,
      originFontSize: box.fontSize,
    }
    setEditingId(null)
    setSelectedId(id)
    setDraggingId(id)
    layerRef.current.setPointerCapture(event.pointerId)
  }

  const finishPenStroke = () => {
    const activeDraft = draftRef.current
    endStrokeListeners()
    activePointerIdRef.current = null
    if (!activeDraft || activeDraft.type !== 'pen') {
      setDraft(null)
      return
    }
    const points =
      activeDraft.points.length === 1
        ? [
            activeDraft.points[0],
            {
              x: activeDraft.points[0].x + 0.01,
              y: activeDraft.points[0].y + 0.01,
            },
          ]
        : activeDraft.points
    if (points.length > 1) {
      addAnnotation({
        id: createAnnotationId(),
        type: 'pen',
        points,
        strokeWidth: activeDraft.strokeWidth,
        color: activeDraft.color,
      })
    }
    setDraft(null)
  }

  const finishEraserStroke = () => {
    flushEraserPending()
    endStrokeListeners()
    activePointerIdRef.current = null
    setDraft(null)
  }

  const appendPenPoint = (point: CanvasPoint, minDist: number) => {
    const current = draftRef.current
    if (!current || current.type !== 'pen') return
    const last = current.points[current.points.length - 1]
    if (last && Math.hypot(point.x - last.x, point.y - last.y) < minDist) {
      return
    }
    current.points.push(point)
    scheduleDraftPaint()
  }

  const eraseToPoint = (point: CanvasPoint, radius: number) => {
    const current = draftRef.current
    if (!current || current.type !== 'eraser') return

    const pending = eraserPendingRef.current
    if (!pending) {
      eraserPendingRef.current = {
        from: current.last,
        points: [point],
        radius,
      }
    } else {
      pending.points.push(point)
      pending.radius = radius
    }
    draftRef.current = { type: 'eraser', last: point }

    if (eraserRafRef.current) return
    eraserRafRef.current = requestAnimationFrame(() => {
      eraserRafRef.current = 0
      flushEraserPending()
    })
  }

  const bindStrokeListeners = (pointerId: number) => {
    endStrokeListeners()
    activePointerIdRef.current = pointerId

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerIdRef.current) return
      const layer = layerRef.current
      const current = draftRef.current
      if (!layer || !current) return
      event.preventDefault()

      const scale = getLayerScale(layer)

      if (current.type === 'pen') {
        const minDist = Math.max(0.35 / scale, 0.25)
        const coalesced =
          typeof event.getCoalescedEvents === 'function'
            ? event.getCoalescedEvents()
            : [event]
        const samples = coalesced.length > 0 ? coalesced : [event]
        for (const sample of samples) {
          appendPenPoint(
            clientToLocal(layer, sample.clientX, sample.clientY),
            minDist,
          )
        }
        return
      }

      if (current.type === 'eraser') {
        const radius = ANNOTATION_ERASER_SCREEN_RADIUS / scale
        eraseToPoint(
          clientToLocal(layer, event.clientX, event.clientY),
          radius,
        )
        return
      }

      if (current.type === 'rect' || current.type === 'ellipse') {
        const point = clientToLocal(layer, event.clientX, event.clientY)
        draftRef.current = {
          ...current,
          x1: point.x,
          y1: point.y,
        }
        scheduleDraftPaint()
      }
    }

    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointerIdRef.current) return
      const layer = layerRef.current
      const current = draftRef.current

      if (layer && current?.type === 'pen') {
        const scale = getLayerScale(layer)
        appendPenPoint(
          clientToLocal(layer, event.clientX, event.clientY),
          Math.max(0.35 / scale, 0.25),
        )
      }
      if (layer && current?.type === 'eraser') {
        eraseToPoint(
          clientToLocal(layer, event.clientX, event.clientY),
          ANNOTATION_ERASER_SCREEN_RADIUS / getLayerScale(layer),
        )
      }

      try {
        layer?.releasePointerCapture(pointerId)
      } catch {
        // Already released.
      }

      if (current?.type === 'pen') {
        finishPenStroke()
        return
      }
      if (current?.type === 'eraser') {
        finishEraserStroke()
        return
      }

      endStrokeListeners()
      activePointerIdRef.current = null

      if (
        current &&
        (current.type === 'rect' || current.type === 'ellipse')
      ) {
        const rect = normalizeRect(
          current.x0,
          current.y0,
          current.x1,
          current.y1,
        )
        if (rect.width > 4 || rect.height > 4) {
          const id = createAnnotationId()
          addAnnotation({
            id,
            type: current.type,
            ...rect,
            strokeWidth: ANNOTATION_DEFAULT_STROKE,
            color: ANNOTATION_INK,
            fillColor: null,
            text: '',
          })
          finishPlacement(id)
        }
        setDraft(null)
      }
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    strokeListenersRef.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!layerRef.current) return
    if (event.button !== 0) return
    if (activePointerIdRef.current !== null) return

    const target = event.target as HTMLElement
    if (target.closest('[data-annotation-editable]')) return

    if (tool === 'select' || !isAnnotating) {
      setSelectedId(null)
      setEditingId(null)
      return
    }

    const point = clientToLocal(layerRef.current, event.clientX, event.clientY)

    // Instant place tools — don't capture / preventDefault or the new
    // textarea can't take focus for typing.
    if (tool === 'text' || tool === 'sticky') {
      event.stopPropagation()
      const id = createAnnotationId()
      if (tool === 'text') {
        addAnnotation({
          id,
          type: 'text',
          x: point.x,
          y: point.y,
          text: '',
          fontSize: ANNOTATION_DEFAULT_FONT_SIZE,
          color: ANNOTATION_INK,
        })
      } else {
        addAnnotation({
          id,
          type: 'sticky',
          x: point.x,
          y: point.y,
          width: ANNOTATION_STICKY_SIZE.width,
          height: ANNOTATION_STICKY_SIZE.height,
          text: '',
          color: ANNOTATION_STICKY_BG,
          fontSize: ANNOTATION_DEFAULT_FONT_SIZE,
        })
      }
      finishPlacement(id)
      return
    }

    event.stopPropagation()
    event.preventDefault()
    layerRef.current.setPointerCapture(event.pointerId)

    if (tool === 'eraser') {
      const radius =
        ANNOTATION_ERASER_SCREEN_RADIUS / getLayerScale(layerRef.current)
      replaceAnnotations((current) =>
        erasePenAnnotationsAtPoint(current, point, radius),
      )
      setDraft({ type: 'eraser', last: point })
      bindStrokeListeners(event.pointerId)
      return
    }

    setSelectedId(null)
    setEditingId(null)

    if (tool === 'pen') {
      setDraft({
        type: 'pen',
        points: [point],
        strokeWidth: penStrokeWidth,
        color: penColor,
      })
      bindStrokeListeners(event.pointerId)
      return
    }

    if (tool === 'rect' || tool === 'ellipse') {
      setDraft({
        type: tool,
        x0: point.x,
        y0: point.y,
        x1: point.x,
        y1: point.y,
      })
      bindStrokeListeners(event.pointerId)
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!layerRef.current) return
    // Pen / eraser / shape drafts are driven by window listeners while active.
    if (activePointerIdRef.current !== null) return

    const resize = resizeRef.current
    if (resize && resize.pointerId === event.pointerId) {
      event.stopPropagation()
      const point = clientToLocal(
        layerRef.current,
        event.clientX,
        event.clientY,
      )
      const dx = point.x - resize.startX
      const dy = point.y - resize.startY
      const next = applyResizeHandle(
        resize.handle,
        {
          x: resize.originX,
          y: resize.originY,
          width: resize.originW,
          height: resize.originH,
        },
        dx,
        dy,
      )

      if (resize.originFontSize != null) {
        const scale = next.height / Math.max(resize.originH, 1)
        const fontSize = Math.min(
          72,
          Math.max(10, Math.round(resize.originFontSize * scale)),
        )
        updateAnnotation(resize.id, { fontSize })
      } else {
        updateAnnotation(resize.id, next)
      }
      return
    }

    const drag = dragRef.current
    if (drag && drag.pointerId === event.pointerId) {
      event.stopPropagation()
      const point = clientToLocal(
        layerRef.current,
        event.clientX,
        event.clientY,
      )
      const dx = point.x - drag.startX
      const dy = point.y - drag.startY
      if (!drag.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
        drag.moved = true
        setEditingId(null)
      }
      if (drag.moved) {
        updateAnnotation(drag.id, {
          x: drag.originX + dx,
          y: drag.originY + dy,
        })
      }
    }
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Active draw/erase/shape strokes finish via window listeners.
    if (activePointerIdRef.current === event.pointerId) return

    const resize = resizeRef.current
    if (resize && resize.pointerId === event.pointerId) {
      event.stopPropagation()
      layerRef.current?.releasePointerCapture(event.pointerId)
      resizeRef.current = null
      setDraggingId(null)
      setSelectedId(resize.id)
      return
    }

    const drag = dragRef.current
    if (drag && drag.pointerId === event.pointerId) {
      event.stopPropagation()
      layerRef.current?.releasePointerCapture(event.pointerId)
      dragRef.current = null
      setDraggingId(null)
      if (!drag.moved) {
        setSelectedId(drag.id)
      }
    }
  }

  const draftShape =
    draft && draft.type !== 'pen' && draft.type !== 'eraser'
      ? normalizeRect(draft.x0, draft.y0, draft.x1, draft.y1)
      : null

  const movableFor = (
    id: string,
    box: {
      x: number
      y: number
      width: number
      height: number
      fontSize?: number
    },
  ): MovableProps => {
    const isEraser = tool === 'eraser'
    const selected = selectedId === id
    const editing = editingId === id
    const canDrag = tool === 'select' && !isEraser
    const canInteract =
      !isEraser &&
      (tool === 'select' || selected || editing || !isAnnotating)

    return {
      selected,
      editing,
      canInteract,
      isEraser,
      canDrag,
      onSelect: () => {
        if (isEraser) return
        setSelectedId(id)
        if (tool !== 'select') setTool('select')
      },
      onStartEdit: () => {
        if (isEraser) return
        setSelectedId(id)
        setEditingId(id)
        setTool('select')
      },
      onStopEdit: () => {
        setEditingId((current) => (current === id ? null : current))
      },
      onErase: () => removeAnnotation(id),
      onDragStart: (event) => beginDrag(id, event, box.x, box.y),
      onResizeStart: (handle, event) => beginResize(id, handle, event, box),
    }
  }

  return (
    <div
      ref={layerRef}
      data-canvas-annotation-layer=""
      className={cn(
        'absolute inset-0 z-[60] touch-none',
        layerInteractive ? 'pointer-events-auto' : 'pointer-events-none',
        tool === 'pen' && 'cursor-none [&_*]:!cursor-none',
        (tool === 'rect' || tool === 'ellipse') && 'cursor-crosshair',
        tool === 'text' && 'cursor-text',
        tool === 'sticky' && 'cursor-copy',
        tool === 'eraser' && 'cursor-none [&_*]:!cursor-none',
        draggingId && 'cursor-grabbing',
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
        {annotations.map((annotation) => {
          if (annotation.type !== 'pen') return null
          return (
            <path
              key={annotation.id}
              data-annotation-id={annotation.id}
              d={pointsToPath(annotation.points)}
              fill="none"
              style={{ stroke: annotation.color }}
              strokeWidth={annotation.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none"
            />
          )
        })}

        {draft?.type === 'pen' ? (
          <path
            d={pointsToPath(draft.points)}
            fill="none"
            style={{ stroke: draft.color }}
            strokeWidth={draft.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {draft?.type === 'rect' && draftShape ? (
          <rect
            x={draftShape.x}
            y={draftShape.y}
            width={draftShape.width}
            height={draftShape.height}
            fill="none"
            style={{ stroke: ANNOTATION_INK }}
            strokeWidth={ANNOTATION_DEFAULT_STROKE}
            strokeDasharray="4 3"
          />
        ) : null}

        {draft?.type === 'ellipse' && draftShape ? (
          <ellipse
            cx={draftShape.x + draftShape.width / 2}
            cy={draftShape.y + draftShape.height / 2}
            rx={draftShape.width / 2}
            ry={draftShape.height / 2}
            fill="none"
            style={{ stroke: ANNOTATION_INK }}
            strokeWidth={ANNOTATION_DEFAULT_STROKE}
            strokeDasharray="4 3"
          />
        ) : null}
      </svg>

      {annotations.map((annotation) => {
        if (annotation.type === 'rect' || annotation.type === 'ellipse') {
          return (
            <ShapeAnnotationNode
              key={annotation.id}
              annotation={annotation}
              zoom={zoom}
              onUpdate={(patch) => updateAnnotation(annotation.id, patch)}
              {...movableFor(annotation.id, {
                x: annotation.x,
                y: annotation.y,
                width: annotation.width,
                height: annotation.height,
              })}
            />
          )
        }

        if (annotation.type === 'text') {
          const width = Math.max(80, annotation.fontSize * 8)
          const height = Math.max(32, annotation.fontSize * 2.2)
          return (
            <TextAnnotationNode
              key={annotation.id}
              annotation={annotation}
              zoom={zoom}
              onUpdate={(patch) => updateAnnotation(annotation.id, patch)}
              {...movableFor(annotation.id, {
                x: annotation.x,
                y: annotation.y,
                width,
                height,
                fontSize: annotation.fontSize,
              })}
            />
          )
        }

        if (annotation.type === 'sticky') {
          return (
            <StickyAnnotationNode
              key={annotation.id}
              annotation={annotation}
              zoom={zoom}
              onUpdate={(patch) => updateAnnotation(annotation.id, patch)}
              {...movableFor(annotation.id, {
                x: annotation.x,
                y: annotation.y,
                width: annotation.width,
                height: annotation.height,
              })}
            />
          )
        }

        return null
      })}
    </div>
  )
}
