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
import {
  sampleGetBlueprint as readBlueprint,
  sampleGetCell as readCell,
  sampleListCellDependencies as readCellDependencies,
  sampleListBlueprint as readBlueprintList,
  sampleListLanes as readLanes,
  sampleListOwnerTags as readOwnerTags,
} from '@/lib/agent/tools/sampleRead'
import { PACKAGE_OFFLINE_BOARD } from '@/data/blueprintFallbacks'
import type { BlueprintListOptions } from '@/lib/agent/tools/format'
export { sampleGetSlice, sampleListSlices } from '@/lib/agent/tools/sampleRead'
/**
 * The app's own sample-data readers — the same functions the no-database
 * agent trial serves in the browser. The harness used to reimplement these
 * against the fixture and drifted from `read.ts` line by line; now there is
 * one implementation, over the same `src/data/sampleBlueprint` content, and
 * the harness's keyless run exercises it.
 *
 * Bound here to the PACKAGE's own board, which is the board the harness runs
 * against: it drives this repository's fixture with no deployment config
 * anywhere. In the browser the same functions take the board the provider
 * hands the canvas, so a deployment's trial reads a deployment's content. The
 * wrappers are typed against the real signatures, so a change to either breaks
 * this build rather than drifting.
 */
export const sampleGetBlueprint = (scenarioId: string) =>
  readBlueprint(PACKAGE_OFFLINE_BOARD, scenarioId)
export const sampleGetCell = (cellId: string) =>
  readCell(PACKAGE_OFFLINE_BOARD, cellId)
export const sampleListCellDependencies = (cellId?: string) =>
  readCellDependencies(PACKAGE_OFFLINE_BOARD, cellId)
export const sampleListBlueprint = (options: BlueprintListOptions) =>
  readBlueprintList(PACKAGE_OFFLINE_BOARD, options)
export const sampleListLanes = () => readLanes(PACKAGE_OFFLINE_BOARD)
export const sampleListOwnerTags = () => readOwnerTags(PACKAGE_OFFLINE_BOARD)
/**
 * The journey list's check, walk and text, so the harness's database read of
 * `list_blueprint` answers in the app's words: the harness fetches the rows
 * over REST and hands them to the same function the app's read does.
 */
export { formatBlueprintList, listBlueprintRequest } from '@/lib/agent/tools/format'
/**
 * The rest of the read surface's TEXT, for the same reason and by the same
 * rule: the harness fetches rows over REST and the app says what they read
 * as. Every one of these was a sentence run.mjs composed itself — the cast,
 * the evidence, the lanes, the arrows, the tags, the slices, the business
 * model and the findings, each with its own empty state — and a sentence
 * written twice is a sentence the app can reword while the harness goes on
 * saying the old one. `normalizeBlueprint` comes with them because the grid
 * read's text is a function of the app's own row shape, not of REST's.
 */
export {
  formatBusinessModel,
  formatCellDependencies,
  formatEvidenceDetail,
  formatEvidenceList,
  formatFindingsList,
  formatLaneVocabulary,
  formatOwnerTags,
  formatSliceDetail,
  formatSliceList,
  formatStakeholderList,
  formatBlueprints,
} from '@/lib/agent/tools/format'
export { NAME_AN_EVIDENCE_ID, NO_PATHS_IN_SCENARIO, noCellWithId } from '@/lib/agent/tools/read'
export { normalizeBlueprint } from '@/lib/normalizeBlueprint'
/**
 * The interface surface's two landed sentences and its one empty state. The
 * harness drives no canvas, so it answers `open_phase`, `open_scenario` and
 * `focus_cell` with what the bridge says when a navigation lands, and
 * `get_ui_state` with what the tool says when no shell is reporting.
 */
export { NO_UI_STATE } from '@/lib/agent/tools/definitions/ui'
export { CELL_CAMERA_SETTLED, cameraSettled } from '@/lib/agent/uiBridge'
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
 *
 * Every refusal the harness can reach is here. The two it cannot — the
 * sample trial's, which needs a session tier the harness has no flag for,
 * and the repeat read's, which the harness deliberately does not mirror —
 * stay app-only, and `refusals.ts` says at each why. A sentence exported
 * across this seam with no reader on the far side is a seam no test can
 * guard.
 */
export {
  BATCH_LIMIT_REFUSAL,
  MOBILE_SHELL_REFUSAL,
  NO_SEARCH_REFUSAL,
  VIEW_ONLY_REFUSAL,
  WRITE_BATCH_LIMIT,
  noSuchToolRefusal,
} from '@/lib/agent/tools/refusals'
/**
 * The rehearsal seam: the app's own call gate and a context whose client
 * records instead of writing. A dry-run write in the harness is the tool's
 * `run` through `runTool` against `rehearsalContext()`, so the sentence the
 * model reads back is the tool's own — the harness used to compose one per
 * write in the tool's name, and a sentence composed twice is a sentence that
 * drifts.
 */
export { runTool } from '@/lib/agent/tools/definition'
export { rehearsalContext } from '@/lib/agent/tools/rehearsal'
/**
 * The cell fields the agent may edit, derived the way `update_cell` derives
 * its arguments, so the harness's database read of a cell asks for the
 * columns the tool writes.
 */
import { agentCellFields } from '@/lib/agent/tools/definitions/cellArgs'
import { EDITABLE_CELL_FIELDS } from '@/lib/cellFields'
export const AGENT_CELL_FIELDS = agentCellFields(EDITABLE_CELL_FIELDS)
