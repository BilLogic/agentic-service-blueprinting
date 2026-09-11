// @vitest-environment jsdom
/**
 * A scenario that has made no layout choice takes the row's.
 *
 * The phase frame resolves each scenario's view as
 * `stored ?? phase default ?? 'stacked'`. That middle arm only exists if
 * "no choice" can be told apart from an explicit 'stacked', so the getter
 * answers `undefined` for a scenario that never chose. When it answered
 * 'stacked' for both, the row's default could never reach a panel.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { PhaseScenarioOverview } from '@/components/blueprint/PhaseScenarioOverview'
import type { PathListItem } from '@/lib/pathSelection'
import type { NavItem, SlideViewType } from '@/types/nav'

vi.mock('@/components/blueprint/ScenarioBlueprintPanel', () => {
  const Panel = (props: {
    slide: NavItem
    displayViewType?: SlideViewType
    selectedPathIds: string[]
  }) => (
    <div
      data-testid="panel"
      data-scenario={props.slide.id}
      data-view-type={props.displayViewType}
      data-paths={props.selectedPathIds.join(',')}
    />
  )
  return {
    getScenarioBlueprintPanelHeight: () => 400,
    ScenarioBlueprintPanelBody: Panel,
  }
})

vi.mock('@/hooks/useCanvasBlueprints', () => ({
  useCanvasBlueprints: () => ({
    blueprintsByScenario: new Map(),
    pathsByScenario: new Map(),
    blueprintsByPathId: new Map(),
    loading: false,
    error: null,
    usingFallback: false,
    progress: { loaded: 0, total: 0 },
  }),
}))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterEach(cleanup)

function path(id: string, kind: PathListItem['kind']): PathListItem {
  return { id, name: id, summary: null, note: null, kind, status: 'live' }
}

const PHASE: NavItem = { id: 'phase', index: 0, label: 'Onboarding' }
const SLIDES: NavItem[] = [
  PHASE,
  // Never chose a layout.
  { id: 'arrive', index: 0, label: 'Arrive', parentId: 'phase' },
  // Chose stacked, explicitly.
  { id: 'settle', index: 1, label: 'Settle', parentId: 'phase', layout: 'stacked' },
]
const PATHS = new Map<string, PathListItem[]>([
  ['arrive', [path('arrive-a', 'happy'), path('arrive-b', 'variant')]],
  ['settle', [path('settle-a', 'happy'), path('settle-b', 'variant')]],
])
const everyPath = (_scenarioId: string, paths: PathListItem[]) =>
  paths.map((item) => item.id)

function viewTypeOf(scenarioId: string) {
  const panel = screen
    .getAllByTestId('panel')
    .find((element) => element.dataset.scenario === scenarioId)
  return panel?.dataset.viewType
}

describe('the phase frame’s view-type fallback', () => {
  it('hands a scenario with no choice the row’s view, and keeps an explicit one', () => {
    render(
      <PhaseScenarioOverview
        phase={PHASE}
        slides={SLIDES}
        variant="overview"
        alignPanelHeights
        pathsByScenario={PATHS}
        blueprintsByPathId={new Map()}
        getSelectedPathIds={everyPath}
        displayViewType="merged"
        loading={false}
        getScenarioDisplayViewType={(slide) => slide.layout}
      />,
    )

    expect(viewTypeOf('arrive')).toBe('merged')
    expect(viewTypeOf('settle')).toBe('stacked')
  })

  it('falls through to stacked when the row names no view either', () => {
    render(
      <PhaseScenarioOverview
        phase={PHASE}
        slides={SLIDES}
        variant="overview"
        alignPanelHeights
        pathsByScenario={PATHS}
        blueprintsByPathId={new Map()}
        getSelectedPathIds={everyPath}
        loading={false}
        getScenarioDisplayViewType={(slide) => slide.layout}
      />,
    )

    expect(viewTypeOf('arrive')).toBe('stacked')
  })
})
