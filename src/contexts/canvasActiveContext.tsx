import { createContext, useContext, type ReactNode } from 'react'

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
