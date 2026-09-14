import { afterEach, describe, expect, it } from 'vitest'
import {
  invalidateCellBoard,
  invalidateQueries,
  invalidateStructure,
  queryClient,
} from '@/lib/queryClient'
import { queryKeys } from '@/lib/queryKeys'

/**
 * The invalidation contract: keys are single-element strings matched by
 * PREFIX on element zero. Mutation modules call `invalidateQueries(<prefix>)`
 * or `invalidateStructure()` with keys from the builder — with
 * `staleTime: Infinity` a missed key stays stale until a reload, so the
 * predicate's reach is load-bearing.
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
    seed(queryKeys.canvasBlueprints.of('a'))
    seed(queryKeys.canvasBlueprints.of('b'))
    invalidateQueries(queryKeys.canvasBlueprints.prefix)
    expect(isStale(queryKeys.canvasBlueprints.of('a'))).toBe(true)
    expect(isStale(queryKeys.canvasBlueprints.of('b'))).toBe(true)
  })

  it('leaves keys outside the prefix untouched', () => {
    seed(queryKeys.canvasBlueprints.of('a'))
    seed(queryKeys.servicePhases.of('first'))
    invalidateQueries(queryKeys.canvasBlueprints.prefix)
    expect(isStale(queryKeys.servicePhases.of('first'))).toBe(false)
  })

  it('matches the bare prefix key itself', () => {
    seed(queryKeys.servicePhases.of('first'))
    invalidateQueries(queryKeys.servicePhases.prefix)
    expect(isStale(queryKeys.servicePhases.of('first'))).toBe(true)
  })
})

describe('invalidateStructure', () => {
  it('sweeps every structural prefix', () => {
    seed(queryKeys.servicePhases.of('first'))
    seed(queryKeys.canvasBlueprints.of('a'))
    invalidateStructure()
    expect(isStale(queryKeys.servicePhases.of('first'))).toBe(true)
    expect(isStale(queryKeys.canvasBlueprints.of('a'))).toBe(true)
  })
})

describe('invalidateCellBoard', () => {
  it('refetches the grid and the one board whose cached rows hold the cell', () => {
    seed(queryKeys.servicePhases.of('first'))
    seed(queryKeys.canvasBlueprints.of('a'), [{ id: 'p1', cells: [{ id: 'c1' }] }])
    seed(queryKeys.canvasBlueprints.of('b'), [{ id: 'p2', cells: [{ id: 'c2' }] }])
    invalidateCellBoard('c1')
    expect(isStale(queryKeys.servicePhases.of('first'))).toBe(true)
    expect(isStale(queryKeys.canvasBlueprints.of('a'))).toBe(true)
    expect(isStale(queryKeys.canvasBlueprints.of('b'))).toBe(false)
  })

  it('refetches every board when the writer knows no cell', () => {
    seed(queryKeys.canvasBlueprints.of('a'), [{ id: 'p1', cells: [{ id: 'c1' }] }])
    seed(queryKeys.canvasBlueprints.of('b'), [{ id: 'p2', cells: [{ id: 'c2' }] }])
    invalidateCellBoard(null)
    expect(isStale(queryKeys.canvasBlueprints.of('a'))).toBe(true)
    expect(isStale(queryKeys.canvasBlueprints.of('b'))).toBe(true)
  })
})
