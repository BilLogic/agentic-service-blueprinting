import { z } from 'zod'
import { defineTool } from '@/lib/agent/tools/definition'
import { getCell } from '@/lib/agent/tools/read'
import { sampleGetCell } from '@/lib/agent/tools/sampleRead'

/**
 * The tools that act on a cell, grouped by the noun they act on the same
 * way the mutation modules are, so a tool and the write it performs sit one
 * import apart. One read today; the rest arrive as their switch cases move.
 *
 * `surface` and `availability` are stated here AND, until the roster derives
 * from definitions, in the name sets the spec table still keeps. A test holds
 * the two statements equal so neither can drift while both exist.
 */

export const getCellTool = defineTool({
  name: 'get_cell',
  description:
    'One cell in full: content, summary, owners, function/form/value, position.',
  surface: 'read',
  args: z.object({
    // `min(1)` says in the schema what the dispatcher used to enforce by
    // hand — an empty id was refused, not looked up — so the model is told
    // the rule instead of discovering it.
    cell_id: z.string().min(1).describe('Cell id'),
  }),
  availability: { sample: true, mobile: true },
  run: async ({ cell_id }, ctx) =>
    ctx.client ? getCell(ctx.client, cell_id) : sampleGetCell(cell_id),
})
