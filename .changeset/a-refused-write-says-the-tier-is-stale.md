---
'agentic-service-blueprinting': minor
---

A refused write says the tier is stale

The editing tier is asked of the database and held against the access token the
client presents. That is right for as long as the token is. It is wrong for the
window between a server-side demotion and the next token refresh, and during
that window the reader is shown save controls the database will refuse — a
button that lies.

The obvious fix is a revocation path, and it is bigger than the defect. The
database is already the authority and re-evaluates the session on every
statement, so a demoted session's writes fail there whatever the UI believes.
Nothing is getting through; the UI is just still offering.

So the trigger is the moment the lie is exposed. A write that comes back denied
on authorization grounds is the one reliable signal that the held answer is out
of date, and acting on it costs nothing on the happy path: no timer, no polling,
no round-trip until something has already gone wrong. `toAuthoringError` is
where it fires, because that translation function is the single funnel every
failed write passes through — there is no one place those failures are caught,
each call site raises and the surface above it renders, so the translator is the
only seam they share. `writeTranslationContract.test.ts` is what makes "every
failed write" a fact rather than a hope, and it now says so: a module that
raises the database's own text loses the phrasing *and* the reconcile.

The refresh itself is deliberately small and deliberately defensive.
`refreshSession()` resolves on failure — auth-js catches the error and hands it
back in `{ data, error }` rather than rejecting — so a reconciler written inline
in the provider would report success on every failed refresh and its logging
would be dead code. `sessionRefresher` reads the field and throws, and it is
tested against that shape rather than against a hand-written rejecting function.
A burst of denials from one save fanning out over several tables collapses to a
single refresh, guarded by both an in-flight flag and a cooldown, because the
rows were all refused by the same token. A refresh that fails logs and stops: the
reader is already being shown why the save failed, and a second error on top of
the first would turn one refused save into a lost session.

The seam is a registration, not an import. The client lives in
`SupabaseProvider` and `src/lib/` does not reach up into `src/contexts/`, so the
provider registers a reconciler while a client exists and unregisters when it
goes. Until it does, the whole path is a no-op — which is also what a boot-order
failure looks like, and what an app with no database configured gets.
