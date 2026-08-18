import {
  ProviderError,
  readErrorDetail,
  type AgentMessage,
  type AgentProviderAdapter,
  type AgentTextPart,
  type AgentToolCallPart,
  type ChatInput,
  type ChatResult,
  type ToolSpec,
} from './provider'

const BASE = 'https://generativelanguage.googleapis.com/v1beta'

type GooglePart = {
  text?: string
  functionCall?: { name: string; args: Record<string, unknown> }
  functionResponse?: { name: string; response: Record<string, unknown> }
  /** Gemini 3 reasoning signature — must ride back on replayed parts. */
  thoughtSignature?: string
  thought?: boolean
}

type GoogleContent = { role: 'user' | 'model'; parts: GooglePart[] }

/**
 * Gemini's schema dialect is an OpenAPI subset — it rejects JSON-Schema
 * bookkeeping keys. Strip them; the structural keys survive as-is.
 */
function toGoogleSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(schema)) {
    if (key === '$schema' || key === 'additionalProperties' || key === 'default')
      continue
    if (key === 'properties' && value && typeof value === 'object') {
      cleaned.properties = Object.fromEntries(
        Object.entries(value as Record<string, Record<string, unknown>>).map(
          ([name, prop]) => [name, toGoogleSchema(prop)],
        ),
      )
    } else if (key === 'items' && value && typeof value === 'object') {
      cleaned.items = toGoogleSchema(value as Record<string, unknown>)
    } else {
      cleaned[key] = value
    }
  }
  return cleaned
}

function toContents(messages: AgentMessage[]): GoogleContent[] {
  return messages.map((message): GoogleContent => {
    switch (message.role) {
      case 'user':
        return { role: 'user', parts: message.parts.map((p) => ({ text: p.text })) }
      case 'assistant':
        return {
          role: 'model',
          parts: message.parts.map((part): GooglePart =>
            part.type === 'text'
              ? {
                  text: part.text,
                  ...(part.signature ? { thoughtSignature: part.signature } : {}),
                }
              : {
                  functionCall: { name: part.name, args: part.args },
                  ...(part.signature ? { thoughtSignature: part.signature } : {}),
                },
          ),
        }
      case 'tool':
        // Gemini takes function results as user-role functionResponse parts.
        return {
          role: 'user',
          parts: message.parts.map((part) => ({
            functionResponse: {
              name: part.name,
              response: { result: part.result, ...(part.isError ? { error: true } : {}) },
            },
          })),
        }
    }
  })
}

export const googleAdapter: AgentProviderAdapter = {
  id: 'google',
  async chat(input: ChatInput): Promise<ChatResult> {
    const response = await fetch(
      `${BASE}/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(input.apiKey)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: input.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: toContents(input.messages),
          ...(input.tools.length > 0
            ? {
                tools: [
                  {
                    functionDeclarations: input.tools.map((tool: ToolSpec) => ({
                      name: tool.name,
                      description: tool.description,
                      parameters: toGoogleSchema(tool.parameters),
                    })),
                  },
                ],
              }
            : {}),
        }),
      },
    )
    if (!response.ok)
      throw new ProviderError('google', response.status, await readErrorDetail(response))

    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: GooglePart[] } }>
    }
    const rawParts = body.candidates?.[0]?.content?.parts ?? []
    const parts: Array<AgentTextPart | AgentToolCallPart> = []
    let call = 0
    for (const part of rawParts) {
      // Thought-summary parts (thought: true) are display-only — skip them;
      // replaying them corrupts the turn.
      if (part.thought) continue
      if (part.text)
        parts.push({
          type: 'text',
          text: part.text,
          ...(part.thoughtSignature ? { signature: part.thoughtSignature } : {}),
        })
      else if (part.functionCall)
        parts.push({
          type: 'tool_call',
          // Gemini issues no call ids; mint stable ones for the transcript.
          id: `call_${Date.now()}_${call++}`,
          name: part.functionCall.name,
          args: part.functionCall.args ?? {},
          ...(part.thoughtSignature ? { signature: part.thoughtSignature } : {}),
        })
    }
    return {
      parts,
      stopReason: parts.some((p) => p.type === 'tool_call') ? 'tool_use' : 'end',
    }
  },
}
