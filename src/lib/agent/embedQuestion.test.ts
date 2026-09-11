import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmbedQuestionError, embedQuestion } from '@/lib/agent/embedQuestion'

/*
 * WHAT GOES ON THE WIRE when a person's own key embeds their question.
 *
 * Stubbed `fetch` throughout: no test here ever needs a real key, and the
 * request is the thing under test — the model and size must be the ones the
 * deployment's index was built with, the task type must be the question's
 * side of the retrieval pair, and the key must travel in a HEADER.
 *
 * The key-never-in-a-URL case is not a style preference. A query string is
 * kept in browser history, in proxy logs and in `Referer` headers, so a key
 * that reaches one has leaked somewhere the person cannot clean up. Chat's
 * Google transport does use `?key=`; this deliberately does not, and this
 * test is what keeps a later "make it consistent" from undoing it.
 */

const KEY = 'sk-a-persons-own-key-0123456789'

const GOOGLE_INDEX = {
  provider: 'google' as const,
  model: 'gemini-embedding-001',
  dimensions: 768,
}
const OPENAI_INDEX = {
  provider: 'openai' as const,
  model: 'text-embedding-3-small',
  dimensions: 768,
}

type Call = { url: string; init: RequestInit }

function stubFetch(response: unknown, ok = true): Call[] {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), init })
      return {
        ok,
        status: ok ? 200 : 429,
        json: async () => response,
      } as unknown as Response
    }),
  )
  return calls
}

function headerValue(init: RequestInit, name: string): string | undefined {
  const headers = init.headers as Record<string, string> | undefined
  if (!headers) return undefined
  const hit = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  )
  return hit?.[1]
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('embedQuestion — Google', () => {
  it('sends the index’s model, size and the question task type', async () => {
    const calls = stubFetch({ embedding: { values: [0.1, 0.2, 0.3] } })
    const vector = await embedQuestion({
      question: 'where do tutors get stuck?',
      index: GOOGLE_INDEX,
      apiKey: KEY,
    })
    expect(vector).toEqual([0.1, 0.2, 0.3])
    expect(calls).toHaveLength(1)
    const body = JSON.parse(String(calls[0].init.body))
    expect(calls[0].url).toContain('gemini-embedding-001:embedContent')
    expect(body.taskType).toBe('RETRIEVAL_QUERY')
    expect(body.outputDimensionality).toBe(768)
    expect(body.content.parts[0].text).toBe('where do tutors get stuck?')
  })

  it('puts the key in x-goog-api-key and NEVER in the URL', async () => {
    const calls = stubFetch({ embedding: { values: [1] } })
    await embedQuestion({
      question: 'anything',
      index: GOOGLE_INDEX,
      apiKey: KEY,
    })
    expect(headerValue(calls[0].init, 'x-goog-api-key')).toBe(KEY)
    expect(calls[0].url).not.toContain(KEY)
    expect(calls[0].url).not.toContain('key=')
    expect(calls[0].url).not.toContain(encodeURIComponent(KEY))
  })

  it('raises EmbedQuestionError on a rate limit, without quoting the key', async () => {
    stubFetch({}, false)
    const error = await embedQuestion({
      question: 'anything',
      index: GOOGLE_INDEX,
      apiKey: KEY,
    }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(EmbedQuestionError)
    expect(String((error as Error).message)).not.toContain(KEY)
  })

  it('raises when the provider answers without a vector', async () => {
    stubFetch({ embedding: {} })
    await expect(
      embedQuestion({ question: 'q', index: GOOGLE_INDEX, apiKey: KEY }),
    ).rejects.toBeInstanceOf(EmbedQuestionError)
  })
})

describe('embedQuestion — OpenAI', () => {
  it('sends the model and the listed size, keyed by an Authorization header', async () => {
    const calls = stubFetch({ data: [{ embedding: [0.5, 0.6] }] })
    const vector = await embedQuestion({
      question: 'late call-off',
      index: OPENAI_INDEX,
      apiKey: KEY,
    })
    expect(vector).toEqual([0.5, 0.6])
    const body = JSON.parse(String(calls[0].init.body))
    expect(calls[0].url).toBe('https://api.openai.com/v1/embeddings')
    expect(body.model).toBe('text-embedding-3-small')
    // Always sent: the model's default width is wider than this index.
    expect(body.dimensions).toBe(768)
    expect(headerValue(calls[0].init, 'authorization')).toBe(`Bearer ${KEY}`)
    expect(calls[0].url).not.toContain(KEY)
  })

  it('raises EmbedQuestionError on an outage', async () => {
    stubFetch({}, false)
    await expect(
      embedQuestion({ question: 'q', index: OPENAI_INDEX, apiKey: KEY }),
    ).rejects.toBeInstanceOf(EmbedQuestionError)
  })
})

describe('embedQuestion — no key', () => {
  it('raises rather than calling the provider keyless', async () => {
    const calls = stubFetch({ embedding: { values: [1] } })
    await expect(
      embedQuestion({ question: 'q', index: GOOGLE_INDEX, apiKey: '' }),
    ).rejects.toBeInstanceOf(EmbedQuestionError)
    expect(calls).toHaveLength(0)
  })
})
