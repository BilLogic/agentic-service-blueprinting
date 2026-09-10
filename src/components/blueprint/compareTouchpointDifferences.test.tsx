// @vitest-environment jsdom
/**
 * A compare of two paths that place different touchpoints on the same cell
 * shows the difference.
 *
 * The compare data layer used to weigh three fields: `content`, `summary` and
 * `resources`. A touchpoint lane's cell can carry placements the grid label
 * never names — the author types one touchpoint into the cell and places the
 * rest from the panel — so two paths could hold a visibly different set of
 * touchpoints at the same slot, agree on all three of those fields, and be
 * reported as `shared`. The reader was told the paths were identical there
 * while the board in front of them drew different touchpoints.
 *
 * `touchpoints` is the fourth field, and this file is the evidence that it
 * changed what a reader sees rather than only what the types say. The
 * signature it compares is the placement's name, its summary and its role —
 * what the placement points AT is a resource, and the third field already
 * covers that.
 *
 * Three cases, and the negative one matters as much as the others: a field
 * that reported every slot divergent would pass the first two tests and be
 * worse than no field at all.
 *
 *  - two paths whose placements differ → `divergent`, and `touchpoints` is
 *    the only field named. It is a DETAIL-ONLY difference, so the canvas must
 *    not fork (taxonomy V7) and the ledger's trailing group is where it lives.
 *  - the ledger surface actually draws that group, and the row inside it.
 *  - two paths whose placements match stay `shared`, and the surface says the
 *    paths are identical.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CompareDifferencesSurface } from '@/components/blueprint/CompareDifferencesSurface'
import { getDetailOnlyCompareSlots } from '@/lib/compareLedger'
import { buildCompareModel, type CompareBlueprints } from '@/lib/compareSlots'
import type {
  BlueprintCell,
  BlueprintData,
  CellTouchpoint,
} from '@/types/blueprint'

afterEach(cleanup)

/** A placement as `cellTouchpointsFromRows` would have resolved one. */
function placement(
  name: string,
  over: Partial<CellTouchpoint> = {},
): CellTouchpoint {
  return {
    id: `ct-${name.toLowerCase().replace(/\W+/g, '-')}`,
    touchpointId: `tp-${name.toLowerCase().replace(/\W+/g, '-')}`,
    name,
    kind: 'software',
    summary: null,
    role: null,
    ...over,
  }
}

/**
 * One path over one step and one touchpoint lane.
 *
 * Everything the other three compare fields read is held constant across the
 * two paths this file builds — the same cell label, the same summary, and no
 * resources on either side — so the only thing a verdict can be reacting to
 * is the placements.
 */
function makeBlueprint(
  pathId: string,
  pathName: string,
  touchpoints: CellTouchpoint[],
): BlueprintData {
  const cell: BlueprintCell = {
    id: `${pathId}-cell`,
    lane_id: `${pathId}-lane`,
    step_id: `${pathId}-step`,
    content: 'Handshake',
    frame: null,
    summary: 'The student opens the employer profile.',
    touchpoints,
    resources: [],
  }
  return {
    path: {
      id: pathId,
      name: pathName,
      summary: null,
      note: null,
      kind: 'happy',
      status: 'live',
    },
    lanes: [
      {
        id: `${pathId}-lane`,
        name: 'Front Stage Tech',
        role: 'frontstage_touchpoint',
        position: 0,
      },
    ],
    steps: [{ id: `${pathId}-step`, name: 'Apply', position: 0 }],
    cells: [cell],
    dependencies: [],
  }
}

/**
 * The happy path places one touchpoint; the variant places a second one at
 * the same cell without renaming the cell. That is the ordinary way the two
 * come apart — the panel is where a touchpoint beyond the first is placed.
 */
function differingPair(): CompareBlueprints {
  return [
    makeBlueprint('happy', 'Happy', [placement('Handshake')]),
    makeBlueprint('variant', 'Variant', [
      placement('Handshake'),
      placement('Zoom'),
    ]),
  ]
}

function matchingPair(): CompareBlueprints {
  return [
    makeBlueprint('happy', 'Happy', [placement('Handshake')]),
    makeBlueprint('variant', 'Variant', [placement('Handshake')]),
  ]
}

function surface(blueprints: CompareBlueprints) {
  const model = buildCompareModel(blueprints)
  return render(
    <CompareDifferencesSurface
      registration={{
        slideId: 'slide-1',
        scenarioName: 'Applying',
        viewMode: 'stacked',
        model,
        blueprints,
      }}
      onOpenCell={() => {}}
    />,
  )
}

describe('the compare data layer weighs touchpoints', () => {
  it('calls a placement-only difference divergent, and names only that field', () => {
    const model = buildCompareModel(differingPair())

    expect(model.slots).toHaveLength(1)
    expect(model.slots[0].verdict).toBe('divergent')
    expect(model.slots[0].differingFields).toEqual(['touchpoints'])

    // Detail-only, so the canvas stays whole: the fork condition is
    // "content differs OR presence differs", and neither did.
    expect(model.columns[0].verdict).toBe('shared')
    expect(model.runs).toEqual([{ kind: 'shared', columnKeys: ['apply#0'] }])
    expect(getDetailOnlyCompareSlots(model)).toHaveLength(1)
  })

  it('leaves matching placements shared', () => {
    const model = buildCompareModel(matchingPair())

    expect(model.slots[0].verdict).toBe('shared')
    expect(model.slots[0].differingFields).toEqual([])
    expect(getDetailOnlyCompareSlots(model)).toEqual([])
  })
})

describe('the difference ledger shows a placement-only difference', () => {
  it('draws the detail-only group, and the row inside it', () => {
    surface(differingPair())

    // The group the reader sees, with its post-filter count of one.
    const trigger = screen.getByRole('button', {
      name: /Detail-only differences/,
    })
    expect(trigger).toBeTruthy()

    fireEvent.click(trigger)

    // The row names the lane the placements sit in, and offers the hand-off
    // to the cell — which is where the two placement lists can be read.
    expect(
      screen.getByRole('button', {
        name: 'Show Front Stage Tech at Apply on the board',
      }),
    ).toBeTruthy()
    expect(
      screen.getByLabelText('Open Front Stage Tech at Apply in Details'),
    ).toBeTruthy()
  })

  it('says the paths are identical when the placements match', () => {
    surface(matchingPair())

    expect(screen.queryByText(/Detail-only differences/)).toBeNull()
    expect(screen.getByText(/Paths identical across/)).toBeTruthy()
  })
})
