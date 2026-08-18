import { useEffect, useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** How long a surface may load before its skeleton is allowed to paint. */
export const SKELETON_HOLD_MS = 250
/** Fade-in for the skeleton, and for content that replaces a shown one. */
const FADE_CLASS = 'animate-in fade-in duration-200'

type SkeletonSession = {
  /** When this surface started loading (not when this instance mounted). */
  startedAt: number
  /** True once the hold elapsed and the skeleton actually painted. */
  shown: boolean
  /** Mounted wrappers currently sharing this session. */
  refs: number
}

/**
 * Skeleton sessions, shared by hold key. A waterfall whose stages render
 * from different components (slice detail → owning scenario → blueprints)
 * passes one key, so the hand-off neither restarts the hold nor replays the
 * fade: the surface shows exactly one skeleton for the whole chain.
 */
const sessions = new Map<string, SkeletonSession>()

type DeferredSkeletonState = {
  /** Skeleton is visible. */
  shown: boolean
  /** This instance is the one that revealed it, so it fades in. */
  fade: boolean
}

type DeferredSkeletonProps = {
  loading: boolean
  /** Placeholder for the surface. Mounted (invisible) during the hold. */
  skeleton: ReactNode
  children: ReactNode
  /**
   * Surface identity. Instances sharing a key share one skeleton session —
   * pass it when the stages of a waterfall live in different components.
   * Omit for a self-contained surface.
   */
  holdKey?: string
  /** Hold before the skeleton may paint. Defaults to {@link SKELETON_HOLD_MS}. */
  delayMs?: number
  /** Applied to the single wrapper element (skeleton and content alike). */
  className?: string
}

/**
 * The whole loading-timing contract for a surface, in one place.
 *
 * - The first ~250 ms of loading show *nothing*: fast and warm loads never
 *   flash a placeholder.
 * - The skeleton is nonetheless **mounted** during that hold, just at zero
 *   opacity. Its geometry is therefore live from frame 1, which is what lets
 *   the canvas camera fit against the skeleton frames — the first content
 *   paint is already at the final transform instead of painting at 1× and
 *   flying to fit.
 * - When content replaces a skeleton that was actually seen, it fades in over
 *   200 ms. Content that arrives before the skeleton ever appeared renders
 *   instantly, with no animation.
 * - Children mount once, at the swap, and are never remounted afterwards:
 *   both branches render the same single wrapper element.
 */
export function DeferredSkeleton({
  loading,
  skeleton,
  children,
  holdKey,
  delayMs = SKELETON_HOLD_MS,
  className,
}: DeferredSkeletonProps) {
  const instanceId = useId()
  const key = holdKey ?? `deferred-skeleton:${instanceId}`

  // Inheriting an already-shown session synchronously is what removes the
  // blank frame at a waterfall hand-off.
  const [state, setState] = useState<DeferredSkeletonState>(() => ({
    shown: sessions.get(key)?.shown ?? false,
    fade: false,
  }))

  useEffect(() => {
    // Not loading: this instance simply stops participating. `state.shown`
    // is deliberately left alone — it is what decides whether the content
    // that just landed crossfades or appears instantly.
    if (!loading) return

    let session = sessions.get(key)
    if (!session) {
      session = { startedAt: Date.now(), shown: false, refs: 0 }
      sessions.set(key, session)
    }
    session.refs += 1

    const claimed = session
    // Re-sync to the session (a hand-off inherits a shown skeleton; a fresh
    // loading cycle on a live instance resets it). Deferred to a microtask
    // so the wrapper never re-renders synchronously from its own effect —
    // microtasks still run before paint, so no stale frame is ever shown.
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setState((previous) =>
        previous.shown === claimed.shown
          ? previous
          : { shown: claimed.shown, fade: false },
      )
    })

    let timer = 0
    if (!claimed.shown) {
      const remaining = Math.max(0, delayMs - (Date.now() - claimed.startedAt))
      timer = window.setTimeout(() => {
        claimed.shown = true
        setState({ shown: true, fade: true })
      }, remaining)
    }

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      claimed.refs -= 1
      if (claimed.refs > 0) return
      // Grace tick: at a hand-off React runs this cleanup before the next
      // stage's wrapper claims the session, so the drop is deferred by one
      // task and a still-loading surface keeps its session.
      window.setTimeout(() => {
        if (sessions.get(key) === claimed && claimed.refs <= 0) {
          sessions.delete(key)
        }
      }, 0)
    }
  }, [delayMs, key, loading])

  if (loading) {
    return (
      <div
        // Mounted but invisible during the hold: layout and measurement are
        // live, painting is not.
        className={cn(
          className,
          state.shown ? state.fade && FADE_CLASS : 'opacity-0',
        )}
        aria-hidden={state.shown ? undefined : true}
      >
        {skeleton}
      </div>
    )
  }

  return (
    <div className={cn(className, state.shown && FADE_CLASS)}>{children}</div>
  )
}
