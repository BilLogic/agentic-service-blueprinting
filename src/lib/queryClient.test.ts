import { afterEach, describe, expect, it } from 'vitest'
import {
  invalidateQueries,
  invalidateStructure,
  queryClient,
} from '@/lib/queryClient'

/**
 * The invalidation contract: keys are single-element strings matched by
 * PREFIX on element zero. Mutation sites call `invalidateQueries('<prefix>')`
 * or `invalidateStructure()` — with `staleTime: Infinity` a missed key stays
 * stale until a reload, so the predicate's reach is load-bearing.
 */

function seed(key: string, data: unknown = []) {
  queryClient.setQueryData([key], data)
}

function isStale(key: string): boolean {
  const query = queryClient.getQueryCache().find({ queryKey: [key] })
  if (!query) throw new Error(`no cached query for ${key}`)
  return query.state.isInvalidated
}

afterEach(() => {
  queryClient.clear()
})

describe('invalidateQueries (prefix predicate)', () => {
  it('invalidates every key starting with the prefix', () => {
    seed('canvas-blueprints:scenario:a')
    seed('canvas-blueprints:scenario:b')
    invalidateQueries('canvas-blueprints')
    expect(isStale('canvas-blueprints:scenario:a')).toBe(true)
    expect(isStale('canvas-blueprints:scenario:b')).toBe(true)
  })

  it('leaves keys outside the prefix untouched', () => {
    seed('canvas-blueprints:scenario:a')
    seed('service-phases:first')
    invalidateQueries('canvas-blueprints')
    expect(isStale('service-phases:first')).toBe(false)
  })

  it('matches the bare prefix key itself', () => {
    seed('service-phases:first')
    invalidateQueries('service-phases')
    expect(isStale('service-phases:first')).toBe(true)
  })
})

describe('invalidateStructure', () => {
  it('sweeps every registered read prefix', () => {
    seed('service-phases:first')
    seed('canvas-blueprints:scenario:a')
    invalidateStructure()
    expect(isStale('service-phases:first')).toBe(true)
    expect(isStale('canvas-blueprints:scenario:a')).toBe(true)
  })
})
