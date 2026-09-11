import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  formatBlueprintList,
  formatBlueprints,
  formatCellDependencies,
  formatCompareDiff,
  formatEvidenceDetail,
  formatEvidenceList,
  formatFields,
  formatLaneVocabulary,
  formatOwnerTags,
  formatResources,
  formatSliceList,
  formatStakeholderList,
  listBlueprintRequest,
  type BlueprintListOptions,
  type GranularityLevel,
  type JourneyTree,
} from '@/lib/agent/tools/format'
import { cellResourcesFromRows } from '@/lib/cellResources'
import { normalizeBlueprint, type RawPath } from '@/lib/normalizeBlueprint'
import { PATH_BLUEPRINT_SELECT } from '@/lib/workflowQueries'
import {
  DELETION_NOUNS,
  readDeletionImpact,
  type DeletableKind,
} from '@/lib/deletionSafety'
import { agentSessionsSnapshot } from '@/lib/agent/sessions'
import { loadPersistedEvents } from '@/lib/agent/persistence'
import { REFERENCE_DOCS } from '@/lib/agent/tools/referenceDocs'
import { REFERENCE_NAMES } from '@/lib/agent/tools/referenceNames'
import {
  SCOPE_ALL,
  serviceStakeholderIds,
  type ServiceScope,
} from '@/lib/agent/tools/serviceScope'

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
 * One progressive-disclosure mechanism, two consumers.
 *
 * WHERE those files come from is a DECLARED FORK SEAM: `referenceDocs.ts`
 * is the only module that names their paths, because a vendored tree and an
 * installed package can never spell the same specifier. Read its header
 * before adding, moving or overriding a document — this file deliberately
 * knows nothing about any of that, and that ignorance is what lets it be
 * shared verbatim.
 *
 * The names live in `referenceNames.ts` (a leaf module, so specs.ts can
 * quote them without the seam's `?raw` import graph). `referenceDocs.ts`
 * holds the documents themselves; the init-time check below keeps the two in
 * lockstep. It is the fastest failure for a reference added on one side and
 * not the other — the throw happens at module init, before any test that
 * touches the tools can get further.
 */
{
  const here = Object.keys(REFERENCE_DOCS).sort().join(',')
  const published = [...REFERENCE_NAMES].sort().join(',')
  if (here !== published)
    throw new Error(
      'REFERENCE_DOCS (referenceDocs.ts) and REFERENCE_NAMES (referenceNames.ts) drifted — add the reference to both.',
    )
}

export function readReference(name: string): string {
  const doc = REFERENCE_DOCS[name]
  if (doc) return doc
  return `Unknown reference "${name}". Available: ${REFERENCE_NAMES.join(', ')}`
}

export { REFERENCE_NAMES }

/**
 * How many rows one PostgREST request asks for. The server answers at most its
 * own `max_rows` whatever is asked, so this is a request and not a promise —
 * `readAll` keeps asking until the exact count says it holds everything.
 */
const PAGE_SIZE = 1000

type Page<T> = PromiseLike<{
  data: T[] | null
  error: { message: string } | null
  count?: number | null
}>

/**
 * Every row a query matches, however many requests that takes.
 *
 * A plain select stops at the server's row cap and hands back what it got as
 * though it were the whole table. For most reads a cap is only a cap, but
 * `list_blueprint` promises a TRUE total, and a total counted off a clipped
 * read is the one wrong answer it exists not to give. So each page asks for the
 * exact count, and the read goes on until it holds that many rows. With no
 * count it stops at the first short page.
 */
async function readAll<T>(
  page: (from: number, to: number) => Page<T>,
): Promise<T[]> {
  const rows: T[] = []
  for (;;) {
    const { data, error, count } = await page(rows.length, rows.length + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const got = data ?? []
    rows.push(...got)
    if (got.length === 0) return rows
    if (typeof count === 'number' ? rows.length >= count : got.length < PAGE_SIZE)
      return rows
  }
}

/** A table read only when one of the requested rungs needs it. */
function readIf<T>(wanted: boolean, read: () => Promise<T[]>): Promise<T[]> {
  return wanted ? read() : Promise.resolve([])
}

/**
 * The journey under a scope — one read per table, and only the tables the
 * requested rungs need.
 *
 * The scope is one column on `phases`. The journey is the HARD per-service
 * boundary, so a service's rows are exactly those under its phases: the walk
 * never descends into a phase the scope left out, and no table below needs a
 * filter of its own. `all` — the default, and what a single-service deployment
 * always resolves to — reads every phase.
 */
async function readJourneyTree(
  client: Client,
  levels: ReadonlySet<GranularityLevel>,
  scope: ServiceScope,
): Promise<JourneyTree> {
  const needs = (...rungs: GranularityLevel[]) => rungs.some((rung) => levels.has(rung))
  const [phases, scenarios, paths, steps, lanes, cells] = await Promise.all([
    readAll((from, to) => {
      let query = client
        .from('phases')
        .select('id, name, summary, position, service_id', { count: 'exact' })
      if (scope.kind === 'service') query = query.eq('service_id', scope.serviceId)
      return query.order('id').range(from, to)
    }),
    readIf(needs('scenario', 'path', 'step', 'lane', 'cell'), () =>
      readAll((from, to) =>
        client
          .from('scenarios')
          .select('id, phase_id, name, summary, position', { count: 'exact' })
          .order('id')
          .range(from, to),
      ),
    ),
    readIf(needs('path', 'step', 'lane', 'cell'), () =>
      readAll((from, to) =>
        client
          .from('paths')
          .select('id, scenario_id, name, summary, kind', { count: 'exact' })
          .order('id')
          .range(from, to),
      ),
    ),
    readIf(needs('step', 'cell'), () =>
      readAll((from, to) =>
        client
          .from('steps')
          .select('id, scenario_id, name, path_steps (path_id, position)', {
            count: 'exact',
          })
          .order('id')
          .range(from, to),
      ),
    ),
    readIf(needs('lane', 'cell'), () =>
      readAll((from, to) =>
        client
          .from('lanes')
          .select('id, path_id, name, lane_role, position', { count: 'exact' })
          .order('id')
          .range(from, to),
      ),
    ),
    readIf(needs('cell'), () =>
      readAll((from, to) =>
        client
          .from('cells')
          .select('id, lane_id, step_id, content, summary, position', {
            count: 'exact',
          })
          .order('id')
          .range(from, to),
      ),
    ),
  ])
  return {
    phases: phases.map((row) => ({
      id: row.id,
      name: row.name,
      summary: row.summary,
      position: row.position,
      serviceId: row.service_id,
    })),
    scenarios: scenarios.map((row) => ({
      id: row.id,
      phaseId: row.phase_id,
      name: row.name,
      summary: row.summary,
      position: row.position,
    })),
    paths: paths.map((row) => ({
      id: row.id,
      scenarioId: row.scenario_id,
      name: row.name,
      summary: row.summary,
      kind: row.kind,
    })),
    steps: steps.map((row) => ({
      id: row.id,
      scenarioId: row.scenario_id,
      name: row.name,
      placements: (row.path_steps ?? []).map((placement) => ({
        pathId: placement.path_id,
        position: placement.position,
      })),
    })),
    lanes: lanes.map((row) => ({
      id: row.id,
      pathId: row.path_id,
      name: row.name,
      role: row.lane_role,
      position: row.position,
    })),
    cells: cells.map((row) => ({
      id: row.id,
      laneId: row.lane_id,
      stepId: row.step_id,
      content: row.content,
      summary: row.summary,
      position: row.position,
    })),
  }
}

/**
 * The COMPLETE set at one or more rungs of the journey walk — phase, scenario,
 * path, step, lane, cell — with ids, in the order a person reads the board.
 *
 * `list_`, not `search_`: no query, no ranking, and no truncation past the
 * caller's own limit, with the true total in the header so a clipped list says
 * it was clipped. It reads the tables the board already reads, over plain
 * PostgREST; the walk and the text live in `format.ts`, where the no-database
 * twin shares them. `list_scenarios` is this read at ['phase', 'scenario'].
 *
 * The call is checked before anything is read, so a word outside a vocabulary
 * costs no round trip.
 */
export async function listBlueprint(
  client: Client,
  options: BlueprintListOptions & { scope?: ServiceScope },
): Promise<string> {
  const request = listBlueprintRequest(options)
  const tree = await readJourneyTree(client, request.levels, options.scope ?? SCOPE_ALL)
  return formatBlueprintList(tree, request)
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
 * written as. Read it before inventing an audience: `owner` and `Blueprint
 * owner` are one person, and the aliases column is where that is recorded.
 *
 * The cast is a DEPLOYMENT-LEVEL catalog, because a service owns its journey
 * and shares the catalog — no stakeholder carries a `service_id`. Scoped to
 * one service, membership is IMPLICIT and derived by JOIN: the actors that
 * service's lanes actually pick (`serviceStakeholderIds`), not a `service_id`
 * lookup that does not exist. `all` — the default, and every single-service
 * deployment — returns the whole catalog, which under the shared model is the
 * correct unscoped read.
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
  'id, cell_id, kind, title, note, observed_at, created_at'

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

/** Named evidence rows in full — the note included. */
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

/**
 * One cell in full, with what it points at.
 *
 * The resources ride in the cell's own read because they are the cell's rows:
 * the panel shows them under the cell, the grid query embeds them, and an
 * agent asked "where does this moment link to?" had no read that answered.
 */
export async function getCell(client: Client, cellId: string): Promise<string> {
  const { data, error } = await client
    .from('cells')
    .select(
      'id, content, summary, owner, perceived_owner, function, form, value_props, lane_id, step_id, position, resources!resources_cell_id_fkey (id, position, kind, name, url, cell_touchpoint_id, featured)',
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
    ['resources', formatResources(cellResourcesFromRows(data.resources))],
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
  scopeId?: string,
): Promise<string> {
  const summary = await readDeletionImpact(client, kind, targetId, scopeId)
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
