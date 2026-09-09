/**
 * Identity over a Supabase session: the tier is ASKED, not inferred.
 *
 * The seam this implements is `is_service_account()`, a database function
 * every write RPC asserts in its own body and every restrictive write policy
 * ANDs with. It is granted EXECUTE to `anon` and `authenticated`, so the
 * client can call it — and calling it is the whole idea here. The alternative
 * the app used to run was to read `app_metadata.role` out of the JWT and
 * decide locally what the database would have said. That reimplements a rule
 * the database already owns, in a second place, where it can disagree.
 *
 * It disagreed in exactly the way that costs the most. The seam ships as
 * `select true` — a single-tier deployment where every signed-in session
 * edits — and an OPTIONAL recipe replaces it with the JWT read, splitting
 * `authenticated` into editors and viewers. A client inferring from the
 * claim's absence has to guess which of those two databases it is talking to,
 * and it guesses once, at build time, for every adopter. Guess permissive and
 * a viewer is handed the whole editing UI and refused by Postgres on every
 * save; guess strict and an adopter who skipped the recipe sees a read-only
 * app with no toggle and no error, which looks like a broken build.
 *
 * Asking costs one round trip on sign-in and is right in both postures,
 * including the one where an adopter deletes the recipe outright.
 *
 * Two things this deliberately does NOT do:
 *
 *   * It does not read the claim as a fallback. A session carrying
 *     `role: 'service'` against a database that says no is a viewer, because
 *     the database is what refuses the write. A fallback would restore the
 *     disagreement this exists to end.
 *   * It does not answer `authoring`. That tier means "writes the records
 *     about the board but not its structure", and this backend has no such
 *     session: one predicate gates the structure RPCs, the spec columns, the
 *     slices and the evidence alike. A signed-in session outside the tier
 *     writes nothing, which is `anon`.
 *
 * A failed ask answers `anon`. The database is the wall either way, so the
 * only thing at stake is which buttons render, and rendering a save that
 * cannot succeed is the worse of the two mistakes.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { IdentityPort, Tier } from '../ports'

/** The tier seam, as the database exposes it over the Data API. */
export const TIER_SEAM = 'is_service_account'

export function createSupabaseIdentity(
  client: SupabaseClient<Database>,
): IdentityPort {
  return {
    async currentTier(): Promise<Tier> {
      const { data } = await client.auth.getSession()
      // No session, no round trip: the seam's permissive default answers
      // `true` to anyone who asks, including anon, and a deployed visitor
      // writing nothing is settled before the database is involved.
      if (!data.session) return 'anon'

      const { data: inTier, error } = await client.rpc(TIER_SEAM)
      if (error) return 'anon'
      return inTier === true ? 'service' : 'anon'
    },
  }
}
