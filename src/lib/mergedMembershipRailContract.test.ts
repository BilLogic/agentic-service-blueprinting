import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function source(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    'utf8',
  )
}

const compareCell = source('../components/blueprint/CompareCellBlock.tsx')
const mergedGrid = source('../components/blueprint/MergedCompareGrid.tsx')
const cellButton = source('../components/blueprint/BlueprintCellButton.tsx')
const pathTheme = source('./pathColorTheme.ts')
const scenarioPanel = source(
  '../components/blueprint/ScenarioBlueprintPanel.tsx',
)
const resizablePanel = source(
  '../components/blueprint/ResizableComparePanel.tsx',
)
const techPill = source('../components/blueprint/BlueprintTechPill.tsx')
const techPillFace = source('../components/blueprint/TechPillFace.tsx')
const blueprintCss = source('../styles/blueprint.css')
const dependencySections = source(
  '../components/blueprint/CellDependencySections.tsx',
)

describe('merged path-membership outline contract', () => {
  it('preserves lane fills and removes whole-cell path washes', () => {
    expect(compareCell).not.toContain('getPathWashStyle')
    expect(compareCell).not.toContain('backgroundImage')
    expect(pathTheme).not.toContain('getPathWashStyle')
    expect(compareCell).toContain("'compare-membership-outline'")
    expect(compareCell).toContain('membershipOutlineBackground')
    expect(blueprintCss).toContain('.compare-membership-outline::before')
    expect(blueprintCss).toContain('border-radius: inherit')
  })

  it('shows positive membership on shared, subset, and unique cells', () => {
    expect(mergedGrid).not.toContain("assembly?.kind === 'split'")
    expect(mergedGrid).toContain('pathMembership={membershipFor(subCells[0])}')
    expect(mergedGrid).toContain('subCell.pathIds')
  })

  it('uses full path names without abbreviated cell or frame labels', () => {
    expect(compareCell).toContain('membership.pathName')
    expect(compareCell).not.toContain('membership.label')
    expect(mergedGrid).not.toContain('buildComparePathShortLabels')
    expect(mergedGrid).toContain('name={path.name}')
  })

  it('discloses exact membership on hover and existing cell focus', () => {
    expect(compareCell).toContain('Used in paths:')
    expect(compareCell).toContain('onFocusCapture=')
    expect(compareCell).toContain('aria-describedby={ariaDescribedBy}')
    expect(cellButton).toContain('aria-describedby={ariaDescribedBy}')
    expect(compareCell).toContain(
      '<TooltipTrigger render={shell} tabIndex={-1} />',
    )
  })

  it('keeps every tech pill rounded and carries the outline on its face', () => {
    expect(compareCell).toContain(
      "hasMembershipOutline && 'compare-membership-outline'",
    )
    expect(techPill).not.toContain('borderTopLeftRadius: 0')
    expect(techPill).not.toContain('squareTop')
    expect(techPillFace).not.toContain('borderTopLeftRadius: 0')
    expect(techPillFace).not.toContain('squareTop')
  })

  it('keeps panel-detail pills inline instead of using canvas dimensions', () => {
    expect(techPillFace).toContain('inline = false')
    expect(techPillFace).toContain('...(!inline')
    expect(dependencySections).toContain('asSpan\n                  inline')
  })

  it('omits the obsolete visual divergence strip without removing agent navigation', () => {
    expect(scenarioPanel).not.toContain('CompareDivergenceStrip')
    expect(scenarioPanel).toContain("name: 'jump_divergence'")
    expect(resizablePanel).not.toContain('chromeBar')
  })
})
