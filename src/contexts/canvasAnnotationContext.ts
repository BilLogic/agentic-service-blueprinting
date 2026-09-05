import { createContext, useContext } from 'react'
import type {
  CanvasAnnotation,
  CanvasAnnotationTool,
} from '@/lib/canvasAnnotations'

/**
 * The annotation state is TWO contexts, and the split is a render-cost fix.
 *
 * One value carried both the marks and the tool. The marks change on every
 * pointer sample of a drag; the tool changes when somebody clicks the
 * toolbar. A context consumer re-renders whenever the value's identity
 * changes, no matter which field it reads and no matter how well it is
 * memoized — so dragging one sticky note re-rendered every cell on the
 * board, because `BlueprintCellButton` reads `tool` out of the same object
 * the marks travel in.
 *
 * `CanvasAnnotationToolContext` is the slow half: tool, pen settings, and
 * the `isAnnotating` verdict derived from them. Hundreds of cells, the
 * marquee, the pen cursor and the viewport read only this, so a drag cannot
 * reach them at all. `CanvasAnnotationContext` is the fast half — the marks
 * themselves — and its consumers are the four surfaces that draw them.
 *
 * This is the same move the hover split made for the same reason; see
 * `BlueprintCellDetailContext`.
 */
export type CanvasAnnotationToolContextValue = {
  tool: CanvasAnnotationTool
  setTool: (tool: CanvasAnnotationTool) => void
  penColor: string
  setPenColor: (color: string) => void
  penStrokeWidth: number
  setPenStrokeWidth: (width: number) => void
  isAnnotating: boolean
}

export type CanvasAnnotationContextValue = {
  annotations: CanvasAnnotation[]
  addAnnotation: (annotation: CanvasAnnotation) => void
  updateAnnotation: (id: string, patch: Partial<CanvasAnnotation>) => void
  removeAnnotation: (id: string) => void
  replaceAnnotations: (
    updater: (current: CanvasAnnotation[]) => CanvasAnnotation[],
  ) => void
  clearAnnotations: () => void
  selectedId: string | null
  setSelectedId: (id: string | null) => void
}

export const CanvasAnnotationToolContext =
  createContext<CanvasAnnotationToolContextValue | null>(null)

export const CanvasAnnotationContext =
  createContext<CanvasAnnotationContextValue | null>(null)

export function useCanvasAnnotationTool() {
  const context = useContext(CanvasAnnotationToolContext)
  if (!context) {
    throw new Error(
      'useCanvasAnnotationTool must be used within CanvasAnnotationProvider',
    )
  }
  return context
}

/**
 * The tool, or null outside the canvas.
 *
 * For components that render both inside the canvas and in portalled chrome —
 * the detail drawer draws touchpoints with the same `BlueprintCellButton` the
 * grid uses, and the drawer lives outside `CanvasAnnotationProvider`. The
 * throwing variant above turned that into an app-wide white screen: one touchpoint
 * inside the drawer, one throw during render, no boundary in between. A
 * component that can legitimately live on either side of the provider must
 * read the context as a question, not an assertion.
 */
export function useCanvasAnnotationToolOptional() {
  return useContext(CanvasAnnotationToolContext)
}

export function useCanvasAnnotations() {
  const context = useContext(CanvasAnnotationContext)
  if (!context) {
    throw new Error(
      'useCanvasAnnotations must be used within CanvasAnnotationProvider',
    )
  }
  return context
}
