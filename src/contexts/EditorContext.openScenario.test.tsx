// @vitest-environment jsdom
/**
 * `openScenario` is the one function that opens a scenario from anywhere:
 * it selects the phase and the scenario, selects the default path, and
 * leaves any covering tab.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setActiveService } from '@/contexts/activeService'
import { ActiveServiceProvider } from '@/contexts/ActiveServiceContext'
import { DeploymentConfigProvider } from '@/contexts/DeploymentConfigContext'
import { EditorProvider, useEditor } from '@/contexts/EditorContext'
import {
  PathSelectionProvider,
  usePathSelectionContext,
} from '@/contexts/PathSelectionContext'
import { ViewStateProvider } from '@/contexts/ViewStateContext'
import { SAMPLE_NAV } from '@/data/sampleNav'
import type { PathListItem } from '@/lib/pathSelection'
import { isSubslide } from '@/types/nav'

const supabase = vi.hoisted(() => ({
  configured: false,
  client: null as unknown,
}))

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: supabase.client,
    configured: supabase.configured,
    canWrite: false,
  }),
}))

vi.mock('@/lib/supabase', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase')>()),
  isSupabaseConfigured: () => supabase.configured,
}))

const SAMPLE_SCENARIO = SAMPLE_NAV.find((item) => isSubslide(item))!

const HAPPY_PATH: PathListItem = {
  id: 'path-happy',
  name: 'Happy Path',
  summary: null,
  note: null,
  kind: 'happy',
}

/**
 * Seeds the path catalog so `openScenario` has a default path to select.
 */
function CatalogSeed() {
  const { syncScenarioPaths } = usePathSelectionContext()
  useEffect(() => {
    syncScenarioPaths(
      new Map([[SAMPLE_SCENARIO.id, [HAPPY_PATH]]]),
      [SAMPLE_SCENARIO.id],
    )
  }, [syncScenarioPaths])
  return null
}

/**
 * Surfaces the seam as a button and the resulting selection as attributes.
 */
function Probe() {
  const { openScenario, selectedScenarioId, selectedPhaseId } = useEditor()
  const { getSelectedPathIds } = usePathSelectionContext()
  return (
    <button
      type="button"
      data-scenario={selectedScenarioId ?? ''}
      data-phase={selectedPhaseId ?? ''}
      data-paths={getSelectedPathIds(SAMPLE_SCENARIO.id).join(',')}
      onClick={() => openScenario(SAMPLE_SCENARIO.id)}
    >
      Open sample scenario
    </button>
  )
}

/**
 * Mount the editor with a seeded catalog and the probe.
 */
async function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <DeploymentConfigProvider>
          <ActiveServiceProvider>
            <EditorProvider>
              <ViewStateProvider>
                <PathSelectionProvider>
                  <CatalogSeed />
                  <Probe />
                </PathSelectionProvider>
              </ViewStateProvider>
            </EditorProvider>
          </ActiveServiceProvider>
        </DeploymentConfigProvider>
      </QueryClientProvider>,
    )
  })
}

afterEach(() => {
  cleanup()
  setActiveService(null)
})

describe('openScenario', () => {
  it('lands on the scenario with its default path', async () => {
    await mount()
    const opener = screen.getByRole('button', { name: 'Open sample scenario' })
    await act(async () => {
      opener.click()
    })

    await waitFor(() => {
      expect(opener.getAttribute('data-scenario')).toBe(SAMPLE_SCENARIO.id)
    })
    expect(opener.getAttribute('data-phase')).toBe(SAMPLE_SCENARIO.parentId)
    expect(opener.getAttribute('data-paths')).toBe(HAPPY_PATH.id)
  })
})
