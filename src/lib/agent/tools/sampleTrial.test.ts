import { describe, expect, it } from 'vitest'
import { dispatchTool } from '@/lib/agent/tools/registry'
import {
  sampleGetBlueprint,
  sampleGetCell,
  sampleListScenarios,
  sampleListSlices,
} from '@/lib/agent/tools/sampleRead'
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
  it('lists the sample phase and scenario with ids', () => {
    const text = sampleListScenarios()
    expect(text).toContain('Phase "Discover"')
    expect(text).toContain('Scenario "Sample Service"')
  })

  it('renders the sample grid with lanes, steps and cell ids', () => {
    const scenarioId = /Scenario "Sample Service" \(([^)]+)\)/.exec(
      sampleListScenarios(),
    )?.[1]
    expect(scenarioId).toBeTruthy()
    const grid = sampleGetBlueprint(scenarioId!)
    expect(grid).toContain('Path "Happy Path"')
    expect(grid).toMatch(/Steps: \d+\. "/)
    expect(grid).toContain('Lane "')

    const cellId = /\[step \d+\] "[^"]*" \(([^)]+)\)/.exec(grid)?.[1]
    expect(cellId).toBeTruthy()
    expect(sampleGetCell(cellId!)).toContain('layer_id:')
  })

  it('answers for an unknown scenario or cell instead of throwing', () => {
    expect(sampleGetBlueprint('nope')).toBe('No paths in this scenario.')
    expect(sampleGetCell('nope')).toBe('No cell with id nope.')
  })

  it('lists the demo slices', () => {
    expect(sampleListSlices()).not.toBe('No slices yet.')
  })
})

describe('trial dispatch never reaches a database', () => {
  it('answers reads from the sample with a null client', async () => {
    const text = await dispatchTool(null, 'session', 'list_scenarios', {})
    expect(text).toContain('Sample Service')
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
