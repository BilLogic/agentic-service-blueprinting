---
'agentic-service-blueprinting': minor
---

The two declared fork seams become configuration, and the App tree gains four
things a deployment had been carrying alone.

`STORAGE_PREFIX` was a constant a deployment edited in place; it is now an
initialisation call, so the namespace is set rather than patched. Reference
documents are a registry a deployment adds to rather than a list it respells,
and the accent and the wordmark read the config — the wordmark through
`content.workspaceTitle ?? brand.name ?? ORG_NAME`, so a workspace's own name
can no longer end up on another service's board.

The fourth question — whether mounting also needed a composition seam, since
a config object cannot express a provider tree — is answered no. The four
providers a deployment had been carrying were not deployment-shaped:

- the slug now resolves to a service and the URL says which one. The route
  parser, the store and the resolver were already here; nothing closed them.
- a comparison built in one scenario no longer follows the reader into the
  next.
- a write that did not land says so. All four failing write paths ended in a
  `console.error` and read to the user as success.
- the provider tree writes down its own order, in bands — a band may read the
  bands outside it, never the ones inside — with the three forced edges named
  individually. The write-failure notices sit outside the error boundary on
  purpose, and a test reads the source to keep them there.

`App({ config })` is therefore sufficient, and no extension point was added
for a difference that was not one.
