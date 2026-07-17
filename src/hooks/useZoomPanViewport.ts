import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import {
  BLUEPRINT_VIEWPORT_ARTBOARD_MARGIN,
  BLUEPRINT_VIEWPORT_FIT_TOP_INSET,
} from '@/lib/slideLayout'

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4

export const BLUEPRINT_ARTBOARD_SELECTOR = '[data-blueprint-artboard]'
/** Root wrapper for fit-to-view / centering across overview and detail canvases. */
export const CANVAS_FIT_SELECTOR = '[data-canvas-fit]'

export function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

type UseZoomPanViewportOptions = {
  /** When this value changes, the viewport recenters and fits content. */
  resetKey?: string
  /** Ignore pan start on these selectors (e.g. interactive controls). */
  panIgnoreSelector?: string
  /** Element used to compute fit-to-view bounds. */
  fitSelector?: string
  /** Refit whenever the content box resizes (e.g. async blueprint panels). */
  refitOnResize?: boolean
  /** Debounce for refitOnResize (ms). */
  refitDebounceMs?: number
}

function applyTransformToElement(
  el: HTMLElement,
  pan: { x: number; y: number },
  zoom: number,
) {
  el.style.transform = `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`
}

function measureFitBounds(
  content: HTMLElement,
  fitTarget: HTMLElement,
  zoom: number,
): { left: number; top: number; width: number; height: number } {
  if (fitTarget === content) {
    return {
      left: 0,
      top: 0,
      width: content.scrollWidth,
      height: content.scrollHeight,
    }
  }

  const contentRect = content.getBoundingClientRect()
  const targetRect = fitTarget.getBoundingClientRect()
  const safeZoom = zoom || 1

  return {
    left: (targetRect.left - contentRect.left) / safeZoom,
    top: (targetRect.top - contentRect.top) / safeZoom,
    width: targetRect.width / safeZoom,
    height: targetRect.height / safeZoom,
  }
}

export function useZoomPanViewport(options: UseZoomPanViewportOptions = {}) {
  const {
    resetKey,
    panIgnoreSelector = 'button, a, input, textarea, select, [role="button"]',
    fitSelector = CANVAS_FIT_SELECTOR,
    refitOnResize = true,
    refitDebounceMs = 200,
  } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const transformRef = useRef({ pan: { x: 0, y: 0 }, zoom: 1 })
  const pendingFitRef = useRef(false)
  const userAdjustedViewRef = useRef(false)

  const commitTransform = useCallback(
    (
      nextPan: { x: number; y: number },
      nextZoom: number,
      syncReact = false,
    ) => {
      transformRef.current = { pan: nextPan, zoom: nextZoom }
      const el = contentRef.current
      if (el) {
        applyTransformToElement(el, nextPan, nextZoom)
      }
      if (syncReact) {
        setPan(nextPan)
        setZoom(nextZoom)
      }
    },
    [],
  )

  const zoomAtPoint = useCallback(
    (clientX: number, clientY: number, scaleFactor: number, syncReact = true) => {
      const el = containerRef.current
      if (!el) return

      userAdjustedViewRef.current = true

      const rect = el.getBoundingClientRect()
      const mx = clientX - rect.left
      const my = clientY - rect.top
      const { pan: p, zoom: z } = transformRef.current
      const newZoom = clampZoom(z * scaleFactor)
      const worldX = (mx - p.x) / z
      const worldY = (my - p.y) / z
      const nextPan = {
        x: mx - worldX * newZoom,
        y: my - worldY * newZoom,
      }

      commitTransform(nextPan, newZoom, syncReact)
    },
    [commitTransform],
  )

  const fitToView = useCallback(() => {
    const el = containerRef.current
    const content = contentRef.current
    if (!el || !content) return

    const margin = BLUEPRINT_VIEWPORT_ARTBOARD_MARGIN
    const fitTarget =
      content.querySelector<HTMLElement>(fitSelector) ?? content
    const { zoom: currentZoom } = transformRef.current
    const bounds = measureFitBounds(content, fitTarget, currentZoom)

    const insets = {
      top: margin + BLUEPRINT_VIEWPORT_FIT_TOP_INSET,
      right: margin,
      bottom: margin,
      left: margin,
    }
    const fitWidth = Math.max(el.clientWidth - insets.left - insets.right, 1)
    const fitHeight = Math.max(el.clientHeight - insets.top - insets.bottom, 1)
    if (bounds.width <= 0 || bounds.height <= 0) return

    const nextZoom = clampZoom(
      Math.min(fitWidth / bounds.width, fitHeight / bounds.height, 1),
    )

    const targetCenterX = bounds.left + bounds.width / 2
    const targetCenterY = bounds.top + bounds.height / 2
    const viewportCenterX = insets.left + fitWidth / 2
    const viewportCenterY = insets.top + fitHeight / 2

    commitTransform(
      {
        x: viewportCenterX - targetCenterX * nextZoom,
        y: viewportCenterY - targetCenterY * nextZoom,
      },
      nextZoom,
      true,
    )
  }, [commitTransform, fitSelector])

  const resetView = useCallback(() => {
    userAdjustedViewRef.current = false
    commitTransform({ x: 0, y: 0 }, 1, true)
  }, [commitTransform])

  useLayoutEffect(() => {
    const { pan: p, zoom: z } = transformRef.current
    commitTransform(p, z, false)
  }, [commitTransform])

  useEffect(() => {
    if (resetKey === undefined) return
    pendingFitRef.current = true
    userAdjustedViewRef.current = false

    let frame1 = 0
    let frame2 = 0
    const runFit = () => {
      if (!pendingFitRef.current) return
      fitToView()
    }

    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(runFit)
    })

    const timeout = window.setTimeout(() => {
      if (!pendingFitRef.current) return
      fitToView()
      pendingFitRef.current = false
    }, 150)

    return () => {
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frame2)
      window.clearTimeout(timeout)
    }
  }, [resetKey, fitToView])

  useEffect(() => {
    const content = contentRef.current
    const container = containerRef.current
    if (!content) return

    let debounceTimer = 0

    const scheduleFit = () => {
      if (userAdjustedViewRef.current) return

      if (refitOnResize) {
        window.clearTimeout(debounceTimer)
        debounceTimer = window.setTimeout(() => fitToView(), refitDebounceMs)
        return
      }
      if (!pendingFitRef.current) return
      fitToView()
      pendingFitRef.current = false
    }

    const observer = new ResizeObserver(scheduleFit)

    observer.observe(content)
    if (container) observer.observe(container)

    return () => {
      window.clearTimeout(debounceTimer)
      observer.disconnect()
    }
  }, [fitToView, resetKey, refitOnResize, refitDebounceMs])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const scaleFactor = Math.exp(-e.deltaY * 0.01)
        zoomAtPoint(e.clientX, e.clientY, scaleFactor, true)
        return
      }

      if (e.deltaX !== 0 || e.deltaY !== 0) {
        e.preventDefault()
        userAdjustedViewRef.current = true
        const { pan: p, zoom: z } = transformRef.current
        commitTransform(
          {
            x: p.x - e.deltaX,
            y: p.y - e.deltaY,
          },
          z,
          false,
        )
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [commitTransform, zoomAtPoint])

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      if (panIgnoreSelector && target.closest(panIgnoreSelector)) return

      userAdjustedViewRef.current = true
      containerRef.current?.setPointerCapture(e.pointerId)
      setIsPanning(true)
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: transformRef.current.pan.x,
        panY: transformRef.current.pan.y,
      }
    },
    [panIgnoreSelector],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isPanning) return
      commitTransform(
        {
          x: panStart.current.panX + (e.clientX - panStart.current.x),
          y: panStart.current.panY + (e.clientY - panStart.current.y),
        },
        transformRef.current.zoom,
        false,
      )
    },
    [commitTransform, isPanning],
  )

  const handlePointerUp = useCallback((e: PointerEvent) => {
    setIsPanning(false)
    containerRef.current?.releasePointerCapture(e.pointerId)
  }, [])

  const zoomIn = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.2)
  }, [zoomAtPoint])

  const zoomOut = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, 1 / 1.2)
  }, [zoomAtPoint])

  return {
    containerRef,
    contentRef,
    pan,
    zoom,
    isPanning,
    fitToView,
    resetView,
    zoomIn,
    zoomOut,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerUp,
    },
  }
}
