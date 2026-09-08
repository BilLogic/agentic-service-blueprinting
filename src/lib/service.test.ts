import { describe, expect, it, vi } from 'vitest'
import { awaitOrAbort } from '@/lib/service'

/**
 * `findFirstServiceId` shares one in-flight promise between callers, so it
 * cannot take a signal — cancelling it would cancel the lookup everyone else
 * is awaiting. `awaitOrAbort` is what lets a caller stop waiting without
 * stopping the request, which is the whole reason the deadline in
 * `withSupabaseTimeout` reaches a shared lookup at all.
 */
describe('awaitOrAbort', () => {
  it('settles with the value when the promise wins', async () => {
    const controller = new AbortController()
    await expect(awaitOrAbort(Promise.resolve('id'), controller.signal)).resolves.toBe('id')
  })

  it('rejects when the signal fires first, without waiting for the promise', async () => {
    const controller = new AbortController()
    // A promise that never settles: exactly the slow lookup the deadline exists for.
    const never = new Promise<string>(() => {})
    const waiting = awaitOrAbort(never, controller.signal)
    controller.abort(new Error('deadline'))
    await expect(waiting).rejects.toThrow('deadline')
  })

  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort(new Error('gone'))
    await expect(awaitOrAbort(Promise.resolve('id'), controller.signal)).rejects.toThrow('gone')
  })

  it('leaves the shared promise running for other callers', async () => {
    const controller = new AbortController()
    let settle: (value: string) => void = () => {}
    const shared = new Promise<string>((resolve) => {
      settle = resolve
    })
    const leaving = awaitOrAbort(shared, controller.signal)
    const staying = shared

    controller.abort(new Error('left the view'))
    await expect(leaving).rejects.toThrow('left the view')

    settle('still-arrived')
    await expect(staying).resolves.toBe('still-arrived')
  })

  it('propagates the promise rejection when it loses to nothing', async () => {
    const controller = new AbortController()
    await expect(
      awaitOrAbort(Promise.reject(new Error('network')), controller.signal),
    ).rejects.toThrow('network')
  })

  it('removes its abort listener once the promise settles', async () => {
    const controller = new AbortController()
    const remove = vi.spyOn(controller.signal, 'removeEventListener')
    await awaitOrAbort(Promise.resolve('id'), controller.signal)
    expect(remove).toHaveBeenCalled()
  })
})
