import { z } from 'zod'
import { arg, defineTool } from '@/lib/agent/tools/definition'
import { listFindings } from '@/lib/agent/tools/read'
import { requireClient } from '@/lib/agent/tools/definitions/scope'

/** The findings ledger: what an audit or a what-if run recorded, and its status. */

export const listFindingsTool = defineTool({
  name: 'list_findings',
  description:
    'The findings ledger: audit/whatif findings with status. Read before recording (see what is already open) and when the human asks to triage.',
  surface: 'read',
  args: z.object({
    status: z
      .enum(['open', 'resolved', 'dismissed', 'all'])
      .describe('Filter; default open')
      .optional(),
    cell_id: arg.optionalText(
      'Only findings that cite this cell. Use when the human asks whether anything is flagged on one moment.',
    ),
  }),
  availability: { sample: false, mobile: true },
  run: async ({ status, cell_id }, ctx) =>
    listFindings(requireClient(ctx), { status, cellId: cell_id }),
})
