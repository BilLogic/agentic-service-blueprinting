import { describe, expect, it } from 'vitest'
import {
  defaultPathKeyForScenario,
  defaultPathKeysFromCatalog,
  deriveSelections,
  type PathCatalog,
} from '@/lib/pathCatalogSelection'
import type { PathListItem } from '@/lib/pathSelection'

function path(
  id: string,
  name: string,
  path_type: PathListItem['path_type'] = 'happy',
): PathListItem {
  return { id, name, description: null, note: null, path_type }
}

/**
 * The shape that broke the service overview: four phases, five scenarios, and
 * a happy path per scenario that is named after its own journey. Nothing here
 * is unusual — it is the template's own sample content.
 */
const DIFFERENTLY_NAMED: PathCatalog = {
  discover: [path('p-discover', 'First visit')],
  adopt: [
    path('p-nodb', 'No-database run'),
    path('p-supabase', 'Supabase run', 'alternative'),
  ],
  map: [path('p-map', 'Guided mapping')],
  present: [path('p-present', 'Stakeholder readout')],
  operate: [path('p-operate', 'Stewardship loop')],
}

describe('defaultPathKeyForScenario', () => {
  it('prefers the canonical Happy Path, then any happy path, then the first', () => {
    expect(
      defaultPathKeyForScenario([
        path('a', 'Recovery', 'alternative'),
        path('b', 'Happy Path'),
      ]),
    ).toBe('happy:Happy Path')
    expect(
      defaultPathKeyForScenario([
        path('a', 'Recovery', 'alternative'),
        path('b', 'Guided mapping'),
      ]),
    ).toBe('happy:Guided mapping')
    expect(
      defaultPathKeyForScenario([path('a', 'Recovery', 'alternative')]),
    ).toBe('alternative:Recovery')
    expect(defaultPathKeyForScenario([])).toBeUndefined()
  })
})

describe('defaultPathKeysFromCatalog', () => {
  it('covers every scenario, not just the first one to load', () => {
    // The regression: this used to return a single key taken from whichever
    // scenario landed in the catalog first, so only that scenario's phase
    // rendered a board.
    expect(defaultPathKeysFromCatalog(DIFFERENTLY_NAMED)).toEqual([
      'happy:First visit',
      'happy:No-database run',
      'happy:Guided mapping',
      'happy:Stakeholder readout',
      'happy:Stewardship loop',
    ])
  })

  it('folds scenarios that share a path identity into one key', () => {
    expect(
      defaultPathKeysFromCatalog({
        a: [path('a1', 'Happy Path')],
        b: [path('b1', 'Happy Path')],
      }),
    ).toEqual(['happy:Happy Path'])
  })

  it('is empty until some scenario has paths', () => {
    expect(defaultPathKeysFromCatalog({})).toEqual([])
    expect(defaultPathKeysFromCatalog({ a: [] })).toEqual([])
  })
})

describe('deriveSelections', () => {
  it('gives every scenario a visible path when the filter is untouched', () => {
    const selections = deriveSelections(DIFFERENTLY_NAMED, null)

    // The predicate the overview renders on: a scenario with no selected path
    // is dropped, and a phase with no surviving scenario shows
    // "No selected paths in this phase".
    expect(selections).toEqual({
      discover: ['p-discover'],
      adopt: ['p-nodb'],
      map: ['p-map'],
      present: ['p-present'],
      operate: ['p-operate'],
    })
    for (const ids of Object.values(selections)) {
      expect(ids.length).toBe(1)
    }
  })

  it('never selects two paths in one scenario by default', () => {
    // Per-scenario compare gates on `selectedPathIds.length >= 2`, so the
    // default union must not switch a scenario into compare on its own —
    // even where one scenario's default key also exists in another scenario.
    const selections = deriveSelections(
      {
        a: [path('a1', 'Recovery', 'alternative')],
        b: [path('b1', 'Happy Path'), path('b2', 'Recovery', 'alternative')],
      },
      null,
    )

    expect(selections).toEqual({ a: ['a1'], b: ['b1'] })
  })

  it('filters globally once a selection is explicit', () => {
    const selections = deriveSelections(DIFFERENTLY_NAMED, [
      'happy:First visit',
      'alternative:Supabase run',
    ])

    expect(selections).toEqual({
      discover: ['p-discover'],
      adopt: ['p-supabase'],
      // Scenarios the selection does not name stay empty on purpose — that is
      // what makes the filter a filter.
      map: [],
      present: [],
      operate: [],
    })
  })

  it('selects both paths of a scenario when both are explicitly chosen', () => {
    expect(
      deriveSelections(DIFFERENTLY_NAMED, [
        'happy:No-database run',
        'alternative:Supabase run',
      ]).adopt,
    ).toEqual(['p-nodb', 'p-supabase'])
  })

  it('honours an explicitly emptied selection', () => {
    const selections = deriveSelections(DIFFERENTLY_NAMED, [])
    expect(Object.values(selections).every((ids) => ids.length === 0)).toBe(true)
  })

  it('falls back to a scenario’s own default when it shares no path name', () => {
    // A scenario whose paths intersect nothing else in the catalog is the
    // normal case, not an edge case: while the filter is untouched it renders
    // its own path rather than nothing.
    const selections = deriveSelections(
      {
        shared: [path('s1', 'Happy Path')],
        island: [path('i1', 'Stewardship loop')],
      },
      null,
    )

    expect(selections.island).toEqual(['i1'])
  })
})
