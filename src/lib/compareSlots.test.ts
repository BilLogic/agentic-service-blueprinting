import { describe, expect, it } from 'vitest'
import type { BlueprintCell, BlueprintData } from '@/types/blueprint'
import {
  buildCompareModel,
  makeSlotKey,
  normalizeCompareName,
  type CompareBlueprints,
} from '@/lib/compareSlots'

type CellSpec = {
  lane: string
  step: string
  content: string
  summary?: string
  id?: string
}

let autoId = 0
const nextId = (prefix: string) => `${prefix}-${(autoId += 1)}`

function makeBlueprint(
  pathId: string,
  steps: string[],
  cells: CellSpec[],
  options: {
    lanes?: string[]
    dependencies?: Array<{ source: string; target: string; kind?: 'leads_to' | 'enables' }>
  } = {},
): BlueprintData {
  const laneNames =
    options.lanes ?? [...new Set(cells.map((cell) => cell.lane))]
  const lanes = laneNames.map((name, index) => ({
    id: `${pathId}-lane-${name}`,
    name,
    position: index,
  }))
  const stepRows = steps.map((name, index) => ({
    id: `${pathId}-step-${index}`,
    name,
    position: index,
  }))
  const stepIdByName = new Map(stepRows.map((step) => [step.name, step.id]))
  const blueprintCells: BlueprintCell[] = cells.map((cell) => ({
    id: cell.id ?? nextId(`${pathId}-cell`),
    lane_id: `${pathId}-lane-${cell.lane}`,
    step_id: stepIdByName.get(cell.step) ?? '',
    content: cell.content,
    frame: null,
    summary: cell.summary ?? null,
    links: [],
  }))
  return {
    path: {
      id: pathId,
      name: pathId,
      summary: null,
      note: null,
      kind: 'happy',
      status: 'live',
    },
    lanes,
    steps: stepRows,
    cells: blueprintCells,
    dependencies: (options.dependencies ?? []).map((dependency, index) => ({
      id: `${pathId}-dependency-${index}`,
      source_cell_id: dependency.source,
      target_cell_id: dependency.target,
      kind: dependency.kind,
    })),
  }
}

const pair = (a: BlueprintData, b: BlueprintData): CompareBlueprints => [a, b]

describe('normalizeCompareName', () => {
  // The three real rename shapes, from a deployment, that fabricated phantom clusters.
  it('aligns quote-only renames', () => {
    expect(normalizeCompareName("click on 'set goals' cta")).toBe(
      normalizeCompareName('click on set goals cta'),
    )
  })

  it('aligns trailing-period renames', () => {
    expect(normalizeCompareName('goals set by researchers.')).toBe(
      normalizeCompareName('goals set by researchers'),
    )
  })

  it('aligns dropped-article renames', () => {
    expect(normalizeCompareName('finalize updating goal with the student')).toBe(
      normalizeCompareName('finalize updating goal with student'),
    )
  })

  it('does not conflate genuinely different names', () => {
    expect(normalizeCompareName('send confirmation email')).not.toBe(
      normalizeCompareName('escalate to support'),
    )
  })
})

describe('buildCompareModel — alignment and verdicts', () => {
  it('classifies shared, divergent, and only slots', () => {
    const happy = makeBlueprint(
      'happy',
      ['Browse', 'Pay', 'Ship'],
      [
        { lane: 'FS', step: 'Browse', content: 'Browse catalog' },
        { lane: 'FS', step: 'Pay', content: 'Pay' },
        { lane: 'BS', step: 'Pay', content: 'Charge card' },
        { lane: 'FS', step: 'Ship', content: 'Track parcel' },
      ],
    )
    const crisis = makeBlueprint(
      'crisis',
      ['Browse', 'Pay', 'Ship'],
      [
        { lane: 'FS', step: 'Browse', content: 'Browse catalog' },
        { lane: 'FS', step: 'Pay', content: 'Pay fails' },
        { lane: 'BS', step: 'Pay', content: 'Charge card' },
        // FS/Ship missing in crisis; BS/Ship exists only here.
        { lane: 'BS', step: 'Ship', content: 'Manual dispatch' },
      ],
    )

    const model = buildCompareModel(pair(happy, crisis))
    const bySlot = new Map(model.slots.map((slot) => [slot.slotKey, slot]))

    expect(bySlot.get(makeSlotKey('fs', 'browse#0'))?.verdict).toBe('shared')
    expect(bySlot.get(makeSlotKey('fs', 'pay#0'))?.verdict).toBe('divergent')
    expect(bySlot.get(makeSlotKey('bs', 'pay#0'))?.verdict).toBe('shared')
    expect(bySlot.get(makeSlotKey('fs', 'ship#0'))?.verdict).toBe('only')
    expect(bySlot.get(makeSlotKey('bs', 'ship#0'))?.verdict).toBe('only')

    const fsShip = bySlot.get(makeSlotKey('fs', 'ship#0'))
    expect(fsShip?.perPath['crisis']).toEqual({ present: false })
    // A one-path slot is `only`, never `divergent`, so the field comparison
    // never runs on it — the count guard it used to carry was dead.
    expect(fsShip?.differingFields).toEqual([])
  })

  it('pairs duplicate step names by occurrence', () => {
    const a = makeBlueprint(
      'a',
      ['Check', 'Check'],
      [
        { lane: 'FS', step: 'Check', content: 'First check' },
      ],
    )
    // makeBlueprint maps cells by name (first match), so place contents via ids:
    a.cells = [
      { ...a.cells[0], step_id: a.steps[0].id, content: 'First check' },
      { ...a.cells[0], id: 'a-check-2', step_id: a.steps[1].id, content: 'Second check' },
    ]
    const b = makeBlueprint('b', ['Check', 'Check'], [])
    b.cells = [
      { ...a.cells[0], id: 'b-check-1', lane_id: 'b-lane-FS', step_id: b.steps[0].id, content: 'First check' },
      { ...a.cells[0], id: 'b-check-2', lane_id: 'b-lane-FS', step_id: b.steps[1].id, content: 'Different second' },
    ]
    b.lanes = [{ id: 'b-lane-FS', name: 'FS', position: 0 }]

    const model = buildCompareModel(pair(a, b))
    const verdicts = new Map(
      model.slots.map((slot) => [slot.columnKey, slot.verdict]),
    )
    expect(verdicts.get('check#0')).toBe('shared')
    expect(verdicts.get('check#1')).toBe('divergent')
  })

  it('inserts a path-B-only column beside its neighbours, not at the end', () => {
    const a = makeBlueprint('a', ['One', 'Three'], [])
    const b = makeBlueprint('b', ['One', 'Two', 'Three'], [])
    const model = buildCompareModel(pair(a, b))
    expect(model.columns.map((column) => column.columnKey)).toEqual([
      'one#0',
      'two#0',
      'three#0',
    ])
    expect(model.columns[1].verdict).toBe('only')
    // The stacked grid places cells by these ids: present paths carry their
    // own step id per canonical column, absent paths are simply missing.
    expect(model.columns[0].stepIdByPath).toEqual({
      a: 'a-step-0',
      b: 'b-step-0',
    })
    expect(model.columns[1].stepIdByPath).toEqual({ b: 'b-step-1' })
  })

  it('near-matches a substantively-similar renamed step instead of splitting it', () => {
    const a = makeBlueprint('a', ['Browse', 'Confirm order with customer'], [])
    const b = makeBlueprint('b', ['Browse', 'Confirm order with customer today'], [])
    const model = buildCompareModel(pair(a, b))
    // 4 shared tokens / 5 union = 0.8 ⇒ paired as one column.
    expect(model.columns).toHaveLength(2)
    expect(model.columns[1].perPathPresent).toEqual({ a: true, b: true })
  })

  it('keeps genuinely different single-path steps apart', () => {
    const a = makeBlueprint('a', ['Browse', 'Send email'], [])
    const b = makeBlueprint('b', ['Browse', 'Call the customer'], [])
    const model = buildCompareModel(pair(a, b))
    expect(model.columns).toHaveLength(3)
  })
})

describe('buildCompareModel — fields and multisets', () => {
  it('reports summary-only differences as divergent with differingFields', () => {
    const a = makeBlueprint(
      'a',
      ['Pay'],
      [{ lane: 'FS', step: 'Pay', content: 'Pay', summary: 'via card' }],
    )
    const b = makeBlueprint(
      'b',
      ['Pay'],
      [{ lane: 'FS', step: 'Pay', content: 'Pay', summary: 'via invoice' }],
    )
    const model = buildCompareModel(pair(a, b))
    const slot = model.slots[0]
    expect(slot.verdict).toBe('divergent')
    expect(slot.differingFields).toEqual(['summary'])
  })

  it('keeps detail-only divergence off the canvas: column shared, no fork (V7)', () => {
    const a = makeBlueprint(
      'a',
      ['Pay'],
      [{ lane: 'FS', step: 'Pay', content: 'Pay', summary: 'via card' }],
    )
    const b = makeBlueprint(
      'b',
      ['Pay'],
      [{ lane: 'FS', step: 'Pay', content: 'Pay', summary: 'via invoice' }],
    )
    const model = buildCompareModel(pair(a, b))
    // Fork condition is content-or-presence: a summary-only difference
    // must not tint the column or split a run — it is ledger-only.
    expect(model.columns[0].verdict).toBe('shared')
    expect(model.runs).toEqual([{ kind: 'shared', columnKeys: ['pay#0'] }])
  })

  it('treats multiset slots (extra cell) as content-divergent', () => {
    const a = makeBlueprint(
      'a',
      ['Pay'],
      [{ lane: 'Tech', step: 'Pay', content: 'Stripe' }],
    )
    const b = makeBlueprint(
      'b',
      ['Pay'],
      [
        { lane: 'Tech', step: 'Pay', content: 'Stripe' },
        { lane: 'Tech', step: 'Pay', content: 'Twilio' },
      ],
    )
    const model = buildCompareModel(pair(a, b))
    expect(model.slots[0].verdict).toBe('divergent')
    expect(model.slots[0].differingFields).toContain('content')
  })
})

describe('buildCompareModel — columns, runs, ordering', () => {
  const happy = makeBlueprint(
    'happy',
    ['One', 'Two', 'Three', 'Four', 'Five'],
    [
      { lane: 'FS', step: 'One', content: 'same' },
      { lane: 'FS', step: 'Two', content: 'same' },
      { lane: 'FS', step: 'Three', content: 'differs A' },
      { lane: 'FS', step: 'Four', content: 'same' },
      { lane: 'FS', step: 'Five', content: 'same' },
      { lane: 'BS', step: 'Three', content: 'same backstage' },
    ],
  )
  const crisis = makeBlueprint(
    'crisis',
    ['One', 'Two', 'Three', 'Four', 'Five'],
    [
      { lane: 'FS', step: 'One', content: 'same' },
      { lane: 'FS', step: 'Two', content: 'same' },
      { lane: 'FS', step: 'Three', content: 'differs B' },
      { lane: 'FS', step: 'Four', content: 'same' },
      { lane: 'FS', step: 'Five', content: 'same' },
      { lane: 'BS', step: 'Three', content: 'same backstage' },
    ],
  )

  it('rolls column verdicts up from slots and builds maximal runs', () => {
    const model = buildCompareModel(pair(happy, crisis))
    expect(model.columns.map((column) => column.verdict)).toEqual([
      'shared',
      'shared',
      'divergent', // one lane divergent taints the column (V2: fork granularity is the column)
      'shared',
      'shared',
    ])
    expect(
      model.runs.map((run) => [run.kind, run.columnKeys.length]),
    ).toEqual([
      ['shared', 2],
      ['divergent', 1],
      ['shared', 2],
    ])
  })

  it('orders slots column-first, lane-second', () => {
    const model = buildCompareModel(pair(happy, crisis))
    const keys = model.slots.map((slot) => `${slot.columnKey}|${slot.laneKey}`)
    expect(keys).toEqual([...keys].sort((x, y) => {
      const [colX] = x.split('|')
      const [colY] = y.split('|')
      const order = ['one#0', 'two#0', 'three#0', 'four#0', 'five#0']
      const delta = order.indexOf(colX) - order.indexOf(colY)
      return delta !== 0 ? delta : 0
    }))
    // FS row (position 0) precedes BS within the divergent column.
    const three = model.slots.filter((slot) => slot.columnKey === 'three#0')
    expect(three.map((slot) => slot.laneKey)).toEqual(['fs', 'bs'])
  })

  it('groups agreement for three paths (A=B≠C)', () => {
    const third = makeBlueprint(
      'third',
      ['One', 'Two', 'Three', 'Four', 'Five'],
      [
        { lane: 'FS', step: 'One', content: 'same' },
        { lane: 'FS', step: 'Two', content: 'same' },
        { lane: 'FS', step: 'Three', content: 'differs A' }, // agrees with happy
        { lane: 'FS', step: 'Four', content: 'same' },
        { lane: 'FS', step: 'Five', content: 'same' },
        { lane: 'BS', step: 'Three', content: 'same backstage' },
      ],
    )
    const model = buildCompareModel([happy, crisis, third])
    const column = model.columns.find((entry) => entry.columnKey === 'three#0')
    expect(column?.agreementGroups).toEqual([['happy', 'third'], ['crisis']])
  })

  it('exposes cellStatus for every real cell', () => {
    const model = buildCompareModel(pair(happy, crisis))
    const statuses = new Set(Object.values(model.cellStatus))
    expect(Object.keys(model.cellStatus)).toHaveLength(
      happy.cells.length + crisis.cells.length,
    )
    expect(statuses).toEqual(new Set(['shared', 'divergent']))
  })
})

