---
'agentic-service-blueprinting': minor
---

**The agent's account of the schema is an account of YOUR database now, not of
this package's.** `npm run agent-account` rendered the relation list from
`src/types/database.ts` and laid this package's live comments over it. In a
deployment that reads the application out of this package, that file is this
package's, and the database is not — so the account named relations the
deployment did not have, omitted columns it did, and `check:agent-account` was
red with a printed remedy that made the document LESS true than it already was.

What you own now, and what you write:

* **Nothing, to get a true account.** The relation list this package ships is a
  DEFAULT — a list of names to ask your database about. Every name is put to the
  database before anything is rendered: a relation it does not have is dropped,
  a column it does not have is dropped, and a column it has that nobody declared
  is rendered anyway. Two deployments with the same database render the same
  account whatever declaration they started from, and running the generator on a
  correct account leaves it byte-identical.
* **`deployment/types/database.ts`, if you want fewer questions asked.** The
  declaration is read from your own root first (`deployment/`, the one `~/`
  names), then from this tree's `src/`, then from the package. Put your
  generated Supabase types there and the run stops asking about relations you
  retired. It is a list of candidates, never an authority: your database
  overrules it either way, and every disagreement is printed as a note to fold
  in, not as a failure. A schema of your own is what extending a template means.
* **Nothing, for the vocabulary.** The entity kinds are the application's, and
  they follow whichever copy of the application is running — this tree's
  `src/lib/panelTerms.ts`, or the package's when you keep none.

The remedy can no longer reduce accuracy: what the generator writes is only what
the database confirmed, so the command a red check prints moves the document
toward the database it talks to and never away from it. `check:agent-account`
still fails on an account that has gone stale against its own database, and on
the coverage and prohibition ratchets, exactly as before.

This package's own account and check result are unchanged: it has no
`deployment/` root and no database configured, so the generator still writes
nothing and exits 0.
