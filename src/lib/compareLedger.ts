import {
  isDetailOnlyCompareSlot,
  normalizeCompareName,
  type CompareModel,
  type CompareSlot,
  type CompareStatus,
} from '@/lib/compareSlots'

export { isDetailOnlyCompareSlot }

/**
 * Pure derivations behind the difference ledger and the divergence strip.
 *
 * TWO grains, deliberately:
 *   - ZONES are divergence *runs* (numbered ①②③). They are topology, and
 *     the strip is the only surface that draws them — a run says "the paths
 *     forked here and rejoined there".
 *   - STEP GROUPS are one canonical column each. They are the ledger's
 *     grain and what `jump_divergence` walks: "Steps 3–8" as one accordion
 *     group was a wall, six per-step groups are readable.
 *
 * A step group carries its zone's index so the strip can highlight the
 * segment containing the active step without a second derivation.
 *
 * Plus the detail-only split and the `[Filter ▾]` / `differences_filter`
 * grammar. No DOM, no React — vitest colocated.
 */

export type CompareZone = {
  /** 1-based — the shared ①②③ numbering. */
  index: number
  columnKeys: readonly string[]
  /** 1-based canonical column positions, e.g. "Steps 3–4" / "Step 6". */
  stepRangeLabel: string
  /** First → last column labels, e.g. "Pay → Callback" / "Rate". */
  titleLabel: string
  /** Canvas-difference slots in this zone (detail-only slots excluded). */
  slots: readonly CompareSlot[]
}

/** Ledger rows that render inside numbered zones (order preserved). */
function isZoneCompareSlot(slot: CompareSlot): boolean {
  return slot.verdict !== 'shared' && !isDetailOnlyCompareSlot(slot)
}

/**
 * Divergent runs → numbered zones, left-to-right. Zone slots keep the
 * model's column-then-lane order (a tested invariant upstream).
 */
export function deriveCompareZones(model: CompareModel): CompareZone[] {
  const columnPosition = new Map(
    model.columns.map((column, index) => [column.columnKey, index + 1]),
  )
  const columnLabel = new Map(
    model.columns.map((column) => [column.columnKey, column.label]),
  )

  const zones: CompareZone[] = []
  for (const run of model.runs) {
    if (run.kind !== 'divergent') continue
    const keys = run.columnKeys
    const start = columnPosition.get(keys[0]) ?? 0
    const end = columnPosition.get(keys[keys.length - 1]) ?? start
    const keySet = new Set(keys)
    const firstLabel = columnLabel.get(keys[0]) ?? ''
    const lastLabel = columnLabel.get(keys[keys.length - 1]) ?? firstLabel
    zones.push({
      index: zones.length + 1,
      columnKeys: keys,
      stepRangeLabel: start === end ? `Step ${start}` : `Steps ${start}–${end}`,
      titleLabel:
        firstLabel === lastLabel ? firstLabel : `${firstLabel} → ${lastLabel}`,
      slots: model.slots.filter(
        (slot) => keySet.has(slot.columnKey) && isZoneCompareSlot(slot),
      ),
    })
  }
  return zones
}

export type CompareStepGroup = {
  /** Canonical column key — the group's identity and its filter facet value. */
  columnKey: string
  /** 1-based canonical column position, the "N" in "Step N". */
  step: number
  /** The column's display label, e.g. "Pay". */
  label: string
  /** The group header text, e.g. "Step 2 · Pay". */
  headerLabel: string
  /** 1-based index of the divergence zone (run) this step sits inside. */
  zoneIndex: number
  /** Canvas-difference slots at this column (detail-only slots excluded). */
  slots: readonly CompareSlot[]
}

/**
 * One group per canonical column that has any canvas difference, in
 * canonical column order — the ledger's accordion grain. A column whose only
 * difference is detail-only (description/links) gets NO group: it lives
 * exclusively in the trailing `getDetailOnlyCompareSlots` group, the same V7
 * rule zones follow.
 */
export function deriveCompareStepGroups(model: CompareModel): CompareStepGroup[] {
  // Zone index per column, from the run topology the strip draws.
  const zoneIndexByColumn = new Map<string, number>()
  let zoneIndex = 0
  for (const run of model.runs) {
    if (run.kind !== 'divergent') continue
    zoneIndex += 1
    for (const columnKey of run.columnKeys) {
      zoneIndexByColumn.set(columnKey, zoneIndex)
    }
  }

  const slotsByColumn = new Map<string, CompareSlot[]>()
  for (const slot of model.slots) {
    if (!isZoneCompareSlot(slot)) continue
    const list = slotsByColumn.get(slot.columnKey)
    if (list) list.push(slot)
    else slotsByColumn.set(slot.columnKey, [slot])
  }

  const groups: CompareStepGroup[] = []
  model.columns.forEach((column, index) => {
    const slots = slotsByColumn.get(column.columnKey)
    if (!slots || slots.length === 0) return
    const step = index + 1
    groups.push({
      columnKey: column.columnKey,
      step,
      label: column.label,
      headerLabel: `Step ${step} · ${column.label}`,
      zoneIndex: zoneIndexByColumn.get(column.columnKey) ?? 0,
      slots,
    })
  })
  return groups
}

export function getDetailOnlyCompareSlots(
  model: CompareModel,
): CompareSlot[] {
  return model.slots.filter(isDetailOnlyCompareSlot)
}

/** The menubar Diff pill's number — the comparison's completeness count. */
export function countCompareDifferences(model: CompareModel): number {
  return model.slots.filter((slot) => slot.verdict !== 'shared').length
}

export type CompareLedgerFilter = {
  /** Normalized lane keys; empty = all lanes. */
  lanes: readonly string[]
  /** Verdicts to keep; empty = all. */
  verdicts: readonly CompareStatus[]
  /** Canonical columnKeys; empty = all steps. */
  steps: readonly string[]
}

export const EMPTY_COMPARE_LEDGER_FILTER: CompareLedgerFilter = {
  lanes: [],
  verdicts: [],
  steps: [],
}

export type ParsedCompareLedgerFilter = {
  lanes: readonly string[]
  verdicts: readonly CompareStatus[]
  /**
   * Normalized STEP NAMES, not columnKeys — a columnKey carries an
   * occurrence suffix the grammar cannot know. Hand these to
   * `resolveCompareStepKeys` with the live model to get the filter values.
   */
  stepNames: readonly string[]
  /** Tokens the grammar rejected — callers report these verbatim. */
  errors: readonly string[]
}

const FILTER_TOKEN = /(lane|verdict|step):(?:"([^"]*)"|(\S+))/g
const FILTER_VERDICTS = new Set<CompareStatus>(['divergent', 'only'])

/**
 * The `differences_filter` mini-grammar: whitespace-separated
 * `lane:"Front Stage"` / `lane:frontstage` / `verdict:divergent` /
 * `step:"Pay"` tokens, multi-select per key; an empty string clears the
 * filter. Lane and step values are matched through the same normalization
 * the compare model aligns its axes with, so an agent may quote the display
 * label or the key.
 */
export function parseCompareLedgerFilter(
  input: string,
): ParsedCompareLedgerFilter {
  const lanes: string[] = []
  const verdicts: CompareStatus[] = []
  const stepNames: string[] = []
  const errors: string[] = []

  for (const match of input.matchAll(FILTER_TOKEN)) {
    const key = match[1]
    const value = (match[2] ?? match[3] ?? '').trim()
    if (key === 'lane' || key === 'step') {
      const normalized = normalizeCompareName(value)
      const bucket = key === 'lane' ? lanes : stepNames
      if (!normalized) errors.push(match[0])
      else if (!bucket.includes(normalized)) bucket.push(normalized)
      continue
    }
    const verdict = value.toLowerCase() as CompareStatus
    if (FILTER_VERDICTS.has(verdict)) {
      if (!verdicts.includes(verdict)) verdicts.push(verdict)
    } else {
      errors.push(match[0])
    }
  }

  // Anything left after removing matched tokens is an unparseable token.
  const leftovers = input
    .replace(FILTER_TOKEN, '')
    .split(/\s+/)
    .filter(Boolean)
  errors.push(...leftovers)

  return { lanes, verdicts, stepNames, errors }
}

/**
 * Grammar step names → canonical columnKeys. A repeated step label matches
 * every occurrence (the model disambiguates columns by a `#n` suffix the
 * agent has no way to spell); names that match nothing come back as
 * `unknown` so the caller can refuse the whole filter.
 */
export function resolveCompareStepKeys(
  model: CompareModel,
  stepNames: readonly string[],
): { steps: string[]; unknown: string[] } {
  const steps: string[] = []
  const unknown: string[] = []
  for (const name of stepNames) {
    const matches = model.columns.filter(
      (column) => normalizeCompareName(column.label) === name,
    )
    if (matches.length === 0) {
      unknown.push(name)
      continue
    }
    for (const column of matches) {
      if (!steps.includes(column.columnKey)) steps.push(column.columnKey)
    }
  }
  return { steps, unknown }
}

/** Apply a ledger filter; empty facets pass everything. */
export function filterCompareSlots<T extends CompareSlot>(
  slots: readonly T[],
  filter: CompareLedgerFilter,
): T[] {
  return slots.filter((slot) => {
    if (filter.lanes.length > 0 && !filter.lanes.includes(slot.laneKey)) {
      return false
    }
    if (
      filter.verdicts.length > 0 &&
      !filter.verdicts.includes(slot.verdict)
    ) {
      return false
    }
    if (filter.steps.length > 0 && !filter.steps.includes(slot.columnKey)) {
      return false
    }
    return true
  })
}

/** How many facet values are active — the `[Filter ▾]` badge number. */
export function countActiveCompareFilters(filter: CompareLedgerFilter): number {
  return filter.lanes.length + filter.verdicts.length + filter.steps.length
}

/**
 * The fly-to target list for one ledger row: every present cell across
 * paths, first present path's first cell leading (the camera flies to the
 * first id; the rest pulse as counterparts).
 */
export function compareSlotFocusCellIds(slot: CompareSlot): string[] {
  const ids: string[] = []
  for (const entry of Object.values(slot.perPath)) {
    if (entry.present) ids.push(...entry.cellIds)
  }
  return ids
}

/**
 * The fly-to target list for one step group: every differing cell at that
 * column, across paths and lanes. The camera flies to the first; the rest
 * pulse as counterparts, so opening a step group lights the whole step.
 */
export function compareStepFocusCellIds(group: CompareStepGroup): string[] {
  return group.slots.flatMap(compareSlotFocusCellIds)
}
