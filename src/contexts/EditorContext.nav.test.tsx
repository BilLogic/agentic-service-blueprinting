// @vitest-environment jsdom
/**
 * Whose navigation the editor shows.
 *
 * One rule, the same one `resolveBlueprint.test.ts` holds for the board: with
 * a database answering, its rows are the navigation. Nothing from the template's
 * bundled sample may reach the tabs — not a summary displacing the
 * deployment's own, not a layout, and not a scenario the deployment deleted
 * coming back as a tab with nothing behind it. With no database configured,
 * the sample IS the navigation, whole, because a fresh clone's nav is
 * load-bearing for onboarding exactly as its board is.
 *
 * A database that answers with NOTHING is a database that answers.
 * Zero rows reaches the nav two ways — a workspace with no phases in it, and
 * every page load in the window before the first fetch resolves — and both
 * used to draw the sample. The second is the common one: for a deployment
 * that never overlaid `sample.nav`, this template's phase and scenario names were
 * rendered as theirs, briefly, on every single load.
 *
 * The seam under test is the real one end to end: `useServicePhases` is NOT
 * mocked, only the Supabase provider is, so the no-database case runs the
 * hook's actual unconfigured path rather than a stand-in for it. The
 * `isSupabaseConfigured` mock below moves WITH the provider's `configured`
 * for the same reason — in the app they are one function, and a test where
 * they disagree is testing a state that cannot happen.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeploymentConfigProvider } from '@/contexts/DeploymentConfigContext'
import { EditorProvider, useEditor } from '@/contexts/EditorContext'
import { hasBlueprintFallback } from '@/data/blueprintFallbacks'
import { SAMPLE_NAV } from '@/data/sampleNav'
import type { NavItem } from '@/types/nav'

const supabase = vi.hoisted(() => ({
  configured: false,
  client: null as unknown,
}))

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: supabase.client,
    configured: supabase.configured,
    canWrite: false,
  }),
}))

// `isBundledSampleActive()` — the one question that decides whether the template's
// sample may be on screen — reads this, and the provider's `configured` is
// this same call. One flag drives both so they cannot drift here either.
vi.mock('@/lib/supabase', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase')>()),
  isSupabaseConfigured: () => supabase.configured,
}))

/**
 * A phase the sample gives at least two scenarios and its own prose.
 *
 * Read out of the sample rather than indexed into it: which entries these are
 * is a fact about whatever sample a deployment ships. Both summaries have to
 * be non-empty for the leak this file pins to be reachable at all — the old
 * merge tested the fallback's summary FIRST — so that is asserted rather than
 * assumed.
 */
const SAMPLE_PHASE = SAMPLE_NAV.find(
  (item) =>
    !item.parentId &&
    item.summary?.trim() &&
    SAMPLE_NAV.filter(
      (child) => child.parentId === item.id && child.summary?.trim(),
    ).length >= 2,
)!
const [SAMPLE_KEPT, SAMPLE_DELETED] = SAMPLE_NAV.filter(
  (item) => item.parentId === SAMPLE_PHASE.id && item.summary?.trim(),
)

/** The deployment's own words for the two rows it still has. */
const OWN_PHASE_SUMMARY = 'What this deployment calls its first phase.'
const OWN_SCENARIO_SUMMARY = 'What this deployment calls its first scenario.'
const OWN_LAYOUT = SAMPLE_KEPT!.layout === 'merged' ? 'stacked' : 'merged'

const SERVICE_ID = '00000000-0000-4000-8000-0000000000ff'

/**
 * The rows a deployment that adopted this template's ids, rewrote their prose and
 * DELETED one scenario has. Same phase id, same first-scenario id, different
 * sentences — the collision the merge needed to do damage.
 */
const PHASE_ROWS = [
  {
    service_id: SERVICE_ID,
    id: SAMPLE_PHASE.id,
    name: 'Our first phase',
    summary: OWN_PHASE_SUMMARY,
    position: 1,
    loops_to_phase_id: null,
    scenarios: [
      {
        id: SAMPLE_KEPT!.id,
        name: 'Our first scenario',
        summary: OWN_SCENARIO_SUMMARY,
        note: null,
        position: 1,
        phase_id: SAMPLE_PHASE.id,
        layout: OWN_LAYOUT,
      },
    ],
  },
]

/** Every sentence the sample would have had to offer. */
const SAMPLE_SUMMARIES = SAMPLE_NAV.map((item) => item.summary?.trim()).filter(
  (summary): summary is string => Boolean(summary),
)

/**
 * A Supabase stand-in that answers the two reads `useServicePhases` makes and
 * nothing else: every builder method returns the chain, and awaiting it
 * yields the rows.
 */
function table(data: unknown) {
  const settled = Promise.resolve({ data, error: null })
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    abortSignal: () => chain,
    then: (
      resolve?: (value: unknown) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => settled.then(resolve, reject),
  }
  return chain
}

const connectedClient = {
  from: (relation: string) =>
    relation === 'services' ? table([{ id: SERVICE_ID }]) : table(PHASE_ROWS),
}

/** A phases read that never settles: the first fetch, still in flight. */
function pendingTable() {
  const never = new Promise<never>(() => {})
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    abortSignal: () => chain,
    then: (
      resolve?: (value: unknown) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => never.then(resolve, reject),
  }
  return chain
}

/** Configured, and the structure query has not come back yet. */
const inFlightClient = {
  from: (relation: string) =>
    relation === 'services' ? table([{ id: SERVICE_ID }]) : pendingTable(),
}

/** Configured, answered, and holding no phases at all. */
const emptyClient = {
  from: (relation: string) =>
    relation === 'services' ? table([{ id: SERVICE_ID }]) : table([]),
}

let observed: NavItem[] | null = null
let observedLoading: boolean | null = null
let observedActiveSlideId: string | null = null
let observedActiveSlide: NavItem | null = null

function Probe() {
  const { slides, slidesLoading, activeSlideId, activeSlide } = useEditor()
  useEffect(() => {
    observed = slides
    observedLoading = slidesLoading
    observedActiveSlideId = activeSlideId
    observedActiveSlide = activeSlide
  })
  return null
}

async function mount() {
  observed = null
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <DeploymentConfigProvider>
          <EditorProvider>
            <Probe />
          </EditorProvider>
        </DeploymentConfigProvider>
      </QueryClientProvider>,
    )
  })
}

afterEach(() => {
  cleanup()
  supabase.configured = false
  supabase.client = null
  observed = null
  observedLoading = null
  observedActiveSlideId = null
  observedActiveSlide = null
})

/** Every sentence, label and note the sample could put on screen. */
function sampleProse(): string[] {
  return SAMPLE_NAV.flatMap((item) =>
    [item.label, item.summary, item.note]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  )
}

describe('the editor navigation', () => {
  it('is the sample, whole, when no database is configured', async () => {
    await mount()
    // Not "contains the sample" — IS it. A fresh clone's onboarding nav is
    // exactly what this repository ships, in the order it ships it.
    expect(observed).toEqual(SAMPLE_NAV)
  })

  it('is the rows, and only the rows, when a database answers', async () => {
    // The leak needs prose on both sides to be worth pinning.
    expect(SAMPLE_PHASE.summary?.trim()).toBeTruthy()
    expect(SAMPLE_KEPT!.summary?.trim()).toBeTruthy()
    expect(SAMPLE_DELETED!.summary?.trim()).toBeTruthy()
    // And the sample must actually register a blueprint for the kept
    // scenario, which is what the old merge keyed its `layout` steal on.
    expect(hasBlueprintFallback(SAMPLE_KEPT!.id)).toBe(true)

    supabase.configured = true
    supabase.client = connectedClient
    await mount()
    await waitFor(() => {
      expect(observed?.map((slide) => slide.id)).toEqual([
        SAMPLE_PHASE.id,
        SAMPLE_KEPT!.id,
      ])
    })

    const nav = observed!
    const phase = nav.find((slide) => slide.id === SAMPLE_PHASE.id)!
    const scenario = nav.find((slide) => slide.id === SAMPLE_KEPT!.id)!

    // The deployment's own prose stands where the sample's used to win.
    expect(phase.summary).toBe(OWN_PHASE_SUMMARY)
    expect(scenario.summary).toBe(OWN_SCENARIO_SUMMARY)
    expect(scenario.layout).toBe(OWN_LAYOUT)
    expect(phase.label).toBe('Our first phase')
    expect(scenario.label).toBe('Our first scenario')

    // The deleted scenario stays deleted. It used to be appended — its phase
    // survived and the sample registers it — and since the board stopped
    // filling holes from the sample it came back as a tab drawing nothing.
    expect(nav.some((slide) => slide.id === SAMPLE_DELETED!.id)).toBe(false)

    // Nothing the sample could have said reaches the nav, by any field.
    const prose = nav.flatMap((slide) =>
      [slide.summary, slide.label, slide.note].filter(Boolean),
    )
    for (const summary of SAMPLE_SUMMARIES) {
      expect(prose).not.toContain(summary)
    }
  })

  /*
    The two ways a configured database says nothing.

    Neither is the fresh clone the sample exists for, and the difference
    between them is the whole reason `slidesLoading` is asserted alongside the
    nav: the app has to be able to tell "still asking" from "asked, and there
    is nothing", because one is a spinner and the other is an empty state.
  */
  it('is empty, not the sample, while the first fetch is in flight', async () => {
    supabase.configured = true
    supabase.client = inFlightClient
    await mount()

    // The window this test exists for. The nav here used to be SAMPLE_NAV —
    // the template's phases and scenarios, wearing the deployment's name, on
    // every page load.
    expect(observed).toEqual([])
    expect(observedLoading).toBe(true)
    for (const phrase of sampleProse()) {
      expect(JSON.stringify(observed)).not.toContain(phrase)
    }
  })

  it('is empty, not the sample, when the database genuinely has no phases', async () => {
    supabase.configured = true
    supabase.client = emptyClient
    await mount()
    await waitFor(() => {
      expect(observedLoading).toBe(false)
    })

    // Answered, and the answer was none. That is the deployment's own board,
    // and an empty one is a fact about it — not an invitation to draw ours.
    expect(observed).toEqual([])
    for (const phrase of sampleProse()) {
      expect(JSON.stringify(observed)).not.toContain(phrase)
    }
  })

  it('still has no active slide to crash on when the nav is empty', async () => {
    supabase.configured = true
    supabase.client = emptyClient
    await mount()
    await waitFor(() => {
      expect(observedLoading).toBe(false)
    })

    // `activeSlideId`/`activeSlide` used to end in `slides[0]!`. Reading them
    // with an empty nav is the crash that assertion was hiding; they are
    // nullable now, and null is what an empty nav has.
    expect(observedActiveSlideId).toBeNull()
    expect(observedActiveSlide).toBeNull()
  })
})
