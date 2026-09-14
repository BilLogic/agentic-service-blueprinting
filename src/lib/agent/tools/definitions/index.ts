import type { ToolDefinition } from '@/lib/agent/tools/definition'
import { getCellTool } from '@/lib/agent/tools/definitions/cells'

/**
 * Every tool that is a definition. The list grows one tool at a time as the
 * dispatcher's switch cases move here; a name present in this list is run
 * from it, and the switch never sees it.
 *
 * The check scripts that read tool names from source (`check:manifest`,
 * `check:read-surface`) read this folder alongside the spec table, so a
 * tool that moves here stays a tool they can see.
 */
export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [getCellTool]

const byName = new Map(TOOL_DEFINITIONS.map((tool) => [tool.name, tool]))

export function findToolDefinition(name: string): ToolDefinition | undefined {
  return byName.get(name)
}
