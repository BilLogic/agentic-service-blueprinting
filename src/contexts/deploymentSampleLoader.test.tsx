// @vitest-environment jsdom
/**
 * The other form of `sample.blueprints`: a loader rather than a registry.
 *
 * A deployment's offline board is the largest value it hands this config, and
 * it is read on one condition — the bundled sample being reachable at all. As
 * a value it rides in every build regardless; as a loader it is fetched in the
 * builds that draw it and in no others. Two things have to hold for that trade
 * to be worth making, and they are the two tests here: what the board draws
 * offline is the loader's registry, and a build with a database never calls the
 * loader.
 *
 * "A database is configured" is MOCKED rather than driven through the
 * environment, because `src/lib/supabase.ts` reads `import.meta.env` once when
 * it evaluates and `vi.stubEnv` cannot reach a value already captured — the
 * same reason `resolveBlueprint.test.ts` mocks it. That is also why this sits
 * beside `deploymentSampleBoard.test.tsx` rather than inside it: a file-wide
 * mock there would quietly replace the question those tests answer for real.
 *
 * BOTH GATES MOVE TOGETHER, and that is not a belt-and-braces flourish. Two
 * independent readings of one fact stand between a config and a drawn board:
 * the provider asks `isBundledSampleActive()`, and `useCanvasBlueprints` asks
 * `configured` from `useSupabase()`, which is `isSupabaseConfigured()`. Mocking
 * only the first leaves the second answering whatever the workspace's own
 * `.env` happens to hold, so the suite passes on CI and issues a live request
 * on the machine of anyone who has a database.
 *
 * Invented names and invented ids only, deliberately not among the sample's.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeploymentConfigProvider } from '@/contexts/DeploymentConfigContext'
import { SupabaseProvider } from '@/contexts/SupabaseProvider'
import {
  configureSampleBlueprints,
  hasBlueprintFallback,
  type SampleBlueprintRegistry,
  type SampleBlueprintRegistryLoader,
} from '@/data/blueprintFallbacks'
import type { DeploymentConfig } from '@/deploymentConfig'
import { useCanvasBlueprints } from '@/hooks/useCanvasBlueprints'
import { queryClient } from '@/lib/queryClient'
import type { BlueprintData } from '@/types/blueprint'
import type { NavItem } from '@/types/nav'

/**
 * The host's error boundary, in miniature: React has no hook form, and what
 * the rejection test asserts is that the throw REACHES one rather than being
 * swallowed into a blank board.
 */
class ErrorBoundary extends Component<
  { children: ReactNode; onError: (cause: unknown) => void },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(cause: Error, _info: ErrorInfo) {
    this.props.onError(cause)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** `database: false` is a build with no database — the sample's only state. */
const deployment = vi.hoisted(() => ({ database: false }))
vi.mock('@/lib/bundledSample', () => ({
  isBundledSampleActive: () => !deployment.database,
}))
vi.mock('@/lib/supabase', async (importOriginal) => ({
  // Partial: `SupabaseProvider` reads more of this module than the one
  // question under test, and the rest of it should stay itself.
  ...(await importOriginal<typeof import('@/lib/supabase')>()),
  isSupabaseConfigured: () => deployment.database,
}))

const PHASE_ID = 'd0000000-0000-4000-8000-0000000000a1'
const SCENARIO_ID = 'd0000000-0000-4000-8000-0000000000b1'
const PATH_ID = 'd0000000-0000-4000-8000-0000000000c1'

const NAV: NavItem[] = [
  { id: PHASE_ID, index: 1, label: 'Renewing', summary: 'How somebody renews.' },
  {
    id: SCENARIO_ID,
    index: 1,
    label: 'The reminder',
    parentId: PHASE_ID,
    layout: 'stacked',
  },
]

const BOARD: BlueprintData = {
  path: {
    id: PATH_ID,
    name: 'Reminder read',
    summary: null,
    note: null,
    kind: 'happy',
    status: 'live',
  },
  lanes: [
    { id: `${PATH_ID}-lane`, name: 'Member', role: 'customer', position: 1 },
  ],
  steps: [{ id: `${PATH_ID}-step`, name: 'Open the letter', position: 1 }],
  cells: [
    {
      id: `${PATH_ID}-cell`,
      lane_id: `${PATH_ID}-lane`,
      step_id: `${PATH_ID}-step`,
      content: 'They open the letter',
      frame: null,
      summary: null,
    },
  ],
  dependencies: [],
}

const REGISTRY: SampleBlueprintRegistry = {
  blueprintsByScenario: { [SCENARIO_ID]: [BOARD] },
}

describe('an offline board supplied as a loader', () => {
  let load: ReturnType<typeof vi.fn<SampleBlueprintRegistryLoader>>
  let config: DeploymentConfig

  beforeEach(() => {
    deployment.database = false
    // A resolved promise rather than a real `import()`: what is under test is
    // that the provider waits for one and calls it only when it should, and a
    // module of its own would add a second file saying nothing new.
    load = vi.fn<SampleBlueprintRegistryLoader>(() => Promise.resolve(REGISTRY))
    // Module-level, as a host passes it.
    config = { sample: { nav: NAV, blueprints: load } }
  })

  afterEach(() => {
    // Explicit: this repository does not run vitest with globals, so nothing
    // unmounts the last render for us and two trees would answer one query.
    cleanup()
    queryClient.clear()
    configureSampleBlueprints(undefined)
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <DeploymentConfigProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SupabaseProvider>{children}</SupabaseProvider>
      </QueryClientProvider>
    </DeploymentConfigProvider>
  )

  it('is what the canvas draws once it has arrived', async () => {
    const { result } = renderHook(() => useCanvasBlueprints([SCENARIO_ID]), {
      wrapper,
    })

    // Nothing below the provider mounted while the registry was outstanding —
    // the gate, stated as the absence it is.
    expect(result.current).toBeNull()

    await waitFor(() => expect(result.current).not.toBeNull())

    expect(result.current.usingFallback).toBe(true)
    expect(
      result.current.pathsByScenario.get(SCENARIO_ID)?.map((path) => path.name),
    ).toEqual(['Reminder read'])
    expect(
      result.current.blueprintsByScenario
        .get(SCENARIO_ID)
        ?.cells.map((cell) => cell.content),
    ).toEqual(['They open the letter'])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('is never asked for when a database is configured', () => {
    deployment.database = true

    const { getByText } = render(
      <DeploymentConfigProvider config={config}>
        <p>the app</p>
      </DeploymentConfigProvider>,
    )

    // `render` flushes effects, so the call either happened by now or never
    // will. It never will: a build with a database reads no registry, and
    // fetching one is the whole cost this form exists to avoid. The tree is
    // there in the same tick, with nothing on the wire ahead of it.
    expect(load).not.toHaveBeenCalled()
    expect(getByText('the app')).toBeTruthy()
  })

  it('throws rather than quietly showing the template’s board', async () => {
    const boom = new Error('the chunk never arrived')
    const failing: DeploymentConfig = {
      sample: { nav: NAV, blueprints: () => Promise.reject(boom) },
    }
    // The throw is the point, so the console noise React makes on the way is
    // not; silenced rather than left to look like a failure of its own.
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    let caught: unknown = null

    try {
      render(
        <ErrorBoundary onError={(cause) => (caught = cause)}>
          <DeploymentConfigProvider config={failing}>
            <p>the app</p>
          </DeploymentConfigProvider>
        </ErrorBoundary>,
      )
      await waitFor(() => expect(caught).toBe(boom))
    } finally {
      errors.mockRestore()
    }

    // And no board: falling back to the package's own would be a deployment's
    // chrome around a canvas its own identifiers cannot fill, with nothing
    // anywhere saying so.
    expect(hasBlueprintFallback(SCENARIO_ID)).toBe(false)
  })

  it('keeps the eager form synchronous', () => {
    const eager: DeploymentConfig = {
      sample: { nav: NAV, blueprints: REGISTRY },
    }

    const { getByText } = render(
      <DeploymentConfigProvider config={eager}>
        <p>the app</p>
      </DeploymentConfigProvider>,
    )

    expect(getByText('the app')).toBeTruthy()
  })
})
