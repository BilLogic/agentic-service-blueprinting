---
'agentic-service-blueprinting': patch
---

**`scripts/tests/authoring-log.test.mjs` spells its fixture series where no
tree claims it, so a deployment can enrol the file.** The suite built the
sweep's shape out of `21000101000000_one.sql` and `21000102000000_two.sql`,
which read as members of a migration series — and the two repositories do not
share one, so a member of either resolves in at most one tree. The gate that
decides whether a deployment may hold a shared file is line-based over bytes
and cannot tell a fixture from an address, so the file sat byte-identical and
unenrolled. The members are now spelled under `notes/`, the way the router
suite's fixture paths are, and the header says why.

The test and `scripts/authoring-archivers.mjs`, every line of logic it reaches
through a relative import, join the published shared list, so the same fence
that keeps a `docs/` path out of the other eleven now holds over these two.
