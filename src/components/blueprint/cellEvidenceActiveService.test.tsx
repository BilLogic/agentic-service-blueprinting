// @vitest-environment jsdom
/**
 * A source belongs to the service the author is looking at.
 *
 * The panel used to resolve its service with `resolveFirstServiceId` — the
 * first row by `created_at`, whatever the URL says — while the board around it
 * drew the service the slug names. One service hides it; two file the evidence
 * against a service nobody was looking at, silently, and evidence is authored
 * content, so the wrong row stays wrong until somebody finds it by hand.
 *
 * The seam is the tab over a real `lib/service`, because the claim is about
 * which id that module answers with. `cellEvidenceTab.test.tsx` stubs the
 * module out to keep its own subject the form, which is exactly why the defect
 * could not show there.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CellEvidenceTab } from '@/components/blueprint/CellEvidenceTab'
import { setActiveServiceSlug } from '@/contexts/activeServiceStore'
import { __resetActiveServiceIdCache } from '@/lib/service'
import type { Database } from '@/types/database'

/** Two services, the second created later — so "first" is the wrong one. */
const SERVICES = [
  { id: 'svc-1', name: 'Rooftop Retrofit', slug: 'rooftop-retrofit' },
  { id: 'svc-2', name: 'Heat Pump Grants', slug: 'heat-pump-grants' },
]

type Draft = { serviceId?: string }
const addEvidence = vi.fn<(client: unknown, draft: Draft) => Promise<string>>(
  async () => 'e-new',
)
vi.mock('@/lib/evidenceMutations', () => ({
  addEvidence: (client: unknown, draft: Draft) => addEvidence(client, draft),
}))

vi.mock('@/hooks/useEvidence', () => ({
  useEvidence: () => ({ status: 'ready', data: [], source: 'database' }),
  invalidateEvidence: () => {},
}))

/** A client stub that answers the `services` reads both resolvers make. */
const client = {
  from() {
    const rows = SERVICES
    const api = {
      select: () => api,
      order: () => api,
      limit: () => api,
      then: (
        resolve: (value: { data: typeof rows; error: null }) => unknown,
        reject?: (error: unknown) => unknown,
      ) => Promise.resolve({ data: rows, error: null }).then(resolve, reject),
    }
    return api
  },
} as unknown as SupabaseClient<Database>

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({ client, configured: true, canWrite: true }),
}))

beforeEach(() => {
  addEvidence.mockClear()
  __resetActiveServiceIdCache()
})

afterEach(() => {
  cleanup()
  setActiveServiceSlug(null)
  __resetActiveServiceIdCache()
})

/** Open the form, name a source and save it. */
const addASource = (title: string) => {
  const view = render(<CellEvidenceTab cellId="cell-1" />)
  fireEvent.click(view.getByRole('button', { name: 'Add source' }))
  fireEvent.change(view.getByLabelText('Title'), { target: { value: title } })
  fireEvent.click(view.getByRole('button', { name: 'Add source' }))
}

describe('the service an added source belongs to', () => {
  it('is the one the URL names, not the first one created', async () => {
    setActiveServiceSlug('heat-pump-grants')
    addASource('Site visit, household 3')
    await waitFor(() => expect(addEvidence).toHaveBeenCalled())
    const draft = addEvidence.mock.calls[0]?.[1]
    expect(draft?.serviceId).toBe('svc-2')
    expect(draft?.serviceId).not.toBe('svc-1')
  })

  it('is the first one created at the bare root, where no service is named', async () => {
    addASource('Metabase, 2026-08-08')
    await waitFor(() => expect(addEvidence).toHaveBeenCalled())
    expect(addEvidence.mock.calls[0]?.[1].serviceId).toBe('svc-1')
  })
})
