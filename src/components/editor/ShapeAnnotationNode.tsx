import { cn } from '@/lib/utils'
import {
  annotationTextOnFill,
  type ShapeAnnotation,
} from '@/lib/canvasAnnotations'
import { useFocusTextarea } from '@/hooks/useFocusTextarea'
import { ResizeHandles } from '@/components/editor/CanvasAnnotationResizeHandles'
import { ShapeStyleBar } from '@/components/editor/ShapeStyleBar'
import type { MovableProps } from '@/components/editor/canvasAnnotationNodeProps'

/** A drawn rectangle or ellipse, with its optional label fitted inside it. */
export function ShapeAnnotationNode({
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
