import { afterEach, describe, expect, it } from 'vitest'
import {
  getActiveService,
  setActiveService,
  subscribeToActiveService,
} from '@/contexts/activeService'

/*
 * The resolved active-service store: one write path, a stable snapshot, and
 * subscribers told on a change and not on a repeat. It holds the ANSWER —
 * id and slug together — and never the question: the URL's slug is the slug
 * store's, and this one does not touch the address bar.
 */

afterEach(() => {
  setActiveService(null)
})

describe('the active-service store', () => {
  it('starts with no service, and reads back the one it is set to', () => {
    expect(getActiveService()).toBeNull()
    setActiveService({ id: 'svc-a', slug: 'support-desk' })
    expect(getActiveService()).toEqual({ id: 'svc-a', slug: 'support-desk' })
  })

  it('notifies on a change, not on the same service set again', () => {
    let notifications = 0
    const unsubscribe = subscribeToActiveService(() => {
      notifications += 1
    })
    setActiveService({ id: 'svc-a', slug: 'support-desk' })
    setActiveService({ id: 'svc-a', slug: 'support-desk' })
    expect(notifications).toBe(1)
    setActiveService({ id: 'svc-b', slug: 'sales-pipeline' })
    setActiveService(null)
    setActiveService(null)
    expect(notifications).toBe(3)
    unsubscribe()
  })

  it('leaves the URL alone — the slug store owns the address bar', () => {
    const before = typeof window === 'undefined' ? null : window.location.pathname
    setActiveService({ id: 'svc-a', slug: 'support-desk' })
    if (before !== null) expect(window.location.pathname).toBe(before)
  })
})
