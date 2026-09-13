import { z } from 'zod'
import { arg, defineTool } from '@/lib/agent/tools/definition'
import { getSlice, listSlices } from '@/lib/agent/tools/read'
import { sampleGetSlice, sampleListSlices } from '@/lib/agent/tools/sampleRead'

/** The tools that read a slice — a stakeholder's view of the journey. */

export const listSlicesTool = defineTool({
  name: 'list_slices',
  description: 'List existing slices (stakeholder views) with ids and types.',
  surface: 'read',
  args: z.object({}),
  availability: { sample: true, mobile: true },
  run: async (_args, ctx) => (ctx.client ? listSlices(ctx.client) : sampleListSlices()),
})

export const getSliceTool = defineTool({
  name: 'get_slice',
  description:
    'One slice in full: fields plus every slide with its cells, title, caption. Read before update_slice or replace_slides.',
  surface: 'read',
  args: z.object({
    slice_id: arg.text('Slice id from list_slices'),
  }),
  availability: { sample: true, mobile: true },
  run: async ({ slice_id }, ctx) =>
    ctx.client ? getSlice(ctx.client, slice_id) : sampleGetSlice(slice_id),
})
