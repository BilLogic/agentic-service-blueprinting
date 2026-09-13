import { z } from 'zod'
import { defineTool } from '@/lib/agent/tools/definition'
import { listStakeholders } from '@/lib/agent/tools/read'
import { SERVICE_ARG, readScope, requireClient } from '@/lib/agent/tools/definitions/scope'

/**
 * The cast. A deployment-level catalog under the decision that a service
 * owns its journey and shares the catalog, so the read is unscoped by
 * default and narrows to the actors one service's lanes pick when asked.
 * The bundled sample is a board, not a deployment, and carries no cast — so
 * the no-database trial is not offered this tool, rather than answering
 * with an invented empty roster.
 */

export const listStakeholdersTool = defineTool({
  name: 'list_stakeholders',
  description:
    'The cast: who the blueprint is for, who staffs it, who partners on it, and the provider itself — with the other spellings each name has been written as. ALWAYS read before writing a value_props audience or linking a lane: `owner` and `Blueprint owner` are one person, and the aliases are where that is recorded. The cast is a shared deployment-level catalog, and by default this shows the whole roster; pass service to see only the actors that one service\'s lanes actually pick.',
  surface: 'read',
  args: z.object({
    service: SERVICE_ARG,
  }),
  availability: { sample: false, mobile: true },
  run: async ({ service }, ctx) => {
    const client = requireClient(ctx)
    return listStakeholders(client, await readScope(client, service))
  },
})
