// @vitest-environment jsdom
/**
 * The why-line on a dependency row: shown to a reader who asks for it, and
 * never taken away from one who cannot ask.
 *
 * A dependency row says what it points at — lane, step, and the edge's own
 * name. `linkNote` says WHY the edge exists. Read one at a time it earns its
 * place; rendered statically down a list of eight it doubles the height of
 * every row that has one, and the list's shape starts depending on how
 * talkative its author was.
 *
 * So it is revealed, not removed — and the failure mode of "reveal on hover"
 * is the reason there is a test rather than a class. Three readers have no
 * hover: a keyboard, a touch screen, and a screen reader. Each is pinned
 * below, because each is a separate mechanism and any one of them can be lost
 * to a tidy-up that keeps the other two working.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CellDependencySections } from '@/components/blueprint/CellDependencySections'
import type { BlueprintCellConnection } from '@/lib/blueprintCellConnections'

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
  linkNote: 'A zero-config run has content only because the sample module is generated.',
  isTech: false,
  techItems: [],
  contentPreview: 'Generates the sample module into the bundle',
  ...patch,
})

afterEach(cleanup)

const notes = () => screen.queryAllByText(/zero-config run has content/)

function draw(patch: Partial<BlueprintCellConnection> = {}) {
  render(
    <CellDependencySections
      connections={{ incoming: [connection(patch)], outgoing: [] }}
      otherTech={[]}
      onCellSelect={() => {}}
      onTechSelect={() => {}}
    />,
  )
}

describe('a dependency row s why-line', () => {
  it('is in the document, so a screen reader reads it at rest', () => {
    draw()
    // Not `display: none`, not conditionally mounted on a hover state — both
    // would take the sentence away from the reader who cannot hover at all.
    expect(notes()).not.toHaveLength(0)
  })

  it('is transparent at rest and opaque under hover or focus', () => {
    draw()
    for (const note of notes()) {
      expect(note.className).toContain('opacity-0')
      expect(note.className).toContain('group-hover:opacity-100')
      // Focus, not just hover: the keyboard reaches the row and must reach
      // the sentence with it.
      expect(note.className).toContain('group-focus-within:opacity-100')
    }
  })

  it('stays visible where the pointer is coarse', () => {
    // A touch screen has no hover at all. The same rule NavRowAction states:
    // an affordance that only exists under a mouse is not an affordance.
    draw()
    for (const note of notes()) {
      expect(note.className).toContain('[@media(pointer:coarse)]:opacity-100')
    }
  })

  it('leaves the row s own words alone', () => {
    // What the row points at is not progressive disclosure — it is the row.
    draw({ linkName: 'Email' })
    for (const text of [/Scripts/, /Email/, /Generates the sample module/]) {
      for (const node of screen.getAllByText(text)) {
        expect(node.className).not.toContain('opacity-0')
      }
    }
  })

  it('draws nothing when the edge has no note', () => {
    draw({ linkNote: null })
    expect(notes()).toHaveLength(0)
  })
})
