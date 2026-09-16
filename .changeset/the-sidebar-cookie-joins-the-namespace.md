---
'agentic-service-blueprinting': patch
---

The sidebar's cookie now carries this installation's storage prefix, and the
storage-keys guard reads cookies as a third store beside `localStorage` and
`sessionStorage`.

**A collapsed sidebar is remembered per installation, and resets once.** The
sidebar primitive wrote its open/closed state to a cookie named
`sidebar_state`, bare — the only remembered value in the app that was not built
by `storageKey()`, because the seam and its guard were about the two
web-storage APIs and a cookie jar is shared per origin just as surely. Two
installations served from one origin therefore shared that one value, and
collapsing the sidebar in one collapsed it in the other. The name takes the
prefix now, which MOVES it: a state remembered before this release is read once
as absent, so the sidebar opens at its default until the next toggle. Nothing
else is affected, and nothing has to be migrated.

`npm run check:storage-keys` widened with it: a cookie name written from the
application is held to the same rule as a stored key, the subject being the
name rather than the whole write, since the path and max-age beside it are
attributes and not keys. A deployment needs no change — the readers are the
app's own and they arrive with the pin — and an adopter that named its own
prefix now owns its own cookie without doing anything.
