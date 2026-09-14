import type { PointerEvent as ReactPointerEvent } from 'react'
import type { ResizeHandle } from '@/lib/canvasAnnotations'

/**
 * The four corner grips a selected annotation wears. They do nothing
 * themselves: each reports its own corner and the pointer event that started
 * on it, and the layer's resize machine does the arithmetic.
 */

const RESIZE_CURSOR: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  se: 'nwse-resize',
}

export function ResizeHandles({
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
          className="pointer-events-auto absolute z-20 size-3 rounded-[2px] border-2 border-annotation-selected bg-(--background-annotation-plate) shadow-none"
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
