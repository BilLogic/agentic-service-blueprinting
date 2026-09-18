// @vitest-environment jsdom
/**
 * THE PHONE AGENT-JUMP SLICE.
 *
 * One flow, end to end, through the real phone shell at phone width: a
 * reader lands on the cover, taps through to the first scenario, opens the
 * ✦ sheet, and then the agent moves the camera for them — first to another
 * scenario, then to another phase. What is asserted is what a reader would
 * see and what the tool would answer: the sheet STAYS, the destination is
 * aimed above it, the selection comes back in the words the navigation tool
 * verifies against, and the caret returns to the composer once the camera
 * settles.
 *
 * The shell is the real `MobileShell` under the real `EditorProvider`, the
 * sheet is the real `MobileAgentSheet` over the real `AgentPanel`, the
 * agent's hands are the real `makeMobileAgentBridge` registered on the real
 * `uiBridge`, the caret hand-back is the real
 * `makeAgentCameraFlightWatcher` over the real `focusAgentComposer`, and the
 * jump is dispatched through the real `open_scenario` / `open_phase`
 * definitions — the same `dispatchTool` call the loop makes, so the string
 * this file compares is the string a model would read. The verdict the
 * watcher and the tool both wait on travels through the real `canvasJump`
 * module, which is where the arming, the deadline and the four verdict words
 * live.
 *
 * WHY THIS FLOW HAS A SLICE AT ALL. Two defects shipped on this surface in
 * one batch and nothing could have caught either. The sheet used to close on
 * an agent-driven jump, which took the conversation away mid-run — the
 * session keeps going in its module whether or not a surface is showing it,
 * so a turn that failed after the jump had nowhere to say so. And the
 * shell's context array had no phase line, so every phone phase jump
 * answered "the selected phase was not verified" while the canvas sat on
 * exactly the phase asked for. The phone's other coverage could see neither:
 * the bridge's unit test drives the hands with no shell around them, and the
 * source guards read the shell's own text rather than running it. Both
 * defects are encoded as red cases below, each injected for that case only at
 * a seam this flow really routes through, and each has been watched fail the
 * assertions the green case makes.
 *
 * THE CLOCK IS TURNED BY HAND. Every timer in this flow is faked and advanced
 * explicitly (`letTheClockRun`), for the reason the annotation-drag slice
 * fakes its frames: the shipped choreography is a race between the shell's
 * 200 ms fade, the camera's fit, `canvasJump`'s 2000 ms camera deadline and
 * the tool's own 1800 ms selection poll, and a test that leaned on the wall clock
 * to order them would be green on a quiet machine and red on a loaded runner
 * — a failure that says nothing about the code. Faked, the ORDER is what is
 * asserted and the machine's load cannot reach it.
 *
 * WHAT STANDS IN FOR THE CANVAS, AND WHY. `ServiceOverviewView` is replaced
 * by a camera stand-in of a dozen lines, for the reason the annotation-drag
 * slice stubs its board: jsdom lays nothing out, so the real viewport has no
 * rectangle to fit to, no frames to fly over, and no verdict to publish —
 * every assertion below would be about a camera that never moved. The
 * stand-in does what the real viewport does at the three points this flow
 * reads it: it takes `occludedBottomPx` as the fit inset, it ARMS on
 * `cameraOutcomeKey` changing (the key `useZoomPanViewport` arms on, handed
 * down from `cameraTargetId`) rather than once per mount, and it publishes
 * that key's verdict through the shipped `settleJump`, in the word the
 * shipped `verdictOfFlight` reads a completed flight into.
 * Arming on the key rather than the mount is what lets this file see a jump
 * whose destination does NOT remount the board — a phase whose first scenario
 * is already on screen, which the shell keys the board by and therefore keeps
 * — where the real code publishes and a mount-shaped stand-in would be
 * silent. That case is asserted below. Everything between the tool call and
 * the verdict is the shipped code.
 *
 * WHY THE STAND-IN'S FIT WAITS OUT THE FADE. The real viewport will not fit
 * until the NAMED destination is measurable on the board in front of it (two
 * frames of the same named element — see `useZoomPanViewport`), and during
 * the shell's fade the board in front of it is still the PREVIOUS one: the
 * key changes at selection, the swap happens `MOTION_FADE_MS` later. So the
 * stand-in schedules its fit a tick behind that fade, which is the one number
 * that makes it answer from the board the destination is actually drawn on.
 * The outgoing instance is unmounted before its own fit comes due and its
 * cleanup cancels it, exactly as an unmount is not a verdict for the real
 * one.
 *
 * THE SHEET'S HEIGHT IS STAMPED, for the same reason. The sheet measures
 * itself with `getBoundingClientRect`, which jsdom answers 0 for; a zero
 * inset would let the "destination lands above the sheet" assertion pass on a
 * shell that had thrown the inset away. So the sheet's own node reports the
 * height its `60svh` comes to on this screen, and the assertion is that THAT
 * number is what reached the camera.
 *
 * THE GATES ARE SOMEONE ELSE'S. The Supabase provider stub hand-asserts
 * `canAgent` — the phone's ✦ affordances and the sheet itself hang off it —
 * and the viewport probe answers phone. That those answers are themselves
 * right is held where they are derived: the provider's own published surface
 * test, and the trial roster's. What this slice proves is the FLOW, given a
 * phone the provider admits an agent to.
 *
 * WHAT THIS FILE CANNOT SEE. It runs no frames and no wall clock. The fit is
 * one faked timer standing in for a chain of `requestAnimationFrame` steps
 * jsdom never schedules, and the deadlines the tool and the watcher race are
 * never actually raced — the clock only moves when this file moves it. So the
 * ORDER and the choreography are covered and the DURATION is not: that a fit
 * lands inside the tool's 1800 ms selection poll or `canvasJump`'s 2000 ms
 * camera deadline on a real device, that the strip above the sheet is legible
 * through the scrim, and that the destination renders above the sheet at all
 * are answered in a browser by `render-walk/mobile-agent-jump.spec.ts`, at
 * this same 375×812. THE FIT INSET is this file's claim and stays here: the
 * phone floors its fit zoom, so a board wider than the screen is framed from
 * its top-left and the inset moves nothing a browser can measure — see the
 * note over that block in the spec.
 */
import { QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** The screen this flow is read on — the phone the render walk uses too. */
const PHONE = { width: 375, height: 812 }

/**
 * What the sheet covers: its own `60svh`, in pixels on this screen.
 *
 * Stamped rather than measured because jsdom measures nothing, and the number
 * matters: this is the value that has to reach the camera as a fit inset, so
 * a shell that dropped the inset would otherwise pass against a 0 the sheet
 * and the camera happened to agree on.
 */
const SHEET_OCCLUDED_PX = Math.round(PHONE.height * 0.6)

/**
 * What the camera stand-in saw, in the order it saw it.
 *
 * `fits` is one entry per fit — the moment the real viewport publishes its
 * verdict — carrying the board it answered from, the semantic target it
 * answered for, and the inset in force when it ran. `inset` is the latest
 * value the shell handed down, which is how the sheet's arrival is read
 * before any jump.
 */
const camera = vi.hoisted(() => ({
  fits: [] as Array<{
    scenarioId: string | null
    targetId: string | null
    occludedBottomPx: number
  }>,
  inset: 0,
}))

// The one leaf read that is not this flow's: whether this session may talk to
// an agent at all. On a template with no database that means a provider key,
// and it gates the ✦ affordance and the sheet — so it is asserted here and
// derived where it belongs.
vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: null,
    configured: false,
    canWrite: false,
    canAgent: true,
    canAgentWrite: false,
    isSampleTrial: true,
  }),
}))

/**
 * THE TWO SHIPPED DEFECTS, AS SWITCHES ARMED PER CASE.
 *
 * Both reds below restore a behaviour that really shipped, and both are
 * injected at a seam this flow really routes through rather than by editing
 * the shell: the module that is the agent's hands, and the read side of the
 * bridge the shell reports itself through. They are read at the moment the
 * shell wires itself up — inside the case that armed them — so an unarmed
 * run hands the shipped function and the shipped contributor straight
 * through untouched, and the green cases below are not running through a
 * wrapper of this file's.
 *
 * Switches rather than a module-graph reset per red: a reset would have to
 * re-import every provider the shell mounts under, and the whole point of an
 * injection is that the code under it is the shipped code.
 */
const defect = vi.hoisted(() => ({
  /** The sheet gets out of the way by closing, which is what it used to do. */
  closesTheSheetOnAJump: false,
  /** The shell reports everything about itself except its selected phase. */
  dropsThePhaseLine: false,
}))

/** Arm one shipped defect for THIS case. Disarmed again by the global `afterEach`. */
function inject(which: keyof typeof defect) {
  defect[which] = true
}

vi.mock('@/components/mobile/mobileAgentBridge', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/components/mobile/mobileAgentBridge')>()
  return {
    ...actual,
    makeMobileAgentBridge: (
      hands: Parameters<typeof actual.makeMobileAgentBridge>[0],
    ) => {
      const bridge = actual.makeMobileAgentBridge(hands)
      if (!defect.closesTheSheetOnAJump) return bridge
      const dismiss = () =>
        document
          .querySelector<HTMLElement>(
            '[data-slot="sheet-content"] [aria-label="Close"]',
          )
          ?.click()
      return {
        ...bridge,
        selectPhase: (id: string) => {
          dismiss()
          bridge.selectPhase(id)
        },
        selectScenario: (id: string) => {
          dismiss()
          bridge.selectScenario(id)
        },
      }
    },
  }
})

/**
 * The read side of the agent's view of the UI.
 *
 * Narrowed to the `shell` key on purpose: that is the contributor the phone
 * shell registers its selection lines under, and it is the seam the second
 * red is about. Filtering every contributor would take the line out of
 * anything else that ever reported one, which is a defect nobody shipped and
 * would make the red prove less than it claims.
 */
vi.mock('@/lib/agent/uiBridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/agent/uiBridge')>()
  return {
    ...actual,
    registerAgentUiContext: (key: string, contributor: () => string | null) =>
      actual.registerAgentUiContext(
        key,
        defect.dropsThePhaseLine && key === 'shell'
          ? () =>
              (contributor() ?? '')
                .split('\n')
                .filter((line) => !line.startsWith('Selected phase:'))
                .join('\n')
          : contributor,
      ),
  }
})

/**
 * The camera, stood in for. It reads the same two props the shell hands the
 * real board — the fit inset and the fit-ready callback — arms on the same
 * key the real viewport arms on, and publishes the same verdict under it.
 */
vi.mock('@/components/editor/ServiceOverviewView', async () => {
  const { createElement, useEffect, useRef } = await import('react')
  const { useEditor } = await import('@/contexts/EditorContext')
  const { MOTION_FADE_MS } = await import('@/lib/motion')
  const { settleJump, verdictOfFlight } = await import('@/lib/canvasJump')
  return {
    ServiceOverviewView: ({
      soloScenarioId,
      occludedBottomPx = 0,
      onInitialFitReady,
    }: {
      soloScenarioId?: string
      occludedBottomPx?: number
      onInitialFitReady?: () => void
    }) => {
      const { cameraTargetId } = useEditor()
      // The inset in force NOW, so the fit below reports what it was aimed
      // with rather than what it was mounted with: the sheet's height arrives
      // in a render of its own, after the mount that a jump remounts.
      const inset = useRef(occludedBottomPx)
      inset.current = occludedBottomPx
      camera.inset = occludedBottomPx
      useEffect(() => {
        // A tick behind the shell's fade — see the file header: until the
        // fade ends the board on screen is still the previous one, and the
        // real viewport will not fit to a destination it cannot measure. The
        // outgoing instance is unmounted first and this cleanup cancels its
        // fit, which is the real one's rule that an unmount is not a verdict.
        const settle = setTimeout(() => {
          camera.fits.push({
            scenarioId: soloScenarioId ?? null,
            targetId: cameraTargetId,
            occludedBottomPx: inset.current,
          })
          onInitialFitReady?.()
          if (cameraTargetId)
            settleJump(cameraTargetId, verdictOfFlight('completed'))
        }, MOTION_FADE_MS + 16)
        return () => clearTimeout(settle)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- armed on the destination key and on the board drawn, which is what the real viewport's reset key carries; the callback is stable
      }, [cameraTargetId, soloScenarioId])
      return createElement('div', {
        'data-testid': 'phone-canvas',
        'data-solo-scenario': soloScenarioId ?? '',
      })
    },
  }
})

import { MobileShell } from '@/components/mobile/MobileShell'
import { ActiveServiceProvider } from '@/contexts/ActiveServiceContext'
import { DeploymentConfigProvider } from '@/contexts/DeploymentConfigContext'
import { EditorProvider } from '@/contexts/EditorContext'
import { PathSelectionProvider } from '@/contexts/PathSelectionContext'
import { ViewStateProvider } from '@/contexts/ViewStateContext'
import {
  agentSessionsSnapshot,
  deleteAgentSession,
} from '@/lib/agent/sessions'
import { saveAgentSettings } from '@/lib/agent/settings'
import { cameraSettled } from '@/lib/agent/uiBridge'
import { MOTION_FADE_MS } from '@/lib/motion'
import { dispatchTool } from '@/lib/agent/tools/registry'
import { queryClient } from '@/lib/queryClient'
import { SAMPLE_PHASES, SAMPLE_SCENARIOS } from '@/data/sampleBlueprint'

/** The board this flow reads: the bundled sample, which is what a keyless phone shows. */
const DISCOVER = SAMPLE_PHASES[0]!
const OPERATE = SAMPLE_PHASES[2]!
const MAINTAIN = SAMPLE_PHASES[3]!
/** Where the cover's CTA lands: the first scenario of the first phase. */
const LANDED = SAMPLE_SCENARIOS.find((one) => one.phase_id === DISCOVER.id)!
/** Where the agent takes the reader first — another phase's scenario, so the jump is a real move. */
const JUMPED = SAMPLE_SCENARIOS.find((one) => one.phase_id === OPERATE.id)!
/**
 * The phase the agent takes them to next, and the scenario the phone resolves
 * it to. A phase is not a destination on a phone — there is no phase row to
 * draw — so the shell shows that phase's first scenario while REPORTING the
 * phase, and both halves of that are asserted.
 */
const MAINTAIN_FIRST = SAMPLE_SCENARIOS.find(
  (one) => one.phase_id === MAINTAIN.id,
)!

/** The session id the tool calls are attributed to. Nothing here writes, so it only has to be stable. */
const SESSION = 'phone-slice-session'

/** jsdom has no ResizeObserver, and the sheet observes itself to re-report its height. */
class StillResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** jsdom answers 0 for every rectangle. The sheet's own node is the one this flow measures. */
function stampTheSheetsHeight() {
  const own = HTMLElement.prototype.getBoundingClientRect
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    if (this.dataset?.slot !== 'sheet-content') return own.call(this)
    const box = {
      x: 0,
      y: PHONE.height - SHEET_OCCLUDED_PX,
      left: 0,
      top: PHONE.height - SHEET_OCCLUDED_PX,
      right: PHONE.width,
      bottom: PHONE.height,
      width: PHONE.width,
      height: SHEET_OCCLUDED_PX,
    }
    return { ...box, toJSON: () => box } as DOMRect
  }
  return () => {
    HTMLElement.prototype.getBoundingClientRect = own
  }
}

/**
 * The phone this flow is read on, in both the answers a component can ask
 * for. `matchMedia` alone is not a phone: `useIsMobile` reads
 * `window.innerWidth`, which jsdom leaves at its 1024 default, so a file that
 * advertises 375×812 and stubs only the media query puts a DESKTOP inside its
 * own phone and never knows.
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
  // Below the shell's breakpoint, and no reduced motion — the scenario swap's
  // fade is part of the choreography this flow is about, and a reader who
  // asked for less motion skips it.
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
 * Turn the clock, inside `act`.
 *
 * Every timer this flow rides is faked — the shell's fade, the camera's fit,
 * the tool's poll and its deadline, the caret watcher's — so nothing moves
 * until this is called. Inside `act` because each of those lands as a state
 * update, and outside it React would warn and the assertion after could read
 * the DOM a render early.
 */
async function letTheClockRun(ms: number) {
  // In steps, not one leap. React flushes a mounted component's effects when
  // `act` RETURNS, so a single long advance runs the timers that exist at the
  // start of it and never the ones the remount schedules inside it — the
  // incoming board's fit would be queued and then left standing still. The
  // step is the 25 ms `waitForNavigation` polls on, which is the finest
  // grain anything in this flow reads.
  const STEP_MS = 25
  for (let left = ms; left > 0; left -= STEP_MS) {
    const step = Math.min(STEP_MS, left)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(step)
    })
  }
}

/**
 * How far to turn the clock over one agent-driven jump: the fade, the
 * remount, the fit a tick behind it, and the 25 ms polls `waitForNavigation`
 * runs in between. Comfortably short of the tool's own 1800 ms deadline,
 * which is the point — the flight has to land with the deadline unreached.
 */
const ONE_FLIGHT_MS = MOTION_FADE_MS * 4

/** The composer the caret is handed back to — found the way `focusAgentComposer` finds it. */
const composer = () =>
  document.querySelector<HTMLTextAreaElement>('textarea[data-agent-composer]')

/** Whatever bottom sheet is up — the ✦ sheet, or the index drawer. */
const sheetContent = () =>
  document.querySelector<HTMLElement>('[data-slot="sheet-content"]')

/**
 * The ✦ sheet, if it is on screen AND showing.
 *
 * By its ROLE and by its OWN title, not by "a composer exists somewhere": a
 * composer outliving the sheet and the sheet outliving the composer are
 * different defects, and a check that only asks whether some textarea is in
 * the document would pass on the first. `queryAllByRole` is the visibility
 * half — it resolves the accessibility tree, so a dialog under an
 * `aria-hidden` ancestor or a `display: none` subtree is not on screen for it,
 * where a bare `querySelector` would find a node a reader cannot see. The
 * title is the identity half: the index drawer is a bottom sheet too, and
 * this flow is about the one headed Agent.
 */
function agentSheetOnScreen(): HTMLElement | null {
  return (
    screen
      .queryAllByRole('dialog')
      .find(
        (dialog) =>
          dialog
            .querySelector('[data-slot="sheet-title"]')
            ?.textContent?.trim() === 'Agent',
      ) ?? null
  )
}

/** Is the ✦ sheet up, with the conversation inside it? */
function theSheetIsUpWithTheConversation(): boolean {
  const sheet = agentSheetOnScreen()
  const box = composer()
  return sheet !== null && box !== null && sheet.contains(box)
}

/** What the phone reports about itself, read the way `get_ui_state` reads it. */
async function uiState(): Promise<string> {
  return dispatchTool(null, SESSION, 'get_ui_state', {})
}

/**
 * The agent's jump, with the clock turned over the flight by hand.
 *
 * Dispatched first and awaited after, because the tool's own answer is the
 * thing the flight produces: it waits on the selection and on the camera's
 * verdict, and neither arrives until the timers below are run.
 */
async function theAgentJumps(
  tool: 'open_scenario' | 'open_phase',
  args: Record<string, string>,
): Promise<string> {
  let landed = false
  const answered = dispatchTool(null, SESSION, tool, args).then((text) => {
    landed = true
    return text
  })
  await letTheClockRun(ONE_FLIGHT_MS)
  // A jump that has not answered by now has missed something the flow owed
  // it. Run the clock past the tool's own 1800 ms deadline so it SAYS so:
  // with a hand-turned clock, a promise nobody advances any further never
  // settles, and the case would report a five-second test timeout instead of
  // the assertion that would name the defect.
  if (!landed) await letTheClockRun(2_000)
  return answered
}

/**
 * The reader's own half of the flow: off the cover, into the first scenario,
 * and the ✦ sheet open with a session in it. Everything here is a tap.
 */
async function readerOpensTheSheet() {
  renderPhone()
  // THE COVER IS THE FIRST SCREEN, with nothing over it: the index drawer
  // stays shut until the reader opens it, so a deep link is never racing it
  // for the first thing on screen.
  expect(screen.getByRole('button', { name: 'Open the blueprint' })).toBeTruthy()
  expect(sheetContent()).toBeNull()
  // The cover's CTA is the one way off it, and on a phone it opens the first
  // scenario rather than an overview — a phone has no phase row to draw.
  fireEvent.click(screen.getByRole('button', { name: 'Open the blueprint' }))
  await letTheClockRun(ONE_FLIGHT_MS)
  expect(screen.getByTestId('phone-canvas')).toBeTruthy()
  // …and it arrives with the drawer still shut, on the canvas.
  expect(sheetContent()).toBeNull()
  // The landing fit was aimed at the whole screen: no sheet, nothing occluded.
  expect(camera.fits).toHaveLength(1)
  expect(camera.fits[0]).toMatchObject({
    scenarioId: LANDED.id,
    occludedBottomPx: 0,
  })

  fireEvent.click(screen.getByRole('button', { name: 'Ask the agent' }))
  await letTheClockRun(MOTION_FADE_MS)
  // Synchronous queries throughout, and the clock turned between them:
  // Testing Library's own async helpers (`findBy*`, its `waitFor`) schedule
  // on a real `setTimeout` they cannot see has been faked, so they would wait
  // for a tick this file never gives them.
  fireEvent.click(screen.getByRole('button', { name: 'New session' }))
  await letTheClockRun(MOTION_FADE_MS)
  // The composer is the caret's destination, and it has to be typeable: a
  // panel with no provider key disables the field, and handing the caret to a
  // disabled field is worse than not handing it back at all.
  expect(composer()).toBeTruthy()
  expect(composer()!.disabled).toBe(false)
  // THE SHEET'S HEIGHT REACHED THE CAMERA, before any jump: the shell measured
  // it and handed it down as the fit inset.
  expect(camera.inset).toBe(SHEET_OCCLUDED_PX)
  expect(await uiState()).toContain('Agent sheet: open')
}

let unstamp: (() => void) | null = null
beforeEach(() => {
  // Every timer, by hand: see `letTheClockRun`. `Date` goes with them so the
  // session module's own stamps move with the clock rather than against it.
  // `performance` is faked with the timers on purpose: `waitForNavigation`
  // measures its 1800 ms deadline with `performance.now()`, so a real one
  // beside a fake clock is a deadline that can never be reached — the red
  // below would wait for a timeout that never came, and the greens would be
  // holding a race nobody ran.
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
  camera.fits = []
  camera.inset = 0
  phoneScreen()
  globalThis.ResizeObserver =
    StillResizeObserver as unknown as typeof ResizeObserver
  // EVERYTHING THIS FLOW WROTE TO STORAGE LAST CASE, GONE — before the
  // settings below are written, so this clear cannot take them with it. The
  // sessions are dealt with by name further down because their module keeps
  // an in-memory snapshot beside its key; `mobile-paths` (which path the
  // phone last showed for each scenario) and `slide-sheet-height` (how tall
  // the reader dragged the sheet) are read straight off storage every time,
  // so left standing they would open case two on case one's path at case
  // one's height — the same cross-case inheritance as the session note below.
  window.localStorage.clear()
  // The one key that makes the composer typeable. It never leaves this
  // process — nothing in this flow sends a message to a provider.
  saveAgentSettings({ provider: 'anthropic', keys: { anthropic: 'test-key' } })
  // Sessions outlive a test: the store is a localStorage-backed module, not
  // component state. Left standing, the previous case's session is listed
  // under its auto-name — "New session", the same words as the action that
  // makes one — so the tap below lands on a session TITLE, which opens the
  // rename dialogue, and the sheet under it goes out of the accessibility
  // tree while the flow carries on looking fine.
  clearTheSessionStore()
  unstamp = stampTheSheetsHeight()
})

/** Every session this process has made, gone. */
function clearTheSessionStore() {
  for (const session of agentSessionsSnapshot()) deleteAgentSession(session.id)
}

afterEach(() => {
  cleanup()
  clearTheSessionStore()
  unstamp?.()
  unstamp = null
  defect.closesTheSheetOnAJump = false
  defect.dropsThePhaseLine = false
  vi.useRealTimers()
})

describe('the agent moves the phone camera while the sheet stays up', () => {
  it('jumps to a scenario and to a phase: the sheet stays, the destination is aimed above it, the selection is reported, and the caret comes back', async () => {
    await readerOpensTheSheet()

    // THE AGENT JUMPS TO ANOTHER SCENARIO — through the tool the model calls,
    // so the answer below is the sentence a model would read.
    const said = await theAgentJumps('open_scenario', {
      scenario_id: JUMPED.id,
    })
    expect(said).toBe(cameraSettled('scenario'))

    // 1. THE SHEET STAYED. This is the regression that shipped: the sheet used
    // to close to make the move visible, which threw the conversation away in
    // the one moment a reader most needs it.
    expect(theSheetIsUpWithTheConversation()).toBe(true)
    expect(await uiState()).toContain('Agent sheet: open')

    // 2. THE DESTINATION WAS AIMED ABOVE THE SHEET. The fit that answered for
    // this jump was given the sheet's occluded height as its inset, so the
    // board lands in the strip the reader can still see.
    expect(camera.fits.at(-1)).toEqual({
      scenarioId: JUMPED.id,
      targetId: JUMPED.id,
      occludedBottomPx: SHEET_OCCLUDED_PX,
    })

    // 3. THE SELECTION IS REPORTED IN THE WORDS THE TOOL VERIFIES AGAINST —
    // the label and the id on one line, which is the shape `waitForNavigation`
    // matches. The tool answering `cameraSettled` above already proves the
    // match held; this says what the reader's shell actually reported.
    const afterScenario = await uiState()
    expect(afterScenario).toContain(
      `Selected scenario: "${JUMPED.name}" (${JUMPED.id})`,
    )
    expect(afterScenario).toContain(
      `Selected phase: "${OPERATE.name}" (${OPERATE.id})`,
    )

    // 4. THE CARET CAME BACK, once the camera settled — the reader carries on
    // in words without hunting for the box.
    expect(document.activeElement).toBe(composer())

    // THE AGENT JUMPS TO A PHASE. This is the other shipped defect's flow: a
    // shell with no phase line answered "not verified" for a jump that landed.
    // The caret is put down first, so its return is this jump's doing.
    composer()!.blur()
    const saidPhase = await theAgentJumps('open_phase', {
      phase_id: MAINTAIN.id,
    })
    expect(saidPhase).toBe(cameraSettled('phase'))

    expect(theSheetIsUpWithTheConversation()).toBe(true)
    expect(camera.fits.at(-1)).toEqual({
      // A phase is not a destination on a phone: the shell draws that phase's
      // FIRST scenario, and the camera answers for the phase it was asked for.
      scenarioId: MAINTAIN_FIRST.id,
      targetId: MAINTAIN.id,
      occludedBottomPx: SHEET_OCCLUDED_PX,
    })
    expect(
      screen.getByTestId('phone-canvas').getAttribute('data-solo-scenario'),
    ).toBe(MAINTAIN_FIRST.id)

    const afterPhase = await uiState()
    expect(afterPhase).toContain(
      `Selected phase: "${MAINTAIN.name}" (${MAINTAIN.id})`,
    )
    // …and the phase selection cleared the scenario, which the shell says in
    // as many words rather than leaving the old one standing.
    expect(afterPhase).toContain('Selected scenario: none')
    expect(document.activeElement).toBe(composer())
  })

  /**
   * THE JUMP THAT DOES NOT REMOUNT THE BOARD.
   *
   * The shell keys its canvas by the scenario it draws, so jumping to a PHASE
   * whose first scenario is already on screen leaves that board exactly where
   * it is: nothing unmounts, nothing fades, and a camera that only answered
   * once per mount would never answer at all — the tool would wait out its
   * deadline and tell the model an arrival it can see had failed. The real
   * viewport arms on the destination key, not on its own mount, so it
   * publishes here; this case is what holds the stand-in to that.
   */
  it('answers for a phase whose scenario is already on screen, without the board remounting', async () => {
    await readerOpensTheSheet()
    await theAgentJumps('open_scenario', { scenario_id: JUMPED.id })
    const board = screen.getByTestId('phone-canvas')
    const fitsBefore = camera.fits.length

    // The phase this scenario already belongs to. The shell resolves it to
    // the same scenario, so the destination is the board in front of us.
    const said = await theAgentJumps('open_phase', { phase_id: OPERATE.id })

    expect(said).toBe(cameraSettled('phase'))
    // The same node, not an equal one: nothing remounted and nothing faded.
    expect(screen.getByTestId('phone-canvas')).toBe(board)
    expect(
      document
        .querySelector('[data-mobile-scenario-swap]')
        ?.getAttribute('data-mobile-scenario-swap'),
    ).toBe('idle')
    // …and the camera answered anyway, for the phase, aimed above the sheet.
    expect(camera.fits.length).toBe(fitsBefore + 1)
    expect(camera.fits.at(-1)).toEqual({
      scenarioId: JUMPED.id,
      targetId: OPERATE.id,
      occludedBottomPx: SHEET_OCCLUDED_PX,
    })
    expect(theSheetIsUpWithTheConversation()).toBe(true)
  })
})

/**
 * THE FIRST RED: the sheet closes on the jump, the way it used to.
 *
 * The camera still moves and the tool still answers that it landed — which is
 * why this defect shipped — and what goes is the conversation and, with it,
 * the inset that aimed the board above the panel and the composer the caret
 * was owed.
 */
describe('goes red when the sheet closes on navigation again', () => {
  it('lands the camera and reports success, with the conversation gone and the caret nowhere', async () => {
    inject('closesTheSheetOnAJump')
    await readerOpensTheSheet()

    const said = await theAgentJumps('open_scenario', {
      scenario_id: JUMPED.id,
    })
    // The camera landed and the tool says so — the defect is invisible here.
    expect(said).toBe(cameraSettled('scenario'))
    expect(camera.fits.at(-1)).toMatchObject({ targetId: JUMPED.id })

    // And the assertions the green case makes about the sheet all fail: the
    // conversation is off screen, the fit was aimed at a screen with nothing
    // over it, and there is no composer left to hand the caret back to.
    expect(theSheetIsUpWithTheConversation()).toBe(false)
    expect(await uiState()).toContain('Agent sheet: closed')
    expect(camera.fits.at(-1)!.occludedBottomPx).toBe(0)
    expect(document.activeElement).toBe(document.body)
  })
})

/**
 * THE SECOND RED: the shell stops reporting its selected phase.
 *
 * The other defect from the same batch. The canvas still goes where it was
 * asked, with the sheet still up, and the tool tells the model the jump was
 * not verified — so a model apologises for a move that landed.
 */
describe('goes red when the shell stops reporting its selected phase', () => {
  it('moves the camera to the phase and answers that the selection was not verified', async () => {
    inject('dropsThePhaseLine')
    await readerOpensTheSheet()

    // The camera lands, the line never arrives, and the tool has to run out
    // its 1800 ms verification deadline before it can answer — which
    // `theAgentJumps` turns the clock through.
    const said = await theAgentJumps('open_phase', { phase_id: MAINTAIN.id })
    // The camera went exactly where it was asked, with the sheet still up…
    expect(camera.fits.at(-1)).toMatchObject({
      targetId: MAINTAIN.id,
      occludedBottomPx: SHEET_OCCLUDED_PX,
    })
    expect(theSheetIsUpWithTheConversation()).toBe(true)
    // …and the answer the model reads is a failure.
    expect(said).toBe(
      'Phase navigation started, but the selected phase was not verified before timeout.',
    )
    expect(await uiState()).not.toContain('Selected phase')
  })
})
