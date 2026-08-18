/**
 * The harness's one-sourcing seam: rolldown bundles this entry at startup,
 * so the tool declarations the harness offers a provider are the EXACT
 * objects the app hands its providers — and the offline reads the harness
 * runs keyless are the EXACT functions the app serves in the browser.
 * No copies, so no drift.
 */
export {
  TOOL_SPECS,
  WRITE_TOOL_NAMES,
  MOBILE_READ_TOOL_NAMES,
} from '@/lib/agent/tools/specs'
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
  sampleListOwnerTags,
  sampleListScenarios,
  sampleListSlices,
} from '@/lib/agent/tools/sampleRead'
