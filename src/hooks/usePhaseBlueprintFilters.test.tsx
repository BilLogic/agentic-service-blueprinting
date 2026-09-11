// @vitest-environment jsdom
/**
 * A phase row draws each scenario's happy path and nothing else.
 *
 * Path selection is identity-keyed and global: a key is `kind:name`, so a
 * variant chosen inside one scenario also selects every other scenario's path
 * that happens to carry the same name. That is right for the focused
 * scenario's own picker and wrong for the row around it. The row is a survey,
 * one path per scenario, and variants and exceptions stay inside the scenario
 * that owns them.
 */
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  PathSelectionProvider,
  usePathSelectionContext,
} from '@/contexts/PathSelectionContext'
import { usePhaseBlueprintFilters } from '@/hooks/usePhaseBlueprintFilters'
import { getOverviewPathKey } from '@/lib/overviewPathFilters'
import type { PathListItem } from '@/lib/pathSelection'
import type { BlueprintData } from '@/types/blueprint'
import type { NavItem } from '@/types/nav'

function path(
  id: string,
  name: string,
  kind: PathListItem['kind'],
): PathListItem {
  return { id, name, summary: null, note: null, kind, status: 'live' }
}

/*
  Two scenarios in one phase. Each names its happy path in its own words, and
  both carry a variant with the same name — the case where a key chosen in
  one scenario reaches the other.
*/
const ARRIVE = [
  path('p-arrive-happy', 'First visit', 'happy'),
  path('p-arrive-declined', 'Card declined', 'variant'),
]
const SETTLE = [
  path('p-settle-happy', 'Guided setup', 'happy'),
  path('p-settle-declined', 'Card declined', 'variant'),
]
const PATHS = new Map<string, PathListItem[]>([
  ['arrive', ARRIVE],
  ['settle', SETTLE],
])
const BLUEPRINTS = new Map<string, BlueprintData>()

vi.mock('@/hooks/useCanvasBlueprints', () => ({
  useCanvasBlueprints: () => ({
    blueprintsByScenario: new Map(),
    pathsByScenario: PATHS,
    blueprintsByPathId: BLUEPRINTS,
    loading: false,
    error: null,
    usingFallback: false,
    progress: { loaded: 2, total: 2 },
  }),
}))

const SLIDES: NavItem[] = [
  { id: 'phase', index: 0, label: 'Onboarding' },
  { id: 'arrive', index: 0, label: 'Arrive', parentId: 'phase' },
  { id: 'settle', index: 1, label: 'Settle', parentId: 'phase' },
]
const SCOPE = ['arrive', 'settle']
const noLayoutChoice = (slide: NavItem) => slide.layout
const ignoreLayout = () => {}

function wrapper({ children }: { children: ReactNode }) {
  return <PathSelectionProvider>{children}</PathSelectionProvider>
}

function renderFilters(initialFocus: string | null) {
  return renderHook(
    ({ focusedScenarioId }: { focusedScenarioId: string | null }) => ({
      filters: usePhaseBlueprintFilters({
        scenarioIds: SCOPE,
        slides: SLIDES,
        getScenarioDisplayViewType: noLayoutChoice,
        setScenarioDisplayViewType: ignoreLayout,
        focusedScenarioId,
      }),
      store: usePathSelectionContext(),
    }),
    { wrapper, initialProps: { focusedScenarioId: initialFocus } },
  )
}

const sorted = (ids: string[]) => [...ids].sort()

describe('what a phase row draws', () => {
  it('draws one happy path per scenario before anything is chosen', () => {
    const { result } = renderFilters(null)
    const { resolveDrawnPathIds } = result.current.filters

    expect(resolveDrawnPathIds('arrive', ARRIVE)).toEqual(['p-arrive-happy'])
    expect(resolveDrawnPathIds('settle', SETTLE)).toEqual(['p-settle-happy'])
  })

  it('keeps the row at one path per scenario after a variant is chosen in a focused scenario', () => {
    const { result, rerender } = renderFilters('arrive')

    act(() => result.current.store.togglePathKey(getOverviewPathKey(ARRIVE[1]!)))

    // The focused scenario draws the reader's selection: that is what its
    // picker is for.
    expect(
      sorted(result.current.filters.resolveDrawnPathIds('arrive', ARRIVE)),
    ).toEqual(['p-arrive-declined', 'p-arrive-happy'])

    // The key reached the sibling too — same name, same identity...
    expect(sorted(result.current.store.getSelectedPathIds('settle'))).toEqual([
      'p-settle-declined',
      'p-settle-happy',
    ])
    // ...and the row still draws the sibling's happy path alone.
    expect(result.current.filters.resolveDrawnPathIds('settle', SETTLE)).toEqual([
      'p-settle-happy',
    ])

    // Back out to the phase: nothing is focused, so every scenario is a
    // survey entry again, the one that was just focused included.
    rerender({ focusedScenarioId: null })
    expect(result.current.filters.resolveDrawnPathIds('arrive', ARRIVE)).toEqual([
      'p-arrive-happy',
    ])
    expect(result.current.filters.resolveDrawnPathIds('settle', SETTLE)).toEqual([
      'p-settle-happy',
    ])
  })

  it('draws the first path when a scenario has no happy one', () => {
    const { result } = renderFilters(null)
    const onlyVariants = [
      path('p-a', 'Walk-in', 'variant'),
      path('p-b', 'Referral', 'variant'),
    ]
    expect(
      result.current.filters.resolveHappyPathIds('elsewhere', onlyVariants),
    ).toEqual(['p-a'])
    expect(result.current.filters.resolveHappyPathIds('elsewhere', [])).toEqual([])
  })

  it('offers no cross-scenario path filter', () => {
    const { result } = renderFilters(null)
    expect(result.current.filters).not.toHaveProperty('filterPaths')
    expect(result.current.filters).not.toHaveProperty('toggleFilterPath')
  })

  it('reads a scenario with no layout choice as stacked', () => {
    const { result } = renderFilters(null)
    expect(result.current.filters.layout).toBe('stacked')
  })
})
