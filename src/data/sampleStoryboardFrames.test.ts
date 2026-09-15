import { describe, expect, it } from 'vitest'
import {
  SAMPLE_BLUEPRINTS_BY_SCENARIO,
  SAMPLE_MAP_SERVICE_DIAGRAM_PATH_FALLBACK,
  SAMPLE_MAP_SERVICE_DOCS_PATH_FALLBACK,
} from '@/data/sampleBlueprint'
import { getLaneRole, isTouchpointLaneRole } from '@/lib/laneRoles'
import { resolveStoryboardStripEntries } from '@/lib/storyboardWalkthrough'
import type { BlueprintData } from '@/types/blueprint'

/*
  The bundled sample is what a first run renders, so the drawn figures it
  carries are measured here rather than trusted: the walkthrough reads a
  roster of lanes, and artwork parked on a lane outside that roster is drawn
  nowhere. Both facts below are about the SAMPLE'S CONTENT, not about the
  resolver â `storyboardWalkthroughRoster.test.ts` owns the rule itself.
*/

const MAP_SERVICE_PATHS: BlueprintData[] = [
  SAMPLE_MAP_SERVICE_DOCS_PATH_FALLBACK,
  SAMPLE_MAP_SERVICE_DIAGRAM_PATH_FALLBACK,
]

const stripEntriesOf = (blueprint: BlueprintData) =>
  blueprint.steps.flatMap((step) =>
    resolveStoryboardStripEntries(blueprint, step.id),
  )

describe('the bundled sample keeps its figures where the walkthrough reads', () => {
  it('offers eight strip entries across the two "Map your service" paths', () => {
    // Lane AND frame, because the count alone cannot tell a figure the
    // walkthrough reads from one parked on a row it skips: four a path, in
    // step order, each naming the row it hangs off.
    const walked = MAP_SERVICE_PATHS.flatMap(stripEntriesOf).map(
      (entry) => `${entry.laneName} → ${entry.frame}`,
    )
    const perPath = [
      'Claude in the IDE → /cover/sb-map.svg',
      'Blueprint owner → /cover/data-model-hierarchy.svg',
      'Blueprint owner → /cover/blueprint-anatomy.svg',
      'Blueprint owner → /cover/four-ways-in.svg',
    ]
    expect(walked).toEqual([...perPath, ...perPath])
  })

  it('parks no frame on a touchpoint lane anywhere in the sample', () => {
    const offenders = Object.values(SAMPLE_BLUEPRINTS_BY_SCENARIO)
      .flat()
      .flatMap((blueprint) => {
        const touchpointLaneIds = new Set(
          blueprint.lanes
            .filter((lane) => isTouchpointLaneRole(getLaneRole(lane)))
            .map((lane) => lane.id),
        )
        return blueprint.cells
          .filter(
            (cell) => cell.frame && touchpointLaneIds.has(cell.lane_id),
          )
          .map((cell) => `${cell.id} â ${cell.frame}`)
      })
    expect(offenders).toEqual([])
  })
})
