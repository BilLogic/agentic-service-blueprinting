// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  getActiveServiceSlug,
  setActiveServiceSlug,
  subscribeActiveService,
} from '@/contexts/activeServiceStore'

/*
 * The active-service slug store. Mirrors the path-selection store's contract:
 * a single write path, a stable snapshot, and subscribers notified on change.
 * The URL survival (a slug in the path across a reload) is exercised here as a
 * `history.replaceState` write; the slug -> service resolution is
 * `serviceSlug` / `resolveServiceBySlug`.
 */

afterEach(() => {
  setActiveServiceSlug(null)
})

describe('activeServiceStore', () => {
  it('reads back the slug it was set to', () => {
    setActiveServiceSlug('plus-tutoring')
    expect(getActiveServiceSlug()).toBe('plus-tutoring')
  })

  it('writes the slug into the URL path so a reload lands on the same service', () => {
    setActiveServiceSlug('sales-pipeline')
    expect(window.location.pathname).toBe('/sales-pipeline')
  })

  it('preserves the search string when it writes the path', () => {
    window.history.replaceState(null, '', '/?cell=cell-9')
    setActiveServiceSlug('support-desk')
    expect(window.location.pathname).toBe('/support-desk')
    expect(window.location.search).toBe('?cell=cell-9')
  })

  it('notifies subscribers on change and not on a no-op set', () => {
    let notifications = 0
    const unsubscribe = subscribeActiveService(() => {
      notifications += 1
    })
    setActiveServiceSlug('onboarding')
    setActiveServiceSlug('onboarding') // no-op: same slug
    expect(notifications).toBe(1)
    unsubscribe()
  })
})
