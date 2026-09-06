import { groupBy } from '@/lib/utils'
import type { IntegratedBlueprintDependency } from '@/types/integratedBlueprint'

/**
 * Merged view (Compare v3, Phase 4b) — the pure derivations behind ONE
 * combined blueprint: one lane set, one canonical step axis, and per SLOT
 * (lane × canonical column) either one cell (every path agrees) or each
 * present path's cell(s) stacked inside that slot.
 *
 * This is a per-slot merge, so it is independent of the branch-canvas data
 * gate: it needs no long shared RUNS of columns (the measured median was
 * 13% spine coverage), only agreement inside individual slots. Cell height
 * grows exactly where paths disagree, and that vertical swell IS the diff
 * signal — no extra paint beyond the existing divergent-column tint.
 *
 * Every sub-cell keeps its own real `cellId`, so the 1:1 selection
 * machinery (`selectionContext`, `data-blueprint-cell`, focusCells/pulse,
 * agent `focus_cell`) keeps working unchanged. Nothing here invents a
 * composite id.
 */

/** One member path's own backing cells for a merged sub-cell. */
export type MergedSubCellMember = {
  readonly pathId: string
  /** That path's step id backing this canonical column. */
  readonly stepId: string
  /** Real cell ids — never merged, never synthesized (bar the storyboard-lane
   *  `storyboard-<stepId>` anchor the stacked grid already uses). */
  readonly cellIds: readonly string[]
}

/**
 * One DRAWN cell of a merged slot. Paths whose cell content is identical
 * share one drawn cell — a slot never stacks two copies of the same words
 * (todo: the "two HP cells" report) — so a sub-cell carries every member
 * path it stands for. The first member's cells are the ones drawn; the
 * rest are `hidden`, and the arrow remap aliases their ids onto the drawn
 * ones exactly like a fully-shared slot does.
 */
export type MergedSubCell = MergedSubCellMember & {
  /** Every member path, in selection order. First = the drawn one. */
  readonly pathIds: readonly string[]
  readonly hidden: readonly MergedSubCellMember[]
}

/**
 * What one slot renders as.
 *
 * - `shared` — every compared path is present with the same merge
 *   signature, so ONE cell is drawn, exactly like a normal blueprint cell,
 *   with no path rail: it belongs to every path. `hidden` carries the
 *   paths the drawn cell stands in for (the arrow remap needs them).
 * - `split` — the paths disagree, or only some are present: each present
 *   path's cell(s) stack vertically inside the slot, each with a
 *   path-coloured rail. A single sub-cell is the 'only in one path' case.
 * - `empty` — no path has anything here.
 */
export type MergedSlotAssembly =
  | { readonly kind: 'empty' }
  | {
      readonly kind: 'shared'
      /** One group holding every path; its `hidden` carries the others. */
      readonly representative: MergedSubCell
    }
  | { readonly kind: 'split'; readonly subCells: readonly MergedSubCell[] }

/**
 * One path's candidate for a slot. `signature` is the MERGE signature —
 * the canvas fork condition is "content differs OR presence differs", so
 * callers pass the content-only signature: a detail-only difference (V7,
 * summary, resources or touchpoints only) must not fork the canvas, it lives in the ledger.
 */
export type MergedSlotCandidate = MergedSubCellMember & {
  readonly signature: string
}

/**
 * Assemble one slot. Sub-cells come out in `pathIds` order — the sidebar's
 * path selection order — so slot contents read in the same order as the
 * legend and never reshuffle between recomputes.
 */
export function assembleMergedSlot(
  pathIds: readonly string[],
  candidates: readonly MergedSlotCandidate[],
): MergedSlotAssembly {
  const byPathId = new Map(
    candidates.map((candidate) => [candidate.pathId, candidate]),
  )
  const present = pathIds
    .map((pathId) => byPathId.get(pathId))
    .filter((candidate): candidate is MergedSlotCandidate => candidate !== undefined)

  if (present.length === 0) return { kind: 'empty' }

  // Equal-signature candidates collapse into ONE drawn cell whatever the
  // slot's kind — two paths that say the same words never stack two copies.
  const groups = [
    ...groupBy(present, (candidate) => candidate.signature).values(),
  ]

  const allPresent = present.length === pathIds.length
  if (allPresent && groups.length === 1) {
    return { kind: 'shared', representative: toSubCell(groups[0]) }
  }
  return { kind: 'split', subCells: groups.map(toSubCell) }
}

function toSubCell(group: readonly MergedSlotCandidate[]): MergedSubCell {
  const [drawn, ...rest] = group
  return {
    pathId: drawn.pathId,
    stepId: drawn.stepId,
    cellIds: drawn.cellIds,
    pathIds: group.map((candidate) => candidate.pathId),
    hidden: rest.map((candidate) => ({
      pathId: candidate.pathId,
      stepId: candidate.stepId,
      cellIds: candidate.cellIds,
    })),
  }
}

/**
 * Short per-path labels for the sub-cell rails — word initials ("Happy
 * Path" → HP), uppercased, deduplicated with a 1-based ordinal suffix so
 * two paths never share a label (the rail carries colour + dash too, but
 * the label must still be readable on its own).
 */
export function buildComparePathShortLabels(
  paths: ReadonlyArray<{ id: string; name: string }>,
): Map<string, string> {
  const labels = new Map<string, string>()
  const used = new Set<string>()
  paths.forEach((path, index) => {
    const initials = path.name
      .split(/\s+/)
      .map((word) => word.replace(/[^\p{L}\p{N}]/gu, '').charAt(0))
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 3)
    const base = initials || `P${index + 1}`
    let label = base
    if (used.has(label)) label = `${base}${index + 1}`
    used.add(label)
    labels.set(path.id, label)
  })
  return labels
}

/**
 * How each path's dependency arrows map onto what the merged grid actually
 * renders.
 *
 * A shared slot draws ONE cell, so the other paths' cell ids have no DOM
 * anchor: their arrows would silently vanish at the overlay's
 * `querySelector`. Both fixes happen here, at the data level (the same
 * discipline as every other data-level arrow rule):
 *
 * - `aliasByCellId` rewrites a hidden path's cell id to the id that is
 *   drawn, so the arrow anchors on the shared cell.
 * - `sharedCellIds` lets a caller drop an arrow whose BOTH endpoints are
 *   shared from every path but the first — one arrow between two shared
 *   cells belongs to every path, so drawing it N times just stacks N
 *   identical strokes with only the last one visible.
 */
export type MergedArrowRemap = {
  readonly aliasByCellId: ReadonlyMap<string, string>
  readonly sharedCellIds: ReadonlySet<string>
}

export function buildMergedArrowRemap(
  assemblies: Iterable<MergedSlotAssembly>,
): MergedArrowRemap {
  const aliasByCellId = new Map<string, string>()
  const sharedCellIds = new Set<string>()
  const aliasGroup = (group: MergedSubCell, markShared: boolean) => {
    const drawn = group.cellIds
    if (markShared) for (const cellId of drawn) sharedCellIds.add(cellId)
    for (const hidden of group.hidden) {
      hidden.cellIds.forEach((cellId, index) => {
        // Index-wise where the multiset lines up (equal signature ⇒ equal
        // count), else onto the drawn slot's first cell.
        aliasByCellId.set(cellId, drawn[index] ?? drawn[0])
        if (markShared) sharedCellIds.add(cellId)
      })
    }
  }
  for (const assembly of assemblies) {
    if (assembly.kind === 'shared') {
      aliasGroup(assembly.representative, true)
    } else if (assembly.kind === 'split') {
      // Subset-shared groups alias too (their hidden cells have no DOM
      // anchor), but only FULLY-shared cells join `sharedCellIds` — the
      // "draw a wholly-shared arrow once" rule is about arrows every path
      // owns, and a subset's arrow still belongs to each member.
      for (const group of assembly.subCells) aliasGroup(group, false)
    }
  }
  return { aliasByCellId, sharedCellIds }
}

/**
 * Rewrite one path's dependencies for the merged canvas: endpoints on hidden
 * shared cells move to the cell that is drawn, and a wholly-shared arrow
 * survives only for the primary path.
 */
export function remapMergedPathDependencies(
  dependencies: readonly IntegratedBlueprintDependency[],
  remap: MergedArrowRemap,
  isPrimaryPath: boolean,
): IntegratedBlueprintDependency[] {
  const result: IntegratedBlueprintDependency[] = []
  for (const dependency of dependencies) {
    const sourceShared = remap.sharedCellIds.has(dependency.source_cell_id)
    const targetShared = remap.sharedCellIds.has(dependency.target_cell_id)
    if (sourceShared && targetShared && !isPrimaryPath) continue
    const source =
      remap.aliasByCellId.get(dependency.source_cell_id) ?? dependency.source_cell_id
    const target =
      remap.aliasByCellId.get(dependency.target_cell_id) ?? dependency.target_cell_id
    result.push(
      source === dependency.source_cell_id && target === dependency.target_cell_id
        ? dependency
        : { ...dependency, source_cell_id: source, target_cell_id: target },
    )
  }
  return result
}
