import type { AgentProviderId } from '@/lib/agent/settings'

/**
 * Live model listings, straight from each provider's list-models endpoint —
 * "supports the latest models" by construction rather than by a hardcoded
 * list that goes stale. MODEL_OPTIONS in settings.ts survives only as the
 * no-key fallback. Results are cached per provider+key for the session.
 */

const cache = new Map<string, string[]>()

async function listGoogle(apiKey: string, signal?: AbortSignal): Promise<string[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(apiKey)}`,
    { signal },
  )
  if (!response.ok) throw new Error(`google models ${response.status}`)
  const body = (await response.json()) as {
    models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>
  }
  return (body.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => (m.name ?? '').replace(/^models\//, ''))
    .filter(Boolean)
}

async function listAnthropic(apiKey: string, signal?: AbortSignal): Promise<string[]> {
  const response = await fetch('https://api.anthropic.com/v1/models?limit=100', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    signal,
  })
  if (!response.ok) throw new Error(`anthropic models ${response.status}`)
  const body = (await response.json()) as { data?: Array<{ id?: string }> }
  return (body.data ?? []).map((m) => m.id ?? '').filter(Boolean)
}

/** Chat-capable ids only — the raw list is full of embeddings/audio/image models. */
const OPENAI_EXCLUDE =
  /(embed|whisper|tts|audio|dall-e|image|moderation|davinci|babbage|realtime|transcribe)/i

async function listOpenAi(apiKey: string, signal?: AbortSignal): Promise<string[]> {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { authorization: `Bearer ${apiKey}` },
    signal,
  })
  if (!response.ok) throw new Error(`openai models ${response.status}`)
  const body = (await response.json()) as { data?: Array<{ id?: string }> }
  return (body.data ?? [])
    .map((m) => m.id ?? '')
    .filter((id) => id && !OPENAI_EXCLUDE.test(id))
    .sort()
}

export async function listModels(
  provider: AgentProviderId,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const cacheKey = `${provider}:${apiKey.slice(-6)}`
  const hit = cache.get(cacheKey)
  if (hit) return hit
  const models =
    provider === 'google'
      ? await listGoogle(apiKey, signal)
      : provider === 'anthropic'
        ? await listAnthropic(apiKey, signal)
        : await listOpenAi(apiKey, signal)
  cache.set(cacheKey, models)
  return models
}
