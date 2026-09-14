/**
 * The harness's one-sourcing seam: rolldown bundles this entry at startup,
 * so the tool declarations the harness offers a provider are the EXACT
 * objects the app hands its providers — and the offline reads the harness
 * runs keyless are the EXACT functions the app serves in the browser.
 * No copies, so no drift.
 */
export { TOOL_SPECS } from '@/lib/agent/tools/specs'
import { TOOL_DEFINITIONS } from '@/lib/agent/tools/definitions'
export { TOOL_DEFINITIONS }
/**
 * The adapter's surface rows are rendered from a roster when the app serves
 * the document; the harness renders them the same way against the roster
 * each case offers.
 */
export { renderCanvasAdapter } from '@/lib/agent/tools/references'
/**
 * The two rosters the harness gates on, derived here from the definitions
 * the way the app's roster derives them: a write is a tool on the write
 * surface, and the mobile roster is every tool whose availability says so.
 */
export const WRITE_TOOL_NAMES = new Set(
  TOOL_DEFINITIONS.filter((tool) => tool.surface === 'write').map((tool) => tool.name),
)
export const MOBILE_READ_TOOL_NAMES = new Set(
  TOOL_DEFINITIONS.filter((tool) => tool.availability.mobile).map((tool) => tool.name),
)
/**
 * The app's own sample-data readers — the same functions the no-database
 * agent trial serves in the browser. The harness used to reimplement these
 * against the fixture and drifted from `read.ts` line by line; now there is
 * one implementation, over the same `src/data/sampleBlueprint` content, and
 * the harness's keyless run exercises it.
 */
export {
  sampleGetBlueprint,
  sampleGetCell,
  sampleGetSlice,
  sampleListCellDependencies,
  sampleListBlueprint,
  sampleListLanes,
  sampleListOwnerTags,
  sampleListSlices,
} from '@/lib/agent/tools/sampleRead'
/**
 * The journey list's check, walk and text, so the harness's database read of
 * `list_blueprint` answers in the app's words: the harness fetches the rows
 * over REST and hands them to the same function the app's read does.
 */
export { formatBlueprintList, listBlueprintRequest } from '@/lib/agent/tools/format'
/**
 * The reference vocabulary, so `list_references` answers from the app's own
 * list rather than a second copy the harness would have to keep in step.
 */
export { REFERENCE_NAMES } from '@/lib/agent/tools/referenceNames'
/**
 * The loop's refusals and the batch limit they quote, so the harness's
 * rehearsal of the same gates answers in the loop's words. run.mjs carried
 * its own copy of each before, and a copy is a sentence the loop can change
 * without the harness noticing.
 */
export {
  BATCH_LIMIT_REFUSAL,
  MOBILE_SHELL_REFUSAL,
  VIEW_ONLY_REFUSAL,
  WRITE_BATCH_LIMIT,
} from '@/lib/agent/tools/refusals'
/**
 * The cell fields the agent may edit, derived the way `update_cell` derives
 * its arguments, so the harness's database read of a cell asks for the
 * columns the tool writes.
 */
import { agentCellFields } from '@/lib/agent/tools/definitions/cellArgs'
import { EDITABLE_CELL_FIELDS } from '@/lib/cellFields'
export const AGENT_CELL_FIELDS = agentCellFields(EDITABLE_CELL_FIELDS)
