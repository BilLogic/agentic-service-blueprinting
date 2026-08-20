import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const phaseSectionSource = readFileSync(
  fileURLToPath(
    new URL('../components/editor/CanvasPhaseSection.tsx', import.meta.url),
  ),
  'utf8',
)
const blueprintCss = readFileSync(
  fileURLToPath(new URL('../styles/blueprint.css', import.meta.url)),
  'utf8',
)

describe('nested scenario hover contract', () => {
  it('does not dim the entire phase as one composited ancestor', () => {
    expect(phaseSectionSource).not.toContain("dimmed && 'opacity-30'")
  })

  it('lifts one nested scenario while retaining phase hierarchy', () => {
    expect(blueprintCss).toContain(
      '[data-canvas-phase-section][data-canvas-focus-dimmed]',
    )
    expect(blueprintCss).toContain(
      '[data-focus-slide-id]:has(> [data-phase-scenario-panel]:hover)',
    )
    expect(blueprintCss).toContain(
      '[data-focus-slide-id]:has(> [data-phase-scenario-panel]:focus-within)',
    )
  })
})
