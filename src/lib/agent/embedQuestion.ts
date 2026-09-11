import type { AgentSearchIndex } from '@/deploymentConfig'

/**
 * Turn a person's search question into a vector, with the person's OWN key.
 *
 * ── WHY THE KEY IS THE PERSON'S ───────────────────────────────────────────
 *
 * Meaning search needs two vectors in one space: the question, and every cell
 * already in the index. Those cannot come from one key, and this module only
 * ever does the first. The deployment's own bot, with a server-held
 * credential, embeds the cells; the template holds no such credential, builds
 * no index, and has no server to run one on. What it has is the key the person
 * is already chatting with, kept in their browser and sent to nobody but their
 * own provider — so the question's half of the pair is the half this code can
 * honestly do.
 *
 * The consequence is a hard constraint, not a preference: the model and the
 * size used here MUST be the ones the deployment's index was built with, which
 * is why every call takes an {@link AgentSearchIndex} entry rather than a model
 * name chosen locally. Mixing spaces does not degrade ranking gracefully — the
 * database is expected to raise `embedding model mismatch`.
 *
 * ── WHAT NEVER HAPPENS TO THE KEY ─────────────────────────────────────────
 *
 * It goes to the provider's own embedding endpoint and nowhere else: not to
 * the blueprint's database, not to the deployment, not into a log line, not
 * into the transcript, and not into a URL. Google's chat transport puts its
 * key in `?key=`, and this deliberately does NOT copy that: a query string is
 * carried in browser history, in proxy logs and in `Referer` headers, so the
 * key rides in `x-goog-api-key` instead. Changing that is a privacy
 * regression, and `embedQuestion.test.ts` fails if a key ever reaches a URL.
 */

/** The provider's own embedding endpoints. Header auth on both. */
const GOOGLE_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const OPENAI_BASE = 'https://api.openai.com/v1'

/**
 * Google's task type for the QUESTION side of retrieval.
 *
 * Asymmetric on purpose: a question and the document that answers it are not
 * the same kind of text, and Gemini's embedding models place them accordingly.
 * The cells the deployment indexed must therefore have been embedded as
 * `RETRIEVAL_DOCUMENT` — the contract doc says so in as many words, because
 * getting this pair backwards produces an index that scores plausibly and
 * ranks badly, which is the failure nobody notices.
 */
const GOOGLE_TASK_TYPE = 'RETRIEVAL_QUERY'

/**
 * A failed embed. Separate from a database error so the caller can tell "the
 * meaning arm could not run" from "the search itself broke" — the first falls
 * back to keyword and structural matching, the second surfaces.
 */
export class EmbedQuestionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmbedQuestionError'
  }
}

async function embedWithGoogle(
  question: string,
  index: AgentSearchIndex,
  apiKey: string,
  signal?: AbortSignal,
): Promise<number[]> {
  const response = await fetch(
    `${GOOGLE_BASE}/models/${encodeURIComponent(index.model)}:embedContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // NOT `?key=` — see the module header.
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: `models/${index.model}`,
        content: { parts: [{ text: question }] },
        taskType: GOOGLE_TASK_TYPE,
        outputDimensionality: index.dimensions,
      }),
      signal,
    },
  )
  if (!response.ok)
    throw new EmbedQuestionError(`google embed ${response.status}`)
  const body = (await response.json()) as {
    embedding?: { values?: number[] }
  }
  const values = body.embedding?.values
  if (!values?.length)
    throw new EmbedQuestionError('google embed returned no vector')
  return values
}

async function embedWithOpenAi(
  question: string,
  index: AgentSearchIndex,
  apiKey: string,
  signal?: AbortSignal,
): Promise<number[]> {
  const response = await fetch(`${OPENAI_BASE}/embeddings`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: index.model,
      input: question,
      // The listed size, always sent: OpenAI's default is the model's full
      // width, and an index built at 768 cannot score a 1536-wide question.
      dimensions: index.dimensions,
    }),
    signal,
  })
  if (!response.ok)
    throw new EmbedQuestionError(`openai embed ${response.status}`)
  const body = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>
  }
  const values = body.data?.[0]?.embedding
  if (!values?.length)
    throw new EmbedQuestionError('openai embed returned no vector')
  return values
}

/**
 * Embed one question for one index entry, or throw {@link EmbedQuestionError}.
 *
 * Anthropic never reaches here — it has no embedding model, so it is never a
 * listed index provider and `agentSearchPlan` does not offer the tool to a
 * person holding only an Anthropic key. The exhaustive switch keeps that true
 * by construction rather than by comment.
 */
export async function embedQuestion(input: {
  question: string
  index: AgentSearchIndex
  apiKey: string
  signal?: AbortSignal
}): Promise<number[]> {
  const { question, index, apiKey, signal } = input
  if (!apiKey) throw new EmbedQuestionError('no key for the question')
  switch (index.provider) {
    case 'google':
      return embedWithGoogle(question, index, apiKey, signal)
    case 'openai':
      return embedWithOpenAi(question, index, apiKey, signal)
  }
}
