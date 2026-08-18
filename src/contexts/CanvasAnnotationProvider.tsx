import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  type CanvasAnnotation,
  type CanvasAnnotationTool,
  ANNOTATION_DEFAULT_FONT_SIZE,
  ANNOTATION_DEFAULT_PEN_STROKE,
  ANNOTATION_DEFAULT_STROKE,
  ANNOTATION_INK,
  ANNOTATION_AGENT_INK,
} from '@/lib/canvasAnnotations'
import { CanvasAnnotationContext } from '@/contexts/canvasAnnotationContext'
import { registerAgentAnnotator } from '@/lib/agent/uiBridge'
import { registerAgentUiCommand } from '@/lib/agent/uiCommands'

type CanvasAnnotationProviderProps = {
  children: ReactNode
}

export function CanvasAnnotationProvider({
  children,
}: CanvasAnnotationProviderProps) {
  const [tool, setTool] = useState<CanvasAnnotationTool>('select')
  const [penColor, setPenColor] = useState(ANNOTATION_INK)
  const [penStrokeWidth, setPenStrokeWidth] = useState(
    ANNOTATION_DEFAULT_PEN_STROKE,
  )
  const [annotations, setAnnotations] = useState<CanvasAnnotation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const addAnnotation = useCallback((annotation: CanvasAnnotation) => {
    setAnnotations((current) => [...current, annotation])
  }, [])

  const updateAnnotation = useCallback(
    (id: string, patch: Partial<CanvasAnnotation>) => {
      setAnnotations((current) =>
        current.map((item) =>
          item.id === id ? ({ ...item, ...patch } as CanvasAnnotation) : item,
        ),
      )
    },
    [],
  )

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((current) => current.filter((item) => item.id !== id))
    setSelectedId((current) => (current === id ? null : current))
  }, [])

  const replaceAnnotations = useCallback(
    (updater: (current: CanvasAnnotation[]) => CanvasAnnotation[]) => {
      setAnnotations(updater)
    },
    [],
  )

  const clearAnnotations = useCallback(() => {
    setAnnotations([])
    setSelectedId(null)
  }, [])

  // The agent's marker pen: boxes around cells (+ an optional text note),
  // in the same scratch layer, same data shape, same ephemerality as human
  // marks. Coordinates un-project the camera exactly like clientToLocal.
  useEffect(
    () =>
      registerAgentAnnotator((cellIds, note) => {
        const layer = document.querySelector<HTMLElement>(
          '[data-canvas-annotation-layer]',
        )
        if (!layer) return 'No annotatable canvas is open right now.'
        const layerRect = layer.getBoundingClientRect()
        const scale = layerRect.width / Math.max(layer.offsetWidth, 1)
        let drawn = 0
        let anchor: { x: number; y: number } | null = null
        for (const cellId of cellIds) {
          const el = document.querySelector(
            `[data-blueprint-cell="${cellId}"]`,
          )
          if (!el) continue
          const rect = el.getBoundingClientRect()
          const x = (rect.left - layerRect.left) / scale - 4
          const y = (rect.top - layerRect.top) / scale - 4
          setAnnotations((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              type: 'rect',
              x,
              y,
              width: rect.width / scale + 8,
              height: rect.height / scale + 8,
              strokeWidth: ANNOTATION_DEFAULT_STROKE,
              color: ANNOTATION_AGENT_INK,
              fillColor: null,
              text: '',
            },
          ])
          drawn += 1
          if (!anchor || y < anchor.y) anchor = { x, y }
        }
        if (drawn === 0)
          return 'None of those cells are on the open canvas — open their scenario first.'
        if (note && anchor) {
          const at = anchor
          setAnnotations((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              type: 'text',
              x: at.x,
              y: at.y - ANNOTATION_DEFAULT_FONT_SIZE - 10,
              text: note,
              fontSize: ANNOTATION_DEFAULT_FONT_SIZE,
              color: ANNOTATION_AGENT_INK,
            },
          ])
        }
        return `Drew boxes around ${drawn} cell(s)${note ? ' with a note' : ''}. Marks are ephemeral — the capture menu saves or sends them.`
      }),
    [],
  )

  useEffect(
    () =>
      registerAgentUiCommand({
        name: 'clear_annotations',
        description: 'Erase every annotation mark from the canvas scratch layer.',
        run: () => {
          clearAnnotations()
          return 'Annotations cleared.'
        },
      }),
    [clearAnnotations],
  )

  const value = useMemo(
    () => ({
      tool,
      setTool,
      penColor,
      setPenColor,
      penStrokeWidth,
      setPenStrokeWidth,
      annotations,
      addAnnotation,
      updateAnnotation,
      removeAnnotation,
      replaceAnnotations,
      clearAnnotations,
      selectedId,
      setSelectedId,
      // The hand is a *navigation* tool, not an annotation tool — counting
      // it here disabled the viewport's drag-pan the moment the hand was
      // picked, which is the exact gesture the hand exists to provide.
      isAnnotating: tool !== 'select' && tool !== 'hand',
    }),
    [
      tool,
      penColor,
      penStrokeWidth,
      annotations,
      addAnnotation,
      updateAnnotation,
      removeAnnotation,
      replaceAnnotations,
      clearAnnotations,
      selectedId,
    ],
  )

  return (
    <CanvasAnnotationContext.Provider value={value}>
      {children}
    </CanvasAnnotationContext.Provider>
  )
}
