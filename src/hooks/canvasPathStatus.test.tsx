// @vitest-environment jsdom
/**
 * A path's status survives the trip from its row to the pickers.
 *
 * The board's query selects `paths.status`, and the mapping into a path list
 * item used to drop it, so every picker's status badge had nothing to show.
 */
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SAMPLE_SCENARIO_ID } from '@/data/blueprintFallbacks'
import { useCanvasBlueprints } from '@/hooks/useCanvasBlueprints'
import { queryClient } from '@/lib/queryClient'

const ROWS = [
  {
    id: 'p-happy',
    scenario_id: 'arrive',
    name: 'First visit',
    summary: null,
    note: null,
    kind: 'happy',
    status: 'planned',
  },
  {
    id: 'p-variant',
    scenario_id: 'arrive',
    name: 'Card declined',
    summary: null,
    note: null,
    kind: 'variant',
    // Unknown to this build: reads as the default rather than as nothing.
    status: 'someday',
  },
]

const configured = vi.hoisted(() => ({ value: true }))

vi.mock('@/contexts/SupabaseProvider', () => {
  const query = {
    select: () => query,
    eq: () => query,
    abortSignal: () => Promise.resolve({ data: ROWS, error: null }),
  }
  const client = { from: () => query }
  return {
    useSupabase: () => ({
      client: configured.value ? client : null,
      configured: configured.value,
    }),
  }
})

afterEach(() => {
  queryClient.clear()
  configured.value = true
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('path status on the board’s path list', () => {
  it('carries each row’s status onto its path item', async () => {
    const { result } = renderHook(() => useCanvasBlueprints(['arrive']), {
      wrapper,
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const paths = result.current.pathsByScenario.get('arrive') ?? []
    expect(paths.map((item) => [item.id, item.status])).toEqual([
      ['p-happy', 'planned'],
      ['p-variant', 'live'],
    ])
  })

  it('carries the sample’s status when no database is configured', () => {
    configured.value = false
    const { result } = renderHook(
      () => useCanvasBlueprints([SAMPLE_SCENARIO_ID]),
      { wrapper },
    )
    const paths = result.current.pathsByScenario.get(SAMPLE_SCENARIO_ID) ?? []
    expect(paths.length).toBeGreaterThan(0)
    for (const item of paths) expect(item.status).toBeTruthy()
  })
})
