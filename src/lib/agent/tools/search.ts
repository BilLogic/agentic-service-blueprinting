import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { AgentSearchIndex } from '@/deploymentConfig'
import { EmbedQuestionError, embedQuestion } from '@/lib/agent/embedQuestion'
import {
  GRANULARITY_LEVELS,
  formatBlueprintSearch,
  type BlueprintSearchRow,
} from '@/lib/agent/tools/format'
import { SCOPE_ALL, type ServiceScope } from '@/lib/agent/tools/serviceScope'

type Client = SupabaseClient<Database>

/**
 * RANKED retrieval over a deployment's own `search_blueprint` function — for
 * when the caller has WORDS but not a name or an id.
 *
 * ── WHY THIS TOOL IS NOT ALWAYS THERE ─────────────────────────────────────
 *
 * Every other read in this template goes through PostgREST against tables the
 * template's own schema defines, so it works wherever the template does. This
 * one calls a FUNCTION the template's schema does not carry. A deployment that
 * has built ranked search says so on its config (`agent.search.enabled`), and
 * only then is the tool on the agent's roster — `searchPlan.ts` owns that
 * decision and the reasoning behind its three states. Switched off, the tool
 * is ABSENT rather than present and raising `relation does not exist`.
 *
 * ── WHY THE GENERATED TYPES DO NOT KNOW THE FUNCTION ──────────────────────
 *
 * `types/database.ts` is generated from this repository's migration chain, and
 * `search_blueprint` is not in it — a hand-added entry inside the generated
 * block would be dropped by the next `npm run supabase:types`, and the file's
 * own header only promises to preserve the alias section at the bottom. So the
 * call goes through one narrow local signature instead. The cast is confined
 * to {@link searchRpc}: nothing else in this module is loosely typed, and the
 * contract it asserts is written down in the connector doc a deployment reads.
 */

/** The arguments the function takes, as sent on the wire. */
type SearchBlueprintArgs = {
  q: string
  granularity: string[]
  match_count: number
  filter_phase?: string
  filter_scenario?: string
  filter_path_kind?: string
  filter_lane_role?: string
  /**
   * pgvector's own text form, which is `[1,2,3]` — identical to
   * `JSON.stringify` of the array, so the vector is serialized rather than
   * hand-formatted.
   */
  query_embedding?: string
  /**
   * The model the question was embedded with, BY NAME. The function picks its
   * index by this name and raises `embedding model mismatch` when it holds
   * none — a misconfigured index list fails loudly in a deployment's logs
   * instead of quietly scoring one vector space against another.
   */
  embed_model?: string
}

type SearchResponse = {
  data: BlueprintSearchRow[] | null
  error: { message: string } | null
}

/**
 * The one loosely-typed line in this module. See the header for why the
 * generated types cannot carry this function.
 */
function searchRpc(client: Client, args: SearchBlueprintArgs): Promise<SearchResponse> {
  const call = client.rpc as unknown as (
    name: 'search_blueprint',
    args: SearchBlueprintArgs,
  ) => Promise<SearchResponse>
  return call('search_blueprint', args)
}

/** The default rungs a ranked search covers when the caller names none. */
const DEFAULT_GRANULARITY = ['cell']
const DEFAULT_LIMIT = 15
const MAX_LIMIT = 100
/**
 * A floor as well as a cap. `limit: 0` is a number, so it survives the
 * dispatcher's type check and would ask the function for nothing — which comes
 * back as an empty result the model reads as "no such moment". One row is the
 * smallest honest answer to a search.
 */
const MIN_LIMIT = 1

/**
 * `embedding model mismatch` is the function's own refusal when the model
 * named in the call matches no index it holds. It is a CONFIGURATION fault —
 * the deployment listed an index it has not built — and it is matched by text
 * because it arrives as a Postgres exception message, not a code.
 *
 * Treated as a failure of the meaning arm rather than of the search: the
 * keyword and structural arms are unaffected, and a person who asked a
 * question deserves them.
 */
const MODEL_MISMATCH = /embedding model mismatch/i

/**
 * Keep only the rows under the scoped service's phases.
 *
 * The journey is a hard per-service boundary, so a service's rows are exactly
 * those whose phase breadcrumb belongs to it. A deployment's search function
 * takes no service filter, so this narrows its output here instead — meaning
 * results are held to the same scope as every other read. `all`, which
 * includes every single-service deployment, passes straight through.
 *
 * ── WHY A NAME IS NOT ENOUGH, AND WHAT IS DONE ABOUT IT ───────────────────
 *
 * The rows carry a phase NAME, not a phase id, and `phases.name` is not
 * unique across services: two services may each own an "Intake". Placing a
 * row by name alone would hand service A a row belonging to service B, which
 * is the one thing a scoped read must never do. So a name owned by more than
 * one service places nothing — those rows are dropped and COUNTED, and the
 * text says so, because silently dropping them would read as "nothing
 * matched". Narrowing with `phase` or `scenario` is the way out for a caller
 * who hits it.
 *
 * A row with no phase name cannot be placed either, for the same reason. The
 * contract doc requires every row to carry its phase breadcrumb — including a
 * phase's own row, which names itself — precisely so this is reachable only
 * by a deployment whose function breaks that promise.
 */
type ScopedRows = {
  rows: BlueprintSearchRow[]
  /** Rows the function returned that this service could not claim. */
  dropped: number
  /** Of those, the ones no service could claim unambiguously. */
  ambiguous: number
}

async function scopeRows(
  client: Client,
  rows: BlueprintSearchRow[],
  scope: ServiceScope,
): Promise<ScopedRows> {
  if (scope.kind === 'all') return { rows, dropped: 0, ambiguous: 0 }
  const { data, error } = await client.from('phases').select('name, service_id')
  if (error) throw new Error(error.message)
  const owners = new Map<string, Set<string>>()
  for (const phase of data ?? []) {
    const key = phase.name.toLowerCase()
    const set = owners.get(key) ?? new Set<string>()
    set.add(phase.service_id)
    owners.set(key, set)
  }
  const kept: BlueprintSearchRow[] = []
  let ambiguous = 0
  for (const row of rows) {
    const services = row.phase ? owners.get(row.phase.toLowerCase()) : undefined
    if (!services || services.size === 0) continue
    if (services.size > 1) {
      ambiguous += 1
      continue
    }
    if (services.has(scope.serviceId)) kept.push(row)
  }
  return { rows: kept, dropped: rows.length - kept.length, ambiguous }
}

export type BlueprintSearchOptions = {
  query: string
  granularity?: string[]
  phase?: string
  scenario?: string
  pathKind?: string
  laneRole?: string
  limit?: number
  scope?: ServiceScope
  /**
   * The index this person's own key can embed against, with that key — or
   * `null` for a keyword-and-structural run. Never assembled here: the plan
   * comes from `agentSearchPlan`, and the key from the person's browser-held
   * settings, so this module cannot decide to embed with a model the
   * deployment's index would refuse.
   */
  meaning?: { index: AgentSearchIndex; apiKey: string } | null
  signal?: AbortSignal
}

/**
 * Run one ranked search, embedding the question first when this session can.
 *
 * The fallback rule, stated once: a session that was OFFERED meaning matching
 * and cannot get it (a rate limit, an outage, an index the function does not
 * hold) falls back to exactly ONE keyword-and-structural call. Not a retry
 * loop — one call, because the words arm is a real answer and a provider
 * hiccup must not read as an empty blueprint. A session that was never
 * offered meaning matching is not here at all; the tool was left off its
 * roster.
 *
 * Every other database error surfaces, because a broken search must not be
 * reported as a search that found nothing.
 */
export async function searchBlueprint(
  client: Client,
  options: BlueprintSearchOptions,
): Promise<string> {
  const requested = options.granularity?.length
    ? options.granularity
    : DEFAULT_GRANULARITY
  // Checked before anything is embedded or read, the way `list_blueprint`
  // checks its own: a rung outside the vocabulary reaches a deployment's
  // function as a word it does not know, comes back empty, and reads as "no
  // row uses those words" — an absence the caller then reports.
  const unknown = requested.filter(
    (level) => !GRANULARITY_LEVELS.includes(level as never),
  )
  if (unknown.length > 0)
    throw new Error(
      `Unknown granularity: ${unknown.join(', ')}. Use one or more of ${GRANULARITY_LEVELS.join(', ')}.`,
    )
  const base: SearchBlueprintArgs = {
    q: options.query,
    granularity: requested,
    match_count: Math.max(
      MIN_LIMIT,
      Math.min(Math.trunc(options.limit ?? DEFAULT_LIMIT), MAX_LIMIT),
    ),
    ...(options.phase ? { filter_phase: options.phase } : {}),
    ...(options.scenario ? { filter_scenario: options.scenario } : {}),
    ...(options.pathKind ? { filter_path_kind: options.pathKind } : {}),
    ...(options.laneRole ? { filter_lane_role: options.laneRole } : {}),
  }

  let embedding: string | undefined
  let embedModel: string | undefined
  if (options.meaning) {
    try {
      const vector = await embedQuestion({
        question: options.query,
        index: options.meaning.index,
        apiKey: options.meaning.apiKey,
        signal: options.signal,
      })
      embedding = JSON.stringify(vector)
      embedModel = options.meaning.index.model
    } catch (error) {
      // A failed embed is not a failed search. Anything that is not the embed
      // step failing still surfaces.
      if (!(error instanceof EmbedQuestionError)) throw error
    }
  }

  const meaningAttempted = embedding !== undefined
  const response = await searchRpc(
    client,
    meaningAttempted
      ? { ...base, query_embedding: embedding, embed_model: embedModel }
      : base,
  )

  let rows = response.data
  let meaningRan = meaningAttempted
  if (response.error) {
    if (!(meaningAttempted && MODEL_MISMATCH.test(response.error.message)))
      throw new Error(response.error.message)
    // The deployment listed an index its function does not hold. One keyword
    // and structural call, then the text says meaning did not run.
    const retry = await searchRpc(client, base)
    if (retry.error) throw new Error(retry.error.message)
    rows = retry.data
    meaningRan = false
  }

  const scope = options.scope ?? SCOPE_ALL
  const returned = rows ?? []
  const scoped = await scopeRows(client, returned, scope)
  return formatBlueprintSearch(scoped.rows, options.query, {
    meaning: meaningRan,
    // The total stays the function's own — the corpus-wide count is what the
    // header promises, and rewriting it to the in-scope count would report a
    // clipped top-k as the whole matching set.
    total: Number(returned[0]?.total_matched ?? returned.length),
    ...(scope.kind === 'service'
      ? {
          scope: {
            name: scope.serviceName,
            dropped: scoped.dropped,
            ambiguous: scoped.ambiguous,
          },
        }
      : {}),
  })
}
