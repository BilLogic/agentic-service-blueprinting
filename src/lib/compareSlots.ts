import { groupBy } from '@/lib/utils'
import type { BlueprintData } from '@/types/blueprint'
import { cellResources } from '@/lib/cellResources'
import { cellTouchpoints } from '@/lib/cellTouchpoints'

/**
 * Compare v3's single source of truth: slot-level comparison records for
 * ≥2 paths of one scenario, consumed by the stacked column highlight
 * (`columns`), the difference ledger (`slots`), the divergence strip and
 * the (gated) merged branch canvas (`runs`), and the fly-to pulse
 * (`cellStatus`).
 *
 * Matching grammar (carried forward from the retired comparePathCells):
 * steps align across paths by normalized name, paired by occurrence
 * order; lanes align by normalized name; a slot's signature is the
 * sorted multiset of its cells' compared fields. All paths present and
 * equal ⇒ `shared`; exactly one path present ⇒ `only`; anything else ⇒
 * `divergent`.
 *
 * Normalization is deliberately wider than trim+lowercase: punctuation
 * and leading articles are stripped, because duplicate-then-edit paths
 * accumulate quote/period/article-only renames that would otherwise
 * fabricate phantom remove+add column pairs (and, in merged view, false
 * topology). A near-match pass pairs the remaining single-path columns
 * whose names token-overlap strongly (2-path compare only).
 */

export const COMPARE_FIELDS = [
  'content',
  'summary',
  'resources',
  'touchpoints',
] as const
export type CompareField = (typeof COMPARE_FIELDS)[number]

/** Moves here from types/integratedBlueprint (which re-exports during migration). */
export type CompareStatus = 'shared' | 'divergent' | 'only'

export type CompareSlotPathEntry =
  | {
      present: true
      /** Non-empty by construction: present ⇒ at least one cell. */
      cellIds: [string, ...string[]]
      /** Display texts (trimmed contents, sorted) for ledger quoting. */
      contents: [string, ...string[]]
      /** Full multiset signature over COMPARE_FIELDS. */
      signature: string
      /** Per-field multiset signatures (drives `differingFields`). */
      fieldSignatures: Readonly<Record<CompareField, string>>
    }
  | { present: false }

export interface CompareSlot {
  readonly slotKey: string
  readonly columnKey: string
  readonly laneKey: string
  /** Display labels from the first path that has them. */
  readonly laneLabel: string
  readonly columnLabel: string
  readonly verdict: CompareStatus
  readonly perPath: Readonly<Record<string, CompareSlotPathEntry>>
  /** Fields whose values differ across present paths; empty for shared/only. */
  readonly differingFields: readonly CompareField[]
}

export interface CompareColumn {
  readonly columnKey: string
  readonly label: string
  readonly perPathPresent: Readonly<Record<string, boolean>>
  /** Each present path's step id backing this canonical column — the stacked
   *  grid places cells with it; absent paths are simply missing. */
  readonly stepIdByPath: Readonly<Record<string, string>>
  readonly verdict: CompareStatus
  /** Path ids grouped by equal column-level signature; absent paths form their own group. */
  readonly agreementGroups: ReadonlyArray<readonly string[]>
}

export interface CompareRun {
  readonly kind: 'shared' | 'divergent'
  readonly columnKeys: readonly string[]
}

export interface CompareModel {
  /** Ordered by canonical column, then lane row order — a tested invariant. */
  readonly slots: readonly CompareSlot[]
  readonly columns: readonly CompareColumn[]
  readonly runs: readonly CompareRun[]
  /** Per real cell id — fly-pulse + agent serialization, never ambient paint. */
  readonly cellStatus: Readonly<Record<string, CompareStatus>>
}

/** ≥2 paths is a compile-time contract; the compare surfaces only mount past the toggle gate. */
export type CompareBlueprints = [BlueprintData, BlueprintData, ...BlueprintData[]]

/**
 * Taxonomy V7 — a divergence with no canvas zone: every path present,
 * content identical, only summary, resources or touchpoints differ. Slot verdict stays
 * `divergent` (the ledger's "Detail-only differences" group and the `[≠ N]`
 * count include it), but the CANVAS must not mark it: the fork condition is
 * "content differs OR presence differs", so column verdicts and runs treat
 * a detail-only slot as agreement.
 */
export function isDetailOnlyCompareSlot(slot: CompareSlot): boolean {
  return (
    slot.verdict === 'divergent' &&
    !slot.differingFields.includes('content') &&
    Object.values(slot.perPath).every((entry) => entry.present)
  )
}

const KEY_SEPARATOR = '\u0000'

/** Lane/column composite key. Never a printable separator — lane names may contain anything. */
export function makeSlotKey(laneKey: string, columnKey: string): string {
  return `${laneKey}${KEY_SEPARATOR}${columnKey}`
}

const ARTICLES = /\b(?:the|a|an)\b/g
const PUNCTUATION = /[.,;:!?'"‘’“”()[\]{}\-–—/\\]+/g

/**
 * Alignment normalization: lowercase, strip punctuation and articles,
 * collapse whitespace. Pinned by tests on a deployment's real rename cases
 * (quote-only, trailing-period, and dropped-"the" step renames), which
 * would otherwise fabricate phantom remove+add column pairs.
 */
export function normalizeCompareName(name: string): string {
  return name
    .toLowerCase()
    .replace(PUNCTUATION, ' ')
    .replace(ARTICLES, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Token-set Jaccard similarity for the near-match rename pass. */
function tokenSimilarity(a: string, b: string): number {
  const ta = new Set(a.split(' ').filter(Boolean))
  const tb = new Set(b.split(' ').filter(Boolean))
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const token of ta) if (tb.has(token)) shared += 1
  return shared / (ta.size + tb.size - shared)
}

const NEAR_MATCH_THRESHOLD = 0.8

type ColumnSeed = {
  key: string
  label: string
  /** path id -> that path's step id for this column */
  stepIdByPath: Map<string, string>
}

/**
 * Canonical column axis: exact name#occurrence alignment first, other
 * paths' unmatched columns inserted after their nearest matched
 * predecessor (not appended at the end — a path-B-only step belongs next
 * to its neighbours). Then, for 2-path compares, a greedy in-order
 * near-match pass merges leftover single-path column pairs whose names
 * token-overlap ≥ 0.8 — a rename, not an add+remove.
 */
function buildColumnSeeds(blueprints: readonly BlueprintData[]): ColumnSeed[] {
  const seeds: ColumnSeed[] = []
  const seedByKey = new Map<string, ColumnSeed>()

  blueprints.forEach((blueprint, blueprintIndex) => {
    const seen = new Map<string, number>()
    let lastMatchedIndex = -1
    const orderedSteps = [...blueprint.steps].sort(
      (a, b) => a.position - b.position,
    )
    for (const step of orderedSteps) {
      const name = normalizeCompareName(step.name)
      const occurrence = seen.get(name) ?? 0
      seen.set(name, occurrence + 1)
      const key = `${name}#${occurrence}`
      const existing = seedByKey.get(key)
      if (existing) {
        existing.stepIdByPath.set(blueprint.path.id, step.id)
        lastMatchedIndex = seeds.indexOf(existing)
        continue
      }
      const seed: ColumnSeed = {
        key,
        label: step.name.trim(),
        stepIdByPath: new Map([[blueprint.path.id, step.id]]),
      }
      if (blueprintIndex === 0) {
        seeds.push(seed)
        lastMatchedIndex = seeds.length - 1
      } else {
        seeds.splice(lastMatchedIndex + 1, 0, seed)
        lastMatchedIndex += 1
      }
      seedByKey.set(key, seed)
    }
  })

  if (blueprints.length === 2) {
    const [pathA, pathB] = [blueprints[0].path.id, blueprints[1].path.id]
    const onlyA = seeds.filter(
      (seed) => seed.stepIdByPath.has(pathA) && !seed.stepIdByPath.has(pathB),
    )
    const onlyB = seeds.filter(
      (seed) => seed.stepIdByPath.has(pathB) && !seed.stepIdByPath.has(pathA),
    )
    const claimed = new Set<ColumnSeed>()
    for (const seedA of onlyA) {
      const nameA = seedA.key.slice(0, seedA.key.lastIndexOf('#'))
      let best: { seed: ColumnSeed; score: number } | null = null
      for (const seedB of onlyB) {
        if (claimed.has(seedB)) continue
        const nameB = seedB.key.slice(0, seedB.key.lastIndexOf('#'))
        const score = tokenSimilarity(nameA, nameB)
        if (score >= NEAR_MATCH_THRESHOLD && (!best || score > best.score)) {
          best = { seed: seedB, score }
        }
      }
      if (!best) continue
      claimed.add(best.seed)
      const stepIdB = best.seed.stepIdByPath.get(pathB)
      if (stepIdB !== undefined) seedA.stepIdByPath.set(pathB, stepIdB)
      seeds.splice(seeds.indexOf(best.seed), 1)
    }
  }

  return seeds
}

function multisetSignature(values: readonly string[]): string {
  return [...values].sort().join(KEY_SEPARATOR)
}

/**
 * Two signatures where there was one, because the column they read is now two
 * tables. A slot whose resources match but whose touchpoint prose does not is
 * a real difference, and the single `links` signature said only that
 * "something in that column" moved.
 */
function resourceSignature(cell: BlueprintData['cells'][number]): string {
  return cellResources(cell)
    .map((resource) => `${resource.kind}${KEY_SEPARATOR}${resource.name}${KEY_SEPARATOR}${resource.url ?? ''}`)
    .sort()
    .join(KEY_SEPARATOR)
}

function touchpointSignature(cell: BlueprintData['cells'][number]): string {
  return cellTouchpoints(cell)
    .map(
      (placement) =>
        // What the placement points at is in the cell's resources, which
        // `resourceSignature` already covers.
        `${placement.name}${KEY_SEPARATOR}${placement.summary ?? ''}` +
        `${KEY_SEPARATOR}${placement.role ?? ''}`,
    )
    .sort()
    .join(KEY_SEPARATOR)
}

export function buildCompareModel(blueprints: CompareBlueprints): CompareModel {
  const columnSeeds = buildColumnSeeds(blueprints)
  const columnIndexByKey = new Map(columnSeeds.map((seed, index) => [seed.key, index]))

  // Lane axis: union of lanes across paths by normalized name, ordered by
  // first appearance (position within each path).
  type LaneSeed = { key: string; label: string }
  const laneSeeds: LaneSeed[] = []
  const laneIndexByKey = new Map<string, number>()
  const laneKeyByPathLane = new Map<string, string>()
  for (const blueprint of blueprints) {
    const orderedLanes = [...blueprint.lanes].sort(
      (a, b) => a.position - b.position,
    )
    for (const lane of orderedLanes) {
      const key = normalizeCompareName(lane.name)
      laneKeyByPathLane.set(`${blueprint.path.id}:${lane.id}`, key)
      if (!laneIndexByKey.has(key)) {
        laneIndexByKey.set(key, laneSeeds.length)
        laneSeeds.push({ key, label: lane.name.trim() })
      }
    }
  }

  const columnKeyByPathStep = new Map<string, string>()
  for (const seed of columnSeeds) {
    for (const [pathId, stepId] of seed.stepIdByPath) {
      columnKeyByPathStep.set(`${pathId}:${stepId}`, seed.key)
    }
  }

  // Gather cells into slots.
  type SlotCells = Map<string /*pathId*/, BlueprintData['cells'][number][]>
  const slotCells = new Map<string /*slotKey*/, SlotCells>()
  const slotMeta = new Map<string, { laneKey: string; columnKey: string }>()
  for (const blueprint of blueprints) {
    for (const cell of blueprint.cells) {
      const columnKey = columnKeyByPathStep.get(`${blueprint.path.id}:${cell.step_id}`)
      const laneKey = laneKeyByPathLane.get(`${blueprint.path.id}:${cell.lane_id}`)
      if (!columnKey || !laneKey) continue
      const slotKey = makeSlotKey(laneKey, columnKey)
      let perPath = slotCells.get(slotKey)
      if (!perPath) {
        perPath = new Map()
        slotCells.set(slotKey, perPath)
        slotMeta.set(slotKey, { laneKey, columnKey })
      }
      const list = perPath.get(blueprint.path.id)
      if (list) list.push(cell)
      else perPath.set(blueprint.path.id, [cell])
    }
  }

  const pathIds = blueprints.map((blueprint) => blueprint.path.id)
  const pathCount = pathIds.length

  const slots: CompareSlot[] = []
  const cellStatus: Record<string, CompareStatus> = {}

  for (const [slotKey, perPathCells] of slotCells) {
    const meta = slotMeta.get(slotKey)
    if (!meta) continue
    const perPath: Record<string, CompareSlotPathEntry> = {}
    for (const pathId of pathIds) {
      const cells = perPathCells.get(pathId)
      if (!cells || cells.length === 0) {
        perPath[pathId] = { present: false }
        continue
      }
      const contents = cells.map((cell) => cell.content.trim()).sort() as [
        string,
        ...string[],
      ]
      const fieldSignatures: Record<CompareField, string> = {
        content: multisetSignature(cells.map((cell) => cell.content.trim())),
        summary: multisetSignature(
          cells.map((cell) => (cell.summary ?? '').trim()),
        ),
        resources: multisetSignature(cells.map(resourceSignature)),
        touchpoints: multisetSignature(cells.map(touchpointSignature)),
      }
      perPath[pathId] = {
        present: true,
        cellIds: cells.map((cell) => cell.id) as [string, ...string[]],
        contents,
        signature: COMPARE_FIELDS.map((field) => fieldSignatures[field]).join(
          KEY_SEPARATOR,
        ),
        fieldSignatures,
      }
    }

    const presentEntries = Object.values(perPath).filter(
      (entry): entry is Extract<CompareSlotPathEntry, { present: true }> =>
        entry.present,
    )
    let verdict: CompareStatus
    if (presentEntries.length === 1) {
      verdict = 'only'
    } else {
      const allPresent = presentEntries.length === pathCount
      const allEqual = presentEntries.every(
        (entry) => entry.signature === presentEntries[0].signature,
      )
      verdict = allPresent && allEqual ? 'shared' : 'divergent'
    }

    const differingFields: CompareField[] = []
    // `divergent` implies at least two present entries: a slot exists only
    // because a cell was inserted into it, so it can never be empty, and the
    // single-entry case returned `'only'` above.
    //
    // The `&& presentEntries.length > 1` that used to guard this line was
    // therefore dead. It was kept once on the belief that `every` over an
    // empty array would carry an empty slot into this branch — true of `every`,
    // but an empty slot cannot be constructed.
    if (verdict === 'divergent') {
      for (const field of COMPARE_FIELDS) {
        const first = presentEntries[0].fieldSignatures[field]
        if (presentEntries.some((entry) => entry.fieldSignatures[field] !== first)) {
          differingFields.push(field)
        }
      }
    }

    const columnSeed = columnSeeds[columnIndexByKey.get(meta.columnKey) ?? 0]
    const laneSeed = laneSeeds[laneIndexByKey.get(meta.laneKey) ?? 0]
    slots.push({
      slotKey,
      columnKey: meta.columnKey,
      laneKey: meta.laneKey,
      laneLabel: laneSeed?.label ?? meta.laneKey,
      columnLabel: columnSeed?.label ?? meta.columnKey,
      verdict,
      perPath,
      differingFields,
    })

    for (const entry of presentEntries) {
      for (const cellId of entry.cellIds) cellStatus[cellId] = verdict
    }
  }

  // Ordering invariant: canonical column order, then lane row order.
  slots.sort((a, b) => {
    const columnDelta =
      (columnIndexByKey.get(a.columnKey) ?? 0) -
      (columnIndexByKey.get(b.columnKey) ?? 0)
    if (columnDelta !== 0) return columnDelta
    return (laneIndexByKey.get(a.laneKey) ?? 0) - (laneIndexByKey.get(b.laneKey) ?? 0)
  })

  // Columns: verdict rollup + agreement grouping.
  const slotsByColumn = groupBy(slots, (slot) => slot.columnKey)

  const columns: CompareColumn[] = columnSeeds.map((seed) => {
    const columnSlots = slotsByColumn.get(seed.key) ?? []
    const perPathPresent: Record<string, boolean> = {}
    for (const pathId of pathIds) {
      perPathPresent[pathId] = seed.stepIdByPath.has(pathId)
    }

    const presentPathCount = pathIds.filter((id) => perPathPresent[id]).length
    let verdict: CompareStatus
    if (presentPathCount === 1) {
      verdict = 'only'
    } else if (
      presentPathCount === pathCount &&
      columnSlots.every(
        (slot) => slot.verdict === 'shared' || isDetailOnlyCompareSlot(slot),
      )
    ) {
      verdict = 'shared'
    } else {
      verdict = 'divergent'
    }

    // Column signature per path: joined lane->signature pairs; absent
    // paths group together under a distinct absence marker.
    const agreementGroups = [
      ...groupBy(pathIds, (pathId) =>
        perPathPresent[pathId]
          ? columnSlots
              .map((slot) => {
                const entry = slot.perPath[pathId]
                return `${slot.laneKey}=${entry?.present ? entry.signature : ''}`
              })
              .join(KEY_SEPARATOR)
          : `${KEY_SEPARATOR}absent`,
      ).values(),
    ]

    return {
      columnKey: seed.key,
      label: seed.label,
      perPathPresent,
      stepIdByPath: Object.fromEntries(seed.stepIdByPath),
      verdict,
      agreementGroups,
    }
  })

  // Runs: maximal stretches of same-kind columns; only/divergent both count
  // as divergent (an all-only column is itself a divergence site).
  const runs: CompareRun[] = []
  for (const column of columns) {
    const kind: CompareRun['kind'] =
      column.verdict === 'shared' ? 'shared' : 'divergent'
    const last = runs[runs.length - 1]
    if (last && last.kind === kind) {
      ;(last.columnKeys as string[]).push(column.columnKey)
    } else {
      runs.push({ kind, columnKeys: [column.columnKey] })
    }
  }

  return { slots, columns, runs, cellStatus }
}

