import {
  ProviderError,
  readErrorDetail,
  type AgentMessage,
  type AgentProviderAdapter,
  type AgentTextPart,
  type AgentToolCallPart,
  type ChatInput,
  type ChatResult,
} from './provider'

const BASE = 'https://api.anthropic.com/v1'

type AnthropicBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

type AnthropicMessage = { role: 'user' | 'assistant'; content: AnthropicBlock[] }

function toMessages(messages: AgentMessage[]): AnthropicMessage[] {
  return messages.map((message): AnthropicMessage => {
    switch (message.role) {
      case 'user':
        return {
          role: 'user',
          content: message.parts.map((p) => ({ type: 'text' as const, text: p.text })),
        }
      case 'assistant':
        return {
          role: 'assistant',
          content: message.parts.map((part): AnthropicBlock =>
            part.type === 'text'
              ? { type: 'text', text: part.text }
              : { type: 'tool_use', id: part.id, name: part.name, input: part.args },
          ),
        }
      case 'tool':
        // Tool results ride a user-role turn in the Messages API.
        return {
          role: 'user',
          content: message.parts.map((part): AnthropicBlock => ({
            type: 'tool_result',
            tool_use_id: part.toolCallId,
            content: part.result,
            ...(part.isError ? { is_error: true } : {}),
          })),
        }
    }
  })
}

export const anthropicAdapter: AgentProviderAdapter = {
  id: 'anthropic',
  async chat(input: ChatInput): Promise<ChatResult> {
    const response = await fetch(`${BASE}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': input.apiKey,
        'anthropic-version': '2023-06-01',
        // Browser-direct calls are an explicit opt-in with Anthropic; the
        // BYO-key design accepts this (key is the user's own, localStorage).
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      signal: input.signal,
      body: JSON.stringify({
        model: input.model,
        max_tokens: 4096,
        // Prompt caching: the stable system prefix (role + adapter + skill,
        // ~6-8k tokens) is identical across a session's rounds and would
        // otherwise be re-paid up to MAX_ROUNDS× per send. Split it into
        // its own block with a cache breakpoint; the volatile tail (live
        // UI context) rides uncached behind it.
        system:
          input.systemStableLength && input.systemStableLength > 0
            ? [
                {
                  type: 'text',
                  text: input.system.slice(0, input.systemStableLength),
                  cache_control: { type: 'ephemeral' },
                },
                ...(input.system.length > input.systemStableLength
                  ? [
                      {
                        type: 'text',
                        text: input.system.slice(input.systemStableLength),
                      },
                    ]
                  : []),
              ]
            : input.system,
        messages: toMessages(input.messages),
        ...(input.tools.length > 0
          ? {
              // Tools precede system in the cache order — a breakpoint on
              // the last tool caches the whole tool array too.
              tools: input.tools.map((tool, index) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.parameters,
                ...(index === input.tools.length - 1
                  ? { cache_control: { type: 'ephemeral' } }
                  : {}),
              })),
            }
          : {}),
      }),
    })
    if (!response.ok)
      throw new ProviderError('anthropic', response.status, await readErrorDetail(response))

    const body = (await response.json()) as {
      content?: AnthropicBlock[]
      stop_reason?: string
    }
    const parts: Array<AgentTextPart | AgentToolCallPart> = []
    for (const block of body.content ?? []) {
      if (block.type === 'text') parts.push({ type: 'text', text: block.text })
      else if (block.type === 'tool_use')
        parts.push({ type: 'tool_call', id: block.id, name: block.name, args: block.input })
    }
    return {
      parts,
      stopReason: body.stop_reason === 'tool_use' ? 'tool_use' : 'end',
    }
  },
}
