// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SAMPLE_SCENARIO_ID } from '@/data/blueprintFallbacks'
import { SupabaseProvider } from '@/contexts/SupabaseProvider'
import {
  invalidateCanvasBlueprintsForPath,
  invalidateCanvasBlueprintsForScenario,
  useCanvasBlueprints,
} from '@/hooks/useCanvasBlueprints'
import { queryClient } from '@/lib/queryClient'

afterEach(() => {
  queryClient.clear()
})

function seedScenario(scenarioId: string, pathIds: string[] | undefined) {
  const key = [`canvas-blueprints:scenario:${scenarioId}`]
  if (pathIds === undefined) {
    // A known query with no cached data yet (in flight / never settled).
    queryClient.getQueryCache().build(queryClient, { queryKey: key })
    return
  }
  queryClient.setQueryData(
    key,
    pathIds.map((id) => ({ id })),
  )
}

function isStale(scenarioId: string): boolean {
  const query = queryClient
    .getQueryCache()
    .find({ queryKey: [`canvas-blueprints:scenario:${scenarioId}`] })
  if (!query) throw new Error(`no cached query for scenario ${scenarioId}`)
  return query.state.isInvalidated
}

describe('invalidateCanvasBlueprintsForScenario', () => {
  it('invalidates exactly the named scenario', () => {
    seedScenario('s1', ['p1'])
    seedScenario('s2', ['p2'])
    invalidateCanvasBlueprintsForScenario('s1')
    expect(isStale('s1')).toBe(true)
    expect(isStale('s2')).toBe(false)
  })

  it('does not treat the id as a prefix', () => {
    seedScenario('s1', ['p1'])
    seedScenario('s10', ['p10'])
    invalidateCanvasBlueprintsForScenario('s1')
    expect(isStale('s10')).toBe(false)
  })
})

describe('invalidateCanvasBlueprintsForPath', () => {
  it('invalidates only the scenario whose cached rows contain the path', () => {
    seedScenario('s1', ['p1', 'p2'])
    seedScenario('s2', ['p3'])
    invalidateCanvasBlueprintsForPath('p1')
    expect(isStale('s1')).toBe(true)
    expect(isStale('s2')).toBe(false)
  })

  it('treats a query with no cached data as matching (stale to be safe)', () => {
    seedScenario('s1', ['p1'])
    seedScenario('s2', undefined)
    invalidateCanvasBlueprintsForPath('p9')
    expect(isStale('s1')).toBe(false)
    expect(isStale('s2')).toBe(true)
  })

  it('never touches keys outside the scenario prefix', () => {
    queryClient.setQueryData(['lifecycle-phases:first'], [])
    invalidateCanvasBlueprintsForPath('p1')
    const query = queryClient
      .getQueryCache()
      .find({ queryKey: ['lifecycle-phases:first'] })
    expect(query?.state.isInvalidated).toBe(false)
  })
})

/**
 * Zero-config resolution: with no VITE_SUPABASE_URL/ANON_KEY the hook
 * resolves the bundled fallback module through the SAME interface — and
 * reports progress complete, so a loading bar never parks below full while
 * nothing is on the wire.
 */
describe('useCanvasBlueprints (no database configured)', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SupabaseProvider>{children}</SupabaseProvider>
    </QueryClientProvider>
  )

  it('resolves the bundled fallback synchronously', () => {
    const { result } = renderHook(
      () => useCanvasBlueprints([SAMPLE_SCENARIO_ID]),
      { wrapper },
    )
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.usingFallback).toBe(true)
    expect(
      result.current.blueprintsByScenario.get(SAMPLE_SCENARIO_ID),
    ).toBeDefined()
    expect(
      result.current.pathsByScenario.get(SAMPLE_SCENARIO_ID)?.length,
    ).toBeGreaterThan(0)
  })

  it('reports progress complete (noDb has nothing on the wire)', () => {
    const { result } = renderHook(
      () => useCanvasBlueprints([SAMPLE_SCENARIO_ID]),
      { wrapper },
    )
    expect(result.current.progress.loaded).toBe(result.current.progress.total)
  })

  it('returns empty maps for an empty scenario list', () => {
    const { result } = renderHook(() => useCanvasBlueprints([]), { wrapper })
    expect(result.current.loading).toBe(false)
    expect(result.current.blueprintsByScenario.size).toBe(0)
    expect(result.current.usingFallback).toBe(false)
  })
})
