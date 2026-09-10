import { getBlueprintFallback } from '@/data/blueprintFallbacks'
import { applyBlueprintDisplayFilters } from '@/lib/applyBlueprintDisplayFilters'
import { isBundledSampleActive } from '@/lib/bundledSample'
import {
  deduplicateBlueprintLanes,
  normalizeBlueprint,
  sortBlueprintLanes,
  type RawPath,
} from '@/lib/normalizeBlueprint'
import type { BlueprintData } from '@/types/blueprint'

export type BlueprintSource = 'database' | 'fallback' | null

export function isBlueprintEmpty(data: BlueprintData): boolean {
  return data.lanes.length === 0
}

function sortBlueprintSteps(data: BlueprintData): BlueprintData {
  return {
    ...data,
    steps: [...data.steps].sort(
      (a, b) => a.position - b.position,
    ),
  }
}

/**
 * Which board a scenario draws, and from which of the two sources.
 *
 * The rule is one sentence: a configured database is the whole truth. Rows
 * come back as they are — sorted and display-filtered, never topped up — and
 * a path the database has nothing for draws nothing. The bundled sample is
 * what a clone with no database configured shows, and it is reachable in no
 * other state.
 *
 * This function used to merge the two. On the database path it appended every
 * fallback lane, cell, step and dependency the rows lacked and filled a blank
 * path name, summary or note from the fallback's prose. It read as generosity
 * and worked as a leak: an adopter who connected their own backend kept seeing
 * this kit's content wherever their board had a gap, presented as their own,
 * with nothing on screen reporting it. A hole in a board is information; the
 * merge deleted that information and put a stranger's words in its place.
 */
export function resolveBlueprintForScenario(
  scenarioId: string | undefined,
  rawPath: RawPath | null | undefined,
): { blueprint: BlueprintData | null; source: BlueprintSource } {
  const pathId = rawPath?.id

  if (rawPath) {
    const fromDb = normalizeBlueprint(rawPath)
    if (!isBlueprintEmpty(fromDb)) {
      return {
        blueprint: applyBlueprintDisplayFilters(
          sortBlueprintSteps(sortBlueprintLanes(fromDb)),
          scenarioId,
          pathId,
        ),
        source: 'database',
      }
    }
  }

  // Nothing from the database to draw. Whether that means "the sample" or
  // "nothing" is decided by whether a database exists at all — not by whether
  // this particular read found anything.
  if (!isBundledSampleActive()) {
    return { blueprint: null, source: null }
  }

  const fallback = getBlueprintFallback(scenarioId, pathId)
  if (fallback) {
    return {
      blueprint: applyBlueprintDisplayFilters(
        sortBlueprintSteps(
          sortBlueprintLanes(deduplicateBlueprintLanes(fallback)),
        ),
        scenarioId,
        pathId ?? fallback.path.id,
      ),
      source: 'fallback',
    }
  }

  return { blueprint: null, source: null }
}
