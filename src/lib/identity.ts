/**
 * What may this session do? — asked of the database, not inferred.
 *
 * This is the SUPABASE rendering of that question, and the only one shipped: a
 * deployment on its own OIDC, or a single-user desktop build where the answer
 * is a constant, writes its own reader and keeps the `Tier` vocabulary below.
 * What travels is the vocabulary, not this function. What it answers with is
 * never a token, a claim name or a JWT — only what the session may do — and it
 * is a UI-level answer: the database still enforces it, and a client that lies
 * here changes what buttons render and nothing else.
 *
 * The seam it asks is `is_service_account()`, a database function every write
 * RPC asserts in its own body and every restrictive write policy ANDs with. It
 * is granted EXECUTE to `anon` and `authenticated`, so the client can call it —
 * and calling it is the whole idea. The alternative the app used to run was to
 * read `app_metadata.role` out of the JWT and decide locally what the database
 * would have said. That reimplements a rule the database already owns, in a
 * second place, where it can disagree.
 *
 * It disagreed in exactly the way that costs the most. The seam ships as
 * `select true` — a single-tier deployment where every signed-in session edits
 * — and an OPTIONAL recipe replaces it with the JWT read, splitting
 * `authenticated` into editors and viewers. A client inferring from the claim's
 * absence has to guess which of those two databases it is talking to, and it
 * guesses once, at build time, for every adopter. Guess permissive and a viewer
 * is handed the whole editing UI and refused by Postgres on every save; guess
 * strict and an adopter who skipped the recipe sees a read-only app with no
 * toggle and no error, which looks like a broken build.
 *
 * Asking costs one round trip on sign-in and is right in both postures,
 * including the one where an adopter deletes the recipe outright.
 *
 * One thing this deliberately does NOT do: it does not read the claim as a
 * fallback. A session carrying `role: 'service'` against a database that says
 * no is a viewer, because the database is what refuses the write. A fallback
 * would restore the disagreement this exists to end.
 *
 * A failed ask answers `anon`. The database is the wall either way, so the
 * only thing at stake is which buttons render, and rendering a save that
 * cannot succeed is the worse of the two mistakes.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Who is asking, in the only terms this app acts on.
 *
 * Two members, because two is what anything branches on. There was a third —
 * `authoring`, for a session that writes the records about the board but not
 * its structure — and this backend has no such session: one predicate gates
 * the structure RPCs, the spec columns, the slices and the evidence alike.
 * Nothing produced it and nothing handled it, so a backend that did split its
 * authors from its automation would have been read here as writing nothing.
 * A backend that draws that line answers with the writing tier and enforces
 * the narrower one itself, which is where it is enforceable.
 */
export type Tier =
  /**
   * Writes nothing. Not signed in — or signed in and outside the writing
   * tier, which a backend that splits `authenticated` in two answers for
   * about half its accounts. The defining property is the write, not the
   * sign-in: what a session may READ is a separate question, and so is
   * whether it may open the agent.
   */
  | 'anon'
  /** Writes: the board's structure, its spec, and the records about it. */
  | 'service'

/** The tier seam, as the database exposes it over the Data API. */
const TIER_SEAM = 'is_service_account'

/** Ask the database what this session may do. */
export async function readTier(client: SupabaseClient<Database>): Promise<Tier> {
  const { data } = await client.auth.getSession()
  // No session, no round trip: the seam's permissive default answers `true`
  // to anyone who asks, including anon, and a deployed visitor writing
  // nothing is settled before the database is involved.
  if (!data.session) return 'anon'

  const { data: inTier, error } = await client.rpc(TIER_SEAM)
  if (error) return 'anon'
  return inTier === true ? 'service' : 'anon'
}
