import { describe, expect, it } from 'vitest'
import {
  assembleMergedSlot,
  buildComparePathShortLabels,
  buildMergedArrowRemap,
  remapMergedPathTriggers,
  type MergedSlotAssembly,
  type MergedSlotCandidate,
} from '@/lib/compareMergedGrid'
import type { IntegratedBlueprintTrigger } from '@/types/integratedBlueprint'

const candidate = (
  pathId: string,
  signature: string,
  cellIds: string[] = [`${pathId}-cell`],
): MergedSlotCandidate => ({
  pathId,
  stepId: `${pathId}-step`,
  cellIds,
  signature,
})

describe('assembleMergedSlot', () => {
  it('draws one cell when every path agrees', () => {
    const assembly = assembleMergedSlot(
      ['a', 'b'],
      [candidate('a', 'ask student to share'), candidate('b', 'ask student to share')],
    )
    expect(assembly.kind).toBe('shared')
    if (assembly.kind !== 'shared') return
    expect(assembly.representative.pathId).toBe('a')
    expect(assembly.representative.pathIds).toEqual(['a', 'b'])
    expect(assembly.representative.hidden.map((entry) => entry.pathId)).toEqual([
      'b',
    ])
  })

  it('stacks every present path when they disagree', () => {
    const assembly = assembleMergedSlot(
      ['a', 'b'],
      [candidate('a', 'checks all students'), candidate('b', 'manually assigns')],
    )
    expect(assembly.kind).toBe('split')
    if (assembly.kind !== 'split') return
    expect(assembly.subCells.map((entry) => entry.pathId)).toEqual(['a', 'b'])
  })

  it('treats a slot only one path has as a split of one', () => {
    const assembly = assembleMergedSlot(['a', 'b'], [candidate('b', 'extra step')])
    expect(assembly.kind).toBe('split')
    if (assembly.kind !== 'split') return
    expect(assembly.subCells).toHaveLength(1)
    expect(assembly.subCells[0].pathId).toBe('b')
  })

  it('keeps a subset agreement divergent but draws it as ONE labelled cell', () => {
    // Presence is half the fork condition: two of three paths agreeing is
    // still a divergence (the slot stays split, so it wears labels). But the
    // agreeing subset never stacks two copies of the same words — one drawn
    // cell carries both member paths.
    const assembly = assembleMergedSlot(
      ['a', 'b', 'c'],
      [candidate('a', 'same'), candidate('b', 'same')],
    )
    expect(assembly.kind).toBe('split')
    if (assembly.kind !== 'split') return
    expect(assembly.subCells).toHaveLength(1)
    expect(assembly.subCells[0].pathIds).toEqual(['a', 'b'])
    expect(assembly.subCells[0].pathId).toBe('a')
    expect(assembly.subCells[0].hidden.map((entry) => entry.pathId)).toEqual([
      'b',
    ])
  })

  it('is empty when no path has anything', () => {
    expect(assembleMergedSlot(['a', 'b'], []).kind).toBe('empty')
  })

  it('orders sub-cells by path selection order, not candidate order', () => {
    const assembly = assembleMergedSlot(
      ['a', 'b', 'c'],
      [candidate('c', 'z'), candidate('a', 'x'), candidate('b', 'y')],
    )
    expect(assembly.kind).toBe('split')
    if (assembly.kind !== 'split') return
    expect(assembly.subCells.map((entry) => entry.pathId)).toEqual(['a', 'b', 'c'])
  })

  it('ignores candidates for paths that are not compared', () => {
    const assembly = assembleMergedSlot(
      ['a', 'b'],
      [candidate('a', 'same'), candidate('b', 'same'), candidate('ghost', 'other')],
    )
    expect(assembly.kind).toBe('shared')
  })
})

describe('buildComparePathShortLabels', () => {
  it('uses word initials', () => {
    const labels = buildComparePathShortLabels([
      { id: '1', name: 'Happy Path' },
      { id: '2', name: 'Alternate Path' },
    ])
    expect(labels.get('1')).toBe('HP')
    expect(labels.get('2')).toBe('AP')
  })

  it('disambiguates colliding initials', () => {
    const labels = buildComparePathShortLabels([
      { id: '1', name: 'Happy Path' },
      { id: '2', name: 'Hidden Payment' },
    ])
    expect(labels.get('1')).toBe('HP')
    expect(labels.get('2')).toBe('HP2')
  })

  it('falls back for names with no letters', () => {
    const labels = buildComparePathShortLabels([{ id: '1', name: '—' }])
    expect(labels.get('1')).toBe('P1')
  })
})

describe('buildMergedArrowRemap', () => {
  const assemblies: MergedSlotAssembly[] = [
    {
      kind: 'shared',
      representative: {
        pathId: 'a',
        stepId: 's1',
        cellIds: ['a1'],
        pathIds: ['a', 'b'],
        hidden: [{ pathId: 'b', stepId: 's1b', cellIds: ['b1'] }],
      },
    },
    {
      kind: 'split',
      subCells: [
        { pathId: 'a', stepId: 's2', cellIds: ['a2'], pathIds: ['a'], hidden: [] },
        { pathId: 'b', stepId: 's2b', cellIds: ['b2'], pathIds: ['b'], hidden: [] },
      ],
    },
  ]

  it('aliases hidden shared cells onto the drawn cell', () => {
    const remap = buildMergedArrowRemap(assemblies)
    expect(remap.aliasByCellId.get('b1')).toBe('a1')
    expect(remap.aliasByCellId.has('a1')).toBe(false)
    expect([...remap.sharedCellIds].sort()).toEqual(['a1', 'b1'])
  })

  it('rewrites a hidden endpoint so the arrow still anchors', () => {
    const remap = buildMergedArrowRemap(assemblies)
    const triggers: IntegratedBlueprintTrigger[] = [
      {
        id: 't1',
        source_cell_id: 'b1',
        target_cell_id: 'b2',
        path_id: 'b',
        path_type: 'alternative',
        opacity: 1,
      },
    ]
    const [remapped] = remapMergedPathTriggers(triggers, remap, false)
    expect(remapped.source_cell_id).toBe('a1')
    expect(remapped.target_cell_id).toBe('b2')
  })

  it('draws a wholly-shared arrow once, for the primary path only', () => {
    const remap = buildMergedArrowRemap([
      {
        kind: 'shared',
        representative: {
          pathId: 'a',
          stepId: 's1',
          cellIds: ['a1'],
          pathIds: ['a', 'b'],
          hidden: [{ pathId: 'b', stepId: 's1b', cellIds: ['b1'] }],
        },
      },
      {
        kind: 'shared',
        representative: {
          pathId: 'a',
          stepId: 's2',
          cellIds: ['a2'],
          pathIds: ['a', 'b'],
          hidden: [{ pathId: 'b', stepId: 's2b', cellIds: ['b2'] }],
        },
      },
    ])
    const trigger = (pathId: string, source: string, target: string) => ({
      id: `${pathId}-t`,
      source_cell_id: source,
      target_cell_id: target,
      path_id: pathId,
      path_type: 'happy' as const,
      opacity: 1,
    })
    expect(
      remapMergedPathTriggers([trigger('a', 'a1', 'a2')], remap, true),
    ).toHaveLength(1)
    expect(
      remapMergedPathTriggers([trigger('b', 'b1', 'b2')], remap, false),
    ).toHaveLength(0)
  })

  it('aliases a subset-shared hidden cell without marking it wholly shared', () => {
    const remap = buildMergedArrowRemap([
      {
        kind: 'split',
        subCells: [
          {
            pathId: 'a',
            stepId: 's3',
            cellIds: ['a3'],
            pathIds: ['a', 'b'],
            hidden: [{ pathId: 'b', stepId: 's3b', cellIds: ['b3'] }],
          },
        ],
      },
    ])
    expect(remap.aliasByCellId.get('b3')).toBe('a3')
    // Subset agreement is still a divergence: its arrows belong to each
    // member, so the once-only rule must not swallow them.
    expect(remap.sharedCellIds.has('a3')).toBe(false)
    expect(remap.sharedCellIds.has('b3')).toBe(false)
  })

  it('leaves untouched triggers referentially identical', () => {
    const remap = buildMergedArrowRemap(assemblies)
    const trigger: IntegratedBlueprintTrigger = {
      id: 't',
      source_cell_id: 'a2',
      target_cell_id: 'b2',
      path_id: 'a',
      path_type: 'happy',
      opacity: 1,
    }
    expect(remapMergedPathTriggers([trigger], remap, true)[0]).toBe(trigger)
  })
})
