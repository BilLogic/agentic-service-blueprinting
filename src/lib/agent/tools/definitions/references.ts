import { z } from 'zod'
import { arg, defineTool } from '@/lib/agent/tools/definition'
import { listReferences, readReference } from '@/lib/agent/tools/read'
import { REFERENCE_NAMES } from '@/lib/agent/tools/referenceNames'

/**
 * The rulebook. Neither tool has a database behind it — the references are
 * bundled — so the no-database trial serves the same implementation the live
 * app does, not a stand-in.
 */

/**
 * The first-read pointer at a deployment's own account of its blueprint.
 *
 * The template ships no `blueprint` reference; a deployment registers one
 * through the reference registry before the app loads. So the pointer is
 * written only when that name is served — standalone, it would aim the
 * model's first call at a reference that does not exist.
 */
const READ_FIRST = REFERENCE_NAMES.includes('blueprint')
  ? 'Read blueprint first for what this blueprint is, what a status licenses you to say and what absence means; lane-roles'
  : 'Read lane-roles'

export const getReferenceTool = defineTool({
  name: 'get_reference',
  description: `Read a rulebook reference before acting on its topic. Available: ${REFERENCE_NAMES.filter((name) => name !== 'canvas-adapter').join(', ')}. ${READ_FIRST} and lane-vocabulary before any lane/role work; cocreate-playbook and elicitation-protocol before co-creating a scenario from conversation or notes.`,
  surface: 'read',
  args: z.object({
    name: arg.text('Reference name, e.g. "lane-roles"'),
  }),
  availability: { sample: true, mobile: true },
  run: async ({ name }) => readReference(name),
})

export const listReferencesTool = defineTool({
  name: 'list_references',
  description:
    'The rulebook references available to get_reference, live. Use when unsure what guidance exists.',
  surface: 'read',
  args: z.object({}),
  availability: { sample: true, mobile: true },
  run: async () => listReferences(),
})
