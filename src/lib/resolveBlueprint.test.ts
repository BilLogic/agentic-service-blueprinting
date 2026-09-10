/**
 * Which board a scenario draws, and where it is allowed to come from.
 *
 * `resolveBlueprintForScenario` is the one place that decides between the two
 * sources a board can arrive from — a deployment's database, and the sample
 * blueprint bundled with the kit — and the rule it now applies is that they
 * never mix. A configured database is the whole truth: its rows draw as they
 * are, and where it holds nothing the board holds nothing. The sample answers
 * only for a clone with no database configured at all.
 *
 * It used to merge them, DB-wins: every fallback lane, cell, step and
 * dependency the rows lacked was appended, and a blank path name, summary or
 * note was filled from the fallback's prose. The tests below are what replaced
 * that suite, and the one they exist for is `a sparse board stays sparse` —
 * an adopter's half-filled board must not come back wearing this kit's words.
 *
 * Both the registry and the no-database gate are mocked rather than read. This
 * file is about the decision, not about this deployment's twenty-odd fixture
 * boards, and a test that reached into `src/data` would fail the day somebody
 * edited a fixture for an unrelated reason. The registry's own contents are
 * `check:seed-load`'s subject.
 */
import { beforeEach, test, vi } from 'vitest'
import assert from 'node:assert/strict'
import type {
  BlueprintCell,
  BlueprintData,
  CellResource,
  CellTouchpoint,
} from '@/types/blueprint'
import type { RawCell, RawPath } from '@/lib/normalizeBlueprint'

type Registry = {
  fallback: BlueprintData | null
  /** Whether a database is configured — false means one is. */
  sampleActive: boolean
}

const registry = vi.hoisted(
  (): Registry => ({ fallback: null, sampleActive: false }),
)

vi.mock('@/data/blueprintFallbacks', () => ({
  getBlueprintFallback: () => registry.fallback,
}))

vi.mock('@/lib/bundledSample', () => ({
  isBundledSampleActive: () => registry.sampleActive,
}))

const { isBlueprintEmpty, resolveBlueprintForScenario } = await import(
  '@/lib/resolveBlueprint'
)

const SCENARIO = 'scenario-1'
const PATH = 'path-1'

/**
 * The one string every piece of sample content in this file carries. Nothing
 * bearing it may appear on a board that came from a database — which is one
 * `includes` rather than an assertion per field, so a field added to the merge
 * later cannot slip past the suite by being new.
 */
const SAMPLE_MARK = 'sample-only'

/** A fallback cell: no placements and no resources unless the test gives it some. */
function fallbackCell(cell: Partial<BlueprintCell> & { id: string }): BlueprintCell {
  return {
    lane_id: 'lane-a',
    step_id: 'step-1',
    content: '',
    frame: null,
    summary: null,
    touchpoints: [],
    resources: [],
    ...cell,
  }
}

function fallbackBlueprint(data: Partial<BlueprintData>): BlueprintData {
  return {
    path: {
      id: PATH,
      name: 'Fallback name',
      summary: null,
      note: null,
      kind: 'happy',
      status: 'live',
    },
    lanes: [{ id: 'lane-a', name: 'Tutor', position: 1 }],
    steps: [{ id: 'step-1', name: 'Arrive', position: 1 }],
    cells: [],
    dependencies: [],
    ...data,
  }
}

/**
 * The sample as the registry would hand it over: a full board, every string
 * marked, and one cell id (`cell-1`) deliberately shared with the database so
 * the field-level fill has something to try.
 */
function markedSample(): BlueprintData {
  const resources: CellResource[] = [
    {
      id: null,
      name: 'sample-only Handbook',
      kind: 'link',
      url: 'https://example.invalid/sample-only',
      placementId: null,
      featured: false,
    },
  ]
  const touchpoints: CellTouchpoint[] = [
    {
      id: null,
      touchpointId: null,
      name: 'sample-only Zoom',
      kind: null,
      summary: 'sample-only placement summary',
      role: 'core',
    },
  ]

  return {
    path: {
      id: PATH,
      name: 'sample-only path name',
      summary: 'sample-only path summary',
      note: 'sample-only path note',
      kind: 'happy',
      status: 'live',
    },
    lanes: [
      { id: 'sample-lane-a', name: 'sample-only Frontstage', position: 1 },
      { id: 'sample-lane-b', name: 'sample-only Backstage', position: 2 },
    ],
    steps: [
      { id: 'sample-step-0', name: 'sample-only Before', position: 0 },
      { id: 'sample-step-2', name: 'sample-only After', position: 2 },
    ],
    cells: [
      fallbackCell({
        id: 'sample-cell-1',
        lane_id: 'sample-lane-a',
        step_id: 'sample-step-0',
        content: 'sample-only content',
        summary: 'sample-only summary',
        frame: '/frames/sample-only.png',
        resources,
        touchpoints,
      }),
      // Same id as the database's one cell: every field it left empty is a
      // field the merge used to fill from here.
      fallbackCell({
        id: 'cell-1',
        content: 'sample-only content',
        summary: 'sample-only summary',
        frame: '/frames/sample-only.png',
        resources,
        touchpoints,
      }),
    ],
    dependencies: [
      {
        id: 'sample-dep-1',
        source_cell_id: 'sample-cell-1',
        target_cell_id: 'cell-1',
      },
    ],
  }
}

/** A database path as the board query returns it, before normalization. */
function databasePath(path: Partial<RawPath> & { cells?: RawCell[] }): RawPath {
  return {
    id: PATH,
    name: 'Database name',
    summary: null,
    note: null,
    kind: 'happy',
    status: 'live',
    lanes: [{ id: 'lane-a', name: 'Tutor', position: 1 }],
    path_steps: [
      { position: 1, steps: { id: 'step-1', name: 'Arrive', summary: null } },
    ],
    cells: [],
    cell_dependencies: [],
    ...path,
  }
}

function databaseCell(cell: Partial<RawCell> & { id: string }): RawCell {
  return {
    lane_id: 'lane-a',
    step_id: 'step-1',
    content: '',
    cell_touchpoints: [],
    resources: [],
    ...cell,
  }
}

function cellNamed(data: BlueprintData, id: string): BlueprintCell {
  const cell = data.cells.find((entry) => entry.id === id)
  assert.ok(cell, `expected the resolved board to hold a cell ${id}`)
  return cell
}

/** Nothing the sample carries is anywhere in this board, at any depth. */
function assertNoSampleContent(data: BlueprintData | null): void {
  assert.ok(data, 'expected a board')
  assert.ok(
    !JSON.stringify(data).includes(SAMPLE_MARK),
    `sample content reached the board: ${JSON.stringify(data)}`,
  )
}

beforeEach(() => {
  registry.fallback = null
  // The default for this file: a database IS configured, which is the state
  // every adopter is in and the state the leak lived in.
  registry.sampleActive = false
})

test('a board with no lanes is empty, whatever else it carries', () => {
  assert.equal(
    isBlueprintEmpty(fallbackBlueprint({ lanes: [] })),
    true,
  )
  assert.equal(isBlueprintEmpty(fallbackBlueprint({})), false)
})

test('a sparse board stays sparse: nothing from the sample reaches it', () => {
  registry.fallback = markedSample()

  const resolved = resolveBlueprintForScenario(
    SCENARIO,
    databasePath({
      // One lane, one column, one cell, and every prose field left empty —
      // the shape of a board somebody has only just started.
      name: '',
      summary: null,
      note: null,
      cells: [databaseCell({ id: 'cell-1' })],
    }),
  )

  assert.equal(resolved.source, 'database')
  assertNoSampleContent(resolved.blueprint)

  const board = resolved.blueprint!
  assert.deepEqual(board.lanes.map((lane) => lane.id), ['lane-a'])
  assert.deepEqual(board.steps.map((step) => step.id), ['step-1'])
  assert.deepEqual(board.cells.map((cell) => cell.id), ['cell-1'])
  assert.deepEqual(board.dependencies, [])

  // The empty fields stay empty. An empty summary is a summary nobody has
  // written yet, and that is worth knowing.
  const cell = cellNamed(board, 'cell-1')
  assert.equal(cell.content, '')
  assert.equal(cell.summary ?? null, null)
  assert.equal(cell.frame ?? null, null)
  assert.deepEqual(cell.resources ?? [], [])
  assert.deepEqual(cell.touchpoints ?? [], [])
  assert.equal(board.path.name, '')
  assert.equal(board.path.summary, null)
  assert.equal(board.path.note, null)
})

test('an empty lane is an empty lane', () => {
  registry.fallback = fallbackBlueprint({
    cells: [
      fallbackCell({ id: 'sample-cell-1', content: 'sample-only content' }),
    ],
  })

  const resolved = resolveBlueprintForScenario(
    SCENARIO,
    databasePath({ cells: [] }),
  )

  assert.equal(resolved.source, 'database')
  assertNoSampleContent(resolved.blueprint)
  assert.deepEqual(resolved.blueprint?.lanes.map((lane) => lane.id), ['lane-a'])
  assert.deepEqual(resolved.blueprint?.cells, [])
})

test('a database board comes back with its lanes and steps in position order', () => {
  const resolved = resolveBlueprintForScenario(
    SCENARIO,
    databasePath({
      lanes: [
        { id: 'lane-b', name: 'Student', position: 2 },
        { id: 'lane-a', name: 'Tutor', position: 1 },
      ],
      path_steps: [
        { position: 2, steps: { id: 'step-2', name: 'Leave', summary: null } },
        { position: 1, steps: { id: 'step-1', name: 'Arrive', summary: null } },
      ],
      cells: [databaseCell({ id: 'cell-1', content: 'Greet' })],
    }),
  )

  assert.equal(resolved.source, 'database')
  assert.deepEqual(resolved.blueprint?.lanes.map((lane) => lane.id), [
    'lane-a',
    'lane-b',
  ])
  assert.deepEqual(resolved.blueprint?.steps.map((step) => step.id), [
    'step-1',
    'step-2',
  ])
  assert.equal(cellNamed(resolved.blueprint!, 'cell-1').content, 'Greet')
})

test('two lanes the database gave the same name are two lanes', () => {
  // The merge used to collapse same-named lanes, because the fixture and the
  // rows were authored apart and a fallback lane arrived under a name the
  // database already had. With nothing being appended there is no such
  // artefact left to clean up, and collapsing two rows a deployment wrote on
  // purpose would be this function overruling the database again.
  const resolved = resolveBlueprintForScenario(
    SCENARIO,
    databasePath({
      lanes: [
        { id: 'lane-a', name: 'Tutor', position: 1 },
        { id: 'lane-a2', name: 'Tutor', position: 2 },
      ],
      cells: [
        databaseCell({ id: 'cell-1' }),
        databaseCell({ id: 'cell-2', lane_id: 'lane-a2' }),
      ],
    }),
  )

  assert.deepEqual(resolved.blueprint?.lanes.map((lane) => lane.id), [
    'lane-a',
    'lane-a2',
  ])
  assert.equal(cellNamed(resolved.blueprint!, 'cell-2').lane_id, 'lane-a2')
})

test('a path the database has no lanes for draws nothing, not the sample', () => {
  registry.fallback = markedSample()

  const resolved = resolveBlueprintForScenario(
    SCENARIO,
    databasePath({ lanes: [] }),
  )

  // `null` means there is nothing here to draw, and the caller renders its
  // empty state. Before this it meant "here is the kit's board instead".
  assert.deepEqual(resolved, { blueprint: null, source: null })
})

test('a scenario the database has no path for draws nothing, not the sample', () => {
  registry.fallback = markedSample()

  assert.deepEqual(resolveBlueprintForScenario(SCENARIO, null), {
    blueprint: null,
    source: null,
  })
})

test('no path and no sample resolves to nothing rather than to an empty board', () => {
  registry.sampleActive = true

  assert.deepEqual(resolveBlueprintForScenario(SCENARIO, null), {
    blueprint: null,
    source: null,
  })
})

test('with no database configured the sample is the board, in position order', () => {
  registry.sampleActive = true
  registry.fallback = fallbackBlueprint({
    lanes: [
      { id: 'lane-b', name: 'Student', position: 2 },
      { id: 'lane-a', name: 'Tutor', position: 1 },
    ],
    steps: [
      { id: 'step-2', name: 'Leave', position: 2 },
      { id: 'step-1', name: 'Arrive', position: 1 },
    ],
    cells: [fallbackCell({ id: 'cell-1', content: 'Greet' })],
  })

  const resolved = resolveBlueprintForScenario(SCENARIO, null)

  assert.equal(resolved.source, 'fallback')
  assert.deepEqual(resolved.blueprint?.lanes.map((lane) => lane.id), [
    'lane-a',
    'lane-b',
  ])
  assert.deepEqual(resolved.blueprint?.steps.map((step) => step.id), [
    'step-1',
    'step-2',
  ])
  assert.equal(cellNamed(resolved.blueprint!, 'cell-1').content, 'Greet')
})

test('with no database configured the sample keeps its lane deduplication', () => {
  // A fixture authored across two paths can carry the same lane twice. The
  // no-database board is the one place that still cleans up after itself,
  // because there is no deployment whose data it could be overruling.
  registry.sampleActive = true
  registry.fallback = fallbackBlueprint({
    lanes: [
      { id: 'lane-a', name: 'Tutor', position: 1 },
      { id: 'lane-a-duplicate', name: 'Tutor', position: 2 },
    ],
    cells: [
      fallbackCell({
        id: 'cell-2',
        lane_id: 'lane-a-duplicate',
        content: 'Greet',
      }),
    ],
  })

  const resolved = resolveBlueprintForScenario(SCENARIO, null)

  // One lane under that heading, and the cells sit on it — whichever of the
  // two ids the collapse kept (the one carrying the content).
  const lanes = resolved.blueprint?.lanes ?? []
  assert.deepEqual(lanes.map((lane) => lane.name), ['Tutor'])
  assert.equal(cellNamed(resolved.blueprint!, 'cell-2').lane_id, lanes[0]!.id)
})
