---
'agentic-service-blueprinting': patch
---

A session-list merge abandons its writes when the account it read for is no
longer the one signed in.

**What was happening to a reader.** The chat's session list is merged out of
the database on every attach. That merge is a read followed by two writes: the
list the person sees, and an upsert of the sessions the database it read did
not have. If the client changed while the read was still on the wire — signing
in, signing out, switching account, anything that hands the panel a different
client — the read still finished against the database it started on, and then
wrote its result into the database that had replaced it. Two things came of
that. The previous account's sessions were published over the sessions of the
person now signed in, so a reader saw conversations that were not theirs in
their own switcher. And rows that existed only in the previous account's table
were upserted into the new one, where they stayed: a durable cross-account
write, not a flicker a reload would clear.

**The fix.** A piece of parked persistence work is now handed the flight it is
running as, and the flight knows the era of the handle it started against. The
merge asks whether it has been superseded after its read comes back and before
either write, so a flight whose account has been replaced computes nothing and
returns. The replacement client's own merge is the one that publishes, which
is what it was always meant to be.

The era counter that the readiness module already kept was doing less than a
comment there claimed: it suppressed the bookkeeping that followed a
superseded flight — so the list kept its skeleton honestly — while the flight
itself ran to completion and wrote. That comment is corrected here, along with
the one on the panel's effect that repeated the claim.

Pinned by a cross-account test that drives the panel's real switch with the
first database's read still unanswered: no write from the superseded flight
reaches the store, the storage the next boot reads, or the new account's
table; the replacement's merge still publishes; and a merge with no account
change still converges local-only sessions upward exactly as before.

A deployment with no database behind it is unaffected — nothing attaches
there, so no merge ever runs.
