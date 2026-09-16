---
'agentic-service-blueprinting': patch
---

A tab left open across a deploy recovers itself. The app is served as
content-hashed chunks, so a deploy renames them, and the first lazy import an
old tab asks for afterwards requests a file the new build never shipped. Until
now that surfaced as "Failed to fetch dynamically imported module" — an
uncaught error naming nothing a reader could do. The app root now listens for
Vite's `vite:preloadError` and reloads, which is the refresh the reader would
have done by hand.

The reload is spent once per browsing session, recorded in `sessionStorage`
before it navigates. A chunk can also be missing because the deployed build is
broken, and reloading into a broken build would fetch the same missing file and
reload again; one credit per tab is what keeps a recovery from becoming a loop.
The credit is never refunded on a later boot, because the error fires when a
reader opens a transcript — possibly an hour after the boot that would have
refunded it.

The one lazily loaded surface, the agent's markdown renderer, now keeps its
raw-text rendering when the chunk fails as well as while it loads: Suspense
only covers a pending import, so the rejection used to travel up as a render
throw. A reader whose tab has already spent its reload still reads the
transcript, in plain text, until they refresh.

A deployment needs no change for this: the listener hangs off `App`, which is
what a deployment mounts, so it arrives with the pin. Nothing in a host's
`main.tsx`, its headers or its redirects has to move.
