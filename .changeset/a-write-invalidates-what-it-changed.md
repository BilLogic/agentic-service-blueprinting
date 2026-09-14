---
'agentic-service-blueprinting': patch
---

**A write invalidates what it changed, through one key builder the reads
also use.** Every query key is built in `queryKeys`: a read hook builds its
key there, and the mutation module that changes the rows behind it
invalidates from there — a cell's text refetches the grid, the one board
holding the cell and the owner vocabulary; a slice's slides refetch the
catalog and the slice; a structural RPC refetches the structural set, which
is now one product of the builder. The panels, dialogs, sheets and the agent
no longer invalidate anything: the session sheet's revert, the cell panel's
save, the resources lists' `onWritten` and the agent's whole-cache clear
after every write are gone, and so are the eight invalidations of two keys
nothing read (`cell-content:`, `cell-spec:`).

The revert path refetches the same way, through the module the inverse
goes through or the RPC freshness table the forward write used. The owner-tag
rename is a wrapper in `authoringRpc` (`renameOwnerTag`) with its scoped
inverse derived beside the other RPCs, rather than an inline call in the
select; the RPC argument check accordingly leaves out an inverse the revert
path executes itself (a `case` of its switch the schema has no function for),
which is never posted. A test writes through each module against a recording
stand-in for the cache and asserts exactly the keys invalidated; a guard fails
on a key prefix spelled in any file that touches the cache, outside the
builder.

**Upgrading a deployment:** a component or tool of your own that imported
`invalidateQueries` / `invalidateStructure` from `@/hooks/useSupabaseQuery`
should stop — the write it calls refetches for it. A read hook of your own
should build its key with `queryKeys` and, if the family is new, add it
there; `invalidateCanvasBlueprintsForScenario` / `ForPath` now live in
`@/lib/queryClient`, beside the new `ForCell`.
