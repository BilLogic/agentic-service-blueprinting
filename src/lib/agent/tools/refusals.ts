/**
 * The sentences the loop answers a tool call with when it will not run it,
 * the status row it shows when the batch limit bites, and the one limit
 * both quote. Next to the tool definitions because they are the tool
 * layer's other answers: what a call gets back when no definition runs. In
 * one module because two readers speak them: the app's loop, and the eval
 * harness, which rehearses the same gates under Node and used to carry its
 * own copy of each sentence that drifted the moment the loop's was edited.
 * The harness bundles this file through its surface entry, so the words it
 * grades against are the words the app says.
 *
 * Each refusal says the second thing only — that the tool does not exist in
 * THIS session, or what to do instead — never the first: a model has no
 * business learning why a deployment narrowed its roster or which provider
 * key a person holds.
 */

/** Writes a model may land in one send before the loop asks it to check in. */
export const WRITE_BATCH_LIMIT = 8

/** Disabled by the deployment's allowlist, or a name the model invented. */
export function noSuchToolRefusal(name: string): string {
  return `There is no ${name} tool in this session.`
}

/** No database: the trial reads the bundled sample and has no write tool at all. */
export const SAMPLE_TRIAL_REFUSAL =
  'No database is connected — this session reads the bundled sample blueprint and has no write tools. Describe the change instead; authoring needs a connected database.'

/** The mobile shell is view-only for every tier. */
export const MOBILE_SHELL_REFUSAL =
  'The mobile shell is view-only — only the reading and navigation tools exist here. Editing happens on desktop; describe the change instead.'

/** Ranked search is not on this session's roster; the tool "does not exist". */
export const NO_SEARCH_REFUSAL =
  'There is no search_blueprint tool in this session. Use list_blueprint for what exists at a level, and get_blueprint for one scenario.'

/** A signed-in viewer who is not a service account. */
export const VIEW_ONLY_REFUSAL =
  'This session is view-only (not a service account) — no write tools exist here. Describe the change for a service account instead.'

/** The batch etiquette, enforced: after the limit, writes bounce with the check-in instruction. */
export const BATCH_LIMIT_REFUSAL = `Batch limit: ${WRITE_BATCH_LIMIT} writes already landed this turn. Stop now, summarize what you did, and let the user say "continue" before the next batch.`

/** The status row the transcript shows once per round when the batch limit bites. */
export const BATCH_PAUSED_STATUS = `Paused after ${WRITE_BATCH_LIMIT} writes — reply "continue" for the next batch.`

/**
 * A read whose name and arguments the turn has already dispatched. The
 * result is in the conversation and is deliberately NOT restated: the
 * duplicated payload is half of what a repeat costs — the round it arrives
 * on is already spent — and it is the half this refusal can still save, so
 * the model gets a pointer back to the result rather than a second copy.
 *
 * `args` is the caller's one-line rendering of the arguments. It is there
 * because a turn can hold several reads of one tool at different targets,
 * and a refusal naming only the tool would leave the model to work out
 * WHICH earlier result it is being sent back to. It labels the call; it
 * never carries the payload — and the sentence still says the match was on
 * the exact arguments when the rendering comes back empty.
 */
export function repeatReadRefusal(name: string, args: string): string {
  return `${name}${args ? ` (${args})` : ''} already ran this turn with these exact arguments — its result is earlier in this conversation and is not repeated here. Read it there, or call with different arguments.`
}

/** How a transcript row marks a repeat the loop answered instead of running. */
export const REPEAT_READ_SUPPRESSED = 'Suppressed — already run this turn'
