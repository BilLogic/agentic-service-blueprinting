---
'agentic-service-blueprinting': patch
---

The documents an agent reads call the findings table by its name.

`21000116000000` renamed `findings` to `audit_findings`. Twelve places across
`CONTEXT.md`, the two reference contracts, both audit-writing skills and the
whatif change-request schema went on naming the old table — and one of them,
the adapter contract's column-scoped UPDATE list, still named `note` for the
column that is now `summary`.

Three occurrences deliberately keep the old word, because each names the past
rather than the schema: the migration-history row for
`20260729120000_derived_layer.sql`, which created a table called `findings`;
the sentence in `docs/engineering/checks.md` explaining the rename itself; and
`recordFindings`, whose port really is called `findings` in `ports.ts`.
