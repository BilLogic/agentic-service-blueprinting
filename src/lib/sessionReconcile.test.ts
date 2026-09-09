import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isAuthorizationDenial, toAuthoringError } from '@/lib/authoringErrors'
import {
  reconcileSessionAfterDenial,
  resetSessionReconcileState,
  sessionRefresher,
  setSessionReconciler,
} from '@/lib/sessionReconcile'

/**
 * A revocation path is the obvious ask here, and it is bigger than what the
 * defect needs. The database is the authority and re-evaluates the session on
 * every statement, so a demoted session's writes already fail there. What is
 * wrong is that the UI keeps OFFERING them for up to one token lifetime — a
 * button that lies.
 *
 * These pin the trigger and, more importantly, the two ways a naive version
 * makes things worse: a refresh per failed row, and a refresh that throws on an
 * error path and buries the message the write already produced.
 */
describe('a refused write re-derives the tier', () => {
  beforeEach(resetSessionReconcileState)
  afterEach(() => {
    vi.restoreAllMocks()
    resetSessionReconcileState()
  })

  const denial = () =>
    Object.assign(new Error('new row violates row-level security policy for table "cells"'), {
      details: null,
      hint: null,
      code: '42501',
    })

  it('recognises both shapes the database refuses with', () => {
    expect(isAuthorizationDenial(denial())).toBe(true)
    expect(isAuthorizationDenial(new Error('permission denied for table cells'))).toBe(true)
  })

  it('does not mistake a data refusal for an authorization one', () => {
    // The distinction that matters: a constraint violation must NOT trigger a
    // session refresh. It is the database refusing the DATA, and the session
    // is fine.
    expect(isAuthorizationDenial(new Error('duplicate key value violates unique constraint'))).toBe(false)
    expect(isAuthorizationDenial(new Error('violates foreign key constraint'))).toBe(false)
    expect(isAuthorizationDenial(new Error('A blueprint needs a name'))).toBe(false)
  })

  it('fires when a denial is translated', () => {
    const reconcile = vi.fn().mockResolvedValue(undefined)
    setSessionReconciler(reconcile)
    toAuthoringError(denial())
    expect(reconcile).toHaveBeenCalledTimes(1)
  })

  it('does not fire for an ordinary constraint failure', () => {
    const reconcile = vi.fn().mockResolvedValue(undefined)
    setSessionReconciler(reconcile)
    toAuthoringError(new Error('duplicate key value violates unique constraint'))
    expect(reconcile).not.toHaveBeenCalled()
  })

  it('still returns the translated message for the user', () => {
    // The side effect must not swallow the function's actual job.
    setSessionReconciler(vi.fn().mockResolvedValue(undefined))
    const authoring = toAuthoringError(denial())
    expect(authoring.message).toContain('cannot write')
    expect(authoring.raw).toContain('row-level security')
  })

  it('is a no-op before a reconciler is registered', () => {
    // Boot order: a write can fail before `SupabaseProvider`'s effect runs.
    expect(() => toAuthoringError(denial())).not.toThrow()
  })

  it('collapses a burst of denials into one refresh', () => {
    // THE REASON THE COOLDOWN EXISTS. One save can fan out to several tables
    // and produce a denial per row; a refresh each would be a self-inflicted
    // request storm against the auth endpoint, and they were all refused by
    // the same token anyway.
    const reconcile = vi.fn().mockResolvedValue(undefined)
    setSessionReconciler(reconcile)
    const t = 1_000_000
    reconcileSessionAfterDenial(t)
    reconcileSessionAfterDenial(t + 5)
    reconcileSessionAfterDenial(t + 50)
    expect(reconcile).toHaveBeenCalledTimes(1)
  })

  it('allows another refresh once the cooldown has passed', async () => {
    const reconcile = vi.fn().mockResolvedValue(undefined)
    setSessionReconciler(reconcile)
    const t = 1_000_000
    reconcileSessionAfterDenial(t)
    // The in-flight guard is separate from the cooldown and outranks it: a
    // second call while the first refresh is still running is dropped whatever
    // the clock says. Let it settle before testing the cooldown, or this
    // asserts the wrong guard.
    await vi.waitFor(() => expect(reconcile).toHaveBeenCalledTimes(1))
    await Promise.resolve()
    reconcileSessionAfterDenial(t + 10_001)
    expect(reconcile).toHaveBeenCalledTimes(2)
  })

  it('drops a second denial while the first refresh is still in flight', () => {
    // Distinct from the cooldown: this one holds even when the clock has moved
    // well past it, because a refresh already on the wire will answer both.
    let settle: (() => void) | undefined
    const reconcile = vi.fn(() => new Promise<void>((res) => { settle = res }))
    setSessionReconciler(reconcile)
    reconcileSessionAfterDenial(1_000_000)
    reconcileSessionAfterDenial(2_000_000)
    expect(reconcile).toHaveBeenCalledTimes(1)
    settle?.()
  })

  it('treats a refresh that RETURNS an error as a failure', async () => {
    // The trap this whole seam exists for. auth-js catches `AuthError` and
    // returns it in `{ data, error }` — `refreshSession()` does not reject —
    // so a reconciler that ignores the field reports success on every failed
    // refresh, and the logging below it is dead code. A test that hands
    // `reconcileSessionAfterDenial` its own rejecting function never sees it.
    const failing = sessionRefresher({
      auth: { refreshSession: async () => ({ error: new Error('refresh_token_not_found') }) },
    })
    await expect(failing()).rejects.toThrow('refresh_token_not_found')
  })

  it('resolves when the refresh succeeds', async () => {
    const ok = sessionRefresher({ auth: { refreshSession: async () => ({ error: null }) } })
    await expect(ok()).resolves.toBeUndefined()
  })

  it('logs, rather than rethrows, a reconcile that fails', async () => {
    // A failed refresh must not become a second error on top of the write's
    // own. The reader is already being shown why the save failed; signing them
    // out here would turn one refused save into a lost session.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    setSessionReconciler(() => Promise.reject(new Error('network down')))
    expect(() => reconcileSessionAfterDenial(1_000_000)).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()
    expect(consoleError).toHaveBeenCalled()
  })

  it('unregisters cleanly', () => {
    const reconcile = vi.fn().mockResolvedValue(undefined)
    setSessionReconciler(reconcile)
    setSessionReconciler(null)
    reconcileSessionAfterDenial(1_000_000)
    expect(reconcile).not.toHaveBeenCalled()
  })
})
