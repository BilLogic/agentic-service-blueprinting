// @vitest-environment jsdom
/**
 * The header six panels wear, and the crumb the cell's trail needed.
 *
 * The cell panel drew its own trail for as long as it drew its own header,
 * and the two loops had already drifted — one truncated its ancestors without
 * saying so on hover. One loop is why these cases are worth writing down: a
 * crumb either folds to an ellipsis or it does not, and the last crumb is the
 * thing itself either way.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PanelDrawerShell, PanelHeader } from '@/components/blueprint/panelShell'

beforeEach(() => {
  // jsdom has no `matchMedia`; the desktop posture is all this file needs.
  window.matchMedia = ((query: string) => ({
    media: query,
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
})

afterEach(cleanup)

function mount(header: React.ReactNode) {
  return render(
    <PanelDrawerShell open onCloseRequest={() => {}} onClosed={() => {}}>
      {header}
    </PanelDrawerShell>,
  )
}

describe('the panel header', () => {
  it('reads a collapsed crumb out while showing only the ellipsis', async () => {
    mount(
      <PanelHeader
        crumbs={[
          'Onboarding',
          { label: 'Happy path', collapsed: true },
          'Step 2',
        ]}
        title="Cell details"
        description="Details for the selected blueprint cell"
        closeLabel="Close cell details"
        onClose={() => {}}
      />,
    )

    // The name is in the trail for a screen reader and on hover, and the
    // visible crumb is the ⋯ — which is the whole point of collapsing it.
    const collapsed = await screen.findByText('Happy path')
    expect(collapsed.className).toContain('sr-only')
    expect(collapsed.parentElement?.getAttribute('title')).toBe('Happy path')
    expect(screen.getByText('Onboarding').textContent).toBe('Onboarding')
  })

  it('drops an empty crumb and leaves the last one the page', async () => {
    mount(
      <PanelHeader
        crumbs={['', 'Onboarding', '   ', 'Step 2']}
        title="Cell details"
        description="Details for the selected blueprint cell"
        closeLabel="Close cell details"
        onClose={() => {}}
      />,
    )

    const list = await screen.findByRole('list')
    expect(
      [...list.querySelectorAll('li')].filter(
        (item) => item.getAttribute('aria-hidden') !== 'true',
      ),
    ).toHaveLength(2)
    expect(screen.getByText('Step 2').getAttribute('aria-current')).toBe('page')
  })

  it('draws no trail when every crumb is empty', async () => {
    mount(
      <PanelHeader
        crumbs={['', '   ']}
        title="Service properties"
        description="What this service is, and how it is funded"
        closeLabel="Close service properties"
        onClose={() => {}}
      />,
    )

    await screen.findByLabelText('Close service properties')
    // A landmark a reader lands on to be told nothing is worse than no
    // landmark: the service panel has no ancestors and reserves no row.
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('keeps the action row for a panel that has one, empty or not', async () => {
    // The widen toggle is desktop-only, so the cell panel passes `null` on a
    // phone — and the row it shares with ✕ is the panel's, not the toggle's.
    const withRow = mount(
      <PanelHeader
        crumbs={['Step 2']}
        title="Cell details"
        description="Details for the selected blueprint cell"
        actions={null}
        closeLabel="Close cell details"
        onClose={() => {}}
      />,
    )
    const close = await screen.findByLabelText('Close cell details')
    expect(close.parentElement?.getAttribute('data-slot')).toBeNull()
    withRow.unmount()
    cleanup()

    mount(
      <PanelHeader
        crumbs={['Onboarding']}
        title="Lane properties"
        description="Owner, KPIs and tools for the selected lane"
        closeLabel="Close lane properties"
        onClose={() => {}}
      />,
    )
    const bare = await screen.findByLabelText('Close lane properties')
    expect(bare.parentElement?.getAttribute('data-slot')).toBe('drawer-header')
  })

  it('announces what its ✕ closes, in the words the surface gave it', async () => {
    const onClose = vi.fn()
    mount(
      <PanelHeader
        title="New cell"
        titleShown
        description="Onboarding · Happy path · 2. Sign in"
        descriptionShown
        closeLabel="Discard this new cell"
        closeAriaLabel="Discard new cell"
        onClose={onClose}
      />,
    )

    const close = await screen.findByLabelText('Discard new cell')
    close.click()
    expect(onClose).toHaveBeenCalledTimes(1)
    // No crumbs passed, no trail drawn — a draft has a placement line instead.
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.getByText('New cell').className).toContain('font-semibold')
  })
})
