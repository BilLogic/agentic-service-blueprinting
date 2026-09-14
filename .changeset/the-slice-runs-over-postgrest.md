---
'agentic-service-blueprinting': patch
---

**The cell-edit slice runs over standalone PostgREST in CI.** The same
flow the in-memory slice drives — panel, save, ledger, revert, read-back —
runs through `supabase-js` against PostgREST on the stack the seed-load
check builds, as a signed-in author carrying the service claim, so a grant
or a policy the recipe forgot on a column the panel writes fails the slice.
The runner (`scripts/run-slice-over-postgrest.mjs`) builds the database,
starts a pinned PostgREST release, mints the claim, times the run, and with
`--prove` revokes one grant and requires the slice to go red; without a
binary it says so through the unverified register. The in-memory form stays
as the fast local one.
