import type { ToolSpec } from '@/lib/agent/providers/provider'
import { toolSpec } from '@/lib/agent/tools/definition'
import { TOOL_DEFINITIONS } from '@/lib/agent/tools/definitions'

/**
 * The agent's entire reach, as the model sees it: one spec per definition.
 * Each write dispatches onto the SAME wrapper the UI calls, so RLS,
 * validation, session logging and revert capture come free; there is no
 * dynamic dispatch, no table name as an argument, no free SQL. A request
 * for anything else is a refusal, not an attempt. Deliberately absent: every
 * delete. Which of these one session is offered is `roster.ts`.
 */

/**
 * NAMING — the rule a tool here is named by.
 *
 * A tool name is `<verb>_<noun>`. The verb states the CONTRACT (what the
 * caller may assume about the result); the noun states the entity family.
 *
 *   search_  ranked matches for a query — truncated at k, snippets only
 *   list_    the COMPLETE set at a level — no query, always projected
 *   get_     named ids — full bodies, bounded BY the ids being required
 *   compare_ / measure_   derived, not stored
 *   create_ / update_ / upsert_ / duplicate_ / replace_   data writes
 *   set_     UI STATE ONLY — never a data write
 *   open_ / focus_   move the user's canvas
 *
 * `list_` and `search_` stay apart because their success criteria are
 * opposite: enumeration must be COMPLETE, ranking must be RELEVANT. A model
 * that reaches for a ranked door on an enumeration question gets a silent
 * top-k truncation and reports a partial set as the whole one. Nothing here
 * ranks yet; the verb is kept for the first read that does.
 *
 * `list_` and `get_` stay apart because `get_` REQUIRES ids, and that
 * requirement is the payload guardrail — it makes "every cell at full body"
 * impossible by construction rather than by a conditional check.
 *
 * NAME vs PARAMETER. A narrowing of the same records rides in a parameter
 * (`service`, `status`, `cell_id`); a different record type earns a name.
 * Evidence hangs off a cell but is not part of one, so it is `list_evidence`
 * rather than an option on `get_cell`. What a row owns outright — a cell's
 * resources — rides in that row's own read.
 *
 * A tool name is NOT a table name and NOT an RPC name. The agent tool
 * `create_step` dispatches to the Postgres RPC `add_step`; renaming one must
 * never rename the other.
 */

/**
 * The spec the model receives for every tool, derived from the definitions
 * in the order they are offered. Nothing is declared here: a tool's schema
 * is its zod `args`, and this table is a projection of it.
 */
export const TOOL_SPECS: ToolSpec[] = TOOL_DEFINITIONS.map(toolSpec)
