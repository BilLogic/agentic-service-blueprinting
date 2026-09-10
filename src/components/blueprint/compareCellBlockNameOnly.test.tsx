// @vitest-environment jsdom
/**
 * The board draws a name-only placement dashed, and only on a board
 * that has rows to be name-only in.
 *
 * `blueprintTouchpointCell.test.tsx` already says that the cell honours a
 * `nameOnly` prop; until this ticket no production call site passed one, so
 * that promise reached nothing. These tests render the block the board
 * actually composes and read the DOM, because a rename that typechecks is not
 * evidence that anything is drawn differently.
 *
 * A board has one source: `cell_touchpoints` rows. A row with a `name` and no
 * `touchpoint_id` is a name-only placement and draws dashed; its neighbour,
 * joined to a registry entry, draws plainly.
 *
 * There was a second case here, for a board minted from a fallback fixture's
 * delimited `content` string. Those fixtures are gone — their content is rows
 * now — and so is the adapter that read them.
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CompareCellBlock } from '@/components/blueprint/CompareCellBlock'
import { getBlueprintLaneStyle } from '@/lib/blueprintTheme'
import { cellTouchpointsFromRows } from '@/lib/cellTouchpoints'
import type { BlueprintCell } from '@/types/blueprint'

afterEach(cleanup)

const laneStyle = getBlueprintLaneStyle(
  'Front Stage Tech',
  'frontstage',
  'frontstage_touchpoint',
)

function cell(over: Partial<BlueprintCell>): BlueprintCell {
  return {
    id: 'cell-1',
    lane_id: 'lane-1',
    step_id: 'step-1',
    content: '',
    frame: null,
    summary: null,
    ...over,
  }
}

/** Every touchpoint face the block drew, paired with whether it is dashed. */
function facesByName(container: HTMLElement): Record<string, boolean> {
  const faces = container.querySelectorAll('[data-blueprint-touchpoint]')
  return Object.fromEntries(
    Array.from(faces).map((face) => [
      face.getAttribute('data-blueprint-touchpoint')!,
      face.hasAttribute('data-name-only'),
    ]),
  )
}

describe('CompareCellBlock draws a name-only placement dashed', () => {
  it('dashes the placement the registry lacks on a database board', () => {
    // Two rows on one cell. The author typed "Handshake" into the grid and
    // placed the second touchpoint by name from the panel, which is the
    // ordinary way a name-only placement comes about.
    const touchpoints = cellTouchpointsFromRows([
      {
        id: 'ct-1',
        position: 1,
        touchpoint_id: 'tp-1',
        touchpoints: { name: 'Handshake' },
      },
      {
        id: 'ct-2',
        position: 2,
        touchpoint_id: null,
        name: 'Handshake Employer Profile',
        touchpoints: null,
      },
    ])

    const { container } = render(
      <CompareCellBlock
        cellId="cell-1"
        stepIndex={0}
        laneStyle={laneStyle}
        variant="touchpoints"
        slotCells={[cell({ content: 'Handshake', touchpoints })]}
      />,
    )

    expect(facesByName(container)).toEqual({
      Handshake: false,
      'Handshake Employer Profile': true,
    })
  })


  it('reads the block’s own placements when a slot cell has none', () => {
    // The stacked bands hand the block one cell and no `slotCells`, so the
    // names come from the content string and the placements from the
    // selection context the band built. A name-only placement is still dashed
    // there, which is the path the compare grid does not exercise.
    const { container } = render(
      <CompareCellBlock
        cellId="cell-1"
        stepIndex={0}
        laneStyle={laneStyle}
        variant="touchpoints"
        content="Handshake"
        selectionContext={{
          scenarioName: 'Warm-Up',
          laneName: 'Front Stage Tech',
          stepId: 'step-1',
          stepName: 'Step 1',
          stepIndex: 0,
          cellId: 'cell-1',
          cellContent: 'Handshake',
          cellTouchpoints: [
            {
              id: 'ct-9',
              touchpointId: null,
              name: 'Handshake',
              kind: null,
              summary: null,
              role: null,
            },
          ],
          pathId: 'path-1',
          pathName: 'Happy',
          pathKind: 'happy',
        }}
      />,
    )

    expect(facesByName(container)).toEqual({ Handshake: true })
  })
})
