// @vitest-environment jsdom
/**
 * How the service identity bar answers the sidebar.
 *
 * The collapse hand-off stands: at COLLAPSED width the bar renders nothing and
 * gives its identity to the floating navbar instead, so there is one chrome
 * lane at any width — the failure this file was first written against was a
 * service title simply lost when the sidebar collapsed, while
 * `SlideStickyHeader` and `SliceHeaderBand` had been handing theirs over all
 * along.
 *
 * The overlay posture is GONE (#305). The sidebar is in flow at every width;
 * it no longer draws over the canvas on a narrow viewport, so the bar no
 * longer surrenders a left margin to it. What this file now pins is the
 * inverse of the old inset claim: the bar sits flush left at every width, and
 * nothing the store can publish makes it inset. The floating navbar's expand
 * toggle stays at the left end, where the sidebar returns from.
 *
 * The seam is the bar rendered beside the navbar that answers it, with the
 * module store in between driven the way `EditorShell` drives it — the two
 * components are the two ends of the hand-off, and asserting on both is what
 * makes "the name arrived" an observation rather than a claim about a hook.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FloatingSidebarNavbar } from '@/components/editor/EditorChrome'
import { ServiceOverviewHeader } from '@/components/editor/ServiceOverviewHeader'
import { TooltipProvider } from '@/components/ui/tooltip'
import { setSidebarCollapsedState } from '@/contexts/sidebarCollapsedContext'
import { SlideStickyHeader } from '@/components/editor/SlideStickyHeader'
import { EntityDetailProvider } from '@/contexts/EntityDetailContext'
import { PathSelectionProvider } from '@/contexts/PathSelectionContext'
import type { NavItem } from '@/types/nav'
import { ORG_NAME } from '@/config'
import { coverContent } from '@/content/coverContent'
import { QUERY_DEFAULTS } from '@/lib/queryClient'

const supabase = vi.hoisted(() => ({ client: null as unknown, calls: 0 }))

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: supabase.client,
    configured: true,
    session: null,
    isLoading: false,
    canWrite: false,
    isDevAuthoring: false,
    isEditPreview: false,
    canAgent: false,
  }),
}))

// A fixture service, deliberately not any installation's own: the file is
// shared, and a real name in it reads as data rather than as a stand-in.
const SERVICE_NAME = 'Rooftop Retrofit'
/**
 * The wordmark the navbar prints, resolved the way the navbar resolves it —
 * not the string this installation happens to use. A literal here is one
 * installation's name written into a shared file, and it is wrong the moment
 * the file is read anywhere else.
 */
const WORDMARK = coverContent.title ?? ORG_NAME
const SERVICE_SUMMARY = 'Rooftop solar, end to end.'

type Result = { data: unknown; error: { message: string } | null }

/** Just enough PostgREST for `useServiceSpec` — the shape #237's test pins. */
function fakeSupabase() {
  const rows: Record<string, unknown[]> = {
    services: [
      {
        id: 'svc-1',
        name: SERVICE_NAME,
        summary: SERVICE_SUMMARY,
        business_models: null,
      },
    ],
    phases: [{ id: 'phase-1', scenarios: [{ id: 'scenario-1' }] }],
  }

  return {
    from(table: string) {
      supabase.calls += 1
      const result: Result = { data: rows[table] ?? [], error: null }
      const api: Record<string, unknown> = {
        maybeSingle: () =>
          Promise.resolve({
            data: (result.data as unknown[])[0] ?? null,
            error: null,
          }),
        then: (resolve: (value: Result) => unknown) =>
          Promise.resolve(result).then(resolve),
      }
      for (const verb of ['select', 'order', 'limit', 'eq', 'abortSignal']) {
        api[verb] = () => api
      }
      return api
    },
  }
}

const bar = () =>
  document.querySelector('[data-editor-navbar]') as HTMLElement | null
const floatingNavbar = () =>
  document.querySelector('[data-editor-sidebar-navbar]') as HTMLElement | null
const skeleton = () =>
  document.querySelector('[data-entity-header-skeleton]') as HTMLElement | null

/**
 * The bar and the floating navbar together, because the hand-off has two
 * ends. In the app the floating navbar only mounts while collapsed; here it
 * is always mounted, so one render can be read at both widths.
 */
function mountShell(client: QueryClient) {
  /*
    Inside the entity panel's provider, which `EditorShell` mounts above every
    tree in the app. The header's title is an affordance that reads the panel
    through `useEntityDetail`, and that hook throws outside the provider rather
    than returning an inert value — so a surface rendered on its own brings it.
  */
  return render(
    <EntityDetailProvider>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <ServiceOverviewHeader />
          <FloatingSidebarNavbar onExpand={() => {}} />
        </TooltipProvider>
      </QueryClientProvider>
    </EntityDetailProvider>,
  )
}

/** What `EditorShell` publishes, from a test's hands. */
function sidebar(next: { collapsed?: boolean }) {
  act(() => {
    setSidebarCollapsedState({ collapsed: next.collapsed ?? false })
  })
}

async function mountWithService() {
  supabase.client = fakeSupabase()
  supabase.calls = 0
  const client = new QueryClient({
    defaultOptions: { queries: QUERY_DEFAULTS },
  })
  mountShell(client)
  await screen.findByText(SERVICE_NAME)
  return client
}

afterEach(() => {
  cleanup()
  // The store is a module singleton — leaving it collapsed would hand the
  // next test a bar that renders nothing for a reason it never set.
  setSidebarCollapsedState({ collapsed: false })
})

describe('the service bar, collapsed', () => {
  it('renders nothing at all — one chrome lane at any width', async () => {
    await mountWithService()
    expect(bar()).not.toBeNull()

    sidebar({ collapsed: true })
    expect(bar()).toBeNull()
  })

  it('hands the service name to the floating navbar', async () => {
    await mountWithService()
    expect(floatingNavbar()?.textContent).not.toContain(SERVICE_NAME)

    sidebar({ collapsed: true })
    expect(floatingNavbar()?.textContent).toContain(SERVICE_NAME)
  })

  it('hands over the name and NOT the summary — the strip is one line', async () => {
    await mountWithService()
    sidebar({ collapsed: true })

    expect(floatingNavbar()?.textContent).toContain(SERVICE_NAME)
    expect(floatingNavbar()?.textContent).not.toContain(SERVICE_SUMMARY)
  })

  it('expanding restores the bar already filled, with no second skeleton', async () => {
    await mountWithService()
    const reads = supabase.calls

    sidebar({ collapsed: true })
    sidebar({ collapsed: false })

    // Synchronous: this is the first painted frame after expanding. The query
    // stayed subscribed across the collapse, so there is nothing to refetch
    // and nothing to skeleton.
    expect(bar()).not.toBeNull()
    expect(screen.getByText(SERVICE_NAME)).toBeDefined()
    expect(skeleton()).toBeNull()
    expect(supabase.calls).toBe(reads)
  })

  it('stops speaking for the floating navbar once it is expanded', async () => {
    await mountWithService()
    sidebar({ collapsed: true })
    sidebar({ collapsed: false })

    expect(floatingNavbar()?.textContent).not.toContain(SERVICE_NAME)
  })
})

describe('the service bar takes no inset, at any width', () => {
  it('sits flush left — the sidebar is in flow and never overlays it', async () => {
    await mountWithService()
    expect(bar()?.style.marginLeft).toBe('')
  })

  it('stays flush left whatever the store publishes about the collapse', async () => {
    await mountWithService()
    // Expanded, then collapsed-and-back: no width the sidebar takes moves
    // where this bar starts. The overlay posture that once did is gone.
    sidebar({ collapsed: false })
    expect(bar()?.style.marginLeft).toBe('')
    sidebar({ collapsed: true })
    sidebar({ collapsed: false })
    expect(bar()?.style.marginLeft).toBe('')
  })
})

describe('the floating navbar', () => {
  it('carries its expand toggle at the left end, ahead of everything', async () => {
    await mountWithService()
    sidebar({ collapsed: true })

    const toggle = screen.getByLabelText('Expand sidebar')
    for (const after of [
      screen.getByText(WORDMARK),
      screen.getByText(SERVICE_NAME),
    ]) {
      // The sidebar returns at the left edge, so the control that summons it
      // belongs on that side rather than as far from it as the strip allows.
      expect(
        toggle.compareDocumentPosition(after) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    }
  })
})

/*
  The phase and scenario bar takes no inset either, and needs saying separately
  because it is a different file that happens to sit in the same column. There
  is no overlay to answer to at any width; the only posture it still hides for
  is COLLAPSED, where the floating navbar carries its identity instead.
*/
const PHASE: NavItem = { id: 'phase-1', index: 0, label: 'Application' }
const SCENARIO: NavItem = {
  id: 'scenario-1',
  index: 1,
  label: 'Discovery',
  parentId: 'phase-1',
  summary: 'Potential tutors discover the service.',
}

function mountSlideBar(slide: NavItem) {
  return render(
    <EntityDetailProvider>
      <TooltipProvider>
        <PathSelectionProvider>
          <SlideStickyHeader
            slide={slide}
            slides={[PHASE, SCENARIO]}
            paths={[]}
            selectedPathIds={[]}
          />
        </PathSelectionProvider>
      </TooltipProvider>
    </EntityDetailProvider>,
  )
}

describe('the phase and scenario bar takes no inset, at any width', () => {
  it('sits flush left on a phase', () => {
    mountSlideBar(PHASE)
    expect(bar()?.style.marginLeft).toBe('')
  })

  it('sits flush left on a scenario, the same as a phase', () => {
    mountSlideBar(SCENARIO)
    expect(bar()?.style.marginLeft).toBe('')
  })

  it('still renders nothing at all when the sidebar is collapsed', () => {
    // Collapse hands this bar's identity to the floating navbar; an inset bar
    // drawn beside it would be the two-headers-at-once bug the hand-off
    // exists to prevent.
    mountSlideBar(PHASE)
    sidebar({ collapsed: true })

    expect(bar()).toBeNull()
  })
})
