import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  addLane,
  addStep,
  createPath,
  createPhase,
  createScenario,
  duplicatePath,
  duplicateScenario,
  renamePath,
  setCellDependency,
  upsertCell,
} from '@/lib/authoringRpc'
import {
  createSlice,
  replaceSlides,
  updateSliceMeta,
} from '@/lib/sliceMutations'
import {
  createStakeholder,
  updateStakeholder,
} from '@/lib/stakeholderMutations'
import {
  addEvidence,
  updateEvidence,
  type EvidenceKind,
} from '@/lib/evidenceMutations'
import type { SliceKind } from '@/lib/sliceValidation'
import { asUpdatedAtToken } from '@/lib/optimisticConcurrency'
import {
  updateCellContent,
  type CellContentUpdate,
} from '@/lib/cellContentMutations'
import { DEFAULT_ENTITY_STATUS, asEntityStatus } from '@/lib/entityStatus'
import { updateCellSpec } from '@/lib/cellSpecMutations'
import {
  cellBudgetKindForLane,
  getCellContentLengthGuidance,
  type CellBudgetKind,
} from '@/lib/cellContentLimits'
import { findingFingerprint } from '@/lib/findingFingerprint'
import {
  recordFinding,
  updateFinding,
  type FindingSeverity,
  type FindingStatus,
} from '@/lib/findingMutations'
import { SCOPE_ALL } from '@/lib/agent/tools/serviceScope'
import { resolveActiveServiceId } from '@/lib/service'
import { SAMPLE_TRIAL_TOOL_NAMES } from '@/lib/agent/tools/specs'
import type { AgentSearchIndex } from '@/deploymentConfig'
import { runTool, type ToolContext } from '@/lib/agent/tools/definition'
import { findToolDefinition } from '@/lib/agent/tools/definitions'
import { liveSession, liveUi } from '@/lib/agent/tools/liveContext'

type Client = SupabaseClient<Database>

// Tool specs and rosters live in `specs.ts` (imported directly by their
// consumers — one canonical path); this module owns only dispatch.

// There is no global single-service cache any more: a deployment can hold more
// than one service, so a READ covers every one of them unless the call names
// one, and a WRITE lands on the service the URL slug names.
// `serviceScope.ts` owns both resolutions.

/** Mirrors the DB CHECK constraint so a bad kind fails before the insert. */
const EVIDENCE_KINDS = new Set<string>([
  'interview',
  'survey',
  'analytics',
  'doc',
  'meeting',
  'decision',
  'observation',
  'other',
])

/**
 * The kinds the agent may WRITE — the four ACTOR kinds, not the whole CHECK.
 * `team` is legal in the column and deliberately absent here: a team is an
 * accountable group, never a party who appears in a lane, and the agent's
 * stakeholder tools exist to name the cast. An existing team row is still
 * editable — `update_stakeholder` carries a kind it was not asked to change
 * straight through rather than validating it.
 */
const AGENT_STAKEHOLDER_KINDS = new Set<string>([
  'recipient',
  'staff',
  'partner',
  'provider',
])

function s(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function need(args: Record<string, unknown>, key: string): string {
  const value = s(args, key)
  if (!value) throw new Error(`Missing required argument "${key}".`)
  return value
}

/**
 * Which cell-text budget a write is measured against, from the lane the
 * cell sits on. Falls through to prose when the lane cannot be read — the
 * same fallback the panel uses when it cannot see a role.
 */
async function laneBudgetKind(
  client: Client,
  laneId: string | null | undefined,
): Promise<CellBudgetKind> {
  if (!laneId) return cellBudgetKindForLane(null)
  const { data, error } = await client
    .from('lanes')
    .select('name, lane_role')
    .eq('id', laneId)
    .maybeSingle()
  if (error || !data) return cellBudgetKindForLane(null)
  return cellBudgetKindForLane({ name: data.name, role: data.lane_role })
}

/**
 * What one session may reach that another may not.
 *
 * Only ranked search needs this today, and it needs it because the capability
 * is not a property of the deployment alone: it is the deployment's index list
 * MET BY the person's own provider key, which lives in their browser and is
 * known only to the caller. So the loop resolves it once per send and hands it
 * down, rather than this module reaching for a key.
 */
export type DispatchContext = {
  /**
   * The index this person's key can embed against, and that key — or `null`
   * for a keyword-and-structural run. Absent means the same as `null`.
   */
  meaning?: { index: AgentSearchIndex; apiKey: string } | null
  /**
   * The run's abort signal. Pressing Stop must reach a call that is waiting
   * on somebody else's network, not just the gap between calls.
   */
  signal?: AbortSignal
}

/**
 * The context a defined tool runs in, built from what the dispatcher already
 * holds. The scope is the whole deployment — the default every read has
 * today, until a session carries the resolved active service and hands it
 * down; the UI and the session are the live ones. A test builds its own.
 */
function toolContext(
  client: Client | null,
  agentSessionId: string,
  context: DispatchContext,
): ToolContext {
  return {
    client,
    scope: SCOPE_ALL,
    session: liveSession(agentSessionId),
    ui: liveUi,
    meaning: context.meaning ?? null,
    signal: context.signal,
  }
}

/**
 * Execute one tool call. Returns the text the model sees. Writes are
 * attributed to the agent session for the ledger's ✦ badge, and the query
 * cache is invalidated so the canvas repaints live.
 */
export async function dispatchTool(
  client: Client | null,
  agentSessionId: string,
  name: string,
  args: Record<string, unknown>,
  context: DispatchContext = {},
): Promise<string> {
  // A tool that is a definition runs from it, whichever mode the session is
  // in — the definition branches on `ctx.client` itself. The write switch
  // below shrinks as tools move; a name found here never reaches it. The one
  // exception is a definition the no-database trial does not offer: it falls
  // through to the trial's refusal rather than running with no client.
  const definition = findToolDefinition(name)
  if (definition && (client !== null || definition.availability.sample)) {
    return runTool(definition, args, toolContext(client, agentSessionId, context))
  }
  // No-database trial: whatever is not a definition the trial offers is a
  // name the trial cannot answer — say so plainly.
  if (client === null) return sampleRefusal(name)

  // Everything below writes, attributed to the session the way a defined
  // tool's `ctx.session.attributed` is — the same code, because it is.
  return liveSession(agentSessionId).attributed(async () => {
    switch (name) {
      case 'create_step': {
        const at = typeof args.at_position === 'number' ? args.at_position : undefined
        const id = await addStep(client, {
          pathId: need(args, 'path_id'),
          name: need(args, 'name'),
          atPosition: at,
        })
        return `Added step (${id}).`
      }
      case 'create_lane': {
        await addLane(client, {
          scenarioId: need(args, 'scenario_id'),
          name: need(args, 'name'),
          laneRole: s(args, 'lane_role') ?? null,
          atPosition: typeof args.at_position === 'number' ? args.at_position : undefined,
        })
        return 'Added lane to every path of the scenario. Re-read the blueprint for the new lane ids.'
      }
      case 'upsert_cell': {
        const laneId = need(args, 'lane_id')
        const stepId = need(args, 'step_id')
        // Occupancy guard: the RPC upserts, so a second call on the same
        // slot would silently OVERWRITE the cell. Creation tool means creation
        // only; edits go through update_cell, and being told so is a better
        // answer than a quiet update.
        //
        // It is no longer the safety. This used to be the only thing standing
        // between the agent and a recorded revert that deleted a cell the
        // author already had — a read followed by a write, holding nothing,
        // and remembered per caller. `upsert_cell` now reports which half it
        // took and the ledger branches on that, so this guard is the error
        // message and not the guarantee.
        const { data: occupied, error: occupiedError } = await client
          .from('cells')
          .select('id')
          .eq('lane_id', laneId)
          .eq('step_id', stepId)
          .or('position.is.null,position.eq.0')
          .limit(1)
        if (occupiedError) throw new Error(occupiedError.message)
        if (occupied && occupied.length > 0)
          throw new Error(
            `A cell already exists at that slot (${occupied[0].id}) — upsert_cell only creates. Use update_cell to edit the existing cell.`,
          )
        const newContent = need(args, 'content')
        // Advice, not a gate. The budget is a judgement about how much copy
        // looks right in a card, and the canvas clamps its preview to a fixed
        // face either way, so long text is written and reported rather than
        // thrown away — see `cellContentLimits`. Same function, same
        // thresholds as the note under the person's field.
        const lengthGuidance = getCellContentLengthGuidance(
          newContent,
          await laneBudgetKind(client, laneId),
        )
        const written = await upsertCell(client, {
          pathId: need(args, 'path_id'),
          laneId,
          stepId,
          content: newContent,
        })
        // Which half the upsert took is said out loud. The guard above means
        // an update should be unreachable; if the race that guard cannot close
        // happens anyway, a model told "created" goes on believing it made a
        // cell it in fact wrote over.
        const outcome = written.inserted
          ? `Created cell (${written.id}).`
          : `That slot was already filled; the existing cell (${written.id}) was updated in place.`
        return `${outcome}${lengthGuidance.message ? ` ${lengthGuidance.message}` : ''}`
      }
      case 'update_cell': {
        // ONE tool over two wrappers, because a cell is one thing to the
        // person editing it. The split existed for the mutation layer's
        // benefit — `updateCellContent` and `updateCellSpec` capture separate
        // inverses, and the ledger wants them separate — but an agent asked to
        // "say what this step does and who it is for" had to know that
        // `function` lives behind a different tool from `content`, and pick.
        // Nothing about the cell justified the choice.
        const cellId = need(args, 'cell_id')
        const { data, error } = await client
          .from('cells')
          .select('content, summary, owner, perceived_owner, status, function, form, value_props, lane_id')
          .eq('id', cellId)
          .maybeSingle()
        if (error) throw new Error(error.message)
        if (!data) throw new Error(`No cell with id ${cellId}.`)

        const touchesText =
          s(args, 'content') !== undefined ||
          s(args, 'summary') !== undefined ||
          s(args, 'owner') !== undefined ||
          s(args, 'perceived_owner') !== undefined
        const touchesSpec =
          s(args, 'function') !== undefined ||
          s(args, 'form') !== undefined ||
          Array.isArray(args.value_props)
        // Refused rather than treated as a no-op: a call naming no field is a
        // call whose author believed they were changing something.
        if (!touchesText && !touchesSpec) {
          throw new Error(
            'Name at least one field to change: content, summary, owner, perceived_owner, function, form or value_props.',
          )
        }

        const done: string[] = []
        const notes: string[] = []

        if (touchesText) {
          const nextContent = s(args, 'content')
          const lengthGuidance =
            nextContent === undefined
              ? null
              : getCellContentLengthGuidance(
                  nextContent,
                  await laneBudgetKind(client, data.lane_id),
                )
          const previous: CellContentUpdate = {
            content: data.content ?? '',
            summary: data.summary ?? '',
            owner: data.owner ?? '',
            perceivedOwner: data.perceived_owner ?? '',
            // Read and handed straight back. The tool takes no
            // `status` argument, so this write must not move one: an edit to
            // a cell's wording that quietly marked a proposed surface live
            // would be the sentence the agent never said out loud. Widening
            // the tool is a separate decision about the agent's surface.
            status: asEntityStatus(data.status) ?? DEFAULT_ENTITY_STATUS,
          }
          await updateCellContent(
            client,
            cellId,
            {
              content: nextContent ?? previous.content,
              summary: s(args, 'summary') ?? previous.summary,
              owner: s(args, 'owner') ?? previous.owner,
              perceivedOwner: s(args, 'perceived_owner') ?? previous.perceivedOwner,
              status: previous.status,
            },
            previous,
          )
          done.push('text')
          if (lengthGuidance?.message) notes.push(lengthGuidance.message)
        }

        if (touchesSpec) {
          const prevProps = Array.isArray(data.value_props)
            ? (data.value_props as Array<{ for?: string; value?: string }>).map(
                (entry) => ({ for: entry.for ?? '', value: entry.value ?? '' }),
              )
            : []
          const previous = {
            function: data.function ?? '',
            form: data.form ?? '',
            valueProps: prevProps,
          }
          const nextProps = Array.isArray(args.value_props)
            ? (args.value_props as Array<{ for?: string; value?: string }>).map(
                (entry) => ({ for: entry.for ?? '', value: entry.value ?? '' }),
              )
            : previous.valueProps
          await updateCellSpec(
            client,
            cellId,
            {
              function: s(args, 'function') ?? previous.function,
              form: s(args, 'form') ?? previous.form,
              valueProps: nextProps,
            },
            previous,
          )
          done.push('spec')
        }

        // Two ledger entries when both halves moved, and the reply says so —
        // the change sheet will show two rows, and a reply claiming one write
        // would leave the reader counting.
        const reply =
          done.length === 2
            ? 'Cell updated (text and spec — two entries in the change list).'
            : `Cell ${done[0]} updated.`
        return notes.length ? `${reply} ${notes.join(' ')}` : reply
      }
      case 'create_cell_dependency': {
        const kind = args.kind === 'enables' ? 'enables' : 'leads_to'
        const written = await setCellDependency(client, {
          sourceCellId: need(args, 'source_cell_id'),
          targetCellId: need(args, 'target_cell_id'),
          kind,
          // The tool says `label` and the column says `note`. The word a model
          // is asked for is not the schema's — renaming it would move a
          // published surface for a spelling — so the mapping happens here,
          // which is where every other tool-to-column difference does.
          //
          // It used to land in `name`, the badge column, which nothing draws
          // and no reader sees. The spelling stays put and the destination
          // moves: a downstream skill pinned to an older release goes on
          // sending `label` and its sentence now arrives somewhere it is read.
          note: s(args, 'label') ?? null,
        })
        // Which half the upsert took is said out loud. The tool is named for
        // creating, and a model told "set" after landing on an edge that
        // already existed goes on believing it made one — which is how the
        // same pair gets connected again on the next pass.
        return written.inserted
          ? `Dependency created (${written.id}).`
          : `That pair was already connected; the existing dependency (${written.id}) was updated in place.`
      }
      case 'update_path': {
        await renamePath(client, {
          pathId: need(args, 'path_id'),
          name: need(args, 'name'),
        })
        return 'Path renamed.'
      }
      case 'create_stakeholder': {
        const kind = need(args, 'kind')
        if (!AGENT_STAKEHOLDER_KINDS.has(kind))
          throw new Error(
            `kind must be one of ${[...AGENT_STAKEHOLDER_KINDS].join(', ')}.`,
          )
        const id = await createStakeholder(client, {
          name: need(args, 'name'),
          kind,
          summary: s(args, 'summary') ?? null,
          aliases: Array.isArray(args.aliases)
            ? args.aliases.filter(
                (value): value is string => typeof value === 'string',
              )
            : [],
        })
        return `Added stakeholder (${id}).`
      }
      case 'update_stakeholder': {
        const stakeholderId = need(args, 'stakeholder_id')
        // Read-modify-write, not a patch: the row is the unit that gets
        // reverted, so the captured `previous` has to be the whole of it.
        const { data: current, error } = await client
          .from('stakeholders')
          .select('name, kind, summary, aliases')
          .eq('id', stakeholderId)
          .maybeSingle()
        if (error) throw new Error(error.message)
        if (!current) throw new Error('No stakeholder with that id.')
        const previous = {
          name: current.name,
          kind: current.kind,
          summary: current.summary,
          aliases: current.aliases ?? [],
        }
        const named = s(args, 'kind')
        if (named && !AGENT_STAKEHOLDER_KINDS.has(named))
          throw new Error(
            `kind must be one of ${[...AGENT_STAKEHOLDER_KINDS].join(', ')}.`,
          )
        const kind = named ?? previous.kind
        await updateStakeholder(
          client,
          stakeholderId,
          {
            name: s(args, 'name') ?? previous.name,
            kind,
            summary: s(args, 'summary') ?? previous.summary,
            aliases: Array.isArray(args.aliases)
              ? args.aliases.filter(
                  (value): value is string => typeof value === 'string',
                )
              : previous.aliases,
          },
          previous,
        )
        return 'Stakeholder updated.'
      }
      case 'create_phase': {
        const id = await createPhase(client, {
          serviceId: await resolveActiveServiceId(client),
          name: need(args, 'name'),
          summary: s(args, 'summary') ?? null,
        })
        return `Created phase (${id}).`
      }
      case 'create_scenario': {
        const created = await createScenario(client, {
          phaseId: need(args, 'phase_id'),
          name: need(args, 'name'),
          pathName: s(args, 'path_name'),
          stepCount:
            typeof args.step_count === 'number' ? args.step_count : undefined,
          laneSourcePathId: s(args, 'lane_source_path_id') ?? null,
        })
        return `Created scenario. ${JSON.stringify(created)} — re-read the blueprint for its steps and lanes.`
      }
      case 'create_path': {
        const id = await createPath(client, {
          scenarioId: need(args, 'scenario_id'),
          name: need(args, 'name'),
          pathKind: s(args, 'kind'),
          laneSourcePathId: s(args, 'lane_source_path_id') ?? null,
        })
        return `Created path (${id}).`
      }
      case 'duplicate_path': {
        const id = await duplicatePath(client, {
          sourcePathId: need(args, 'source_path_id'),
          name: need(args, 'name'),
          pathKind: s(args, 'kind'),
          copyCells: args.copy_cells !== false,
        })
        return `Duplicated path (${id}).`
      }
      case 'duplicate_scenario': {
        const id = await duplicateScenario(client, {
          sourceScenarioId: need(args, 'source_scenario_id'),
          name: need(args, 'name'),
        })
        return `Duplicated the blueprint (${id}). Re-read it for the copy's own path, lane, step and cell ids — none of them are the source's, and the copied cells have no cell_key.`
      }
      case 'create_slice': {
        const cellIds = Array.isArray(args.cell_ids)
          ? args.cell_ids.filter(
              (value): value is string => typeof value === 'string',
            )
          : []
        if (cellIds.length === 0)
          throw new Error('cell_ids must be a non-empty array of existing cell ids.')
        const slice = await createSlice(client, {
          serviceId: await resolveActiveServiceId(client),
          title: need(args, 'title'),
          // `description` is what the schema advertised while the handler
          // read `summary`, so a model taught the old wire is still
          // holding the word that used to be dropped.
          summary: s(args, 'summary') ?? s(args, 'description') ?? '',
          sliceKind: need(args, 'kind') as SliceKind,
          actor: s(args, 'actor') ?? '',
          cellIds,
        })
        return `Created slice "${slice.title}" (${slice.id}) with one slide per cell — replace_slides regroups them.`
      }
      case 'update_slice': {
        const sliceId = need(args, 'slice_id')
        const { data, error } = await client
          .from('slices')
          .select('title, summary, kind, actor, authorship, updated_at')
          .eq('id', sliceId)
          .maybeSingle()
        if (error) throw new Error(error.message)
        if (!data) throw new Error(`No slice with id ${sliceId}.`)
        const outcome = await updateSliceMeta(client, sliceId, asUpdatedAtToken(data.updated_at), {
          title: s(args, 'title') ?? data.title,
          summary: s(args, 'summary') ?? s(args, 'description') ?? data.summary ?? '',
          sliceKind: (s(args, 'kind') ?? data.kind) as SliceKind,
          actor: s(args, 'actor') ?? data.actor ?? '',
          authorship: data.authorship,
        })
        if (outcome.status === 'conflict')
          throw new Error('The slice changed since you read it — re-read and retry.')
        return 'Slice updated.'
      }
      case 'replace_slides': {
        const sliceId = need(args, 'slice_id')
        const rawSlides = Array.isArray(args.slides) ? args.slides : []
        if (rawSlides.length === 0)
          throw new Error('slides must be a non-empty array.')
        const slides = (rawSlides as Array<Record<string, unknown>>).map(
          (slide) => ({
            cells: Array.isArray(slide.cells)
              ? slide.cells.filter(
                  (value): value is string => typeof value === 'string',
                )
              : [],
            title: typeof slide.title === 'string' ? slide.title : '',
            caption:
              typeof slide.caption === 'string' ? slide.caption : '',
          }),
        )
        await replaceSlides(client, sliceId, slides)
        return `Replaced the slice's slides (${slides.length}).`
      }
      case 'create_evidence': {
        const kind = need(args, 'kind')
        if (!EVIDENCE_KINDS.has(kind)) {
          throw new Error(
            `kind must be one of ${[...EVIDENCE_KINDS].join(', ')} — the DB CHECK constraint rejects anything else.`,
          )
        }
        const cellId = need(args, 'cell_id')
        // Same wrapper, same service resolution and the same documented
        // cell_key placeholder the cell panel uses — so an agent-added source
        // lands in the session ledger and can be reverted exactly like a
        // human-added one.
        const id = await addEvidence(client, {
          serviceId: await resolveActiveServiceId(client),
          cellId,
          cellKey: cellId,
          kind: kind as EvidenceKind,
          title: need(args, 'title'),
          note: s(args, 'note') ?? null,
        })
        return `Evidence added (${id}).`
      }
      case 'update_evidence': {
        const kind = s(args, 'kind')
        if (kind && !EVIDENCE_KINDS.has(kind)) {
          throw new Error(
            `kind must be one of ${[...EVIDENCE_KINDS].join(', ')} — the DB CHECK constraint rejects anything else.`,
          )
        }
        await updateEvidence(client, need(args, 'evidence_id'), {
          kind: kind as EvidenceKind | undefined,
          title: s(args, 'title'),
          note: s(args, 'note'),
        })
        return 'Evidence updated.'
      }
      case 'create_finding': {
        const source = args.source === 'whatif' ? 'whatif' : 'audit'
        const checkKey = need(args, 'check_key')
        const severityArg = s(args, 'severity')
        if (severityArg !== 'info' && severityArg !== 'warn' && severityArg !== 'critical')
          throw new Error('severity must be info, warn, or critical.')
        const severity: FindingSeverity = severityArg
        const summary = need(args, 'summary')
        const cellIds = Array.isArray(args.cell_ids)
          ? args.cell_ids.filter(
              (value): value is string => typeof value === 'string',
            )
          : []
        const scope = s(args, 'scope')
        if (cellIds.length === 0 && !scope)
          throw new Error('A zero-cell finding needs a scope (e.g. "scenario:Intake Call").')
        const runId = s(args, 'run_id') ?? crypto.randomUUID()
        const fingerprint = await findingFingerprint(checkKey, cellIds, scope)
        // The dedupe branch and both its writes live in findingMutations, so
        // every one of them reaches the session ledger. The tool's job here is
        // the sentence the model reads back, which differs per outcome.
        const outcome = await recordFinding(client, {
          serviceId: await resolveActiveServiceId(client),
          runId,
          source,
          checkKey,
          severity,
          cellIds,
          summary,
          fingerprint,
        })
        const reuse = `run_id ${runId}; reuse it for the rest of this run.`
        if (outcome.kind === 'deduped')
          return `An open finding already had this fingerprint — updated it in place (dedupe). ${reuse}`
        if (outcome.kind === 'suppressed')
          return `A finding with this fingerprint was dismissed by a human — dismissed stays dismissed. Nothing recorded. ${reuse}`
        return `Recorded ${severity} finding for ${checkKey}${outcome.reopened ? ' (a resolved twin existed — this reopens the issue)' : ''}. ${reuse}`
      }
      case 'update_finding': {
        const statusArg = s(args, 'status')
        if (statusArg !== 'open' && statusArg !== 'resolved' && statusArg !== 'dismissed')
          throw new Error('status must be open, resolved, or dismissed.')
        const status: FindingStatus = statusArg
        const findingId = need(args, 'finding_id')
        await updateFinding(client, findingId, { status })
        return `Finding is now ${status}.`
      }
      default:
        return `Tool "${name}" is not on the allow-list. Available tools are fixed; deletes do not exist here — removal is human-only.`
    }
  })
}

/**
 * The trial's refusal. Every read and every navigation is a definition now
 * and decides for itself whether it answers without a database; a name that
 * reaches here in the no-database trial is one the trial does not offer —
 * a write, a desktop control, or a read the bundled sample cannot answer
 * (it is a board, not a deployment: no cast, no provenance, no business
 * model). Saying so is the honest answer; an invented one would teach the
 * model the tables are empty.
 */
function sampleRefusal(name: string): string {
  return `This session is running on the bundled SAMPLE blueprint with no database connected, so "${name}" does not exist here. Available: ${[...SAMPLE_TRIAL_TOOL_NAMES].join(', ')}. Connect a database to author.`
}
