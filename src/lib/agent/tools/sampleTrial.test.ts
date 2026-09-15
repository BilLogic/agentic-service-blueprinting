import { describe, expect, it } from 'vitest'
import { dispatchTool } from '@/lib/agent/tools/registry'
import {
  sampleGetBlueprint,
  sampleGetCell,
  sampleGetSlice,
  sampleListCellDependencies,
  sampleListLanes,
  sampleListBlueprint,
  sampleListOwnerTags,
  sampleListSlices,
} from '@/lib/agent/tools/sampleRead'
import {
  SAMPLE_BLUEPRINTS_BY_SCENARIO,
  SAMPLE_DEMO_SLICES,
} from '@/data/sampleBlueprint'
import { PACKAGE_OFFLINE_BOARD as BOARD } from '@/data/blueprintFallbacks'
import { TOOL_DEFINITIONS } from '@/lib/agent/tools/definitions'
import { sessionRoster } from '@/lib/agent/tools/roster'

/**
 * The no-database trial: a developer with no backend gets the agent's
 * READING half against the bundled sample, and no writing half at all.
 *
 * "No write tools" here means ABSENT, not refused — the roster is what the
 * loop registers with the provider, so a write tool that slipped into it
 * would be offered to the model before any refusal could catch it.
 */
describe('the sample-trial tool roster', () => {
  const trial = sessionRoster({
    sampleTrial: true,
    mobileReading: false,
    allowWrites: true,
    searchOffered: true,
  })

  it('contains zero write tools, whatever the tier', () => {
    expect(trial.filter((tool) => tool.surface === 'write')).toEqual([])
  })

  it('is exactly the definitions that answer without a database', () => {
    expect(trial).toEqual(TOOL_DEFINITIONS.filter((tool) => tool.availability.sample))
  })

  it('registers reading and navigation for the provider', () => {
    const offered = trial.map((tool) => tool.name)
    for (const name of ['list_blueprint', 'get_blueprint', 'get_cell', 'open_phase'])
      expect(offered).toContain(name)
  })
})

describe('sample reads resolve from the bundled fallbacks', () => {
  it('lists every sample phase and every sample scenario with ids', () => {
    const text = sampleListBlueprint(BOARD, { granularity: ['phase', 'scenario'] })
    for (const scenarioId of Object.keys(SAMPLE_BLUEPRINTS_BY_SCENARIO))
      expect(text).toContain(scenarioId)
  })

  it('renders a grid for EVERY scenario, not just the first', () => {
    for (const [scenarioId, blueprints] of Object.entries(
      SAMPLE_BLUEPRINTS_BY_SCENARIO,
    )) {
      const grid = sampleGetBlueprint(BOARD, scenarioId)
      expect(grid).toMatch(/Steps: \d+\. "/)
      expect(grid).toContain('Lane "')
      // Every path in the scenario, so a two-path scenario reads as two.
      for (const blueprint of blueprints)
        expect(grid).toContain(`(${blueprint.path.id},`)
    }
  })

  it('reads a cell from any scenario, not only the first', () => {
    for (const blueprints of Object.values(SAMPLE_BLUEPRINTS_BY_SCENARIO)) {
      const cellId = blueprints[0]!.cells[0]!.id
      expect(sampleGetCell(BOARD, cellId)).toContain('lane_id:')
    }
  })

  it('serves the cell spec — owner pair, function, form, value props', () => {
    const spec = Object.values(SAMPLE_BLUEPRINTS_BY_SCENARIO)
      .flat()
      .flatMap((blueprint) => blueprint.cells)
      .find((cell) => cell.owner && cell.function && cell.value_props?.length)
    expect(spec).toBeTruthy()
    const text = sampleGetCell(BOARD, spec!.id)
    expect(text).toContain(`owner: ${spec!.owner}`)
    expect(text).toContain(`perceived_owner: ${spec!.perceived_owner}`)
    expect(text).toContain('function:')
    expect(text).toContain('form:')
    expect(text).toContain('value_props: [')
  })

  it('lists the owner tags the sample actually uses', () => {
    const expected = new Set<string>()
    for (const blueprint of Object.values(SAMPLE_BLUEPRINTS_BY_SCENARIO).flat())
      for (const cell of blueprint.cells) {
        if (cell.owner) expected.add(cell.owner)
        if (cell.perceived_owner) expected.add(cell.perceived_owner)
      }
    expect(expected.size).toBeGreaterThan(0)
    const text = sampleListOwnerTags(BOARD)
    expect(text).not.toBe('No owner tags in use yet.')
    for (const tag of expected) expect(text).toContain(tag)
  })

  it('shows the arrows in the grid, the way the database read does', () => {
    const [scenarioId, blueprints] = Object.entries(
      SAMPLE_BLUEPRINTS_BY_SCENARIO,
    ).find(([, list]) => list.some((blueprint) => blueprint.dependencies.length > 0))!
    const edge = blueprints.flatMap((blueprint) => blueprint.dependencies)[0]!
    const grid = sampleGetBlueprint(BOARD, scenarioId)
    expect(grid).toContain('Edges (')
    expect(grid).toContain(
      `${edge.source_cell_id} --${edge.kind ?? 'leads_to'}--> ${edge.target_cell_id}`,
    )
  })

  it("reads a cell's resources, the way the database read does", () => {
    const cell = Object.values(SAMPLE_BLUEPRINTS_BY_SCENARIO)
      .flat()
      .flatMap((blueprint) => blueprint.cells)
      .find((entry) => (entry.resources ?? []).length > 0)
    expect(cell).toBeTruthy()
    const first = cell!.resources![0]!
    expect(sampleGetCell(BOARD, cell!.id)).toContain(`resources: ${first.name}`)
  })

  it('answers for an unknown scenario or cell instead of throwing', () => {
    expect(sampleGetBlueprint(BOARD, 'nope')).toBe('No paths in this scenario.')
    expect(sampleGetCell(BOARD, 'nope')).toBe('No cell with id nope.')
  })

  it('lists every demo slice and reads each one back with frames', () => {
    const list = sampleListSlices()
    expect(SAMPLE_DEMO_SLICES.length).toBeGreaterThan(0)
    for (const slice of SAMPLE_DEMO_SLICES) {
      expect(list).toContain(slice.id)
      const detail = sampleGetSlice(slice.id)
      expect(detail).toContain(`slice "${slice.title}"`)
      expect(detail).toContain('frame 1:')
    }
  })
})

describe('the sample answers the catalog reads it can', () => {
  it('counts the lane vocabulary the sample board actually uses', () => {
    const labels = new Set(
      Object.values(SAMPLE_BLUEPRINTS_BY_SCENARIO)
        .flat()
        .flatMap((blueprint) => blueprint.lanes.map((lane) => lane.name)),
    )
    expect(labels.size).toBeGreaterThan(0)
    const text = sampleListLanes(BOARD)
    expect(text).not.toBe('No lanes defined yet.')
    for (const label of labels) expect(text).toContain(label)
  })

  it('reads the sample arrows, whole and scoped to one cell', () => {
    const edge = Object.values(SAMPLE_BLUEPRINTS_BY_SCENARIO)
      .flat()
      .flatMap((blueprint) => blueprint.dependencies)[0]
    expect(edge).toBeTruthy()
    expect(sampleListCellDependencies(BOARD)).toContain(edge!.id)
    const scoped = sampleListCellDependencies(BOARD, edge!.source_cell_id)
    expect(scoped).toContain(edge!.target_cell_id)
    expect(scoped).toContain(`touching ${edge!.source_cell_id}`)
  })

  it('says there are no links rather than nothing, for a cell with none', () => {
    expect(sampleListCellDependencies(BOARD, 'no-such-cell')).toBe(
      'No links on cell no-such-cell.',
    )
  })
})

describe('trial dispatch never reaches a database', () => {
  it('answers reads from the sample with a null client', async () => {
    const text = await dispatchTool(null, 'session', 'list_blueprint', {
      granularity: ['phase', 'scenario'],
    })
    expect(text).toContain(Object.keys(SAMPLE_BLUEPRINTS_BY_SCENARIO)[0]!)
  })

  /**
   * EVERY data tool, not just the roster: the trial registers only the
   * definitions that say they run without a database, but a model can still
   * emit a name it invented or remembered from a database session. None of
   * them may throw, and none may dereference a client that is null — an
   * unhandled name has to come back as a sentence saying which environment
   * this is.
   *
   * The interface surface is excluded because those calls reach for a canvas
   * through `document`, and this suite has no DOM; what they do with a null
   * client is not a question about the trial's data path.
   */
  it('answers every registered data tool with a sentence, never a crash', async () => {
    const cell = Object.values(SAMPLE_BLUEPRINTS_BY_SCENARIO)[0]![0]!.cells[0]!
    const stubs: Record<string, Record<string, unknown>> = {
      get_reference: { name: 'lane-roles' },
      list_blueprint: { granularity: ['phase', 'scenario'] },
      get_blueprint: { scenario_id: 'nope' },
      compare_blueprint: { scenario_id: 'nope' },
      get_cell: { cell_id: cell.id },
      get_slice: { slice_id: SAMPLE_DEMO_SLICES[0]!.id },
      get_session: { session_id: 'nope' },
      get_evidence: { evidence_ids: ['nope'] },
      list_cell_dependencies: { cell_id: cell.id },
      measure_deletion_impact: { kind: 'scenario', target_id: 'nope' },
      create_cell_dependency: { source_cell_id: 'a', target_cell_id: 'b' },
    }
    const dataTools = TOOL_DEFINITIONS.filter((tool) => tool.surface !== 'interface')
    for (const tool of dataTools) {
      const text = await dispatchTool(null, 'session', tool.name, stubs[tool.name] ?? {})
      expect(typeof text, tool.name).toBe('string')
      expect(text.length, tool.name).toBeGreaterThan(0)
    }
  })

  it('refuses an off-roster write in words, not a raw error', async () => {
    const text = await dispatchTool(null, 'session', 'upsert_cell', {
      path_id: 'p',
      lane_id: 'l',
      step_id: 's',
      content: 'x',
    })
    expect(text).toContain('no database connected')
    expect(text).toContain('Connect a database to author.')
  })
})
