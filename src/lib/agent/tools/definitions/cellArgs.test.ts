import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  agentCellFields,
  cellFieldArgs,
  describeCellFields,
} from '@/lib/agent/tools/definitions/cellArgs'
import { updateCellTool, upsertCellTool } from '@/lib/agent/tools/definitions/cells'
import { toolSpec, type ToolDefinition } from '@/lib/agent/tools/definition'
import { CELL_FIELDS, EDITABLE_CELL_FIELDS, type AnyCellField } from '@/lib/cellFields'

/*
  THE TOOLS' ARGUMENTS ARE THE DESCRIPTORS'.

  `update_cell` used to spell its seven arguments by hand, beside a panel
  that spelled the same seven fields by hand; both now read the cell field
  list. The proof is not that the two lists agree today but that one more
  descriptor with an `agentArg` reaches the schema without a tool edit.
*/

describe('the cell-writing tools build their arguments from the cell field list', () => {
  it('update_cell offers exactly the editable fields the list marks for the agent, under their own names', () => {
    const offered = Object.keys(updateCellTool.args.shape)
    const listed = agentCellFields(EDITABLE_CELL_FIELDS).map((field) => field.agentArg)
    expect(offered).toEqual(['cell_id', ...listed])
    // The argument name is the column key — the type says so, and this says
    // the list has not found a way around it.
    for (const field of agentCellFields()) expect(field.agentArg).toBe(field.key)
  })

  it('upsert_cell takes the slot and the text from the list, with the path named beside them', () => {
    expect(Object.keys(upsertCellTool.args.shape)).toEqual(['path_id', 'lane_id', 'step_id', 'content'])
    const spec = toolSpec(upsertCellTool)
    expect(spec.parameters.required).toEqual(['path_id', 'lane_id', 'step_id', 'content'])
  })

  it('gains an argument when a descriptor gains an agent argument, and not before', () => {
    // `frame` is a real column the list already describes; here it is also
    // handed to the agent. The shape gains it, optional, under its own name,
    // with the hint the descriptor carries.
    const withFrame: readonly AnyCellField[] = CELL_FIELDS.map((field) =>
      field.key === 'frame'
        ? { ...field, agentArg: 'frame' as const, agentHint: 'The featured image, by resource id' }
        : field,
    )
    const before = cellFieldArgs(CELL_FIELDS, { required: false })
    const after = cellFieldArgs(withFrame, { required: false })
    expect(Object.keys(before)).not.toContain('frame')
    expect(Object.keys(after)).toContain('frame')
    const frame = after.frame!
    expect(frame.safeParse(undefined).success).toBe(true)
    expect(frame.safeParse('res-1').success).toBe(true)
    expect(z.object(after).parse({ frame: 'res-1' })).toEqual({ frame: 'res-1' })
    const gained = { ...updateCellTool, args: z.object(after) } as unknown as ToolDefinition
    expect(toolSpec(gained).parameters.properties).toHaveProperty(
      'frame',
      expect.objectContaining({ description: 'The featured image, by resource id; omit to keep' }),
    )
  })

  it('is bound to the list by the tool itself, not only by the builder', async () => {
    // The tool's `args` bind the list when its module loads, so load it over
    // a list where `frame` has an agent argument and read the real tool.
    vi.resetModules()
    vi.doMock('@/lib/cellFields', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/lib/cellFields')>()
      const withFrame = actual.CELL_FIELDS.map((field) =>
        field.key === 'frame'
          ? { ...field, agentArg: 'frame' as const, agentHint: 'The featured image, by resource id', editor: { control: 'input' as const } }
          : field,
      )
      return {
        ...actual,
        CELL_FIELDS: withFrame,
        EDITABLE_CELL_FIELDS: withFrame.filter((field) => 'editor' in field),
      }
    })
    const { updateCellTool: loaded } = await import('@/lib/agent/tools/definitions/cells')
    expect(Object.keys(loaded.args.shape)).toContain('frame')
    expect(loaded.description).toContain('frame (The one picture this cell leads with)')
    vi.doUnmock('@/lib/cellFields')
    vi.resetModules()
  })

  it('describes each field to the model in the panel\'s words', () => {
    // The sentence the model reads about a field is built from the hint a
    // person reads above the panel's control for it.
    const text = describeCellFields('spec')
    for (const field of agentCellFields(EDITABLE_CELL_FIELDS).filter((one) => one.group === 'spec')) {
      expect(text).toContain(field.agentArg)
      expect(text).toContain(field.hint.replace(/\.$/, ''))
    }
    expect(updateCellTool.description).toContain(text)
    // And the schema's own sentence for a field without an agent hint is the
    // panel's hint, so a person and the model read the same words for it.
    const properties = toolSpec(updateCellTool).parameters.properties as Record<string, { description: string }>
    const formArg = properties.form!
    expect(formArg.description).toBe('How it comes across; omit to keep')
  })
})
