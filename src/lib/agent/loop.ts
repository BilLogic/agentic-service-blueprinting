import type { SupabaseClient } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { errorMessage } from '@/lib/utils'
import type { Database } from '@/types/database'
import { anthropicAdapter } from '@/lib/agent/providers/anthropic'
import { googleAdapter } from '@/lib/agent/providers/google'
import { openaiAdapter } from '@/lib/agent/providers/openai'
import {
  ProviderError,
  type AgentMessage,
  type AgentProviderAdapter,
  type AgentToolCallPart,
  type ChatInput,
  type ChatResult,
} from '@/lib/agent/providers/provider'
import { dispatchTool, type DispatchContext } from '@/lib/agent/tools/registry'
import type { OfflineBoard } from '@/data/blueprintFallbacks'
import { agentSearchPlan } from '@/lib/agent/searchPlan'
import { toolSpec } from '@/lib/agent/tools/definition'
import { findToolDefinition } from '@/lib/agent/tools/definitions'
import { sessionRoster, toolEnabled } from '@/lib/agent/tools/roster'
import { UI_SURFACE_READ_TOOLS } from '@/lib/agent/tools/definitions/ui'
import {
  MOBILE_SHELL_REFUSAL,
  NO_SEARCH_REFUSAL,
  SAMPLE_TRIAL_REFUSAL,
  VIEW_ONLY_REFUSAL,
  BATCH_LIMIT_REFUSAL,
  BATCH_PAUSED_STATUS,
  REPEAT_READ_SUPPRESSED,
  WRITE_BATCH_LIMIT,
  noSuchToolRefusal,
  repeatReadRefusal,
} from '@/lib/agent/tools/refusals'
import { isMobileViewport } from '@/hooks/useMobileShell'
import { collectAgentUiContext } from '@/lib/agent/uiBridge'
import { agentUiCommandMutates } from '@/lib/agent/uiCommands'
import type { AgentSkillCommand } from '@/lib/agent/skills'
import { readReference } from '@/lib/agent/tools/references'
import { agentDoctrine } from '@/lib/agent/doctrine'
import type { ToolDefinition } from '@/lib/agent/tools/definition'
import roleDoc from '@/lib/agent/role.md?raw'
import {
  hasKey,
  modelFor,
  type AgentProviderId,
  type AgentSettings,
} from '@/lib/agent/settings'
import {
  autoNameSession,
  type AgentAttachment,
} from '@/lib/agent/sessions'
import {
  isAgentPersistenceAttached,
  loadPersistedEvents,
  onAgentPersistenceAttached,
  persistEvent,
} from '@/lib/agent/persistence'

type Client = SupabaseClient<Database>

/**
 * Keyed by `AgentProviderId` rather than by `string`, so the map and the list a
 * person chooses from cannot disagree. Keyed by `string` this was typed
 * non-`undefined` for every id — a provider added to `AGENT_PROVIDERS` with no
 * adapter compiled, and the send below dereferenced nothing. The stored id is
 * validated against the same list where it is read (`settings.ts`); this is the
 * other end of that.
 */
const ADAPTERS: Record<AgentProviderId, AgentProviderAdapter> = {
  google: googleAdapter,
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
}

/**
 * The system prompt lives in `role.md`, not in this file: the eval harness
 * runs under Node and needs the SAME text, and a hand-copied duplicate
 * drifts the moment either side is edited. `canvas-adapter.md` already
 * crosses that boundary this way — `?raw` here, `readFileSync` there.
 *
 * The service-designer posture + the canvas
 * adapter (the plugin rulebook's app translation), with the deeper
 * references behind the get_reference tool — the runtime version of the
 * skills' progressive disclosure. Full four-skill routing (loading
 * skills/map or skills/slice SKILL.md per task) layers on here once the
 * sync script vendors them; the adapter is written to make that a drop-in.
 */
const ROLE = roleDoc.trimEnd()

/**
 * The adapter comes out of the same record `get_reference` serves, rendered
 * against the same roster, not from a file import of its own. A deployment
 * that supplies a replacement `canvas-adapter` in `agent.references` means it
 * for the agent, and the prompt is where the adapter binds — in full, every
 * turn; a deployment that narrows its roster narrows the adapter's surface
 * rows with it. The deployment's doctrine, when it has one, follows the
 * adapter: an overlay on the template's prompt, never a replacement of it.
 */
export function buildSystem(
  contextNote: string,
  skills: readonly AgentSkillCommand[],
  roster: readonly ToolDefinition[],
): string {
  const doctrine = agentDoctrine()
  const invoked = skills.filter((skill) => skill.content)
  return [
    ROLE,
    '\n\n--- canvas-adapter reference (FULL text — get_reference serves the other, deeper references) ---\n',
    readReference('canvas-adapter', roster),
    doctrine ? `\n\n--- deployment doctrine ---\n${doctrine}` : '',
    // One block per skill, in the order the message named them; the paragraph that
    // translates a skill for this surface follows them ONCE, because it is
    // the same sentence about every one of them and N copies of it would
    // read as N different instructions.
    ...invoked.map(
      (skill) =>
        `\n\n--- active skill: ${skill.label} (invoked by the user; the same SKILL.md IDE agents follow) ---\n${skill.content}`,
    ),
    invoked.length > 1
      ? `\n\nThe user invoked these skills together, in this order: ${invoked.map((skill) => skill.label).join(' → ')}. Work through them in that order — each one's own flow, in full — rather than blending them into one pass.`
      : '',
    invoked.length > 0
      ? `\n\nYou are the canvas agent, not an IDE agent: skip the skill's file/script/CLI mechanics and act through your tools, translated by the canvas-adapter above. The skill's judgment — what makes a good blueprint/slice, the order of questions, the quality bars — applies in full.`
      : '',
    contextNote ? `\n\n--- current context ---\n${contextNote}` : '',
  ].join('')
}

// ---------------------------------------------------------------------------
// Per-session transcripts — module store so the panel can unmount freely.
// In-memory for the UI prototype; the sessions-persistence unit moves these
// into agent_messages without changing this API.
// ---------------------------------------------------------------------------

export type TranscriptEvent =
  | {
      kind: 'user'
      text: string
      /**
       * Every skill the message invoked, in the order its text named them —
       * a message carries as many as it names, and a turn that reads back
       * with one of them is a turn that reads back wrong.
       */
      skills?: string[]
      /** Attachment label when the message carried one. */
      attachmentLabel?: string
      /** The attachment's model-facing payload (annotation structure) —
       * persisted so a reloaded transcript rebuilds the SAME model turn
       * the live send used, not just the label. */
      attachmentPayload?: string
    }
  | { kind: 'assistant'; text: string }
  | {
      kind: 'tool'
      name: string
      summary: string
      isError: boolean
      /**
       * What the row expands to show. Presentation only — nothing reads
       * these back into the conversation, and they are absent on rows
       * rehydrated from `agent_messages`, which renders the row flat.
       */
      args?: string
      result?: string
    }
  | { kind: 'status'; text: string }

type SessionRun = {
  events: TranscriptEvent[]
  messages: AgentMessage[]
  running: boolean
  controller: AbortController | null
}

const runs = new Map<string, SessionRun>()
const listeners = new Set<() => void>()
let version = 0

function runFor(sessionId: string): SessionRun {
  let run = runs.get(sessionId)
  if (!run) {
    run = { events: [], messages: [], running: false, controller: null }
    runs.set(sessionId, run)
  }
  return run
}

function emit() {
  version += 1
  listeners.forEach((listener) => listener())
}

const snapshots = new Map<string, { version: number; value: SessionRun }>()

export function useAgentRun(sessionId: string): {
  events: TranscriptEvent[]
  running: boolean
} {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => {
      // Stable per-version snapshot so the store never loops the render.
      const cached = snapshots.get(sessionId)
      if (cached && cached.version === version) return cached.value
      const live = runFor(sessionId)
      const value: SessionRun = { ...live, events: [...live.events] }
      snapshots.set(sessionId, { version, value })
      return value
    },
  )
}

export function stopAgent(sessionId: string): void {
  runs.get(sessionId)?.controller?.abort()
}

/** The event minus its view-only fields — what agent_messages stores. */
function persistable(event: TranscriptEvent): TranscriptEvent {
  if (event.kind !== 'tool') return event
  const { args: _args, result: _result, ...rest } = event
  return rest
}

// Per-boot seq base: two tabs on one session each write their own seq
// range instead of both counting 0.. and upserting over each other's
// rows. Chronological ordering holds across tabs to ~ms precision, and
// hydrated history (small legacy seqs) still sorts first.
const SEQ_BASE = Date.now() * 1000

function push(sessionId: string, event: TranscriptEvent): void {
  const run = runFor(sessionId)
  run.events.push(event)
  // Best-effort write-through; a no-op without an authenticated client.
  // The tool row's expandable detail is deliberately NOT persisted: it is a
  // presentation affordance for the live run, and the stored payload shape
  // stays exactly what it has always been.
  persistEvent(sessionId, SEQ_BASE + run.events.length - 1, persistable(event))
  emit()
}

const hydrated = new Set<string>()

/** Sessions whose hydrate fired before persistence attached — replayed on
 *  the attach signal. */
const pendingHydrates = new Set<string>()
onAgentPersistenceAttached(() => {
  const parked = [...pendingHydrates]
  pendingHydrates.clear()
  parked.forEach((sessionId) => void hydrateAgentTranscript(sessionId))
})

// Transcript-hydration-in-flight, per session, so the chat view can show
// skeleton bubbles instead of the "Ready" empty state while a persisted
// conversation is still on the wire.
const hydratingTranscripts = new Set<string>()
const transcriptHydrationListeners = new Set<() => void>()

function notifyTranscriptHydration() {
  transcriptHydrationListeners.forEach((listener) => listener())
}

export function useAgentTranscriptHydrating(sessionId: string): boolean {
  return useSyncExternalStore(
    (listener) => {
      transcriptHydrationListeners.add(listener)
      return () => transcriptHydrationListeners.delete(listener)
    },
    // Pending until the session's ONE hydrate attempt has at least begun
    // its early-exit checks: an opened session whose hydrate has not run
    // yet (client still resolving) must read as loading, not "Ready".
    // Callers gate on canAgent, same as the sessions-list flag.
    () => hydratingTranscripts.has(sessionId) || !hydrated.has(sessionId),
    () => false,
  )
}

/**
 * Restore a session's transcript from agent_messages, once per session per
 * page load. The provider-side conversation is rebuilt from the user and
 * assistant text turns — tool-call rounds are display history, not replay
 * material (providers reject orphaned tool calls, and Gemini signatures do
 * not survive a reload anyway).
 */
export async function hydrateAgentTranscript(sessionId: string): Promise<void> {
  if (hydrated.has(sessionId)) return
  // Child effects run before parent effects: on a reload with a chat open,
  // this fires before AgentPanel has attached persistence. Do NOT burn the
  // one hydrate attempt — park the session id and retry on the attach
  // signal; the pending flag keeps reading "loading" in the meantime.
  if (!isAgentPersistenceAttached()) {
    pendingHydrates.add(sessionId)
    return
  }
  hydrated.add(sessionId)
  // The pending flag above watches `hydrated` too — flush the change even
  // on the early exits, or the skeleton outlives the load.
  notifyTranscriptHydration()
  const run = runFor(sessionId)
  if (run.events.length > 0 || run.running) return
  hydratingTranscripts.add(sessionId)
  notifyTranscriptHydration()
  let events: TranscriptEvent[] | null
  try {
    events = await loadPersistedEvents(sessionId)
  } finally {
    hydratingTranscripts.delete(sessionId)
    notifyTranscriptHydration()
  }
  if (!events || events.length === 0) return
  if (run.events.length > 0 || run.running) return // a send raced the load
  run.events = events
  run.messages = events.flatMap<AgentMessage>((event) => {
    if (event.kind === 'user') {
      // Rebuild the SAME model-facing turn the live send used — an
      // attachment's structure is conversation context, not chrome.
      const text = event.attachmentPayload
        ? `${event.text}\n\n--- attached canvas annotations (drawn by the user, structure not pixels) ---\n${event.attachmentPayload}`
        : event.text
      return [{ role: 'user', parts: [{ type: 'text', text }] }]
    }
    if (event.kind === 'assistant')
      return [{ role: 'assistant', parts: [{ type: 'text', text: event.text }] }]
    return []
  })
  emit()
}

/**
 * Forget a session's in-process run — its transcript events, its
 * provider-side messages, and its once-per-load hydrate mark.
 *
 * The app never calls this: a session stays in memory for the life of the
 * tab, which is why reopening one from the sessions list re-renders the run
 * it already has rather than reading anything back. That makes it the seam a
 * test needs to prove PERSISTENCE rather than memory — forget the run and
 * the next open is where another browser starts from: nothing here,
 * everything in `agent_messages`, through `hydrateAgentTranscript`.
 */
export function forgetAgentRun(sessionId: string): void {
  runs.delete(sessionId)
  snapshots.delete(sessionId)
  hydrated.delete(sessionId)
  pendingHydrates.delete(sessionId)
  hydratingTranscripts.delete(sessionId)
  emit()
  notifyTranscriptHydration()
}

/**
 * Transcript-row detail text. Capped: a row is a reviewer's peek at the
 * payload, not a place to hold a megabyte of tool output in memory.
 */
const DETAIL_LIMIT = 2000

/**
 * Cap on tool-result text entering the PROVIDER-side transcript. Results
 * live in `run.messages` for the session's whole life; a handful of
 * full-scenario reads would otherwise dominate every later round's input.
 * Generous enough for any single read to be useful; the marker tells the
 * model the remedy is a narrower re-read, not despair.
 */
const TOOL_RESULT_CONTEXT_LIMIT = 12_000

function contextResult(text: string): string {
  if (text.length <= TOOL_RESULT_CONTEXT_LIMIT) return text
  return `${text.slice(0, TOOL_RESULT_CONTEXT_LIMIT)}\n[…truncated at ${TOOL_RESULT_CONTEXT_LIMIT} chars — call the tool again with a narrower target if you need the rest]`
}

function detailText(value: unknown): string {
  const text =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  if (!text) return ''
  return text.length > DETAIL_LIMIT
    ? `${text.slice(0, DETAIL_LIMIT)}\n… (${text.length - DETAIL_LIMIT} more characters)`
    : text
}

/**
 * The arguments a refusal names, compactly. NOT `callSummary`: that label is
 * written for a transcript row a person skims, so it keeps to short strings
 * and drops everything else — which renders the call that motivated the
 * repeat guard, `list_blueprint` with a granularity list and a limit, as an
 * empty string. A model being sent back to an earlier result needs to know
 * WHICH earlier result, so arrays, numbers and booleans have to survive.
 * Capped, because this is a label for a call and not a copy of its input.
 */
const REFUSAL_ARGS_LIMIT = 160

function refusalArgs(call: AgentToolCallPart): string {
  const rendered = Object.entries(call.args)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${renderArg(value)}`)
    .join(', ')
  return rendered.length > REFUSAL_ARGS_LIMIT
    ? `${rendered.slice(0, REFUSAL_ARGS_LIMIT)}…`
    : rendered
}

function renderArg(value: unknown): string {
  if (Array.isArray(value)) return value.map(renderArg).join('|')
  if (value !== null && typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** One-line label for a tool call — the transcript's change-row text. */
function callSummary(call: AgentToolCallPart): string {
  const bits = Object.entries(call.args)
    .filter(([, value]) => typeof value === 'string' && value.length < 60)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`)
  return bits.join(', ')
}

/**
 * What makes two tool calls the same call: the name, and the arguments with
 * every object's keys in one order. A raw `JSON.stringify` of the arguments
 * would key on whatever order the provider happened to serialize them in,
 * and two byte-identical calls a round apart would read as different work.
 *
 * Keyed on the arguments AS SENT, before the tool's schema parses them, so a
 * stray extra key or an omitted argument the schema defaults makes two keys
 * for what runs as one read. That is the trade taken deliberately: a missed
 * duplicate is one repeat that behaves the way it always has, while a key
 * that collapsed two genuinely different calls would refuse a read the model
 * never ran.
 */
function callKey(call: AgentToolCallPart): string {
  return `${call.name}:${stableJson(call.args)}`
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(',')}}`
  return JSON.stringify(value) ?? 'null'
}

const MAX_ROUNDS = 12

/**
 * How many extra tries a provider call gets when it dies at the network
 * layer, and how long the loop waits before each one. Two is enough for the
 * failure this exists for — a phone's radio blipping for a moment mid
 * request — and few enough that a genuinely unreachable provider still
 * reaches the reader in a couple of seconds rather than a minute.
 */
const NETWORK_RETRIES = 2
const RETRY_BACKOFF_MS = 400

/**
 * A provider call that never completed, after every retry it was owed.
 * Distinct from `ProviderError` because the two need different words: the
 * provider refusing a request is something the reader (or their key) can
 * act on, a dropped connection is something to try again.
 */
class ConnectionDroppedError extends Error {
  readonly attempts: number
  constructor(attempts: number, detail: string) {
    super(detail)
    this.name = 'ConnectionDroppedError'
    this.attempts = attempts
  }
}

/**
 * The one failure a retry can fix: a request that never reached anyone.
 * Both WebKit and Chromium throw a bare `TypeError` out of `fetch` for it —
 * WebKit's wording is the `Load failed` this retry exists for.
 *
 * Named rather than assumed: the tempting version is "anything that is not
 * a `ProviderError` and not an abort", and that reports our own bugs to the
 * reader as a network story. A `SyntaxError` from parsing a truncated body,
 * or a schema mismatch in an adapter, is not going to come out differently
 * the second time — it fails on the first attempt, under its own name.
 * Two things do share the class and cannot be told apart from a drop. A
 * request the browser itself refuses on CORS or CSP grounds is the likelier
 * one in practice — a misconfigured origin waits out the backoff and is
 * then told the connection was lost, which is the wrong story but the right
 * behaviour, since nothing in the response distinguishes it. The other is a
 * TypeError raised by a bug inside an adapter. Both are retried; the round
 * is idempotent, so the cost is about a second before the same message
 * arrives anyway.
 */
function isConnectionDropped(error: unknown): boolean {
  return error instanceof TypeError
}

/** A backoff that stop can cut short — waiting out a retry the reader has
 *  already cancelled would leave Stop looking ignored for a second. */
function waitBeforeRetry(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      reject(new DOMException('stopped', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, ms)
    signal.addEventListener('abort', abort, { once: true })
  })
}

/**
 * The single seam every provider call in a run goes through, so all three
 * adapters get the retry without any of them knowing about it — and so a
 * retried round re-sends the transcript as it stands, tool results from
 * earlier rounds included, instead of the turn dying with them unsaved.
 */
async function chatWithRetry(
  adapter: AgentProviderAdapter,
  request: ChatInput,
): Promise<ChatResult> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await adapter.chat(request)
    } catch (error) {
      if (!isConnectionDropped(error)) throw error
      if (request.signal.aborted) throw new DOMException('stopped', 'AbortError')
      if (attempt > NETWORK_RETRIES)
        throw new ConnectionDroppedError(attempt, errorMessage(error))
      await waitBeforeRetry(RETRY_BACKOFF_MS * attempt, request.signal)
    }
  }
}

/**
 * The loop: send → text lands in the transcript, tool calls dispatch onto
 * the real wrappers → results feed back → repeat until the model stops or
 * the human hits Stop. Whatever landed stays — revertible from the sheet.
 */
export async function sendToAgent(input: {
  /**
   * `null` = the no-database TRIAL: no Supabase is configured, so the read
   * tools answer from the bundled sample blueprint and no write tool is
   * registered at all.
   */
  client: Client | null
  sessionId: string
  /**
   * The offline board the surface is drawing, for a trial with no database:
   * the deployment's when it supplied one, the package's otherwise. Handed in
   * rather than reached for, because the board lives on a context above the
   * panel and this loop is a plain function.
   */
  offlineBoard: OfflineBoard
  settings: AgentSettings
  contextNote: string
  text: string
  /**
   * The skills invoked with this message, in the order its text named them —
   * every one of their SKILL.md bodies joins the system prompt. The composer
   * parses them out of the draft at send; nothing else records them.
   */
  skills?: readonly AgentSkillCommand[]
  /**
   * A NEAR MISS this message deliberately did not run: a word-start token
   * that names no skill but spells a skill's bare alias, offered to the
   * reader, who chose to send their sentence as prose instead. A token that
   * does resolve never arrives here — it runs, which is what its colour in
   * the composer promises. The model is told about the miss in the words
   * below, because the likeliest reading of a message containing "/audit" is
   * that the audit is loaded, and a model that believes it improvises the
   * flow it was never given.
   */
  unrunSkill?: { token: string; label: string } | null
  /** Canvas hand-off (annotation capture) folded into this message. */
  attachment?: AgentAttachment | null
  /**
   * Service-account session? Viewers (signed-in, non-service) get NO write
   * tools — the specs are filtered out, a stray call is refused, and RLS
   * would reject it anyway. View + navigate + annotate + answer only.
   */
  allowWrites?: boolean
}): Promise<void> {
  const {
    client,
    sessionId,
    settings,
    contextNote,
    text,
    unrunSkill,
    attachment,
  } = input
  const skills = input.skills ?? []
  const allowWrites = input.allowWrites !== false
  const run = runFor(sessionId)
  if (run.running) return
  if (!hasKey(settings)) {
    push(sessionId, {
      kind: 'status',
      text: 'No API key for the selected provider — add one in ⚙.',
    })
    return
  }

  const adapter = ADAPTERS[settings.provider]
  const apiKey = settings.keys[settings.provider] ?? ''
  const controller = new AbortController()
  run.running = true
  run.controller = controller
  const modelText = attachment
    ? `${text}\n\n--- attached canvas annotations (drawn by the user, structure not pixels) ---\n${attachment.payload}`
    : text
  run.messages.push({ role: 'user', parts: [{ type: 'text', text: modelText }] })
  push(sessionId, {
    kind: 'user',
    text,
    ...(skills.length > 0
      ? { skills: skills.map((entry) => entry.id) }
      : {}),
    ...(attachment
      ? { attachmentLabel: attachment.label, attachmentPayload: attachment.payload }
      : {}),
  })
  // First message names the session — a list of "New session" rows says
  // nothing. Explicit renames always win (autoNameSession only replaces
  // the default title).
  autoNameSession(sessionId, text)

  // Batch etiquette, enforced rather than hoped for: after the limit's worth
  // of writes in one send, further writes bounce with a check-in
  // instruction. The counter resets per user message — sending "keep going"
  // IS the check-in.
  let writesThisSend = 0

  // A model that loops re-reads the same thing: one real session ran an
  // identical board read four times inside a turn, each repeat re-injecting
  // a payload the conversation already held and buying the rounds that
  // followed nothing. Every read this send has dispatched is remembered by
  // name and arguments, and a second call on the same key is answered with a
  // pointer instead of run. Per SEND rather than per round, because the
  // repeats that motivated this were in separate rounds.
  //
  // A CHANGE RETIRES WHAT IT CAN FALSIFY, and only that. The record is a
  // claim that an earlier answer still describes the world, so a call that
  // changes the world ends the claim — but the two kinds of call change
  // different worlds. A landed write can alter anything any read described,
  // so it clears the record whole; the write tools themselves tell the model
  // to re-read for the ids they just created. An interface call moves the
  // CANVAS, which falsifies what the user is looking at and nothing about
  // what a scenario contains, so it retires only the UI-surface reads.
  //
  // The width matters more than it looks. The canvas adapter tells the model
  // to `open_scenario` and `focus_cell` every time it names a cell, so reads
  // and camera moves interleave constantly: a rule that let any move clear
  // the record whole would empty it between every pair of reads and dedupe
  // nothing at all — the four identical board reads this exists to stop,
  // each politely separated by a `focus_cell`.
  const readsThisSend = new Set<string>()

  // No database, no writes — not "refused writes", ABSENT ones. The roster
  // is the definitions that may run without one, and the paragraph below
  // tells the model what it is looking at so it stops trying to author.
  const sampleTrial = client === null
  /**
   * Ranked search: whether this session has it at all, and whether its
   * question can be embedded.
   *
   * Resolved ONCE per send, here, because it is the only capability that
   * depends on the person's own provider key — the deployment lists the
   * vector indexes its database holds, and the key in this browser either
   * reaches one of them or does not. Three outcomes, and the quiet one
   * matters: not offered means the spec is filtered out of the roster, so the
   * model cannot call the tool and the person is never told they are on a
   * lesser search. The shared adapter reference still lists the name as part
   * of the read surface and says a tool absent from the tool list does not
   * exist here — see searchPlan.ts on why the mention stays. The two offered
   * outcomes differ only in whether `meaning` rides down to the dispatcher.
   */
  const searchPlan = agentSearchPlan(settings.provider)
  const dispatchContext: DispatchContext = {
    offlineBoard: input.offlineBoard,
    meaning:
      searchPlan.offered && searchPlan.index
        ? { index: searchPlan.index, apiKey }
        : null,
    signal: controller.signal,
  }

  /**
   * The paragraphs that are true of THIS send rather than of the session:
   * the tier, the no-database trial, a skill name the message nearly typed
   * and did not run, and the mobile shell. They sit after the cacheable
   * prefix, so they are a function rather than part of `buildSystem` — and a
   * function rather than an expression spelled at each call site, because it
   * used to be spelled at one of two and the other went without: the closing
   * call below passed the context and nothing else, so on the round-budget
   * path the model was no longer told which tier it was on, that it had no
   * database, or that a near-miss token had run nothing. That last is the
   * path the notice exists for — the session that motivated it exhausted its
   * rounds and then answered from the closing call.
   *
   * `mobileReading` is sampled per round, so it is the argument.
   */
  const sendNotes = (mobileReading: boolean): string =>
    // The mobile paragraph subsumes the tier one — and they disagree
    // about annotations (viewer tier has annotate_cells; the mobile
    // roster does not), so only one may speak per send.
    // The sample-trial paragraph subsumes the tier one too — with no
    // database there is no tier to be outside of.
    (allowWrites || mobileReading || sampleTrial
      ? ''
      : '\n\n--- session tier ---\nThis session is VIEW-ONLY (not a service account): you have no write tools. Navigate, read, annotate, and answer with citations; when the user wants an edit, describe the exact change for a service account to make — never imply you made it.') +
    (sampleTrial
      ? '\n\n--- sample data, no database ---\nThis app has NO database connected. Everything you can read is the template\'s bundled SAMPLE blueprint, and you have read and navigation tools only — no write tool exists in this session. Answer, explain, and navigate; when the user wants an edit, say plainly that authoring needs a connected database — never imply you changed anything.'
      : '') +
    (unrunSkill
      ? `\n\n--- a skill name the message nearly typed ---\nThe user's message contains the token "/${unrunSkill.token}", which is NOT a skill name here; the closest skill is ${unrunSkill.label}. They were offered it and chose to send the message as text, so NO skill ran and no skill's instructions are in this prompt. Do not describe ${unrunSkill.label} as having run, and do not summarise what it would have produced. Answer the message as written; where ${unrunSkill.label} is what the work needs, say so plainly and invite them to run it by that official name.`
      : '') +
    (mobileReading
      ? '\n\n--- mobile shell ---\nThe user is on the MOBILE app, which is view-only for everyone — your tools are navigation and reading only (no writes, no annotations, no canvas mode switch). The mobile view is a vertical journey reader: scrolling down moves forward through the steps; a Map view shows the 2-D board. When the user wants an edit, explain it is made on desktop — never imply you made it.'
      : '')

  // Hoisted so the catch can say WHERE a failure happened: a status that
  // says only "provider error" leaves someone unable to tell a turn that
  // died before it did anything from one that died after eleven rounds of
  // reading.
  let round = 0
  let closingRound = false

  try {
    for (; round < MAX_ROUNDS; round += 1) {
      // Rebuilt every round: the live UI context changes as the agent's own
      // navigation tools move the canvas mid-conversation — and so can the
      // shell itself (rotation across the breakpoint).
      //
      // The mobile shell is view-only for EVERY tier, service accounts
      // included — the agent there gets the reading roster and nothing else.
      // Sampled per round rather than per send because a run spans many tool
      // rounds, and a tablet rotated across the breakpoint mid-run must not
      // keep a roster the shell on screen no longer matches. UX gate only;
      // the server-side RPC tier enforcement is the real wall.
      const mobileReading = isMobileViewport()
      // One pass, and the gates' ORDER is part of the contract — it lives
      // in `sessionRoster`, with the definitions it derives from. The same
      // list is what the prompt's adapter renders and what each tool call
      // is served against.
      const roster = sessionRoster({
        sampleTrial,
        mobileReading,
        allowWrites,
        searchOffered: searchPlan.offered,
      })
      // The stable system prefix (role + adapter + doctrine + EVERY skill
      // this message carries — everything before the live context) is
      // byte-identical across this send's rounds while the roster holds; its
      // length lets caching providers put a cache breakpoint there. It is
      // measured through the same builder the prompt is assembled with, so a
      // message carrying several skill bodies moves the breakpoint past all
      // of them rather than cutting the prompt mid-skill.
      const systemStableLength = buildSystem('', skills, roster).length
      const liveContext = [contextNote, collectAgentUiContext()]
        .filter(Boolean)
        .join('\n')
      const result = await chatWithRetry(adapter, {
        system:
          buildSystem(liveContext, skills, roster) + sendNotes(mobileReading),
        systemStableLength,
        messages: run.messages,
        tools: roster.map(toolSpec),
        apiKey,
        model: modelFor(settings),
        signal: controller.signal,
      })

      // An all-filtered response (e.g. Gemini thought-only parts) must not
      // become an empty assistant turn — replaying one 400s on every
      // provider. Nothing usable came back; end the turn instead.
      if (result.parts.length === 0) break
      run.messages.push({ role: 'assistant', parts: result.parts })
      for (const part of result.parts) {
        if (part.type === 'text' && part.text.trim())
          push(sessionId, { kind: 'assistant', text: part.text })
      }

      const calls = result.parts.filter(
        (part): part is AgentToolCallPart => part.type === 'tool_call',
      )
      if (result.stopReason !== 'tool_use' || calls.length === 0) break

      const results: AgentMessage = { role: 'tool', parts: [] }
      let batchPauseAnnounced = false
      // `ui_command` is normally interface-only, but a command may declare
      // itself a mutation (undo reverts through the delete RPCs). One
      // predicate so the viewer refusal and the batch limiter cannot
      // disagree about what counts as a write.
      const isWrite = (call: AgentToolCallPart) =>
        findToolDefinition(call.name)?.surface === 'write' ||
        (call.name === 'ui_command' &&
          agentUiCommandMutates(String(call.args.command ?? '')))
      // Only the eyes are guarded. An interface call is the agent's hands:
      // re-centring on a cell the reader has since panned away from is the
      // tool working, not a loop, so a camera move may repeat as often as
      // the conversation needs it to.
      const isRead = (call: AgentToolCallPart) =>
        findToolDefinition(call.name)?.surface === 'read'
      // The other half of that: hands leave marks, but only where they
      // reached. A canvas move retires the reads that report the canvas —
      // named by `ui.ts` from its own definitions — and leaves the board
      // reads standing, because it changed no row.
      const forgetUiSurfaceReads = () => {
        for (const key of readsThisSend)
          if (UI_SURFACE_READ_TOOLS.some((name) => key.startsWith(`${name}:`)))
            readsThisSend.delete(key)
      }
      for (const call of calls) {
        // Off-roster calls: a model can still emit a name it invented or
        // remembered from another session, so each gate the roster applied
        // is applied again to the call, in the roster's words.
        const called = findToolDefinition(call.name)
        if (controller.signal.aborted) {
          // Stopping mid-batch must not strand the assistant's tool_use
          // parts without results: every provider rejects the NEXT send of
          // a transcript containing an unanswered tool call, which would
          // poison the session permanently. Answer everything not yet
          // dispatched with a stopped marker, commit the results turn,
          // THEN bail.
          for (const pending of calls) {
            const answered = results.parts.some(
              (part) =>
                part.type === 'tool_result' && part.toolCallId === pending.id,
            )
            if (answered) continue
            results.parts.push({
              type: 'tool_result',
              toolCallId: pending.id,
              name: pending.name,
              result: 'Stopped by the user before this call ran.',
              isError: true,
            })
          }
          run.messages.push(results)
          throw new DOMException('stopped', 'AbortError')
        }
        if (!toolEnabled(call.name)) {
          // Disabled by the deployment's config: the tool exists in the
          // template and not in this session, so the refusal says the
          // second thing only — the model has no business learning the first.
          results.parts.push({
            type: 'tool_result',
            toolCallId: call.id,
            name: call.name,
            result: noSuchToolRefusal(call.name),
            isError: true,
          })
          continue
        }
        if (sampleTrial && !called?.availability.sample) {
          results.parts.push({
            type: 'tool_result',
            toolCallId: call.id,
            name: call.name,
            result: SAMPLE_TRIAL_REFUSAL,
            isError: true,
          })
          continue
        }
        if (mobileReading && !called?.availability.mobile) {
          results.parts.push({
            type: 'tool_result',
            toolCallId: call.id,
            name: call.name,
            result: MOBILE_SHELL_REFUSAL,
            isError: true,
          })
          continue
        }
        if (call.name === 'search_blueprint' && !searchPlan.offered) {
          // Not on this session's roster, so only a model inventing a name
          // gets here. The refusal says the tool does not exist rather than
          // explaining the index list — the person's provider choice is not
          // the model's business, and a hint would invite it to ask them to
          // change keys.
          results.parts.push({
            type: 'tool_result',
            toolCallId: call.id,
            name: call.name,
            result: NO_SEARCH_REFUSAL,
            isError: true,
          })
          continue
        }
        if (isWrite(call) && !allowWrites) {
          results.parts.push({
            type: 'tool_result',
            toolCallId: call.id,
            name: call.name,
            result: VIEW_ONLY_REFUSAL,
            isError: true,
          })
          continue
        }
        if (isWrite(call) && writesThisSend >= WRITE_BATCH_LIMIT) {
          results.parts.push({
            type: 'tool_result',
            toolCallId: call.id,
            name: call.name,
            result: BATCH_LIMIT_REFUSAL,
            isError: true,
          })
          // One status row per round, however many calls bounced — six
          // identical "Paused" rows read as a stutter, not a pause.
          if (!batchPauseAnnounced) {
            batchPauseAnnounced = true
            push(sessionId, { kind: 'status', text: BATCH_PAUSED_STATUS })
          }
          continue
        }
        if (isRead(call) && readsThisSend.has(callKey(call))) {
          results.parts.push({
            type: 'tool_result',
            toolCallId: call.id,
            name: call.name,
            result: repeatReadRefusal(call.name, refusalArgs(call)),
            isError: true,
          })
          // A tool row rather than the status line the batch pause uses,
          // and one apiece rather than one per round. A status row states a
          // fact about the turn; these rows are calls the model made, and a
          // reader scanning the tool rows for what the agent did has to see
          // them there, in place, with the arguments that repeated —
          // collapsed or filed elsewhere, the loop stops being visible as a
          // loop, which is the thing a bad turn is read back for.
          push(sessionId, {
            kind: 'tool',
            name: call.name,
            summary: REPEAT_READ_SUPPRESSED,
            isError: true,
            args: detailText(call.args),
            result: detailText(repeatReadRefusal(call.name, refusalArgs(call))),
          })
          continue
        }
        try {
          const output = await dispatchTool(
            client,
            sessionId,
            call.name,
            call.args,
            { ...dispatchContext, roster },
          )
          // Counted AFTER success: a write that failed changed nothing and
          // must not eat batch budget.
          if (isWrite(call)) writesThisSend += 1
          // Recorded AFTER success, for the same reason: a read that threw
          // put no result in the conversation to point the model back at.
          // And a call that landed a change retires the answers it could
          // have falsified, for the same reason in reverse.
          if (isRead(call)) readsThisSend.add(callKey(call))
          if (isWrite(call)) readsThisSend.clear()
          else if (findToolDefinition(call.name)?.surface === 'interface')
            forgetUiSurfaceReads()
          results.parts.push({
            type: 'tool_result',
            toolCallId: call.id,
            name: call.name,
            result: contextResult(output),
          })
          push(sessionId, {
            kind: 'tool',
            name: call.name,
            summary: callSummary(call),
            isError: false,
            args: detailText(call.args),
            result: detailText(output),
          })
        } catch (error) {
          const message = errorMessage(error)
          results.parts.push({
            type: 'tool_result',
            toolCallId: call.id,
            name: call.name,
            result: `Error: ${message}`,
            isError: true,
          })
          push(sessionId, {
            kind: 'tool',
            name: call.name,
            summary: message,
            isError: true,
            args: detailText(call.args),
            result: detailText(`Error: ${message}`),
          })
        }
      }
      run.messages.push(results)
      if (round === MAX_ROUNDS - 1) {
        // Round budget exhausted with tool calls still flowing. The model
        // does not know its turn was truncated — a silent stop leaves the
        // user's next "continue" landing on a model that thinks it was
        // mid-work. Tell it, and give it ONE no-tools round to close out
        // with an answer built from what it already learned.
        run.messages.push({
          role: 'user',
          parts: [
            {
              type: 'text',
              text: '[system] Tool budget for this turn is exhausted. Do not request more tools — answer the user NOW from what you have learned, and say plainly what remains undone. A fresh user message renews the budget.',
            },
          ],
        })
        closingRound = true
        const closing = await chatWithRetry(adapter, {
          system:
            buildSystem(
              [contextNote, collectAgentUiContext()].filter(Boolean).join('\n'),
              skills,
              roster,
            ) + sendNotes(mobileReading),
          systemStableLength,
          messages: run.messages,
          tools: [],
          apiKey,
          model: modelFor(settings),
          signal: controller.signal,
        })
        if (closing.parts.length > 0) {
          run.messages.push({ role: 'assistant', parts: closing.parts })
          for (const part of closing.parts) {
            if (part.type === 'text' && part.text.trim())
              push(sessionId, { kind: 'assistant', text: part.text })
          }
        }
        push(sessionId, {
          kind: 'status',
          text: 'Stopped after the round limit — send a message to continue.',
        })
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      push(sessionId, {
        kind: 'status',
        text: 'Stopped. Whatever already landed is in the change sheet, revertible.',
      })
    } else {
      const where = closingRound ? 'the closing round' : `round ${round + 1}`
      const message = errorMessage(error)
      if (error instanceof ConnectionDroppedError) {
        push(sessionId, {
          kind: 'status',
          text: `Connection lost on ${where} after ${error.attempts} tries (${message}) — everything the turn already gathered is kept; send a message to carry on.`,
        })
      } else if (error instanceof ProviderError) {
        push(sessionId, {
          kind: 'status',
          text: `Provider error on ${where}: ${message}`,
        })
      } else {
        // Neither the provider's verdict nor the network. A tool that
        // throws never reaches here — it is caught per call and fed back as
        // an error tool_result — so what lands is a bug in this loop, or an
        // adapter throwing something that is not a TypeError: a 200 whose
        // body will not parse, a response in a shape it did not expect. Say
        // where it happened, quote it, and claim nothing about whose fault
        // it was.
        push(sessionId, {
          kind: 'status',
          text: `The turn failed on ${where}: ${message}`,
        })
      }
    }
  } finally {
    run.running = false
    run.controller = null
    emit()
  }
}
