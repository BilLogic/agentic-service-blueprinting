import { describe, expect, it } from 'vitest'
import { sessionRoster } from '@/lib/agent/tools/roster'

/**
 * The mobile shell is view-only for every tier — this pins the agent's
 * mobile roster to reading and navigation. The roster is derived from each
 * definition's `availability.mobile`, so what this holds is that no
 * definition claims mobile it should not, and none withholds it that should
 * not: a write tool that said `mobile: true`, or a read a phone can answer
 * that said `false`, fails here before a phone ever sees the difference.
 */
describe('mobile agent tool roster', () => {
  const mobile = sessionRoster({
    sampleTrial: false,
    mobileReading: true,
    allowWrites: true,
    searchOffered: true,
  })
  const offered = new Set(mobile.map((tool) => tool.name))

  it('contains zero write tools, even for a service account', () => {
    expect(mobile.filter((tool) => tool.surface === 'write')).toEqual([])
  })

  it('withholds the authoring-posture surface tools', () => {
    // Mode switching, annotation marks, and desktop ui_commands imply an
    // authoring posture mobile does not have; set_sidebar drives a sidebar
    // that does not exist below md.
    for (const name of [
      'set_canvas_mode',
      'annotate_cells',
      'ui_command',
      'list_ui_commands',
      'set_sidebar',
    ]) {
      expect(offered.has(name), name).toBe(false)
    }
  })

  it('keeps the core reading loop available', () => {
    for (const name of [
      'list_blueprint',
      'get_blueprint',
      'get_cell',
      'open_phase',
      'open_scenario',
      'focus_cell',
      'open_cell_panel',
      'get_ui_state',
    ]) {
      expect(offered.has(name), name).toBe(true)
    }
  })

  it('carries every read tool a phone can answer from', () => {
    // Mobile is view-only, not read-poor: a phone asking who an actor is, or
    // what a claim rests on, is exactly the Q&A the shell exists for. The one
    // read deliberately withheld is the desktop-surface one the
    // authoring-posture test above already names.
    const desktop = sessionRoster({
      sampleTrial: false,
      mobileReading: false,
      allowWrites: false,
      searchOffered: true,
    })
    const withheld = new Set(['list_ui_commands'])
    const missing = desktop
      .filter((tool) => tool.surface === 'read' && !withheld.has(tool.name))
      .filter((tool) => !offered.has(tool.name))
      .map((tool) => tool.name)
    expect(missing).toEqual([])
  })
})
