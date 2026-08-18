import { useSyncExternalStore } from 'react'

/**
 * The one breakpoint gate for the mobile shell. Below this width the editor
 * renders the view-only mobile experience; at or above it, the desktop shell
 * — byte-for-byte the pre-mobile tree.
 *
 * Synchronous by design: the shadcn `useIsMobile` resolves in an effect, so
 * its first paint is always "desktop", which on a phone means mounting the
 * full desktop canvas for one frame and then tearing it down. Reading
 * `matchMedia` inside `useSyncExternalStore`'s snapshot gives the correct
 * answer on the very first render.
 */
export const MOBILE_SHELL_QUERY = '(max-width: 767px)'

export function isMobileViewport(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia(MOBILE_SHELL_QUERY).matches
  )
}

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(MOBILE_SHELL_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

export function useMobileShell(): boolean {
  return useSyncExternalStore(subscribe, isMobileViewport, () => false)
}
