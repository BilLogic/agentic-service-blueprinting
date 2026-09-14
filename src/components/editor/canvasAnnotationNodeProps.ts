import type { PointerEvent as ReactPointerEvent } from 'react'
import type { ResizeHandle } from '@/lib/canvasAnnotations'

/**
 * Everything an annotation node needs that is not the annotation: whether it
 * is selected, being edited, reachable at all, and the callbacks that ask the
 * layer to change one of those. The layer mints one of these per mark; a node
 * reads it and never reaches past it, which is why the three nodes can sit in
 * modules of their own without knowing the machine exists.
 */
export type MovableProps = {
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
