import { describe, expect, it } from 'vitest'
import {
  BLUEPRINT_CELL_DETAIL_UI_ENABLED,
  BLUEPRINT_STORYBOARD_LANE_UI_ENABLED,
  BLUEPRINT_STORYBOARD_WALKTHROUGH_ENABLED,
  isBlueprintCellDetailEnabled,
  isBlueprintStoryboardLaneEnabled,
  isBlueprintStoryboardWalkthroughEnabled,
} from './blueprintDisplayFlags'
import { applyBlueprintDisplayFilters } from './applyBlueprintDisplayFilters'
import { STORYBOARD_ROLE } from './laneRoles'
import type { BlueprintData } from '@/types/blueprint'

/**
 * A flag is one boolean the whole app reads.
 *
 * A deployment used to keep two module-private `Set`s of hardcoded scenario UUIDs
 * behind these predicates — an allowlist from before the flags shipped
 * globally. Both were read only AFTER an `if (FLAG) return true` on a flag
 * that is `true`, so no caller could observe them, and this repository had
 * already deleted them. This pins the property that replaced them: the
 * scenario id is inert, so nothing can quietly grow a per-scenario branch
 * back.
 */

/** Two ids the retired allowlist named, one it never did, and no id at all. */
const SCENARIO_IDS = [
  'a0000000-0000-4000-8000-000000000203', // the Warm-Up id the allowlist hardcoded
  'a0000000-0000-4000-8000-000000000201', // a listed neighbour
  '00000000-0000-4000-8000-00000000dead', // never on any list
  '',
  undefined,
  null,
] as const

const lane = (id: string, role: string | null) => ({
  id,
  name: id,
  role,
  position: 0,
})

const cell = (id: string, laneId: string) => ({
  id,
  lane_id: laneId,
  step_id: 'step-1',
  content: id,
  frame: null,
  summary: null,
  links: [],
})

/** A board whose storyboard lane is exactly what the lane flag would hide. */
const sampleBlueprint = (): BlueprintData => ({
  path: {
    id: 'path-1',
    name: 'Happy path',
    summary: null,
    note: null,
    kind: 'happy',
    status: 'live',
  },
  lanes: [lane('lane-actions', 'customer_actions'), lane('lane-storyboard', STORYBOARD_ROLE)],
  steps: [{ id: 'step-1', name: 'Arrive', position: 0 }],
  cells: [cell('cell-actions', 'lane-actions'), cell('cell-storyboard', 'lane-storyboard')],
  dependencies: [
    {
      id: 'dep-1',
      source_cell_id: 'cell-actions',
      target_cell_id: 'cell-storyboard',
    },
  ],
})

describe('blueprint display flags', () => {
  it('ships the storyboard lane and cell detail on, and the walkthrough off', () => {
    expect(BLUEPRINT_STORYBOARD_LANE_UI_ENABLED).toBe(true)
    expect(BLUEPRINT_CELL_DETAIL_UI_ENABLED).toBe(true)
    expect(BLUEPRINT_STORYBOARD_WALKTHROUGH_ENABLED).toBe(false)
    expect(isBlueprintStoryboardWalkthroughEnabled()).toBe(false)
  })

  it('ignores the scenario id — every id gets the flag, not an allowlist', () => {
    for (const scenarioId of SCENARIO_IDS) {
      expect(isBlueprintStoryboardLaneEnabled(scenarioId)).toBe(
        BLUEPRINT_STORYBOARD_LANE_UI_ENABLED,
      )
      expect(isBlueprintCellDetailEnabled(scenarioId)).toBe(
        BLUEPRINT_CELL_DETAIL_UI_ENABLED,
      )
    }
  })

  it('filters nothing off a board while the lane flag is on, for any scenario', () => {
    for (const scenarioId of ['a0000000-0000-4000-8000-000000000203', 'not-a-listed-id', undefined]) {
      const data = sampleBlueprint()
      expect(applyBlueprintDisplayFilters(data, scenarioId)).toBe(data)
    }
  })
})
