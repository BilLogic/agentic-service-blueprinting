import { describe, expect, it } from 'vitest'
import {
  defaultPathKeysFromCatalog,
  deriveSelections,
} from '@/lib/pathCatalogSelection'
import { isScenarioSwitch } from '@/contexts/PathSelectionContext'
import type { PathListItem } from '@/lib/pathSelection'

/*
 * The overview's default path selection.
 *
 * Pins the bug this fixed: the default used to be the FIRST scenario's
 * preferred path key, applied globally. Any scenario naming its own happy
 * path differently then matched nothing and rendered empty on the service
 * overview — silently, with no error and nothing in the console. Uno's own
 * content reuses one path name across scenarios, so the key matched
 * everywhere by luck; these fixtures deliberately do not, which is the case
 * that was broken and the one the next scenario with its own vocabulary
 * would have hit.
 */

const path = (id: string, name: string, path_type: string): PathListItem =>
  ({ id, name, path_type }) as PathListItem

const catalog = {
  s1: [path('p1', 'Happy Path', 'happy'), path('p2', 'Rejected', 'unhappy')],
  s2: [path('p3', 'First visit', 'happy')],
  s3: [path('p4', 'Guided mapping', 'happy')],
}

describe('overview default path selection', () => {
  it('carries every scenario’s own default, not just the first scenario’s', () => {
    expect(defaultPathKeysFromCatalog(catalog)).toHaveLength(3)
  })

  it('selects each scenario’s own path, so no phase renders empty', () => {
    const selections = deriveSelections(catalog, defaultPathKeysFromCatalog(catalog))
    expect(selections.s1).toEqual(['p1'])
    expect(selections.s2).toEqual(['p3'])
    expect(selections.s3).toEqual(['p4'])
  })

  it('never selects more than one path per scenario', () => {
    const selections = deriveSelections(catalog, defaultPathKeysFromCatalog(catalog))
    for (const [scenarioId, ids] of Object.entries(selections)) {
      expect(ids.length, scenarioId).toBeLessThanOrEqual(1)
    }
  })

  it('dedupes a name shared across scenarios into one key', () => {
    const shared = {
      a: [path('p1', 'Happy Path', 'happy')],
      b: [path('p2', 'Happy Path', 'happy')],
    }
    expect(defaultPathKeysFromCatalog(shared)).toHaveLength(1)
    const selections = deriveSelections(shared, defaultPathKeysFromCatalog(shared))
    expect(selections.a).toEqual(['p1'])
    expect(selections.b).toEqual(['p2'])
  })

  it('leaves a scenario empty only when it has no paths at all', () => {
    const withEmpty = { ...catalog, s4: [] as PathListItem[] }
    const selections = deriveSelections(withEmpty, defaultPathKeysFromCatalog(withEmpty))
    expect(selections.s4).toEqual([])
    expect(selections.s2).toEqual(['p3'])
  })
})

/*
 * The scenario-switch collapse (ScenarioPathSelectionReset). The decision
 * predicate is pure and pinned here; the collapse itself is exercised
 * through the provider in a browser, where it is a visible behavior
 * (a Merged comparison does not follow the reader to the next scenario).
 */
describe('scenario-switch collapse decision', () => {
  it('collapses only on a scenario-to-scenario move', () => {
    // First entry — overview or deep link. The overview filter survives.
    expect(isScenarioSwitch(null, 's1')).toBe(false)
    // Leaving to the overview is not a switch either.
    expect(isScenarioSwitch('s1', null)).toBe(false)
    // Re-selecting the same scenario recenters the camera, nothing more.
    expect(isScenarioSwitch('s1', 's1')).toBe(false)
    // The one move that resets.
    expect(isScenarioSwitch('s1', 's2')).toBe(true)
  })
})
