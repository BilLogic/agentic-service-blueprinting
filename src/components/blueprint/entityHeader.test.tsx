// @vitest-environment jsdom
/**
 * The identity bar reserves its height, and shows which of four states it is
 * in (#237).
 *
 * The bug this file exists against: `ServiceOverviewHeader` returned `null`
 * while `useServiceSpec` was in flight, so the bar had NO height and the
 * canvas under it jumped when the data landed. The same `return null` also
 * collapsed four `QueryResult` states into one picture — a reader could not
 * tell "still loading" from "this deployment has no service" from "the query
 * failed."
 *
 * The seam is `EntityHeader`, rendered. Height is asserted through the box's
 * resolved geometry against the shared contract value, never by matching a
 * Tailwind class: a class name is not a height, and the whole claim is that
 * two states measure the same.
 *
 * One claim needs more than a render. "A remount with a warm cache never
 * re-skeletons" is a statement about a SECOND mount, so it is driven as
 * mount → unmount → remount through the real bar and the app's own query
 * defaults. It holds because of configuration that already exists —
 * `staleTime: Infinity`, `refetchOnWindowFocus: false`, and the hook
 * reporting `ready` whenever `query.data !== undefined` — so it is pinned
 * here rather than built.
 *
 * The same seam carries the KIND BADGE (#240): a reader could not tell a
 * scenario bar from a phase bar, because both are a bold name over a
 * sentence. What is asserted is what a reader can observe — the word that
 * appears, where it appears relative to the name, what hovering and focusing
 * it disclose, and what clicking it does NOT do — never which component drew
 * it. The two claims meet on height: the badge shares the title's row, and
 * the box above must still measure what #237 pinned it to.
 *
 * What this file cannot see: jsdom performs no layout, so "a 20px badge fits
 * a 24px row" is not measurable here. The pinned box is measurable, and it is
 * asserted with the badge proven present, which is the part a regression
 * would break.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setShellBooting } from '@/contexts/shellBootStore'
import type { ReactNode } from 'react'
import { EntityHeader } from '@/components/blueprint/EntityHeader'
import { ServiceOverviewHeader } from '@/components/editor/ServiceOverviewHeader'
import { BLUEPRINT_MENUBAR_IDENTITY_HEIGHT } from '@/components/editor/menubarHeaderLayout'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EntityDetailProvider } from '@/contexts/EntityDetailContext'
import { ENTITY_KIND_DEFINITIONS } from '@/lib/panelTerms'
import { QUERY_DEFAULTS } from '@/lib/queryClient'

const supabase = vi.hoisted(() => ({ client: null as unknown, calls: 0 }))

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: supabase.client,
    configured: true,
    session: null,
    isLoading: false,
    canWrite: false,
    isDevAuthoring: false,
    isEditPreview: false,
    canAgent: false,
  }),
}))

afterEach(cleanup)
// The shell's boot latch is a module store, so a test that raises it would
// leave every later render skeletoning. Lowered after each.
afterEach(() => setShellBooting(false))

const block = () =>
  document.querySelector('[data-entity-header]') as HTMLElement | null
const skeleton = () =>
  document.querySelector('[data-entity-header-skeleton]') as HTMLElement | null
const summarySlot = () =>
  document.querySelector('[data-entity-header-summary]') as HTMLElement | null
/** The title slot is the affordance itself — `EntityTitleAffordance`'s root. */
const titleSlot = () =>
  document.querySelector('[data-entity-title]') as HTMLElement | null
const kindBadge = () =>
  document.querySelector('[data-entity-kind-badge]') as HTMLElement | null
/** The invisible opener filling the title block. The badge must never be this. */
const panelOpener = () =>
  document.querySelector(
    '[data-entity-title-affordance]',
  ) as HTMLButtonElement | null

/**
 * Every render of this bar, inside the provider it now requires.
 *
 * `EntityDetailProvider` is mounted on `EditorShell` in the app, above both
 * trees, and `useEntityDetail` throws outside it — a mounting mistake is meant
 * to be loud. A test renders the bar on its own, so the provider comes with it
 * here rather than being restated at each call site.
 */
function renderWithEntityDetail(ui: ReactNode) {
  return render(<EntityDetailProvider>{ui}</EntityDetailProvider>)
}

/** The box's own height, read back the way a browser would resolve it. */
function measure(): string {
  const element = block()
  if (!element) throw new Error('the bar rendered nothing at all')
  return window.getComputedStyle(element).height
}

describe('EntityHeader height', () => {
  const cases: Array<[string, ReactNode]> = [
    ['loading', <EntityHeader key="l" kind="service" status="loading" />],
    [
      'ready, with a summary',
      <EntityHeader
        key="r1"
        kind="service"
        id="svc-1"
        label="Example service"
        summary="Rooftop solar, end to end."
      />,
    ],
    [
      'ready, no summary',
      <EntityHeader
        key="r2"
        kind="service"
        id="svc-1"
        label="Example service"
      />,
    ],
    ['ready, no service recorded', <EntityHeader key="r3" kind="service" />],
    [
      'error',
      <EntityHeader
        key="e"
        kind="service"
        status="error"
        message="Could not reach the database"
      />,
    ],
  ]

  it('is the same two-line box in every state', () => {
    for (const [name, element] of cases) {
      renderWithEntityDetail(element)
      expect(measure(), name).toBe(BLUEPRINT_MENUBAR_IDENTITY_HEIGHT)
      cleanup()
    }
  })

  it('is unchanged by the kind badge sharing the title row', () => {
    renderWithEntityDetail(
      <EntityHeader
        kind="scenario"
        id="scn-1"
        label="Example service"
        summary="Rooftop solar, end to end."
      />,
    )
    // Asserted, not assumed: without this the height claim above would go on
    // passing if the badge stopped rendering entirely.
    expect(kindBadge()).not.toBeNull()
    expect(measure()).toBe(BLUEPRINT_MENUBAR_IDENTITY_HEIGHT)
  })
})

describe('EntityHeader states', () => {
  it('loading paints a skeleton, and no title', () => {
    renderWithEntityDetail(<EntityHeader kind="service" status="loading" />)
    expect(skeleton()).not.toBeNull()
    expect(titleSlot()).toBeNull()
  })

  it('the skeleton is not announced to a screen reader', () => {
    renderWithEntityDetail(<EntityHeader kind="service" status="loading" />)
    expect(skeleton()?.getAttribute('aria-hidden')).toBe('true')
  })

  it('ready with a service shows the name and the summary', () => {
    renderWithEntityDetail(
      <EntityHeader
        kind="service"
        id="svc-1"
        label="Example service"
        summary="Rooftop solar, end to end."
      />,
    )
    expect(screen.getByText('Example service')).toBeDefined()
    expect(summarySlot()?.textContent).toBe('Rooftop solar, end to end.')
    expect(skeleton()).toBeNull()
  })

  it('ready with no service leaves the bar present, not absent', () => {
    renderWithEntityDetail(<EntityHeader kind="service" />)
    expect(block()).not.toBeNull()
    expect(titleSlot()).toBeNull()
    expect(summarySlot()).toBeNull()
    expect(skeleton()).toBeNull()
  })

  it('error leaves the bar present and reads as a failure, not as empty', () => {
    renderWithEntityDetail(
      <EntityHeader
        kind="service"
        status="error"
        message="Could not reach the database"
      />,
    )
    expect(block()).not.toBeNull()
    expect(summarySlot()?.textContent).toBe('Could not reach the database')
  })

  it('the failure never reaches the title slot', () => {
    renderWithEntityDetail(
      <EntityHeader
        kind="service"
        status="error"
        message="Could not reach the database"
      />,
    )
    // The title is an interactive affordance — it opens the entity panel.
    // Error text there offers a control that leads nowhere.
    expect(titleSlot()).toBeNull()
    expect(screen.queryByLabelText(/^View details:/)).toBeNull()
  })

  it('an error message wins the summary slot from a stale summary', () => {
    renderWithEntityDetail(
      <EntityHeader
        kind="service"
        id="svc-1"
        label="Example service"
        summary="Rooftop solar, end to end."
        status="error"
        message="Could not reach the database"
      />,
    )
    expect(summarySlot()?.textContent).toBe('Could not reach the database')
  })
})

/* ------------------------------------------------------- the kind badge */

/**
 * Base UI's hover, as jsdom can deliver it.
 *
 * THREE events, and each is load-bearing. `useHoverReferenceInteraction` runs
 * `mouseOnly`, and it learns the pointer type from React's `onPointerEnter` —
 * which React synthesises from `pointerover`, not from `pointerenter`. So the
 * pointer event has to land FIRST, or the native `mouseenter` listener reads
 * an empty pointer type and returns without opening. The move is what the
 * `move` path arms a one-shot `mousemove` listener for.
 */
function hover(element: HTMLElement) {
  fireEvent.pointerOver(element, { pointerType: 'mouse' })
  fireEvent.mouseEnter(element)
  fireEvent.mouseMove(element)
}

/**
 * Room for the popover's own 200ms open delay.
 *
 * `waitFor` allows 1000ms by default, which is five times the delay and still
 * close enough to it to lose a race on a loaded machine — this suite runs
 * beside 124 other files. The delay is the thing being waited on, so the
 * budget is stated against it rather than left at a default that happens to
 * be larger.
 */
const OPEN_DELAY_BUDGET = { timeout: 3000 }

/** The definition card for one kind, wherever the portal put it. */
const definitionFor = (kind: 'phase' | 'scenario') =>
  screen.queryByText(ENTITY_KIND_DEFINITIONS[kind].definition)

/** The tooltip popup carrying exactly this text, wherever the portal put it. */
const tooltipSaying = (text: string) =>
  [...document.querySelectorAll('[data-slot="tooltip-content"]')].find(
    (node) => node.textContent?.trim() === text,
  ) ?? null

describe('the bar arrives with the shell around it', () => {
  /*
    The bug (#253): the service query is the fastest thing on the screen, so
    the bar painted its name, its kind and its whole summary over a sidebar
    still showing boot skeletons and a canvas still saying "Loading
    blueprints…". Three surfaces, three beats, and the one that finished first
    was the one nobody was waiting on.

    What is asserted is the beat, not the mechanism: given an answered query,
    whether a name is on screen depends on the shell's lane.
  */
  const ready = (
    <EntityHeader
      kind="service"
      id="svc-1"
      label="Home Retrofit"
      summary="We insulate homes."
      status="ready"
    />
  )

  it('holds an answered query behind the shell’s boot lane', () => {
    setShellBooting(true)
    renderWithEntityDetail(ready)
    expect(skeleton()).not.toBeNull()
    expect(screen.queryByText('Home Retrofit')).toBeNull()
  })

  it('and shows it the moment that lane lifts', () => {
    setShellBooting(true)
    renderWithEntityDetail(ready)
    act(() => setShellBooting(false))
    expect(skeleton()).toBeNull()
    expect(screen.getByText('Home Retrofit')).not.toBeNull()
  })

  it('keeps skeletoning when the lane lifts first and the query has not answered', () => {
    // The other order. Whichever wait is longer is the one the reader sees.
    setShellBooting(true)
    renderWithEntityDetail(<EntityHeader kind="service" status="loading" />)
    act(() => setShellBooting(false))
    expect(skeleton()).not.toBeNull()
  })

  it('waits on the query alone where no shell publishes a lane', () => {
    // The mobile shell, and this file's every other render. A bar with
    // nothing to wait for must not wait forever.
    renderWithEntityDetail(ready)
    expect(skeleton()).toBeNull()
    expect(screen.getByText('Home Retrofit')).not.toBeNull()
  })

  it('holds the phase bar on the same beat as the service bar', () => {
    setShellBooting(true)
    renderWithEntityDetail(
      <EntityHeader kind="phase" id="p-1" label="Warm-Up" status="ready" />,
    )
    expect(skeleton()).not.toBeNull()
  })
})

describe('the kind badge', () => {
  const navbarKinds = ['service', 'phase', 'scenario'] as const

  it('names the kind on each of the three navbar surfaces', () => {
    for (const kind of navbarKinds) {
      renderWithEntityDetail(
        <EntityHeader kind={kind} id={`${kind}-1`} label="Example service" />,
      )
      expect(kindBadge()?.textContent, kind).toBe(
        ENTITY_KIND_DEFINITIONS[kind].label,
      )
      cleanup()
    }
  })

  it('sits after the title, not before it', () => {
    renderWithEntityDetail(
      <EntityHeader kind="scenario" id="scn-1" label="Example service" />,
    )
    const position = titleSlot()!.compareDocumentPosition(kindBadge()!)
    // The badge FOLLOWS the title in document order, which is what "to the
    // right of it" means to a screen reader and to anyone reading the DOM.
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('has no name to hang off while the bar has no name', () => {
    renderWithEntityDetail(<EntityHeader kind="scenario" status="loading" />)
    expect(kindBadge()).toBeNull()
    cleanup()
    renderWithEntityDetail(
      <EntityHeader kind="scenario" status="error" message="No." />,
    )
    expect(kindBadge()).toBeNull()
  })

  it('discloses that kind’s definition on hover', async () => {
    renderWithEntityDetail(
      <EntityHeader kind="scenario" id="scn-1" label="Example service" />,
    )
    hover(kindBadge()!)
    // The scenario definition, verbatim from the one map that holds it —
    // a copy here would be a second place for it to drift.
    await waitFor(
      () => expect(definitionFor('scenario')).not.toBeNull(),
      OPEN_DELAY_BUDGET,
    )
  })

  it('discloses the phase definition on the phase bar, not the scenario one', async () => {
    renderWithEntityDetail(
      <EntityHeader kind="phase" id="ph-1" label="Onboarding" />,
    )
    hover(kindBadge()!)
    await waitFor(
      () => expect(definitionFor('phase')).not.toBeNull(),
      OPEN_DELAY_BUDGET,
    )
    expect(definitionFor('scenario')).toBeNull()
  })

  it('does not open the entity panel', () => {
    renderWithEntityDetail(
      <EntityHeader kind="scenario" id="scn-1" label="Example service" />,
    )
    fireEvent.click(kindBadge()!)
    // `aria-pressed` on the opener is the panel's own read-back. The badge is
    // the definition trigger and nothing else.
    expect(panelOpener()?.getAttribute('aria-pressed')).toBe('false')
    expect(titleSlot()?.hasAttribute('data-open')).toBe(false)
  })

  it('leaves the title block still opening the panel', () => {
    renderWithEntityDetail(
      <EntityHeader kind="scenario" id="scn-1" label="Example service" />,
    )
    // The control for the claim above: the panel does open, from the block —
    // otherwise "the badge does not open it" would pass on a dead bar.
    fireEvent.click(panelOpener()!)
    expect(panelOpener()?.getAttribute('aria-pressed')).toBe('true')
  })

  it('announces the kind together with the name', () => {
    renderWithEntityDetail(
      <EntityHeader kind="scenario" id="scn-1" label="Example service" />,
    )
    // Kind first, so the visible word starts the accessible name rather than
    // being buried inside a different one.
    expect(screen.getByLabelText('Scenario: Example service')).toBe(kindBadge())
  })

  it('is reachable, and openable, by keyboard alone', async () => {
    renderWithEntityDetail(
      <EntityHeader kind="scenario" id="scn-1" label="Example service" />,
    )
    const badge = kindBadge()!
    expect(badge.tabIndex).toBe(0)
    badge.focus()
    expect(document.activeElement).toBe(badge)
    fireEvent.keyDown(badge, { key: 'Enter' })
    fireEvent.keyUp(badge, { key: 'Enter' })
    await waitFor(
      () => expect(definitionFor('scenario')).not.toBeNull(),
      OPEN_DELAY_BUDGET,
    )
  })
})

/* ----------------------------------------------- the title is the opener */

/**
 * The z-order dead-click, from the reader's side (#301/#305).
 *
 * The name used to paint above its own invisible opener, so a click on the
 * word — the natural target — was swallowed and never reached the button.
 * The fix makes the title TEXT the opener, so the assertions here click the
 * visible word rather than a block hidden behind it.
 */
describe('the title text is the opener', () => {
  it('opens the entity panel when the title text itself is clicked', () => {
    renderWithEntityDetail(
      <EntityHeader kind="scenario" id="scn-1" label="Example service" />,
    )
    // The visible word, found by its text — not `panelOpener()`, which is the
    // control we are proving the word reaches.
    fireEvent.click(screen.getByText('Example service'))
    expect(panelOpener()?.getAttribute('aria-pressed')).toBe('true')
    expect(titleSlot()?.hasAttribute('data-open')).toBe(true)
  })

  it('toggles the panel shut on a second click of the text', () => {
    renderWithEntityDetail(
      <EntityHeader kind="scenario" id="scn-1" label="Example service" />,
    )
    fireEvent.click(screen.getByText('Example service'))
    fireEvent.click(screen.getByText('Example service'))
    expect(panelOpener()?.getAttribute('aria-pressed')).toBe('false')
    expect(titleSlot()?.hasAttribute('data-open')).toBe(false)
  })

  it('names the action on hover', async () => {
    renderWithEntityDetail(
      <TooltipProvider>
        <EntityHeader kind="scenario" id="scn-1" label="Example service" />
      </TooltipProvider>,
    )
    hover(panelOpener()!)
    await waitFor(
      () => expect(tooltipSaying('View details')).not.toBeNull(),
      OPEN_DELAY_BUDGET,
    )
  })

  it('is a focusable button, so the keyboard can operate it', () => {
    renderWithEntityDetail(
      <EntityHeader kind="scenario" id="scn-1" label="Example service" />,
    )
    const opener = panelOpener()!
    // A native button carries Enter/Space activation by contract; the claim a
    // test can make in jsdom is that the opener IS one and takes focus.
    expect(opener.tagName).toBe('BUTTON')
    opener.focus()
    expect(document.activeElement).toBe(opener)
  })
})

/* ------------------------------------------- the bar, over a warm cache */

type Result = { data: unknown; error: { message: string } | null }

/**
 * Just enough PostgREST for `useServiceSpec`: one `services` row ending in
 * `maybeSingle()`, and a `phases` select awaited on the builder itself.
 */
function fakeSupabase() {
  const rows: Record<string, unknown[]> = {
    services: [
      {
        id: 'svc-1',
        name: 'Example service',
        summary: 'Rooftop solar, end to end.',
        business_models: null,
      },
    ],
    phases: [{ id: 'phase-1', scenarios: [{ id: 'scenario-1' }] }],
  }

  return {
    from(table: string) {
      supabase.calls += 1
      const result: Result = { data: rows[table] ?? [], error: null }
      const api: Record<string, unknown> = {
        maybeSingle: () =>
          Promise.resolve({
            data: (result.data as unknown[])[0] ?? null,
            error: null,
          }),
        then: (resolve: (value: Result) => unknown) =>
          Promise.resolve(result).then(resolve),
      }
      for (const verb of ['select', 'order', 'limit', 'eq', 'abortSignal']) {
        api[verb] = () => api
      }
      return api
    },
  }
}

function mountBar(client: QueryClient) {
  return renderWithEntityDetail(
    <QueryClientProvider client={client}>
      <ServiceOverviewHeader />
    </QueryClientProvider>,
  )
}

describe('the service bar over a warm cache', () => {
  it('remounts straight into content, with no second skeleton', async () => {
    supabase.client = fakeSupabase()
    supabase.calls = 0
    // The app's own read policy, not a restatement of it: the claim IS that
    // policy, so a client with different defaults would prove nothing.
    const client = new QueryClient({
      defaultOptions: { queries: QUERY_DEFAULTS },
    })

    const first = mountBar(client)
    expect(await screen.findByText('Example service')).toBeDefined()
    const reads = supabase.calls
    first.unmount()

    mountBar(client)
    // Synchronous: this is the first painted frame of the second mount.
    expect(screen.getByText('Example service')).toBeDefined()
    expect(skeleton()).toBeNull()
    expect(supabase.calls).toBe(reads)
  })
})
