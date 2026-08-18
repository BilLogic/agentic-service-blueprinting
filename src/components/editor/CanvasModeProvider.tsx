import { useMemo, useSyncExternalStore, type ReactNode } from 'react'
import {
  CanvasModeContext,
  getSharedCanvasMode,
  setSharedCanvasMode,
  subscribeSharedCanvasMode,
  type CanvasMode,
} from '@/contexts/canvasModeContext'
import { useSupabase } from '@/contexts/SupabaseProvider'

/*
  One mode for the whole session, module-level (store lives in
  canvasModeContext.ts so non-React readers can reach it).

  This began as per-surface state ("editing a slice while reading the base
  blueprint is a normal thing to want") and lost to how it actually feels:
  flipping to Edit, opening a slice tab, and landing back in View reads as
  the switch not having taken. Mode is the person's posture, not the
  surface's — it follows them across tabs. Deliberately not in the URL: a
  shared link should open in View whatever the sender was doing.
*/

/** Provides the shared mode to one canvas surface. */
export function CanvasModeProvider({ children }: { children: ReactNode }) {
  const { canWrite } = useSupabase()
  const mode = useSyncExternalStore(
    subscribeSharedCanvasMode,
    getSharedCanvasMode,
    () => 'view' as CanvasMode,
  )

  const value = useMemo(
    () => ({
      // Without write access there is no design mode to be in — falling back
      // to `view` means a session that loses access mid-edit degrades to
      // reading rather than to a broken editor.
      mode: canWrite ? mode : ('view' as CanvasMode),
      setMode: setSharedCanvasMode,
      available: canWrite,
    }),
    [canWrite, mode],
  )

  return (
    <CanvasModeContext.Provider value={value}>
      {children}
    </CanvasModeContext.Provider>
  )
}
