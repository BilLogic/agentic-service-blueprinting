/**
 * The contract the loop's retry rests on: a `fetch` that never completed
 * escapes an adapter as the bare `TypeError` the browser threw.
 *
 * The loop retries exactly that class and nothing else, so the classifier
 * is only correct while every adapter leaves the failure alone — no
 * try/catch around the call, no vendor SDK translating it into a
 * connection-error class of its own. Swapping one adapter for an SDK would
 * silently switch the retry off with the rest of the suite still green,
 * which is why this asserts the shape rather than trusting the reading.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { anthropicAdapter } from '@/lib/agent/providers/anthropic'
import { googleAdapter } from '@/lib/agent/providers/google'
import { openaiAdapter } from '@/lib/agent/providers/openai'
import type { ChatInput } from '@/lib/agent/providers/provider'

const request: ChatInput = {
  systemStable: 'You are under test.',
  systemVolatile: '',
  messages: [{ role: 'user', parts: [{ type: 'text', text: 'What phases are there?' }] }],
  tools: [],
  apiKey: 'test-key',
  model: 'test-model',
  signal: new AbortController().signal,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe.each([
  ['anthropic', anthropicAdapter],
  ['google', googleAdapter],
  ['openai', openaiAdapter],
])('%s, when the request never completes', (_id, adapter) => {
  it('lets the fetch TypeError out unwrapped, which is what the loop retries on', async () => {
    // WebKit's wording for it; Chromium says "Failed to fetch". The class
    // is the part that matters.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Load failed'))),
    )

    await expect(adapter.chat(request)).rejects.toBeInstanceOf(TypeError)
  })
})
