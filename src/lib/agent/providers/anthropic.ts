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

/** A system text block; the cached one carries the breakpoint. */
type AnthropicSystemBlock = {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

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

/**
 * The system field, as the two parts of the prompt make it: one text block
 * each, the cache breakpoint on the stable one, and any empty part left out.
 * The rule that an empty block is a 400 is stated here once, for both parts
 * and for the case where neither has anything to say.
 */
function systemField(input: ChatInput): { system?: AnthropicSystemBlock[] } {
  const blocks = (
    [
      {
        type: 'text',
        text: input.systemStable,
        cache_control: { type: 'ephemeral' },
      },
      { type: 'text', text: input.systemVolatile },
    ] satisfies AnthropicSystemBlock[]
  ).filter((block) => block.text)
  return blocks.length > 0 ? { system: blocks } : {}
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
        // Prompt caching: the stable part (role + adapter + doctrine +
        // every skill body, ~6-8k tokens) is identical across a session's
        // rounds and would otherwise be re-paid up to MAX_ROUNDS times per
        // send. It arrives already separated, so the breakpoint goes
        // BETWEEN the two parts and this adapter cuts nothing: an index
        // into a single string could land mid-skill, and a cache entry cut
        // mid-skill matches nothing on the next round.
        //
        // An empty part is dropped rather than sent, because an empty text
        // block is a 400. That guards the TYPE, not any session this seam
        // has: `buildStableSystem` unconditionally emits the role and the
        // canvas-adapter header, so no real send arrives with an empty
        // stable part — but `string` admits '' and a 400 is a bad way to
        // find that out. Both parts empty leaves no blocks, and the field
        // goes unsent rather than as an empty array.
        ...systemField(input),
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
