import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { runTool } from '@/lib/agent/tools/definition'
import { fakeToolContext } from '@/lib/agent/tools/definitions/testContext'

/*
 * The two reads whose implementation is too deep to drive through a
 * recording client — ranked search embeds and calls a database function,
 * and a deletion impact walks the journey — are tested at the seam their
 * definition crosses: the arguments the model sent arrive at the reader as
 * the reader's own options, and nothing is dropped or renamed on the way.
 */

vi.mock('@/lib/agent/tools/search', () => ({
  searchBlueprint: vi.fn(async () => 'ranked'),
}))
vi.mock('@/lib/agent/tools/read', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/agent/tools/read')>()),
  getDeletionImpact: vi.fn(async () => 'impact'),
}))

const { searchBlueprint } = await import('@/lib/agent/tools/search')
const { getDeletionImpact } = await import('@/lib/agent/tools/read')
const { searchBlueprintTool, measureDeletionImpactTool } = await import(
  '@/lib/agent/tools/definitions/blueprint'
)

// Scope resolution reads `services` first; one service means the whole deployment.
const client = {
  from: () => ({
    select: () => Promise.resolve({ data: [{ id: 'svc', name: 'Only', slug: 'only' }], error: null }),
  }),
} as unknown as SupabaseClient<Database>

describe('search_blueprint hands every argument to the ranked search', () => {
  it('passes query, filters, limit, scope, meaning and the abort signal', async () => {
    const signal = new AbortController().signal
    const meaning = { index: { model: 'm', dims: 1 } as never, apiKey: 'k' }
    const text = await runTool(
      searchBlueprintTool,
      { query: 'missing document', granularity: ['cell', 'path'], phase: 'Intake', kind: 'exception', lane_role: 'customer_actions', limit: 5 },
      fakeToolContext({ client, meaning, signal }),
    )
    expect(text).toBe('ranked')
    expect(vi.mocked(searchBlueprint)).toHaveBeenCalledWith(client, {
      query: 'missing document',
      granularity: ['cell', 'path'],
      phase: 'Intake',
      scenario: undefined,
      pathKind: 'exception',
      laneRole: 'customer_actions',
      limit: 5,
      scope: { kind: 'all' },
      meaning,
      signal,
    })
  })
})

describe('measure_deletion_impact hands the kind, target and scope to the reader', () => {
  it('runs a path impact with no scope, and a step impact with its path', async () => {
    const ctx = fakeToolContext({ client })
    expect(await runTool(measureDeletionImpactTool, { kind: 'path', target_id: 'p-1' }, ctx)).toBe('impact')
    expect(vi.mocked(getDeletionImpact)).toHaveBeenLastCalledWith(client, 'path', 'p-1', undefined)
    await runTool(measureDeletionImpactTool, { kind: 'step', target_id: 's-1', scope_id: 'p-1' }, ctx)
    expect(vi.mocked(getDeletionImpact)).toHaveBeenLastCalledWith(client, 'step', 's-1', 'p-1')
  })
})
