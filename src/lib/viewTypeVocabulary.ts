import type { SlideViewType } from '@/types/nav'

/**
 * The two view-type vocabularies and the only place they meet.
 *
 * The database CHECK constraint keeps the historical tokens
 * `single | side-by-side | integrated`. The client speaks
 * `single | stacked | merged` (Compare v3). Everything above the two seams —
 * the read seam in `phasesToSlides.ts` and any future write seam — uses
 * client tokens only.
 */
export type DbScenarioViewType = 'single' | 'side-by-side' | 'integrated'

/**
 * Read seam map. Persisted `'integrated'` rows coerce to the plain stacked
 * view — no migration is needed and old data does not change meaning.
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
