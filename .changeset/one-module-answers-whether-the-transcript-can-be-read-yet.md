---
'agentic-service-blueprinting': patch
---

One module answers "can the transcript be read yet, and tell me when", and
owns the parking of work until it can — so a reopened session no longer comes
back a skeleton on the strength of a race between two effects in two files.

Reading that failure used to mean reading three modules at once. The
persistence module held a flag and an attach signal; the loop held three sets
of session ids beside the transcript, bookkeeping which hydrate had fired,
which was on the wire and which had been parked; and the chat view listed the
Supabase client as an effect dependency on purpose, with a comment explaining
that child effects run before parent effects and that the retry happened
there. Three places had to be right, and each of them stated one third of the
same race.

`persistenceReadiness.ts` states it once. Work is handed over against a key
and runs immediately if a client is attached, or on the attach signal if not:
once per key, in the order it was parked, never twice. It also answers whether
a key's work is still outstanding, which is the skeleton-versus-empty-state
question the chat view asks, and it carries the seam that forgets a key so a
reopen proves a read rather than a memory. The loop keeps the transcript and
nothing else; the chat view's effect depends on the session and nothing else.

**A deployment with no database is unchanged, and is now stated in one place
rather than five.** The persistence calls had a detached-client guard at the
head of each; the guards were pass-throughs, and the thing they guarded — the
client — now comes from a single helper that answers `null` for the whole
call. Reads return `null`, writes return, nothing throws, and the panel keeps
working from localStorage. The legacy single-`skill` read migration stays
exactly where it was, at the read.

Hydration order is pinned without a React harness: work parked before the
client lands runs once it does, in order, and not twice.
