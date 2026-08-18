import {
  countCompareDifferences,
  deriveCompareStepGroups,
  deriveCompareZones,
  getDetailOnlyCompareSlots,
  isDetailOnlyCompareSlot,
} from '@/lib/compareLedger'
import {
  buildCompareModel,
  type CompareBlueprints,
  type CompareSlot,
} from '@/lib/compareSlots'
import type { BlueprintData } from '@/types/blueprint'

/**
 * The read tools' TEXT SHAPE, with no data source attached.
 *
 * Read tools answer from PostgREST when a database is configured and from
 * the bundled sample fixture when one is not (the no-database agent trial,
 * and the eval harness running keyless). Those are two sources for one
 * answer — so the rendering lives here, once, and both callers pass their
 * rows through it. Before this module the harness kept a hand-copied set of
 * fixture formatters that drifted from `read.ts` line by line.
 *
 * Compact text, not JSON dumps: the model reads a grid the way a person
 * skims one, with ids in parentheses so every later write names its target
 * precisely.
 */

export type ScenarioListPhase = {
  id: string
  name: string
  scenarios: Array<{ id: string; name: string; description?: string | null }>
}

export function formatScenarioList(phases: ScenarioListPhase[]): string {
  const lines: string[] = []
  for (const phase of phases) {
    lines.push(`Phase "${phase.name}" (${phase.id})`)
    for (const scenario of phase.scenarios) {
      lines.push(
        `  Scenario "${scenario.name}" (${scenario.id})${scenario.description ? ` — ${scenario.description}` : ''}`,
      )
    }
  }
  return lines.join('\n') || 'No phases found.'
}

/** One section per path: header, step row, then lane-by-lane cell lines. */
export function formatBlueprints(blueprints: readonly BlueprintData[]): string {
  const sections: string[] = []
  for (const { path, steps, layers, cells } of blueprints) {
    const lines: string[] = [
      `Path "${path.name}" (${path.id}, type ${path.path_type})`,
      `Steps: ${steps
        .map((step) => `${step.column_position}. "${step.name}" (${step.id})`)
        .join(' | ')}`,
    ]
    for (const layer of layers) {
      lines.push(
        `Lane "${layer.name}" (${layer.id}${layer.role ? `, role ${layer.role}` : ''}):`,
      )
      const byStep = new Map<string, typeof cells>()
      for (const cell of cells) {
        if (cell.layer_id !== layer.id) continue
        const list = byStep.get(cell.step_id) ?? []
        list.push(cell)
        byStep.set(cell.step_id, list)
      }
      for (const step of steps) {
        for (const cell of byStep.get(step.id) ?? []) {
          lines.push(
            `  [step ${step.column_position}] "${cell.content}" (${cell.id})`,
          )
        }
      }
    }
    sections.push(lines.join('\n'))
  }
  return sections.join('\n\n')
}

/** `key: value` lines, empty fields dropped. */
export function formatFields(fields: Array<[string, unknown]>): string {
  return fields
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join('\n')
}

export function formatSliceList(
  slices: ReadonlyArray<{ id: string; title: string; slice_type: string }>,
): string {
  if (slices.length === 0) return 'No slices yet.'
  return slices
    .map((slice) => `"${slice.title}" (${slice.id}, type ${slice.slice_type})`)
    .join('\n')
}

export function formatSliceDetail(
  slice: {
    id: string
    title: string
    slice_type: string
    actor?: string | null
  },
  items: ReadonlyArray<{
    position: number
    caption?: string | null
    narrative?: string | null
    cell_ids?: string[] | null
  }>,
): string {
  const frames = [...items]
    .sort((a, b) => a.position - b.position)
    .map(
      (frame, index) =>
        `frame ${index + 1}: cells [${(frame.cell_ids ?? []).join(', ')}]${frame.caption ? ` caption "${frame.caption}"` : ''}${frame.narrative ? ` narrative "${frame.narrative}"` : ''}`,
    )
  return `slice "${slice.title}" (${slice.id}) type=${slice.slice_type}${slice.actor ? ` actor=${slice.actor}` : ''}\n${frames.join('\n') || '(no frames)'}`
}

export function formatOwnerTags(
  rows: ReadonlyArray<{
    owner?: string | null
    perceived_owner?: string | null
  }>,
): string {
  const tags = new Set<string>()
  for (const row of rows) {
    if (row.owner) tags.add(row.owner)
    if (row.perceived_owner) tags.add(row.perceived_owner)
  }
  if (tags.size === 0) return 'No owner tags in use yet.'
  return [...tags].sort().join(', ')
}

function compareSlotLine(
  slot: CompareSlot,
  blueprints: readonly BlueprintData[],
): string {
  const fields =
    slot.differingFields.length > 0
      ? ` (fields: ${slot.differingFields.join(', ')})`
      : ''
  const perPath = blueprints
    .map((blueprint) => {
      const entry = slot.perPath[blueprint.path.id]
      if (!entry?.present) return `${blueprint.path.name}: —`
      const quoted = entry.contents.map((content) => `"${content}"`).join(' + ')
      return `${blueprint.path.name}: ${quoted} (${entry.cellIds.join(', ')})`
    })
    .join(' | ')
  return `  [${slot.verdict}] lane "${slot.laneLabel}" @ step "${slot.columnLabel}"${fields}: ${perPath}`
}

/**
 * Headless compare: runs `buildCompareModel` over the scenario's paths and
 * serializes slots / step groups / columns as compact text. This grounds
 * every other compare argument the agent can pass — step numbers for
 * jump_divergence, lane and step names for differences_filter, cell ids for
 * focus/annotate.
 */
export function formatCompareDiff(
  all: readonly BlueprintData[],
  pathIds?: string[],
): string {
  if (all.length === 0) return 'No paths in this scenario.'
  let blueprints = [...all]
  if (pathIds && pathIds.length > 0) {
    const wanted = blueprints.filter((blueprint) =>
      pathIds.includes(blueprint.path.id),
    )
    // Keep the caller's order — column insertion follows the first path.
    blueprints = pathIds
      .map((id) => wanted.find((blueprint) => blueprint.path.id === id))
      .filter((blueprint): blueprint is BlueprintData => Boolean(blueprint))
  }
  if (blueprints.length < 2)
    return `Comparison needs at least two paths; this scenario ${
      pathIds && pathIds.length > 0 ? 'selection' : ''
    } resolves to ${blueprints.length}. Path ids here: ${all
      .map((blueprint) => blueprint.path.id)
      .join(', ')}.`

  const model = buildCompareModel(blueprints as CompareBlueprints)
  const zones = deriveCompareZones(model)
  const stepGroups = deriveCompareStepGroups(model)
  const detailOnly = getDetailOnlyCompareSlots(model)

  const lines: string[] = [
    `Comparing ${blueprints
      .map((blueprint) => `"${blueprint.path.name}" (${blueprint.path.id})`)
      .join(' vs ')}`,
    `Canonical columns: ${model.columns
      .map((column, index) => `${index + 1}."${column.label}" ${column.verdict}`)
      .join(' | ')}`,
    `${countCompareDifferences(model)} differences · ${zones.length} zones · ${detailOnly.length} detail-only`,
  ]
  // Grouped by STEP — the ledger's grain and jump_divergence's argument;
  // each group names the divergence zone (run) it sits in, which is the
  // grain the strip draws.
  for (const group of stepGroups) {
    lines.push(
      `${group.headerLabel} (zone ${group.zoneIndex}, ${group.slots.length} difference${
        group.slots.length === 1 ? '' : 's'
      }):`,
    )
    for (const slot of group.slots) lines.push(compareSlotLine(slot, blueprints))
  }
  if (detailOnly.length > 0) {
    lines.push(`Detail-only differences (${detailOnly.length}) — no canvas step:`)
    for (const slot of detailOnly) lines.push(compareSlotLine(slot, blueprints))
  }
  const shared = model.slots.filter(
    (slot) => slot.verdict === 'shared' && !isDetailOnlyCompareSlot(slot),
  ).length
  lines.push(
    `${shared} shared slots. Note: triggers/needs edges are not compared.`,
  )
  return lines.join('\n')
}
