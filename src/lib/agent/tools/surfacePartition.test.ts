import { describe, expect, it } from 'vitest'
import { TOOL_DEFINITIONS } from '@/lib/agent/tools/definitions'

/**
 * Read, interface, write — every tool is on exactly one surface, and the
 * surface is a field of its definition, so "exactly once" is the type's
 * doing. What is left to hold is that the verb and the surface agree:
 * `references/canvas-adapter.md` states the read and write surfaces as
 * FULL, and the agent reads a tool's row as what it may assume of it.
 */
describe('the agent tool surface partitions', () => {
  const byName = new Map(TOOL_DEFINITIONS.map((tool) => [tool.name, tool.surface]))
  const registered = [...byName.keys()]

  it('names every tool once', () => {
    expect(byName.size).toBe(TOOL_DEFINITIONS.length)
  })

  /**
   * The verb carries the classification, and this is where that stops being a
   * convention. `create_evidence` and `update_stakeholder` arrived as reads in
   * a first draft of the port — both name a catalog the agent had only ever
   * read, and both write a row. A `create_`/`update_` tool on the read surface
   * would put its name in the adapter's read row, which the agent reads as
   * "this changes nothing".
   */
  it('never files a create_ or update_ tool as a read', () => {
    const misfiled = registered
      .filter((name) => name.startsWith('create_') || name.startsWith('update_'))
      .filter((name) => byName.get(name) !== 'write')
    expect(misfiled).toEqual([])
  })

  /**
   * The other direction: a `list_`/`get_` tool is a read unless it is one of
   * the interface calls that fetch nothing. Nothing that only enumerates or
   * fetches may be billed against the write batch.
   */
  it('never files a list_ or get_ tool as a write', () => {
    const misfiled = registered
      .filter((name) => name.startsWith('list_') || name.startsWith('get_'))
      .filter((name) => byName.get(name) === 'write')
    expect(misfiled).toEqual([])
  })

  it('files the canvas movers and controls as interface, and nothing else', () => {
    const movers = registered.filter(
      (name) => name.startsWith('open_') || name.startsWith('focus_') || name.startsWith('set_'),
    )
    for (const name of movers) expect(byName.get(name), name).toBe('interface')
    expect(registered.filter((name) => byName.get(name) === 'interface').sort()).toEqual(
      ['annotate_cells', 'focus_cell', 'open_cell_panel', 'open_phase', 'open_scenario', 'set_canvas_mode', 'set_sidebar', 'ui_command'],
    )
  })

  it('a write is never offered to the trial or to mobile', () => {
    for (const tool of TOOL_DEFINITIONS.filter((entry) => entry.surface === 'write'))
      expect(tool.availability, tool.name).toEqual({ sample: false, mobile: false })
  })
})
