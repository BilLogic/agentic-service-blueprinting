// @vitest-environment jsdom
/**
 * The why-line on a dependency row: shown to the reader who asks for it, kept
 * for the reader who cannot ask, and no longer charged to the eight rows
 * nobody is reading it on.
 *
 * A dependency row says what it points at — the lane and the step. `linkNote`
 * says WHY the edge exists. Read one at a time it earns its place; drawn down
 * a list of eight it doubles the height of every row that has one, and the
 * list's shape starts depending on how talkative its author was. Opacity did
 * not fix that: an invisible line is still a line.
 *
 * So the sentence reads from a tooltip — and the failure mode of "put it in a
 * tooltip" is the reason there is a test rather than a class. A tooltip is not
 * an accessible name, it is not read in place of one, and this Base UI
 * version's trigger opens on a mouse-like pointer only. Three readers have no
 * mouse: a keyboard, a touch screen, and a screen reader. Each is pinned
 * below, because each is a separate mechanism and any one of them can be lost
 * to a tidy-up that keeps the other two working.
 *
 * The row's own words are pinned from the other side too. `linkName` — the
 * edge's `name` column, specified as a badge and only ever written with
 * sentences — is not drawn here any more, and a row that carries one must say
 * nothing about it.
 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { CellDependencySections } from '@/components/blueprint/CellDependencySections'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { BlueprintCellConnection } from '@/lib/blueprintCellConnections'

const NOTE =
  'A zero-config run has content only because the sample module is generated.'

const connection = (patch: Partial<BlueprintCellConnection> = {}): BlueprintCellConnection => ({
  dependencyId: 'dep-1',
  cellId: 'cell-1',
  laneName: 'Scripts',
  laneRowPosition: 2,
  stepName: 'Generate',
  stepIndex: 3,
  kind: 'connection',
  linkKind: 'enables',
  linkName: null,
  linkNote: NOTE,
  isTech: false,
  techItems: [],
  contentPreview: 'Generates the sample module into the bundle',
  ...patch,
})

afterEach(cleanup)

/**
 * The app mounts one provider at 200ms in `App.tsx`; this one says 0 so the
 * open is a tick rather than a fifth of a second of `waitFor` budget. The
 * delay is the only thing a provider decides — with or without it, the same
 * trigger opens on the same two interactions.
 */
function draw(patch: Partial<BlueprintCellConnection> = {}) {
  render(
    <TooltipProvider delay={0}>
      <CellDependencySections
        connections={{ incoming: [connection(patch)], outgoing: [] }}
        otherTech={[]}
        onCellSelect={() => {}}
        onTechSelect={() => {}}
      />
    </TooltipProvider>,
  )
}

/** The row itself: one button, named for the cell it points at. */
const row = () => screen.getByRole('button', { name: /Scripts/ })

/** The sentence as it sits in the row — the copy no interaction can take away. */
const noteInRow = () => within(row()).queryByText(NOTE)

/** Popups, wherever the portal put them. */
const popups = () => [
  ...document.querySelectorAll('[data-slot="tooltip-content"]'),
]

const popupSaying = (text: string) =>
  popups().find((node) => node.textContent?.includes(text)) ?? null

/**
 * Hover, as Base UI actually learns it — the sequence `definitionCard.test.tsx`
 * worked out. Its hover interaction is `mouseOnly` and decides from a pointer
 * type recorded on React's `onPointerEnter`, which React synthesises from
 * `pointerover`; a `mouseEnter` alone leaves the type unset and nothing opens.
 * jsdom has no `PointerEvent`, so the first event is a `MouseEvent` with the
 * property attached.
 */
function hover(element: Element) {
  const pointerOver = new MouseEvent('pointerover', {
    bubbles: true,
    cancelable: true,
  })
  Object.defineProperty(pointerOver, 'pointerType', { value: 'mouse' })
  element.dispatchEvent(pointerOver)
  fireEvent.mouseEnter(element)
  fireEvent.mouseMove(element)
}

/** Room for the open, which is a state update and a portal rather than a paint. */
const OPEN_BUDGET = { timeout: 3000 }

describe('a dependency row s why-line', () => {
  it('is in the document at rest, so a screen reader reads it with the row', () => {
    draw()
    // Not `display: none`, not mounted on a hover state, and not left to the
    // popup — this Base UI tooltip wires no `aria-describedby` back to the
    // trigger, so the popup is a picture and the DOM copy is the only text a
    // screen reader will ever be handed.
    expect(noteInRow()).not.toBeNull()
    expect(popups()).toHaveLength(0)
  })

  it('costs the row no line where the pointer is fine', () => {
    draw()
    // The whole point of the move: hidden from layout, not merely transparent
    // in it. Eight rows with a note draw eight lines, not sixteen.
    expect(noteInRow()!.className).toContain('[@media(pointer:fine)]:sr-only')
  })

  it('stays printed where the pointer is not fine', () => {
    // A touch screen cannot hover, and Base UI's trigger would refuse to open
    // for it in any case. So the hiding is conditioned on a fine pointer
    // rather than applied outright — which also leaves the line printed on a
    // device reporting no pointer at all.
    draw()
    const classes = noteInRow()!.className.split(' ')
    expect(classes).not.toContain('sr-only')
    expect(classes).not.toContain('hidden')
  })

  it('opens under a pointer that comes to rest on the row', async () => {
    draw()
    hover(row())
    await waitFor(
      () => expect(popupSaying(NOTE)).not.toBeNull(),
      OPEN_BUDGET,
    )
  })

  it('opens on keyboard focus, not on hover alone', async () => {
    // The reader who tabs to the row never hovers anything. A tooltip that
    // only answers a mouse would hand this reader the row and keep the reason.
    draw()
    row().focus()
    await waitFor(
      () => expect(popupSaying(NOTE)).not.toBeNull(),
      OPEN_BUDGET,
    )
  })

  it('leaves the row s own words alone', () => {
    // What the row points at is not progressive disclosure — it is the row.
    draw()
    for (const text of [/Scripts/, /Generates the sample module/]) {
      for (const node of screen.getAllByText(text)) {
        expect(node.className).not.toContain('sr-only')
      }
    }
  })

  it('draws nothing, and opens nothing, when the edge has no note', async () => {
    draw({ linkNote: null })
    expect(noteInRow()).toBeNull()
    hover(row())
    row().focus()
    await waitFor(() => expect(document.activeElement).toBe(row()))
    expect(popups()).toHaveLength(0)
  })
})

describe('a dependency row s name', () => {
  it('is not drawn', () => {
    // `cell_dependencies.name` was specified as the word on the arrow and was
    // only ever written with sentences about why the edge exists — which is
    // what the note is for. The badge is gone rather than left to disagree
    // with the note beside it.
    draw({ linkName: 'Email' })
    expect(screen.queryByText('Email')).toBeNull()
  })

  it('does not reach the row s accessible name either', () => {
    draw({ linkName: 'Email' })
    expect(row().textContent).not.toContain('Email')
  })
})
