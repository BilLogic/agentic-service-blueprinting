// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  agentFocusCell,
  agentOpenCellPanel,
  agentOpenScenario,
  registerAgentUiBridge,
  registerAgentUiContext,
} from '@/lib/agent/uiBridge'
import { registerActiveFocusCells } from '@/lib/canvasFocusCells'
import {
  publishCanvasNavigationOutcome,
  waitForCanvasNavigationOutcome,
} from '@/lib/canvasNavigationOutcome'
import { describeSelection } from '@/lib/shellContext'

const cleanups: Array<() => void> = []

// jsdom ships no `CSS.escape`; the bridge only needs it for ids.
if (typeof globalThis.CSS === 'undefined' || !globalThis.CSS.escape) {
  Object.defineProperty(globalThis, 'CSS', {
    configurable: true,
    value: { escape: (value: string) => value.replace(/[^\w-]/g, '\\$&') },
  })
}

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  cleanups.push(() =>
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }),
  )
}

describe('agent camera bridge', () => {
  it('reports a real completed focus', async () => {
    cleanups.push(
      registerActiveFocusCells(async () => ({ kind: 'flown', completion: 'completed' })),
    )
    await expect(agentFocusCell('cell-1')).resolves.toContain('Focused')
  })

  it('does not claim a miss or cancellation landed', async () => {
    const removeMiss = registerActiveFocusCells(async () => ({
      kind: 'miss',
      missing: ['cell-1'],
    }))
    await expect(agentFocusCell('cell-1')).resolves.toContain('not on the active canvas')
    removeMiss()
    cleanups.push(
      registerActiveFocusCells(async () => ({ kind: 'flown', completion: 'cancelled' })),
    )
    await expect(agentFocusCell('cell-1')).resolves.toContain('cancelled')
  })

  it('resolves the current registration at invocation time', async () => {
    const removeOld = registerActiveFocusCells(async () => ({
      kind: 'miss',
      missing: ['cell-1'],
    }))
    cleanups.push(
      registerActiveFocusCells(async () => ({ kind: 'flown', completion: 'completed' })),
    )
    removeOld()
    await expect(agentFocusCell('cell-1')).resolves.toContain('Focused')
  })

  it('does not fly a hidden viewport that has unregistered', async () => {
    const hidden = registerActiveFocusCells(async () => ({
      kind: 'flown',
      completion: 'completed',
    }))
    hidden()
    await expect(agentFocusCell('cell-1')).resolves.toContain(
      'No active canvas camera is available',
    )
  })


  it('gives up on a fly that never settles instead of wedging the loop', async () => {
    vi.useFakeTimers()
    cleanups.push(registerActiveFocusCells(() => new Promise(() => {})))
    const pending = agentFocusCell('cell-1')
    await vi.advanceTimersByTimeAsync(1500)
    await expect(pending).resolves.toContain('not verified before timeout')
  })

  it('does not animate in a hidden tab, where frames never run', async () => {
    setHidden(true)
    let animate: boolean | undefined
    cleanups.push(
      registerActiveFocusCells(async (_ids, opts) => {
        animate = opts?.animate
        return { kind: 'flown', completion: 'completed' }
      }),
    )
    await agentFocusCell('cell-1')
    expect(animate).toBe(false)
  })
})

describe('agent cell panel bridge', () => {
  function mountCell(id: string) {
    const el = document.createElement('div')
    el.setAttribute('data-blueprint-cell', id)
    el.setAttribute('data-blueprint-cell-interactive', '')
    document.body.appendChild(el)
    return el
  }

  it('still clicks when the camera fly was superseded, and says so', async () => {
    const el = mountCell('cell-1')
    let clicks = 0
    el.addEventListener('click', () => {
      clicks += 1
      cleanups.push(registerAgentUiContext('cell-panel', () => 'Cell panel: cell-1'))
    })
    cleanups.push(
      registerActiveFocusCells(async () => ({ kind: 'flown', completion: 'superseded' })),
    )
    const result = await agentOpenCellPanel('cell-1')
    expect(clicks).toBe(1)
    expect(result).toContain('Opened the cell detail panel.')
    expect(result).toContain('superseded')
  })

  it('refuses without a click when the cell is not rendered', async () => {
    let called = false
    cleanups.push(
      registerActiveFocusCells(async () => {
        called = true
        return { kind: 'flown', completion: 'completed' }
      }),
    )
    await expect(agentOpenCellPanel('cell-1')).resolves.toContain('not clickable')
    expect(called).toBe(false)
  })
})

describe('agent navigation bridge', () => {
  const transform = { pan: { x: 0, y: 0 }, zoom: 1 }

  /*
    The shell context these cases hand the bridge, rendered by the module the
    bridge recognises it with. Hand-written, these lines were a fifth spelling
    of the wire — and one of the cases below is RECOGNITION coverage, so a
    re-spelled fixture would have been the verifier tested against a format
    nothing publishes. Deriving them means a change to the sentence reaches
    this file the way it reaches a shell.
  */
  const IDLE_CAMERA = 'Canvas camera: 100%, idle.'
  const context = (...lines: string[]) => [...lines, IDLE_CAMERA].join('\n')

  function installShell(
    lines: () => string,
    completion: 'completed' | 'cancelled' | 'superseded' | null = null,
  ) {
    cleanups.push(
      registerAgentUiBridge({
        selectPhase: () => {},
        selectScenario: (id) => {
          if (completion)
            publishCanvasNavigationOutcome(id, {
              kind: completion,
              transform,
            })
        },
        openAgentSurface: () => {},
        setSidebarCollapsed: () => {},
      }),
    )
    cleanups.push(registerAgentUiContext('shell', lines))
  }

  it('waits for the viewport completion outcome instead of trusting idle', async () => {
    vi.useFakeTimers()
    installShell(() =>
      context(
        describeSelection('phase', { id: 'p1', label: 'P' }),
        describeSelection('scenario', { id: 's1', label: 'S' }),
      ),
    )
    let settled: string | null = null
    void agentOpenScenario('s1').then((message) => {
      settled = message
    })
    await vi.advanceTimersByTimeAsync(200)
    expect(settled).toBeNull()
    publishCanvasNavigationOutcome('s1', { kind: 'completed', transform })
    await vi.advanceTimersByTimeAsync(0)
    expect(settled).toContain('settled its canvas camera')
  })

  it.each(['cancelled', 'superseded'] as const)(
    'does not claim a %s semantic flight landed',
    async (completion) => {
    vi.useFakeTimers()
      installShell(
        () => context(describeSelection('scenario', { id: 's1', label: 'S' })),
        completion,
      )
      const settled = agentOpenScenario('s1')
      await vi.advanceTimersByTimeAsync(0)
      await expect(settled).resolves.toContain(completion)
    },
  )

  /*
    The phone listens on the SAME semantic key as this tool: its sheet keeps a
    watcher of its own so the backdrop can stand down for the flight, and that
    watcher lets go of its listener the moment a verdict arrives. Letting go
    settles the watcher's OWN waiter as cancelled — right for it, and never an
    answer for anybody else — so a landing has to survive a second listener
    detaching from the same key. The agent read it as failure either way while
    the fault was upstream, and this pins the shared channel so a future
    change to it cannot quietly bring the false report back.
  */
  it('reports a landing even while a second listener lets go of the same key', async () => {
    vi.useFakeTimers()
    let sheetWatcher: { cancel: () => void } | null = null
    cleanups.push(
      registerAgentUiBridge({
        selectPhase: () => {},
        selectScenario: (id) => {
          // What the phone's shell does, in the order it does it: listen
          // before the selection commits, release on the verdict.
          const watcher = waitForCanvasNavigationOutcome(id)
          sheetWatcher = watcher
          void watcher.promise.then(() => watcher.cancel())
        },
        openAgentSurface: () => {},
        setSidebarCollapsed: () => {},
      }),
    )
    cleanups.push(
      registerAgentUiContext('shell', () =>
        context(describeSelection('scenario', { id: 's1', label: 'S' })),
      ),
    )
    const settled = agentOpenScenario('s1')
    await vi.advanceTimersByTimeAsync(0)
    expect(sheetWatcher).not.toBeNull()
    publishCanvasNavigationOutcome('s1', { kind: 'completed', transform })
    await vi.advanceTimersByTimeAsync(0)
    await expect(settled).resolves.toContain('settled its canvas camera')
  })

  it('does not read the phase line as the scenario selection', async () => {
    vi.useFakeTimers()
    installShell(
      () =>
        context(
          // The scenario's id, on the PHASE line: the verifier must not read
          // one selection's line as the other's.
          describeSelection('phase', { id: 's1', label: 'P' }),
          describeSelection('scenario', null),
        ),
      'completed',
    )
    const pending = agentOpenScenario('s1')
    await vi.advanceTimersByTimeAsync(1900)
    await expect(pending).resolves.toContain('not verified before timeout')
  })
})
