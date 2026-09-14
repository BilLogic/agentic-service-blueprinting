import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  useCanvasAnnotations,
  useCanvasAnnotationTool,
} from '@/contexts/canvasAnnotationContext'
import {
  ANNOTATION_DEFAULT_FONT_SIZE,
  ANNOTATION_DEFAULT_STROKE,
  ANNOTATION_ERASER_SCREEN_RADIUS,
  ANNOTATION_INK,
  ANNOTATION_STICKY_BG,
  ANNOTATION_STICKY_SIZE,
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
} from '@/lib/canvasAnnotations'
import {
  createFramePatchQueue,
  releasePointerCapture,
} from '@/lib/pointerGestures'
import {
  clientToLocal,
  getLayerScale,
  pointsToPath,
} from '@/components/editor/canvasAnnotationGeometry'
import { useFocusTextarea } from '@/hooks/useFocusTextarea'
import { ResizeHandles } from '@/components/editor/CanvasAnnotationResizeHandles'
import { ShapeStyleBar } from '@/components/editor/ShapeStyleBar'
import { StickyStyleBar } from '@/components/editor/StickyStyleBar'
import { TextStyleBar } from '@/components/editor/TextStyleBar'
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
              // geometry: type is fitted to the drawn annotation box.
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
              // geometry: type is fitted to the drawn annotation box.
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
            : 'border border-annotation-plate',
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
          // geometry: type is fitted to the drawn annotation box.
          className={cn(
            'size-full resize-none border-0 font-sans leading-snug text-annotation-plate-foreground outline-none placeholder:text-(--foreground-annotation-chrome-tertiary)',
            editing || selected
              ? 'pointer-events-auto cursor-text'
              : 'pointer-events-none cursor-inherit',
            annotation.bold && 'font-medium',
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
          showChrome && 'border-2 border-annotation-selected bg-(--background-annotation-plate)',
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
            // geometry: type is fitted to the drawn annotation box.
            className={cn(
              'w-full resize-none px-1.5 py-1 font-sans leading-snug outline-none',
              'pointer-events-auto cursor-text',
              textAlignClass,
              annotation.bold && 'font-medium',
              annotation.strike && 'line-through',
              showChrome
                ? 'border-0 bg-transparent text-inherit'
                : 'rounded-sm border border-muted bg-card/95 text-foreground shadow-sm focus:border-ring',
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
            // geometry: type is fitted to the drawn annotation box.
            className={cn(
              'max-w-full px-1.5 py-1 whitespace-pre-wrap font-sans leading-snug',
              textAlignClass,
              annotation.bold && 'font-medium',
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
 * What a drag or a resize may change: the box, and the font size a sticky's
 * corner scales with. Narrower than `Partial<CanvasAnnotation>` on purpose —
 * merging two members of that union widens `type` into something assignable to
 * none of them, and neither gesture touches `type` anyway.
 */
type AnnotationBoxPatch = {
  x?: number
  y?: number
  width?: number
  height?: number
  fontSize?: number
}

/**
 * FigJam-style annotation surface over the canvas: pen strokes, shapes, text and
 * stickies, plus their selection and resize chrome. Coordinates are board space,
 * so `zoom` is only needed where a hit radius must stay constant on screen.
 */
export function CanvasAnnotationLayer({ zoom = 1 }: { zoom?: number }) {
  const { tool, setTool, penColor, penStrokeWidth, isAnnotating } =
    useCanvasAnnotationTool()
  const {
    annotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    replaceAnnotations,
    selectedId,
    setSelectedId,
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
  /*
    A drag publishes ONCE A FRAME, not once a pointer sample.

    Dragging or resizing a mark used to call `updateAnnotation` straight off
    every raw `pointermove` — a hundred and twenty times a second on a
    trackpad, each one replacing the annotation collection and re-rendering
    every surface that reads it. The pen path in this file already keeps its
    stroke in a ref and publishes on a frame, and the eraser below batches the
    same way; this is that pattern applied to the third path, which was the
    one left behind.
  */
  const [boxPatches] = useState(() =>
    createFramePatchQueue<AnnotationBoxPatch>(),
  )
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
      boxPatches.cancel()
    },
    // Mount/unmount only — refs keep listeners current, and the queue is
    // minted once by `useState` so naming it here changes nothing.
    [boxPatches],
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
        // This Escape is the layer's: it clears the mark's selection or its
        // editor. Claim it, or the canvas's own Escape — the animated return
        // to the overview — fires on the same keystroke whenever the editor's
        // textarea has not taken focus yet, and the board zooms out from
        // under a mark the person is still working on.
        event.preventDefault()
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

      releasePointerCapture(layer, pointerId)

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
        boxPatches.schedule(resize.id, { fontSize }, updateAnnotation)
      } else {
        boxPatches.schedule(resize.id, next, updateAnnotation)
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
        boxPatches.schedule(
          drag.id,
          { x: drag.originX + dx, y: drag.originY + dy },
          updateAnnotation,
        )
      }
    }
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Active draw/erase/shape strokes finish via window listeners.
    if (activePointerIdRef.current === event.pointerId) return

    const resize = resizeRef.current
    if (resize && resize.pointerId === event.pointerId) {
      event.stopPropagation()
      // The frame this interrupts still owes a patch — publish it before the
      // state that names its subject is cleared.
      boxPatches.flush()
      resizeRef.current = null
      setDraggingId(null)
      setSelectedId(resize.id)
      releasePointerCapture(layerRef.current, event.pointerId)
      return
    }

    const drag = dragRef.current
    if (drag && drag.pointerId === event.pointerId) {
      event.stopPropagation()
      boxPatches.flush()
      dragRef.current = null
      setDraggingId(null)
      if (!drag.moved) {
        setSelectedId(drag.id)
      }
      releasePointerCapture(layerRef.current, event.pointerId)
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
        'absolute inset-0 z-60 touch-none',
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
