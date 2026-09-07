import { useEffect, useRef } from 'react'
import { useSyncExternalStore } from 'react'
import type { PathOption } from '@/components/blueprint/PathMultiSelect'

/**
 * What the collapsed sidebar's floating navbar says, and who told it.
 *
 * Collapsing used to leave TWO chrome lanes stacked: the navbar floated
 * over the canvas's own navbar (the phase menubar, the slice header
 * band). The fix is not to dock the navbar — it is to let it BE the
 * navbar while collapsed. The navbars hand it their identity (and their
 * primary action) and render nothing themselves, so there is exactly one
 * header on screen at any width.
 *
 * A module store rather than context: the navbars live deep inside canvas
 * content, several providers away from the shell that owns the state, and
 * this is a small signal — not worth threading through every surface.
 */
export type CollapsedNavSummary = {
  /** The one line the navbar shows — phase name, slice title. */
  title: string
  /** Optional glyph the band prefixes its title with (◇ for slices). */
  glyph?: string
  /** The band's primary action, kept reachable while collapsed. */
  action?: { label: string; onClick: () => void }
  /**
   * The scenario's paths, so the collapsed navbar can carry the path selector
   * without the sidebar being expanded (#305). Present only when a SCENARIO is
   * the surface being described — a phase publishes none, which is exactly why
   * the selector self-hides there. The floating navbar mounts `PathSelectorMenu`
   * with these, and that control returns nothing when the list is empty.
   */
  paths?: PathOption[]
}

type CollapsedState = {
  collapsed: boolean
  summary: CollapsedNavSummary | null
}

let state: CollapsedState = { collapsed: false, summary: null }
/**
 * Who published the summary on screen.
 *
 * The store is last-writer-wins, which is right — a newly mounted band
 * speaks for the surface the user just moved to. Unmounting is the case
 * that is NOT symmetric: a band tearing down after its successor published
 * would otherwise clear the successor's title and leave the navbar blank.
 * Only the current owner may clear.
 */
let owner: object | null = null
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

export function setSidebarCollapsedState(
  next: Pick<CollapsedState, 'collapsed'>,
): void {
  if (state.collapsed === next.collapsed) return
  state = { ...state, ...next }
  emit()
}

function sameSummary(
  a: CollapsedNavSummary | null,
  b: CollapsedNavSummary | null,
): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  return (
    a.title === b.title &&
    a.glyph === b.glyph &&
    a.action?.label === b.action?.label &&
    a.action?.onClick === b.action?.onClick &&
    // Identity, not element-wise: the publisher memoizes the option list, so a
    // fresh array is a real change (paths loaded, a rename landed) and an equal
    // one is the same array. Comparing contents here would only re-walk what
    // the memo already settled.
    a.paths === b.paths
  )
}

function setCollapsedNavSummary(
  by: object,
  summary: CollapsedNavSummary | null,
): void {
  // Field comparison, not identity: every publisher builds a fresh object,
  // so an identity check only ever caught null-over-null and every real
  // republish woke every subscriber.
  if (summary === null) {
    if (owner !== by) return
    owner = null
  } else {
    owner = by
  }
  if (sameSummary(state.summary, summary)) return
  state = { ...state, summary }
  emit()
}

/**
 * Publish this navbar's identity to the floating one while the sidebar is
 * collapsed. Pass null when the band is visible (it speaks for itself) or
 * has nothing to say. Clears on unmount so a stale title never outlives
 * the surface that owned it.
 */
export function useCollapsedNavSummary(summary: CollapsedNavSummary | null): void {
  // Identity for this mount, so the store can tell "I am done" from
  // "someone else's band is done" when the two overlap.
  const self = useRef<object>({})
  const title = summary?.title ?? null
  const glyph = summary?.glyph ?? null
  const actionLabel = summary?.action?.label ?? null
  const onClick = summary?.action?.onClick
  // Depended on by identity, matching how the store compares it — the caller
  // memoizes the option list, so a stable array does not re-publish.
  const paths = summary?.paths
  useEffect(() => {
    if (title === null) return
    const by = self.current
    setCollapsedNavSummary(by, {
      title,
      ...(glyph ? { glyph } : {}),
      ...(actionLabel && onClick
        ? { action: { label: actionLabel, onClick } }
        : {}),
      ...(paths ? { paths } : {}),
    })
    return () => setCollapsedNavSummary(by, null)
  }, [title, glyph, actionLabel, onClick, paths])
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
