/**
 * What the rail shows beside a customer side that is more than one row deep.
 *
 * The line of interaction follows the LAST customer-side lane, so a board can
 * have several rows above it. Two things in the rail are decided by where a
 * row sits relative to that line — the tone its label is written in, and the
 * corridor reserved under it — and both used to ask a question that answers
 * for a lane rather than for a board. On a single-lane customer side the two
 * questions have the same answer, which is why nothing here failed until a
 * second customer-side lane existed.
 *
 * Both assertions below are stated as position relative to the line, never as
 * a count of the boards that have one.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { getBlueprintLabelSection } from '@/lib/blueprintTheme'
import { buildSideBySideLabelRowSpecs } from '@/lib/sideBySideCompareLayout'
import {
  BACKSTAGE_ACTIONS_ROLE,
  BACKSTAGE_TOUCHPOINTS_ROLE,
  CUSTOMER_ACTIONS_ROLE,
  FRONTSTAGE_ACTIONS_ROLE,
  FRONTSTAGE_TOUCHPOINTS_ROLE,
  STORYBOARD_ROLE,
  SUPPORT_ACTIONS_ROLE,
} from '@/lib/laneRoles'
import type { BlueprintData, BlueprintLane } from '@/types/blueprint'

/** Lanes in board order. Names say nothing — the rail reads the role. */
function rows(...roles: string[]): BlueprintLane[] {
  return roles.map((role, index) => ({
    id: `lane-${index}`,
    name: `however row ${index} happens to be labelled`,
    role,
    position: index,
  }))
}

/** A full stack whose customer side is two rows deep. */
const TWO_DEEP = rows(
  STORYBOARD_ROLE,
  CUSTOMER_ACTIONS_ROLE,
  CUSTOMER_ACTIONS_ROLE,
  FRONTSTAGE_TOUCHPOINTS_ROLE,
  FRONTSTAGE_ACTIONS_ROLE,
  BACKSTAGE_TOUCHPOINTS_ROLE,
  BACKSTAGE_ACTIONS_ROLE,
  SUPPORT_ACTIONS_ROLE,
)

/** The same board with one customer-side row, which is what shipped for years. */
const ONE_DEEP = rows(
  STORYBOARD_ROLE,
  CUSTOMER_ACTIONS_ROLE,
  FRONTSTAGE_TOUCHPOINTS_ROLE,
  FRONTSTAGE_ACTIONS_ROLE,
  BACKSTAGE_TOUCHPOINTS_ROLE,
  BACKSTAGE_ACTIONS_ROLE,
  SUPPORT_ACTIONS_ROLE,
)

function sections(lanes: BlueprintLane[]): string[] {
  return lanes.map((lane) => getBlueprintLabelSection(lane, lanes))
}

test('a lane inside the band is lettered as sitting above the line', () => {
  // `customerFacing` is the tone of the zone BETWEEN the two lines. A lane
  // still inside the customer band is above the upper one, and giving it that
  // tone puts it, to a reader, on the far side of a boundary they can see it
  // is above.
  assert.deepEqual(sections(TWO_DEEP), [
    'frontstage',
    'frontstage',
    'frontstage',
    'customerFacing',
    'customerFacing',
    'backstage',
    'backstage',
    'backstage',
  ])
})

test('deepening the band does not repaint the rows below it', () => {
  // Everything from the touchpoint row down keeps the tone it had; the only
  // row the second customer-side lane is allowed to change is itself.
  assert.deepEqual(sections(ONE_DEEP), [
    'frontstage',
    'frontstage',
    'customerFacing',
    'customerFacing',
    'backstage',
    'backstage',
    'backstage',
  ])
  assert.deepEqual(sections(TWO_DEEP).slice(3), sections(ONE_DEEP).slice(2))
})

/** A board with no cells: the rail's rows are decided by lanes alone. */
function emptyBoard(lanes: BlueprintLane[]): BlueprintData {
  return {
    path: { id: 'path-1', name: 'a path' },
    lanes,
    steps: [{ id: 'step-1', name: 'a step', position: 0 }],
    cells: [],
    dependencies: [],
  } as unknown as BlueprintData
}

/** Which lane rows the rail reserves a corridor under, by lane id. */
function corridorsBelow(lanes: BlueprintLane[]): string[] {
  return buildSideBySideLabelRowSpecs([emptyBoard(lanes)])
    .filter((row) => row.kind === 'lane' && row.wrapCorridorBelow)
    .map((row) => row.key)
}

/** Which lane rows the rail draws a line of interaction after, by lane id. */
function interactionRowsAfter(lanes: BlueprintLane[]): string[] {
  const specs = buildSideBySideLabelRowSpecs([emptyBoard(lanes)])
  return specs.flatMap((row, index) =>
    row.kind === 'interaction' ? [specs[index - 1]!.key] : [],
  )
}

test('the rail reserves a corridor only under the row the line follows', () => {
  // The corridor is the gap between a row and the line beneath it, so a row
  // with no line beneath it has no corridor to reserve. Asserted against the
  // rail's own interaction row rather than against a lane index: these two
  // are the same fact, and the defect was that they could disagree.
  assert.deepEqual(corridorsBelow(TWO_DEEP), interactionRowsAfter(TWO_DEEP))
  assert.deepEqual(corridorsBelow(TWO_DEEP), ['lane-2'])
  assert.deepEqual(corridorsBelow(ONE_DEEP), interactionRowsAfter(ONE_DEEP))
})
