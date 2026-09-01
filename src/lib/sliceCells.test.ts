import { describe, expect, it } from 'vitest'
import { getBlueprintFallback, SAMPLE_SCENARIO_ID } from '@/data/blueprintFallbacks'
import { FALLBACK_SLICES, FALLBACK_SLICE_ITEMS } from '@/data/sliceFallbacks'
import {
  findFallbackScenarioForCells,
  pickBlueprintForCells,
  resolveSliceCells,
} from '@/lib/sliceCells'
import type { BlueprintData } from '@/types/blueprint'
import type { Slide } from '@/types/database'

const item = (
  position: number,
  cellIds: string[],
): Slide =>
  ({
    id: `item-${position}`,
    slice_id: 'slice-1',
    position,
    cell_ids: cellIds,
    cell_keys: cellIds.map((id) => `key-${id}`),
    title: null,
    narrative: null,
    illustration: null,
    created_at: '',
    updated_at: '',
  }) as Slide

const blueprint: BlueprintData = {
  path: {
    id: 'p-1',
    name: 'Happy',
    summary: null,
    note: null,
    kind: 'happy',
  },
  lanes: [{ id: 'l-1', name: 'Lane', role: null, position: 0 }],
  steps: [
    { id: 'st-1', name: 'One', position: 1 },
    { id: 'st-2', name: 'Two', position: 2 },
  ],
  cells: [
    {
      id: 'c-1',
      lane_id: 'l-1',
      step_id: 'st-1',
      content: 'first',
      frame: null,
      summary: null,
      links: [],
    },
    {
      id: 'c-2',
      lane_id: 'l-1',
      step_id: 'st-2',
      content: 'second',
      frame: null,
      summary: null,
      links: [],
    },
  ],
  triggers: [],
} as unknown as BlueprintData

describe('resolveSliceCells', () => {
  it('numbers members 1-based across position-sorted frames', () => {
    const resolution = resolveSliceCells(blueprint, [
      item(2, ['c-2']),
      item(1, ['c-1']),
    ])
    expect(resolution.sequenceByCellId.get('c-1')).toBe(1)
    expect(resolution.sequenceByCellId.get('c-2')).toBe(2)
    expect(resolution.missingCellIds).toEqual([])
    expect(resolution.memberCellIds.has('c-1')).toBe(true)
  })

  it('skips dangling ids as tombstones without burning a sequence number', () => {
    const resolution = resolveSliceCells(blueprint, [
      item(1, ['gone', 'c-1']),
    ])
    expect(resolution.missingCellIds).toEqual(['gone'])
    expect(resolution.sequenceByCellId.get('c-1')).toBe(1)
  })
})

describe('pickBlueprintForCells', () => {
  it('picks the blueprint holding the most of the cells', () => {
    const other = {
      ...blueprint,
      path: { ...blueprint.path, id: 'p-2' },
      cells: blueprint.cells.slice(0, 1),
    }
    expect(pickBlueprintForCells([other, blueprint], ['c-1', 'c-2'])).toBe(
      blueprint,
    )
    expect(pickBlueprintForCells([other], ['nope'])).toBeNull()
  })
})

describe('bundled demo slices', () => {
  it('every demo slice resolves onto a registered sample scenario', () => {
    // The meta-blueprint ships three demo slices — a journey over the
    // first-run scenario, a step down the mapping scenario's import column,
    // and a lane across the first-run terminal row — and each must land on
    // exactly one registered fallback scenario.
    for (const slice of FALLBACK_SLICES) {
      const items = FALLBACK_SLICE_ITEMS[slice.id] ?? []
      const cellIds = items.flatMap((entry) => entry.cell_ids)
      expect(cellIds.length).toBeGreaterThan(0)
      expect(findFallbackScenarioForCells(cellIds)).not.toBeNull()
    }
  })

  it('the journey slice lives on the primary (compare-demo) scenario', () => {
    const journey = FALLBACK_SLICES.find((slice) => slice.kind === 'journey')
    expect(journey).toBeDefined()
    const cellIds = (FALLBACK_SLICE_ITEMS[journey!.id] ?? []).flatMap(
      (entry) => entry.cell_ids,
    )
    expect(findFallbackScenarioForCells(cellIds)).toBe(SAMPLE_SCENARIO_ID)
  })

  it('no demo slice carries a dangling cell id', () => {
    for (const slice of FALLBACK_SLICES) {
      const items = FALLBACK_SLICE_ITEMS[slice.id] ?? []
      const cellIds = items.flatMap((entry) => entry.cell_ids)
      const scenarioId = findFallbackScenarioForCells(cellIds)
      expect(scenarioId).not.toBeNull()
      // The scenario's default path: every demo slice is authored on it, so
      // opening one in the focus view needs no path change first.
      const fallback = getBlueprintFallback(scenarioId!)
      expect(fallback).not.toBeNull()
      const resolution = resolveSliceCells(fallback, items)
      expect(resolution.missingCellIds).toEqual([])
    }
  })
})
