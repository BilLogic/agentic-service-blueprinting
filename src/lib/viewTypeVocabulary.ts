import type { SlideViewType } from '@/types/nav'

/**
 * The two view-type vocabularies and the only place they meet.
 *
 * The database CHECK constraint (supabase/schema.reference.sql:33) keeps the
 * historical tokens `single | side-by-side | integrated`. The client speaks
 * `single | stacked | merged` (Compare v3 — docs/plans/2026-08-06-003).
 * Everything above the two seams — the read seam in `phasesToSlides.ts` and
 * the write seam feeding `authoringRpc.ts` — uses client tokens only; the
 * grep gate in the plan enforces that in both directions.
 */
export type DbScenarioViewType = 'single' | 'side-by-side' | 'integrated'

/**
 * Read seam map. Persisted `'integrated'` rows keep coercing to the plain
 * stacked view — the same behavior the old `getSlideViewType` coercion gave
 * them — so no migration is needed and old data does not change meaning.
 */
export const dbToClientViewType = {
  single: 'single',
  'side-by-side': 'stacked',
  integrated: 'stacked',
} satisfies Record<DbScenarioViewType, SlideViewType>

/**
 * Write seam map. `'merged'` is session-only and must never reach a write —
 * callers must not persist it. It maps to `'side-by-side'` here only so the
 * map stays total for the `satisfies` exhaustiveness check.
 */
export const clientToDbViewType = {
  single: 'single',
  stacked: 'side-by-side',
  merged: 'side-by-side',
} satisfies Record<SlideViewType, DbScenarioViewType>

/**
 * Read-seam guard for raw DB strings: anything outside the CHECK-constraint
 * vocabulary falls back to the plain single view rather than crashing a
 * render on bad data.
 */
export function toClientViewType(raw: string): SlideViewType {
  return (
    (dbToClientViewType as Record<string, SlideViewType | undefined>)[raw] ??
    'single'
  )
}
