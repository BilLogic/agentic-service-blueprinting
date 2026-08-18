/**
 * Offline / no-DB fallback for the slices surface — the derived-layer
 * counterpart to blueprintFallbacks.ts. The template ships two generated demo
 * slices over the sample scenario (see scripts/generate_scale_fixture.mjs);
 * an adopter's import pipeline replaces the fixture, and a database read
 * always wins over this module.
 */
import {
  SCALE_TEST_DEMO_SLICES,
  SCALE_TEST_DEMO_SLICE_ITEMS,
} from '@/data/scaleFixture'
import type { Slice, SliceItem } from '@/types/database'

export const FALLBACK_SLICES: Slice[] = SCALE_TEST_DEMO_SLICES

export const FALLBACK_SLICE_ITEMS: Record<string, SliceItem[]> =
  SCALE_TEST_DEMO_SLICE_ITEMS
