// @vitest-environment jsdom
/**
 * The one resolution. The provider reads the roster, matches the URL's slug
 * (or takes the first service at the bare root), and writes the answer to the
 * resolved store — which is what every scoped read is handed. Three routes
 * through it: a boot slug, a slug no service carries, and a switch between
 * two services mid-session. Asserted through the store and through a scoped
 * read rendered beside it, because that pair is the contract: the read
 * follows the store, and reads nothing when the store holds nothing.
 */
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const supabase = vi.hoisted(() => ({ client: null as unknown, configured: true }))

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: supabase.configured ? supabase.client : null,
    configured: supabase.configured,
    session: null,
    isLoading: false,
    canWrite: false,
    canReadPrivate: false,
  }),
}))

import { getActiveService, setActiveService, useActiveServiceId } from '@/contexts/activeService'
import { ActiveServiceProvider, useActiveService } from '@/contexts/ActiveServiceContext'
import { setActiveServiceSlug } from '@/contexts/activeServiceStore'
import { SAMPLE_SERVICE_ID } from '@/data/sampleBlueprint'
import { useServicePhases } from '@/hooks/useServicePhases'
import { QUERY_DEFAULTS } from '@/lib/queryClient'

type Row = Record<string, unknown>

const TABLES: Record<string, Row[]> = {
  services: [
    { id: 'svc-1', name: 'Rooftop Retrofit', slug: 'rooftop-retrofit', created_at: '2026-01-01' },
    { id: 'svc-2', name: 'Heat Pump Grants', slug: 'heat-pump-grants', created_at: '2026-02-01' },
  ],
  phases: [
    { id: 'p-1', name: 'Survey', service_id: 'svc-1', position: 0, scenarios: [] },
    { id: 'p-2', name: 'Apply', service_id: 'svc-2', position: 0, scenarios: [] },
    { id: 'p-3', name: 'Install', service_id: 'svc-2', position: 1, scenarios: [] },
  ],
}

/** Every `phases` filter asked for, so a read across all services shows up. */
let phaseFilters: unknown[] = []

function fakeSupabase() {
  return {
    from(table: string) {
      let rows = [...(TABLES[table] ?? [])]
      const api: Record<string, unknown> = {
        select: () => api,
        eq: (column: string, value: unknown) => {
          if (table === 'phases') phaseFilters.push(value)
          rows = rows.filter((row) => row[column] === value)
          return api
        },
        order: () => api,
        abortSignal: () => api,
        then: (resolve: (value: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve({ data: rows, error: null }).then(resolve, reject),
      }
      return api
    },
  }
}

/** What the board would draw: the active id from the store, and its phases. */
function Probe() {
  const id = useActiveServiceId()
  const { service, slug } = useActiveService()
  const { phases, loading } = useServicePhases(id)
  return (
    <p>
      {id ?? 'no id'} / {service?.name ?? 'no service'} / {slug ?? 'no slug'} /{' '}
      {loading ? 'loading' : phases.map((phase) => phase.name).join('+') || 'no phases'}
    </p>
  )
}

function Switcher({ to }: { to: string }) {
  const { switchService } = useActiveService()
  return <button onClick={() => switchService(to)}>switch</button>
}

function mount(node: ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: QUERY_DEFAULTS } })}>
      <ActiveServiceProvider>{node}</ActiveServiceProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  supabase.client = fakeSupabase()
  supabase.configured = true
  phaseFilters = []
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  cleanup()
  setActiveServiceSlug(null)
  setActiveService(null)
})

describe('the provider resolves the route into the store', () => {
  it('a boot slug becomes that service, and the scoped read follows', async () => {
    setActiveServiceSlug('heat-pump-grants')
    mount(<Probe />)
    expect(
      await screen.findByText('svc-2 / Heat Pump Grants / heat-pump-grants / Apply+Install'),
    ).toBeDefined()
    expect(getActiveService()).toEqual({ id: 'svc-2', slug: 'heat-pump-grants' })
    expect(phaseFilters).toEqual(['svc-2'])
  })

  it('the bare root becomes the first service, and the URL is canonicalized', async () => {
    mount(<Probe />)
    expect(await screen.findByText(/^svc-1 \/ Rooftop Retrofit/)).toBeDefined()
    expect(window.location.pathname).toBe('/rooftop-retrofit')
  })

  it('a slug no service carries resolves to nothing, and nothing is read', async () => {
    setActiveServiceSlug('billing')
    mount(<Probe />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(screen.getByText('no id / no service / billing / loading')).toBeDefined()
    expect(getActiveService()).toBeNull()
    expect(phaseFilters).toEqual([])
  })

  it('a switch moves the store, the URL and the read together', async () => {
    setActiveServiceSlug('rooftop-retrofit')
    mount(
      <>
        <Probe />
        <Switcher to="heat-pump-grants" />
      </>,
    )
    expect(await screen.findByText(/^svc-1 \/ Rooftop Retrofit .* \/ Survey$/)).toBeDefined()
    act(() => screen.getByText('switch').click())
    expect(getActiveService()).toEqual({ id: 'svc-2', slug: 'heat-pump-grants' })
    expect(window.location.pathname).toBe('/heat-pump-grants')
    expect(
      await screen.findByText('svc-2 / Heat Pump Grants / heat-pump-grants / Apply+Install'),
    ).toBeDefined()
    expect(phaseFilters).toEqual(['svc-1', 'svc-2'])
  })

  it('with no database, the sample service is active and the URL is left alone', async () => {
    supabase.configured = false
    mount(<Probe />)
    await act(async () => {})
    expect(getActiveService()?.id).toBe(SAMPLE_SERVICE_ID)
    expect(window.location.pathname).toBe('/')
  })
})
