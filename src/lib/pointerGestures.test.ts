import { describe, expect, it, vi } from 'vitest'
import {
  createFramePatchQueue,
  releasePointerCapture,
} from '@/lib/pointerGestures'

/** Frames turned by hand, so the suite can run outside a browser. */
function manualFrames() {
  const queued: Array<{ handle: number; callback: () => void }> = []
  let next = 1
  return {
    scheduler: {
      request: (callback: () => void) => {
        const handle = next
        next += 1
        queued.push({ handle, callback })
        return handle
      },
      cancel: (handle: number) => {
        const at = queued.findIndex((entry) => entry.handle === handle)
        if (at >= 0) queued.splice(at, 1)
      },
    },
    /** Run every frame that is currently owed. */
    turn() {
      const owed = queued.splice(0, queued.length)
      for (const entry of owed) entry.callback()
    },
    get outstanding() {
      return queued.length
    },
  }
}

describe('releasePointerCapture', () => {
  it('releases the capture it was given', () => {
    const releasePointer = vi.fn()
    releasePointerCapture({ releasePointerCapture: releasePointer }, 7)
    expect(releasePointer).toHaveBeenCalledWith(7)
  })

  it('survives the id the element no longer holds', () => {
    // What the DOM does after a `pointercancel` has already released the
    // capture: the `pointerup` that follows throws `NotFoundError`. Bare, that
    // throw skipped the teardown after it and left the drag state set.
    const throws = {
      releasePointerCapture: () => {
        throw new DOMException('pointer not captured', 'NotFoundError')
      },
    }
    expect(() => releasePointerCapture(throws, 7)).not.toThrow()
  })

  it('survives a target that is not there at all', () => {
    // A ref read during an unmount. Nothing to release, nothing to fail.
    expect(() => releasePointerCapture(null, 7)).not.toThrow()
    expect(() => releasePointerCapture(undefined, 7)).not.toThrow()
  })
})

describe('a drag publishes once a frame', () => {
  it('publishes nothing until the frame turns', () => {
    const frames = manualFrames()
    const publish = vi.fn()
    const queue = createFramePatchQueue<{ x?: number }>(frames.scheduler)

    queue.schedule('mark', { x: 1 }, publish)
    expect(publish).not.toHaveBeenCalled()

    frames.turn()
    expect(publish).toHaveBeenCalledExactlyOnceWith('mark', { x: 1 })
  })

  it('merges every sample of one subject into one write', () => {
    // The whole point: a trackpad reports faster than the screen repaints, and
    // each raw sample used to replace the collection and re-render every
    // surface reading it.
    const frames = manualFrames()
    const publish = vi.fn()
    const queue = createFramePatchQueue<{ x?: number; y?: number }>(
      frames.scheduler,
    )

    queue.schedule('mark', { x: 1, y: 1 }, publish)
    queue.schedule('mark', { x: 2 }, publish)
    queue.schedule('mark', { x: 3 }, publish)
    expect(frames.outstanding).toBe(1)

    frames.turn()
    // The LATEST position, with the field no later sample mentioned kept.
    expect(publish).toHaveBeenCalledExactlyOnceWith('mark', { x: 3, y: 1 })
  })

  it('never merges two subjects', () => {
    // A resize that hands over to a drag of another mark within one frame.
    // Merged, the second patch would move a mark nobody touched.
    const frames = manualFrames()
    const published: Array<[string, { x?: number }]> = []
    const publish = (id: string, patch: { x?: number }) =>
      void published.push([id, patch])
    const queue = createFramePatchQueue<{ x?: number }>(frames.scheduler)

    queue.schedule('first', { x: 1 }, publish)
    queue.schedule('second', { x: 2 }, publish)
    // The first went out the moment the subject changed, not a frame later.
    expect(published).toEqual([['first', { x: 1 }]])

    frames.turn()
    expect(published).toEqual([
      ['first', { x: 1 }],
      ['second', { x: 2 }],
    ])
  })

  it('flushes what the gesture still owes when it ends', () => {
    // `pointerup` clears the state that names the subject, so the patch owed
    // to the interrupted frame has to go out first or it goes out never.
    const frames = manualFrames()
    const publish = vi.fn()
    const queue = createFramePatchQueue<{ x?: number }>(frames.scheduler)

    queue.schedule('mark', { x: 9 }, publish)
    queue.flush()
    expect(publish).toHaveBeenCalledExactlyOnceWith('mark', { x: 9 })

    // And the frame it cancelled does not publish the same patch again.
    frames.turn()
    expect(publish).toHaveBeenCalledOnce()
  })

  it('flushes nothing when nothing is owed', () => {
    const frames = manualFrames()
    const publish = vi.fn()
    const queue = createFramePatchQueue<{ x?: number }>(frames.scheduler)

    queue.flush()
    queue.flush()
    expect(publish).not.toHaveBeenCalled()
  })

  it('drops the pending patch when the surface goes away', () => {
    // Unmount. A frame that fires into a torn-down component writes to a store
    // nothing is reading and warns about it.
    const frames = manualFrames()
    const publish = vi.fn()
    const queue = createFramePatchQueue<{ x?: number }>(frames.scheduler)

    queue.schedule('mark', { x: 1 }, publish)
    queue.cancel()
    expect(frames.outstanding).toBe(0)

    frames.turn()
    queue.flush()
    expect(publish).not.toHaveBeenCalled()
  })

  it('publishes through the writer that scheduled, not the one that started it', () => {
    // Why the writer is an argument rather than something the queue is built
    // with: the queue outlives the render that made it, and each sample is
    // scheduled by a pointer handler that already closes over the current one.
    // A writer held from construction would be the first render's forever.
    const frames = manualFrames()
    const stale = vi.fn()
    const fresh = vi.fn()
    const queue = createFramePatchQueue<{ x?: number }>(frames.scheduler)

    queue.schedule('mark', { x: 1 }, stale)
    queue.schedule('mark', { x: 2 }, fresh)
    frames.turn()

    expect(stale).not.toHaveBeenCalled()
    expect(fresh).toHaveBeenCalledExactlyOnceWith('mark', { x: 2 })
  })

  it('hands a flushed subject to the writer that scheduled it', () => {
    // And the corollary at a handover: the flushed patch goes out through the
    // writer that scheduled IT, not through the one arriving behind it.
    const frames = manualFrames()
    const first = vi.fn()
    const second = vi.fn()
    const queue = createFramePatchQueue<{ x?: number }>(frames.scheduler)

    queue.schedule('one', { x: 1 }, first)
    queue.schedule('two', { x: 2 }, second)

    expect(first).toHaveBeenCalledExactlyOnceWith('one', { x: 1 })
    expect(second).not.toHaveBeenCalled()
  })

  it('starts a fresh frame for the gesture that follows a flush', () => {
    const frames = manualFrames()
    const publish = vi.fn()
    const queue = createFramePatchQueue<{ x?: number }>(frames.scheduler)

    queue.schedule('mark', { x: 1 }, publish)
    queue.flush()
    queue.schedule('mark', { x: 2 }, publish)
    expect(frames.outstanding).toBe(1)

    frames.turn()
    expect(publish).toHaveBeenNthCalledWith(2, 'mark', { x: 2 })
  })
})
