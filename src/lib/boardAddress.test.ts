import { describe, expect, it } from 'vitest'
import {
  appendBoardParams,
  boardPathKeys,
  parseBoardAddress,
  resolveBoardTarget,
  resolvePathKeys,
  type BoardAddress,
} from '@/lib/boardAddress'
import type { PathListItem } from '@/lib/pathSelection'
import type { NavItem } from '@/types/nav'

/*
 * The address a board wears. What is asserted here is the vocabulary — what a
 * param means, what its absence means, and what a name that no longer resolves
 * degrades to. That the app then walks to it is `boardAddressSync.test.tsx`.
 */

const PHASE = 'phase-1'
const SCENARIO = 'scenario-1'

const SLIDES: NavItem[] = [
  { id: PHASE, index: 1, label: 'Application' },
  { id: SCENARIO, index: 1, label: 'Discovery', parentId: PHASE },
]

function path(name: string, kind: PathListItem['kind']): PathListItem {
  return { id: `id-${name}`, name, summary: null, note: null, kind }
}

const PATHS = [path('Found by search', 'happy'), path('Referred', 'variant')]

function serialize(address: BoardAddress): string {
  const params = new URLSearchParams()
  appendBoardParams(params, address)
  const search = params.toString()
  return search ? `?${search}` : ''
}

describe('the address round-trips', () => {
  it('carries the board a reader is standing on', () => {
    const address: BoardAddress = {
      phaseId: PHASE,
      scenarioId: SCENARIO,
      pathKeys: ['happy:Found by search', 'variant:Referred'],
      view: 'merged',
    }
    expect(parseBoardAddress(serialize(address))).toEqual(address)
  })

  it('repeats the paths param rather than joining the names', () => {
    // A path is `kind:name` and a name is free text in any language, so no
    // character is available as a separator.
    const search = serialize({
      phaseId: null,
      scenarioId: SCENARIO,
      pathKeys: ['happy:Sign up, then pay', 'variant:Referred'],
      view: null,
    })
    expect(parseBoardAddress(search).pathKeys).toEqual([
      'happy:Sign up, then pay',
      'variant:Referred',
    ])
  })

  it('tells an unstated selection from one the reader emptied', () => {
    const unstated = parseBoardAddress('?scenario=scenario-1')
    const emptied = parseBoardAddress('?scenario=scenario-1&paths=')
    expect(unstated.pathKeys).toBeNull()
    expect(emptied.pathKeys).toEqual([])
  })

  it('drops a view it does not recognise instead of failing', () => {
    expect(parseBoardAddress('?view=sideways').view).toBeNull()
  })
})

describe('an address degrades to the nearest valid board', () => {
  it('falls back to the phase when the scenario is gone', () => {
    expect(
      resolveBoardTarget(SLIDES, {
        phaseId: PHASE,
        scenarioId: 'deleted',
        pathKeys: null,
        view: null,
      }),
    ).toEqual({ phaseId: PHASE, scenarioId: null })
  })

  it('falls back to nothing — the overview — when the phase is gone too', () => {
    expect(
      resolveBoardTarget(SLIDES, {
        phaseId: 'deleted',
        scenarioId: 'deleted',
        pathKeys: null,
        view: null,
      }),
    ).toEqual({ phaseId: null, scenarioId: null })
  })

  it('reads the phase off the scenario when the two disagree', () => {
    // The deeper name is the board; the phase is only ever the parachute.
    expect(
      resolveBoardTarget(SLIDES, {
        phaseId: 'some-other-phase',
        scenarioId: SCENARIO,
        pathKeys: null,
        view: null,
      }),
    ).toEqual({ phaseId: PHASE, scenarioId: SCENARIO })
  })

  it('keeps the default when no path it names exists here', () => {
    expect(resolvePathKeys(PATHS, ['variant:Renamed last week'])).toBeNull()
  })

  it('honours the paths that do resolve and drops the rest', () => {
    expect(
      resolvePathKeys(PATHS, ['variant:Referred', 'variant:Renamed']),
    ).toEqual(['variant:Referred'])
  })

  it('still empties a board that asked to be empty', () => {
    expect(resolvePathKeys(PATHS, [])).toEqual([])
  })
})

describe('the address says nothing the board already says', () => {
  it('is silent when the scenario is showing its own default path', () => {
    expect(boardPathKeys(PATHS, ['happy:Found by search'])).toBeNull()
  })

  it('speaks up as soon as a second path is drawn', () => {
    expect(
      boardPathKeys(PATHS, ['happy:Found by search', 'variant:Referred']),
    ).toEqual(['happy:Found by search', 'variant:Referred'])
  })

  it('ignores keys belonging to other scenarios', () => {
    // Path selection is global and identity-keyed, so the active set spans
    // every scenario loaded. Only this board's own paths are its address.
    expect(
      boardPathKeys(PATHS, ['happy:Found by search', 'happy:Offer accepted']),
    ).toBeNull()
  })
})
