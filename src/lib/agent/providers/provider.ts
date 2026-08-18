import type { AgentProviderId } from '@/lib/agent/settings'

/**
 * One neutral message shape, three provider dialects. Adapters translate;
 * nothing outside this directory speaks a provider's native format.
 *
 * v1 is non-streaming on purpose: the tool loop is the product, and a
 * complete-response loop is testable end to end without SSE parsing.
 * Streaming is an adapter-internal upgrade later — the ChatResult contract
 * does not change.
 */

export type AgentTextPart = {
  type: 'text'
  text: string
  /** Provider-opaque reasoning signature (Gemini 3 thoughtSignature) —
   * captured on parse and echoed back verbatim on replay. */
  signature?: string
}

export type AgentToolCallPart = {
  type: 'tool_call'
  /** Provider-issued id, echoed back on the matching tool_result. */
  id: string
  name: string
  args: Record<string, unknown>
  /** Gemini 3 requires function calls to be replayed WITH their
   * thoughtSignature — omitting it is a 400. Opaque; echo verbatim. */
  signature?: string
}

export type AgentToolResultPart = {
  type: 'tool_result'
  toolCallId: string
  name: string
  /** Stringified result — providers all take text; JSON goes in as JSON text. */
  result: string
  isError?: boolean
}

export type AgentMessage =
  | { role: 'user'; parts: AgentTextPart[] }
  | { role: 'assistant'; parts: Array<AgentTextPart | AgentToolCallPart> }
  | { role: 'tool'; parts: AgentToolResultPart[] }

export type ToolSpec = {
  name: string
  description: string
  /** JSON Schema (object type, plain — no $refs, no $schema key). */
  parameters: Record<string, unknown>
}

export type ChatResult = {
  parts: Array<AgentTextPart | AgentToolCallPart>
  /** 'tool_use' means the loop must run the calls and go around again. */
  stopReason: 'end' | 'tool_use'
}

export type ChatInput = {
  system: string
  /**
   * Where the STABLE prefix of `system` ends (character index). Everything
   * before it — role, canvas adapter, skill — is byte-identical across a
   * session's rounds; everything after (live UI context, tier notes)
   * changes per send. Providers that support prompt caching split here so
   * the static prefix is paid for once, not up to 12× per send. Optional:
   * absent means "treat the whole system as volatile".
   */
  systemStableLength?: number
  messages: AgentMessage[]
  tools: ToolSpec[]
  apiKey: string
  model: string
  signal: AbortSignal
}

export type AgentProviderAdapter = {
  id: AgentProviderId
  chat(input: ChatInput): Promise<ChatResult>
}

/** Raised for non-2xx provider responses, with the decisive line kept. */
export class ProviderError extends Error {
  readonly status: number
  constructor(provider: AgentProviderId, status: number, detail: string) {
    super(`${provider} ${status}: ${detail}`)
    this.name = 'ProviderError'
    this.status = status
  }
}

export async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string } | string
    }
    if (typeof body.error === 'string') return body.error
    return body.error?.message ?? response.statusText
  } catch {
    return response.statusText
  }
}
