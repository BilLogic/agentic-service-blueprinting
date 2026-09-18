// @vitest-environment jsdom
/**
 * WHICH PATH THE PHONE OPENS ON, read as a reader reads it.
 *
 * The phone shows one path at a time and remembers, per scenario, which one
 * that was. Three answers matter and none of them had a test that could go
 * red: a scenario the reader has already read opens on the path they left it
 * on; a scenario they have never opened opens on its happy path; and a
 * remembered path that has since been deleted falls back to the happy path
 * rather than leaving the selector pointing at nothing.
 *
 * The phone's end-to-end slice does not reach any of this — it selects no
 * path, asserts no `Reading path:` line, and runs with empty storage, so only
 * the absent-memory branch ever executes and nothing about it is checked.
 * Which means the resolve-and-remember rule could have changed which path a
 * scenario opens on with every suite green. These cases are that rule's own
 * coverage, mounted on the real shell so they answer for the wiring and not
 * only for the arithmetic.
 *
 * WHY BOTH ASSERTIONS PER CASE. The selector alone cannot fail for the
 * fallback: it falls back to `paths[0]` when handed no active path, and on
 * these scenarios `paths[0]` IS the happy path — so a resolve that returned
 * `null` would render exactly the label a correct one renders. The
 * `Reading path:` line is the half that needs a resolved id to exist at all,
 * so the pair pins the rule and the surface together.
 */
import { QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** The screen this is read on — the phone the rest of the mobile suite uses. */
const PHONE = { width: 375, height: 812 }

// The one leaf read that is not this flow's: whether this session may talk to
// a database or an agent at all. Keyless, which is what makes the shell
// render the bundled sample board — the content these cases resolve paths in.
vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: null,
    configured: false,
    canWrite: false,
    canAgent: false,
    canAgentWrite: false,
    isSampleTrial: true,
  }),
}))

/**
 * The canvas, stood in for. jsdom measures nothing, so the real viewport
 * would fit to an empty rectangle and answer nothing useful; what these cases
 * read is the path the shell resolved, which is chrome and context, not
 * geometry. The stub still publishes which scenario it was handed, so a case
 * that never left the cover cannot pass by reading a stale label.
 */
vi.mock('@/components/editor/ServiceOverviewView', async () => {
  const { createElement } = await import('react')
  return {
    ServiceOverviewView: ({ soloScenarioId }: { soloScenarioId?: string }) =>
      createElement('div', {
        'data-testid': 'phone-canvas',
        'data-solo-scenario': soloScenarioId ?? '',
      }),
  }
})

import { MobileShell } from '@/components/mobile/MobileShell'
import { ActiveServiceProvider } from '@/contexts/ActiveServiceContext'
import { DeploymentConfigProvider } from '@/contexts/DeploymentConfigContext'
import { EditorProvider } from '@/contexts/EditorContext'
import { PathSelectionProvider } from '@/contexts/PathSelectionContext'
import { ViewStateProvider } from '@/contexts/ViewStateContext'
import { collectAgentUiContext } from '@/lib/agent/uiBridge'
import { MOTION_FADE_MS } from '@/lib/motion'
import { storageKey } from '@/lib/storageNamespace'
import { queryClient } from '@/lib/queryClient'
import { SAMPLE_PHASES, SAMPLE_SCENARIOS } from '@/data/sampleBlueprint'

/**
 * The scenario these cases read: the one sample scenario with a path fork, so
 * "the remembered one" and "the happy one" are different answers. A
 * single-path scenario could not tell a working memory from a broken one.
 */
const MAPPED = SAMPLE_SCENARIOS.find(
  (one) => one.name === 'Map your service',
)!
const MAPPED_PHASE = SAMPLE_PHASES.find((one) => one.id === MAPPED.phase_id)!
const HAPPY_PATH_NAME = 'From your documents'
const VARIANT_PATH_ID = MAPPED.path_ids[1]!
const VARIANT_PATH_NAME = 'From someone else’s diagram'

/** jsdom has no ResizeObserver, and the sheets observe themselves to re-report their height. */
class StillResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/**
 * The phone, in both the answers a module can ask for. `matchMedia` alone is
 * not a phone: `useIsMobile` reads `window.innerWidth`, which jsdom leaves at
 * its 1024 default, so a file that advertises 375 and stubs only the media
 * query puts a desktop inside its own phone frame and never knows.
 */
function phoneScreen() {
  for (const [name, value] of [
    ['innerWidth', PHONE.width],
    ['innerHeight', PHONE.height],
  ] as const)
    Object.defineProperty(window, name, {
      configurable: true,
      writable: true,
      value,
    })
  window.matchMedia = ((query: string) => ({
    matches: query.includes('max-width: 767px'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

/** What the phone last showed for a scenario, written the way the phone writes it. */
function theReaderLeftOffOn(scenarioId: string, pathId: string) {
  window.localStorage.setItem(
    storageKey('mobile-paths'),
    JSON.stringify({ [scenarioId]: pathId }),
  )
}

/** The phone shell, in the providers the app mounts it under. */
function renderPhone() {
  return render(
    <QueryClientProvider client={queryClient}>
      <DeploymentConfigProvider>
        <ActiveServiceProvider>
          <ViewStateProvider>
            <PathSelectionProvider>
              <EditorProvider>
                <div
                  data-phone-frame
                  style={{ width: PHONE.width, height: PHONE.height }}
                >
                  <MobileShell />
                </div>
              </EditorProvider>
            </PathSelectionProvider>
          </ViewStateProvider>
        </ActiveServiceProvider>
      </DeploymentConfigProvider>
    </QueryClientProvider>,
  )
}

/**
 * Turn the clock, inside `act`, in steps rather than one leap.
 *
 * React flushes a mounted tree's effects when `act` returns, so a single long
 * advance runs the timers that existed at the start of it and never the ones
 * the scenario swap's remount schedules inside it.
 */
async function letTheClockRun(ms: number) {
  const STEP_MS = 25
  for (let left = ms; left > 0; left -= STEP_MS) {
    const step = Math.min(STEP_MS, left)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(step)
    })
  }
}

/**
 * The reader's own route to the forked scenario: off the cover, into the
 * index, open the phase, tap the scenario. Every step is a tap, so the path
 * this lands on is resolved by the same code a real open resolves it with.
 */
async function readerOpensTheMappedScenario() {
  renderPhone()
  fireEvent.click(screen.getByRole('button', { name: 'Open the blueprint' }))
  await letTheClockRun(MOTION_FADE_MS * 4)
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
  await letTheClockRun(MOTION_FADE_MS)
  fireEvent.click(screen.getByText(MAPPED_PHASE.name))
  await letTheClockRun(MOTION_FADE_MS)
  fireEvent.click(screen.getByText(MAPPED.name))
  await letTheClockRun(MOTION_FADE_MS * 4)
  // The board really is the forked scenario's, so nothing below can pass by
  // reading the chrome of the scenario the cover landed on.
  expect(
    screen.getByTestId('phone-canvas').getAttribute('data-solo-scenario'),
  ).toBe(MAPPED.id)
}

/** The path the phone says it is reading, in the words the agent's UI context carries. */
function theReadingPathLine(): string | undefined {
  return collectAgentUiContext()
    .split('\n')
    .find((line) => line.startsWith('Reading path:'))
}

/** What the phone has remembered for a scenario, read the way the phone stores it. */
function whatThePhoneRemembers(scenarioId: string): string | null {
  const raw = window.localStorage.getItem(storageKey('mobile-paths'))
  if (raw === null) return null
  return (JSON.parse(raw) as Record<string, string>)[scenarioId] ?? null
}

/** The path the selector in the top bar names to the reader. */
function theSelectorNames(): string | null {
  const labelled = document.querySelector('[aria-label^="Path: "]')
  return labelled?.getAttribute('aria-label')?.replace('Path: ', '') ?? null
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'Date',
      'performance',
    ],
  })
  phoneScreen()
  globalThis.ResizeObserver =
    StillResizeObserver as unknown as typeof ResizeObserver
  // EVERY KEY THE LAST CASE WROTE, GONE. The phone's storage is namespaced
  // and read straight off `localStorage` every time, so a remembered path
  // left standing would open the next case on the previous case's path —
  // the cross-case inheritance that makes an ordered suite lie.
  window.localStorage.clear()
  queryClient.clear()
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.useRealTimers()
})

describe('the path a scenario opens on', () => {
  it('opens on the path the reader left it on', async () => {
    theReaderLeftOffOn(MAPPED.id, VARIANT_PATH_ID)

    await readerOpensTheMappedScenario()

    expect(theReadingPathLine()).toBe(`Reading path: ${VARIANT_PATH_NAME}`)
    expect(theSelectorNames()).toBe(VARIANT_PATH_NAME)
  })

  it('opens on the happy path when there is nothing remembered', async () => {
    await readerOpensTheMappedScenario()

    expect(theReadingPathLine()).toBe(`Reading path: ${HAPPY_PATH_NAME}`)
    expect(theSelectorNames()).toBe(HAPPY_PATH_NAME)
  })

  it('falls back to the happy path when the remembered one is gone, rather than reading nothing', async () => {
    // A path id that resolves to no path in this scenario — what a reader has
    // in storage after the path they were reading is deleted from the
    // blueprint. The board must still be a board.
    theReaderLeftOffOn(MAPPED.id, 'f0000000-0000-4000-8000-deadbeef0000')

    await readerOpensTheMappedScenario()

    expect(theReadingPathLine()).toBe(`Reading path: ${HAPPY_PATH_NAME}`)
    expect(theSelectorNames()).toBe(HAPPY_PATH_NAME)
  })

  it('remembers the path the reader picks, so the next open lands on it', async () => {
    await readerOpensTheMappedScenario()
    expect(whatThePhoneRemembers(MAPPED.id)).toBeNull()

    fireEvent.click(screen.getByLabelText(`Path: ${HAPPY_PATH_NAME}`))
    await letTheClockRun(MOTION_FADE_MS)
    fireEvent.click(screen.getByRole('menuitem', { name: VARIANT_PATH_NAME }))
    await letTheClockRun(MOTION_FADE_MS * 2)

    // The surface moved AND the memory did. Only the second half survives the
    // reader closing the phone, and it is the half nothing was checking: a
    // shell that stopped writing would show the new path for this visit and
    // open on the happy path forever after.
    expect(theSelectorNames()).toBe(VARIANT_PATH_NAME)
    expect(whatThePhoneRemembers(MAPPED.id)).toBe(VARIANT_PATH_ID)
  })
})
