// @vitest-environment jsdom
/**
 * The workspace state badges sit BESIDE THE WORKSPACE TAB, and this file is
 * what stops them drifting back to the right.
 *
 * They used to live under `ml-auto` at the far end of the strip, which put
 * every open tab between a state and the name that state qualifies. The
 * workspace is a permanent tab rather than a heading, so "beside the name" is
 * a position inside the tablist: the badge row is the tab's next sibling, and
 * the slice tabs start after it.
 *
 * Asserted as an ORDER over the tablist's own children rather than as a
 * presence somewhere on the row, because presence is what a layout change
 * cannot break. Moving the row back into the right cluster takes it out of
 * this container entirely, and every index below goes to -1.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TabStrip } from '@/components/editor/TabStrip'
import type { ActiveService } from '@/contexts/ActiveServiceContext'
import type { Slice } from '@/types/database'

const SLICE = { id: 'slice-a', title: 'Fault triage' } as Slice
const SERVICE: ActiveService = {
  id: 'svc-a',
  name: 'Reporting a fault',
  slug: 'reporting-a-fault',
}

/**
 * No database connected, so the sample-data badge is on its own in the row —
 * the one state every reader of the bundled template sees, and the state this
 * ticket's indicator is about.
 */
const supabase = vi.hoisted(() => ({
  configured: false,
  isDevAuthoring: false,
  isEditPreview: false,
}))

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    canWrite: false,
    // The tier override is a fourth state with its own test; off here.
    devSimulation: { on: false },
    ...supabase,
  }),
}))

vi.mock('@/contexts/viewStateStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/contexts/viewStateStore')>()),
  useViewState: () => ({
    tabs: [{ kind: 'slice' as const, sliceId: SLICE.id }],
    activeKey: null,
    activateTab: vi.fn(),
    closeTab: vi.fn(),
    pendingUrlState: null,
    resolvePending: vi.fn(),
    missingSliceId: null,
    dismissMissingSlice: vi.fn(),
  }),
}))

vi.mock('@/hooks/useSlices', () => ({
  useSlices: () => ({ status: 'ready', data: [SLICE] }),
}))

vi.mock('@/contexts/activeService', () => ({
  useActiveServiceId: () => SERVICE.id,
}))

vi.mock('@/contexts/DeploymentConfigContext', () => ({
  useWorkspaceTitle: () => 'Sample Workspace',
}))

vi.mock('@/contexts/ActiveServiceContext', () => ({
  useActiveService: () => ({
    service: SERVICE,
    services: [SERVICE],
    slug: SERVICE.slug,
    loading: false,
    switchService: vi.fn(),
  }),
}))

// Jump to… is the right cluster's business and owns a command dialog; this
// file is about where the badges sit, so it stands in as a marker.
vi.mock('@/components/editor/JumpToSearch', () => ({
  JumpToSearch: () => <div data-jump-to-search="" />,
}))

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

beforeEach(() => {
  supabase.configured = false
})

afterEach(cleanup)

function renderStrip() {
  render(
    <TooltipProvider>
      <TabStrip isCover={false} onHome={() => {}} onBase={() => {}} />
    </TooltipProvider>,
  )
  const tablist = screen.getByRole('tablist', { name: 'Open views' })
  const row = tablist.querySelector('[data-workspace-badges]')
  if (row === null) throw new Error('no badge row inside the tablist')
  const children = Array.from(tablist.children)
  return {
    tablist,
    row,
    // Which of the tablist's own children holds `el` — -1 if the element
    // hangs somewhere else in the document, which is the regression.
    slotOf: (el: Element) =>
      children.findIndex((child) => child === el || child.contains(el)),
  }
}

test('the badge row is the workspace tab\'s next sibling, ahead of the slice tabs', () => {
  const { tablist, row, slotOf } = renderStrip()
  const workspace = within(tablist).getByRole('tab', {
    name: 'Sample Workspace',
  })
  const slice = within(tablist).getByRole('tab', { name: '◇ Fault triage' })

  expect(slotOf(workspace)).toBe(0)
  expect(slotOf(row)).toBe(1)
  expect(slotOf(slice)).toBe(2)
})

test('the badges are in the tablist, not the strip\'s right cluster', () => {
  const { tablist, row } = renderStrip()
  const jump = document.querySelector('[data-jump-to-search]')

  expect(row.closest('[role="tablist"]')).toBe(tablist)
  expect(jump?.closest('[role="tablist"]')).toBeNull()
})

test('the sample-data indicator travels with the row it belongs to', () => {
  const { row } = renderStrip()
  expect(within(row as HTMLElement).getByText('sample data')).toBeTruthy()
})
