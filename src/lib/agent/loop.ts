import type { SupabaseClient } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { errorMessage } from '@/lib/utils'
import type { Database } from '@/types/database'
import { anthropicAdapter } from '@/lib/agent/providers/anthropic'
import { googleAdapter } from '@/lib/agent/providers/google'
import { openaiAdapter } from '@/lib/agent/providers/openai'
import type {
  AgentMessage,
  AgentProviderAdapter,
  AgentToolCallPart,
} from '@/lib/agent/providers/provider'
import { dispatchTool, type DispatchContext } from '@/lib/agent/tools/registry'
import type { OfflineBoard } from '@/data/blueprintFallbacks'
import { agentSearchPlan } from '@/lib/agent/searchPlan'
import { toolSpec } from '@/lib/agent/tools/definition'
import { findToolDefinition } from '@/lib/agent/tools/definitions'
import { sessionRoster, toolEnabled } from '@/lib/agent/tools/roster'
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
  skill: AgentSkillCommand | null | undefined,
  roster: readonly ToolDefinition[],
): string {
  const doctrine = agentDoctrine()
  return [
    ROLE,
    '\n\n--- canvas-adapter reference (FULL text — get_reference serves the other, deeper references) ---\n',
    readReference('canvas-adapter', roster),
    doctrine ? `\n\n--- deployment doctrine ---\n${doctrine}` : '',
    skill?.content
      ? `\n\n--- active skill: ${skill.label} (invoked by the user; the same SKILL.md IDE agents follow) ---\n${skill.content}\n\nYou are the canvas agent, not an IDE agent: skip the skill's file/script/CLI mechanics and act through your tools, translated by the canvas-adapter above. The skill's judgment — what makes a good blueprint/slice, the order of questions, the quality bars — applies in full.`
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
      /** Slash-skill id when the message invoked one (rendered as a badge). */
      skill?: string
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
  /** Slash-skill invoked with this message (its SKILL.md joins the system prompt). */
  skill?: AgentSkillCommand | null
  /** Canvas hand-off (annotation capture) folded into this message. */
  attachment?: AgentAttachment | null
  /**
   * Service-account session? Viewers (signed-in, non-service) get NO write
   * tools — the specs are filtered out, a stray call is refused, and RLS
   * would reject it anyway. View + navigate + annotate + answer only.
   */
  allowWrites?: boolean
}): Promise<void> {
  const { client, sessionId, settings, contextNote, text, skill, attachment } =
    input
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
    ...(skill ? { skill: skill.id } : {}),
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
  // CLEARED BY ANYTHING THAT CHANGES STATE — a landed write, or an interface
  // call that moved the canvas. The record is a claim that an earlier answer
  // still describes the world, and a call that changes the world retires it:
  // the write tools themselves tell the model to re-read for the ids they
  // created, and `get_ui_state` is documented as what the user is looking at
  // RIGHT NOW, which a navigation call has just made false. Without this a
  // turn could move the canvas and then be refused the observation of its
  // own move, pointed back at a description of the screen before it.
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

  try {
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
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
      // The stable system prefix (role + adapter + doctrine + skill —
      // everything before the live context) is byte-identical across this
      // send's rounds while the roster holds; its length lets caching
      // providers put a cache breakpoint there.
      const systemStableLength = buildSystem('', skill, roster).length
      const liveContext = [contextNote, collectAgentUiContext()]
        .filter(Boolean)
        .join('\n')
      const result = await adapter.chat({
        system:
          buildSystem(liveContext, skill, roster) +
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
          (mobileReading
            ? '\n\n--- mobile shell ---\nThe user is on the MOBILE app, which is view-only for everyone — your tools are navigation and reading only (no writes, no annotations, no canvas mode switch). The mobile view is a vertical journey reader: scrolling down moves forward through the steps; a Map view shows the 2-D board. When the user wants an edit, explain it is made on desktop — never imply you made it.'
            : ''),
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
      // The other half of that: hands leave marks. Whatever a write changed
      // on the board, and wherever an interface call left the canvas, is
      // not what this turn's earlier reads described.
      const changesState = (call: AgentToolCallPart) =>
        isWrite(call) || findToolDefinition(call.name)?.surface === 'interface'
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
            result: repeatReadRefusal(call.name, callSummary(call)),
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
            result: detailText(repeatReadRefusal(call.name, callSummary(call))),
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
          // And a call that landed a change retires every earlier answer,
          // for the same reason in reverse.
          if (isRead(call)) readsThisSend.add(callKey(call))
          if (changesState(call)) readsThisSend.clear()
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
        const closing = await adapter.chat({
          system: buildSystem(
            [contextNote, collectAgentUiContext()].filter(Boolean).join('\n'),
            skill,
            roster,
          ),
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
      const message = errorMessage(error)
      push(sessionId, { kind: 'status', text: `Provider error: ${message}` })
    }
  } finally {
    run.running = false
    run.controller = null
    emit()
  }
}
