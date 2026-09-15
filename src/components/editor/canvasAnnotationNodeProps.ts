import type { PointerEvent as ReactPointerEvent } from 'react'
import type { ResizeHandle } from '@/lib/canvasAnnotations'

/**
 * Everything an annotation node needs that is not the annotation: whether it
 * is selected, being edited, reachable at all, and the callbacks that ask the
 * layer to change one of those. The layer mints one of these per mark; a node
 * reads it and never reaches past it, which is why the three nodes can sit in
 * modules of their own without knowing the machine exists.
 *
 * It carried an `onStopEdit` for a while, minted by the layer for every mark
 * and called by nothing: a mark's editor is closed from the layer's own key
 * and click-outside handling, never from inside the mark. A callback nobody
 * calls is a claim about the seam that is not true, so it is gone.
 */
export type MovableProps = {
  selected: boolean
  editing: boolean
  canInteract: boolean
  isEraser: boolean
  canDrag: boolean
  onSelect: () => void
  onStartEdit: () => void
  onErase: () => void
  onDragStart: (event: ReactPointerEvent<HTMLElement>) => void
  onResizeStart: (
    handle: ResizeHandle,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
}
