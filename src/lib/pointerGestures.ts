/**
 * The two things a dragging surface needs and the DOM does not hand it: a
 * release that cannot throw, and a publish that happens once a frame rather
 * than once a pointer sample.
 *
 * Both live here rather than inside one component because both have already
 * been needed by more than one: the resizable compare panel and the canvas
 * annotation layer each drag something under a captured pointer, and each had
 * its own copy of the first before this file existed.
 */

/** Whatever the caller captured on — an element, or a test's stand-in. */
export type CaptureTarget = {
  releasePointerCapture: (pointerId: number) => void
}

/**
 * Give the capture back, and never let the giving-back be the thing that
 * fails.
 *
 * `releasePointerCapture` throws `NotFoundError` for an id the element does
 * not currently hold — and mid-drag that is an ordinary state rather than a
 * bug: a `pointercancel` from an OS edge swipe releases the capture on its way
 * out, so the `pointerup` that follows is releasing something already gone.
 * Called bare, the throw skips whatever teardown sits after it, and a drag
 * whose teardown was skipped is a mark welded to the cursor for the rest of
 * the session.
 *
 * Clear the drag state BEFORE calling this as well. The guard is the belt and
 * the ordering is the braces.
 */
export function releasePointerCapture(
  target: CaptureTarget | null | undefined,
  pointerId: number,
): void {
  try {
    target?.releasePointerCapture(pointerId)
  } catch {
    // Already released, or never captured. The teardown around this call is
    // the part that matters and must not be skipped for it.
  }
}

/** Frames, injectable so a node-environment test can turn them by hand. */
export type FrameScheduler = {
  request: (callback: () => void) => number
  cancel: (handle: number) => void
}

const BROWSER_FRAMES: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
}

/**
 * A queue that publishes the LATEST patch for one subject, once a frame.
 *
 * `schedule` may be called as often as the pointer reports — a hundred and
 * twenty times a second on a trackpad — and the write runs at most once per
 * frame with the patches for that subject merged. `flush` publishes whatever
 * is owed immediately, which is what a `pointerup` needs before it clears the
 * state that identifies the subject. `cancel` drops it, which is what an
 * unmount needs.
 *
 * The WRITER is passed to `schedule` rather than held from construction. A
 * queue outlives the render that created it, and a writer captured once would
 * be the one that render closed over; passing it per sample means the frame
 * publishes through the handler whose own pointer event scheduled it, with no
 * ref for a component to keep in step.
 */
export type FramePatchQueue<Patch> = {
  schedule: (
    id: string,
    patch: Patch,
    publish: (id: string, patch: Patch) => void,
  ) => void
  flush: () => void
  cancel: () => void
}

/**
 * Coalesce per-sample patches into one write a frame.
 *
 * Dragging or resizing used to call the store straight off every raw
 * `pointermove`, each call replacing a collection and re-rendering every
 * surface reading it. Patches for the same subject MERGE, so the frame
 * publishes the latest position rather than replaying every sample; a patch
 * for a DIFFERENT subject flushes the pending one first, because two subjects
 * merged into one patch would move a mark nobody dragged.
 */
export function createFramePatchQueue<Patch extends object>(
  frames: FrameScheduler = BROWSER_FRAMES,
): FramePatchQueue<Patch> {
  type Pending = {
    id: string
    patch: Patch
    publish: (id: string, patch: Patch) => void
  }
  let pending: Pending | null = null
  let handle = 0

  const stopFrame = () => {
    if (!handle) return
    frames.cancel(handle)
    handle = 0
  }

  const flush = () => {
    stopFrame()
    const owed = pending
    pending = null
    if (owed) owed.publish(owed.id, owed.patch)
  }

  return {
    schedule(id, patch, publish) {
      // A different subject is published on its own, through the writer that
      // scheduled it, rather than merged into this one.
      if (pending && pending.id !== id) flush()
      pending = pending
        ? { id, patch: { ...pending.patch, ...patch }, publish }
        : { id, patch, publish }
      if (handle) return
      handle = frames.request(() => {
        handle = 0
        flush()
      })
    },
    flush,
    cancel() {
      stopFrame()
      pending = null
    },
  }
}
