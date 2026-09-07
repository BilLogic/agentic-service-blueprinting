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

const BASE = 'https://api.openai.com/v1'

type OpenAiToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

type OpenAiMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OpenAiToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

function toMessages(system: string, messages: AgentMessage[]): OpenAiMessage[] {
  const out: OpenAiMessage[] = [{ role: 'system', content: system }]
  for (const message of messages) {
    switch (message.role) {
      case 'user':
        out.push({
          role: 'user',
          content: message.parts.map((p) => p.text).join('\n'),
        })
        break
      case 'assistant': {
        const text = message.parts
          .filter((p): p is AgentTextPart => p.type === 'text')
          .map((p) => p.text)
          .join('\n')
        const calls = message.parts
          .filter((p): p is AgentToolCallPart => p.type === 'tool_call')
          .map(
            (p): OpenAiToolCall => ({
              id: p.id,
              type: 'function',
              function: { name: p.name, arguments: JSON.stringify(p.args) },
            }),
          )
        out.push({
          role: 'assistant',
          content: text || null,
          ...(calls.length > 0 ? { tool_calls: calls } : {}),
        })
        break
      }
      case 'tool':
        // One tool-role message per result — the API pairs them by id.
        for (const part of message.parts)
          out.push({ role: 'tool', tool_call_id: part.toolCallId, content: part.result })
        break
    }
  }
  return out
}

export const openaiAdapter: AgentProviderAdapter = {
  id: 'openai',
  async chat(input: ChatInput): Promise<ChatResult> {
    const response = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${input.apiKey}`,
      },
      signal: input.signal,
      body: JSON.stringify({
        model: input.model,
        messages: toMessages(input.system, input.messages),
        ...(input.tools.length > 0
          ? {
              tools: input.tools.map((tool) => ({
                type: 'function',
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters,
                },
              })),
            }
          : {}),
      }),
    })
    if (!response.ok)
      throw new ProviderError('openai', response.status, await readErrorDetail(response))

    const body = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string | null; tool_calls?: OpenAiToolCall[] }
        finish_reason?: string
      }>
    }
    const choice = body.choices?.[0]
    const parts: Array<AgentTextPart | AgentToolCallPart> = []
    if (choice?.message?.content)
      parts.push({ type: 'text', text: choice.message.content })
    for (const call of choice?.message?.tool_calls ?? []) {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(call.function.arguments) as Record<string, unknown>
      } catch {
        // Malformed arguments reach the tool lane as empty args; the tool's
        // own validation reports the miss back to the model.
      }
      parts.push({ type: 'tool_call', id: call.id, name: call.function.name, args })
    }
    return {
      parts,
      stopReason: choice?.finish_reason === 'tool_calls' ? 'tool_use' : 'end',
    }
  },
}
