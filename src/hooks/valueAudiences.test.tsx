// @vitest-environment jsdom
/**
 * The audiences the Value editor suggests: the registry's parties first, then
 * whatever has been written that the registry does not know.
 *
 * Suggesting only from what had been typed suggested the drift back at the
 * author — "resident" and "Residents" were offered as two audiences because
 * they had been typed as two, and a party the registry named but no value
 * entry had used yet was not offered at all. The registry is the answer to
 * who exists. The leftovers stay in the list, after it, so an author can see
 * (and correct) what does not match it yet rather than lose a value that
 * already exists.
 */
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const supabase = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: supabase.client,
    configured: true,
    session: null,
    isLoading: false,
    canWrite: true,
    canReadPrivate: true,
  }),
}))

import { useValueAudiences } from '@/hooks/useValueAudiences'
import { QUERY_DEFAULTS } from '@/lib/queryClient'

type Row = Record<string, unknown>

/** Each table answers with its rows; the filters are the hook's business. */
function fakeSupabase(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const api: Record<string, unknown> = {
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: tables[table] ?? [], error: null }).then(resolve),
      }
      for (const verb of ['select', 'order', 'not', 'abortSignal']) {
        api[verb] = () => api
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

function Audiences() {
  const result = useValueAudiences()
  return <p>{result.status === 'ready' ? result.data.join(' | ') : result.status}</p>
}

afterEach(cleanup)

describe('the audiences the Value editor suggests', () => {
  it('leads with the registry, then what was written that it does not know', async () => {
    supabase.client = fakeSupabase({
      // In the order the read asks for, by name.
      stakeholders: [
        { name: 'Resident', aliases: ['residents', 'householder'] },
        { name: 'Site Surveyor', aliases: [] },
      ],
      cells: [
        {
          value_props: [
            { for: 'resident', value: 'Knows what happens next' },
            { for: 'Householder', value: 'Is not surprised by the visit' },
          ],
        },
        {
          value_props: [
            { for: 'Landlord', value: 'Signs once' },
            { for: '  ', value: 'An entry nobody addressed' },
          ],
        },
        { value_props: [{ for: 'Council officer', value: 'Sees the survey' }] },
      ],
    })
    mount(<Audiences />)

    // `resident` and `Householder` are the registry's Resident — by name and
    // by alias, whatever the case — so neither is offered a second time. Site
    // Surveyor is offered though no value entry has named it yet. The two the
    // registry does not know follow, alphabetised.
    expect(
      await screen.findByText(
        'Resident | Site Surveyor | Council officer | Landlord',
      ),
    ).toBeDefined()
  })
})
