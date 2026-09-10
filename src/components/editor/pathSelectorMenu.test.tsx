// @vitest-environment jsdom
/**
 * The path control waits for the shell it sits in.
 *
 * The bug: `PathSelectorMenu` painted the moment its options landed, while
 * the sidebar and the identity bar beside it were still skeletons. The control
 * has no loading of its own — its options arrive with the board — so the
 * only beat it can keep is the shell's, read from the boot signal
 * `EntityHeader` already holds behind.
 *
 * Asserted through what a reader can see: the button is absent while the
 * shell boots and present once it lifts. Which placeholder stood in for it
 * is a `data-` seam, not a class.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { PathOption } from '@/components/blueprint/PathMultiSelect'
import { PathSelectorMenu } from '@/components/editor/PathSelectorMenu'
import { PathSelectionProvider } from '@/contexts/PathSelectionContext'
import { setShellBooting } from '@/contexts/shellBootStore'
import { ENTITY_KIND_DEFINITIONS } from '@/lib/panelTerms'

const HAPPY: PathOption = {
  id: 'happy:Happy Path',
  name: 'Happy Path',
  summary: null,
  kind: 'happy',
}

const control = () => screen.queryByRole('button', { name: /^Paths shown/ })
const placeholder = () =>
  document.querySelector('[data-path-selector-skeleton]')

/**
 * Hover, as Base UI actually learns it — pointerover carrying `pointerType`,
 * then mouseenter and mousemove. Same sequence `definitionCard.test.tsx` uses.
 */
function hover(element: Element) {
  const trigger =
    element.closest('[tabindex], [role="button"], button') ?? element
  const pointerOver = new MouseEvent('pointerover', {
    bubbles: true,
    cancelable: true,
  })
  Object.defineProperty(pointerOver, 'pointerType', { value: 'mouse' })
  trigger.dispatchEvent(pointerOver)
  fireEvent.mouseEnter(trigger)
  fireEvent.mouseMove(trigger)
}

function mount(options: PathOption[]) {
  return render(
    <PathSelectionProvider>
      <PathSelectorMenu options={options} />
    </PathSelectionProvider>,
  )
}

afterEach(() => {
  cleanup()
  setShellBooting(false)
})

describe('the path control, against the shell boot signal', () => {
  it('holds while the shell boots, and arrives when it lifts', () => {
    setShellBooting(true)
    mount([HAPPY])
    expect(control()).toBeNull()
    expect(placeholder()).not.toBeNull()

    act(() => setShellBooting(false))
    expect(control()).not.toBeNull()
    expect(placeholder()).toBeNull()
  })

  it('renders straight away when the shell is already up', () => {
    mount([HAPPY])
    expect(control()).not.toBeNull()
    expect(placeholder()).toBeNull()
  })

  it('leaves nothing behind when boot lifts on a board with no paths', () => {
    setShellBooting(true)
    const { container } = mount([])
    expect(placeholder()).not.toBeNull()

    act(() => setShellBooting(false))
    expect(control()).toBeNull()
    expect(placeholder()).toBeNull()
    expect(container.textContent).toBe('')
  })
})

describe('the path control teaches what a path is where you pick one', () => {
  it('heads the picker with the path definition, disclosed on hover', async () => {
    mount([HAPPY])
    // Open the selector — the definition lives where the reader picks a path.
    fireEvent.click(control()!)
    const heading = await screen.findByText('Path')
    hover(heading)
    // Verbatim from the one map that holds it, so a copy here cannot drift.
    expect(
      await screen.findByText(ENTITY_KIND_DEFINITIONS.path.definition),
    ).not.toBeNull()
  })
})
