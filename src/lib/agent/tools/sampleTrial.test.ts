import { describe, expect, it } from 'vitest'
import { dispatchTool } from '@/lib/agent/tools/registry'
import {
  sampleGetBlueprint,
  sampleGetCell,
  sampleGetSlice,
  sampleListOwnerTags,
  sampleListScenarios,
  sampleListSlices,
} from '@/lib/agent/tools/sampleRead'
import {
  SAMPLE_BLUEPRINTS_BY_SCENARIO,
  SAMPLE_DEMO_SLICES,
} from '@/data/sampleBlueprint'
import {
  SAMPLE_TRIAL_TOOL_NAMES,
  TOOL_SPECS,
  WRITE_TOOL_NAMES,
} from '@/lib/agent/tools/specs'

/**
 * The no-database trial: a developer with no backend gets the agent's
 * READING half against the bundled sample, and no writing half at all.
 *
 * "No write tools" here means ABSENT, not refused — the roster is what the
 * loop registers with the provider, so a write tool that slipped into it
 * would be offered to the model before any refusal could catch it.
 */
describe('the sample-trial tool roster', () => {
  it('contains zero write tools', () => {
    const leaked = [...SAMPLE_TRIAL_TOOL_NAMES].filter((name) =>
      WRITE_TOOL_NAMES.has(name),
    )
    expect(leaked).toEqual([])
  })

  it('only names tools that exist in the registry', () => {
    const specNames = new Set(TOOL_SPECS.map((spec) => spec.name))
    const phantom = [...SAMPLE_TRIAL_TOOL_NAMES].filter(
      (name) => !specNames.has(name),
    )
    expect(phantom).toEqual([])
  })

  it('registers only reading and navigation for the provider', () => {
    const offered = TOOL_SPECS.filter((spec) =>
      SAMPLE_TRIAL_TOOL_NAMES.has(spec.name),
    ).map((spec) => spec.name)
    expect(offered.length).toBe(SAMPLE_TRIAL_TOOL_NAMES.size)
    expect(offered.some((name) => WRITE_TOOL_NAMES.has(name))).toBe(false)
    for (const name of ['list_scenarios', 'get_blueprint', 'get_cell'])
      expect(offered).toContain(name)
  })
})

describe('sample reads resolve from the bundled fallbacks', () => {
  it('lists every sample phase and every sample scenario with ids', () => {
    const text = sampleListScenarios()
    for (const scenarioId of Object.keys(SAMPLE_BLUEPRINTS_BY_SCENARIO))
      expect(text).toContain(scenarioId)
  })

  it('renders a grid for EVERY scenario, not just the first', () => {
    for (const [scenarioId, blueprints] of Object.entries(
      SAMPLE_BLUEPRINTS_BY_SCENARIO,
    )) {
      const grid = sampleGetBlueprint(scenarioId)
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
      expect(sampleGetCell(cellId)).toContain('layer_id:')
    }
  })

  it('serves the cell spec — owner pair, function, form, value props', () => {
    const spec = Object.values(SAMPLE_BLUEPRINTS_BY_SCENARIO)
      .flat()
      .flatMap((blueprint) => blueprint.cells)
      .find((cell) => cell.owner && cell.function && cell.value_props?.length)
    expect(spec).toBeTruthy()
    const text = sampleGetCell(spec!.id)
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
    const text = sampleListOwnerTags()
    expect(text).not.toBe('No owner tags in use yet.')
    for (const tag of expected) expect(text).toContain(tag)
  })

  it('answers for an unknown scenario or cell instead of throwing', () => {
    expect(sampleGetBlueprint('nope')).toBe('No paths in this scenario.')
    expect(sampleGetCell('nope')).toBe('No cell with id nope.')
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

describe('trial dispatch never reaches a database', () => {
  it('answers reads from the sample with a null client', async () => {
    const text = await dispatchTool(null, 'session', 'list_scenarios', {})
    expect(text).toContain(Object.keys(SAMPLE_BLUEPRINTS_BY_SCENARIO)[0]!)
  })

  it('refuses an off-roster write in words, not a raw error', async () => {
    const text = await dispatchTool(null, 'session', 'upsert_cell', {
      path_id: 'p',
      layer_id: 'l',
      step_id: 's',
      content: 'x',
    })
    expect(text).toContain('no database connected')
    expect(text).toContain('Connect a database to author.')
  })
})
