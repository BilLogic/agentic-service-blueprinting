// @vitest-environment jsdom
/**
 * What the service read asks for depends on who is asking.
 *
 * `business_models` is deliberately outside the contract's `publicReadTables`
 * — funding, pricing and delivery cost are not world-readable — and `anon`
 * holds no SELECT on it. PostgREST refuses the WHOLE select when one names a
 * table the caller cannot read, so the embed this hook used to carry meant
 * every anonymous visitor to production got `permission denied for table
 * business_models` in a banner above the board, and no service at all.
 *
 * The fake client below therefore ENFORCES the grant rather than assuming it:
 * a request that names `business_models` while signed out fails exactly the
 * way the database fails it. That is what makes this a reproduction and not a
 * restatement — against the embedding read, the anonymous case here shows the
 * production banner.
 *
 * The seam is `ServicePanel`, rendered over the real hook, because the claim
 * is about what a reader ends up seeing: a visitor gets the service and no
 * commercial section, an author gets both.
 */
import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const supabase = vi.hoisted(() => ({
  client: null as unknown,
  canReadPrivate: false,
}))

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: supabase.client,
    configured: true,
    session: null,
    isLoading: false,
    canWrite: false,
    isDevAuthoring: false,
    isEditPreview: false,
    canAgent: supabase.canReadPrivate,
    canReadPrivate: supabase.canReadPrivate,
  }),
}))

import { ServicePanel } from '@/components/blueprint/ServicePanel'
import { Drawer } from '@/components/ui/drawer'
import { CanvasModeContext } from '@/contexts/canvasModeContext'
import { QUERY_DEFAULTS } from '@/lib/queryClient'

const SERVICE_NAME = 'Rooftop Retrofit'
const SERVICE_SUMMARY = 'Rooftop solar, end to end.'
const FUNDING = 'A five-year block grant'

/** The message PostgREST returns when a select names a table anon cannot read. */
const DENIED = 'permission denied for table business_models'

type Result = { data: unknown; error: { message: string } | null }

/** Every table named this render, embeds included, in the order asked for. */
let named: string[] = []

/**
 * Just enough PostgREST for `useServiceSpec`, with the grant enforced.
 *
 * `services` and `phases` are readable by anyone; `business_models` is
 * readable only while `supabase.canReadPrivate` is true, whether it is reached
 * through `.from()` or embedded in another table's select.
 */
function fakeSupabase() {
  const rows: Record<string, unknown[]> = {
    services: [
      {
        id: 'svc-1',
        name: SERVICE_NAME,
        slug: 'rooftop-retrofit',
        summary: SERVICE_SUMMARY,
        entity_examples: {},
      },
    ],
    phases: [{ id: 'phase-1', scenarios: [{ id: 'scenario-1' }] }],
    business_models: [
      {
        funding: FUNDING,
        pricing: 'Free at the point of use',
        delivery_cost: '£400 a home',
        revenue_model: 'Renewed annually',
        partners: 'Two installers',
      },
    ],
  }

  return {
    from(table: string) {
      named.push(table)
      let denied = table === 'business_models' && !supabase.canReadPrivate
      const settle = (): Result =>
        denied
          ? { data: null, error: { message: DENIED } }
          : { data: rows[table] ?? [], error: null }

      const api: Record<string, unknown> = {
        select: (query: string) => {
          // An embed hint names its relation inside the select string, which
          // is where the original defect lived — the table was never handed
          // to `.from()` at all.
          for (const relation of Object.keys(rows)) {
            if (relation !== table && query.includes(`${relation}(`)) {
              named.push(relation)
              if (relation === 'business_models' && !supabase.canReadPrivate) {
                denied = true
              }
            }
          }
          return api
        },
        maybeSingle: () => {
          const result = settle()
          return Promise.resolve({
            data: result.error ? null : ((result.data as unknown[])[0] ?? null),
            error: result.error,
          })
        },
        then: (resolve: (value: Result) => unknown) =>
          Promise.resolve(settle()).then(resolve),
      }
      for (const verb of ['order', 'limit', 'eq', 'abortSignal']) {
        api[verb] = () => api
      }
      return api
    },
  }
}

/**
 * The app's own read policy, not a restatement of it. It matters here: a
 * client with TanStack's default retry would spend seconds backing off before
 * a refused read reached the panel, and the failure this file pins would look
 * like slowness rather than like the banner it is.
 */
function mountPanel(node: ReactElement) {
  return render(
    <CanvasModeContext.Provider
      value={{ mode: 'view', setMode: () => {}, available: true }}
    >
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: QUERY_DEFAULTS } })}
      >
        <Drawer open>{node}</Drawer>
      </QueryClientProvider>
    </CanvasModeContext.Provider>,
  )
}

beforeEach(() => {
  named = []
  supabase.client = fakeSupabase()
})

afterEach(cleanup)

describe('the service read, by who is reading', () => {
  it('a signed-out reader gets the service and no commercial spec', async () => {
    supabase.canReadPrivate = false
    mountPanel(<ServicePanel onClose={() => {}} />)

    // The read SUCCEEDS. Against the embedding version this is the production
    // banner instead: "The service could not be loaded: permission denied…".
    expect(await screen.findByText(SERVICE_NAME)).toBeDefined()
    expect(screen.queryByText(new RegExp(DENIED))).toBeNull()

    // Nothing asked the database for a table it would refuse — neither
    // directly nor as an embed.
    expect(named).not.toContain('business_models')

    // And the panel offers no commercial section at all, rather than five
    // fields reading "Not specified." over data this reader simply cannot see.
    expect(screen.queryByText('Funding')).toBeNull()
    expect(screen.queryByText('Pricing')).toBeNull()
    expect(screen.queryByText('Delivery cost')).toBeNull()
    expect(screen.queryByText('Revenue model')).toBeNull()
    expect(screen.queryByText('Partners')).toBeNull()
  })

  it('a signed-in reader gets the business model with it', async () => {
    supabase.canReadPrivate = true
    mountPanel(<ServicePanel onClose={() => {}} />)

    expect(await screen.findByText(SERVICE_NAME)).toBeDefined()
    expect(named).toContain('business_models')
    expect(screen.getByText('Funding')).toBeDefined()
    // The stored value, not just the label — the row was actually read.
    expect(screen.getByText(FUNDING)).toBeDefined()
  })
})
