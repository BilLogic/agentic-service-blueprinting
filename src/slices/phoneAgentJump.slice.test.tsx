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
 * watcher and the tool both wait on travels through the real
 * `canvasNavigationOutcome` module.
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
 * defects are encoded as red cases below, each injected at a seam this flow
 * really routes through, and each has been watched fail the assertions the
 * green case makes.
 *
 * WHAT STANDS IN FOR THE CANVAS, AND WHY. `ServiceOverviewView` is replaced
 * by a camera stand-in of a dozen lines, for the reason the annotation-drag
 * slice stubs its board: jsdom lays nothing out, so the real viewport has no
 * rectangle to fit to, no frames to fly over, and no verdict to publish —
 * every assertion below would be about a camera that never moved. The
 * stand-in does exactly what the real viewport does at the two points this
 * flow reads it: it takes `occludedBottomPx` as the fit inset, and once per
 * mount it publishes an outcome for `cameraTargetId` through the shipped
 * `publishCanvasNavigationOutcome` — which is the key the real viewport
 * publishes under (`cameraOutcomeKey`, handed down from the same field).
 * Everything between the tool call and that verdict is the shipped code.
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
 * WHAT THIS FILE CANNOT SEE. It runs no frames. A real phone scenario jump
 * publishes its verdict about 366 ms after the selection — a 200 ms fade, one
 * canvas remount, then the fit — and the fade here is the shipped timer while
 * the fit is a timeout standing in for a chain of `requestAnimationFrame`
 * steps that jsdom does not schedule. So the ORDER and the choreography are
 * covered and the wall-clock duration is not: this file cannot say that a fit
 * lands inside the tool's 1800 ms deadline or the watcher's 2000 ms one on a
 * real device, that the strip above the sheet is legible through the scrim,
 * or that the destination is visually inside it — only that the occluded
 * height reached the camera as an inset. Those are the render walk's to
 * answer, at 375×812 in a real browser.
 */
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
 * `fits` is one entry per mount-time fit — the moment the real viewport
 * publishes its verdict — carrying the semantic target it answered for and
 * the inset in force when it ran. `inset` is the latest value the shell
 * handed down, which is how the sheet's arrival is read before any jump.
 */
const camera = vi.hoisted(() => ({
  fits: [] as Array<{
    scenarioId: string | null
    targetId: string | null
    occludedBottomPx: number
  }>,
  inset: 0,
  /**
   * How long after a mount the stand-in reports its fit. A real fit is a
   * chain of frames; this is one timer, and the only thing it has to be is
   * later than the mount and sooner than the deadlines the tool and the
   * watcher race it against.
   */
  fitDelayMs: 16,
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
 * THE TWO SHIPPED DEFECTS, AS SWITCHES.
 *
 * Both reds below restore a behaviour that really shipped, and both are
 * injected at a seam this flow really routes through rather than by editing
 * the shell: the module that is the agent's hands, and the read side of the
 * bridge the shell reports itself through. They are switches on mocks that
 * otherwise delegate exactly — a module graph reset per red would have to
 * re-import every provider the shell mounts under, and the whole point of an
 * injection is that the code under it is the shipped code.
 */
const defect = vi.hoisted(() => ({
  /** The sheet gets out of the way by closing, which is what it used to do. */
  closesTheSheetOnAJump: false,
  /** The shell reports everything about itself except its selected phase. */
  dropsThePhaseLine: false,
}))

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

vi.mock('@/lib/agent/uiBridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/agent/uiBridge')>()
  return {
    ...actual,
    registerAgentUiContext: (key: string, contributor: () => string | null) =>
      actual.registerAgentUiContext(key, () => {
        const reported = contributor()
        if (!defect.dropsThePhaseLine) return reported
        return (reported ?? '')
          .split('\n')
          .filter((line) => !line.startsWith('Selected phase:'))
          .join('\n')
      }),
  }
})

/**
 * The camera, stood in for. It reads the same two props the shell hands the
 * real board — the fit inset and the fit-ready callback — and publishes the
 * same verdict under the same key, once per mount, which is the shape the
 * shell's remount-per-scenario keying gives the real one.
 */
vi.mock('@/components/editor/ServiceOverviewView', async () => {
  const { createElement, useEffect, useRef } = await import('react')
  const { useEditor } = await import('@/contexts/EditorContext')
  const { publishCanvasNavigationOutcome } = await import(
    '@/lib/canvasNavigationOutcome'
  )
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
        const settle = setTimeout(() => {
          camera.fits.push({
            scenarioId: soloScenarioId ?? null,
            targetId: cameraTargetId,
            occludedBottomPx: inset.current,
          })
          onInitialFitReady?.()
          if (cameraTargetId)
            publishCanvasNavigationOutcome(cameraTargetId, {
              kind: 'completed',
              transform: { pan: { x: 0, y: 0 }, zoom: 1 },
            })
        }, camera.fitDelayMs)
        return () => clearTimeout(settle)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- one fit per mount, which is what the shell's keying gives the real board
      }, [])
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
import { saveAgentSettings } from '@/lib/agent/settings'
import { cameraSettled } from '@/lib/agent/uiBridge'
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
 * The phone's media answers: below the shell's breakpoint, and no reduced
 * motion — the scenario swap's fade is part of the choreography this flow is
 * about, and a reader who asked for less motion skips it.
 */
function phoneMedia() {
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

/** The composer the caret is handed back to — found the way `focusAgentComposer` finds it. */
const composer = () =>
  document.querySelector<HTMLTextAreaElement>('textarea[data-agent-composer]')

/** Whatever bottom sheet is up — the ✦ sheet, or the index drawer. */
const sheetContent = () =>
  document.querySelector<HTMLElement>('[data-slot="sheet-content"]')

/** Is the ✦ sheet still on screen, with the conversation in it? */
function sheetIsUp(): boolean {
  return composer() !== null
}

/** What the phone reports about itself, read the way `get_ui_state` reads it. */
async function uiState(): Promise<string> {
  return dispatchTool(null, SESSION, 'get_ui_state', {})
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
  await vi.waitFor(() => expect(screen.getByTestId('phone-canvas')).toBeTruthy())
  // …and it arrives with the drawer still shut, on the canvas.
  expect(sheetContent()).toBeNull()
  await vi.waitFor(() => expect(camera.fits).toHaveLength(1))
  // The landing fit was aimed at the whole screen: no sheet, nothing occluded.
  expect(camera.fits[0]).toMatchObject({
    scenarioId: LANDED.id,
    occludedBottomPx: 0,
  })

  fireEvent.click(screen.getByRole('button', { name: 'Ask the agent' }))
  fireEvent.click(await screen.findByRole('button', { name: 'New session' }))
  // The composer is the caret's destination, and it has to be typeable: a
  // panel with no provider key disables the field, and handing the caret to a
  // disabled field is worse than not handing it back at all.
  await vi.waitFor(() => expect(composer()).toBeTruthy())
  expect(composer()!.disabled).toBe(false)
  // THE SHEET'S HEIGHT REACHED THE CAMERA, before any jump: the shell measured
  // it and handed it down as the fit inset.
  await vi.waitFor(() => expect(camera.inset).toBe(SHEET_OCCLUDED_PX))
  expect(await uiState()).toContain('Agent sheet: open')
}

beforeEach(() => {
  camera.fits = []
  camera.inset = 0
  phoneMedia()
  globalThis.ResizeObserver =
    StillResizeObserver as unknown as typeof ResizeObserver
  // The one key that makes the composer typeable. It never leaves this
  // process — nothing in this flow sends a message to a provider.
  saveAgentSettings({ provider: 'anthropic', keys: { anthropic: 'test-key' } })
})

let unstamp: (() => void) | null = null
beforeEach(() => {
  unstamp = stampTheSheetsHeight()
})
afterEach(() => {
  cleanup()
  unstamp?.()
  unstamp = null
})

describe('the agent moves the phone camera while the sheet stays up', () => {
  it('jumps to a scenario and to a phase: the sheet stays, the destination is aimed above it, the selection is reported, and the caret comes back', async () => {
    await readerOpensTheSheet()

    // THE AGENT JUMPS TO ANOTHER SCENARIO — through the tool the model calls,
    // so the answer below is the sentence a model would read.
    const said = await dispatchTool(null, SESSION, 'open_scenario', {
      scenario_id: JUMPED.id,
    })
    expect(said).toBe(cameraSettled('scenario'))

    // 1. THE SHEET STAYED. This is the regression that shipped: the sheet used
    // to close to make the move visible, which threw the conversation away in
    // the one moment a reader most needs it.
    expect(sheetIsUp()).toBe(true)
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
    await vi.waitFor(() => expect(document.activeElement).toBe(composer()))

    // THE AGENT JUMPS TO A PHASE. This is the other shipped defect's flow: a
    // shell with no phase line answered "not verified" for a jump that landed.
    // The caret is put down first, so its return is this jump's doing.
    composer()!.blur()
    const saidPhase = await dispatchTool(null, SESSION, 'open_phase', {
      phase_id: MAINTAIN.id,
    })
    expect(saidPhase).toBe(cameraSettled('phase'))

    expect(sheetIsUp()).toBe(true)
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
    await vi.waitFor(() => expect(document.activeElement).toBe(composer()))
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
  beforeEach(() => {
    defect.closesTheSheetOnAJump = true
  })
  afterEach(() => {
    defect.closesTheSheetOnAJump = false
  })

  it('lands the camera and reports success, with the conversation gone and the caret nowhere', async () => {
    await readerOpensTheSheet()

    const said = await dispatchTool(null, SESSION, 'open_scenario', {
      scenario_id: JUMPED.id,
    })
    // The camera landed and the tool says so — the defect is invisible here.
    expect(said).toBe(cameraSettled('scenario'))
    expect(camera.fits.at(-1)).toMatchObject({ targetId: JUMPED.id })

    // And the assertions the green case makes about the sheet all fail: the
    // conversation is off screen, the fit was aimed at a screen with nothing
    // over it, and there is no composer left to hand the caret back to.
    expect(sheetIsUp()).toBe(false)
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
  beforeEach(() => {
    defect.dropsThePhaseLine = true
  })
  afterEach(() => {
    defect.dropsThePhaseLine = false
  })

  it('moves the camera to the phase and answers that the selection was not verified', async () => {
    await readerOpensTheSheet()

    const said = await dispatchTool(null, SESSION, 'open_phase', {
      phase_id: MAINTAIN.id,
    })
    // The camera went exactly where it was asked, with the sheet still up…
    expect(camera.fits.at(-1)).toMatchObject({
      targetId: MAINTAIN.id,
      occludedBottomPx: SHEET_OCCLUDED_PX,
    })
    expect(sheetIsUp()).toBe(true)
    // …and the answer the model reads is a failure.
    expect(said).toBe(
      'Phase navigation started, but the selected phase was not verified before timeout.',
    )
    expect(await uiState()).not.toContain('Selected phase')
  })
})
