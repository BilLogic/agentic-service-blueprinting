// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  readLastViewedPath,
  resolveDefaultPathId,
  writeLastViewedPath,
} from '@/lib/mobilePathMemory'
import type { PathKind } from '@/types/database'

// Pins the Phase-3 default rule (plan 2026-08-16-002): last-viewed wins
// when it still exists, else the happy path, and storage failures degrade
// to defaults rather than throwing.

const path = (id: string, name: string, kind: PathKind = 'happy') => ({
  id,
  name,
  kind,
})

describe('resolveDefaultPathId', () => {
  const paths = [
    path('p-happy', 'Happy Path', 'happy'),
    path('p-unhappy', 'Reschedule', 'variant'),
  ]

  it('a stored path that still exists wins', () => {
    expect(resolveDefaultPathId('p-unhappy', paths)).toBe('p-unhappy')
  })

  it('a stored path that was deleted falls back to the happy path', () => {
    expect(resolveDefaultPathId('p-gone', paths)).toBe('p-happy')
  })

  it('no stored path: the happy path is the first visit default', () => {
    expect(resolveDefaultPathId(null, paths)).toBe('p-happy')
  })

  it('no paths at all resolves to null (the preferred blueprint)', () => {
    expect(resolveDefaultPathId('p-anything', [])).toBeNull()
  })
})

describe('path memory storage', () => {
  beforeEach(() => window.localStorage.clear())

  it('round-trips per scenario', () => {
    writeLastViewedPath('sc-1', 'p-a')
    writeLastViewedPath('sc-2', 'p-b')
    expect(readLastViewedPath('sc-1')).toBe('p-a')
    expect(readLastViewedPath('sc-2')).toBe('p-b')
  })

  it('unknown scenario reads null', () => {
    expect(readLastViewedPath('sc-none')).toBeNull()
  })

  it('corrupt storage degrades to null instead of throwing', () => {
    window.localStorage.setItem('sb-mobile-paths', '{not json')
    expect(readLastViewedPath('sc-1')).toBeNull()
  })
})
