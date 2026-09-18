/**
 * The prompt crosses the seam in two parts, and each adapter spends them
 * the way its provider understands: the one that caches puts its
 * breakpoint between them, the two that do not concatenate.
 *
 * The parts arrive already separated, so no adapter computes where the
 * stable part ends. That arithmetic is what this suite exists to keep
 * gone: an index into a joined prompt could land inside a skill body, and
 * a cache entry cut mid-skill matches nothing on the next round — a silent
 * failure, paid for in tokens rather than in a red test.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { anthropicAdapter } from '@/lib/agent/providers/anthropic'
import { googleAdapter } from '@/lib/agent/providers/google'
import { openaiAdapter } from '@/lib/agent/providers/openai'
import type { ChatInput } from '@/lib/agent/providers/provider'

const STABLE = 'ROLE and adapter.\n\n--- active skill: /sb:map ---\nMAP BODY ENDS HERE'
const VOLATILE = '\n\n--- current context ---\nPhase 2 is open.'

const request = (over: Partial<ChatInput> = {}): ChatInput => ({
  systemStable: STABLE,
  systemVolatile: VOLATILE,
  messages: [{ role: 'user', parts: [{ type: 'text', text: 'Hello.' }] }],
  tools: [],
  apiKey: 'test-key',
  model: 'test-model',
  signal: new AbortController().signal,
  ...over,
})

/** The body one adapter call put on the wire. */
const sentBody = async (
  adapter: { chat(input: ChatInput): Promise<unknown> },
  input: ChatInput,
): Promise<Record<string, unknown>> => {
  let sent = ''
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      sent = init.body
      return new Response(JSON.stringify({ content: [], candidates: [], choices: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }),
  )
  await adapter.chat(input)
  return JSON.parse(sent) as Record<string, unknown>
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the adapter that caches', () => {
  it('sends the two parts as two blocks, with the breakpoint on the stable one', async () => {
    const body = await sentBody(anthropicAdapter, request())
    expect(body.system).toEqual([
      { type: 'text', text: STABLE, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: VOLATILE },
    ])
  })

  // The invariant the old character index protected — that the breakpoint
  // lands past every skill body and never inside one — is no longer an
  // adapter invariant: the adapter has no index and cannot cut. It is now a
  // fact about the ASSEMBLY, and it is pinned there, in loop.test.tsx.

  it('sends one block when nothing is volatile, rather than an empty second one', async () => {
    const body = await sentBody(anthropicAdapter, request({ systemVolatile: '' }))
    expect(body.system).toEqual([
      { type: 'text', text: STABLE, cache_control: { type: 'ephemeral' } },
    ])
  })

  // The two below guard the TYPE's empty cases, not any session this seam
  // has: `buildStableSystem` unconditionally emits the role and the
  // canvas-adapter header, so no real send arrives with an empty stable part.
  // `string` admits '' though, and an empty text block is a 400 — a bad way
  // to discover the type was wider than the sessions.
  it('drops an empty stable part rather than sending an empty block (type-level case: no session has one)', async () => {
    const body = await sentBody(
      anthropicAdapter,
      request({ systemStable: '', systemVolatile: VOLATILE }),
    )
    expect(body.system).toEqual([{ type: 'text', text: VOLATILE }])
  })

  it('leaves the system field unsent when BOTH parts are empty (type-level case: no session has one)', async () => {
    const body = await sentBody(
      anthropicAdapter,
      request({ systemStable: '', systemVolatile: '' }),
    )
    expect(body).not.toHaveProperty('system')
  })
})

describe('the adapters that do not cache', () => {
  it('google concatenates the parts, in that order, and loses neither', async () => {
    const body = await sentBody(googleAdapter, request())
    expect(body.systemInstruction).toEqual({ parts: [{ text: STABLE + VOLATILE }] })
  })

  it('openai concatenates the parts into its system turn', async () => {
    const body = await sentBody(openaiAdapter, request())
    const messages = body.messages as Array<{ role: string; content: string }>
    expect(messages[0]).toEqual({ role: 'system', content: STABLE + VOLATILE })
  })
})
