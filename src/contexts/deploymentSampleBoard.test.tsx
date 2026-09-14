// @vitest-environment jsdom
/**
 * A deployment's offline board is the one the canvas draws with no database —
 * both halves of it, the nav and the content behind the nav.
 *
 * `sample.nav` had a config home and the board behind it did not, so a
 * deployment that supplied its own nav got its phases and scenarios over an
 * empty canvas in every no-database build, and the render walk over that build
 * could find no board. This holds the fix at the level the failure
 * appeared: the hook the canvas reads its lanes, cells and paths from, under a
 * provider handed a deployment's config and nothing else.
 *
 * Invented names and invented ids only — the template holds no deployment's
 * vocabulary, and the ids here are deliberately not among the sample's.
 */
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { DeploymentConfigProvider } from '@/contexts/DeploymentConfigContext'
import { SupabaseProvider } from '@/contexts/SupabaseProvider'
import {
  configureSampleBlueprints,
  getBlueprintFallback,
  hasBlueprintFallback,
  SAMPLE_SCENARIO_ID,
  type SampleBlueprintRegistry,
} from '@/data/blueprintFallbacks'
import type { DeploymentConfig } from '@/deploymentConfig'
import { useCanvasBlueprints } from '@/hooks/useCanvasBlueprints'
import { queryClient } from '@/lib/queryClient'
import type { BlueprintData } from '@/types/blueprint'
import type { NavItem } from '@/types/nav'

const PHASE_ID = 'c0000000-0000-4000-8000-0000000000a1'
const SCENARIO_ID = 'c0000000-0000-4000-8000-0000000000b1'
const HAPPY_PATH_ID = 'c0000000-0000-4000-8000-0000000000c1'
const EXCEPTION_PATH_ID = 'c0000000-0000-4000-8000-0000000000c2'

function board(
  id: string,
  name: string,
  kind: BlueprintData['path']['kind'],
  cellContent: string,
): BlueprintData {
  return {
    path: { id, name, summary: null, note: null, kind, status: 'live' },
    lanes: [{ id: `${id}-lane`, name: 'Applicant', role: 'customer', position: 1 }],
    steps: [{ id: `${id}-step`, name: 'Arrive', position: 1 }],
    cells: [
      {
        id: `${id}-cell`,
        lane_id: `${id}-lane`,
        step_id: `${id}-step`,
        content: cellContent,
        frame: null,
        summary: null,
      },
    ],
    dependencies: [],
  }
}

const NAV: NavItem[] = [
  { id: PHASE_ID, index: 1, label: 'Joining', summary: 'How somebody joins.' },
  {
    id: SCENARIO_ID,
    index: 1,
    label: 'First contact',
    parentId: PHASE_ID,
    layout: 'stacked',
  },
]

const BLUEPRINTS: SampleBlueprintRegistry = {
  blueprintsByScenario: {
    [SCENARIO_ID]: [
      board(HAPPY_PATH_ID, 'Everything known', 'happy', 'They fill the form in'),
      board(EXCEPTION_PATH_ID, 'Nothing known', 'exception', 'They call instead'),
    ],
  },
}

// Module-level, as a host passes it.
const DEPLOYMENT: DeploymentConfig = {
  sample: { nav: NAV, blueprints: BLUEPRINTS },
}

describe('a deployment’s offline board', () => {
  // An adopter's real .env is loaded into import.meta.env by Vite for vitest
  // too — stub it empty so "no database configured" is true in any workspace.
  beforeAll(() => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
  })
  afterAll(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    queryClient.clear()
    configureSampleBlueprints(undefined)
  })

  const wrapperFor =
    (config?: DeploymentConfig) =>
    ({ children }: { children: ReactNode }) => (
      <DeploymentConfigProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <SupabaseProvider>{children}</SupabaseProvider>
        </QueryClientProvider>
      </DeploymentConfigProvider>
    )

  it('is what the canvas draws, path for path and cell for cell', () => {
    const { result } = renderHook(() => useCanvasBlueprints([SCENARIO_ID]), {
      wrapper: wrapperFor(DEPLOYMENT),
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.usingFallback).toBe(true)

    // Both paths are offered, in the order the registry lists them…
    expect(
      result.current.pathsByScenario.get(SCENARIO_ID)?.map((path) => path.name),
    ).toEqual(['Everything known', 'Nothing known'])

    // …each draws its own cells…
    expect(
      result.current.blueprintsByPathId
        .get(EXCEPTION_PATH_ID)
        ?.cells.map((cell) => cell.content),
    ).toEqual(['They call instead'])

    // …and the scenario with no path chosen draws the first of them, which is
    // the board the walk opens.
    const drawn = result.current.blueprintsByScenario.get(SCENARIO_ID)
    expect(drawn?.path.name).toBe('Everything known')
    expect(drawn?.lanes.map((lane) => lane.name)).toEqual(['Applicant'])
    expect(drawn?.cells.map((cell) => cell.content)).toEqual([
      'They fill the form in',
    ])
  })

  it('replaces the package’s rather than joining it', () => {
    renderHook(() => useCanvasBlueprints([SCENARIO_ID]), {
      wrapper: wrapperFor(DEPLOYMENT),
    })

    // The template's own sample answers nothing while a deployment's registry
    // is in force: a board that merged the two would show this template's
    // content under a deployment's name, which is the failure the whole
    // fallback rule exists to prevent.
    expect(hasBlueprintFallback(SAMPLE_SCENARIO_ID)).toBe(false)
    expect(getBlueprintFallback(SAMPLE_SCENARIO_ID)).toBeNull()
  })

  it('is the package’s own when a deployment supplies none', () => {
    const { result } = renderHook(
      () => useCanvasBlueprints([SAMPLE_SCENARIO_ID]),
      { wrapper: wrapperFor() },
    )

    expect(result.current.usingFallback).toBe(true)
    expect(
      result.current.blueprintsByScenario.get(SAMPLE_SCENARIO_ID),
    ).toBeDefined()
    expect(hasBlueprintFallback(SCENARIO_ID)).toBe(false)
  })
})
