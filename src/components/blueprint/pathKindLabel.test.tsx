// @vitest-environment jsdom
/**
 * A path kind is called one word, and the same word, wherever it is shown.
 *
 * Four surfaces name a kind: the badge on an overview frame, the badge's
 * tooltip, the colour key's hover title, and the Kind picker in the new-path
 * dialog. They used to read from two label maps, so one kind was "Happy" on
 * the badge and "Happy path" in the picker beside it. This file mounts each
 * surface and reads what a person sees, so a second spelling fails here
 * whichever file it comes back through.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PathKindBadge } from '@/components/blueprint/PathKindBadge'
import { PathKindColorKey } from '@/components/blueprint/PathKindColorKey'
import { PATH_SUMMARY_PLACEHOLDER } from '@/components/blueprint/PathSummaryTooltip'
import { CreateVersionDialog } from '@/components/editor/CreateVersionDialog'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PATH_KINDS, type PathKind } from '@/lib/versionValidation'

vi.mock('@/contexts/SupabaseProvider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/contexts/SupabaseProvider')>()),
  useSupabase: () => ({ client: null }),
}))

afterEach(cleanup)

/** The badge's visible text, and the title its tooltip puts above the summary. */
async function badge(kind: PathKind) {
  const { container } = render(
    <TooltipProvider>
      <PathKindBadge pathKind={kind} />
    </TooltipProvider>,
  )
  const trigger = container.querySelector<HTMLElement>('[data-blueprint-fill]')
  if (!trigger) throw new Error('the badge did not render')
  const text = trigger.textContent ?? ''

  // The tooltip names the kind when the badge is too small to read, and a
  // badge in jsdom has no height, so hovering it always asks for the title.
  // A hover, not a focus: the badge is a span, and a span takes no focus.
  const pointerOver = new MouseEvent('pointerover', {
    bubbles: true,
    cancelable: true,
  })
  Object.defineProperty(pointerOver, 'pointerType', { value: 'mouse' })
  act(() => {
    trigger.dispatchEvent(pointerOver)
  })
  fireEvent.mouseEnter(trigger)
  fireEvent.mouseMove(trigger)
  const summary = await screen.findByText(
    PATH_SUMMARY_PLACEHOLDER,
    {},
    { timeout: 3000 },
  )
  const title = summary.parentElement?.firstElementChild?.textContent ?? ''

  cleanup()
  return { text, title }
}

function colourKeyTitle(kind: PathKind) {
  const { container } = render(<PathKindColorKey type={kind} />)
  const title = container.querySelector('[title]')?.getAttribute('title') ?? ''
  cleanup()
  return title
}

/** The Kind picker's buttons, in the order the dialog draws them. */
function pickerLabels() {
  render(
    <CreateVersionDialog
      scenarioId="scenario-1"
      scenarioName="Checkout"
      versions={[]}
      open
      onOpenChange={() => {}}
    />,
  )
  const group = screen.getByText('Kind').parentElement
  if (!group) throw new Error('the Kind picker did not render')
  const labels = within(group)
    .getAllByRole('button')
    .map((button) => button.textContent ?? '')
  cleanup()
  return labels
}

it('calls each kind by the same one word on every surface that names it', async () => {
  const picker = pickerLabels()
  expect(picker).toHaveLength(PATH_KINDS.length)

  for (const [index, kind] of PATH_KINDS.entries()) {
    const shown = await badge(kind)
    const words = new Set([
      shown.text,
      shown.title,
      colourKeyTitle(kind),
      picker[index],
    ])

    expect([...words], kind).toHaveLength(1)
    expect([...words][0], kind).toMatch(/^\S+$/)
  }
})
