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
  /**
   * The prompt's stable part: role, canvas adapter, deployment doctrine and
   * every skill body this message carries. Byte-identical across a send's
   * rounds while the roster holds, so a provider that caches prompts pays
   * for its ~6-8k tokens once instead of up to MAX_ROUNDS times.
   */
  systemStable: string
  /**
   * The prompt's volatile part: the live UI context and the notes true of
   * this send only. It changes every round, so it must sit BEHIND the
   * stable part — a caching provider that saw them as one string would
   * miss on every round.
   */
  systemVolatile: string
  messages: AgentMessage[]
  tools: ToolSpec[]
  apiKey: string
  model: string
  signal: AbortSignal
}

/**
 * The whole prompt, for adapters whose provider has no caching concept:
 * they concatenate rather than each spelling the join, so a prompt that
 * reaches one of them can never differ from the prompt that reaches the
 * one that splits.
 */
export function wholeSystem(input: ChatInput): string {
  return input.systemStable + input.systemVolatile
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
