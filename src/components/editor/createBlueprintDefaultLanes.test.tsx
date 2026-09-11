// @vitest-environment jsdom
/**
 * The lanes a new blueprint starts with, when nothing is copied, are the
 * deployment's to name.
 *
 * Asserted at the highest seam there is: a config handed to the provider, a
 * person filling in the create dialog, and the lane set that reaches the
 * `create_scenario` call. Only the network is faked. Lane names here are
 * invented — the template holds no deployment's vocabulary.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateBlueprintDialog } from '@/components/editor/CreateBlueprintDialog'
import { DeploymentConfigProvider } from '@/contexts/DeploymentConfigContext'
import type { DeploymentConfig } from '@/deploymentConfig'
import type { LaneSetEntry } from '@/lib/authoringRpc'

const rpc = vi.hoisted(() => ({
  createScenario: vi.fn(async () => ({ scenario_id: 'scenario-1' })),
}))

vi.mock('@/lib/authoringRpc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/authoringRpc')>()),
  createScenario: rpc.createScenario,
}))
vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({ client: {} }),
}))
vi.mock('@/hooks/useServicePhases', () => ({
  useServicePhases: () => ({
    phases: [{ id: 'phase-1', name: 'Intake' }],
    slides: [],
    loading: false,
    error: null,
    configured: true,
  }),
}))
vi.mock('@/hooks/useSupabaseQuery', () => ({
  useSupabaseQuery: () => ({ status: 'ready', data: [] }),
  invalidateStructure: () => {},
}))

const DEPLOYMENT_LANES: LaneSetEntry[] = [
  { name: 'Storyboard', lane_role: 'storyboard', position: 0 },
  { name: 'Caller', lane_role: 'customer_actions', position: 1 },
  { name: 'Dispatcher', lane_role: 'frontstage_actions', position: 2 },
]

// Module-level, as a host passes it: an inline literal would re-resolve on
// every render.
const WITH_LANES: DeploymentConfig = { defaultLanes: DEPLOYMENT_LANES }

/** Fill the dialog the way a person would and press Create. */
async function createWithStandardLanes(config?: DeploymentConfig) {
  render(
    <DeploymentConfigProvider config={config}>
      <CreateBlueprintDialog open onOpenChange={() => undefined} />
    </DeploymentConfigProvider>,
  )
  fireEvent.change(screen.getByPlaceholderText('Intake Call'), {
    target: { value: 'Reports a fault' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Intake' }))
  fireEvent.change(screen.getByPlaceholderText('e.g. Signs up without conflicts'), {
    target: { value: 'Reaches someone first time' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Create blueprint' }))
  await waitFor(() => expect(rpc.createScenario).toHaveBeenCalledTimes(1))
  const [, input] = rpc.createScenario.mock.calls[0] as unknown as [
    unknown,
    { laneSet: LaneSetEntry[]; laneSourcePathId: string | null },
  ]
  return input
}

beforeEach(() => {
  rpc.createScenario.mockClear()
})

afterEach(cleanup)

describe('a new blueprint starts with the default lanes', () => {
  it('a deployment that names its default lanes creates a new blueprint with them', async () => {
    const input = await createWithStandardLanes(WITH_LANES)

    expect(input.laneSourcePathId).toBeNull()
    expect(input.laneSet).toEqual(DEPLOYMENT_LANES)
    // The option a person picks says how many lanes they are about to get,
    // and that is the deployment's count, not the template's.
    expect(
      screen.getByRole('option', { name: 'Standard set (3 lanes)' }),
    ).toBeDefined()
  })

  it("a deployment that names none creates a new blueprint with the template's standard set", async () => {
    const input = await createWithStandardLanes()

    // Spelled out rather than read back from the constant, so a change to
    // what the template ships is a change this test has to be told about.
    expect(input.laneSet.map(({ name, lane_role, position }) => [name, lane_role, position])).toEqual([
      ['Storyboard', 'storyboard', 0],
      ['Customer Actions', 'customer_actions', 1],
      ['Front Stage Touchpoints', 'frontstage_touchpoints', 2],
      ['Front Stage Actions', 'frontstage_actions', 3],
      ['Back Stage Touchpoints', 'backstage_touchpoints', 4],
      ['Back Stage Actions', 'backstage_actions', 5],
      ['Support Actions', 'support_actions', 6],
    ])
    expect(
      screen.getByRole('option', { name: 'Standard set (7 lanes)' }),
    ).toBeDefined()
  })
})
