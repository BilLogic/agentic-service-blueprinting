import { z } from 'zod'
import { arg, defineTool } from '@/lib/agent/tools/definition'
import { getEvidence, listEvidence } from '@/lib/agent/tools/read'
import { requireClient } from '@/lib/agent/tools/definitions/scope'

/**
 * The provenance: the sources a blueprint's claims rest on. The bundled
 * sample carries none, so neither read is offered to the no-database trial.
 */

export const listEvidenceTool = defineTool({
  name: 'list_evidence',
  description:
    'Sources the blueprint\'s claims rest on — interviews, analytics, docs, decisions. Pass cell_id for one cell\'s evidence. Read before asserting that a mapped moment is GROUNDED: a cell with no evidence is a claim, not a finding.',
  surface: 'read',
  args: z.object({
    cell_id: arg.optionalText(
      'Restrict to evidence attached to this cell; omit for the newest 100 across the blueprint',
    ),
  }),
  availability: { sample: false, mobile: true },
  run: async ({ cell_id }, ctx) => listEvidence(requireClient(ctx), cell_id),
})

export const getEvidenceTool = defineTool({
  name: 'get_evidence',
  description:
    'Named evidence rows in full, the note included. Use after list_evidence to read the sources you intend to cite.',
  surface: 'read',
  args: z.object({
    evidence_ids: arg.strings('Evidence ids from list_evidence'),
  }),
  availability: { sample: false, mobile: true },
  run: async ({ evidence_ids }, ctx) => getEvidence(requireClient(ctx), evidence_ids),
})
