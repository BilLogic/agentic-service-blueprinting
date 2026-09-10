/**
 * The dividers, and the one thing they must never read.
 *
 * `lanes.name` is documented as free-form in any language. For as long as the
 * internal interaction line was decided by matching that name against the
 * string `'Support Actions'`, renaming or translating a lane deleted a
 * divider from the board, silently — and 36 of the 40 support lanes in
 * production carried no role at all, so the match was doing the whole job.
 *
 * Every case below is stated twice: once for the role, and once for the same
 * lane wearing a name nobody thought of. The second half is the point. A
 * divider suite that only ever passes English lane names cannot tell a role
 * lookup from a string comparison, which is how this survived.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  countBlueprintDividerRows,
  countBlueprintWrapCorridorMargins,
  laneHasInLaneLoopCorridor,
  laneHasOverheadArrowCorridor,
  laneHasWrapCorridorBelow,
  lanePrecedesBlueprintDivider,
  shouldShowInteractionLineAfter,
  shouldShowInternalInteractionLineAfter,
  shouldShowLaneDividerAfter,
  shouldShowVisibilityLineAfter,
} from '@/lib/blueprintLayout'
import {
  BACKSTAGE_ACTIONS_ROLE,
  BACKSTAGE_TOUCHPOINTS_ROLE,
  CUSTOMER_ACTIONS_ROLE,
  FRONTSTAGE_ACTIONS_ROLE,
  FRONTSTAGE_TOUCHPOINTS_ROLE,
  PARTNER_ACTIONS_ROLE,
  STORYBOARD_ROLE,
  SUPPORT_ACTIONS_ROLE,
} from '@/lib/laneRoles'
import type { BlueprintData, BlueprintLane } from '@/types/blueprint'

/** A lane, named however the caller likes. */
function lane(
  role: string | null,
  name = 'whatever this lane is called',
  position = 0,
): BlueprintLane {
  return { id: `lane-${role ?? 'none'}-${position}`, name, role, position }
}

/** The lane order, roles only, as a deployment has it in production. */
function board(supportName = 'Support Actions'): BlueprintLane[] {
  return [
    lane(CUSTOMER_ACTIONS_ROLE, 'The person the service is for', 0),
    lane(FRONTSTAGE_TOUCHPOINTS_ROLE, 'Front Stage Tech', 1),
    lane(FRONTSTAGE_ACTIONS_ROLE, 'Front Stage Actions', 2),
    lane(BACKSTAGE_ACTIONS_ROLE, 'Back Stage Actions', 3),
    lane(SUPPORT_ACTIONS_ROLE, supportName, 4),
  ]
}

test('the interaction line follows the spine actor', () => {
  assert.equal(shouldShowInteractionLineAfter(lane(CUSTOMER_ACTIONS_ROLE)), true)
  assert.equal(shouldShowInteractionLineAfter(lane(BACKSTAGE_ACTIONS_ROLE)), false)
  assert.equal(shouldShowInteractionLineAfter(lane(null)), false)
})

/**
 * The customer side is a band, and a band has ONE floor.
 *
 * The assertion below is the invariant — the line of interaction follows the
 * LAST customer-side lane — and never a census of the boards that exist. A
 * count of today's two-customer-lane boards would pass on the day it was
 * written and say nothing about the rule; these say what a reader sees.
 */
function customerBand(...roles: (string | null)[]): BlueprintLane[] {
  return roles.map((role, index) => lane(role, `lane ${index}`, index))
}

/** Which lanes the interaction line draws after, by index. */
function interactionLinesAfter(lanes: BlueprintLane[]): number[] {
  return lanes
    .map((entry, index) =>
      shouldShowInteractionLineAfter(entry, lanes) ? index : -1,
    )
    .filter((index) => index >= 0)
}

test('two customer-side lanes draw one line, after the second', () => {
  const lanes = customerBand(
    STORYBOARD_ROLE,
    CUSTOMER_ACTIONS_ROLE,
    CUSTOMER_ACTIONS_ROLE,
    FRONTSTAGE_TOUCHPOINTS_ROLE,
    FRONTSTAGE_ACTIONS_ROLE,
  )
  assert.deepEqual(interactionLinesAfter(lanes), [2])
})

test('one customer-side lane draws the line where it always did', () => {
  const lanes = customerBand(
    STORYBOARD_ROLE,
    CUSTOMER_ACTIONS_ROLE,
    FRONTSTAGE_TOUCHPOINTS_ROLE,
    FRONTSTAGE_ACTIONS_ROLE,
  )
  assert.deepEqual(interactionLinesAfter(lanes), [1])
})

test('a board with no customer-side lane draws no line of interaction', () => {
  const lanes = customerBand(
    STORYBOARD_ROLE,
    BACKSTAGE_ACTIONS_ROLE,
    BACKSTAGE_TOUCHPOINTS_ROLE,
    SUPPORT_ACTIONS_ROLE,
  )
  assert.deepEqual(interactionLinesAfter(lanes), [])
})

test('classifying the lane under the spine moves the line down to it', () => {
  // An actor lane can sit above the spine or below it, and both orders are
  // authored. Giving the one BELOW a customer-side role extends the band
  // downwards, so the line follows it — the row does not move, the floor of
  // the band does.
  const before = customerBand(
    STORYBOARD_ROLE,
    CUSTOMER_ACTIONS_ROLE,
    null,
    FRONTSTAGE_ACTIONS_ROLE,
  )
  const after = customerBand(
    STORYBOARD_ROLE,
    CUSTOMER_ACTIONS_ROLE,
    CUSTOMER_ACTIONS_ROLE,
    FRONTSTAGE_ACTIONS_ROLE,
  )
  assert.deepEqual(interactionLinesAfter(before), [1])
  assert.deepEqual(interactionLinesAfter(after), [2])
})

test('three customer-side lanes still draw one line', () => {
  const lanes = customerBand(
    CUSTOMER_ACTIONS_ROLE,
    CUSTOMER_ACTIONS_ROLE,
    CUSTOMER_ACTIONS_ROLE,
    FRONTSTAGE_ACTIONS_ROLE,
  )
  assert.deepEqual(interactionLinesAfter(lanes), [2])
})

test('a lane between two customer-side lanes does not split the band in two', () => {
  // Nothing in production interleaves them, and the rule is still "the last
  // one", not "the one whose neighbour differs" — which would draw twice.
  const lanes = customerBand(
    CUSTOMER_ACTIONS_ROLE,
    PARTNER_ACTIONS_ROLE,
    CUSTOMER_ACTIONS_ROLE,
    FRONTSTAGE_ACTIONS_ROLE,
  )
  assert.deepEqual(interactionLinesAfter(lanes), [2])
})

test('the band is read from the role, never from the lane name', () => {
  // The same reason every other divider case here is stated twice. A second
  // customer-side lane is whatever the board calls its actors.
  const lanes = [
    lane(CUSTOMER_ACTIONS_ROLE, 'Regular Tutor', 0),
    lane(CUSTOMER_ACTIONS_ROLE, 'Lead Tutor', 1),
    lane(FRONTSTAGE_ACTIONS_ROLE, 'Front Stage Actions', 2),
  ]
  assert.deepEqual(interactionLinesAfter(lanes), [1])
})

test('a lane row is flush only against the divider that actually draws', () => {
  // The band rule has to reach the row shell too: the lane above the line is
  // the one that loses its bottom rule, and before this it was every
  // customer-side lane.
  const lanes = customerBand(
    CUSTOMER_ACTIONS_ROLE,
    CUSTOMER_ACTIONS_ROLE,
    FRONTSTAGE_ACTIONS_ROLE,
  )
  assert.equal(lanePrecedesBlueprintDivider(lanes[0]!, lanes), false)
  assert.equal(lanePrecedesBlueprintDivider(lanes[1]!, lanes), true)
  assert.equal(shouldShowLaneDividerAfter(lanes[0]!, 0, lanes), true)
  assert.equal(shouldShowLaneDividerAfter(lanes[1]!, 1, lanes), false)
})

test('the corridor below belongs to the floor of the band, not to the band', () => {
  // The corridor exists because the standard blueprint already leaves a band
  // between the row and the line of interaction. A lane inside the customer
  // band has no line beneath it, so it has no such gap to route through —
  // reserving one opens space under a row nothing is drawn under.
  const lanes = customerBand(
    CUSTOMER_ACTIONS_ROLE,
    CUSTOMER_ACTIONS_ROLE,
    FRONTSTAGE_ACTIONS_ROLE,
  )
  assert.equal(laneHasWrapCorridorBelow(lanes[0]!, lanes), false)
  assert.equal(laneHasWrapCorridorBelow(lanes[1]!, lanes), true)
  assert.equal(countBlueprintWrapCorridorMargins(lanes), 1)
})

test('a second customer-side lane adds a row, not a divider row', () => {
  // Both counts are read as HEIGHT: each is multiplied by a row constant and
  // added to the grid. A count that disagrees with what the renderer draws is
  // therefore a grid taller than its own contents, by exactly the rows it
  // over-counted, on every board whose customer side is more than one row
  // deep.
  const one = customerBand(
    CUSTOMER_ACTIONS_ROLE,
    FRONTSTAGE_ACTIONS_ROLE,
    BACKSTAGE_ACTIONS_ROLE,
    SUPPORT_ACTIONS_ROLE,
  )
  const two = customerBand(
    CUSTOMER_ACTIONS_ROLE,
    CUSTOMER_ACTIONS_ROLE,
    FRONTSTAGE_ACTIONS_ROLE,
    BACKSTAGE_ACTIONS_ROLE,
    SUPPORT_ACTIONS_ROLE,
  )
  assert.equal(countBlueprintDividerRows(one), 3)
  assert.equal(countBlueprintDividerRows(two), countBlueprintDividerRows(one))
  assert.equal(countBlueprintWrapCorridorMargins(one), 1)
  assert.equal(
    countBlueprintWrapCorridorMargins(two),
    countBlueprintWrapCorridorMargins(one),
  )
})

test('what is counted is what is drawn, lane for lane', () => {
  // The two answers were able to disagree because only one of them was given
  // the board to answer about. Stated as an equality rather than as a number,
  // because the number is a property of this fixture and the equality is a
  // property of the grid.
  const lanes = customerBand(
    STORYBOARD_ROLE,
    CUSTOMER_ACTIONS_ROLE,
    CUSTOMER_ACTIONS_ROLE,
    FRONTSTAGE_TOUCHPOINTS_ROLE,
    FRONTSTAGE_ACTIONS_ROLE,
    BACKSTAGE_ACTIONS_ROLE,
    SUPPORT_ACTIONS_ROLE,
  )
  assert.equal(
    countBlueprintDividerRows(lanes),
    lanes.filter((entry) => lanePrecedesBlueprintDivider(entry, lanes)).length,
  )
})

test('the visibility line follows the frontstage actions lane', () => {
  const lanes = board()
  assert.equal(shouldShowVisibilityLineAfter(lanes[2]!, lanes), true)
  assert.equal(shouldShowVisibilityLineAfter(lanes[3]!, lanes), false)
})

test('a frontstage tech lane above frontstage actions does not take the line', () => {
  const lanes = board()
  assert.equal(shouldShowVisibilityLineAfter(lanes[1]!, lanes), false)
})

test('the internal interaction line draws before a support lane', () => {
  const lanes = board()
  assert.equal(shouldShowInternalInteractionLineAfter(lanes[3]!, lanes), true)
})

test('the internal interaction line survives renaming the support lane', () => {
  // The regression. A support lane called anything at all still anchors the
  // divider, because the role says what it is and the name never did.
  for (const name of ['Ondersteuningsacties', '支援アクション', 'Ops', '']) {
    const lanes = board(name)
    assert.equal(
      shouldShowInternalInteractionLineAfter(lanes[3]!, lanes),
      true,
      `a support lane named "${name}" lost the internal interaction line`,
    )
  }
})

test('an explicit role beats the name it happens to carry', () => {
  // The other half of the same rule. The bespoke comparison in the layout
  // module fired on the name alone, so a lane whose role said one thing and
  // whose label said another drew a divider its role gave it no claim to.
  const lanes = [
    lane(BACKSTAGE_ACTIONS_ROLE, 'Back Stage Actions', 0),
    lane(BACKSTAGE_TOUCHPOINTS_ROLE, 'Support Actions', 1),
  ]
  assert.equal(shouldShowInternalInteractionLineAfter(lanes[0]!, lanes), false)
})

test('role-less fallback content still gets its divider', () => {
  // 23 lanes across the hand-written fallback blueprints are named
  // 'Support Actions' and carry no role, because that data predates
  // `lane_role` entirely — every lane in it resolves through
  // LEGACY_NAME_TO_ROLE, not just this one. That map is the single, declared
  // place where a name may still stand in for a missing role, and moving the
  // lookup into it is the point: the divider itself now reads only a role,
  // and the rows in the database all have one.
  const lanes = [
    lane(BACKSTAGE_ACTIONS_ROLE, 'Back Stage Actions', 0),
    lane(null, 'Support Actions', 1),
  ]
  assert.equal(shouldShowInternalInteractionLineAfter(lanes[0]!, lanes), true)
})

test('the internal interaction line needs a backstage actions lane before it', () => {
  const lanes = [
    lane(FRONTSTAGE_ACTIONS_ROLE, 'Front Stage Actions', 0),
    lane(SUPPORT_ACTIONS_ROLE, 'Support Actions', 1),
  ]
  assert.equal(shouldShowInternalInteractionLineAfter(lanes[0]!, lanes), false)
})

test('the last lane never draws an internal interaction line', () => {
  const lanes = [lane(BACKSTAGE_ACTIONS_ROLE, 'Back Stage Actions', 0)]
  assert.equal(shouldShowInternalInteractionLineAfter(lanes[0]!, lanes), false)
})

/*
  The corridors, and the one thing THEY must never read.

  A lane used to get arrow headroom because of what it was called: three
  names — a tutor, a teacher, a discovery rail — were written into the layout
  module, and any other lane's spanning or backward arrow drew straight over
  its own cells. The rule below is the whole rule, stated on the data: which
  lane a cell sits in, and which column its step occupies. Every case is
  therefore posed on lanes named nothing in particular, because a name is not
  an input.
*/

/** A four-column board of `laneCount` lanes, one cell per lane per column. */
function board2(laneCount: number): { lanes: BlueprintLane[]; data: BlueprintData } {
  const lanes = Array.from({ length: laneCount }, (_, index) =>
    lane(null, `lane ${index}`, index),
  )
  const steps = [0, 1, 2, 3].map((position) => ({ id: `s${position}`, position }))
  const cells = lanes.flatMap((entry) =>
    steps.map((step) => ({
      id: `${entry.id}:${step.id}`,
      lane_id: entry.id,
      step_id: step.id,
    })),
  )
  return {
    lanes,
    data: { lanes, steps, cells, dependencies: [] } as unknown as BlueprintData,
  }
}

function withDependencies(
  data: BlueprintData,
  ...pairs: Array<[string, string]>
): BlueprintData {
  return {
    ...data,
    dependencies: pairs.map(([source_cell_id, target_cell_id]) => ({
      source_cell_id,
      target_cell_id,
    })),
  } as unknown as BlueprintData
}

test('a forward in-lane dependency clearing a column reserves the overhead rail', () => {
  const { lanes, data } = board2(3)
  // Same lane, columns 0 -> 2: one cell is skipped, so the arrow cannot run
  // along the row and needs the strip above it.
  const board = withDependencies(data, ['lane-none-1:s0', 'lane-none-1:s2'])
  assert.equal(laneHasOverheadArrowCorridor(lanes[1]!, board), true)
  // and on no other lane
  assert.equal(laneHasOverheadArrowCorridor(lanes[0]!, board), false)
  assert.equal(laneHasOverheadArrowCorridor(lanes[2]!, board), false)
})

test('the overhead rail is reserved on ANY lane, not on three named ones', () => {
  // The regression. The same shape, moved from lane to lane, must reserve the
  // same corridor every time — the previous rule answered `true` only for
  // lanes called 'Regular Tutor' or 'Teacher'.
  for (const index of [0, 1, 2]) {
    const { lanes, data } = board2(3)
    const board = withDependencies(data, [
      `lane-none-${index}:s1`,
      `lane-none-${index}:s3`,
    ])
    assert.equal(
      laneHasOverheadArrowCorridor(lanes[index]!, board),
      true,
      `lane ${index} lost its overhead corridor`,
    )
  }
})

test('a neighbouring-column dependency needs no corridor', () => {
  const { lanes, data } = board2(2)
  // 0 -> 1 clears nothing: the arrow fits in the gap between the two cells.
  const board = withDependencies(data, ['lane-none-0:s0', 'lane-none-0:s1'])
  assert.equal(laneHasOverheadArrowCorridor(lanes[0]!, board), false)
  assert.equal(laneHasInLaneLoopCorridor(lanes[0]!, board), false)
})

test('a dependency that leaves the lane is not the lane\'s corridor to reserve', () => {
  const { lanes, data } = board2(2)
  const board = withDependencies(data, ['lane-none-0:s0', 'lane-none-1:s3'])
  assert.equal(laneHasOverheadArrowCorridor(lanes[0]!, board), false)
  assert.equal(laneHasOverheadArrowCorridor(lanes[1]!, board), false)
})

test('a backward in-lane dependency reserves the loop corridor above its row', () => {
  const { lanes, data } = board2(3)
  const board = withDependencies(data, ['lane-none-2:s3', 'lane-none-2:s1'])
  assert.equal(laneHasInLaneLoopCorridor(lanes[2]!, board), true)
  assert.equal(laneHasOverheadArrowCorridor(lanes[2]!, board), false)
  assert.equal(laneHasInLaneLoopCorridor(lanes[0]!, board), false)
})

test('a backward loop one column wide still reserves the loop corridor', () => {
  const { lanes, data } = board2(1)
  const board = withDependencies(data, ['lane-none-0:s2', 'lane-none-0:s1'])
  assert.equal(laneHasInLaneLoopCorridor(lanes[0]!, board), true)
})

test('a lane with neither shape reserves nothing', () => {
  const { lanes, data } = board2(2)
  assert.equal(laneHasOverheadArrowCorridor(lanes[0]!, data), false)
  assert.equal(laneHasInLaneLoopCorridor(lanes[0]!, data), false)
  assert.equal(laneHasWrapCorridorBelow(lanes[0]!), false)
})

test('only the spine actor gets a corridor BELOW its row', () => {
  // The routing decision this change accepts from the template: a backward
  // loop reserves headroom ABOVE its own row, wherever it is. The band below
  // belongs to the row the line of interaction follows, and to no other —
  // there is no second lane holding one by name.
  const spine = lane(CUSTOMER_ACTIONS_ROLE, 'whoever this service is for', 0)
  const other = lane(null, 'somebody else', 1)
  assert.equal(laneHasWrapCorridorBelow(spine), true)
  assert.equal(laneHasWrapCorridorBelow(other), false)
})
