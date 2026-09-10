// @vitest-environment jsdom
/**
 * The top-strip workspace name IS the service switcher.
 *
 * Two services make it a dropdown — a chevron over a menu of the roster,
 * picking one makes it active (`switchService`) and lands on its base view
 * (`onActivate`). One service (the 80% case) is the switcher OFF: the same
 * element as before the feature — a plain workspace tab, no chevron, no menu,
 * whose click enters the base blueprint view. Asserted through what a reader
 * sees and does, not through classes.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceServiceSwitcher } from '@/components/editor/WorkspaceServiceSwitcher'
import type { ActiveService } from '@/contexts/ActiveServiceContext'

const state = vi.hoisted(() => ({
  services: [] as ActiveService[],
  activeSlug: null as string | null,
  switchService: vi.fn<(slug: string) => void>(),
}))

// The name is the deployment's, resolved through the config seam. What the
// switcher does with it is the same whatever it says, so it is pinned here
// rather than resolved — this file is about the two states, not the seam.
vi.mock('@/contexts/DeploymentConfigContext', () => ({
  useWorkspaceTitle: () => 'Sample Workspace',
}))

vi.mock('@/contexts/ActiveServiceContext', () => ({
  useActiveService: () => ({
    service:
      state.services.find((svc) => svc.slug === state.activeSlug) ??
      state.services[0] ??
      null,
    services: state.services,
    slug: state.activeSlug,
    loading: false,
    switchService: state.switchService,
  }),
}))

const TWO: ActiveService[] = [
  { id: 'svc-a', name: 'Reporting a fault', slug: 'reporting-a-fault' },
  { id: 'svc-b', name: 'Support Desk', slug: 'support-desk' },
]

const chevron = () => document.querySelector('[data-workspace-switcher]')
const trigger = () => screen.getByRole('tab', { name: 'Sample Workspace' })

beforeEach(() => {
  state.services = []
  state.activeSlug = null
  state.switchService = vi.fn()
})

afterEach(cleanup)

describe('with one service, the switcher is off', () => {
  beforeEach(() => {
    state.services = [TWO[0]]
    state.activeSlug = 'reporting-a-fault'
  })

  it('renders the plain workspace tab — no chevron trigger', () => {
    render(
      <WorkspaceServiceSwitcher active tabIndex={0} onActivate={() => {}} />,
    )
    expect(trigger()).toBeDefined()
    expect(chevron()).toBeNull()
  })

  it('opens no menu on click — it enters the base view instead', () => {
    const onActivate = vi.fn()
    render(
      <WorkspaceServiceSwitcher active tabIndex={0} onActivate={onActivate} />,
    )
    fireEvent.click(trigger())
    // No switcher menu: its "Services" header never mounts.
    expect(screen.queryByText('Services')).toBeNull()
    expect(onActivate).toHaveBeenCalledTimes(1)
    expect(state.switchService).not.toHaveBeenCalled()
  })
})

describe('with no service, it is still the plain tab', () => {
  it('renders the workspace tab with no chevron', () => {
    render(
      <WorkspaceServiceSwitcher active tabIndex={0} onActivate={() => {}} />,
    )
    expect(trigger()).toBeDefined()
    expect(chevron()).toBeNull()
  })
})

describe('with two services, the name is a switcher', () => {
  beforeEach(() => {
    state.services = TWO
    state.activeSlug = 'reporting-a-fault'
  })

  it('becomes a dropdown trigger — a chevron the reader can open', () => {
    render(
      <WorkspaceServiceSwitcher active tabIndex={0} onActivate={() => {}} />,
    )
    expect(chevron()).not.toBeNull()
  })

  it('lists the whole roster when opened', () => {
    render(
      <WorkspaceServiceSwitcher active tabIndex={0} onActivate={() => {}} />,
    )
    fireEvent.click(trigger())
    expect(screen.getByText('Services')).toBeDefined()
    expect(screen.getByRole('button', { name: /Reporting a fault/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /Support Desk/ })).toBeDefined()
  })

  it('switches to the picked service and enters its board', () => {
    const onActivate = vi.fn()
    render(
      <WorkspaceServiceSwitcher active tabIndex={0} onActivate={onActivate} />,
    )
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('button', { name: /Support Desk/ }))

    expect(state.switchService).toHaveBeenCalledWith('support-desk')
    expect(onActivate).toHaveBeenCalledTimes(1)
  })
})
