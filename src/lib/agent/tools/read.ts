import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  formatBlueprints,
  formatCellDependencies,
  formatCompareDiff,
  formatEvidenceDetail,
  formatEvidenceList,
  formatFields,
  formatLaneVocabulary,
  formatOwnerTags,
  formatScenarioList,
  formatSliceList,
  formatStakeholderList,
} from '@/lib/agent/tools/format'
import { normalizeBlueprint, type RawPath } from '@/lib/normalizeBlueprint'
import { PATH_BLUEPRINT_SELECT } from '@/lib/workflowQueries'
import {
  DELETION_NOUNS,
  readDeletionImpact,
  type DeletableKind,
} from '@/lib/deletionSafety'
import { agentSessionsSnapshot } from '@/lib/agent/sessions'
import { loadPersistedEvents } from '@/lib/agent/persistence'
import { REFERENCE_NAMES } from '@/lib/agent/tools/referenceNames'
import {
  SCOPE_ALL,
  serviceStakeholderIds,
  type ServiceScope,
} from '@/lib/agent/tools/serviceScope'
import canvasAdapter from '@/lib/agent/skill/references/canvas-adapter.md?raw'
import dataModel from '@/lib/agent/skill/references/data-model.md?raw'
import elicitationProtocol from '@/lib/agent/skill/references/elicitation-protocol.md?raw'
import cocreatePlaybook from '@/lib/agent/skill/references/cocreate-playbook.md?raw'
import laneVocabulary from '@/lib/agent/skill/references/lane-vocabulary.md?raw'
import laneRoles from '@/lib/agent/skill/references/lane-roles.md?raw'
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
 * Every id on this board is a UUID, and any id that reaches a PostgREST filter
 * STRING has to be checked against this first. The typed builder escapes what
 * it is given; `.or()` does not — it takes raw filter grammar, where a comma
 * starts another clause.
 */
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  'lane-roles': laneRoles,
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

/**
 * The orientation read — every phase and its scenarios.
 *
 * The journey is the HARD per-service boundary: a service's rows are exactly
 * those under its phases, so scoping this read is one `service_id` filter and
 * needs no join. `all` — which is what a single-service deployment always
 * resolves to — skips the filter entirely and is byte-for-byte the unscoped
 * read this was before multi-service.
 */
export async function listScenarios(
  client: Client,
  scope: ServiceScope = SCOPE_ALL,
): Promise<string> {
  let query = client
    .from('phases')
    .select(
      'id, name, position, scenarios (id, name, summary, position)',
    )
    .order('position')
  if (scope.kind === 'service') query = query.eq('service_id', scope.serviceId)
  const { data, error } = await query
  if (error) throw new Error(error.message)

  return formatScenarioList(
    (data ?? []).map((phase) => ({
      id: phase.id,
      name: phase.name,
      scenarios: [...(phase.scenarios ?? [])]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((scenario) => ({
          id: scenario.id,
          name: scenario.name,
          summary: scenario.summary,
        })),
    })),
  )
}

export function listReferences(): string {
  return REFERENCE_NAMES.map((name) => `- ${name}`).join('\n')
}

/**
 * The lane vocabulary ACTUALLY in use, distinct from the lane-roles
 * reference doc, which says what the roles mean rather than which ones this
 * blueprint uses. Reuse a label before minting one — same discipline
 * list_owner_tags enforces for owner tags.
 */
export async function listLanes(client: Client): Promise<string> {
  const { data, error } = await client
    .from('lanes')
    .select('name, lane_role')
    .order('position')
  if (error) throw new Error(error.message)
  return formatLaneVocabulary(data ?? [])
}

/**
 * The cast list.
 *
 * The registry is the answer to "who is this lane for?" and "who receives
 * this value?" — one list, with the other spellings each name has been
 * written as. Read it before inventing an audience: `tutor` and `Regular
 * Tutor` are one person, and the aliases column is where that is recorded.
 *
 * The cast is a DEPLOYMENT-LEVEL catalog (ADR 0003) — no stakeholder carries a
 * `service_id`. Scoped to one service, membership is IMPLICIT and derived by
 * JOIN: the actors that service's lanes actually pick
 * (`serviceStakeholderIds`), not a `service_id` lookup that does not exist.
 * `all` — every single-service deployment included — returns the whole catalog,
 * which under the shared model is the correct unscoped read.
 */
export async function listStakeholders(
  client: Client,
  scope: ServiceScope = SCOPE_ALL,
): Promise<string> {
  const { data, error } = await client
    .from('stakeholders')
    .select('id, name, kind, summary, aliases')
    .order('kind')
    .order('name')
  if (error) throw new Error(error.message)
  let rows = data ?? []
  if (scope.kind === 'service') {
    const memberIds = await serviceStakeholderIds(client, scope.serviceId)
    rows = rows.filter((row) => memberIds.has(row.id))
    if (rows.length === 0)
      return `No stakeholders are referenced by ${scope.serviceName}'s journey yet. Pass service:"all" for the whole deployment's cast.`
  }
  if (rows.length === 0) return 'No stakeholders registered yet.'
  return formatStakeholderList(rows)
}

/**
 * The arrows, readable on their own. `create_cell_dependency` could write an edge
 * the agent had no way to read back; this is the missing half of that pair.
 * Scope to one cell when you have one — the whole graph is large.
 */
export async function listCellDependencies(
  client: Client,
  cellId?: string,
): Promise<string> {
  let query = client
    .from('cell_dependencies')
    .select('id, source_cell_id, target_cell_id, kind, name')
    .limit(200)
  if (cellId) {
    // Validated before it reaches the filter string. PostgREST parses `.or()`
    // as its own grammar, in which a comma separates clauses — so a cell_id
    // carrying one would append arbitrary extra conditions. The argument comes
    // straight from a model's tool call, which is untrusted input by
    // construction, and the arg helper only checks it is a non-empty string.
    if (!UUID.test(cellId)) {
      throw new Error(`"${cellId}" is not a cell id.`)
    }
    query = query.or(`source_cell_id.eq.${cellId},target_cell_id.eq.${cellId}`)
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return formatCellDependencies(data ?? [], cellId)
}

const EVIDENCE_SELECT =
  'id, cell_id, kind, title, ref, excerpt, observed_at, created_at'

/**
 * Evidence the blueprint's claims rest on. A cell with no evidence is a
 * claim, not a finding — which is a distinction the agent could not make
 * until it could read the table.
 */
export async function listEvidence(
  client: Client,
  cellId?: string,
): Promise<string> {
  let query = client
    .from('evidence')
    .select(EVIDENCE_SELECT)
    .order('created_at', { ascending: false })
    .limit(100)
  if (cellId) query = query.eq('cell_id', cellId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return formatEvidenceList(data ?? [], cellId)
}

/** Named evidence rows in full — excerpt included. */
export async function getEvidence(
  client: Client,
  ids: string[],
): Promise<string> {
  if (ids.length === 0) return 'Pass at least one evidence id.'
  const { data, error } = await client
    .from('evidence')
    .select(EVIDENCE_SELECT)
    .in('id', ids)
  if (error) throw new Error(error.message)
  return formatEvidenceDetail(data ?? [], ids)
}

/**
 * Past conversations on this blueprint. Sourced from the session store the
 * switcher reads, never from `agent_sessions` — see `agentSessionsSnapshot`
 * for why that distinction is load-bearing. It needs no database, which is
 * also why the no-database trial can serve it unchanged.
 *
 * No `search_sessions` companion: the complete list is small enough to
 * return whole, and search exists for when complete is too big.
 */
export function listSessions(currentSessionId: string): string {
  const sessions = agentSessionsSnapshot()
  if (sessions.length === 0) return 'No past sessions.'
  return [...sessions]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((session) => {
      const mine = session.id === currentSessionId ? ' (this session)' : ''
      const edits =
        session.changeCount > 0 ? `, ${session.changeCount} edit(s)` : ''
      return `"${session.title}"${mine} — updated ${session.updatedAt.slice(0, 10)}${edits} (${session.id})`
    })
    .join('\n')
}

/** One past conversation's transcript, oldest turn first. */
export async function getSession(sessionId: string): Promise<string> {
  const known = agentSessionsSnapshot().find(
    (session) => session.id === sessionId,
  )
  const events = await loadPersistedEvents(sessionId)
  if (events === null) {
    return known
      ? `Session "${known.title}" is in the local list but its transcript is not persisted (persistence attaches only when signed in).`
      : `No session with id ${sessionId}.`
  }
  if (events.length === 0) return 'That session has no recorded turns.'
  const lines = events.map((event) => {
    if (event.kind === 'user') return `user: ${event.text}`
    if (event.kind === 'assistant') return `assistant: ${event.text}`
    if (event.kind === 'tool')
      return `tool ${event.name}${event.isError ? ' (error)' : ''}: ${event.summary}`
    return `${event.kind}:`
  })
  const header = known
    ? `Session "${known.title}" (${sessionId}):`
    : `Session ${sessionId}:`
  return [header, ...lines].join('\n')
}

/**
 * The service's business model — one row per service, so there is nothing
 * to list and no id to pass.
 */
export async function getBusinessModel(client: Client): Promise<string> {
  const { data, error } = await client
    .from('business_models')
    .select('pricing, funding, partners, revenue_model, delivery_cost')
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return 'No business model recorded for this service yet.'
  const filled = formatFields([
    ['pricing', data.pricing],
    ['revenue_model', data.revenue_model],
    ['funding', data.funding],
    ['partners', data.partners],
    ['delivery_cost', data.delivery_cost],
  ])
  return filled || 'The business model row exists but is empty.'
}

export async function getBlueprint(
  client: Client,
  scenarioId: string,
): Promise<string> {
  const { data, error } = await client
    .from('paths')
    .select(PATH_BLUEPRINT_SELECT)
    .eq('scenario_id', scenarioId)
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
    .eq('scenario_id', scenarioId)
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
      'id, content, summary, owner, perceived_owner, function, form, value_props, lane_id, step_id, position',
    )
    .eq('id', cellId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return `No cell with id ${cellId}.`
  const fields: Array<[string, unknown]> = [
    ['content', data.content],
    ['summary', data.summary],
    ['owner', data.owner],
    ['perceived_owner', data.perceived_owner],
    ['function', data.function],
    ['form', data.form],
    ['value_props', data.value_props ? JSON.stringify(data.value_props) : null],
    ['lane_id', data.lane_id],
    ['step_id', data.step_id],
    ['position', data.position],
  ]
  return formatFields(fields)
}

export async function listSlices(client: Client): Promise<string> {
  const { data, error } = await client
    .from('slices')
    .select('id, title, kind')
    .order('kind')
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
