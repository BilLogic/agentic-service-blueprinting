/**
 * The harness's one-sourcing seam: rolldown bundles this entry at startup,
 * so the tool declarations the harness offers a provider are the EXACT
 * objects the app hands its providers — and the offline fixture the
 * harness reads is the EXACT sample content the app renders keyless.
 * No copies, so no drift.
 */
export {
  TOOL_SPECS,
  WRITE_TOOL_NAMES,
  MOBILE_READ_TOOL_NAMES,
} from '@/lib/agent/tools/specs'
export {
  SCALE_TEST_SCENARIO_ID,
  SCALE_TEST_HAPPY_PATH_FALLBACK,
  SCALE_TEST_ALTERNATIVE_PATH_FALLBACK,
  SCALE_TEST_EXCEPTION_PATH_FALLBACK,
  SCALE_TEST_DEMO_SLICES,
  SCALE_TEST_DEMO_SLICE_ITEMS,
} from '@/data/scaleFixture'
export { FALLBACK_NAV } from '@/types/nav'
/**
 * The app's own sample-data readers — the same functions the no-database
 * agent trial serves in the browser. The harness used to reimplement these
 * against the fixture and drifted from `read.ts` line by line; now there is
 * one implementation and the harness's keyless run exercises it.
 */
export {
  sampleGetBlueprint,
  sampleGetCell,
  sampleGetSlice,
  sampleListOwnerTags,
  sampleListScenarios,
  sampleListSlices,
} from '@/lib/agent/tools/sampleRead'
