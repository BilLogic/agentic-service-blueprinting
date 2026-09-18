---
'agentic-service-blueprinting': patch
---

A session-list merge abandons its writes when the account it read for is no
longer the one signed in.

**What was happening to a reader.** The chat's session list is merged out of
the database on every attach. That merge is a read followed by two writes: the
list the person sees, and an upsert of the sessions the database it read did
not have. If the account changed while the read was still on the wire, the read
still finished against the rows it started on, and then wrote its result where
the new account's rows live. Two things came of that. The previous account's
sessions were published over the sessions of the person now signed in, so a
reader saw conversations that were not theirs in their own switcher. And rows
that existed only in the previous account's table were upserted into the new
one, where they stayed: a durable cross-account write, not a flicker a reload
would clear.

The way to reach it needs no sign-out in between. A magic link is mailed with
this origin as its redirect, so following one for a second account in a tab
already signed in as a first lands back on the page authenticated as the
second, with one non-null session simply replacing another. A password sign-in
performed while already signed in has the same shape.

**The fix, in two halves.** The panel now notices. Its persistence effect is
keyed on the signed-in account's user id, not only on the client handle — the
client is one module singleton per page whose identity never changes and whose
token changes underneath it, so an account switch moved nothing the effect was
watching and the list work was never re-armed. Keying on the user id rather
than the session object means a token refresh, which mints a new session for
the same person, still costs nothing.

And the merge now declines. A piece of parked persistence work is handed the
flight it is running as, and the flight knows the era of the handle it started
against. The merge asks whether it has been superseded after its read comes
back and before either write, so a flight whose account has been replaced
computes nothing and returns. The replacement's own merge is the one that
publishes, which is what it was always meant to be.

The era counter that the readiness module already kept was doing less than a
comment there claimed: it suppressed the bookkeeping that followed a
superseded flight — so the list kept its skeleton honestly — while the flight
itself ran to completion and wrote. That comment is corrected here, scoped to
the work that actually consults its flight, along with the one on the panel's
effect that repeated the claim and the one that credited RLS with protecting
the transcript read (what protects it is that its write is in memory only).

Pinned at both seams, because a case at one is blind to the other's defect: a
module-level pair that drives detach, forget, re-attach and re-ask with the
first read unanswered, and a panel-level case that renders the real panel and
changes only which account is signed in — no new client, no signed-out moment,
nothing calling the readiness module by hand. A merge with no account change
still converges local-only sessions upward exactly as before.

A deployment with no database behind it is unaffected — nothing attaches
there, so no merge ever runs.
