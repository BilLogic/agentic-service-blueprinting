import { z } from 'zod'
import { arg, defineTool } from '@/lib/agent/tools/definition'
import { getCell, listCellDependencies } from '@/lib/agent/tools/read'
import { sampleGetCell, sampleListCellDependencies } from '@/lib/agent/tools/sampleRead'

/**
 * The tools that act on a cell, grouped by the noun they act on the same
 * way the mutation modules are, so a tool and the write it performs sit one
 * import apart. Reads today; the writes arrive as their switch cases move.
 */

export const getCellTool = defineTool({
  name: 'get_cell',
  description:
    'One cell in full: content, summary, owners, function/form/value, position.',
  surface: 'read',
  args: z.object({
    cell_id: arg.text('Cell id'),
  }),
  availability: { sample: true, mobile: true },
  run: async ({ cell_id }, ctx) =>
    ctx.client ? getCell(ctx.client, cell_id) : sampleGetCell(cell_id),
})

export const listCellDependenciesTool = defineTool({
  name: 'list_cell_dependencies',
  description:
    'The dependencies: which cell sets off, or depends on, which other cell. `leads_to` means this cell makes the other one happen (drawn as an arrow); `enables` means the other must already be true (recorded, never drawn). Pass cell_id to get just the edges touching one cell — the whole graph is large. These are the same arrows the user sees on the canvas, and the read half of create_cell_dependency.',
  surface: 'read',
  args: z.object({
    cell_id: arg.optionalText(
      'Restrict to edges into or out of this cell; omit for the whole graph (capped at 200)',
    ),
  }),
  availability: { sample: true, mobile: true },
  run: async ({ cell_id }, ctx) =>
    ctx.client
      ? listCellDependencies(ctx.client, cell_id)
      : sampleListCellDependencies(cell_id),
})
