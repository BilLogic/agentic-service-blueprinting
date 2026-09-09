---
'agentic-service-blueprinting': patch
---

The client asks the database what tier a session is in, instead of inferring
it from a claim the session does not carry.

The tier seam is a database function every write RPC asserts in its own body
and every restrictive write policy ANDs with. It ships permissive — a
single-tier deployment where every signed-in session edits — and an optional
recipe replaces it with a read of the session's role claim, splitting
`authenticated` into editors and viewers. The client used to decide which of
those two databases it was talking to by looking at the claim: absent meant
the recipe was never adopted, so every signed-in session edited. A deployment
built on this template made the opposite call from the same file, granting the
tier only on an explicit `role === 'service'`. Both readings are defensible
where they sit and neither survives being the same line of code.

The function is granted EXECUTE to `anon` and `authenticated`, so it is
callable over the Data API. Calling it is one round trip on sign-in and is
right in both postures, including the one where an adopter deletes the recipe
outright. `IdentityPort.currentTier()` already declared the home for it and
was implemented only by the two adapters nothing calls; it now has its
Supabase implementation and its first real caller.

THE DEFECT THIS FIXES, not merely tidies. `supabase db reset` applies every
file in the migrations directory, the optional recipe included, so the setup
as written produces the STRICT database — an adopter has to delete a file to
get the permissive one the client assumed. The combination that produced was
the strict database under the permissive client: a signed-in account with no
role claim was offered the entire editing UI and refused by Postgres on every
save, from 23 in-body RPC guards and 39 restrictive policies. That combination
is now unreachable, because there is only one rule and the database states it.

Before and after, for each session, on both postures. An anonymous visitor is
unchanged in every case: no session, no write gate, and the tier is settled
without a round trip — which matters, because the permissive default answers
`true` to anyone who calls it, `anon` included. A session holding the
service-role key is unchanged: its JWT carries no role of the kind the seam
reads, so the key's own arm stays and stays load-bearing. On the permissive
database a role-less signed-in session still edits, as before. On the strict
database a role-less signed-in session was an editor in the UI and a viewer in
the data, and is now a viewer in both. And a session carrying the claim while
the database says no — a token minted before a revocation, or a claim set by
hand on a deployment whose seam reads something else — used to write buttons
it could not use, and now does not, because the claim is no longer consulted
in either direction.

THE FIRST ACCOUNT A PROJECT EVER HAS IS A SERVICE ACCOUNT. The recipe's
allowlist ships empty and nothing in the package inserts a row — no seed, no
script, no documented step — so a fresh deployment of the tier had no editor
at all, and the way in was a hand-written update whose text lives in a
migration header. The trigger that stamps allowlisted sign-ups gains a second
predicate for it.

The other predicate that closes the same gap is "the allowlist is empty", and
it is the dangerous one: an adopter who enables sign-ups and never fills the
allowlist — the exact adopter being fixed — would stamp every account created
in that window, unbounded and growing with the deployment. "There are no
accounts yet" stamps exactly one, ever, and it is the one belonging to whoever
stood the project up. Rehearsed on a throwaway database: the founding account
is stamped, the second account created while the allowlist is still empty is
not, an allowlisted account is stamped case-insensitively, and metadata a
provider already wrote survives.

IT STAYS IN THE RECIPE, which is the opposite of where the argument pointed
before. The stamp is read by exactly one thing — the recipe's own tier
function — so deleting the recipe leaves a claim nothing consults, and moving
the trigger to the core would hang auth machinery on adopters who chose the
single-tier posture, for no effect. What made the argument look the other way
was a client that decided the tier from the claim: that client goes silently
read-only against a permissive database, so the stamp had to exist everywhere
to keep it honest. Asking removes the need, so the trigger goes where its only
reader is.

TWO STALE SENTENCES, in the environment sample and in the client module, both
saying the deployed app is read-only because "there is no sign-in". There is:
a password form and a magic-link button, mounted whenever a database is
configured, on the front of every deployed site. What is true is narrower —
a browser visitor is `anon`, and the magic link is sent with account creation
off, so it cannot mint the account it would need.

COVERAGE, which was the acceptance criterion and had none. The permissive arm
was rewritten to the strict rule and the suite re-run before any of this: 158
files and 1603 tests before, 158 and 1603 after, zero movement — the rule this
issue is about was asserted in neither direction. Eleven cases arrive: five
pinning the resolution itself, six pinning that the provider is wired to it,
across an anonymous visitor, a stamped account, a role-less account on each
posture, a claim the database contradicts, a failed ask, and the service-role
key. Both prior rules were re-applied under them: this repository's fails two,
the deployment's fails two others.

`src/lib/supabase.ts` is enrolled in the deployment's reconciled-files list and
was byte-identical to its copy, so that gate stays red until the next pin bump.
