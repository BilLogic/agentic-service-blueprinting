import { describe, expect, it } from 'vitest'
import { runTool } from '@/lib/agent/tools/definition'
import {
  annotateCellsTool,
  focusCellTool,
  openCellPanelTool,
  openPhaseTool,
  openScenarioTool,
  setCanvasModeTool,
  setSidebarTool,
  uiCommandTool,
} from '@/lib/agent/tools/definitions/interface'
import { listUiCommandsTool } from '@/lib/agent/tools/definitions/ui'
import { fakeToolContext, recordingUi } from '@/lib/agent/tools/definitions/testContext'
import { dispatchTool } from '@/lib/agent/tools/registry'

/*
 * The interface tools, against a canvas built by hand. No document, no
 * registered bridge, no store: the context's `ui` records what it was asked
 * and the test reads the record. The one tool that may change data —
 * `ui_command`, when the control says so — is shown to run attributed to
 * the session, and only then.
 */

function recordingSession() {
  const attributed: string[] = []
  return {
    attributed,
    session: {
      id: 'session-1',
      attributed: async <T,>(work: () => Promise<T>) => {
        attributed.push('begin')
        try {
          return await work()
        } finally {
          attributed.push('end')
        }
      },
    },
  }
}

describe('navigation tools move the canvas through ctx.ui', () => {
  it('open_phase, open_scenario, focus_cell and open_cell_panel each ask the canvas once', async () => {
    const { ui, log } = recordingUi()
    const ctx = fakeToolContext({ ui })
    expect(await runTool(openPhaseTool, { phase_id: 'ph-1' }, ctx)).toBe('openPhase ph-1')
    expect(await runTool(openScenarioTool, { scenario_id: 'sc-1' }, ctx)).toBe('openScenario sc-1')
    expect(await runTool(focusCellTool, { cell_id: 'c-1' }, ctx)).toBe('focusCell c-1')
    expect(await runTool(openCellPanelTool, { cell_id: 'c-1' }, ctx)).toBe('openCellPanel c-1')
    expect(log).toEqual(['openPhase ph-1', 'openScenario sc-1', 'focusCell c-1', 'openCellPanel c-1'])
  })

  it('refuses an empty id before the canvas hears of it', async () => {
    const { ui, log } = recordingUi()
    await expect(runTool(openPhaseTool, { phase_id: '' }, fakeToolContext({ ui }))).rejects.toThrow(
      /phase_id/,
    )
    expect(log).toEqual([])
  })

  it('are offered to the trial and to mobile, and run there with no client', async () => {
    for (const tool of [openPhaseTool, openScenarioTool, focusCellTool, openCellPanelTool])
      expect(tool.availability).toEqual({ sample: true, mobile: true })
    const { ui, log } = recordingUi()
    await runTool(openPhaseTool, { phase_id: 'ph-1' }, fakeToolContext({ client: null, ui }))
    expect(log).toEqual(['openPhase ph-1'])
  })
})

describe('the desktop controls', () => {
  it('set_canvas_mode switches the mode and says so; a mode outside the two is refused', async () => {
    const { ui, log } = recordingUi()
    const ctx = fakeToolContext({ ui })
    expect(await runTool(setCanvasModeTool, { mode: 'design' }, ctx)).toBe('Canvas mode is now design.')
    expect(log).toEqual(['setCanvasMode design'])
    await expect(runTool(setCanvasModeTool, { mode: 'edit' }, ctx)).rejects.toThrow(/mode/)
  })

  it('set_sidebar relays what the shell answered', async () => {
    const { ui } = recordingUi()
    expect(await runTool(setSidebarTool, { collapsed: true }, fakeToolContext({ ui }))).toBe(
      'setSidebar true',
    )
    await expect(
      runTool(setSidebarTool, { collapsed: 'yes' }, fakeToolContext({ ui })),
    ).rejects.toThrow(/collapsed/)
  })

  it('annotate_cells boxes the cells with an optional note, and refuses none', async () => {
    const { ui } = recordingUi()
    const ctx = fakeToolContext({ ui })
    expect(await runTool(annotateCellsTool, { cell_ids: ['c-1', 'c-2'], note: 'here' }, ctx)).toBe(
      'annotateCells c-1,c-2 "here"',
    )
    await expect(runTool(annotateCellsTool, { cell_ids: [] }, ctx)).rejects.toThrow(
      /non-empty array/,
    )
  })

  it('are kept off the trial and off mobile', () => {
    for (const tool of [setCanvasModeTool, setSidebarTool, annotateCellsTool, uiCommandTool])
      expect(tool.availability).toEqual({ sample: false, mobile: false })
  })
})

describe('ui_command', () => {
  it('fires a control that does not change data outside any attribution', async () => {
    const { ui, log } = recordingUi()
    const { session, attributed } = recordingSession()
    const text = await runTool(uiCommandTool, { command: 'zoom_in' }, fakeToolContext({ ui, session }))
    expect(text).toBe('runCommand zoom_in')
    expect(log).toEqual(['runCommand zoom_in'])
    expect(attributed).toEqual([])
  })

  it('runs a control that changes data attributed to the session, with its argument', async () => {
    const { ui, log } = recordingUi(new Set(['undo_last_change']))
    const { session, attributed } = recordingSession()
    await runTool(
      uiCommandTool,
      { command: 'undo_last_change', arg: 'c-1' },
      fakeToolContext({ ui, session }),
    )
    expect(log).toEqual(['runCommand undo_last_change c-1'])
    expect(attributed).toEqual(['begin', 'end'])
  })

  it('list_ui_commands reads the same canvas', async () => {
    const { ui } = recordingUi()
    expect(await runTool(listUiCommandsTool, {}, fakeToolContext({ ui }))).toContain('zoom_in')
  })
})

describe('through the dispatcher', () => {
  it('a navigation tool called in the trial runs from its definition against the live canvas', async () => {
    // No shell has registered a bridge in this test, so the live canvas
    // answers that navigation is unavailable — which is the definition
    // running, not the trial refusing.
    const text = await dispatchTool(null, 'session', 'open_phase', { phase_id: 'ph-1' })
    expect(text).toBe('UI navigation is not available right now.')
  })

  it('a desktop control called in the trial lands on the trial refusal, not on a null canvas', async () => {
    const text = await dispatchTool(null, 'session', 'set_canvas_mode', { mode: 'design' })
    expect(text).toMatch(/bundled SAMPLE blueprint/)
    expect(text).toMatch(/"set_canvas_mode" does not exist here/)
  })
})
