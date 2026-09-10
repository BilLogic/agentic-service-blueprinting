/**
 * Which board a scenario draws, and what the fallback is allowed to add to it.
 *
 * `resolveBlueprintForScenario` is the one place that decides between the two
 * sources a board can arrive from — the database, and the fallback blueprint
 * a build with no database serves — and then reconciles them. It once also
 * carried read-time repairs for one deployment's own rows, gated on that
 * deployment's hardcoded scenario and path UUIDs. Those are gone: the faults
 * they patched were corrected at source, and what is left is the general
 * rule.
 *
 * That rule is DB-WINS, and it is worth stating plainly because "merge" is
 * ambiguous and this one is not. A value the database holds is never
 * overwritten and never moved. A value it left empty may be filled from the
 * fallback. A row it does not have at all may be appended. Nothing is ever
 * removed. Every test below is one clause of that sentence.
 *
 * The fallback registry is mocked rather than read. This file is about the
 * merge, not about this deployment's twenty-odd fixture boards, and a test
 * that reached into `src/data` would fail the day somebody edited a fixture
 * for an unrelated reason — and would be unportable to the template, which
 * has its own. The registry's own contents are `check:seed-load`'s subject.
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
import { BLUEPRINT_STEP_STORYBOARD_PLACEHOLDER } from '@/lib/blueprintStoryboardPlaceholder'

type Registry = {
  fallback: BlueprintData | null
  rawFallback: BlueprintData | null
}

const registry = vi.hoisted(
  (): Registry => ({ fallback: null, rawFallback: null }),
)

vi.mock('@/data/blueprintFallbacks', () => ({
  getBlueprintFallback: () => registry.fallback,
  getRawBlueprintFallback: () => registry.rawFallback,
}))

const { isBlueprintEmpty, resolveBlueprintForScenario } = await import(
  '@/lib/resolveBlueprint'
)

const SCENARIO = 'scenario-1'
const PATH = 'path-1'

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

beforeEach(() => {
  registry.fallback = null
  registry.rawFallback = null
})

test('a board with no lanes is empty, whatever else it carries', () => {
  assert.equal(
    isBlueprintEmpty(fallbackBlueprint({ lanes: [] })),
    true,
  )
  assert.equal(isBlueprintEmpty(fallbackBlueprint({})), false)
})

test('no path and no fallback resolves to nothing rather than to an empty board', () => {
  // The distinction the caller needs: a board that is empty is a board, and
  // draws as one. `null` means there is nothing here to draw at all.
  assert.deepEqual(resolveBlueprintForScenario(SCENARIO, null), {
    blueprint: null,
    source: null,
  })
})

test('a path the database has no lanes for falls through to the fallback', () => {
  registry.fallback = fallbackBlueprint({})

  const resolved = resolveBlueprintForScenario(SCENARIO, databasePath({ lanes: [] }))

  assert.equal(resolved.source, 'fallback')
  assert.deepEqual(resolved.blueprint?.lanes.map((lane) => lane.id), ['lane-a'])
})

test('a fallback board comes back with its lanes and steps in position order', () => {
  registry.fallback = fallbackBlueprint({
    lanes: [
      { id: 'lane-b', name: 'Student', position: 2 },
      { id: 'lane-a', name: 'Tutor', position: 1 },
    ],
    steps: [
      { id: 'step-2', name: 'Leave', position: 2 },
      { id: 'step-1', name: 'Arrive', position: 1 },
    ],
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
})

test('a database path with lanes wins, and says so', () => {
  registry.fallback = fallbackBlueprint({})

  const resolved = resolveBlueprintForScenario(
    SCENARIO,
    databasePath({ cells: [databaseCell({ id: 'cell-1', content: 'Greet' })] }),
  )

  assert.equal(resolved.source, 'database')
  assert.equal(cellNamed(resolved.blueprint!, 'cell-1').content, 'Greet')
})

test('the fallback fills a cell field the database left empty, and leaves a filled one alone', () => {
  registry.fallback = fallbackBlueprint({
    cells: [
      fallbackCell({
        id: 'cell-1',
        content: 'Fallback content',
        summary: 'Fallback summary',
        frame: '/frames/fallback.png',
      }),
    ],
  })

  const resolved = resolveBlueprintForScenario(
    SCENARIO,
    databasePath({
      cells: [
        databaseCell({
          id: 'cell-1',
          content: 'Database content',
          summary: '   ',
          frame: null,
        }),
      ],
    }),
  )

  const cell = cellNamed(resolved.blueprint!, 'cell-1')
  assert.equal(cell.content, 'Database content')
  // Whitespace is not a value. A summary of three spaces is an empty summary.
  assert.equal(cell.summary, 'Fallback summary')
  assert.equal(cell.frame, '/frames/fallback.png')
})

test('a placeholder frame counts as empty when the fallback has a real one, and not otherwise', () => {
  registry.fallback = fallbackBlueprint({
    cells: [
      fallbackCell({ id: 'cell-1', frame: '/frames/real.png' }),
      fallbackCell({
        id: 'cell-2',
        frame: BLUEPRINT_STEP_STORYBOARD_PLACEHOLDER,
      }),
    ],
  })

  const resolved = resolveBlueprintForScenario(
    SCENARIO,
    databasePath({
      cells: [
        databaseCell({
          id: 'cell-1',
          frame: BLUEPRINT_STEP_STORYBOARD_PLACEHOLDER,
        }),
        databaseCell({ id: 'cell-2', frame: '/frames/database.png' }),
      ],
    }),
  )

  assert.equal(cellNamed(resolved.blueprint!, 'cell-1').frame, '/frames/real.png')
  // The reverse never happens: a real frame is never traded for a placeholder.
  assert.equal(
    cellNamed(resolved.blueprint!, 'cell-2').frame,
    '/frames/database.png',
  )
})

test('a fallback lane the database lacks is appended; one it has under another id is remapped', () => {
  registry.fallback = fallbackBlueprint({
    lanes: [
      // Same NAME as the database's lane, different id — the fixture and the
      // rows were authored apart. Its cells must land on the database's lane
      // rather than on a second lane drawn under the same heading.
      { id: 'fallback-tutor', name: 'Tutor', position: 1 },
      { id: 'lane-support', name: 'Support', position: 2 },
    ],
    cells: [
      fallbackCell({ id: 'cell-2', lane_id: 'fallback-tutor' }),
      fallbackCell({ id: 'cell-3', lane_id: 'lane-support' }),
    ],
  })

  const resolved = resolveBlueprintForScenario(
    SCENARIO,
    databasePath({ cells: [databaseCell({ id: 'cell-1' })] }),
  )

  assert.deepEqual(resolved.blueprint?.lanes.map((lane) => lane.id), [
    'lane-a',
    'lane-support',
  ])
  assert.equal(cellNamed(resolved.blueprint!, 'cell-2').lane_id, 'lane-a')
  assert.equal(cellNamed(resolved.blueprint!, 'cell-3').lane_id, 'lane-support')
})

test('fallback steps and dependencies are appended, and steps come back in column order', () => {
  registry.fallback = fallbackBlueprint({
    steps: [
      { id: 'step-1', name: 'Arrive', position: 1 },
      { id: 'step-0', name: 'Before', position: 0 },
    ],
    cells: [fallbackCell({ id: 'cell-0', step_id: 'step-0' })],
    dependencies: [
      { id: 'dep-1', source_cell_id: 'cell-0', target_cell_id: 'cell-1' },
    ],
  })

  const resolved = resolveBlueprintForScenario(
    SCENARIO,
    databasePath({ cells: [databaseCell({ id: 'cell-1' })] }),
  )

  assert.deepEqual(resolved.blueprint?.steps.map((step) => step.id), [
    'step-0',
    'step-1',
  ])
  assert.deepEqual(resolved.blueprint?.dependencies.map((edge) => edge.id), [
    'dep-1',
  ])
})

test('resources merge by name: an empty url fills, a filled one holds, a new name appends', () => {
  const fallbackResources: CellResource[] = [
    {
      id: null,
      name: 'Design',
      kind: 'link',
      url: 'https://fallback.example/design',
      placementId: null,
      featured: false,
    },
    {
      id: null,
      name: 'Handbook',
      kind: 'link',
      url: 'https://fallback.example/handbook',
      placementId: null,
      featured: false,
    },
    // Carries nothing the database could want, so it is not appended: a
    // resource with nothing on the other end has nothing to render.
    {
      id: null,
      name: 'Empty',
      kind: 'link',
      url: null,
      placementId: null,
      featured: false,
    },
  ]
  registry.fallback = fallbackBlueprint({
    cells: [fallbackCell({ id: 'cell-1', resources: fallbackResources })],
  })

  const resolved = resolveBlueprintForScenario(
    SCENARIO,
    databasePath({
      cells: [
        databaseCell({
          id: 'cell-1',
          resources: [
            { position: 1, name: 'Design', url: null },
            {
              position: 2,
              name: 'Handbook',
              url: 'https://database.example/handbook',
            },
          ],
        }),
      ],
    }),
  )

  const resources = cellNamed(resolved.blueprint!, 'cell-1').resources ?? []
  assert.deepEqual(
    resources.map((resource) => [resource.name, resource.url]),
    [
      ['Design', 'https://fallback.example/design'],
      ['Handbook', 'https://database.example/handbook'],
    ],
  )
})

test('touchpoints merge by name: summary and role fill, and an empty fallback row is not appended', () => {
  const fallbackTouchpoints: CellTouchpoint[] = [
    {
      id: null,
      touchpointId: null,
      name: 'Zoom',
      kind: null,
      summary: 'The tutor joins the breakout room.',
      role: 'core',
    },
    {
      id: null,
      touchpointId: null,
      name: 'Handbook',
      kind: null,
      summary: 'Looked up between questions.',
      role: null,
    },
    { id: null, touchpointId: null, name: 'Email', kind: null, summary: null, role: null },
  ]
  registry.fallback = fallbackBlueprint({
    cells: [fallbackCell({ id: 'cell-1', touchpoints: fallbackTouchpoints })],
  })

  const resolved = resolveBlueprintForScenario(
    SCENARIO,
    databasePath({
      cells: [
        databaseCell({
          id: 'cell-1',
          cell_touchpoints: [
            {
              position: 1,
              name: 'Zoom',
              summary: null,
              role: null,
              touchpoints: null,
            },
          ],
        }),
      ],
    }),
  )

  const touchpoints = cellNamed(resolved.blueprint!, 'cell-1').touchpoints ?? []
  assert.deepEqual(
    touchpoints.map((placement) => [
      placement.name,
      placement.summary,
      placement.role,
    ]),
    [
      ['Zoom', 'The tutor joins the breakout room.', 'core'],
      ['Handbook', 'Looked up between questions.', null],
    ],
  )
})

test("the path's own summary and note fill from the fallback only when the database left them empty", () => {
  // The key written here is `summary`, which is what the column is called and
  // what `BlueprintPath` carries. It was `description` on one side once, and a
  // key by that name landed beside the real one and was read by nobody — so
  // the fallback's words for a route never appeared.
  registry.rawFallback = fallbackBlueprint({
    path: {
      id: PATH,
      name: 'Fallback name',
      summary: 'When the student never joins.',
      note: 'Fallback note',
      kind: 'happy',
      status: 'live',
    },
  })

  const filled = resolveBlueprintForScenario(
    SCENARIO,
    databasePath({
      cells: [databaseCell({ id: 'cell-1' })],
      summary: 'When the tutor is late.',
      note: 'Database note',
    }),
  )
  assert.equal(filled.blueprint?.path.summary, 'When the tutor is late.')
  assert.equal(filled.blueprint?.path.note, 'Database note')

  const empty = resolveBlueprintForScenario(
    SCENARIO,
    databasePath({
      cells: [databaseCell({ id: 'cell-1' })],
      name: '',
      summary: null,
      note: null,
    }),
  )
  assert.equal(empty.blueprint?.path.summary, 'When the student never joins.')
  assert.equal(empty.blueprint?.path.note, 'Fallback note')
  assert.equal(empty.blueprint?.path.name, 'Fallback name')
  // The retired key is gone rather than merely unread.
  assert.ok(!('description' in (empty.blueprint?.path ?? {})))
})
