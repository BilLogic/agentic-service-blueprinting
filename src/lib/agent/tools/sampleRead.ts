import {
  getBlueprintFallback,
  getFallbackPathsForScenario,
} from '@/data/blueprintFallbacks'
import { FALLBACK_SLICES, FALLBACK_SLICE_ITEMS } from '@/data/sliceFallbacks'
import {
  formatBlueprints,
  formatCompareDiff,
  formatFields,
  formatOwnerTags,
  formatScenarioList,
  formatSliceDetail,
  formatSliceList,
} from '@/lib/agent/tools/format'
import type { BlueprintData } from '@/types/blueprint'
import { FALLBACK_NAV } from '@/types/nav'

/**
 * Read tools answered from the BUNDLED SAMPLE, with no database anywhere.
 *
 * Two consumers, one implementation:
 *
 * 1. The no-database agent trial — a developer who cloned the kit, has no
 *    Supabase project, and pastes a provider key. The canvas already renders
 *    the sample blueprint from these same fallback modules; the agent now
 *    reads the same content instead of being unavailable.
 * 2. The eval harness (`scripts/agent-harness`), which runs keyless against
 *    the fixture and used to carry its own hand-copied formatters.
 *
 * Read-only by construction: there is nothing here that writes, so the trial
 * cannot pretend to author. The panel registers only the read roster
 * (`SAMPLE_TRIAL_TOOL_NAMES`), so a write tool is absent rather than refused.
 */

function sampleBlueprintsFor(scenarioId: string): BlueprintData[] {
  const paths = getFallbackPathsForScenario(scenarioId)
  if (paths.length > 0) {
    return paths
      .map((path) =>
        getBlueprintFallback(scenarioId, path.id, path.path_type),
      )
      .filter((blueprint): blueprint is BlueprintData => Boolean(blueprint))
  }
  const single = getBlueprintFallback(scenarioId)
  return single ? [single] : []
}

/** Every sample blueprint, in nav order — the trial's whole universe. */
function allSampleBlueprints(): BlueprintData[] {
  return FALLBACK_NAV.filter((item) => item.parentId).flatMap((scenario) =>
    sampleBlueprintsFor(scenario.id),
  )
}

export function sampleListScenarios(): string {
  return formatScenarioList(
    FALLBACK_NAV.filter((item) => !item.parentId).map((phase) => ({
      id: phase.id,
      name: phase.label,
      scenarios: FALLBACK_NAV.filter(
        (item) => item.parentId === phase.id,
      ).map((scenario) => ({
        id: scenario.id,
        name: scenario.label,
        description: scenario.description,
      })),
    })),
  )
}

export function sampleGetBlueprint(scenarioId: string): string {
  const blueprints = sampleBlueprintsFor(scenarioId)
  if (blueprints.length === 0) return 'No paths in this scenario.'
  return formatBlueprints(blueprints)
}

export function sampleGetCompareDiff(
  scenarioId: string,
  pathIds?: string[],
): string {
  return formatCompareDiff(sampleBlueprintsFor(scenarioId), pathIds)
}

export function sampleGetCell(cellId: string): string {
  for (const blueprint of allSampleBlueprints()) {
    const cell = blueprint.cells.find((entry) => entry.id === cellId)
    if (!cell) continue
    return formatFields([
      ['content', cell.content],
      ['summary', cell.description],
      ['layer_id', cell.layer_id],
      ['step_id', cell.step_id],
    ])
  }
  return `No cell with id ${cellId}.`
}

export function sampleListSlices(): string {
  return formatSliceList(FALLBACK_SLICES)
}

export function sampleGetSlice(sliceId: string): string {
  const slice = FALLBACK_SLICES.find((entry) => entry.id === sliceId)
  if (!slice) throw new Error(`No slice with id ${sliceId}.`)
  return formatSliceDetail(slice, FALLBACK_SLICE_ITEMS[sliceId] ?? [])
}

/**
 * The sample blueprint carries no owner tags — `BlueprintCell` (the shape the
 * fallback modules ship) has no owner columns at all, because the canvas
 * renders owners from the database only. Saying so is the honest answer, and
 * it is the same sentence a live-but-untagged database would produce.
 */
export function sampleListOwnerTags(): string {
  return formatOwnerTags([])
}
