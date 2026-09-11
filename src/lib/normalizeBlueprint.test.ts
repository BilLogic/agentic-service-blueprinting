import { describe, expect, it } from 'vitest'
import {
  normalizeBlueprint,
  type RawCell,
  type RawPath,
} from '@/lib/normalizeBlueprint'
import type { BlueprintCellDependency } from '@/types/blueprint'

describe('normalizeBlueprint', () => {
  it('does not put the retired links field back onto database cells', () => {
    const normalized = normalizeBlueprint({
      id: 'path-1',
      name: 'Happy path',
      kind: 'happy',
      lanes: [{ id: 'lane-1', name: 'Customer', position: 0 }],
      path_steps: [{ position: 0, steps: { id: 'step-1', name: 'Arrive' } }],
      cells: [
        {
          id: 'cell-1',
          lane_id: 'lane-1',
          step_id: 'step-1',
          content: 'Ask for help',
        },
      ],
    })

    expect(normalized.cells[0]).not.toHaveProperty('links')
  })
})

/*
  A dependency arrives through one of two doors, and both hand back the same
  edge.

  `normalizeBlueprint` reads the board's arrows from a top-level
  `cell_dependencies` array when the path row carries one, and otherwise
  flattens them out of each cell's `outgoing` embed. The board query uses the
  second door; anything that hands the normalizer a path row with its edges
  already gathered uses the first.

  The two mappings were written separately and drifted. The top-level one lost
  its `note` line when the column went away, and the column came back through
  the cells door alone. What was left carried `note` only incidentally — an
  object spread kept it, and kept every other column of the row alongside it,
  while an edge with nothing said about it came back with `note` MISSING
  rather than null. Two doors, two shapes.

  These state the rule the doors now share: however an edge arrives, it
  arrives as the same six fields.
*/

const SOURCE = 'cell-source'
const TARGET = 'cell-target'
const NOTE = 'The customer has to know before the doors open.'

/** A path row as the board query returns it, with two cells to draw between. */
function boardWith(path: Partial<RawPath>): RawPath {
  return {
    id: 'path-1',
    name: 'Path',
    summary: null,
    note: null,
    kind: 'happy',
    status: 'live',
    lanes: [{ id: 'lane-a', name: 'Customer', position: 1 }],
    path_steps: [
      { position: 1, steps: { id: 'step-1', name: 'Arrive', summary: null } },
      { position: 2, steps: { id: 'step-2', name: 'Leave', summary: null } },
    ],
    cells: [
      cellRow({ id: SOURCE, step_id: 'step-1' }),
      cellRow({ id: TARGET, step_id: 'step-2' }),
    ],
    ...path,
  }
}

function cellRow(cell: Partial<RawCell> & { id: string }): RawCell {
  return {
    lane_id: 'lane-a',
    step_id: 'step-1',
    content: 'Cell',
    cell_touchpoints: [],
    resources: [],
    outgoing: [],
    ...cell,
  }
}

function onlyEdge(raw: RawPath): BlueprintCellDependency {
  const { dependencies } = normalizeBlueprint(raw)
  expect(dependencies, 'expected the board to hold one edge').toHaveLength(1)
  return dependencies[0]
}

/** The same edge, gathered at the top level. */
const topLevelBoard = () =>
  boardWith({
    cell_dependencies: [
      {
        id: 'edge-1',
        source_cell_id: SOURCE,
        target_cell_id: TARGET,
        kind: 'enables',
        name: 'Email',
        note: NOTE,
      },
    ],
  })

/** The same edge, nested under the cell it leaves. */
const nestedBoard = () =>
  boardWith({
    cells: [
      cellRow({
        id: SOURCE,
        step_id: 'step-1',
        outgoing: [
          {
            id: 'edge-1',
            target_cell_id: TARGET,
            kind: 'enables',
            name: 'Email',
            note: NOTE,
          },
        ],
      }),
      cellRow({ id: TARGET, step_id: 'step-2' }),
    ],
  })

describe('an edge arrives the same way through either door', () => {
  it('keeps its note from the top-level array', () => {
    expect(onlyEdge(topLevelBoard()).note).toBe(NOTE)
  })

  it('keeps its note when nested under its cell, as it always has', () => {
    expect(onlyEdge(nestedBoard()).note).toBe(NOTE)
  })

  it('reads an unsaid note as null, not as missing, from the top-level array', () => {
    // `note: undefined` and `note: null` are the same to a renderer and
    // different to everything that compares two boards — which is the whole
    // of compare. The cells door has always answered null here.
    const edge = onlyEdge(
      boardWith({
        cell_dependencies: [
          { id: 'edge-1', source_cell_id: SOURCE, target_cell_id: TARGET },
        ],
      }),
    )
    expect(edge).toStrictEqual({
      id: 'edge-1',
      source_cell_id: SOURCE,
      target_cell_id: TARGET,
      kind: 'leads_to',
      name: null,
      note: null,
    })
  })

  it('normalizes to the same six fields through either door', () => {
    expect(onlyEdge(topLevelBoard())).toStrictEqual(onlyEdge(nestedBoard()))
  })

  it('does not let a column the edge does not name ride along', () => {
    // An extra column reaches the normalizer the way every real one does: the
    // board query's rows are handed over through a cast, so PostgREST's
    // answer is whatever the select asked for.
    const raw = {
      ...boardWith({}),
      cell_dependencies: [
        {
          id: 'edge-1',
          source_cell_id: SOURCE,
          target_cell_id: TARGET,
          kind: 'leads_to',
          name: null,
          note: null,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    } as unknown as RawPath

    expect(Object.keys(onlyEdge(raw)).sort()).toEqual([
      'id',
      'kind',
      'name',
      'note',
      'source_cell_id',
      'target_cell_id',
    ])
  })
})
