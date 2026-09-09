import type { CameraTransitionResult } from '@/lib/cameraTransition'

type Waiter = (result: CameraTransitionResult) => void

const waiters = new Map<string, Set<Waiter>>()

/** Listen only for the next accepted camera intent for this semantic target. */
export function waitForCanvasNavigationOutcome(key: string): {
  promise: Promise<CameraTransitionResult>
  cancel: () => void
} {
  let waiter: Waiter | null = null
  const detach = () => {
    if (!waiter) return
    const listeners = waiters.get(key)
    listeners?.delete(waiter)
    if (listeners?.size === 0) waiters.delete(key)
    waiter = null
  }
  const promise = new Promise<CameraTransitionResult>((resolve) => {
    waiter = resolve
    const listeners = waiters.get(key) ?? new Set<Waiter>()
    listeners.add(resolve)
    waiters.set(key, listeners)
  })
  return {
    promise,
    /**
     * Detach AND settle. Abandoning the wait without resolving left a promise
     * pending for the life of the session; that is invisible today only
     * because every caller races it against a deadline, and the first direct
     * `await` would hang. The transform is the caller's own last known one —
     * nothing moved on account of giving up listening.
     */
    cancel: () => {
      const settle = waiter
      detach()
      settle?.({
        kind: 'cancelled',
        transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      })
    },
  }
}

export function publishCanvasNavigationOutcome(
  key: string,
  result: CameraTransitionResult,
) {
  const listeners = waiters.get(key)
  if (!listeners) return
  waiters.delete(key)
  for (const resolve of listeners) resolve(result)
}
