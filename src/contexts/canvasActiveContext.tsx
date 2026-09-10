import {
  createContext,
  useContext,
  useEffect,
  type DependencyList,
  type ReactNode,
} from 'react'

/**
 * Whether this canvas is the one the reader is looking at.
 * Hidden warm views stay mounted but must not own agent commands or the
 * active-camera register. Default true so a viewport outside the shell
 * (tests, phone) keeps today's registration.
 */
const CanvasActiveContext = createContext(true)

/**
 * @param active - false while this view is open but not the current one
 */
export function CanvasActiveProvider({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
  return (
    <CanvasActiveContext.Provider value={active}>
      {children}
    </CanvasActiveContext.Provider>
  )
}

/** True when this tree may own the camera and agent canvas commands. */
export function useCanvasActive(): boolean {
  return useContext(CanvasActiveContext)
}

/**
 * `useEffect` that does not run while this canvas is not current (ADR 0010).
 *
 * @param effect - same contract as `useEffect`: optional cleanup
 * @param deps - values the effect closes over; canvas-active is implied
 */
export function useCanvasActiveEffect(
  effect: () => void | (() => void),
  deps: DependencyList,
): void {
  const canvasActive = useCanvasActive()
  useEffect(() => {
    if (!canvasActive) return
    return effect()
    // Gate is canvasActive; callers list everything the effect reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasActive, ...deps])
}
