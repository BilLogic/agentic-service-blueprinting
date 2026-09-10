import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { __resetActiveServiceIdCache, findActiveServiceId } from '@/lib/service'
import { setActiveServiceSlug } from '@/contexts/activeServiceStore'

/*
 * The read seam: `findActiveServiceId` is what scopes every unpinned journey
 * read (`useServicePhases`, `useSlices`) to one service. These assert that the
 * slug in the URL selects the service whose rows those reads return — and only
 * that service — mirroring how the path-selection tests pin the selection seam.
 */

const TWO_SERVICES = [
  { id: 'svc-support', name: 'Support Desk', slug: 'support-desk' },
  { id: 'svc-sales', name: 'Sales Pipeline', slug: 'sales-pipeline' },
]

/** A client stub that answers `from('services').select('id, name, slug')`. */
function fakeClient(
  rows: { id: string; name: string; slug?: string | null }[],
): SupabaseClient<Database> {
  return {
    from() {
      return {
        select() {
          return Promise.resolve({ data: rows, error: null })
        },
      }
    },
  } as unknown as SupabaseClient<Database>
}

beforeEach(() => {
  __resetActiveServiceIdCache()
})

afterEach(() => {
  setActiveServiceSlug(null)
  __resetActiveServiceIdCache()
})

describe('findActiveServiceId', () => {
  it('resolves the service the URL slug names', async () => {
    setActiveServiceSlug('sales-pipeline')
    await expect(findActiveServiceId(fakeClient(TWO_SERVICES))).resolves.toBe('svc-sales')
  })

  it('scopes to that service alone, never a sibling', async () => {
    setActiveServiceSlug('support-desk')
    const id = await findActiveServiceId(fakeClient(TWO_SERVICES))
    expect(id).toBe('svc-support')
    expect(id).not.toBe('svc-sales')
  })

  it('resolves null when no service carries the slug', async () => {
    setActiveServiceSlug('billing')
    await expect(findActiveServiceId(fakeClient(TWO_SERVICES))).resolves.toBeNull()
  })

  it('resolves by the slug column, so a rename does not move the deep link', async () => {
    // The service kept its `sales-pipeline` slug through a rename; the URL
    // still resolves it, and the new name's derivation does not.
    const renamed = [{ id: 'svc-sales', name: 'Revenue Ops', slug: 'sales-pipeline' }]
    setActiveServiceSlug('sales-pipeline')
    await expect(findActiveServiceId(fakeClient(renamed))).resolves.toBe('svc-sales')
  })
})
