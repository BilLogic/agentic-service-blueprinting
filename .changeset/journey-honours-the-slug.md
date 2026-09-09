---
'agentic-service-blueprinting': patch
---

The journey reads resolve the active service, not the first one

`ActiveServiceContext` writes the URL slug into the module store and
`serviceScope` already honours it, but `useServicePhases` and `useSlices`
still resolved `findFirstServiceId` — so switching service moved the URL, the
agent's scope and the caches, and left the board on whichever service is
first by `created_at`. Both fetchers now resolve `findActiveServiceId`, which
falls back to exactly that first-by-`created_at` row when no slug is set, so
a single-service installation resolves byte-for-byte as before.
