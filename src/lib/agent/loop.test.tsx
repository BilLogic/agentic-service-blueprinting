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

/** The scripted provider: answers each round from the queue, and keeps what it was sent. */
const provider = vi.hoisted(() => ({
  turns: [] as ChatResult[],
  inputs: [] as ChatInput[],
}))

vi.mock('@/lib/agent/providers/anthropic', () => ({
  anthropicAdapter: {
    id: 'anthropic',
    chat: async (input: ChatInput): Promise<ChatResult> => {
      provider.inputs.push(input)
      return provider.turns.shift() ?? { parts: [], stopReason: 'end' }
    },
  },
}))

// jsdom has no matchMedia; the shell under test is the desktop one.
vi.mock('@/hooks/useMobileShell', () => ({ isMobileViewport: () => false }))

/**
 * The database-backed board read, counted. The sample trial's read answers
 * from the bundled fixture and needs nothing; these cases need a read that
 * says which time it ran, so "the guard let this one through" is a fact
 * about dispatch rather than an inference from the text.
 */
const board = vi.hoisted(() => ({ reads: 0 }))
vi.mock('@/lib/agent/tools/read', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/agent/tools/read')>()),
  listBlueprint: async () => `board read ${(board.reads += 1)}`,
}))
// The scope a database read resolves first, which would otherwise be the
// call that reaches the client this file never builds.
vi.mock('@/lib/agent/tools/definitions/scope', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/agent/tools/definitions/scope')>()),
  readScope: async () => ({ kind: 'service', serviceId: 'svc-1', serviceName: 'Rooftop Retrofit' }),
}))

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
import { sendToAgent, useAgentRun } from '@/lib/agent/loop'
import { PACKAGE_OFFLINE_BOARD } from '@/data/blueprintFallbacks'
import type { AgentSettings } from '@/lib/agent/settings'
import {
  REPEAT_READ_SUPPRESSED,
  SAMPLE_TRIAL_REFUSAL,
  noSuchToolRefusal,
  repeatReadRefusal,
} from '@/lib/agent/tools/refusals'
import { configureAgentTools } from '@/lib/agent/tools/roster'
import { NO_UI_STATE } from '@/lib/agent/tools/definitions/ui'

const SETTINGS: AgentSettings = { provider: 'anthropic', models: {}, keys: { anthropic: 'test-key' } }

/** Nothing here reads the database; the write is captured before it would. */
const client = {} as unknown as SupabaseClient<Database>

/**
 * One send, then the transcript as the panel reads it. Each send gets a
 * fresh session id because the loop keeps run state per session in module
 * scope and a shared id would carry one case's rows into the next; the
 * events come back through `useAgentRun` rather than a store peek because
 * that hook is the only reader the app has.
 */
let sessions = 0
const send = (input: {
  client: SupabaseClient<Database> | null
  text: string
  /** Pass one to send TWICE on the same session — the only case that needs it. */
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

/**
 * The answer the model was handed for one call, found by its id. The loop
 * hands the provider its LIVE message array, so every recorded input ends
 * the run holding every round's results — a round index cannot pick a call
 * out, and the id can.
 */
const answerTo = (id: string) =>
  resultsFedBack(provider.inputs.length - 1).find(
    (part) => part.type === 'tool_result' && part.toolCallId === id,
  )!

const call = (id: string, name: string, args: Record<string, unknown>) =>
  ({ type: 'tool_call', id, name, args }) as const

beforeEach(() => {
  provider.turns = []
  provider.inputs = []
  phasesCreated.length = 0
  board.reads = 0
})

afterEach(() => {
  setActiveService(null)
  configureAgentTools(undefined)
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
 * The repeat-read guard. A model that loops re-reads the same thing: the
 * session that motivated this ran one identical `list_blueprint` four times
 * inside a turn, spending a round and re-injecting an identical payload each
 * time. These drive the same shape through the scripted provider and assert
 * what the model is handed back, what the person sees, and — the point of
 * the whole thing — what never reached a tool.
 */
describe('a read the turn already ran', () => {
  it('refuses the repeat with a pointer rather than dispatching it again', async () => {
    provider.turns = [
      {
        parts: [call('r1', 'list_blueprint', { granularity: ['step'], scenario: 'Goal Setting' })],
        stopReason: 'tool_use',
      },
      // Same call, arguments written in the other order: providers do not
      // promise key order between rounds, and neither does the model.
      {
        parts: [call('r2', 'list_blueprint', { scenario: 'Goal Setting', granularity: ['step'] })],
        stopReason: 'tool_use',
      },
      { parts: [{ type: 'text', text: 'Four phases.' }], stopReason: 'end' },
    ]

    const events = await send({ client: null, text: 'What phases are there?' })

    // Round one ran: whatever the board said, it is the tool's answer.
    expect(answerTo('r1').isError).toBeUndefined()
    expect(answerTo('r1').result).not.toContain('already ran this turn')
    // Round two was refused, error-shaped, and the payload is NOT restated.
    const refused = answerTo('r2')
    expect(refused).toEqual({
      type: 'tool_result',
      toolCallId: 'r2',
      name: 'list_blueprint',
      // The refusal NAMES the arguments — a turn can hold several reads of
      // one tool, and "list_blueprint already ran" would leave the model to
      // guess which earlier result it is being sent back to.
      result: repeatReadRefusal('list_blueprint', 'scenario: Goal Setting'),
      isError: true,
    })
    expect(refused.result).toContain('Goal Setting')
    expect(refused.result).not.toMatch(/^\d+ of \d+:/)
    // The round budget is untouched: the turn ran on to its answer.
    expect(events.at(-1)).toEqual({ kind: 'assistant', text: 'Four phases.' })
  })

  it('leaves each suppressed repeat in the transcript, one row apiece', async () => {
    provider.turns = [
      { parts: [call('r1', 'list_blueprint', { granularity: ['phase'] })], stopReason: 'tool_use' },
      {
        parts: [
          call('r2', 'list_blueprint', { granularity: ['phase'] }),
          call('r3', 'list_blueprint', { granularity: ['phase'] }),
        ],
        stopReason: 'tool_use',
      },
      { parts: [{ type: 'text', text: 'Four phases.' }], stopReason: 'end' },
    ]

    const events = await send({ client: null, text: 'What phases are there?' })

    const rows = events.filter((event) => event.kind === 'tool')
    expect(rows).toHaveLength(3)
    // The loop in full, not a tidied summary of it: both repeats are rows.
    expect(rows.slice(1)).toEqual([
      {
        kind: 'tool',
        name: 'list_blueprint',
        summary: REPEAT_READ_SUPPRESSED,
        isError: true,
        args: JSON.stringify({ granularity: ['phase'] }, null, 2),
        result: repeatReadRefusal('list_blueprint', ''),
      },
      {
        kind: 'tool',
        name: 'list_blueprint',
        summary: REPEAT_READ_SUPPRESSED,
        isError: true,
        args: JSON.stringify({ granularity: ['phase'] }, null, 2),
        result: repeatReadRefusal('list_blueprint', ''),
      },
    ])
  })

  it('dispatches the same read under different arguments', async () => {
    provider.turns = [
      { parts: [call('r1', 'list_blueprint', { granularity: ['phase'] })], stopReason: 'tool_use' },
      { parts: [call('r2', 'list_blueprint', { granularity: ['scenario'] })], stopReason: 'tool_use' },
      { parts: [{ type: 'text', text: 'Phases and scenarios.' }], stopReason: 'end' },
    ]

    await send({ client: null, text: 'What is on the board?' })

    expect(answerTo('r2').result).toMatch(/^\d+ of \d+:/)
    expect(answerTo('r2').isError).toBeUndefined()
  })

  it('lets an interface call repeat — the camera is the agent\'s hands, not its eyes', async () => {
    provider.turns = [
      { parts: [call('i1', 'focus_cell', { cell_id: 'cell-1' })], stopReason: 'tool_use' },
      { parts: [call('i2', 'focus_cell', { cell_id: 'cell-1' })], stopReason: 'tool_use' },
      { parts: [{ type: 'text', text: 'Centred.' }], stopReason: 'end' },
    ]

    await send({ client: null, text: 'Show me that cell again' })

    expect(answerTo('i2').result).not.toBe(repeatReadRefusal('focus_cell', 'cell_id: cell-1'))
    expect(answerTo('i2').result).toBe(answerTo('i1').result)
  })

  it('starts a fresh record on the next send, so the read runs again', async () => {
    const sessionId = `loop-test-repeat-${(sessions += 1)}`
    provider.turns = [
      { parts: [call('r1', 'list_blueprint', { granularity: ['phase'] })], stopReason: 'tool_use' },
      { parts: [{ type: 'text', text: 'Four phases.' }], stopReason: 'end' },
    ]
    await send({ sessionId, client: null, text: 'What phases are there?' })

    provider.turns = [
      { parts: [call('r2', 'list_blueprint', { granularity: ['phase'] })], stopReason: 'tool_use' },
      { parts: [{ type: 'text', text: 'Still four.' }], stopReason: 'end' },
    ]
    await send({ sessionId, client: null, text: 'Check again' })

    expect(answerTo('r2').result).toMatch(/^\d+ of \d+:/)
    expect(answerTo('r2').isError).toBeUndefined()
  })

  it('runs the verification re-read a write asks for, because the write retires the record', async () => {
    // The write tools say so themselves — "re-read the blueprint for the new
    // lane ids". A record that outlived the write would refuse that re-read
    // and point the model at a description of the board BEFORE its own edit.
    setActiveService({ id: 'svc-1', slug: 'rooftop-retrofit', name: 'Rooftop Retrofit' })
    provider.turns = [
      { parts: [call('r1', 'list_blueprint', { granularity: ['phase'] })], stopReason: 'tool_use' },
      { parts: [call('w1', 'create_phase', { name: 'Handover' })], stopReason: 'tool_use' },
      { parts: [call('r2', 'list_blueprint', { granularity: ['phase'] })], stopReason: 'tool_use' },
      { parts: [{ type: 'text', text: 'Five phases now.' }], stopReason: 'end' },
    ]

    const events = await send({ client, text: 'Add a Handover phase and check it landed' })

    expect(board.reads).toBe(2)
    expect(answerTo('r2')).toMatchObject({ result: 'board read 2' })
    expect(events.filter((event) => event.kind === 'tool')).toHaveLength(3)
    expect(
      events.some((event) => event.kind === 'tool' && event.summary === REPEAT_READ_SUPPRESSED),
    ).toBe(false)
  })

  it('observes the canvas again after moving it — a navigation call retires the record too', async () => {
    // `get_ui_state` takes no arguments, so its key never varies: without
    // this rule the SECOND call in a turn is suppressed forever, and a tool
    // documented as what the user is looking at RIGHT NOW would answer only
    // once, before any of the moves worth observing.
    provider.turns = [
      { parts: [call('u1', 'get_ui_state', {})], stopReason: 'tool_use' },
      { parts: [call('u2', 'get_ui_state', {})], stopReason: 'tool_use' },
      { parts: [call('i1', 'focus_cell', { cell_id: 'cell-1' })], stopReason: 'tool_use' },
      { parts: [call('u3', 'get_ui_state', {})], stopReason: 'tool_use' },
      { parts: [{ type: 'text', text: 'Here it is.' }], stopReason: 'end' },
    ]

    await send({ client: null, text: 'Show me that cell' })

    // Nothing moved between the first two, so the repeat is answered.
    expect(answerTo('u2')).toMatchObject({
      result: repeatReadRefusal('get_ui_state', ''),
      isError: true,
    })
    // The move happened, so the observation after it runs.
    expect(answerTo('u3')).toMatchObject({ result: NO_UI_STATE })
    expect(answerTo('u3').isError).toBeUndefined()
  })
})
