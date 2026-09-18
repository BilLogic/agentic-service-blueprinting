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

  it('puts the breakpoint past EVERY skill body a message carries, never mid-skill', async () => {
    // The invariant the old character index was protecting: a message may
    // name several skills, and each body is thousands of tokens. A
    // breakpoint that lands inside the second body caches a prefix that
    // never recurs, so every round pays for the whole prompt again.
    const twoSkills = [
      'ROLE and adapter.',
      '\n\n--- active skill: /sb:map ---\nMAP BODY, last line.',
      '\n\n--- active skill: /sb:audit ---\nAUDIT BODY, last line.',
    ].join('')
    const body = await sentBody(
      anthropicAdapter,
      request({ systemStable: twoSkills }),
    )
    const blocks = body.system as Array<{ text: string; cache_control?: unknown }>
    const cached = blocks.filter((block) => block.cache_control)
    expect(cached).toHaveLength(1)
    expect(cached[0]!.text).toContain('MAP BODY, last line.')
    expect(cached[0]!.text).toContain('AUDIT BODY, last line.')
    // Nothing of a skill leaks past the breakpoint into the uncached tail.
    expect(blocks[1]!.text).not.toContain('BODY')
  })

  it('sends one plain prompt when nothing is stable — an empty block is a 400', async () => {
    const body = await sentBody(
      anthropicAdapter,
      request({ systemStable: '', systemVolatile: VOLATILE }),
    )
    expect(body.system).toBe(VOLATILE)
  })

  it('sends one block when nothing is volatile, rather than an empty second one', async () => {
    const body = await sentBody(anthropicAdapter, request({ systemVolatile: '' }))
    expect(body.system).toEqual([
      { type: 'text', text: STABLE, cache_control: { type: 'ephemeral' } },
    ])
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
