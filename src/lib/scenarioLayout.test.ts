import { beforeEach, describe, expect, it, vi } from 'vitest'
import { persistScenarioLayout } from '@/lib/scenarioLayout'

const invalidateStructure = vi.fn()
vi.mock('@/lib/queryClient', () => ({
  invalidateStructure: () => invalidateStructure(),
}))

const recordChange = vi.fn()
vi.mock('@/lib/authoringSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/authoringSession')>()),
  recordChange: (...args: unknown[]) => recordChange(...args),
}))

function fakeClient() {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the seam is untyped, see authoringRpc.invoke
  return { client: { rpc } as any, rpc }
}

beforeEach(() => {
  invalidateStructure.mockClear()
  recordChange.mockClear()
})

describe('persistScenarioLayout', () => {
  it("writes the column for an editor, records the inverse, and refetches the structure", async () => {
    const { client, rpc } = fakeClient()
    const outcome = await persistScenarioLayout(client, true, {
      scenarioId: 'scenario-1',
      layout: 'merged',
      previous: 'stacked',
    })
    expect(outcome).toBe('written')
    expect(rpc).toHaveBeenCalledWith('update_scenario_layout', {
      scenario_id: 'scenario-1',
      layout: 'merged',
    })
    expect(recordChange).toHaveBeenCalledWith(
      'update_scenario_layout',
      { scenario_id: 'scenario-1', layout: 'merged' },
      {
        fn: 'update_scenario_layout',
        args: { scenario_id: 'scenario-1', layout: 'stacked' },
      },
    )
    expect(invalidateStructure).toHaveBeenCalledTimes(1)
  })

  it('does not touch the database for a session that cannot write', async () => {
    const { client, rpc } = fakeClient()
    const outcome = await persistScenarioLayout(client, false, {
      scenarioId: 'scenario-1',
      layout: 'merged',
      previous: 'stacked',
    })
    expect(outcome).toBe('session-only')
    expect(rpc).not.toHaveBeenCalled()
    expect(recordChange).not.toHaveBeenCalled()
    expect(invalidateStructure).not.toHaveBeenCalled()
  })

  it('is session-only with no client at all', async () => {
    expect(
      await persistScenarioLayout(null, true, {
        scenarioId: 'scenario-1',
        layout: 'stacked',
        previous: 'merged',
      }),
    ).toBe('session-only')
  })
})
