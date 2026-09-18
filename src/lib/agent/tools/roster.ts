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
 * Why one session is not offered a tool: the ground its refusal is chosen
 * by. `admission.ts` is what turns each of these into the sentence the model
 * reads back, so nothing here spells a sentence.
 */
export type WithholdGround =
  | 'not-enabled'
  | 'no-search'
  | 'sample-trial'
  | 'mobile-reading'
  | 'view-only'

/** One session's answer about one tool. */
export type ToolStanding =
  | { offered: true }
  | { offered: false; ground: WithholdGround }

const OFFERED: ToolStanding = { offered: true }

/**
 * One session's standing on one tool — and THE one place the gates' order
 * and membership are written down.
 *
 * Two readers walk this: `sessionRoster` below walks every definition
 * through it to build the offer, and the loop's admission answer walks one
 * call through it to decide whether that call may run. They used to spell
 * the same five conditions separately, in different orders, agreeing only by
 * a prose note asking the next editor to keep them in step. The failure that
 * bought was not a tool running when it should not — both readers refused
 * the same set — it was the WORDS: a `search_blueprint` call on a
 * no-database trial trips the search gate and the trial gate at once, and
 * the call read back the trial's sentence while the roster had withheld the
 * tool for the search plan. Whichever reader was written first won, which
 * made the order of eight near-identical blocks load-bearing and invisible.
 *
 * THE GATES ARE APPLIED IN SEQUENCE, each on top of the last, rather than
 * one mode gate returning for all of them. The earlier shape leaned on a
 * subsumption — a tool the trial may run is a read or a navigation, so it is
 * one mobile may run, so it is not a write — which holds in the definitions
 * today and is nothing a reader of this function can see. Applying each gate
 * costs a comparison and stops the offer from depending on a claim about a
 * list somewhere else.
 *
 * `isWrite` is an ARGUMENT rather than a field read off `tool`, and it is the
 * one input the two readers do not share. The offer asks the definition
 * (`surface === 'write'`), because a list of tools is all an offer has. The
 * admission asks its own predicate, because `ui_command` is a write exactly
 * when its `command` argument names a mutating one, and no roster can hold an
 * argument. Same gate, same place in the order, two inputs.
 *
 * `tool` is absent for a name no definition declares — a name a model
 * invented, or remembered from another deployment. Such a name states no
 * availability, so every mode gate withholds it; on a session whose mode
 * gates all pass it is admitted here and answered by the dispatcher, which
 * is the reader that knows a name resolving to nothing.
 */
export function toolStanding(
  mode: RosterMode,
  tool: ToolDefinition | undefined,
  name: string,
  isWrite: boolean,
): ToolStanding {
  if (!toolEnabled(name)) return { offered: false, ground: 'not-enabled' }
  // Ranked search sits FIRST among the mode gates, not inside their order:
  // whether the deployment has a search function and whether this person's
  // key can reach its index are questions none of the others ask, and a
  // session told "no database" about a tool it was never offered for want of
  // an index has been told the wrong thing.
  if (name === 'search_blueprint' && !mode.searchOffered)
    return { offered: false, ground: 'no-search' }
  if (mode.sampleTrial && !tool?.availability.sample)
    return { offered: false, ground: 'sample-trial' }
  if (mode.mobileReading && !tool?.availability.mobile)
    return { offered: false, ground: 'mobile-reading' }
  if (isWrite && !mode.allowWrites) return { offered: false, ground: 'view-only' }
  return OFFERED
}

/**
 * The tools one session may see, in the order the model is offered them:
 * every definition whose standing above is `offered`. Nothing is filtered
 * here — the conditions live in `toolStanding`, because a call's admission
 * has to apply the same ones in the same order and a second copy of them is
 * exactly what this module exists to prevent.
 */
export function sessionRoster(
  mode: RosterMode,
  definitions: readonly ToolDefinition[] = TOOL_DEFINITIONS,
): ToolDefinition[] {
  return definitions.filter(
    (tool) => toolStanding(mode, tool, tool.name, tool.surface === 'write').offered,
  )
}
