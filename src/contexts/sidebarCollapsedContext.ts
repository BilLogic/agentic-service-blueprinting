import { useEffect } from 'react'
import { useSyncExternalStore } from 'react'

/**
 * What the collapsed sidebar's floating pill says, and who told it.
 *
 * Collapsing used to leave TWO chrome layers stacked: the pill floated
 * over the canvas's own navbar (the phase menubar, the slice header
 * band). The fix is not to dock the pill — it is to let the pill BE the
 * navbar while collapsed. The navbars hand it their identity (and their
 * primary action) and render nothing themselves, so there is exactly one
 * header on screen at any width.
 *
 * A module store rather than context: the navbars live deep inside canvas
 * content, several providers away from the shell that owns the state, and
 * this is a small signal — not worth threading through every surface.
 */
export type CollapsedNavSummary = {
  /** The one line the pill shows — phase name, slice title. */
  title: string
  /** Optional glyph the band prefixes its title with (◇ for slices). */
  glyph?: string
  /** The band's primary action, kept reachable while collapsed. */
  action?: { label: string; onClick: () => void }
}

type CollapsedState = {
  collapsed: boolean
  expand: () => void
  summary: CollapsedNavSummary | null
}

let state: CollapsedState = { collapsed: false, expand: () => {}, summary: null }
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

export function setSidebarCollapsedState(
  next: Pick<CollapsedState, 'collapsed' | 'expand'>,
): void {
  if (state.collapsed === next.collapsed && state.expand === next.expand) return
  state = { ...state, ...next }
  emit()
}

function setCollapsedNavSummary(summary: CollapsedNavSummary | null): void {
  if (state.summary === summary) return
  state = { ...state, summary }
  emit()
}

/**
 * Publish this navbar's identity to the pill while the sidebar is
 * collapsed. Pass null when the band is visible (it speaks for itself) or
 * has nothing to say. Clears on unmount so a stale title never outlives
 * the surface that owned it.
 */
export function useCollapsedNavSummary(summary: CollapsedNavSummary | null): void {
  const title = summary?.title ?? null
  const glyph = summary?.glyph ?? null
  const actionLabel = summary?.action?.label ?? null
  const onClick = summary?.action?.onClick
  useEffect(() => {
    if (title === null) return
    setCollapsedNavSummary({
      title,
      ...(glyph ? { glyph } : {}),
      ...(actionLabel && onClick
        ? { action: { label: actionLabel, onClick } }
        : {}),
    })
    return () => setCollapsedNavSummary(null)
  }, [title, glyph, actionLabel, onClick])
}

export function useSidebarCollapsedState(): CollapsedState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => state,
  )
}
