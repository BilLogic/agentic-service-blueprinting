// @vitest-environment jsdom
/**
 * The loop, from a fake provider through a tool to its result and back.
 *
 * Provider → tool → result → provider is the iteration the product is, and
 * it had no test: the tools were tested through `run`, the roster through
 * its derivation, the providers not at all, and the loop that threads them
 * only by hand. This drives `sendToAgent` with a scripted provider adapter
 * — no network, no key beyond the string that unlocks the send — and
 * asserts what a person and the model each see: the transcript's rows, and
 * the `tool_result` parts fed back on the next round.
 *
 * Four calls, the ones the loop has to get right: a read that runs (the
 * sample's `list_blueprint`), a write that runs (`create_phase`, on the
 * service the session was handed), and two writes the session cannot run —
 * one the no-database trial has no tool for, one the deployment's allowlist
 * disabled — each refused in the loop's words, not dispatched, and the
 * model told what it can do instead.
 */
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatInput, ChatResult } from '@/lib/agent/providers/provider'
import type { Database } from '@/types/database'

/**
 * The scripted provider: answers each round from the queue, and keeps what
 * it was sent. A queued Error is thrown instead of answered — that is how
 * the dropped-connection cases below reach the loop — and a queued function
 * runs first, so a case can abort the run from inside the provider call.
 */
const provider = vi.hoisted(() => ({
  turns: [] as Array<ChatResult | Error | DOMException | (() => ChatResult)>,
  inputs: [] as ChatInput[],
}))

vi.mock('@/lib/agent/providers/anthropic', () => ({
  anthropicAdapter: {
    id: 'anthropic',
    chat: async (input: ChatInput): Promise<ChatResult> => {
      provider.inputs.push(input)
      const turn = provider.turns.shift()
      if (typeof turn === 'function') return turn()
      if (turn instanceof Error || turn instanceof DOMException) throw turn
      return turn ?? { parts: [], stopReason: 'end' }
    },
  },
}))

// jsdom has no matchMedia; the shell under test is the desktop one.
vi.mock('@/hooks/useMobileShell', () => ({ isMobileViewport: () => false }))

/** The write, captured at the RPC wrapper: which service, and the id handed back. */
const phasesCreated: { serviceId: string; name: string }[] = []
vi.mock('@/lib/authoringRpc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/authoringRpc')>()),
  createPhase: async (_client: unknown, input: { serviceId: string; name: string }) => {
    phasesCreated.push(input)
    return 'phase-new'
  },
}))

import { setActiveService } from '@/contexts/activeService'
import { sendToAgent, stopAgent, useAgentRun } from '@/lib/agent/loop'
import { ProviderError } from '@/lib/agent/providers/provider'
import { PACKAGE_OFFLINE_BOARD } from '@/data/blueprintFallbacks'
import type { AgentSettings } from '@/lib/agent/settings'
import { SAMPLE_TRIAL_REFUSAL, noSuchToolRefusal } from '@/lib/agent/tools/refusals'
import { configureAgentTools } from '@/lib/agent/tools/roster'

const SETTINGS: AgentSettings = { provider: 'anthropic', models: {}, keys: { anthropic: 'test-key' } }

/** Nothing here reads the database; the write is captured before it would. */
const client = {} as unknown as SupabaseClient<Database>

/**
 * One send, then the transcript as the panel reads it. Each send gets a
 * fresh session id because the loop keeps run state per session in module
 * scope and a shared id would carry one case's rows into the next; the
 * events come back through `useAgentRun` rather than a store peek because
 * that hook is the only reader the app has. A case that has to reach into
 * its own run mid-flight — stop, below — names the session itself.
 */
let sessions = 0
const send = (input: {
  client: SupabaseClient<Database> | null
  text: string
  sessionId?: string
}) => {
  const sessionId = input.sessionId ?? `loop-test-${(sessions += 1)}`
  return sendToAgent({
    ...input,
    sessionId,
    offlineBoard: PACKAGE_OFFLINE_BOARD,
    settings: SETTINGS,
    contextNote: '',
  }).then(
    () => renderHook(() => useAgentRun(sessionId)).result.current.events,
  )
}

/** What the model was handed on a round: the tool results of the previous one. */
const resultsFedBack = (round: number) =>
  provider.inputs[round]!.messages
    .filter((message) => message.role === 'tool')
    .flatMap((message) => message.parts)

const call = (id: string, name: string, args: Record<string, unknown>) =>
  ({ type: 'tool_call', id, name, args }) as const

beforeEach(() => {
  provider.turns = []
  provider.inputs = []
  phasesCreated.length = 0
})

afterEach(() => {
  setActiveService(null)
  configureAgentTools(undefined)
  vi.useRealTimers()
})

describe('the loop, provider → tool → result → provider', () => {
  it('runs a read, feeds its result back, and lands the final answer in the transcript', async () => {
    provider.turns = [
      {
        parts: [
          { type: 'text', text: 'Let me look.' },
          call('c1', 'list_blueprint', { granularity: ['phase'] }),
        ],
        stopReason: 'tool_use',
      },
      { parts: [{ type: 'text', text: 'Four phases, Discover to Maintain.' }], stopReason: 'end' },
    ]

    const events = await send({ client: null, text: 'What phases are there?' })

    // Round two was handed round one's result, as a tool_result on c1.
    const [fedBack] = resultsFedBack(1)
    expect(fedBack).toMatchObject({ type: 'tool_result', toolCallId: 'c1', name: 'list_blueprint' })
    expect(fedBack!.result).toMatch(/^\d+ of \d+:/)
    expect(fedBack!.isError).toBeUndefined()

    // The person sees the same, in order: their message, the narration, the
    // tool row with the result, the answer.
    expect(events.map((event) => event.kind)).toEqual(['user', 'assistant', 'tool', 'assistant'])
    expect(events[2]).toMatchObject({ kind: 'tool', name: 'list_blueprint', isError: false })
    expect(events.at(-1)).toEqual({ kind: 'assistant', text: 'Four phases, Discover to Maintain.' })
    expect(provider.inputs).toHaveLength(2)
  })

  it('runs a write on the service the session was handed, and reads the tool\'s own sentence back', async () => {
    setActiveService({ id: 'svc-1', slug: 'rooftop-retrofit', name: 'Rooftop Retrofit' })
    provider.turns = [
      { parts: [call('w1', 'create_phase', { name: 'Handover' })], stopReason: 'tool_use' },
      { parts: [{ type: 'text', text: 'Added the Handover phase.' }], stopReason: 'end' },
    ]

    const events = await send({ client, text: 'Add a Handover phase' })

    expect(phasesCreated).toMatchObject([{ serviceId: 'svc-1', name: 'Handover' }])
    expect(resultsFedBack(1)[0]).toMatchObject({
      type: 'tool_result',
      toolCallId: 'w1',
      result: 'Created phase (phase-new).',
    })
    expect(events.find((event) => event.kind === 'tool')).toMatchObject({
      name: 'create_phase',
      isError: false,
      result: 'Created phase (phase-new).',
    })
    expect(events.at(-1)).toEqual({ kind: 'assistant', text: 'Added the Handover phase.' })
  })

  it('refuses a tool the session does not have, in the loop\'s words, without dispatching it', async () => {
    // The no-database trial: `create_phase` is off the roster, so the model
    // was never offered it — but a model can still emit a name.
    provider.turns = [
      { parts: [call('x1', 'create_phase', { name: 'Handover' })], stopReason: 'tool_use' },
      { parts: [{ type: 'text', text: 'I cannot author here.' }], stopReason: 'end' },
    ]

    const events = await send({ client: null, text: 'Add a Handover phase' })

    expect(phasesCreated).toEqual([])
    expect(provider.inputs[0]!.tools.map((tool) => tool.name)).not.toContain('create_phase')
    expect(resultsFedBack(1)[0]).toEqual({
      type: 'tool_result',
      toolCallId: 'x1',
      name: 'create_phase',
      result: SAMPLE_TRIAL_REFUSAL,
      isError: true,
    })
    // Refused calls are answered to the model, not shown as tool rows.
    expect(events.map((event) => event.kind)).toEqual(['user', 'assistant'])
    expect(events.at(-1)).toEqual({ kind: 'assistant', text: 'I cannot author here.' })
  })

  it('refuses a tool the deployment disabled as one that does not exist, without dispatching it', async () => {
    // A connected service account, but the deployment's allowlist stops at
    // reads: the loop must not run a write the roster never offered, and the
    // refusal says nothing about why the roster is narrow.
    configureAgentTools(['list_blueprint'])
    setActiveService({ id: 'svc-1', slug: 'rooftop-retrofit', name: 'Rooftop Retrofit' })
    provider.turns = [
      { parts: [call('d1', 'create_phase', { name: 'Handover' })], stopReason: 'tool_use' },
      { parts: [{ type: 'text', text: 'That tool is not available here.' }], stopReason: 'end' },
    ]

    const events = await send({ client, text: 'Add a Handover phase' })

    expect(phasesCreated).toEqual([])
    expect(provider.inputs[0]!.tools.map((tool) => tool.name)).toEqual(['list_blueprint'])
    expect(resultsFedBack(1)[0]).toEqual({
      type: 'tool_result',
      toolCallId: 'd1',
      name: 'create_phase',
      result: noSuchToolRefusal('create_phase'),
      isError: true,
    })
    expect(events.map((event) => event.kind)).toEqual(['user', 'assistant'])
  })
})

/**
 * The failure a phone produces: a fetch that never completed, which WebKit
 * reports as `TypeError: Load failed`. Nothing rejected the request — the
 * radio blipped — so a turn that dies on it throws away every tool result
 * the round had already gathered for no reason a retry could not fix.
 *
 * The clock is faked throughout: the backoff between tries is real time the
 * suite should not spend waiting.
 */
describe('a provider call that drops at the network layer', () => {
  /** Past the two backoffs, whichever of them this case reaches. */
  const runOutTheBackoff = () => vi.advanceTimersByTimeAsync(5000)

  const loadFailed = () => new TypeError('Load failed')

  it('retries a dropped connection and finishes the turn the reader asked for', async () => {
    vi.useFakeTimers()
    provider.turns = [
      loadFailed(),
      { parts: [{ type: 'text', text: 'Four phases, Discover to Maintain.' }], stopReason: 'end' },
    ]

    const pending = send({ client: null, text: 'What phases are there?' })
    await runOutTheBackoff()
    const events = await pending

    expect(provider.inputs).toHaveLength(2)
    expect(events.map((event) => event.kind)).toEqual(['user', 'assistant'])
    expect(events.at(-1)).toEqual({ kind: 'assistant', text: 'Four phases, Discover to Maintain.' })
  })

  it('keeps the tool results an earlier round gathered when a later round is retried', async () => {
    vi.useFakeTimers()
    provider.turns = [
      { parts: [call('c1', 'list_blueprint', { granularity: ['phase'] })], stopReason: 'tool_use' },
      loadFailed(),
      { parts: [{ type: 'text', text: 'Four phases.' }], stopReason: 'end' },
    ]

    const pending = send({ client: null, text: 'What phases are there?' })
    await runOutTheBackoff()
    await pending

    // The third call is the second round sent again: it still carries the
    // result of the call that already ran.
    expect(resultsFedBack(2)[0]).toMatchObject({ type: 'tool_result', toolCallId: 'c1' })
  })

  it('gives up after two retries with a status naming the round and the count', async () => {
    vi.useFakeTimers()
    provider.turns = [loadFailed(), loadFailed(), loadFailed()]

    const pending = send({ client: null, text: 'What phases are there?' })
    await runOutTheBackoff()
    const events = await pending

    expect(provider.inputs).toHaveLength(3)
    expect(events.at(-1)).toEqual({
      kind: 'status',
      text: 'Connection lost on round 1 after 3 tries (Load failed) — everything the turn already gathered is kept; send a message to carry on.',
    })
  })

  it('does not retry a provider refusal, and keeps its status and detail', async () => {
    provider.turns = [new ProviderError('anthropic', 429, 'rate limit exceeded')]

    const events = await send({ client: null, text: 'What phases are there?' })

    expect(provider.inputs).toHaveLength(1)
    expect(events.at(-1)).toEqual({
      kind: 'status',
      text: 'Provider error on round 1: anthropic 429: rate limit exceeded',
    })
  })

  it('does not retry a failure a second try cannot fix, and does not call it a drop', async () => {
    // A truncated 200 whose body will not parse: the same request will
    // produce the same broken body, and the reader is owed the real name.
    provider.turns = [new SyntaxError('Unexpected end of JSON input')]

    const events = await send({ client: null, text: 'What phases are there?' })

    expect(provider.inputs).toHaveLength(1)
    expect(events.at(-1)).toEqual({
      kind: 'status',
      text: 'The turn failed on round 1: Unexpected end of JSON input',
    })
  })

  it('never retries an abort — a regression guard on the stopped status', async () => {
    provider.turns = [new DOMException('stopped', 'AbortError')]

    const events = await send({ client: null, text: 'What phases are there?' })

    expect(provider.inputs).toHaveLength(1)
    expect(events.at(-1)).toEqual({
      kind: 'status',
      text: 'Stopped. Whatever already landed is in the change sheet, revertible.',
    })
  })

  it('stops between tries when the reader presses stop during the backoff', async () => {
    vi.useFakeTimers()
    const sessionId = 'loop-abort-during-backoff'
    provider.turns = [
      () => {
        // Lands while the loop is waiting out the backoff, not before it —
        // the wait itself has to notice, or Stop sits ignored for a second.
        setTimeout(() => stopAgent(sessionId), 50)
        throw loadFailed()
      },
      { parts: [{ type: 'text', text: 'Should never be asked for.' }], stopReason: 'end' },
    ]

    const pending = send({ client: null, text: 'What phases are there?', sessionId })
    await runOutTheBackoff()
    const events = await pending

    expect(provider.inputs).toHaveLength(1)
    expect(events.at(-1)).toEqual({
      kind: 'status',
      text: 'Stopped. Whatever already landed is in the change sheet, revertible.',
    })
  })

  it('stops rather than retrying when stop landed during the provider call itself', async () => {
    const sessionId = 'loop-abort-before-backoff'
    provider.turns = [
      () => {
        stopAgent(sessionId)
        throw loadFailed()
      },
    ]

    const events = await send({ client: null, text: 'What phases are there?', sessionId })

    expect(provider.inputs).toHaveLength(1)
    expect(events.at(-1)).toEqual({
      kind: 'status',
      text: 'Stopped. Whatever already landed is in the change sheet, revertible.',
    })
  })
})
