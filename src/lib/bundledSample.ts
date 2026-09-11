import { isSupabaseConfigured } from '@/lib/supabase'

/**
 * Is the template's bundled sample content allowed on screen at all?
 *
 * Once a deployment has a database, that database is the whole truth: what it
 * holds is the board, and what it lacks is a hole. The sample — the
 * meta-blueprint in `src/data/sampleBlueprint.ts` and the generated registry
 * over it — exists so a fresh clone is explorable before anyone connects a
 * backend, and that is the only state it is reachable in. Connecting a backend
 * hides it permanently.
 *
 * The question is deliberately NOT "did this read come back empty". An
 * adopter's board with a gap must draw the gap; filling it from the sample
 * hands them a blueprint of this template under their own path names, and nothing
 * on screen says so.
 *
 * It asks `isSupabaseConfigured()` rather than re-reading the environment, so
 * "configured" here and the `configured` the provider hands the app cannot
 * drift apart.
 */
export function isBundledSampleActive(): boolean {
  return !isSupabaseConfigured()
}
