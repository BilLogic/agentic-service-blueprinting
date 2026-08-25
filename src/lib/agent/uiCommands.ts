/**
 * The no-blind-spots registry: every UI control the agent should reach
 * registers ONE named command here, from the component that owns its
 * state. The agent discovers what exists with list_ui_commands (live —
 * commands appear and disappear with their surfaces) and fires them with
 * ui_command. A new control ships with a 3-line registration or it is a
 * known gap the list itself exposes.
 *
 * Commands drive the interface only — anything touching data stays on
 * the write tools (ledger, batch limit, attribution).
 */

export type AgentUiCommand = {
  name: string
  /** Shown to the model verbatim — say what it does and what `arg` means. */
  summary: string
  /**
   * True when firing this command CHANGES DATA rather than just the view.
   * Undo is the case that matters: it reverts through the same delete RPCs
   * the tool surface deliberately withholds, so it has to count as a write
   * — batch-limited, attributed, and refused for a view-only session —
   * instead of slipping through as "interface only".
   */
  mutates?: boolean
  /** Return a short human-readable result; throw for failures. */
  run: (arg?: string) => string | Promise<string>
}

const commands = new Map<string, AgentUiCommand>()

export function registerAgentUiCommand(command: AgentUiCommand): () => void {
  commands.set(command.name, command)
  return () => {
    if (commands.get(command.name) === command) commands.delete(command.name)
  }
}

export function listAgentUiCommands(): string {
  if (commands.size === 0) return 'No UI commands are available right now.'
  return [...commands.values()]
    .map(
      (command) =>
        `${command.name} — ${command.summary}${command.mutates ? ' [changes data]' : ''}`,
    )
    .sort()
    .join('\n')
}

/** Presence probe — surfaces register commands while mounted, so "the cell
 * panel's commands exist" IS "the cell panel is open". */
export function hasAgentUiCommand(name: string): boolean {
  return commands.has(name)
}

/** Does this command change data? Unknown commands are treated as safe. */
export function agentUiCommandMutates(name: string): boolean {
  return commands.get(name)?.mutates === true
}

export async function runAgentUiCommand(
  name: string,
  arg?: string,
): Promise<string> {
  const command = commands.get(name)
  if (!command)
    return `No UI command "${name}" is available right now. list_ui_commands has the live list — commands come and go with the surfaces that own them.`
  return await command.run(arg)
}
