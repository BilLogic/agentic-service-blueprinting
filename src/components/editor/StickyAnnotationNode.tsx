import { cn } from '@/lib/utils'
import type {
  PlacedAnnotation,
  StickyAnnotation,
} from '@/lib/canvasAnnotations'
import { useFocusTextarea } from '@/hooks/useFocusTextarea'
import { ResizeHandles } from '@/components/editor/CanvasAnnotationResizeHandles'
import { AnnotationStyleBar } from '@/components/editor/AnnotationStyleBar'
import type { MovableProps } from '@/components/editor/canvasAnnotationNodeProps'

/** A sticky note: a coloured square that is a textarea all the way through. */
export function StickyAnnotationNode({
  annotation,
  zoom,
  onUpdate,
  ...movable
}: MovableProps & {
  annotation: StickyAnnotation
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
  const textareaRef = useFocusTextarea(editing)

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
