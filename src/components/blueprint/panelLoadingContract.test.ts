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
 *
 * The per-panel comparisons — phase against `PhasePanel`, step against
 * `StepPanel`, scenario against `ScenarioPanel`, and the fourth-state check on
 * `LanePanel` — need those panels, which arrive with the entity panels. What
 * is checkable now is the shape of the placeholder module itself: one
 * placeholder per panel, and no generic one to fall back to.
 */
describe('a panel and its placeholder agree on shape', () => {
  const loading = src('components/blueprint/panelLoading.tsx')

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
})
