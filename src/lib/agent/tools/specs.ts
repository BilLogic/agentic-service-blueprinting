import type { ToolSpec } from '@/lib/agent/providers/provider'
import { toolSpec } from '@/lib/agent/tools/definition'
import { TOOL_DEFINITIONS } from '@/lib/agent/tools/definitions'

/**
 * The static allow-list — the agent's entire reach. Each write dispatches
 * onto the SAME wrapper the UI calls, so RLS, validation, session logging
 * and revert capture come free; there is no dynamic dispatch, no table
 * name as an argument, no free SQL. A request for anything else is a
 * refusal, not an attempt. Deliberately absent: every delete.
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
 * The mobile reading roster — the ONLY tools offered while the mobile shell
 * is up, for every tier including service accounts. Mobile is view-only by
 * decision (2026-08-08 plan): navigation, reading, and Q&A; no writes, no
 * canvas-mode switch, no annotation marks, no desktop-surface ui_commands.
 * A whitelist rather than a write-filter so a future tool defaults to
 * ABSENT on mobile until someone deliberately adds it here.
 *
 * This is a UX gate, not the security boundary — the server-side RPC tier
 * enforcement stays the real wall.
 */
export const MOBILE_READ_TOOL_NAMES = new Set([
  'get_reference',
  'list_references',
  'list_blueprint',
  // A phone asking "where do we chase a missing document" is the Q&A this
  // shell exists for, and ranked search is the read that answers it. Offered
  // here on the same terms as anywhere else: `searchPlan.ts` still decides
  // whether this session has it at all.
  'search_blueprint',
  'get_blueprint',
  'compare_blueprint',
  'get_cell',
  'list_lanes',
  'list_cell_dependencies',
  'list_slices',
  'get_slice',
  'list_owner_tags',
  'list_stakeholders',
  'list_evidence',
  'get_evidence',
  'get_business_model',
  'list_sessions',
  'get_session',
  'get_ui_state',
  'get_change_history',
  'open_phase',
  'open_scenario',
  'focus_cell',
  'open_cell_panel',
  'measure_deletion_impact',
  'list_findings',
])

/**
 * The no-database TRIAL roster — the only tools registered when the template runs
 * with no Supabase configured and the user has supplied a provider key. Every
 * entry resolves from the bundled sample blueprint (`tools/sampleRead.ts`) or
 * from the browser itself; nothing here touches a database, and no write tool
 * is present — absent, not refused.
 *
 * A whitelist rather than a write-filter, for the same reason the mobile
 * roster is one: a tool added later defaults to ABSENT in the trial until
 * someone deliberately puts it here and gives it a sample-data answer.
 */
export const SAMPLE_TRIAL_TOOL_NAMES = new Set([
  'get_reference',
  'list_references',
  'list_blueprint',
  'get_blueprint',
  'compare_blueprint',
  'get_cell',
  'list_lanes',
  'list_cell_dependencies',
  'list_slices',
  'get_slice',
  'list_owner_tags',
  'list_sessions',
  'get_session',
  'get_ui_state',
  'open_phase',
  'open_scenario',
  'focus_cell',
  'open_cell_panel',
])

/**
 * The tools that only READ — no row changes, and no effect on what the human
 * is looking at. `references/canvas-adapter.md` states this list as the FULL
 * read surface, and the agent reads that sentence as permission: a tool
 * missing from it is a tool it believes it cannot call. Both directions are
 * checked (scripts/check-read-surface.mjs), which is why this exists as a
 * named set rather than as "whatever is left over".
 */
export const READ_TOOL_NAMES = new Set([
  // A READ, not an interface call: it reports which controls exist right now
  // and touches neither the canvas nor a row. `ui_command`, which fires one,
  // is the interface call.
  'list_ui_commands',
  'get_reference',
  'list_references',
  'list_blueprint',
  // Classified as a read here even though it is OFTEN NOT OFFERED: this set
  // partitions `TOOL_SPECS`, and the spec exists in every build. Whether a
  // session may call it is `searchPlan.ts`'s question, not this set's.
  'search_blueprint',
  'get_blueprint',
  'compare_blueprint',
  'get_cell',
  'list_lanes',
  'list_cell_dependencies',
  'list_slices',
  'get_slice',
  'list_owner_tags',
  'list_stakeholders',
  'list_evidence',
  'get_evidence',
  'get_business_model',
  'list_sessions',
  'get_session',
  'get_ui_state',
  'get_change_history',
  'measure_deletion_impact',
  'list_findings',
])

/**
 * The tools that drive the interface. They change what the human SEES and
 * nothing else — except `ui_command`, whose "[changes data]" commands are a
 * write path but not a write tool (the loop counts those against the write
 * batch separately).
 *
 * Declared so the three sets partition TOOL_SPECS exactly (specs.test.ts). A
 * tool added to the roster and left unclassified fails that test, which is
 * what keeps READ_TOOL_NAMES from quietly becoming the next stale list.
 */
export const INTERFACE_TOOL_NAMES = new Set([
  'open_phase',
  'open_scenario',
  'focus_cell',
  'open_cell_panel',
  'set_canvas_mode',
  'set_sidebar',
  'annotate_cells',
  'ui_command',
])

/**
 * Which specs one session may see.
 *
 * Four gates, and they are NOT independent conditions on one list — they are
 * ordered, because each subsumes the ones below it. The no-database trial and
 * the mobile shell are whitelists that already exclude every write, so a write
 * filter applied after either would be dead code, and a reader who reorders
 * them gets a roster that is wrong in a way tests of individual gates would
 * miss. Ranked search sits OUTSIDE that order: it is removed from whatever the
 * other gates produced, because whether the deployment has a search function
 * and whether this person's key can reach its index are questions none of the
 * other three ask.
 *
 * A function rather than an expression inside the loop, so the ordering above
 * is stated once and tested directly.
 */
export function sessionRoster(
  specs: readonly ToolSpec[],
  session: {
    /** No Supabase configured: reads answer from the bundled sample. */
    sampleTrial: boolean
    /** The mobile shell is up — view-only for every tier. */
    mobileReading: boolean
    /** A service account. Viewers get no write tools at all. */
    allowWrites: boolean
    /** Does ranked search exist for this session? `searchPlan.ts` decides. */
    searchOffered: boolean
  },
): ToolSpec[] {
  return specs.filter((spec) => {
    if (spec.name === 'search_blueprint' && !session.searchOffered) return false
    if (session.sampleTrial) return SAMPLE_TRIAL_TOOL_NAMES.has(spec.name)
    if (session.mobileReading) return MOBILE_READ_TOOL_NAMES.has(spec.name)
    return session.allowWrites || !WRITE_TOOL_NAMES.has(spec.name)
  })
}

/** The tools that mutate data — the loop enforces batch etiquette on these. */
export const WRITE_TOOL_NAMES = new Set([
  'create_step',
  'create_lane',
  'upsert_cell',
  'update_cell',
  'create_cell_dependency',
  'update_path',
  'create_phase',
  'create_scenario',
  'create_path',
  'duplicate_path',
  'duplicate_scenario',
  'create_slice',
  'update_slice',
  'replace_slides',
  'create_evidence',
  'update_evidence',
  'create_finding',
  'update_finding',
  'create_stakeholder',
  'update_stakeholder',
])

/**
 * The spec the model receives for every tool, derived from the definitions
 * in the order they are offered. Nothing is declared here: a tool's schema
 * is its zod `args`, and this table is a projection of it.
 */
export const TOOL_SPECS: ToolSpec[] = TOOL_DEFINITIONS.map(toolSpec)
