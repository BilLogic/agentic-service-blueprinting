---
'agentic-service-blueprinting': patch
---

Every key the browser stores now goes through the namespace seam, and every
stored value is read as what it might actually be rather than as what this
release would have written.

**Saved slide-sheet heights reset once.** The sheet's remembered height was the
one key written as a bare literal instead of being built by `storageKey()`, so
an installation that named its own storage prefix did not cover it and two
installations served from one origin resized each other's sheet. It takes the
prefix now, which MOVES the key: a height saved before this release is read
once as no height at all, and the sheet opens at its default until the next
drag. Nothing else is affected, and nothing has to be migrated.

**A malformed session no longer breaks the session filter.** The stored session
list was cast to its type with no check on the entries, so an entry written by
an older version with a renamed or dropped `title` survived the read — and the
filter lowercases that title on the first keystroke, which threw into the
editor boundary on every attempt until site data was cleared. The reader now
keeps the entries that carry an `id`, a `title` and a `createdAt` — the three
fields nothing can substitute for — so a list holding one without them reads as
if that entry were absent. A field that HAS an honest stand-in gets it instead
of costing the session: an entry that lost its `updatedAt` takes its
`createdAt`, the oldest date it can truthfully claim, which keeps the agent's
`list_sessions` from throwing on it while leaving the conversation openable.

The stored model overrides and API keys beside it are now taken only when they
are what they claim to be — a map of strings — and an entry saved under a
provider this build does not declare is kept, because a provider can come back
and the key under it should not go with the choice.

**A retired provider id reads as the default.** The stored agent provider was
read with a default but never checked against the ids this build declares. A
release that drops a provider leaves browsers holding its id — with a key saved
beside it, so the no-key gate passes — and the loop then indexes its adapter
map with a name it has no entry for and sends on `undefined`. The id is
validated where it is read, and the adapter map is keyed by the provider type
rather than by `string`, so the other end of the same defect — a provider
offered with no adapter behind it — is now a compile error.

A new guard, `npm run check:storage-keys`, holds the first of those for good:
no key reaching `localStorage` or `sessionStorage` from the application is a
bare literal. A deployment needs no change for any of this — the readers are
the app's own, and they arrive with the pin.
