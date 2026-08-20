import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function source(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8')
}

const legacyArrows = source('../components/blueprint/BlueprintTriggerArrows.tsx')
const integratedArrows = source(
  '../components/blueprint/IntegratedTriggerArrows.tsx',
)
const phaseSection = source('../components/editor/CanvasPhaseSection.tsx')
const phaseLoop = source('../components/editor/PhaseOverviewPhaseLoopArrow.tsx')
const viewport = source('../components/editor/ZoomPanViewport.tsx')

describe('canvas stacking contract', () => {
  it('keeps forward connectors below cells in both arrow renderers', () => {
    expect(legacyArrows).toContain("layer === 'forward' ? 'z-0' : 'z-[30]'")
    expect(integratedArrows).toContain("layer === 'forward' ? 'z-0' : 'z-[30]'")
  })

  it('keeps phase connectors below badges and annotation tools', () => {
    expect(phaseSection).toContain(
      'className="pointer-events-none absolute z-20 -translate-x-1/2"',
    )
    expect(phaseLoop).toContain(
      'className="pointer-events-none absolute left-0 top-0 z-20 overflow-visible"',
    )
  })

  it('contains canvas-local layers in one stacking context', () => {
    expect(viewport).toContain("cn('relative isolate min-h-0 flex-1', className)")
  })
})
