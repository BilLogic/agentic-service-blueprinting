import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type CanvasZoomChromeState = {
  onResetView?: () => void
  zoomIn?: () => void
  zoomOut?: () => void
  /**
   * Frames the fit target. Matches `useZoomPanViewport`'s `fitToView`, so a
   * consumer can pass `{ animate: true }` rather than wrapping at publish time.
   */
  fitToView?: (options?: { animate?: boolean }) => unknown
}

type CanvasZoomChromeContextValue = {
  chrome: CanvasZoomChromeState | null
  setChrome: (next: CanvasZoomChromeState | null) => void
}

const CanvasZoomChromeContext =
  createContext<CanvasZoomChromeContextValue | null>(null)

export function CanvasZoomChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<CanvasZoomChromeState | null>(null)
  const setChrome = useCallback((next: CanvasZoomChromeState | null) => {
    setChromeState(next)
  }, [])

  const value = useMemo(
    () => ({ chrome, setChrome }),
    [chrome, setChrome],
  )

  return (
    <CanvasZoomChromeContext.Provider value={value}>
      {children}
    </CanvasZoomChromeContext.Provider>
  )
}

export function useCanvasZoomChrome() {
  return useContext(CanvasZoomChromeContext)
}

/** Publishes zoom chrome from the active viewport; clears on unmount. */
export function usePublishCanvasZoomChrome(
  chrome: CanvasZoomChromeState = {},
) {
  // Depend on the stable setter only — depending on the whole context value
  // loops: publishing chrome changes the value identity, which re-runs the
  // effect, which publishes a fresh object, forever ("Maximum update depth
  // exceeded" storms that re-render the entire canvas subtree).
  const setChrome = useContext(CanvasZoomChromeContext)?.setChrome
  const { onResetView, zoomIn, zoomOut, fitToView } = chrome

  useEffect(() => {
    if (!setChrome) return
    setChrome({ onResetView, zoomIn, zoomOut, fitToView })
    return () => setChrome(null)
  }, [setChrome, onResetView, zoomIn, zoomOut, fitToView])
}
