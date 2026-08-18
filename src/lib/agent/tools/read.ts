import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  formatBlueprints,
  formatCompareDiff,
  formatFields,
  formatOwnerTags,
  formatScenarioList,
  formatSliceList,
} from '@/lib/agent/tools/format'
import { normalizeBlueprint, type RawPath } from '@/lib/normalizeBlueprint'
import { PATH_BLUEPRINT_SELECT } from '@/lib/workflowQueries'
import {
  DELETION_NOUNS,
  readDeletionImpact,
  type DeletableKind,
} from '@/lib/deletionSafety'
import { REFERENCE_NAMES } from '@/lib/agent/tools/referenceNames'
import canvasAdapter from '@/lib/agent/skill/references/canvas-adapter.md?raw'
import dataModel from '@/lib/agent/skill/references/data-model.md?raw'
import elicitationProtocol from '@/lib/agent/skill/references/elicitation-protocol.md?raw'
import cocreatePlaybook from '@/lib/agent/skill/references/cocreate-playbook.md?raw'
import laneVocabulary from '@/lib/agent/skill/references/lane-vocabulary.md?raw'
import layerRoles from '@/lib/agent/skill/references/layer-roles.md?raw'
import auditPlaybook from '@/lib/agent/skill/references/audit-playbook.md?raw'
import whatifPlaybook from '@/lib/agent/skill/references/whatif-playbook.md?raw'
import checkGapSweep from '@/lib/agent/skill/references/check-gap-sweep.md?raw'
import checkJargonLint from '@/lib/agent/skill/references/check-jargon-lint.md?raw'
import checkChannelConflict from '@/lib/agent/skill/references/check-channel-conflict.md?raw'
import checkKpiAlignment from '@/lib/agent/skill/references/check-kpi-alignment.md?raw'
import checkPerceivedOwner from '@/lib/agent/skill/references/check-perceived-owner.md?raw'
import checkValueLedger from '@/lib/agent/skill/references/check-value-ledger.md?raw'
import checkFeeVisibility from '@/lib/agent/skill/references/check-fee-visibility.md?raw'
import checkObsoleteSource from '@/lib/agent/skill/references/check-obsolete-source.md?raw'
import slicePlaybook from '@/lib/agent/skill/references/slice-playbook.md?raw'
import sliceTemplates from '@/lib/agent/skill/references/slice-templates.md?raw'

type Client = SupabaseClient<Database>

/**
 * Read tools return COMPACT TEXT, not JSON dumps — the model reads them the
 * way a person skims a grid, and ids ride along in parentheses so every
 * later write can name its target precisely.
 */

/**
 * The same reference files the IDE skills read from disk, served as a tool.
 * One progressive-disclosure mechanism, two consumers: editing a file in
 * the plugin repo upgrades both (vendored here by scripts/sync-agent-skill).
 */
const REFERENCES: Record<string, string> = {
  'canvas-adapter': canvasAdapter,
  'layer-roles': layerRoles,
  'lane-vocabulary': laneVocabulary,
  'elicitation-protocol': elicitationProtocol,
  'cocreate-playbook': cocreatePlaybook,
  'data-model': dataModel,
  'audit-playbook': auditPlaybook,
  'whatif-playbook': whatifPlaybook,
  'check-gap-sweep': checkGapSweep,
  'check-jargon-lint': checkJargonLint,
  'check-channel-conflict': checkChannelConflict,
  'check-kpi-alignment': checkKpiAlignment,
  'check-perceived-owner': checkPerceivedOwner,
  'check-value-ledger': checkValueLedger,
  'check-fee-visibility': checkFeeVisibility,
  'check-obsolete-source': checkObsoleteSource,
  'slice-playbook': slicePlaybook,
  'slice-templates': sliceTemplates,
}

// The names live in `referenceNames.ts` (a leaf module, so specs.ts can
// quote them without this file's ?raw import graph). This record is the
// documents themselves; the init-time check keeps the two in lockstep.
{
  const here = Object.keys(REFERENCES).sort().join(',')
  const published = [...REFERENCE_NAMES].sort().join(',')
  if (here !== published)
    throw new Error(
      'REFERENCES (read.ts) and REFERENCE_NAMES (referenceNames.ts) drifted — add the reference to both.',
    )
}

export function readReference(name: string): string {
  const doc = REFERENCES[name]
  if (doc) return doc
  return `Unknown reference "${name}". Available: ${REFERENCE_NAMES.join(', ')}`
}

export { REFERENCE_NAMES }

export async function listScenarios(client: Client): Promise<string> {
  const { data, error } = await client
    .from('phases')
    .select(
      'id, name, order_position, service_scenarios (id, name, description, order_position)',
    )
    .order('order_position')
  if (error) throw new Error(error.message)

  return formatScenarioList(
    (data ?? []).map((phase) => ({
      id: phase.id,
      name: phase.name,
      scenarios: [...(phase.service_scenarios ?? [])]
        .sort((a, b) => (a.order_position ?? 0) - (b.order_position ?? 0))
        .map((scenario) => ({
          id: scenario.id,
          name: scenario.name,
          description: scenario.description,
        })),
    })),
  )
}

export async function getBlueprint(
  client: Client,
  scenarioId: string,
): Promise<string> {
  const { data, error } = await client
    .from('paths')
    .select(PATH_BLUEPRINT_SELECT)
    .eq('service_scenario_id', scenarioId)
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as RawPath[]
  if (rows.length === 0) return 'No paths in this scenario.'
  return formatBlueprints(rows.map((raw) => normalizeBlueprint(raw)))
}

/**
 * Headless compare. The fetch is here; the serialization lives in
 * `format.ts`, shared with the sample-data reads.
 */
export async function getCompareDiff(
  client: Client,
  scenarioId: string,
  pathIds?: string[],
): Promise<string> {
  const { data, error } = await client
    .from('paths')
    .select(PATH_BLUEPRINT_SELECT)
    .eq('service_scenario_id', scenarioId)
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as RawPath[]
  if (rows.length === 0) return 'No paths in this scenario.'
  return formatCompareDiff(
    rows.map((raw) => normalizeBlueprint(raw)),
    pathIds,
  )
}

export async function getCell(client: Client, cellId: string): Promise<string> {
  const { data, error } = await client
    .from('cells')
    .select(
      'id, content, description, owner, perceived_owner, function, form, value_props, layer_id, step_id, slot_position',
    )
    .eq('id', cellId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return `No cell with id ${cellId}.`
  const fields: Array<[string, unknown]> = [
    ['content', data.content],
    ['summary', data.description],
    ['owner', data.owner],
    ['perceived_owner', data.perceived_owner],
    ['function', data.function],
    ['form', data.form],
    ['value_props', data.value_props ? JSON.stringify(data.value_props) : null],
    ['layer_id', data.layer_id],
    ['step_id', data.step_id],
    ['slot_position', data.slot_position],
  ]
  return formatFields(fields)
}

export async function listSlices(client: Client): Promise<string> {
  const { data, error } = await client
    .from('slices')
    .select('id, title, slice_type')
    .order('slice_type')
  if (error) throw new Error(error.message)
  return formatSliceList(data ?? [])
}

/** The tag vocabulary — read this before writing any owner value. */
export async function listOwnerTags(client: Client): Promise<string> {
  const { data, error } = await client
    .from('cells')
    .select('owner, perceived_owner')
    .or('owner.not.is.null,perceived_owner.not.is.null')
  if (error) throw new Error(error.message)
  return formatOwnerTags(data ?? [])
}

/**
 * What a delete would cost, in the words the confirm dialog uses.
 *
 * The agent cannot delete anything — no delete is on the allow-list, by
 * design — but it was also unable to SAY what a delete would cost, which made
 * "what happens if I remove this path?" a question it had to decline or guess
 * at. The impact RPCs are side-effect-free reads (that is what this branch
 * proves), so answering is free.
 *
 * `readDeletionImpact` is the very function `DeleteStructureDialog` calls, and
 * the facts/warnings/reassurances are rendered VERBATIM. Deliberately not
 * paraphrased: the warning about slices undo cannot restore, and the qualified
 * archive reassurance beside it, were written word by word to not overstate
 * what comes back. An agent rewording them in its own voice is exactly how the
 * "nothing is destroyed" over-promise gets reintroduced on a second surface.
 */
export async function getDeletionImpact(
  client: Client,
  kind: DeletableKind,
  targetId: string,
): Promise<string> {
  const summary = await readDeletionImpact(client, kind, targetId)
  const lines = [
    `Deleting this ${DELETION_NOUNS[kind]} would destroy:`,
    ...summary.facts.map(
      (fact) => `  ${fact.count} ${fact.noun}${fact.count === 1 ? '' : 's'}`,
    ),
  ]
  // Verbatim, one per line, under headings that say which kind of sentence
  // each is — a warning read as a reassurance is the failure mode here.
  if (summary.warnings.length > 0) {
    lines.push('Warnings:', ...summary.warnings.map((line) => `  ${line}`))
  }
  if (summary.reassurances.length > 0) {
    lines.push('What survives:', ...summary.reassurances.map((line) => `  ${line}`))
  }
  lines.push(
    'Relay these sentences as they are. You cannot perform this delete — only the human can, in the desktop app\'s confirm dialog, by typing the name.',
  )
  return lines.join('\n')
}
