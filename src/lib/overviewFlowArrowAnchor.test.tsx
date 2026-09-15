// @vitest-environment jsdom
import { SAMPLE_NAV } from '@/data/sampleNav'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ServiceOverviewView } from '@/components/editor/ServiceOverviewView'
import { ActiveServiceProvider } from '@/contexts/ActiveServiceContext'
import { DeploymentConfigProvider } from '@/contexts/DeploymentConfigContext'
import { EditorProvider } from '@/contexts/EditorContext'
import { EntityDetailProvider } from '@/contexts/EntityDetailContext'
import { EntityExamplesProvider } from '@/contexts/EntityExamplesContext'
import { PathSelectionProvider } from '@/contexts/PathSelectionContext'
import { TouchpointRegistryProvider } from '@/contexts/TouchpointRegistryProvider'
import { ViewStateProvider } from '@/contexts/ViewStateContext'
import {
  getMainSlides,
  isOverviewFlowArrowAnchorPhase,
  type NavItem,
} from '@/types/nav'

/*
  A loaded nav whose first phase is NOT the fallback's first, and whose second
  phase is. The anchor is the phase every flow arrow in the column aligns its
  centre to, so the two lists disagreeing is the whole question: resolve
  against the fallback and the second phase anchors a column drawn over the
  first.
*/
const fallbackFirstPhaseId = getMainSlides(SAMPLE_NAV)[0]!.id

const LOADED_NAV: NavItem[] = [
  { id: 'phase-intake', index: 1, label: 'Intake' },
  { id: fallbackFirstPhaseId, index: 2, label: 'Delivery' },
]

vi.mock('@/contexts/SupabaseProvider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/contexts/SupabaseProvider')>()),
  useSupabase: () => ({ client: null, configured: false, canWrite: false }),
}))

/*
  The board's navigation, replaced at the one seam the provider reads it
  from. Everything else in the tree below is the real thing: the claim is
  about which list the overview asks its anchor question with, so the
  provider that chooses that list has to be the real provider.
*/
const LOADED_PHASES = {
  phases: [],
  slides: LOADED_NAV,
  loading: false,
  error: null,
  configured: true,
}

vi.mock('@/hooks/useServicePhases', () => ({
  useServicePhases: () => LOADED_PHASES,
}))

beforeAll(() => {
  // jsdom lacks the layout/observation APIs the canvas hooks touch, and the
  // board mounts them before it draws a phase row.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.IntersectionObserver ??= class {
    root = null
    rootMargin = ''
    thresholds = []
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  } as unknown as typeof window.IntersectionObserver
})

afterEach(cleanup)

/** The application's own provider tree, as `App` nests it. */
function Board({ children }: { children: ReactNode }) {
  return (
    <DeploymentConfigProvider config={null}>
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false, gcTime: 0 } },
          })
        }
      >
        <ActiveServiceProvider>
          <EntityExamplesProvider>
            <TouchpointRegistryProvider>
              <EditorProvider>
                <ViewStateProvider>
                  <PathSelectionProvider>
                    <TooltipProvider delay={200}>
                      <EntityDetailProvider>{children}</EntityDetailProvider>
                    </TooltipProvider>
                  </PathSelectionProvider>
                </ViewStateProvider>
              </EditorProvider>
            </TouchpointRegistryProvider>
          </EntityExamplesProvider>
        </ActiveServiceProvider>
      </QueryClientProvider>
    </DeploymentConfigProvider>
  )
}

describe('overview flow-arrow anchor', () => {
  it('is the first main phase of the nav it is handed', () => {
    expect(isOverviewFlowArrowAnchorPhase(LOADED_NAV[0]!, LOADED_NAV)).toBe(
      true,
    )
    expect(isOverviewFlowArrowAnchorPhase(LOADED_NAV[1]!, LOADED_NAV)).toBe(
      false,
    )
  })

  it('cannot be asked without a nav', () => {
    // This used to be the defect: the helper defaulted to the sample nav, so
    // a call site that forgot to pass the loaded one silently got answers
    // about a board nobody was looking at — `LOADED_NAV[0]` false and
    // `LOADED_NAV[1]` true, both backwards. The default is gone, so that call
    // no longer compiles and the wrong answer has nowhere to come from.
    //
    // What is left to assert is that the sample is just another nav: handed
    // it, the helper answers about IT, with no special standing.
    const sampleFirst = getMainSlides(SAMPLE_NAV)[0]!
    expect(isOverviewFlowArrowAnchorPhase(sampleFirst, SAMPLE_NAV)).toBe(true)
    expect(isOverviewFlowArrowAnchorPhase(sampleFirst, LOADED_NAV)).toBe(false)
  })

  it('is asked about the phases the overview loaded, not the fallback', async () => {
    // The behavioural half, and the only one that can observe the defect the
    // helper's missing default used to hide: the board is handed a nav whose
    // first phase is NOT the fallback's, and the anchor has to land on the
    // phase the reader is looking at. Resolve against the sample instead and
    // the attribute appears on the second row, over a column drawn from the
    // first.
    render(
      <Board>
        <ServiceOverviewView />
      </Board>,
    )

    const anchored = async () =>
      await waitFor(() => {
        const row = document.querySelector('[data-flow-arrow-anchor]')
        expect(row).not.toBeNull()
        return row!
      })

    expect((await anchored()).getAttribute('data-phase-id')).toBe(
      LOADED_NAV[0]!.id,
    )
    // And the fallback's first phase, which the loaded nav also carries, is
    // not it — the assertion that fails if the call reaches for SAMPLE_NAV.
    expect(
      document.querySelector(
        `[data-phase-id="${fallbackFirstPhaseId}"][data-flow-arrow-anchor]`,
      ),
    ).toBeNull()
  })
})
