// @vitest-environment jsdom
/**
 * The service a reader is told about is the service the board is drawing.
 *
 * The board resolves its service through `findActiveServiceId` — the one the
 * URL slug names, or the first by `created_at` at the bare root. The header's
 * service read and the definition popovers' examples each took the first row
 * by `created_at` instead, unconditionally. With one service the two answers
 * are the same row and nothing shows; with a second, the board drew one
 * service while its title, summary, counts and examples described another.
 *
 * The seam is the two hooks, rendered over a fake PostgREST that honours the
 * filters it is given, because the claim is about which row comes back: a
 * fake that ignored `.eq()` would have answered the right service whichever
 * one was asked for.
 *
 * Two smaller claims ride along, both about the requests rather than the
 * answer: nothing is asked for until the session is known (the read is keyed
 * by what the reader may see, so asking early buys the anonymous answer and
 * then the signed-in one), and the counts and the business model go out
 * together rather than one after the other.
 */
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const supabase = vi.hoisted(() => ({
  client: null as unknown,
  canReadPrivate: false,
  isLoading: false,
}))

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: supabase.client,
    configured: true,
    session: null,
    isLoading: supabase.isLoading,
    canWrite: false,
    isDevAuthoring: false,
    isEditPreview: false,
    canAgent: supabase.canReadPrivate,
    canReadPrivate: supabase.canReadPrivate,
  }),
}))

import { setActiveServiceSlug } from '@/contexts/activeServiceStore'
import {
  EntityExamplesProvider,
  useEntityExamples,
} from '@/contexts/EntityExamplesContext'
import { useServiceSpec } from '@/hooks/useServiceSpec'
import { QUERY_DEFAULTS } from '@/lib/queryClient'
import { __resetActiveServiceIdCache } from '@/lib/service'

type Row = Record<string, unknown>
type Result = { data: unknown; error: { message: string } | null }

/** Two services, the second one created later — so "first" is the wrong one. */
const TABLES: Record<string, Row[]> = {
  services: [
    {
      id: 'svc-1',
      name: 'Rooftop Retrofit',
      slug: 'rooftop-retrofit',
      summary: 'Rooftop solar, end to end.',
      entity_examples: { lane: 'The installer row' },
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'svc-2',
      name: 'Heat Pump Grants',
      slug: 'heat-pump-grants',
      summary: 'A grant, then a heat pump.',
      entity_examples: { lane: 'The assessor row' },
      created_at: '2026-02-01T00:00:00Z',
    },
  ],
  phases: [
    { id: 'p-1', service_id: 'svc-1', scenarios: [{ id: 's-1' }] },
    { id: 'p-2', service_id: 'svc-2', scenarios: [{ id: 's-2' }, { id: 's-3' }] },
    { id: 'p-3', service_id: 'svc-2', scenarios: [] },
  ],
  business_models: [
    { service_id: 'svc-1', funding: 'A block grant' },
    { service_id: 'svc-2', funding: 'A national scheme' },
  ],
}

/** Every table asked for, in the order asked. */
let requests: string[] = []

/** Tables whose answers wait for `release()`, and the release itself. */
let held = new Set<string>()
let release: () => void = () => {}
let gate: Promise<void> = Promise.resolve()

/**
 * Just enough PostgREST for the two reads: `eq` filters, `order` sorts on the
 * one column asked for, `limit` truncates, and a held table does not answer
 * until the test lets it.
 */
function fakeSupabase() {
  return {
    from(table: string) {
      requests.push(table)
      let rows = [...(TABLES[table] ?? [])]
      const settle = async (): Promise<Result> => {
        if (held.has(table)) await gate
        return { data: rows, error: null }
      }
      const api: Record<string, unknown> = {
        select: () => api,
        eq: (column: string, value: unknown) => {
          rows = rows.filter((row) => row[column] === value)
          return api
        },
        order: (column: string) => {
          rows.sort((a, b) => String(a[column]).localeCompare(String(b[column])))
          return api
        },
        limit: (count: number) => {
          rows = rows.slice(0, count)
          return api
        },
        abortSignal: () => api,
        maybeSingle: async () => {
          const result = await settle()
          return { data: (result.data as Row[])[0] ?? null, error: null }
        },
        then: (resolve: (value: Result) => unknown, reject?: (e: unknown) => unknown) =>
          settle().then(resolve, reject),
      }
      return api
    },
  }
}

function mount(node: ReactNode) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: QUERY_DEFAULTS } })}
    >
      {node}
    </QueryClientProvider>,
  )
}

/** What the service header is built from, as one line of text. */
function ServiceLine() {
  const result = useServiceSpec()
  if (result.status !== 'ready') return <p>{result.status}</p>
  const spec = result.data
  if (!spec) return <p>no service</p>
  return (
    <p>
      {spec.name} · {spec.phaseCount} phases · {spec.scenarioCount} scenarios
      {spec.businessModelVisible ? ` · ${spec.funding}` : ''}
    </p>
  )
}

function LaneExample() {
  return <p>{useEntityExamples().lane ?? 'no example'}</p>
}

beforeEach(() => {
  requests = []
  held = new Set()
  gate = new Promise<void>((resolve) => {
    release = resolve
  })
  supabase.client = fakeSupabase()
  supabase.canReadPrivate = false
  supabase.isLoading = false
  __resetActiveServiceIdCache()
})

afterEach(() => {
  cleanup()
  setActiveServiceSlug(null)
})

describe('the service the header names', () => {
  it('is the one the URL names, not the first one created', async () => {
    setActiveServiceSlug('heat-pump-grants')
    mount(<ServiceLine />)
    expect(
      await screen.findByText('Heat Pump Grants · 2 phases · 2 scenarios'),
    ).toBeDefined()
    expect(screen.queryByText(/Rooftop Retrofit/)).toBeNull()
  })

  it('is the first one created at the bare root, where no service is named', async () => {
    mount(<ServiceLine />)
    expect(
      await screen.findByText('Rooftop Retrofit · 1 phases · 1 scenarios'),
    ).toBeDefined()
  })
})

describe('the examples the definitions are grounded with', () => {
  it('come from the service the URL names', async () => {
    setActiveServiceSlug('heat-pump-grants')
    mount(
      <EntityExamplesProvider>
        <LaneExample />
      </EntityExamplesProvider>,
    )
    expect(await screen.findByText('The assessor row')).toBeDefined()
  })
})

describe('the requests the service read makes', () => {
  it('asks for nothing until the session is known', async () => {
    supabase.isLoading = true
    setActiveServiceSlug('heat-pump-grants')
    const view = mount(<ServiceLine />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(requests).toEqual([])

    supabase.isLoading = false
    view.rerender(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: QUERY_DEFAULTS } })}
      >
        <ServiceLine />
      </QueryClientProvider>,
    )
    expect(
      await screen.findByText('Heat Pump Grants · 2 phases · 2 scenarios'),
    ).toBeDefined()
  })

  it('sends the counts and the business model together', async () => {
    supabase.canReadPrivate = true
    setActiveServiceSlug('heat-pump-grants')
    held = new Set(['phases', 'business_models'])
    mount(<ServiceLine />)

    // Both are in flight while neither has answered. One after the other,
    // the second is never asked for while the first is held.
    await waitFor(() => {
      expect(requests).toContain('phases')
      expect(requests).toContain('business_models')
    })

    release()
    expect(
      await screen.findByText(
        'Heat Pump Grants · 2 phases · 2 scenarios · A national scheme',
      ),
    ).toBeDefined()
  })
})
