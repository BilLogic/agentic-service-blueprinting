// @vitest-environment jsdom
/**
 * A row belongs to the service you are looking at.
 *
 * The evidence path was fixed first, and the sweep that followed found the
 * same shape in three write paths that still resolved `findFirstServiceId`
 * — the first row by
 * `created_at`, whatever the URL says. The sidebar drew the service the slug
 * names, and the slice or phase created from it landed on a different one.
 *
 * Each case runs over a REAL `lib/service`, because the claim is about which
 * id that module answers with; stubbing it out is exactly why these three
 * could sit wrong under a green suite. Two services, the second active, and
 * the row must be the second one's.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateSliceSheet } from '@/components/editor/CreateSliceSheet'
import { SlideModeSidebarNav } from '@/components/editor/SlideModeView'
import { StructureRowContextMenu } from '@/components/editor/StructureRowMenu'
import { setActiveServiceSlug } from '@/contexts/activeServiceStore'
import { __resetActiveServiceIdCache } from '@/lib/service'
import type { Database } from '@/types/database'

/** Two services, the second created later — so "first" is the wrong one. */
const SERVICES = [
  { id: 'svc-1', name: 'Rooftop Retrofit', slug: 'rooftop-retrofit' },
  { id: 'svc-2', name: 'Heat Pump Grants', slug: 'heat-pump-grants' },
]

/** A client stub that answers the `services` reads both resolvers make. */
const client = {
  from() {
    const api = {
      select: () => api,
      order: () => api,
      limit: () => api,
      then: (
        resolve: (value: { data: typeof SERVICES; error: null }) => unknown,
        reject?: (error: unknown) => unknown,
      ) => Promise.resolve({ data: SERVICES, error: null }).then(resolve, reject),
    }
    return api
  },
} as unknown as SupabaseClient<Database>

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client,
    configured: true,
    canWrite: true,
    isEditPreview: false,
  }),
}))

/*
 * The phase dialog is the seam for two of the three: both resolvers exist to
 * hand it the service a new phase is attached to, and it refuses to write
 * without one. Capturing the prop asks the question the defect is about —
 * which service — without driving the insert.
 */
const phaseDialogServiceIds: (string | null)[] = []
vi.mock('@/components/editor/CreatePhaseDialog', () => ({
  CreatePhaseDialog: ({ serviceId }: { serviceId: string | null }) => {
    phaseDialogServiceIds.push(serviceId)
    return null
  },
}))

/** The slice's write, captured the same way the evidence case captures its own. */
const createSlice = vi.fn<(client: unknown, input: { serviceId?: string }) => Promise<{ id: string }>>(
  async () => ({ id: 'slice-new' }),
)
vi.mock('@/lib/sliceMutations', () => ({
  createSlice: (client: unknown, input: { serviceId?: string }) =>
    createSlice(client, input),
}))

vi.mock('@/hooks/useSupabaseQuery', () => ({
  invalidateQueries: () => {},
  invalidateStructure: () => {},
}))

vi.mock('@/contexts/viewStateStore', () => ({
  useViewState: () => ({ openTab: () => {}, activeKey: null, activateTab: () => {} }),
}))

vi.mock('@/contexts/canvasModeContext', () => ({
  useCanvasModeValue: () => 'design',
}))

// Chrome around the subject. None of it decides which service a row lands on.
vi.mock('@/components/editor/SliceSlideComposer', () => ({
  SliceSlideComposer: () => null,
}))
vi.mock('@/components/editor/SlideNav', () => ({ SlideNav: () => null }))
vi.mock('@/components/editor/SlicesSidebarSection', () => ({
  SlicesSidebarSection: () => null,
}))
vi.mock('@/components/editor/CreateBlueprintDialog', () => ({
  CreateBlueprintDialog: () => null,
}))
vi.mock('@/components/editor/CreateVersionDialog', () => ({
  CreateVersionDialog: () => null,
}))
vi.mock('@/components/editor/DeleteStructureDialog', () => ({
  DeleteStructureDialog: () => null,
}))
vi.mock('@/components/ui/sidebar', () => ({
  SidebarContent: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))
vi.mock('@/hooks/useArchiveAvailable', () => ({
  useArchiveAvailable: () => true,
}))
vi.mock('@/hooks/useScenarioPaths', () => ({
  useScenarioPaths: () => ({ status: 'loading' }),
}))

vi.mock('@/contexts/EditorContext', () => ({
  useEditor: () => ({
    slides: [],
    selectPhase: () => {},
    selectScenario: () => {},
    selectedPhaseId: null,
    selectedScenarioId: null,
    focusNonce: 0,
    view: 'home',
    slidesLoading: false,
    slidesError: null,
    expandedPhaseIds: [],
    setPhaseExpanded: () => {},
  }),
}))

beforeEach(() => {
  phaseDialogServiceIds.length = 0
  createSlice.mockClear()
  __resetActiveServiceIdCache()
})

afterEach(() => {
  cleanup()
  setActiveServiceSlug(null)
  __resetActiveServiceIdCache()
})

/** Open the sheet on one cell, name the slice and create it. */
function createASlice(title: string) {
  const view = render(
    <CreateSliceSheet
      cellIds={['cell-1']}
      open
      onOpenChange={() => {}}
      onCreated={() => {}}
      trigger={<button type="button">New slice</button>}
    />,
  )
  fireEvent.click(view.getByRole('button', { name: 'Next' }))
  fireEvent.change(view.getByPlaceholderText('First-time customer journey'), {
    target: { value: title },
  })
  fireEvent.click(view.getByRole('button', { name: 'Create slice' }))
}

describe('the service a new slice belongs to', () => {
  it('is the one the URL names, not the first one created', async () => {
    setActiveServiceSlug('heat-pump-grants')
    createASlice('Grant application, end to end')
    await waitFor(() => expect(createSlice).toHaveBeenCalled())
    const input = createSlice.mock.calls[0]?.[1]
    expect(input?.serviceId).toBe('svc-2')
    expect(input?.serviceId).not.toBe('svc-1')
  })

  it('is the first one created at the bare root, where no service is named', async () => {
    createASlice('Fault report, end to end')
    await waitFor(() => expect(createSlice).toHaveBeenCalled())
    expect(createSlice.mock.calls[0]?.[1].serviceId).toBe('svc-1')
  })
})

describe("the service the sidebar's new phase belongs to", () => {
  it('is the one the URL names, not the first one created', async () => {
    setActiveServiceSlug('heat-pump-grants')
    render(<SlideModeSidebarNav panel="blueprints" />)
    await waitFor(() => expect(phaseDialogServiceIds).toContain('svc-2'))
    expect(phaseDialogServiceIds).not.toContain('svc-1')
  })

  it('is the first one created at the bare root, where no service is named', async () => {
    render(<SlideModeSidebarNav panel="blueprints" />)
    await waitFor(() => expect(phaseDialogServiceIds).toContain('svc-1'))
  })
})

describe("the service a row menu's sibling phase belongs to", () => {
  /** Right-click a phase row and pick New phase. */
  function openNewSiblingPhase() {
    const view = render(
      <StructureRowContextMenu kind="phase" id="phase-1" name="Discover">
        <div>Discover</div>
      </StructureRowContextMenu>,
    )
    fireEvent.contextMenu(view.getByText('Discover'))
    return view
  }

  it('is the one the URL names, not the first one created', async () => {
    setActiveServiceSlug('heat-pump-grants')
    const view = openNewSiblingPhase()
    fireEvent.click(await view.findByText('New phase'))
    await waitFor(() => expect(phaseDialogServiceIds).toContain('svc-2'))
    expect(phaseDialogServiceIds).not.toContain('svc-1')
  })

  it('is the first one created at the bare root, where no service is named', async () => {
    const view = openNewSiblingPhase()
    fireEvent.click(await view.findByText('New phase'))
    await waitFor(() => expect(phaseDialogServiceIds).toContain('svc-1'))
  })
})
