import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { normalizeBlueprint, type RawPath } from '@/lib/normalizeBlueprint'
import { PATH_BLUEPRINT_SELECT } from '@/lib/workflowQueries'
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
 * The same reference files the IDE skills read from this repo's skills/ +
 * references/ trees, served as a tool. One progressive-disclosure
 * mechanism, two consumers: editing a file at the canonical path upgrades
 * both (vendored here by scripts/sync-canvas-skills.mjs).
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

  const lines: string[] = []
  for (const phase of data ?? []) {
    lines.push(`Phase "${phase.name}" (${phase.id})`)
    const scenarios = [...(phase.service_scenarios ?? [])].sort(
      (a, b) => (a.order_position ?? 0) - (b.order_position ?? 0),
    )
    for (const scenario of scenarios) {
      lines.push(
        `  Scenario "${scenario.name}" (${scenario.id})${scenario.description ? ` — ${scenario.description}` : ''}`,
      )
    }
  }
  return lines.join('\n') || 'No phases found.'
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

  const sections: string[] = []
  for (const raw of rows) {
    const blueprint = normalizeBlueprint(raw)
    const { path, steps, layers, cells } = blueprint
    const lines: string[] = [
      `Path "${path.name}" (${path.id}, type ${path.path_type})`,
      `Steps: ${steps
        .map((step) => `${step.column_position}. "${step.name}" (${step.id})`)
        .join(' | ')}`,
    ]
    for (const layer of layers) {
      lines.push(
        `Lane "${layer.name}" (${layer.id}${layer.role ? `, role ${layer.role}` : ''}):`,
      )
      const byStep = new Map<string, typeof cells>()
      for (const cell of cells) {
        if (cell.layer_id !== layer.id) continue
        const list = byStep.get(cell.step_id) ?? []
        list.push(cell)
        byStep.set(cell.step_id, list)
      }
      for (const step of steps) {
        for (const cell of byStep.get(step.id) ?? []) {
          lines.push(
            `  [step ${step.column_position}] "${cell.content}" (${cell.id})`,
          )
        }
      }
    }
    sections.push(lines.join('\n'))
  }
  return sections.join('\n\n')
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
  return fields
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join('\n')
}

export async function listSlices(client: Client): Promise<string> {
  const { data, error } = await client
    .from('slices')
    .select('id, title, slice_type')
    .order('slice_type')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return 'No slices yet.'
  return data
    .map((slice) => `"${slice.title}" (${slice.id}, type ${slice.slice_type})`)
    .join('\n')
}

export async function getSlice(client: Client, sliceId: string): Promise<string> {
  const { data, error } = await client
    .from('slices')
    .select(
      'id, title, description, slice_type, actor, origin, updated_at, slice_items(id, position, caption, narrative, cell_ids)',
    )
    .eq('id', sliceId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error(`No slice with id ${sliceId}.`)
  const frames = [...(data.slice_items ?? [])]
    .sort((a, b) => a.position - b.position)
    .map(
      (frame, index) =>
        `frame ${index + 1}: cells [${(frame.cell_ids ?? []).join(', ')}]${frame.caption ? ` caption "${frame.caption}"` : ''}${frame.narrative ? ` narrative "${frame.narrative}"` : ''}`,
    )
  return `slice "${data.title}" (${data.id}) type=${data.slice_type}${data.actor ? ` actor=${data.actor}` : ''}\n${frames.join('\n') || '(no frames)'}`
}

/** The tag vocabulary — read this before writing any owner value. */
export async function listOwnerTags(client: Client): Promise<string> {
  const { data, error } = await client
    .from('cells')
    .select('owner, perceived_owner')
    .or('owner.not.is.null,perceived_owner.not.is.null')
  if (error) throw new Error(error.message)
  const tags = new Set<string>()
  for (const row of data ?? []) {
    if (row.owner) tags.add(row.owner)
    if (row.perceived_owner) tags.add(row.perceived_owner)
  }
  if (tags.size === 0) return 'No owner tags in use yet.'
  return [...tags].sort().join(', ')
}

const FINDINGS_PAGE = 100

/**
 * The capped read carries the TRUE TOTAL (adapter-contract "Read
 * consumers"): PostgREST's count=exact rides the same request, the result
 * names the total, and the model is instructed to answer count questions
 * from it — never from the page. A failed count is absent, never a
 * stand-in: a confident wrong number is worse than no number.
 */
export async function listFindings(
  client: Client,
  statusFilter: string,
): Promise<string> {
  let query = client
    .from('findings')
    .select('id, source, check_name, severity, note, status, cell_ids, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .limit(FINDINGS_PAGE)
  if (statusFilter !== 'all') query = query.eq('status', statusFilter)
  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  if (!data || data.length === 0)
    return statusFilter === 'all'
      ? 'No findings recorded yet.'
      : `No ${statusFilter} findings.`
  const label = statusFilter === 'all' ? 'findings' : `${statusFilter} findings`
  const header =
    typeof count === 'number'
      ? `${count} ${label} total; listing ${Math.min(data.length, count)}. Answer count questions from the TOTAL, not by counting the rows below.`
      : `Listing ${data.length} ${label} (total unavailable — do not state a total).`
  return [
    header,
    ...data.map(
      (row) =>
        `${row.id} [${row.severity}] ${row.check_name} (${row.source}, ${row.status}, ${row.created_at.slice(0, 10)}) cells:${(row.cell_ids ?? []).length}${row.note ? ` — ${row.note}` : ''}`,
    ),
  ].join('\n')
}
