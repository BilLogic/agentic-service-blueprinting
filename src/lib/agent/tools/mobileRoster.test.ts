import { describe, expect, it } from 'vitest'
import {
  MOBILE_READ_TOOL_NAMES,
  TOOL_SPECS,
  WRITE_TOOL_NAMES,
} from '@/lib/agent/tools/specs'

/**
 * The mobile shell is view-only for every tier — this pins the agent's
 * mobile roster to reading and navigation. If a write tool ever lands in
 * the mobile whitelist, or the whitelist drifts from the registry, this
 * fails before a phone ever sees the hole.
 */
describe('mobile agent tool roster', () => {
  it('contains zero write tools', () => {
    const leaked = [...MOBILE_READ_TOOL_NAMES].filter((name) =>
      WRITE_TOOL_NAMES.has(name),
    )
    expect(leaked).toEqual([])
  })

  it('only names tools that exist in the registry', () => {
    const specNames = new Set(TOOL_SPECS.map((spec) => spec.name))
    const phantom = [...MOBILE_READ_TOOL_NAMES].filter(
      (name) => !specNames.has(name),
    )
    expect(phantom).toEqual([])
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
      expect(MOBILE_READ_TOOL_NAMES.has(name), name).toBe(false)
    }
  })

  it('keeps the core reading loop available', () => {
    for (const name of [
      'list_scenarios',
      'get_blueprint',
      'get_cell',
      'open_phase',
      'open_scenario',
      'focus_cell',
      'open_cell_panel',
      'get_ui_state',
    ]) {
      expect(MOBILE_READ_TOOL_NAMES.has(name), name).toBe(true)
    }
  })
})
