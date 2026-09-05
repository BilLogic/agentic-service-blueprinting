import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = (relative: string) =>
  readFileSync(resolve(__dirname, '..', '..', relative), 'utf8')

/**
 * A placeholder that stops matching its panel is invisible in review and
 * obvious to a reader, which is the worst way round.
 *
 * These assert STRUCTURE — how many fields, at what row counts — not pixels.
 * The claim that broke was structural: one placeholder with two equal boxes
 * standing in for a three-textarea panel, a four-field form, an image row and
 * an accordion. Pixel assertions would be brittle and would get skipped, which
 * is how a contract test stops holding anything.
 */
describe('a panel and its placeholder agree on shape', () => {
  const loading = src('components/blueprint/panelLoading.tsx')

  /** PanelTextareaField's own default, so an omitted `rows` still compares. */
  const DEFAULT_ROWS = 3

  /** Row count per field, in order — an omitted `rows` counts as the default. */
  const fieldRowsIn = (block: string): number[] =>
    [...block.matchAll(/<(?:PanelTextareaField|FieldSkeleton)\b([\s\S]*?)\/?>/g)]
      .map((match) => {
        const rows = match[1].match(/rows=\{(\d+)\}/)
        return rows ? Number(rows[1]) : DEFAULT_ROWS
      })

  const componentBody = (source: string, name: string): string => {
    const start = source.indexOf(`export function ${name}`)
    expect(start, `${name} moved or was renamed`).toBeGreaterThan(-1)
    const next = source.indexOf('\nexport function ', start + 1)
    return source.slice(start, next === -1 ? source.length : next)
  }

  it('gives every panel a placeholder of its own', () => {
    // The failure this whole unit exists to end: four panels sharing one
    // shape. `PanelLoading` is gone; nothing may bring it back.
    for (const panel of ['Phase', 'Lane', 'Step', 'Scenario', 'Service']) {
      expect(
        loading,
        `${panel} has no placeholder of its own`,
      ).toMatch(new RegExp(`export function ${panel}PanelLoading\\b`))
    }
    expect(loading, 'the generic placeholder is back').not.toMatch(
      /export function PanelLoading\b/,
    )
  })

  it('gives the phase panel one placeholder per field, at its row counts', () => {
    const panel = src('components/blueprint/PhasePanel.tsx')
    // Summary, business impact, operational requirements.
    expect(fieldRowsIn(componentBody(loading, 'PhasePanelLoading'))).toEqual(
      fieldRowsIn(panel),
    )
  })

  it('gives the step panel its one field at the same row count', () => {
    const panel = src('components/blueprint/StepPanel.tsx')
    expect(fieldRowsIn(componentBody(loading, 'StepPanelLoading'))).toEqual(
      fieldRowsIn(panel),
    )
  })

  it('gives the scenario panel its one field at the same row count', () => {
    const panel = src('components/blueprint/ScenarioPanel.tsx')
    // The scenario panel's own summary. The path fields inside the accordion
    // are per-path and the placeholder draws a row per path instead.
    expect(fieldRowsIn(componentBody(loading, 'ScenarioPanelLoading'))).toEqual(
      fieldRowsIn(panel).slice(0, 1),
    )
  })

  it('never leaves a panel on the generic placeholder', () => {
    for (const panel of [
      'PhasePanel',
      'LanePanel',
      'StepPanel',
      'ScenarioPanel',
    ]) {
      const source = src(`components/blueprint/${panel}.tsx`)
      expect(source, `${panel} is back on the generic placeholder`).not.toMatch(
        /<PanelLoading\s*\/>/,
      )
      expect(source, `${panel} has no placeholder`).toMatch(
        /<\w+PanelLoading[\s/>]/,
      )
    }
  })

  it('gives every entity panel the fourth state', () => {
    // Loading and error were there; empty was not, so a lane with nothing
    // recorded rendered a form of blank fields.
    const lane = src('components/blueprint/LanePanel.tsx')
    expect(lane).toMatch(/<PanelEmpty/)
    // View mode only — in Edit a blank form is how a value gets recorded.
    expect(lane).toMatch(/!canEdit/)
  })
})
