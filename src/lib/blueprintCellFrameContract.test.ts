import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  CELL_CONTENT_TARGET,
  CELL_CONTENT_WARNING,
  getCellContentLengthGuidance,
} from '@/lib/cellContentLimits'
import {
  VISUAL_ROW_MIN_HEIGHT,
  VISUAL_ROW_MIN_HEIGHT_COMPACT,
  getVisualCellButtonMaxHeight,
} from '@/lib/blueprintLayout'

function source(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8')
}

const visual = source('../components/blueprint/BlueprintStepVisual.tsx')
const serviceGrid = source('../components/blueprint/ServiceBlueprintGrid.tsx')
const scenarioPanel = source(
  '../components/blueprint/ScenarioBlueprintPanel.tsx',
)
const phaseOverview = source(
  '../components/blueprint/PhaseScenarioOverview.tsx',
)
const compareDecorations = source(
  '../components/blueprint/CompareTrackDecorations.tsx',
)
const pathFrame = source(
  '../components/blueprint/ComparePathSectionFrame.tsx',
)
const techPill = source('../components/blueprint/BlueprintTechPill.tsx')
const css = source('../styles/blueprint.css')
const agentRegistry = source('./agent/tools/registry.ts')
const agentSpecs = source('./agent/tools/specs.ts')

describe('stable blueprint cell frame contract', () => {
  it('keeps storyboard geometry at 4:3 and fits image pixels inside it', () => {
    expect(visual).toContain("'aspect-[4/3]")
    expect(visual).toContain('w-full max-w-full')
    expect(visual).toContain("'h-full w-full rounded-sm object-contain")
    expect(VISUAL_ROW_MIN_HEIGHT).toBe(176)
    expect(VISUAL_ROW_MIN_HEIGHT_COMPACT).toBe(168)
    expect(getVisualCellButtonMaxHeight()).toBe(144)
    expect(getVisualCellButtonMaxHeight(true)).toBe(144)
  })

  it('keeps one grid arrangement and geometry across overview and focus', () => {
    expect(scenarioPanel).not.toContain('SideBySideCompareGrid')
    expect(scenarioPanel).not.toContain('isOverviewConstrained')
    expect(scenarioPanel).not.toContain('focusActive ?')
    expect(phaseOverview).toContain('displayViewType={scenarioViewType}')
    // Focus may not branch the panel's geometry props — it goes through
    // `resolveScenarioPanelHeight`, whose whole contract is that the number
    // it returns for a focused panel equals the one it had at overview.
    // (The arithmetic itself is pinned in phaseRowPanelHeight.test.ts.)
    expect(phaseOverview).toContain('resolveScenarioPanelHeight({')
    expect(pathFrame).not.toContain('extraTopInset')
  })

  it('retains both header axes and skeletonizes their paint at blocks tier', () => {
    expect(compareDecorations).toContain('data-blueprint-column-header=""')
    expect(serviceGrid).toContain('<ServiceStepHeaderRow')
    expect(serviceGrid).toContain('data-blueprint-row-header=""')
    expect(css).toContain("[data-semantic-tier='blocks']")
    expect(css).toMatch(/\[data-blueprint-column-header\]\s*>\s*span/)
    expect(css).toContain('[data-blueprint-row-header]')
  })

  it('clamps only the narrative preview while retaining its full text node', () => {
    expect(serviceGrid).toContain(
      '<p className="m-auto line-clamp-4 w-full whitespace-pre-wrap">{content}</p>',
    )
  })

  it('clamps pill labels to two lines and keeps the full accessible label', () => {
    expect(techPill).toContain('aria-label={item}')
    expect(techPill).toContain('className="line-clamp-2 break-words"')
  })

  it('semantic zoom paints actual faces, not variable group wrappers', () => {
    expect(css).toContain(
      "[data-semantic-tier='blocks'] [data-blueprint-cell-anchor]",
    )
    expect(css).not.toContain(
      "[data-semantic-tier='blocks'] [data-blueprint-cell] > *",
    )
  })

  it('warns on long copy without refusing or truncating it', () => {
    expect(CELL_CONTENT_TARGET).toBe(80)
    expect(CELL_CONTENT_WARNING).toBe(100)
    expect(getCellContentLengthGuidance('x'.repeat(100)).message).toBeNull()
    expect(getCellContentLengthGuidance('x'.repeat(101)).message).toContain(
      'preserved in full',
    )
    expect(agentRegistry).toContain('getCellContentLengthGuidance')
    expect(agentRegistry).not.toContain('throw new Error(lengthProblem)')
    expect(agentSpecs).toContain('non-blocking review warning')
    expect(agentSpecs).not.toContain('max 120 characters')
  })
})
