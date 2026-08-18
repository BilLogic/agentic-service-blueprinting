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
  SAMPLE_BLUEPRINTS_BY_SCENARIO,
  SAMPLE_DEMO_SLICES,
  SAMPLE_DEMO_SLICE_ITEMS,
} from '@/data/sampleBlueprint'
export { FALLBACK_NAV } from '@/types/nav'
