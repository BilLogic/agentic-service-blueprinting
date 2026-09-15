import { cn } from '@/lib/utils'
import type {
  PlacedAnnotation,
  TextAnnotation,
} from '@/lib/canvasAnnotations'
import { useFocusTextarea } from '@/hooks/useFocusTextarea'
import { annotationTextBox } from '@/components/editor/canvasAnnotationGeometry'
import { ResizeHandles } from '@/components/editor/CanvasAnnotationResizeHandles'
import { AnnotationStyleBar } from '@/components/editor/AnnotationStyleBar'
import type { MovableProps } from '@/components/editor/canvasAnnotationNodeProps'

/** Bare type on the board, which shows its editor until it holds something. */
export function TextAnnotationNode({
  annotation,
  zoom,
  onUpdate,
  ...movable
}: MovableProps & {
  annotation: TextAnnotation
  zoom: number
  onUpdate: (patch: Partial<PlacedAnnotation>) => void
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
  const { width: approxWidth, height: approxHeight } = annotationTextBox(
    annotation.fontSize,
  )
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
        <AnnotationStyleBar
          mark={annotation}
          zoom={zoom}
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
