// @vitest-environment jsdom
/**
 * What a reader observes once a board has an address.
 *
 * The seam is the provider tree the app mounts — editor navigation, the view
 * state that owns the search, and the path selection store — with the two
 * bridge components between them, because every claim here is about how those
 * three behave TOGETHER. `boardAddress.test.ts` holds the vocabulary; this
 * holds sharing, reloading and the back button.
 *
 * Supabase is absent, so the editor falls back to `SAMPLE_NAV` — real phase
 * and scenario ids, no network.
 */
import { SAMPLE_NAV } from '@/data/sampleNav'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BoardAddressSync } from '@/components/editor/BoardAddressSync'
import { ScenarioPathSelectionReset } from '@/components/editor/ScenarioPathSelectionReset'
import { DeploymentConfigProvider } from '@/contexts/DeploymentConfigContext'
import { EditorProvider, useEditor } from '@/contexts/EditorContext'
import {
  PathSelectionProvider,
  usePathSelectionContext,
  usePathSelectionsByScenario,
} from '@/contexts/PathSelectionContext'
import { ViewStateProvider } from '@/contexts/ViewStateContext'
import { EMPTY_BOARD_ADDRESS, setBoardAddress } from '@/lib/boardAddress'
import { setOpenCellId } from '@/lib/openCellStore'
import type { PathListItem } from '@/lib/pathSelection'

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({ client: null, configured: false, canWrite: false }),
}))

/**
 * A phase with two scenarios under it, read out of the fallback rather than
 * indexed into it.
 *
 * The claims below need one phase and two of its scenarios — moving between
 * them is what the back button test steps through. Which entries those are is
 * a fact about whatever sample the deployment ships, and `SAMPLE_NAV` is not
 * ordered phase-then-its-scenarios in every one of them: a sample that lists
 * all its phases first puts a phase, not a scenario, at index 1, and every
 * assertion here would then be about a navigation the app refuses.
 */
const PARENT = SAMPLE_NAV.find(
  (item) =>
    !item.parentId &&
    SAMPLE_NAV.filter((child) => child.parentId === item.id).length >= 2,
)!
const [FIRST, SECOND] = SAMPLE_NAV.filter(
  (item) => item.parentId === PARENT.id,
)

const PHASE = PARENT.id
const DISCOVERY = FIRST.id
const INTERVIEW = SECOND.id

function path(name: string, kind: PathListItem['kind']): PathListItem {
  return { id: `id-${name}`, name, summary: null, note: null, kind }
}

const FOUND = 'happy:Found by search'
const REFERRED = 'variant:Referred'

/** What each scenario's board would register when it renders. */
const CATALOG = new Map<string, PathListItem[]>([
  [DISCOVERY, [path('Found by search', 'happy'), path('Referred', 'variant')]],
  [INTERVIEW, [path('Offer accepted', 'happy')]],
])

/** The board's paths have not arrived yet — a cold load, mid-flight. */
const NO_CATALOG = new Map<string, PathListItem[]>()

type Handles = {
  editor: ReturnType<typeof useEditor>
  paths: ReturnType<typeof usePathSelectionContext>
}

let handles: Handles | null = null

function Probe({ catalog }: { catalog: Map<string, PathListItem[]> }) {
  const editor = useEditor()
  const paths = usePathSelectionContext()
  // The same registration a rendered board performs.
  usePathSelectionsByScenario(catalog)
  // Published from an effect, not from render: `act` flushes effects, so the
  // handles a test reaches for are always the ones the last render produced.
  useEffect(() => {
    handles = { editor, paths }
  })
  return null
}

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function tree(catalog: Map<string, PathListItem[]>) {
  return (
    <QueryClientProvider client={client}>
      {/*
        The deployment seam sits above the editor, as it does in `App.tsx`:
        `EditorProvider` reads the sample nav from it, so a tree without it
        throws rather than quietly falling back — which is the point of the
        seam. No config is passed, so this is the template's own sample.
      */}
      <DeploymentConfigProvider>
      <EditorProvider>
        <ViewStateProvider>
          <PathSelectionProvider>
            <ScenarioPathSelectionReset />
            <BoardAddressSync />
            <Probe catalog={catalog} />
          </PathSelectionProvider>
        </ViewStateProvider>
      </EditorProvider>
      </DeploymentConfigProvider>
    </QueryClientProvider>
  )
}

/** Boot the app at an address, the way a pasted link or a reload arrives. */
async function boot(search: string, catalog = CATALOG) {
  window.history.replaceState(null, '', `/plus-tutoring${search}`)
  let result: ReturnType<typeof render> | null = null
  await act(async () => {
    result = render(tree(catalog))
  })
  return result as unknown as ReturnType<typeof render>
}

function editor(): Handles['editor'] {
  if (!handles) throw new Error('the probe never rendered')
  return handles.editor
}

async function settle() {
  await act(async () => {
    await Promise.resolve()
  })
}

const search = () => window.location.search

afterEach(() => {
  cleanup()
  handles = null
  setOpenCellId(null)
  setBoardAddress(EMPTY_BOARD_ADDRESS)
  window.history.replaceState(null, '', '/plus-tutoring')
})

describe('a board can be sent to someone', () => {
  it('writes the board the reader walked to into the address', async () => {
    await boot('')
    expect(search()).toBe('')

    await act(async () => editor().selectScenario(DISCOVERY))
    await settle()

    const params = new URLSearchParams(search())
    expect(params.get('scenario')).toBe(DISCOVERY)
    expect(params.get('phase')).toBe(PHASE)
  })

  it('says nothing about a path selection the scenario already defaults to', async () => {
    await boot('')
    await act(async () => editor().selectScenario(DISCOVERY))
    await settle()
    expect(new URLSearchParams(search()).getAll('paths')).toEqual([])
  })

  it('names both paths once a second one is drawn beside the first', async () => {
    await boot('')
    await act(async () => editor().selectScenario(DISCOVERY))
    await settle()
    await act(async () => handles?.paths.togglePathKey(REFERRED))
    await settle()

    expect(new URLSearchParams(search()).getAll('paths')).toEqual([
      FOUND,
      REFERRED,
    ])
  })

  it('carries a view mode only when it differs from the one the scenario remembers', async () => {
    await boot('')
    await act(async () => editor().selectScenario(DISCOVERY))
    await settle()
    // SAMPLE_NAV's Discovery is stored `stacked`.
    expect(new URLSearchParams(search()).get('view')).toBeNull()

    await act(async () => editor().setScenarioDisplayViewType(DISCOVERY, 'merged'))
    await settle()
    expect(new URLSearchParams(search()).get('view')).toBe('merged')
  })
})

describe('a reload lands back on the same board', () => {
  it('opens the scenario the address names', async () => {
    await boot(`?scenario=${INTERVIEW}`)
    await settle()
    expect(editor().selectedScenarioId).toBe(INTERVIEW)
    expect(editor().view).toBe('detail')
  })

  it('restores a two-path comparison', async () => {
    await boot(`?scenario=${DISCOVERY}&paths=${encodeURIComponent(FOUND)}&paths=${encodeURIComponent(REFERRED)}`)
    await settle()
    await settle()
    expect(handles?.paths.getSelectedPathIds(DISCOVERY)).toEqual([
      'id-Found by search',
      'id-Referred',
    ])
  })

  it('waits for a board whose paths arrive late', async () => {
    /*
      The defect this pins. On a cold load the path catalog does not exist for
      several seconds — it is built when the board renders — and an address
      that stopped waiting was written back to the URL without the paths it
      had asked for. A two-path comparison someone had sent arrived as one
      path, silently, and the link they still had in their hand no longer said
      what they had sent.
    */
    const link = await boot(
      `?scenario=${DISCOVERY}&paths=${encodeURIComponent(FOUND)}&paths=${encodeURIComponent(REFERRED)}`,
      NO_CATALOG,
    )
    await settle()
    expect(handles?.paths.getSelectedPathIds(DISCOVERY)).toEqual([])
    // Still asking: the address has not been overwritten while it waits.
    expect(new URLSearchParams(search()).getAll('paths')).toEqual([
      FOUND,
      REFERRED,
    ])

    await act(async () => link.rerender(tree(CATALOG)))
    await settle()
    await settle()

    expect(handles?.paths.getSelectedPathIds(DISCOVERY)).toEqual([
      'id-Found by search',
      'id-Referred',
    ])
  })

  it('restores a view mode the reader had switched', async () => {
    await boot(`?scenario=${DISCOVERY}&view=merged`)
    await settle()
    const slide = editor().slides.find((item) => item.id === DISCOVERY)
    expect(slide && editor().getScenarioDisplayViewType(slide)).toBe('merged')
  })
})

describe('an address that no longer resolves degrades to the nearest valid board', () => {
  it('opens the phase when the scenario is gone', async () => {
    await boot(`?phase=${PHASE}&scenario=00000000-0000-4000-8000-00000000dead`)
    await settle()
    expect(editor().selectedPhaseId).toBe(PHASE)
    expect(editor().selectedScenarioId).toBeNull()
    // And the dead name is written out of the address, so what the reader
    // copies next is the board they are actually on.
    expect(search()).toBe(`?phase=${PHASE}`)
  })

  it('stays on the overview when neither is left', async () => {
    await boot('?scenario=00000000-0000-4000-8000-00000000dead')
    await settle()
    expect(editor().selectedScenarioId).toBeNull()
    expect(editor().selectedPhaseId).toBeNull()
    expect(search()).toBe('')
  })

  it('keeps the scenario default when no path it names exists', async () => {
    await boot(`?scenario=${DISCOVERY}&paths=${encodeURIComponent('variant:Renamed')}`)
    await settle()
    await settle()
    expect(handles?.paths.getSelectedPathIds(DISCOVERY)).toEqual([
      'id-Found by search',
    ])
  })
})

describe('back steps between boards, not between panel opens', () => {
  it('adds one history entry per board and none for a cell panel', async () => {
    await boot('')
    const before = window.history.length

    await act(async () => editor().selectScenario(DISCOVERY))
    await settle()
    await act(async () => editor().selectScenario(INTERVIEW))
    await settle()
    expect(window.history.length).toBe(before + 2)

    await act(async () => setOpenCellId('cell-9'))
    await settle()
    expect(window.history.length).toBe(before + 2)

    // And the panel's own address is complete: the board is still in it.
    const params = new URLSearchParams(search())
    expect(params.get('cell')).toBe('cell-9')
    expect(params.get('scenario')).toBe(INTERVIEW)
  })

  it('steps back to the board the reader came from', async () => {
    await boot('')
    await act(async () => editor().selectScenario(DISCOVERY))
    await settle()
    await act(async () => editor().selectScenario(INTERVIEW))
    await settle()

    await act(async () => {
      window.history.back()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    await settle()

    expect(editor().selectedScenarioId).toBe(DISCOVERY)
    expect(new URLSearchParams(search()).get('scenario')).toBe(DISCOVERY)
  })

  it('steps back out of the last board to the overview', async () => {
    await boot('')
    await act(async () => editor().selectScenario(DISCOVERY))
    await settle()

    await act(async () => {
      window.history.back()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    await settle()

    expect(editor().selectedScenarioId).toBeNull()
    expect(search()).toBe('')
  })
})
