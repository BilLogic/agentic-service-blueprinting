import { createContext, useContext } from 'react'
import type {
  CanvasAnnotation,
  CanvasAnnotationTool,
} from '@/lib/canvasAnnotations'

export type CanvasAnnotationContextValue = {
  tool: CanvasAnnotationTool
  setTool: (tool: CanvasAnnotationTool) => void
  penColor: string
  setPenColor: (color: string) => void
  penStrokeWidth: number
  setPenStrokeWidth: (width: number) => void
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
  isAnnotating: boolean
}

export const CanvasAnnotationContext =
  createContext<CanvasAnnotationContextValue | null>(null)

export function useCanvasAnnotations() {
  const context = useContext(CanvasAnnotationContext)
  if (!context) {
    throw new Error(
      'useCanvasAnnotations must be used within CanvasAnnotationProvider',
    )
  }
  return context
}

/**
 * The annotation state, or null outside the canvas.
 *
 * For components that render both inside the canvas and in portalled chrome —
 * the detail drawer draws tech pills with the same `BlueprintCellButton` the
 * grid uses, and the drawer lives outside `CanvasAnnotationProvider`. The
 * throwing variant above turned that into an app-wide white screen: one pill
 * inside the drawer, one throw during render, no boundary in between. A
 * component that can legitimately live on either side of the provider must
 * read the context as a question, not an assertion.
 */
export function useCanvasAnnotationsOptional() {
  return useContext(CanvasAnnotationContext)
}
