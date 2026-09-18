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

`persistenceReadiness.ts` states it once. Work is handed over against a handle
— a kind and the thing of that kind it is for — and runs immediately if a
client is attached, or on the attach signal if not: once per handle, in the
order it was parked, never twice. It also answers whether a handle's work is
still outstanding, which is the skeleton-versus-empty-state question both the
chat view and the sessions list ask, and it carries the seam that forgets a
handle so a reopen proves a read rather than a memory. The loop keeps the
transcript and nothing else; the chat view's effect depends on the session and
nothing else.

**The sessions list asks the same module.** It used to keep its own pair of
flags — one for the merge on the wire, one for the window before the merge
even starts — which was a second spelling of one fact and a second chance to
get the loading-versus-empty distinction wrong. Its merge is now parked and
scheduled like any other read, and the list subscribes to the same outstanding
answer the transcript does. The record for cross-surface module stores is
amended with the new store and with that fold.

**A deployment with no database is unchanged, and is now stated in one place
rather than five.** The persistence calls had a detached-client guard at the
head of each; the guards were pass-throughs, and the thing they guarded — the
client — now comes from a single helper that answers `null` for the whole
call. Reads return `null`, writes return, nothing throws, and the panel keeps
working from localStorage. The legacy single-`skill` read migration stays
exactly where it was, at the read.

**The client does not leave the module.** A caller that can already reach the
client has no reason to ask whether persistence is readable, so handing one out
was a second, contradictory answer waiting to be written — park-and-wait here,
give-up-with-null over there. Queries go through one helper instead, which
carries the detached case, folds a failed query into the same `null` a
never-persisted session gives, and builds the query inside its own promise
chain so a builder that throws on the spot degrades quietly rather than
reaching the window.

Hydration order is pinned without a React harness: work parked before the
client lands runs once it does, in order, and not twice. Two kinds of work
about one session stay apart, so neither is silently dropped; a flight
abandoned by a forget cannot settle the ask that replaced it; and the
transcript's skeleton is now asserted through the real panel, mid-read, rather
than left to inspection.
