import type { ToolDefinition } from '@/lib/agent/tools/definition'
import { TOOL_DEFINITIONS } from '@/lib/agent/tools/definitions'

/**
 * The Roster: which tools one session is offered. Derived, never listed —
 * the definition list filtered by the deployment's allowlist and by each
 * tool's own availability for the mode the session is in. A tool reaches a
 * roster by being a definition that says it may run there, and a
 * deployment narrows the roster through its config rather than by editing
 * the template's tool files.
 */

/**
 * `agent.enabledTools` from the deployment config: an allowlist of tool
 * names, or absent for every tool. Set once at boot by the config provider,
 * the way the cell budget and the search plan are; a name it lists that no
 * definition declares is simply not there, and is not an error — a
 * deployment pinned to an older roster keeps working when a tool is renamed.
 */
let enabledTools: ReadonlySet<string> | null = null

export function configureAgentTools(next: readonly string[] | undefined): void {
  enabledTools = next ? new Set(next) : null
}

/**
 * Whether the deployment allows a tool at all. The roster applies this once;
 * the loop applies it again per call, because a model can emit a name it
 * remembered from another deployment, and a tool the config disabled must be
 * refused there rather than run.
 */
export function toolEnabled(name: string): boolean {
  return !enabledTools || enabledTools.has(name)
}

/** The session facts a roster is derived from. */
export type RosterMode = {
  /** No Supabase configured: reads answer from the bundled sample. */
  sampleTrial: boolean
  /** The mobile shell is up — view-only for every tier. */
  mobileReading: boolean
  /** A service account. Viewers get no write tools at all. */
  allowWrites: boolean
  /** Does ranked search exist for this session? `searchPlan.ts` decides. */
  searchOffered: boolean
}

/**
 * The tools one session may see, in the order the model is offered them.
 *
 * The three mode gates are ordered because each subsumes the ones below it:
 * a tool the trial may run is a read or a navigation, so it is one mobile
 * may run, so it is not a write. Ranked search sits OUTSIDE that order — it
 * is removed from whatever the gates produced, because whether the
 * deployment has a search function and whether this person's key can reach
 * its index are questions none of the gates ask.
 */
export function sessionRoster(
  mode: RosterMode,
  definitions: readonly ToolDefinition[] = TOOL_DEFINITIONS,
): ToolDefinition[] {
  return definitions.filter((tool) => {
    if (!toolEnabled(tool.name)) return false
    if (tool.name === 'search_blueprint' && !mode.searchOffered) return false
    if (mode.sampleTrial) return tool.availability.sample
    if (mode.mobileReading) return tool.availability.mobile
    return mode.allowWrites || tool.surface !== 'write'
  })
}
